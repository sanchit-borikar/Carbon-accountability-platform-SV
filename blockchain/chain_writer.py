"""Reads PostgreSQL records and writes to Algorand."""

import os, sys, json, hashlib, time, psycopg2, base64
from algosdk import transaction
from algosdk.v2client import algod
from dotenv import load_dotenv
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (banner, success, error,
                          warn, info, C)
from blockchain.wallet import (get_algod_client,
    create_or_load_wallet, check_balance,
    verify_connection)
from blockchain.config import (EMISSION_APP_ID,
    BATCH_SIZE, POLL_INTERVAL)
load_dotenv()

def get_db_conn():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", 5432),
        dbname=os.getenv("DB_NAME", "vayu_drishti"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "vayu2026"),
    )

def init_blockchain_columns():
    """Add blockchain columns to emission_records"""
    conn = get_db_conn()
    cur  = conn.cursor()
    cur.execute("""
        ALTER TABLE emission_records
        ADD COLUMN IF NOT EXISTS
            blockchain_hash  TEXT,
        ADD COLUMN IF NOT EXISTS
            blockchain_tx    TEXT,
        ADD COLUMN IF NOT EXISTS
            block_number     BIGINT,
        ADD COLUMN IF NOT EXISTS
            chain_anchored   BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS
            algo_app_id      BIGINT
    """)
    conn.commit()
    cur.close()
    conn.close()
    success("DB",
            "Blockchain columns ready",
            "emission_records table updated")

def make_record_hash(record: dict) -> str:
    """SHA256 hash of key record fields"""
    key = {
        "city":      str(record.get("city", "")),
        "pollutant": str(record.get(
                        "primary_pollutant", "")),
        "value":     str(round(float(
                        record.get(
                        "primary_value", 0)), 4)),
        "timestamp": str(record.get("timestamp", "")),
        "source":    str(record.get("source", "")),
    }
    payload = json.dumps(key, sort_keys=True)
    return hashlib.sha256(
        payload.encode()).hexdigest()

def fetch_unanchored(limit=20) -> list:
    conn = get_db_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT id, city, state, sector,
               primary_pollutant, primary_value,
               co2_equivalent, compliance_score,
               exceeds_who, exceeds_cpcb,
               source, timestamp
        FROM emission_records
        WHERE (chain_anchored = FALSE OR
               chain_anchored IS NULL)
        AND primary_pollutant NOT IN
            ('unknown', 'value', 'aqi')
        AND primary_value > 0
        AND (
            compliance_score <= 50
            OR exceeds_who = TRUE
            OR exceeds_cpcb = TRUE
            OR co2_equivalent > 1000
        )
        ORDER BY compliance_score ASC
        LIMIT %s
    """, (limit,))
    cols = [d[0] for d in cur.description]
    rows = [dict(zip(cols, r))
            for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows

def mark_anchored(record_id: int, tx_id: str,
                  block_num: int,
                  rec_hash: str, app_id: int):
    conn = get_db_conn()
    cur  = conn.cursor()
    cur.execute("""
        UPDATE emission_records
        SET chain_anchored  = TRUE,
            blockchain_tx   = %s,
            block_number    = %s,
            blockchain_hash = %s,
            algo_app_id     = %s
        WHERE id = %s
    """, (tx_id, block_num, rec_hash,
          app_id, record_id))
    conn.commit()
    cur.close()
    conn.close()

def write_record_to_chain(
        record: dict,
        client,
        private_key: str,
        address: str,
        app_id: int) -> dict:
    """Write single emission record to Algorand"""
    try:
        rec_hash = make_record_hash(record)

        # Build note — full audit data as JSON
        note_data = {
            "v":   "1.0",
            "p":   "VayuDrishti",
            "h":   rec_hash[:32],
            "c":   str(record.get("city",""))[:20],
            "pol": str(record.get(
                        "primary_pollutant",""))[:10],
            "val": round(float(record.get(
                        "primary_value", 0)), 2),
            "co2": round(float(record.get(
                        "co2_equivalent", 0)), 2),
            "sc":  int(record.get(
                        "compliance_score", 0)),
            "who": bool(record.get(
                        "exceeds_who", False)),
            "ts":  str(record.get(
                        "timestamp",""))[:19],
        }
        note_bytes = json.dumps(
            note_data,
            separators=(',',':')).encode()[:1000]

        sp = client.suggested_params()
        sp.fee = 1000
        sp.flat_fee = True

        if app_id > 0:
            # Write to smart contract
            txn = transaction.ApplicationNoOpTxn(
                sender=address,
                sp=sp,
                index=app_id,
                app_args=[
                    b"record",
                    rec_hash[:32].encode(),
                    str(record.get("city",""))
                        [:20].encode(),
                    str(record.get(
                        "primary_pollutant",""))
                        [:10].encode(),
                    str(round(float(record.get(
                        "co2_equivalent",0)),2))
                        .encode(),
                    str(int(record.get(
                        "compliance_score",0)))
                        .encode(),
                    b"1" if record.get(
                        "exceeds_who") else b"0",
                    b"1" if record.get(
                        "exceeds_cpcb") else b"0",
                    str(record.get("source",""))
                        [:15].encode(),
                    b"0",
                ],
                note=note_bytes,
            )
        else:
            # Hash-only mode — payment tx with note
            txn = transaction.PaymentTxn(
                sender=address,
                sp=sp,
                receiver=address,
                amt=0,
                note=note_bytes,
            )

        signed = txn.sign(private_key)
        tx_id  = client.send_transaction(signed)

        # Wait for confirmation
        result = transaction.wait_for_confirmation(
            client, tx_id, 4)
        block_num = result.get(
            "confirmed-round", 0)

        return {
            "success":   True,
            "tx_id":     tx_id,
            "block_num": block_num,
            "hash":      rec_hash,
        }

    except Exception as e:
        return {
            "success": False,
            "error":   str(e)
        }

def run_chain_writer():
    banner("VayuDrishti Blockchain Bridge",
           "Algorand Testnet - Carbon-Negative Chain")

    # Verify connection
    if not verify_connection():
        error("System",
              "Cannot reach Algorand testnet",
              "Check internet connection")
        return

    # Init DB columns
    init_blockchain_columns()

    # Load wallet
    private_key, address = create_or_load_wallet()

    # Check balance
    balance = check_balance(address)
    if balance < 100_000:
        error("Wallet",
              "Insufficient balance",
              "Visit bank.testnet.algorand.network")
        return

    app_id = EMISSION_APP_ID
    if app_id == 0:
        warn("Contract",
             "No App ID found — using hash-only mode",
             "Run: python -m blockchain.deployer first")

    total_written = 0
    total_failed  = 0

    info("Bridge",
         "Starting blockchain bridge...",
         f"Polling every {POLL_INTERVAL}s")

    while True:
        try:
            records = fetch_unanchored(BATCH_SIZE)

            if not records:
                info("Bridge",
                     "No new records to anchor",
                     f"Total: {total_written} anchored")
                time.sleep(POLL_INTERVAL)
                continue

            info("Bridge",
                 f"Anchoring {len(records)} records",
                 "to Algorand...")

            client = get_algod_client()
            batch_written = 0
            batch_failed  = 0

            for record in records:
                result = write_record_to_chain(
                    record, client,
                    private_key, address, app_id)

                if result["success"]:
                    batch_written += 1
                    total_written += 1
                    mark_anchored(
                        record["id"],
                        result["tx_id"],
                        result["block_num"],
                        result["hash"],
                        app_id
                    )
                    city = str(record.get(
                        "city","?"))[:15]
                    pol  = str(record.get(
                        "primary_pollutant","?"))
                    tx   = result["tx_id"][:16]
                    info("Anchored",
                         f"{city:<15} | {pol:<8}",
                         f"tx: {tx}...")
                else:
                    batch_failed += 1
                    total_failed += 1
                    warn("Failed",
                         record.get("city","?"),
                         result.get("error","")[:50])

                time.sleep(0.5)

            if batch_written > 0:
                success("Batch",
                    f"{batch_written} records anchored",
                    f"total: {total_written}")

            time.sleep(POLL_INTERVAL)

        except KeyboardInterrupt:
            print()
            info("Bridge",
                 "Shutting down gracefully",
                 f"Total anchored: {total_written}")
            break
        except Exception as e:
            error("Bridge", "Loop error", str(e))
            time.sleep(10)

if __name__ == "__main__":
    run_chain_writer()
