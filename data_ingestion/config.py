"""
VayuDrishti - Carbon Emission Tracking Platform
Data ingestion configuration
"""

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

KAFKA_TOPICS = {
    "industrial": "vayudrishti.emissions.industrial",
    "transport": "vayudrishti.emissions.transport",
    "energy": "vayudrishti.emissions.energy",
    "historical": "vayudrishti.emissions.historical",
}

# Industrial Emission Sources - 5 Indian City Facilities
# Emission ranges in kg/hour
INDUSTRIAL_CONFIG = {
    "emit_interval_seconds": 5,
    "facilities": [
        {
            "facility_id": "IND-MUM-001",
            "name": "Mumbai Industrial Complex",
            "city": "Mumbai",
            "lat": 19.0760,
            "lon": 72.8777,
            "emissions": {
                "co2": {"min": 500, "max": 2000},
                "nox": {"min": 5, "max": 50},
                "so2": {"min": 3, "max": 30},
                "pm25": {"min": 1, "max": 15},
            },
        },
        {
            "facility_id": "IND-DEL-002",
            "name": "Delhi Manufacturing Unit",
            "city": "Delhi",
            "lat": 28.7041,
            "lon": 77.1025,
            "emissions": {
                "co2": {"min": 600, "max": 2500},
                "nox": {"min": 8, "max": 60},
                "so2": {"min": 5, "max": 40},
                "pm25": {"min": 2, "max": 20},
            },
        },
        {
            "facility_id": "IND-CHE-003",
            "name": "Chennai Petrochemical Plant",
            "city": "Chennai",
            "lat": 13.0827,
            "lon": 80.2707,
            "emissions": {
                "co2": {"min": 700, "max": 3000},
                "nox": {"min": 10, "max": 70},
                "so2": {"min": 6, "max": 45},
                "pm25": {"min": 2, "max": 18},
            },
        },
        {
            "facility_id": "IND-KOL-004",
            "name": "Kolkata Steel Works",
            "city": "Kolkata",
            "lat": 22.5726,
            "lon": 88.3639,
            "emissions": {
                "co2": {"min": 800, "max": 3500},
                "nox": {"min": 12, "max": 80},
                "so2": {"min": 8, "max": 55},
                "pm25": {"min": 3, "max": 25},
            },
        },
        {
            "facility_id": "IND-HYD-005",
            "name": "Hyderabad Cement Factory",
            "city": "Hyderabad",
            "lat": 17.3850,
            "lon": 78.4867,
            "emissions": {
                "co2": {"min": 450, "max": 1800},
                "nox": {"min": 4, "max": 35},
                "so2": {"min": 2, "max": 25},
                "pm25": {"min": 1, "max": 12},
            },
        },
    ]
}

# Transport Emission Sources - 5 Fleets
# CO2 emission factors in kg/km
TRANSPORT_CONFIG = {
    "emit_interval_seconds": 5,
    "emission_factors": {
        "diesel_bus": 0.89,
        "heavy_truck": 1.15,
        "petrol_car": 0.21,
    },
    "fleets": [
        {
            "fleet_id": "TRN-FL-001",
            "name": "Mumbai City Bus Fleet",
            "city": "Mumbai",
            "lat": 19.0760,
            "lon": 72.8777,
            "vehicle_type": "diesel_bus",
            "distance_range": {"min": 10, "max": 120},
            "vehicle_count": 120,
        },
        {
            "fleet_id": "TRN-FL-002",
            "name": "Delhi Heavy Freight",
            "city": "Delhi",
            "lat": 28.7041,
            "lon": 77.1025,
            "vehicle_type": "heavy_truck",
            "distance_range": {"min": 50, "max": 300},
            "vehicle_count": 80,
        },
        {
            "fleet_id": "TRN-FL-003",
            "name": "Chennai Urban Taxi",
            "city": "Chennai",
            "lat": 13.0827,
            "lon": 80.2707,
            "vehicle_type": "petrol_car",
            "distance_range": {"min": 5, "max": 80},
            "vehicle_count": 300,
        },
        {
            "fleet_id": "TRN-FL-004",
            "name": "Kolkata Logistics Fleet",
            "city": "Kolkata",
            "lat": 22.5726,
            "lon": 88.3639,
            "vehicle_type": "heavy_truck",
            "distance_range": {"min": 40, "max": 250},
            "vehicle_count": 60,
        },
        {
            "fleet_id": "TRN-FL-005",
            "name": "Hyderabad Public Transit",
            "city": "Hyderabad",
            "lat": 17.3850,
            "lon": 78.4867,
            "vehicle_type": "diesel_bus",
            "distance_range": {"min": 15, "max": 100},
            "vehicle_count": 150,
        },
    ]
}

# Energy Grid Emission Sources - 5 Grids
# CO2 intensity in kg/MWh
ENERGY_CONFIG = {
    "emit_interval_seconds": 5,
    "emission_intensity": {
        "coal": 920,
        "gas": 450,
        "mixed": 680,
        "solar": 40,
    },
    "grids": [
        {
            "grid_id": "ENG-GR-001",
            "name": "Maharashtra State Grid",
            "city": "Mumbai",
            "lat": 19.0760,
            "lon": 72.8777,
            "source": "coal",
            "generation_range": {"min": 200, "max": 800},
            "capacity_mw": 5000,
        },
        {
            "grid_id": "ENG-GR-002",
            "name": "Delhi NCR Grid",
            "city": "Delhi",
            "lat": 28.7041,
            "lon": 77.1025,
            "source": "gas",
            "generation_range": {"min": 150, "max": 600},
            "capacity_mw": 3500,
        },
        {
            "grid_id": "ENG-GR-003",
            "name": "Tamil Nadu Grid",
            "city": "Chennai",
            "lat": 13.0827,
            "lon": 80.2707,
            "source": "mixed",
            "generation_range": {"min": 180, "max": 700},
            "capacity_mw": 4200,
        },
        {
            "grid_id": "ENG-GR-004",
            "name": "Rajasthan Solar Grid",
            "city": "Jaipur",
            "lat": 26.9124,
            "lon": 75.7873,
            "source": "solar",
            "generation_range": {"min": 100, "max": 500},
            "capacity_mw": 2500,
        },
        {
            "grid_id": "ENG-GR-005",
            "name": "West Bengal Grid",
            "city": "Kolkata",
            "lat": 22.5726,
            "lon": 88.3639,
            "source": "coal",
            "generation_range": {"min": 160, "max": 650},
            "capacity_mw": 3800,
        },
    ]
}

# OpenAQ API Configuration
OPENAQ_CONFIG = {
    "base_url": "https://api.openaq.org/v2",
    "cities": ["Mumbai", "Delhi", "Chennai", "Kolkata", "Hyderabad"],
    "parameters": ["pm25", "pm10", "no2", "so2", "co", "o3"],
}
