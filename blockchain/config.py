import os
from dotenv import load_dotenv
load_dotenv()

# Algorand Testnet endpoints (always free, always up)
ALGOD_ADDRESS  = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN    = ""  # No token needed for algonode
INDEXER_ADDRESS = "https://testnet-idx.algonode.cloud"
INDEXER_TOKEN  = ""

# Wallet (loaded from .env)
MNEMONIC       = os.getenv("ALGORAND_MNEMONIC", "")
ACCOUNT_ADDRESS = os.getenv("ALGORAND_ADDRESS", "")

# App IDs (filled after deployment)
EMISSION_APP_ID     = int(os.getenv(
    "EMISSION_APP_ID", "0"))
CERTIFICATE_APP_ID  = int(os.getenv(
    "CERTIFICATE_APP_ID", "0"))

# Settings
BATCH_SIZE     = 10   # records per batch
POLL_INTERVAL  = 30   # seconds between polls
MIN_BALANCE    = 1000000  # 1 ALGO minimum
