"""
VayuDrishti - MQTT Broker Configuration & JWT Utilities
"""

import time

import jwt

BROKER_HOST = "broker.emqx.io"
BROKER_PORT = 1883
JWT_SECRET = "vayu_drishti_secret_2026"

MQTT_TOPICS = {
    "industrial": "vayu/industrial/sensors",
    "transport": "vayu/transport/sensors",
    "energy": "vayu/energy/sensors",
}


def generate_token(device_id, sector):
    """Create a JWT token with 24-hour expiry for a device."""
    payload = {
        "device_id": device_id,
        "sector": sector,
        "iat": int(time.time()),
        "exp": int(time.time()) + 86400,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token):
    """Verify and decode a JWT token. Returns payload or None if invalid."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None
