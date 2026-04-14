"""
VayuDrishti — Terminal 2: IoT Ground Sensor Feed
Simulated real-time industrial & transport ground sensors.
"""
import sys, os, time, random, json
from datetime import datetime, timezone
import psycopg2

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vayu_logger import (banner, section, section_end, info, success,
                         warn, processed, kafka_sent, anomaly,
                         print_sources_table, C, ist)
from demo_cities import CITIES_ALL, get_sector

DB = dict(host=os.getenv("DB_HOST","localhost"), port=os.getenv("DB_PORT","5432"),
          dbname=os.getenv("DB_NAME","vayu_drishti"), user=os.getenv("DB_USER","postgres"),
          password=os.getenv("DB_PASSWORD","vayu2026"))

CITIES = [
    {**c, "sector": get_sector(c["name"])} for c in CITIES_ALL
]

DEVICES = {
    "industrial": [
        ("IND-WEST-{:03d}", "pm2_5", (40, 380)),
        ("IND-EAST-{:03d}", "so2", (5, 120)),
        ("IND-STACK-{:03d}", "co", (500, 6000)),
    ],
    "transport": [
        ("TRN-FLEET-{:03d}", "no2", (15, 130)),
        ("TRN-HWY-{:03d}", "co", (200, 5000)),
        ("TRN-METRO-{:03d}", "pm2_5", (20, 200)),
    ],
}

WHO = {"pm2_5":25,"pm10":50,"no2":40,"so2":20,"co":4000}
CPCB = {"pm2_5":60,"pm10":100,"no2":80,"so2":80,"co":2000}
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
    print(f"\n{C.ORANGE}{'═'*64}{C.RESET}")
    print(f"\n  {C.ORANGE}{C.BOLD}📡  IoT GROUND SENSOR NETWORK{C.RESET}")
    print(f"  {C.MUTED}Real-time emission monitoring via on-site IoT sensors{C.RESET}")
    print(f"  {C.MUTED}Protocol: MQTT → VayuDrishti Processing Pipeline{C.RESET}")
    print(f"  {C.MUTED}Devices: 48 active sensors across {len(CITIES)} cities{C.RESET}")
    print(f"\n{C.ORANGE}{'═'*64}{C.RESET}\n")

    conn = psycopg2.connect(**DB)
    success("IoT Hub", "PostgreSQL connected", DB["dbname"])

    print_sources_table([
        {"name":"Industrial Sensors","records":"24 devices","status":"ok",
         "sector":"Industrial","interval":"10s"},
        {"name":"Transport Monitors","records":"24 devices","status":"ok",
         "sector":"Transport","interval":"15s"},
    ])

    banner("IoT Sensor Network Live", "Streaming ground-level emission data")

    cycle = 0; total = 0
    try:
        while True:
            cycle += 1
            batch = random.sample(CITIES, random.randint(3, 5))
            section(f"Sensor Sweep #{cycle} — {len(batch)} stations")

            cur = conn.cursor()
            now = datetime.now(timezone.utc)
            for city in batch:
                devices = DEVICES.get(city["sector"], DEVICES["industrial"])
                dev_tmpl, poll, (lo, hi) = random.choice(devices)
                dev_id = dev_tmpl.format(random.randint(1, 99))
                val = round(random.uniform(lo, hi), 1)
                c = co2e(poll, val)
                s = sc(poll, val)

                processed(city["name"], poll, c, s, f"iot:{dev_id}")
                kafka_sent(f"emissions.{city['sector']}", city["name"], poll, val)
                time.sleep(0.15)

                if s < 25:
                    anomaly(city["name"], poll, "HIGH", 1.0 - s/100, val)
                elif s < 40:
                    anomaly(city["name"], poll, "MEDIUM", 1.0 - s/100, val)

                cur.execute(INSERT, {
                    "source":"ground_sensor","city":city["name"],
                    "state":city["state"],"sector":city["sector"],"pp":poll,
                    "pv":val,"unit":"µg/m³","co2e":c,"score":s,
                    "who":val>WHO.get(poll,100),"cpcb":val>CPCB.get(poll,200),
                    "lat":city["lat"],"lon":city["lon"],"ts":now,
                    "dq":"verified","raw":json.dumps({"device":dev_id,"reading":val})
                })
                total += 1

            conn.commit(); cur.close()
            success("DB Writer", f"Sensor batch saved", f"Total: {total}")
            section_end()
            wait = random.uniform(3, 6)
            info("Scheduler", f"Next sweep in {wait:.0f}s...", f"cycle #{cycle+1}")
            time.sleep(wait)
    except KeyboardInterrupt:
        print()
        banner("IoT Feed Stopped", f"Total records: {total}")
        conn.close()

if __name__ == "__main__":
    main()
