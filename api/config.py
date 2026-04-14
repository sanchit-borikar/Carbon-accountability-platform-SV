import os
from dotenv import load_dotenv
load_dotenv()

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "vayu_drishti")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "vayu2026")

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

ML_FORECASTS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(
        os.path.abspath(__file__))),
    "ml", "forecasts"
)

ALGO_APP_ID  = os.getenv("EMISSION_APP_ID", "756736023")
ALGO_EXPLORER = "https://lora.algokit.io/testnet"
