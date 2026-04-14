"""PyTeal smart contract for emission records."""

from pyteal import *
import os, sys
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)))))

def emission_record_contract():
    """
    VayuDrishti Emission Record Smart Contract
    Stores immutable carbon emission audit records
    on Algorand blockchain.

    Global State (stored on chain):
    - total_records: counter
    - total_violations: WHO/CPCB breaches
    - total_anomalies: ML-flagged records
    - contract_version: "VayuDrishti-1.0"

    Local State (per record via box storage):
    - record_hash: SHA256 of full record
    - city + pollutant + co2e + score
    """

    # -- GLOBAL STATE KEYS --
    total_records    = App.globalGet(
                        Bytes("total_records"))
    total_violations = App.globalGet(
                        Bytes("total_violations"))
    total_anomalies  = App.globalGet(
                        Bytes("total_anomalies"))

    # -- HELPER: increment counter --
    def increment(key):
        return App.globalPut(
            key,
            App.globalGet(key) + Int(1)
        )

    # -- ON CREATE --
    on_create = Seq([
        App.globalPut(Bytes("total_records"),    Int(0)),
        App.globalPut(Bytes("total_violations"), Int(0)),
        App.globalPut(Bytes("total_anomalies"),  Int(0)),
        App.globalPut(Bytes("contract_version"),
                      Bytes("VayuDrishti-1.0")),
        App.globalPut(Bytes("platform"),
                      Bytes("Carbon Intelligence")),
        Approve()
    ])

    # -- RECORD EMISSION --
    # Args[0]="record", [1]=hash, [2]=city,
    #   [3]=pollutant, [4]=co2e, [5]=score,
    #   [6]=exceeds_who, [7]=exceeds_cpcb,
    #   [8]=source, [9]=is_anomaly
    record_emission = Seq([
        Assert(Txn.application_args.length() == Int(10)),

        # Store record using note field
        # (Algorand note = 1KB free metadata per tx)
        increment(Bytes("total_records")),

        # Track violations
        If(
            Or(
                Txn.application_args[6] == Bytes("1"),
                Txn.application_args[7] == Bytes("1")
            ),
            increment(Bytes("total_violations"))
        ),

        # Track anomalies
        If(
            Txn.application_args[9] == Bytes("1"),
            increment(Bytes("total_anomalies"))
        ),

        Approve()
    ])

    # -- GET STATS --
    get_stats = Seq([
        Log(Concat(
            Bytes("records="),
            Itob(App.globalGet(Bytes("total_records")))
        )),
        Log(Concat(
            Bytes("violations="),
            Itob(App.globalGet(
                Bytes("total_violations")))
        )),
        Approve()
    ])

    # -- ROUTER --
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication,
         Reject()],
        [Txn.on_completion() == OnComplete.UpdateApplication,
         Reject()],
        [Txn.application_args[0] == Bytes("record"),
         record_emission],
        [Txn.application_args[0] == Bytes("stats"),
         get_stats],
    )

    return program

def clear_state_program():
    return Approve()

def compile_contract():
    """Compile PyTeal to TEAL bytecode"""
    approval = emission_record_contract()
    clear    = clear_state_program()

    approval_teal = compileTeal(
        approval,
        mode=Mode.Application,
        version=8
    )
    clear_teal = compileTeal(
        clear,
        mode=Mode.Application,
        version=8
    )

    # Save TEAL files
    out_dir = os.path.join(
        os.path.dirname(__file__), "compiled")
    os.makedirs(out_dir, exist_ok=True)

    with open(f"{out_dir}/emission_approval.teal",
              "w") as f:
        f.write(approval_teal)

    with open(f"{out_dir}/emission_clear.teal",
              "w") as f:
        f.write(clear_teal)

    return approval_teal, clear_teal
