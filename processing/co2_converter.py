"""
VayuDrishti - CO2 Converter & Compliance Scorer
Converts pollutants to CO2 equivalent and scores against WHO/CPCB limits.
"""

GWP_FACTORS = {
    "co2": 1.0,
    "ch4": 28.0,
    "n2o": 265.0,
    "no2": 298.0,
    "co": 1.57,
    "so2": 0.0,
    "pm25": 0.0,
    "pm2_5": 0.0,
}

WHO_LIMITS = {
    "pm2_5": 15.0,
    "pm25": 15.0,
    "no2": 10.0,
    "so2": 40.0,
    "co": 4000.0,
    "co2": 1800.0,
}

CPCB_LIMITS = {
    "pm2_5": 60.0,
    "pm25": 60.0,
    "no2": 80.0,
    "so2": 80.0,
    "co": 2000.0,
}

# Fields to check for primary pollutant, in priority order
_POLLUTANT_FIELDS = [
    ("pm2_5", "pm2_5"), ("pm25", "pm25"), ("co2", "co2"),
    ("no2", "no2"), ("so2", "so2"), ("co", "co"),
    ("carbon_monoxide", "co"), ("nitrogen_dioxide", "no2"),
    ("sulphur_dioxide", "so2"), ("value", "unknown"),
    ("pollutant_avg", "unknown"),
]


def get_primary_pollutant(record: dict) -> tuple:
    
    # PRIORITY 1: Direct numeric fields (MQTT/OpenMeteo format)
    DIRECT_FIELDS = [
        ("co2",              "co2"),
        ("pm25",             "pm25"),
        ("pm2_5",            "pm2_5"),
        ("no2",              "no2"),
        ("so2",              "so2"),
        ("co",               "co"),
        ("carbon_monoxide",  "co"),
        ("nitrogen_dioxide", "no2"),
        ("sulphur_dioxide",  "so2"),
        ("aqi",              "aqi"),
        ("value",            "value"),
    ]
    for field, name in DIRECT_FIELDS:
        raw = record.get(field)
        if raw is not None:
            try:
                val = float(str(raw).replace(",","").strip())
                if val > 0:
                    return (name, val)
            except:
                continue
    
    # PRIORITY 2: data.gov.in format
    pollutant_id = str(record.get("pollutant",
                   record.get("pollutant_id",""))).lower().strip()
    POLLUTANT_MAP = {
        "pm2.5":"pm2_5","pm25":"pm25","pm10":"pm10",
        "no2":"no2","so2":"so2","co":"co",
        "ozone":"o3","nh3":"nh3","co2":"co2","no":"no",
    }
    if pollutant_id and pollutant_id not in ["","none","nan"]:
        standard = POLLUTANT_MAP.get(pollutant_id, pollutant_id)
        for vf in ["pollutant_avg","value_avg","value"]:
            raw = record.get(vf)
            if raw and str(raw).strip() not in \
               ["","None","NA","N/A","nan","none"]:
                try:
                    val = float(str(raw).replace(",","").strip())
                    if val >= 0:
                        return (standard, val)
                except:
                    continue
    return ("unknown", 0.0)


COMBUSTION_CO2_FACTORS = {
    "co2":   1.0,    "ch4":  28.0,   "n2o":  265.0,
    "no2":   298.0,  "no":   298.0,  "co":   1.57,
    "so2":   2.0,    "nh3":  0.0,    "o3":   0.0,
    "pm2_5": 110.0,  "pm25": 110.0,  "pm10": 50.0,
    "carbon_monoxide":   1.57,
    "nitrogen_dioxide":  298.0,
    "sulphur_dioxide":   2.0,
    "aqi":   0.5,    "value": 1.0,
}


def calculate_co2e(pollutant, value):
    """Calculate CO2 equivalent using combustion-based conversion factors."""
    factor = COMBUSTION_CO2_FACTORS.get(pollutant.lower(), 1.0)
    return round(value * factor, 4)


def calculate_compliance_score(pollutant, value):
    """Score from 0-100 (100 = clean, 0 = extremely polluted) against WHO/CPCB."""
    who_limit = WHO_LIMITS.get(pollutant.lower(), 100.0)
    cpcb_limit = CPCB_LIMITS.get(pollutant.lower(), 100.0)
    strict_limit = min(who_limit, cpcb_limit)

    if value <= strict_limit:
        return 100
    elif value <= strict_limit * 2:
        return 75
    elif value <= strict_limit * 4:
        return 50
    elif value <= strict_limit * 8:
        return 25
    else:
        return 0


def enrich_record(record):
    """Add CO2e, compliance score, and limit comparisons to a record."""
    pollutant, value = get_primary_pollutant(record)

    co2e = calculate_co2e(pollutant, value)
    score = calculate_compliance_score(pollutant, value)

    who_limit = WHO_LIMITS.get(pollutant.lower())
    cpcb_limit = CPCB_LIMITS.get(pollutant.lower())

    record["primary_pollutant"] = pollutant
    record["primary_value"] = value
    record["co2_equivalent"] = co2e
    record["compliance_score"] = score
    record["who_limit"] = who_limit
    record["cpcb_limit"] = cpcb_limit
    record["exceeds_who"] = value > who_limit if who_limit is not None else False
    record["exceeds_cpcb"] = value > cpcb_limit if cpcb_limit is not None else False

    return record
