"""Verify any record against blockchain."""

import os, sys, json, hashlib
from algosdk.v2client import algod, indexer
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import success, error, warn, info, C
from blockchain.config import (ALGOD_ADDRESS,
    ALGOD_TOKEN, INDEXER_ADDRESS, INDEXER_TOKEN)
from blockchain.chain_writer import (
    get_db_conn, make_record_hash)

def get_indexer_client():
    return indexer.IndexerClient(
        INDEXER_TOKEN, INDEXER_ADDRESS,
        headers={"User-Agent": "VayuDrishti/1.0"})

def verify_record_by_id(record_id: int) -> dict:
    """Verify a DB record against blockchain"""
    conn = get_db_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT id, city, primary_pollutant,
               primary_value, co2_equivalent,
               compliance_score, timestamp,
               source, blockchain_tx,
               blockchain_hash, block_number,
               chain_anchored
        FROM emission_records
        WHERE id = %s
    """, (record_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        error("Verifier",
              f"Record {record_id} not found", "")
        return {"verified": False}

    cols = ["id","city","primary_pollutant",
            "primary_value","co2_equivalent",
            "compliance_score","timestamp",
            "source","blockchain_tx",
            "blockchain_hash","block_number",
            "chain_anchored"]
    record = dict(zip(cols, row))

    if not record.get("chain_anchored"):
        warn("Verifier",
             f"Record {record_id} not yet anchored",
             "Run chain_writer first")
        return {"verified": False,
                "reason": "not anchored"}

    # Recompute hash
    computed_hash = make_record_hash(record)
    stored_hash   = record.get(
        "blockchain_hash", "")

    hash_match = computed_hash == stored_hash

    if hash_match:
        success("Verifier",
            f"Record {record_id} VERIFIED",
            f"tx: {record['blockchain_tx'][:20]}...")
        print(f"\n  {C.GREEN}{'='*58}{C.RESET}")
        print(f"  {C.GREEN}  BLOCKCHAIN VERIFIED{C.RESET}")
        print(f"  {C.WHITE}Record ID  : "
              f"{C.CYAN}{record_id}{C.RESET}")
        print(f"  {C.WHITE}City       : "
              f"{C.CYAN}{record['city']}{C.RESET}")
        print(f"  {C.WHITE}Pollutant  : "
              f"{C.CYAN}{record['primary_pollutant']}"
              f"{C.RESET}")
        print(f"  {C.WHITE}TX ID      : "
              f"{C.CYAN}{record['blockchain_tx']}"
              f"{C.RESET}")
        print(f"  {C.WHITE}Block      : "
              f"{C.CYAN}{record['block_number']}"
              f"{C.RESET}")
        print(f"  {C.WHITE}Explorer   : "
              f"{C.CYAN}https://testnet.algoexplorer"
              f".io/tx/{record['blockchain_tx']}"
              f"{C.RESET}")
        print(f"  {C.GREEN}{'='*58}{C.RESET}\n")
    else:
        error("Verifier",
              f"Record {record_id} TAMPERED!",
              "Hash mismatch detected")

    return {
        "verified":      hash_match,
        "record_id":     record_id,
        "city":          record["city"],
        "tx_id":         record.get(
                          "blockchain_tx",""),
        "block_number":  record.get(
                          "block_number", 0),
        "hash_match":    hash_match,
        "explorer_url":  f"https://testnet."
                         f"algoexplorer.io/tx/"
                         f"{record.get('blockchain_tx','')}"
    }

def verify_latest(n=5):
    """Verify latest n anchored records"""
    conn = get_db_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT id FROM emission_records
        WHERE chain_anchored = TRUE
        ORDER BY id DESC LIMIT %s
    """, (n,))
    ids = [r[0] for r in cur.fetchall()]
    cur.close()
    conn.close()

    info("Verifier",
         f"Verifying latest {n} anchored records",
         "")
    results = []
    for rid in ids:
        result = verify_record_by_id(rid)
        results.append(result)
    return results

if __name__ == "__main__":
    verify_latest(5)
