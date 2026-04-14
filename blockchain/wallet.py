"""Wallet setup and management."""

import os
import sys
from algosdk import account, mnemonic
from algosdk.v2client import algod
from dotenv import load_dotenv, set_key
sys.path.insert(0, os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import success, error, warn, info, C
from blockchain.config import (ALGOD_ADDRESS, ALGOD_TOKEN,
                                MNEMONIC, ACCOUNT_ADDRESS)
load_dotenv()

ENV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))), '.env')

def get_algod_client():
    return algod.AlgodClient(
        ALGOD_TOKEN, ALGOD_ADDRESS,
        headers={"User-Agent": "VayuDrishti/1.0"})

def create_or_load_wallet():
    """Create new wallet or load existing from .env"""
    if MNEMONIC and ACCOUNT_ADDRESS:
        info("Wallet", "Loading existing wallet",
             f"{ACCOUNT_ADDRESS[:8]}...{ACCOUNT_ADDRESS[-4:]}")
        private_key = mnemonic.to_private_key(MNEMONIC)
        return private_key, ACCOUNT_ADDRESS

    # Create new wallet
    info("Wallet", "Creating new Algorand wallet...")
    private_key, address = account.generate_account()
    mn = mnemonic.from_private_key(private_key)

    # Save to .env
    set_key(ENV_PATH, "ALGORAND_MNEMONIC", mn)
    set_key(ENV_PATH, "ALGORAND_ADDRESS", address)

    success("Wallet", "New wallet created",
            f"Address: {address}")

    print(f"\n  {C.YELLOW}{'='*58}{C.RESET}")
    print(f"  {C.YELLOW}IMPORTANT — Fund your wallet with free"
          f" testnet ALGO:{C.RESET}")
    print(f"  {C.CYAN}1. Go to: "
          f"https://bank.testnet.algorand.network{C.RESET}")
    print(f"  {C.CYAN}2. Paste address: "
          f"{C.WHITE}{address}{C.RESET}")
    print(f"  {C.CYAN}3. Click Dispense — get 10 free ALGO"
          f"{C.RESET}")
    print(f"  {C.YELLOW}{'='*58}{C.RESET}\n")

    return private_key, address

def check_balance(address: str) -> int:
    """Returns balance in microALGO"""
    try:
        client = get_algod_client()
        info_data = client.account_info(address)
        balance = info_data.get("amount", 0)
        algo_bal = balance / 1_000_000
        if algo_bal < 1:
            warn("Wallet",
                 f"Low balance: {algo_bal:.4f} ALGO",
                 "Get more at bank.testnet.algorand.network")
        else:
            success("Wallet",
                    f"Balance: {algo_bal:.4f} ALGO",
                    f"{address[:8]}...")
        return balance
    except Exception as e:
        error("Wallet", "Balance check failed", str(e))
        return 0

def verify_connection():
    """Verify Algorand testnet is reachable"""
    try:
        client = get_algod_client()
        status = client.status()
        block = status.get("last-round", 0)
        success("Algorand",
                "Connected to testnet",
                f"Block #{block:,}")
        return True
    except Exception as e:
        error("Algorand",
              "Cannot connect to testnet", str(e))
        return False
