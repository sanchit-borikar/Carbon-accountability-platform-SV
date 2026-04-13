"""
Master city list for all VayuDrishti demo scripts.
Covers 50 major Indian cities with proper coordinates and state mappings.
"""

CITIES_ALL = [
    # Tier 1 — Metro cities (high pollution, industrial + transport)
    {"name":"Delhi","state":"Delhi","lat":28.61,"lon":77.20},
    {"name":"Mumbai","state":"Maharashtra","lat":19.07,"lon":72.87},
    {"name":"Chennai","state":"Tamil Nadu","lat":13.08,"lon":80.27},
    {"name":"Kolkata","state":"West Bengal","lat":22.57,"lon":88.36},
    {"name":"Bengaluru","state":"Karnataka","lat":12.97,"lon":77.59},
    {"name":"Hyderabad","state":"Telangana","lat":17.38,"lon":78.48},
    {"name":"Pune","state":"Maharashtra","lat":18.52,"lon":73.85},
    {"name":"Ahmedabad","state":"Gujarat","lat":23.02,"lon":72.57},
    # Tier 2 — State capitals & major hubs
    {"name":"Jaipur","state":"Rajasthan","lat":26.91,"lon":75.78},
    {"name":"Lucknow","state":"Uttar Pradesh","lat":26.85,"lon":80.95},
    {"name":"Patna","state":"Bihar","lat":25.59,"lon":85.13},
    {"name":"Bhopal","state":"Madhya Pradesh","lat":23.25,"lon":77.40},
    {"name":"Raipur","state":"Chhattisgarh","lat":21.25,"lon":81.62},
    {"name":"Ranchi","state":"Jharkhand","lat":23.34,"lon":85.33},
    {"name":"Bhubaneswar","state":"Odisha","lat":20.29,"lon":85.82},
    {"name":"Chandigarh","state":"Punjab","lat":30.73,"lon":76.77},
    {"name":"Guwahati","state":"Assam","lat":26.18,"lon":91.74},
    {"name":"Thiruvananthapuram","state":"Kerala","lat":8.52,"lon":76.93},
    {"name":"Dehradun","state":"Uttarakhand","lat":30.31,"lon":78.03},
    {"name":"Srinagar","state":"J&K","lat":34.08,"lon":74.79},
    # Tier 3 — Important industrial/urban centers
    {"name":"Nagpur","state":"Maharashtra","lat":21.14,"lon":79.08},
    {"name":"Indore","state":"Madhya Pradesh","lat":22.72,"lon":75.85},
    {"name":"Surat","state":"Gujarat","lat":21.17,"lon":72.83},
    {"name":"Visakhapatnam","state":"Andhra Pradesh","lat":17.68,"lon":83.21},
    {"name":"Coimbatore","state":"Tamil Nadu","lat":11.01,"lon":76.95},
    {"name":"Gurugram","state":"Haryana","lat":28.46,"lon":77.02},
    {"name":"Navi Mumbai","state":"Maharashtra","lat":19.03,"lon":73.02},
    {"name":"Jodhpur","state":"Rajasthan","lat":26.29,"lon":73.01},
    {"name":"Amritsar","state":"Punjab","lat":31.63,"lon":74.87},
    {"name":"Ludhiana","state":"Punjab","lat":30.90,"lon":75.85},
    {"name":"Varanasi","state":"Uttar Pradesh","lat":25.32,"lon":82.99},
    {"name":"Vijayawada","state":"Andhra Pradesh","lat":16.50,"lon":80.64},
    {"name":"Faridabad","state":"Haryana","lat":28.41,"lon":77.31},
    {"name":"Kochi","state":"Kerala","lat":9.93,"lon":76.26},
    {"name":"Thirupati","state":"Andhra Pradesh","lat":13.63,"lon":79.42},
    # Tier 4 — NE states + other important cities
    {"name":"Shimla","state":"Himachal Pradesh","lat":31.10,"lon":77.17},
    {"name":"Gangtok","state":"Sikkim","lat":27.33,"lon":88.61},
    {"name":"Panaji","state":"Goa","lat":15.49,"lon":73.82},
    {"name":"Puducherry","state":"Puducherry","lat":11.93,"lon":79.82},
    {"name":"Kohima","state":"Nagaland","lat":25.67,"lon":94.11},
    {"name":"Aizawl","state":"Mizoram","lat":23.73,"lon":92.71},
    {"name":"Shillong","state":"Meghalaya","lat":25.57,"lon":91.88},
    {"name":"Imphal","state":"Manipur","lat":24.81,"lon":93.94},
    {"name":"Agartala","state":"Tripura","lat":23.83,"lon":91.28},
    {"name":"Itanagar","state":"Arunachal Pradesh","lat":27.08,"lon":93.61},
    # Tier 5 — Industrial towns often in CPCB data
    {"name":"Dhanbad","state":"Jharkhand","lat":23.79,"lon":86.43},
    {"name":"Korba","state":"Chhattisgarh","lat":22.35,"lon":82.68},
    {"name":"Nashik","state":"Maharashtra","lat":19.99,"lon":73.78},
    {"name":"Rajkot","state":"Gujarat","lat":22.30,"lon":70.80},
    {"name":"Mysuru","state":"Karnataka","lat":12.29,"lon":76.64},
]

# Sector assignments for IoT/demo purposes
SECTOR_MAP_BY_CITY = {
    "Delhi": "industrial", "Mumbai": "industrial", "Chennai": "industrial",
    "Kolkata": "industrial", "Bengaluru": "transport", "Hyderabad": "transport",
    "Pune": "industrial", "Ahmedabad": "industrial", "Jaipur": "transport",
    "Lucknow": "industrial", "Patna": "transport", "Bhopal": "industrial",
    "Raipur": "industrial", "Ranchi": "industrial", "Bhubaneswar": "industrial",
    "Chandigarh": "transport", "Guwahati": "transport", "Thiruvananthapuram": "transport",
    "Dehradun": "transport", "Srinagar": "transport", "Nagpur": "industrial",
    "Indore": "industrial", "Surat": "industrial", "Visakhapatnam": "industrial",
    "Coimbatore": "industrial", "Gurugram": "transport", "Navi Mumbai": "industrial",
    "Jodhpur": "transport", "Amritsar": "transport", "Ludhiana": "industrial",
    "Varanasi": "transport", "Vijayawada": "industrial", "Faridabad": "industrial",
    "Kochi": "transport", "Thirupati": "transport", "Shimla": "transport",
    "Gangtok": "transport", "Panaji": "transport", "Puducherry": "transport",
    "Kohima": "transport", "Aizawl": "transport", "Shillong": "transport",
    "Imphal": "transport", "Agartala": "transport", "Itanagar": "transport",
    "Dhanbad": "industrial", "Korba": "industrial", "Nashik": "industrial",
    "Rajkot": "industrial", "Mysuru": "transport",
}

def get_sector(city_name):
    return SECTOR_MAP_BY_CITY.get(city_name, "industrial")
