"""
VayuDrishti — Terminal 3: CPCB Official Station Feed
Simulated Central Pollution Control Board monitoring stations.
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
from demo_cities import CITIES_ALL

DB = dict(host=os.getenv("DB_HOST","localhost"), port=os.getenv("DB_PORT","5432"),
          dbname=os.getenv("DB_NAME","vayu_drishti"), user=os.getenv("DB_USER","postgres"),
          password=os.getenv("DB_PASSWORD","vayu2026"))

# Build CPCB stations from master city list (one station per city)
_ZONE_MAP = {
    "Delhi":"North","Uttar Pradesh":"North","Punjab":"North","Haryana":"North",
    "Rajasthan":"North","Himachal Pradesh":"North","Uttarakhand":"North","J&K":"North",
    "Maharashtra":"West","Gujarat":"West","Goa":"West",
    "Tamil Nadu":"South","Karnataka":"South","Kerala":"South","Telangana":"South",
    "Andhra Pradesh":"South","Puducherry":"South",
    "West Bengal":"East","Bihar":"East","Odisha":"East","Jharkhand":"East",
    "Madhya Pradesh":"Central","Chhattisgarh":"Central",
    "Assam":"NE","Meghalaya":"NE","Nagaland":"NE","Manipur":"NE",
    "Mizoram":"NE","Tripura":"NE","Arunachal Pradesh":"NE","Sikkim":"NE",
}
_PCB_MAP = {
    "Delhi":"DPCC","Maharashtra":"MPCB","Tamil Nadu":"TNPCB","West Bengal":"WBPCB",
    "Karnataka":"KSPCB","Telangana":"TSPCB","Gujarat":"GPCB","Rajasthan":"RSPCB",
    "Uttar Pradesh":"UPPCB","Bihar":"BSPCB","Madhya Pradesh":"MPPCB",
    "Chhattisgarh":"CGPCB","Jharkhand":"JSPCB","Punjab":"PBPCB","Assam":"ASPCB",
    "Odisha":"OSPCB","Uttarakhand":"UKPCB","Andhra Pradesh":"APPCB",
    "Kerala":"KSPCB-K","Haryana":"HSPCB","Goa":"GSPCB",
}

STATIONS = []
for i, c in enumerate(CITIES_ALL):
    pcb = _PCB_MAP.get(c["state"], "PCB")
    STATIONS.append({
        "name": c["name"], "state": c["state"],
        "lat": c["lat"] + 0.01, "lon": c["lon"] + 0.02,
        "station": f"{pcb}-{i+1:03d}",
        "zone": _ZONE_MAP.get(c["state"], "Other"),
    })

POLLUTANTS = [
    ("pm2_5", (15, 320), "industrial"),
    ("pm10", (30, 450), "industrial"),
    ("no2", (10, 140), "transport"),
    ("so2", (5, 100), "industrial"),
    ("co", (200, 5500), "transport"),
]

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
    print(f"\n{C.BLUE}{'═'*64}{C.RESET}")
    print(f"\n  {C.BLUE}{C.BOLD}🏛️  CPCB OFFICIAL MONITORING STATIONS{C.RESET}")
    print(f"  {C.MUTED}Central Pollution Control Board — Govt. of India{C.RESET}")
    print(f"  {C.MUTED}National Air Quality Monitoring Programme (NAMP){C.RESET}")
    print(f"  {C.MUTED}Stations: {len(STATIONS)} continuous ambient AQ monitors{C.RESET}")
    print(f"\n{C.BLUE}{'═'*64}{C.RESET}\n")

    conn = psycopg2.connect(**DB)
    success("CPCB", "PostgreSQL connected", DB["dbname"])

    print_sources_table([
        {"name":"CPCB CAAQMS","records":f"{len(STATIONS)} stations","status":"ok",
         "sector":"Multi-sector","interval":"60s"},
        {"name":"NAMP Manual","records":"12 stations","status":"ok",
         "sector":"Industrial","interval":"120s"},
    ])

    banner("CPCB Data Feed Active", "Official government air quality data")

    cycle = 0; total = 0
    try:
        while True:
            cycle += 1
            batch = random.sample(STATIONS, random.randint(4, 7))
            section(f"CPCB Report #{cycle} — {len(batch)} stations")

            cur = conn.cursor()
            now = datetime.now(timezone.utc)
            for stn in batch:
                # Each station reports 2-3 pollutants per cycle
                polls = random.sample(POLLUTANTS, random.randint(2, 3))
                for poll, (lo, hi), sector in polls:
                    val = round(random.uniform(lo, hi), 1)
                    c = co2e(poll, val)
                    s = sc(poll, val)

                    processed(stn["name"], poll, c, s, f"cpcb:{stn['station']}")
                    kafka_sent(f"emissions.{sector}", stn["name"], poll, val)
                    time.sleep(0.09)

                    if s < 20:
                        anomaly(stn["name"], poll, "HIGH", 1.0-s/100, val)

                    cur.execute(INSERT, {
                        "source":"cpcb","city":stn["name"],
                        "state":stn["state"],"sector":sector,"pp":poll,
                        "pv":val,"unit":"µg/m³","co2e":c,"score":s,
                        "who":val>WHO.get(poll,100),"cpcb":val>CPCB_L.get(poll,200),
                        "lat":stn["lat"],"lon":stn["lon"],"ts":now,
                        "dq":"official","raw":json.dumps({"station":stn["station"],"zone":stn["zone"]})
                    })
                    total += 1
                time.sleep(0.05)

            conn.commit(); cur.close()
            success("DB Writer", f"Official data committed", f"Total: {total}")
            section_end()
            wait = random.uniform(5, 9)
            info("Scheduler", f"Next report in {wait:.0f}s...", f"cycle #{cycle+1}")
            time.sleep(wait)
    except KeyboardInterrupt:
        print()
        banner("CPCB Feed Stopped", f"Total records: {total}")
        conn.close()

if __name__ == "__main__":
    main()
