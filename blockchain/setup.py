"""One-command setup script."""

import sys, os
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (banner, success, error,
                          warn, info, section, C)
from blockchain.wallet import (create_or_load_wallet,
    verify_connection, check_balance)
from blockchain.deployer import deploy_emission_contract
from blockchain.chain_writer import init_blockchain_columns

def run_setup():
    banner("VayuDrishti Blockchain Setup",
           "Algorand - Carbon-Negative - SDG 13")

    section("Step 1 -- Verify Algorand Connection")
    if not verify_connection():
        error("Setup", "Cannot reach Algorand", "")
        return False

    section("Step 2 -- Wallet Setup")
    private_key, address = create_or_load_wallet()
    balance = check_balance(address)

    if balance < 1_000_000:
        warn("Setup",
             "Wallet needs funding first!", "")
        print(f"\n  {C.YELLOW}Fund your wallet:{C.RESET}")
        print(f"  {C.CYAN}https://bank.testnet"
              f".algorand.network{C.RESET}")
        print(f"  Address: {C.WHITE}{address}"
              f"{C.RESET}\n")
        input("  Press ENTER after funding...")
        balance = check_balance(address)

    section("Step 3 -- Deploy Smart Contract")
    app_id = deploy_emission_contract()
    if not app_id:
        error("Setup", "Deployment failed", "")
        return False

    section("Step 4 -- Init DB Columns")
    init_blockchain_columns()

    print(f"\n  {C.GREEN}{'='*58}{C.RESET}")
    print(f"  {C.GREEN}  BLOCKCHAIN SETUP COMPLETE!"
          f"{C.RESET}")
    print(f"  {C.WHITE}App ID   : "
          f"{C.CYAN}{app_id}{C.RESET}")
    print(f"  {C.WHITE}Address  : "
          f"{C.CYAN}{address[:20]}...{C.RESET}")
    print(f"  {C.WHITE}Network  : "
          f"{C.CYAN}Algorand Testnet{C.RESET}")
    print(f"  {C.WHITE}Explorer : "
          f"{C.CYAN}https://testnet.algoexplorer"
          f".io/app/{app_id}{C.RESET}")
    print(f"\n  {C.YELLOW}Now run:{C.RESET}")
    print(f"  {C.GREEN}python -m blockchain.chain_writer"
          f"{C.RESET}")
    print(f"  {C.GREEN}{'='*58}{C.RESET}\n")
    return True

if __name__ == "__main__":
    run_setup()
