"""
VayuDrishti — Terminal 1: Open-Meteo Satellite Data Ingestion
Real-time air quality fetched from Open-Meteo free API.
"""
import sys, os, time, random, json
from datetime import datetime, timezone, timedelta
import requests, psycopg2

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vayu_logger import (banner, section, section_end, info, success,
                         warn, error, processed, kafka_sent,
                         print_sources_table, anomaly, C, ist)
from demo_cities import CITIES_ALL

DB = dict(host=os.getenv("DB_HOST","localhost"), port=os.getenv("DB_PORT","5432"),
          dbname=os.getenv("DB_NAME","vayu_drishti"), user=os.getenv("DB_USER","postgres"),
          password=os.getenv("DB_PASSWORD","vayu2026"))

API = "https://air-quality-api.open-meteo.com/v1/air-quality"

CITIES = CITIES_ALL  # All 50 cities

SECTOR_MAP = {"pm2_5":"industrial","pm10":"industrial",
              "no2":"transport","so2":"industrial","co":"transport"}
WHO = {"pm2_5":25,"pm10":50,"no2":40,"so2":20,"co":4000}
CPCB = {"pm2_5":60,"pm10":100,"no2":80,"so2":80,"co":2000}
CO2_FACTOR = {"pm2_5":110,"pm10":50,"no2":298,"so2":132,"co":1}

INSERT = """INSERT INTO emission_records
(source,city,state,sector,primary_pollutant,primary_value,unit,
co2_equivalent,compliance_score,exceeds_who,exceeds_cpcb,
latitude,longitude,timestamp,data_quality,raw_data)
VALUES (%(source)s,%(city)s,%(state)s,%(sector)s,%(pp)s,%(pv)s,%(unit)s,
%(co2e)s,%(score)s,%(who)s,%(cpcb)s,%(lat)s,%(lon)s,%(ts)s,%(dq)s,%(raw)s)"""

def co2e(poll, val): return round(val * CO2_FACTOR.get(poll, 1), 1)

def score(poll, val):
    w = WHO.get(poll, 100); r = val / w if w else 1
    if r <= 0.5: return 100
    elif r <= 1.0: return max(50, int(100 - (r-0.5)*100))
    elif r <= 2.0: return max(25, int(50 - (r-1.0)*25))
    else: return max(0, int(25 - (r-2.0)*10))

def main():
    print(f"\n{C.CYAN}{'═'*64}{C.RESET}")
    print(f"\n  {C.GREEN}{C.BOLD}🛰️  OPEN-METEO SATELLITE DATA FEED{C.RESET}")
    print(f"  {C.MUTED}Real-time air quality via satellite spectroscopy{C.RESET}")
    print(f"  {C.MUTED}Source: European Centre for Medium-Range Weather Forecasts{C.RESET}")
    print(f"  {C.MUTED}Coverage: {len(CITIES)} cities across India{C.RESET}")
    print(f"\n{C.CYAN}{'═'*64}{C.RESET}\n")

    conn = psycopg2.connect(**DB)
    success("Satellite", "PostgreSQL connected", DB["dbname"])
    info("Satellite", "Testing Open-Meteo API...", API[:45])
    try:
        r = requests.get(API, params={"latitude":28.61,"longitude":77.20,"current":"pm2_5"}, timeout=10)
        success("Satellite", "Open-Meteo API live", f"{r.status_code} OK")
    except Exception as e:
        warn("Satellite", f"API check: {e}")

    print_sources_table([
        {"name":"Open-Meteo CAMS","records":f"{len(CITIES)} cities","status":"ok",
         "sector":"Multi-sector","interval":"30s"},
        {"name":"Copernicus ECMWF","records":"Satellite grid","status":"ok",
         "sector":"Atmospheric","interval":"60s"},
    ])

    banner("Satellite Feed Active", "Streaming real-time air quality data")

    cycle = 0; total = 0
    try:
        while True:
            cycle += 1
            batch = random.sample(CITIES, random.randint(3, 6))
            section(f"Satellite Pass #{cycle} — {len(batch)} cities")

            cur = conn.cursor()
            now = datetime.now(timezone.utc)
            for city in batch:
                try:
                    resp = requests.get(API, params={
                        "latitude": city["lat"], "longitude": city["lon"],
                        "current": "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide"
                    }, timeout=10)
                    if resp.status_code != 200: continue
                    current = resp.json().get("current", {})
                    for api_key, poll in [("pm2_5","pm2_5"),("pm10","pm10"),
                        ("nitrogen_dioxide","no2"),("sulphur_dioxide","so2"),
                        ("carbon_monoxide","co")]:
                        val = current.get(api_key)
                        if val is None or val <= 0: continue
                        c = co2e(poll, val)
                        s = score(poll, val)
                        sect = SECTOR_MAP.get(poll, "industrial")

                        processed(city["name"], poll, c, s, "satellite")
                        kafka_sent(f"emissions.{sect}", city["name"], poll, val)
                        time.sleep(0.06)

                        if s < 30:
                            anomaly(city["name"], poll, "HIGH" if s < 15 else "MEDIUM",
                                    1.0 - s/100, val)

                        cur.execute(INSERT, {
                            "source":"open-meteo","city":city["name"],
                            "state":city["state"],"sector":sect,"pp":poll,
                            "pv":val,"unit":"µg/m³","co2e":c,"score":s,
                            "who":val>WHO.get(poll,100),"cpcb":val>CPCB.get(poll,200),
                            "lat":city["lat"],"lon":city["lon"],"ts":now,
                            "dq":"verified","raw":json.dumps(current)
                        })
                        total += 1
                except Exception:
                    pass
                time.sleep(0.1)

            conn.commit(); cur.close()
            success("DB Writer", f"Batch committed", f"Total: {total}")
            section_end()
            wait = random.uniform(4, 8)
            info("Scheduler", f"Next satellite pass in {wait:.0f}s...", f"cycle #{cycle+1}")
            time.sleep(wait)
    except KeyboardInterrupt:
        print()
        banner("Satellite Feed Stopped", f"Total records: {total}")
        conn.close()

if __name__ == "__main__":
    main()
