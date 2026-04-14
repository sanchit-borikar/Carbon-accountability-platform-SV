"""
VayuDrishti - Unit Normalizer
Standardizes all pollutant concentrations to ug/m3 at 25C, 1 atm.
"""

MOLECULAR_WEIGHTS = {
    "no2": 46.0,
    "so2": 64.0,
    "co": 28.0,
    "co2": 44.0,
    "pm25": 1.0,
    "pm2_5": 1.0,
    "ch4": 16.0,
    "n2o": 44.0,
    "o3": 48.0,
}

POLLUTANT_FIELDS = [
    "pm2_5", "pm25", "no2", "so2", "co", "co2",
    "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide",
    "value", "pollutant_avg",
]

# Map verbose names to short names for MW lookup
FIELD_TO_POLLUTANT = {
    "carbon_monoxide": "co",
    "nitrogen_dioxide": "no2",
    "sulphur_dioxide": "so2",
}


def ppb_to_ugm3(value, pollutant):
    """Convert ppb to ug/m3 at 25C, 1 atm."""
    mw = MOLECULAR_WEIGHTS.get(pollutant.lower(), 1.0)
    return value * mw * 1000 / 24.45


def ppm_to_ugm3(value, pollutant):
    """Convert ppm to ug/m3 at 25C, 1 atm."""
    return ppb_to_ugm3(value * 1000, pollutant)


def normalize_record(record):
    """Normalize all pollutant values in a record to ug/m3."""
    unit = record.get("unit", "").lower().strip()

    if unit in ("ppm", "ppb", "mg/m3"):
        for field in POLLUTANT_FIELDS:
            if field in record and record[field] is not None:
                try:
                    val = float(record[field])
                except (ValueError, TypeError):
                    continue

                pollutant_key = FIELD_TO_POLLUTANT.get(field, field)

                if unit == "ppm":
                    record[field] = round(ppm_to_ugm3(val, pollutant_key), 4)
                elif unit == "ppb":
                    record[field] = round(ppb_to_ugm3(val, pollutant_key), 4)
                elif unit == "mg/m3":
                    record[field] = round(val * 1000, 4)

    record["unit_normalized"] = "ug/m3"
    return record
