"""
VayuDrishti — Terminal 4: NASA GEOS-CF + Energy Grid Feed
Simulated NASA satellite data and energy sector emissions.
"""
import sys, os, time, random, json, math
from datetime import datetime, timezone
import psycopg2

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vayu_logger import (banner, section, section_end, info, success,
                         warn, processed, kafka_sent, anomaly, ml_result,
                         print_sources_table, C, ist)
from demo_cities import CITIES_ALL

DB = dict(host=os.getenv("DB_HOST","localhost"), port=os.getenv("DB_PORT","5432"),
          dbname=os.getenv("DB_NAME","vayu_drishti"), user=os.getenv("DB_USER","postgres"),
          password=os.getenv("DB_PASSWORD","vayu2026"))

ENERGY_PLANTS = [
    {"name":"Delhi","state":"Delhi","lat":28.70,"lon":77.10,"plant":"NTPC-Badarpur","type":"coal"},
    {"name":"Mumbai","state":"Maharashtra","lat":19.05,"lon":72.92,"plant":"Tata-Trombay","type":"gas"},
    {"name":"Chennai","state":"Tamil Nadu","lat":13.12,"lon":80.30,"plant":"TANGEDCO-North","type":"coal"},
    {"name":"Kolkata","state":"West Bengal","lat":22.48,"lon":88.32,"plant":"CESC-Budge","type":"coal"},
    {"name":"Ahmedabad","state":"Gujarat","lat":23.10,"lon":72.50,"plant":"Adani-Mundra","type":"coal"},
    {"name":"Hyderabad","state":"Telangana","lat":17.45,"lon":78.55,"plant":"TSGENCO-Kothagudem","type":"coal"},
    {"name":"Bengaluru","state":"Karnataka","lat":12.90,"lon":77.55,"plant":"KPCL-Raichur","type":"solar"},
    {"name":"Pune","state":"Maharashtra","lat":18.55,"lon":73.90,"plant":"Mahagenco-Bhusawal","type":"coal"},
    {"name":"Lucknow","state":"Uttar Pradesh","lat":26.90,"lon":80.98,"plant":"UPRVUNL-Obra","type":"coal"},
    {"name":"Bhopal","state":"Madhya Pradesh","lat":23.30,"lon":77.45,"plant":"MPPGCL-Satpura","type":"coal"},
    {"name":"Raipur","state":"Chhattisgarh","lat":21.30,"lon":81.60,"plant":"CSEB-Korba","type":"coal"},
    {"name":"Jaipur","state":"Rajasthan","lat":26.95,"lon":75.75,"plant":"RVUNL-Kota","type":"gas"},
    {"name":"Nagpur","state":"Maharashtra","lat":21.14,"lon":79.08,"plant":"Mahagenco-Koradi","type":"coal"},
    {"name":"Surat","state":"Gujarat","lat":21.17,"lon":72.83,"plant":"GSECL-Ukai","type":"gas"},
    {"name":"Dhanbad","state":"Jharkhand","lat":23.79,"lon":86.43,"plant":"DVC-Chandrapura","type":"coal"},
    {"name":"Korba","state":"Chhattisgarh","lat":22.35,"lon":82.68,"plant":"NTPC-Korba","type":"coal"},
    {"name":"Visakhapatnam","state":"Andhra Pradesh","lat":17.68,"lon":83.21,"plant":"APGENCO-Simhadri","type":"coal"},
]

NASA_GRID = CITIES_ALL  # All 50 cities for satellite coverage

WHO = {"pm2_5":25,"pm10":50,"no2":40,"so2":20,"co":4000}
CPCB_L = {"pm2_5":60,"pm10":100,"no2":80,"so2":80,"co":2000}
CO2F = {"pm2_5":110,"pm10":50,"no2":298,"so2":132,"co":1}

INSERT = """INSERT INTO emission_records
(source,city,state,sector,primary_pollutant,primary_value,unit,
co2_equivalent,compliance_score,exceeds_who,exceeds_cpcb,
latitude,longitude,timestamp,data_quality,raw_data)
VALUES (%(source)s,%(city)s,%(state)s,%(sector)s,%(pp)s,%(pv)s,%(unit)s,
%(co2e)s,%(score)s,%(who)s,%(cpcb)s,%(lat)s,%(lon)s,%(ts)s,%(dq)s,%(raw)s)"""

def co2e(p, v): return round(v * CO2F.get(p, 1), 1)

def sc(p, v):
    w = WHO.get(p, 100); r = v / w if w else 1
    if r <= 0.5: return 100
    elif r <= 1.0: return max(50, int(100-(r-0.5)*100))
    elif r <= 2.0: return max(25, int(50-(r-1.0)*25))
    else: return max(0, int(25-(r-2.0)*10))

def main():
    print(f"\n{C.MAGENTA}{'═'*64}{C.RESET}")
    print(f"\n  {C.MAGENTA}{C.BOLD}🌍  NASA GEOS-CF + ENERGY GRID MONITOR{C.RESET}")
    print(f"  {C.MUTED}NASA Goddard Earth Observing System — Composition Forecasting{C.RESET}")
    print(f"  {C.MUTED}NTPC / State Genco energy plant emission monitors{C.RESET}")
    print(f"  {C.MUTED}Grid: {len(NASA_GRID)} satellite cells + {len(ENERGY_PLANTS)} power plants{C.RESET}")
    print(f"\n{C.MAGENTA}{'═'*64}{C.RESET}\n")

    conn = psycopg2.connect(**DB)
    success("NASA/Energy", "PostgreSQL connected", DB["dbname"])

    print_sources_table([
        {"name":"NASA GEOS-CF","records":f"{len(NASA_GRID)} cells","status":"ok",
         "sector":"Atmospheric","interval":"300s"},
        {"name":"Energy Grid SCADA","records":f"{len(ENERGY_PLANTS)} plants","status":"ok",
         "sector":"Energy","interval":"30s"},
    ])

    banner("NASA + Energy Feed Active", "Satellite + power plant monitoring")

    cycle = 0; total = 0
    try:
        while True:
            cycle += 1

            # === Part A: NASA satellite grid ===
            nasa_batch = random.sample(NASA_GRID, random.randint(3, 5))
            section(f"NASA Orbit #{cycle} — {len(nasa_batch)} grid cells")

            cur = conn.cursor()
            now = datetime.now(timezone.utc)
            for cell in nasa_batch:
                # NASA tracks column-density NO2 and aerosol optical depth
                for poll, lo, hi, sect in [("pm2_5",10,280,"industrial"),("no2",8,110,"transport")]:
                    val = round(random.uniform(lo, hi), 1)
                    c = co2e(poll, val)
                    s = sc(poll, val)
                    processed(cell["name"], poll, c, s, "nasa-geos")
                    kafka_sent(f"emissions.{sect}", cell["name"], poll, val)
                    time.sleep(0.07)
                    if s < 30:
                        anomaly(cell["name"], poll, "HIGH" if s < 15 else "MEDIUM",
                                1.0 - s/100, val)
                    cur.execute(INSERT, {
                        "source":"nasa_geos","city":cell["name"],
                        "state":cell["state"],"sector":sect,"pp":poll,
                        "pv":val,"unit":"µg/m³","co2e":c,"score":s,
                        "who":val>WHO.get(poll,100),"cpcb":val>CPCB_L.get(poll,200),
                        "lat":cell["lat"],"lon":cell["lon"],"ts":now,
                        "dq":"satellite","raw":json.dumps({"grid_lat":cell["lat"],"grid_lon":cell["lon"]})
                    })
                    total += 1

            conn.commit()
            success("DB Writer", f"NASA batch saved", f"Records: {total}")
            section_end()

            time.sleep(random.uniform(2, 4))

            # === Part B: Energy plant emissions ===
            plants = random.sample(ENERGY_PLANTS, random.randint(3, 5))
            section(f"Energy Grid Scan #{cycle} — {len(plants)} plants")

            for plant in plants:
                # Coal/gas plants emit SO2 and PM heavily
                base_so2 = 60 if plant["type"] == "coal" else 15
                base_pm = 120 if plant["type"] == "coal" else 35
                so2_val = round(random.uniform(base_so2 * 0.5, base_so2 * 2.5), 1)
                pm_val = round(random.uniform(base_pm * 0.4, base_pm * 2.0), 1)

                for poll, val in [("so2", so2_val), ("pm2_5", pm_val)]:
                    c = co2e(poll, val)
                    s = sc(poll, val)
                    label = f"energy:{plant['plant']}"
                    processed(plant["name"], poll, c, s, label[:15])
                    kafka_sent("emissions.energy", plant["name"], poll, val)
                    time.sleep(0.10)
                    if s < 25:
                        anomaly(plant["name"], poll, "HIGH", 1.0-s/100, val)
                    cur.execute(INSERT, {
                        "source":"energy_grid","city":plant["name"],
                        "state":plant["state"],"sector":"energy","pp":poll,
                        "pv":val,"unit":"µg/m³","co2e":c,"score":s,
                        "who":val>WHO.get(poll,100),"cpcb":val>CPCB_L.get(poll,200),
                        "lat":plant["lat"],"lon":plant["lon"],"ts":now,
                        "dq":"scada","raw":json.dumps({"plant":plant["plant"],"fuel":plant["type"]})
                    })
                    total += 1

            conn.commit(); cur.close()
            success("DB Writer", f"Energy + NASA committed", f"Total: {total}")
            section_end()

            # Occasionally show ML-style result box
            if cycle % 3 == 0:
                city = random.choice(["Delhi","Mumbai","Chennai"])
                ml_result("XGBoost-CO2e", city, "pm2_5",
                          round(random.uniform(88, 96), 1),
                          round(random.uniform(3, 12), 1),
                          random.randint(1200, 4500))

            wait = random.uniform(5, 10)
            info("Scheduler", f"Next scan in {wait:.0f}s...", f"cycle #{cycle+1}")
            time.sleep(wait)
    except KeyboardInterrupt:
        print()
        banner("NASA + Energy Feed Stopped", f"Total records: {total}")
        conn.close()

if __name__ == "__main__":
    main()
