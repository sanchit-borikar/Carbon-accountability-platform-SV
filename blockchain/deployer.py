"""Deploy smart contracts to Algorand testnet."""

from dotenv import load_dotenv, set_key
load_dotenv(override=True)

import os, sys, base64, json
from algosdk import transaction
from algosdk.v2client import algod
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (banner, success, error,
                          warn, info, C)
from blockchain.wallet import (get_algod_client,
    create_or_load_wallet, check_balance)
from blockchain.contracts.emission_contract import (
    compile_contract)

ENV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), '.env')

def compile_teal(client, teal_source: str) -> bytes:
    """Compile TEAL source to bytecode"""
    compile_response = client.compile(teal_source)
    return base64.b64decode(
        compile_response["result"])

def deploy_emission_contract():
    banner("VayuDrishti Contract Deployer",
           "Algorand Testnet \u00b7 Carbon-Negative Chain")

    load_dotenv(override=True)
    client      = get_algod_client()
    mn          = os.getenv("ALGORAND_MNEMONIC", "")
    address     = os.getenv("ALGORAND_ADDRESS", "")

    if not mn or not address:
        error("Deploy", "No wallet in .env", "")
        return None

    from algosdk import mnemonic as algo_mnemonic
    private_key = algo_mnemonic.to_private_key(mn)
    info("Deploy", "Loaded existing wallet",
         f"{address[:8]}...{address[-4:]}")

    balance = check_balance(address)
    if balance < 1_000_000:
        error("Deploy", "Insufficient balance",
              "Visit bank.testnet.algorand.network")
        return None

    info("Deploy", "Compiling PyTeal contracts...")
    approval_teal, clear_teal = compile_contract()
    success("Deploy", "Compiled", "")

    approval_bytes = compile_teal(client, approval_teal)
    clear_bytes    = compile_teal(client, clear_teal)

    sp = client.suggested_params()
    global_schema = transaction.StateSchema(
        num_uints=4, num_byte_slices=2)
    local_schema  = transaction.StateSchema(
        num_uints=0, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=address,
        sp=sp,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        note=b"VayuDrishti Carbon Platform v1.0",
    )

    signed_txn = txn.sign(private_key)
    tx_id      = client.send_transaction(signed_txn)
    info("Deploy", "Transaction sent", tx_id)

    info("Deploy", "Waiting for confirmation...")
    result  = transaction.wait_for_confirmation(
        client, tx_id, 4)
    app_id  = result["application-index"]

    set_key(ENV_PATH, "EMISSION_APP_ID", str(app_id))

    success("Deploy", "Contract deployed!",
            f"App ID: {app_id}")

    print(f"\n  {C.CYAN}{'\u2550'*58}{C.RESET}")
    print(f"  {C.GREEN}\u2713 EmissionRecord Contract Live!{C.RESET}")
    print(f"  {C.WHITE}App ID   : {C.CYAN}{app_id}{C.RESET}")
    print(f"  {C.WHITE}TX ID    : {C.CYAN}{tx_id}{C.RESET}")
    print(f"  {C.WHITE}Explorer : {C.CYAN}"
          f"https://testnet.algoexplorer.io/app/"
          f"{app_id}{C.RESET}")
    print(f"  {C.CYAN}{'\u2550'*58}{C.RESET}\n")
    return app_id

if __name__ == "__main__":
    deploy_emission_contract()
