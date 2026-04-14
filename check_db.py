from api.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    res = conn.execute(text("SELECT primary_pollutant, COUNT(*) FROM emission_records GROUP BY primary_pollutant"))
    print("Pollutant counts:")
    for row in res:
        print(f"  {row[0]}: {row[1]}")
    
    res = conn.execute(text("SELECT COUNT(DISTINCT city) FROM emission_records"))
    print(f"Total cities: {res.scalar()}")
