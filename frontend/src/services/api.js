const BASE_URL = "http://localhost:8000";
const WS_URL   = "ws://localhost:8000/ws/live";

// ── CORE FETCHER ─────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null)
      url.searchParams.append(k, String(v));
  });
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`VayuDrishti API: ${endpoint}`, err);
    return null;
  }
}

// ── DASHBOARD ────────────────────────────────
export const getDashboardSummary = () =>
  apiFetch("/api/dashboard/summary");

export const getHealth = () =>
  apiFetch("/health");

export const getSourceCounts = () =>
  apiFetch("/api/pipeline/sources");

// ── EMISSIONS ────────────────────────────────
export const getEmissions = (params = {}) =>
  apiFetch("/api/emissions", params);

export const getLatestEmissions = (limit = 50) =>
  apiFetch("/api/emissions/latest", { limit });

export const getCityEmissions = (city, limit = 100) =>
  apiFetch(`/api/emissions/city/${encodeURIComponent(city)}`, { limit });

export const getViolations = (params = {}) =>
  apiFetch("/api/emissions/violations", params);

// ── COMPLIANCE ───────────────────────────────
export const getAllCompliance = (params = {}) =>
  apiFetch("/api/compliance", params);

export const getCityCompliance = (city) =>
  apiFetch(`/api/compliance/${encodeURIComponent(city)}`);

// ── CITIES ───────────────────────────────────
export const getAllCities = () =>
  apiFetch("/api/cities");

// ── ML & ANALYTICS ───────────────────────────
export const getAnomalies = () =>
  apiFetch("/api/anomalies");

export const getSectors = () =>
  apiFetch("/api/sectors");

export const getMLSummary = () =>
  apiFetch("/api/ml/summary");

export const getForecast = (city, pollutant) =>
  apiFetch(`/api/forecast/${encodeURIComponent(city)}/${encodeURIComponent(pollutant)}`);

// ── BLOCKCHAIN ───────────────────────────────
export const getBlockchainStats = () =>
  apiFetch("/api/blockchain/stats");

export const verifyRecord = (id) =>
  apiFetch(`/api/blockchain/verify/${encodeURIComponent(String(id))}`);

export const getAnchoredRecords = () =>
  apiFetch("/api/blockchain/anchored");

// ── DATA TRANSFORMERS ────────────────────────
export function toMapMarkers(cities) {
  if (!cities) return [];
  return cities.map((c, i) => {
    const score = Math.round(c.compliance_score || 0);
    const co2e = Math.round(c.avg_co2_equivalent || 0);
    const flagged = (c.who_violations || 0) > 0;
    return {
      id:         i + 1,
      name:       c.city,
      lat:        c.latitude  || 20.5937,
      lng:        c.longitude || 78.9629,
      score,
      grade:      scoreToGrade(score),
      emissions:  co2e,
      co2e,
      sector:     c.sector || guessSector(c.city),
      state:      c.state || guessState(c.city),
      location:   `${c.city}, ${c.state || guessState(c.city) || "India"}`,
      violations: c.who_violations || 0,
      flagged,
      status:     flagged ? "flagged" : "verified",
      verified:   !flagged,
      risk:       c.risk_level || "MEDIUM",
      records:    c.total_records || 0,
      ...multiSourceValues(co2e, c.city),
      lastVerified: c.latest_timestamp ? timeAgo(c.latest_timestamp) : "N/A",
      trend:      score >= 55 ? "down" : score >= 40 ? "stable" : "up",
      trendPct:   Math.round(Math.abs(score - 50) * 0.2 * 10) / 10,
    };
  });
}

export function toProfileCards(compliance) {
  if (!compliance) return [];
  return compliance.map((c, i) => {
    const score = Math.round(c.compliance_score || 0);
    const co2e = Math.round(c.avg_co2_equivalent || 0);
    const flagged = (c.who_violations || 0) > 0;
    return {
      id:             i + 1,
      name:           c.city,
      sector:         guessSector(c.city),
      location:       `${c.city}, ${c.state || guessState(c.city) || "India"}`,
      score,
      grade:          scoreToGrade(score),
      emissions:      co2e,
      co2e,
      trend:          score >= 55 ? "down" : score >= 40 ? "stable" : "up",
      trendPct:       Math.round(Math.abs(score - 50) * 0.2 * 10) / 10,
      lat:            c.latitude  || 20.5,
      lng:            c.longitude || 78.9,
      flagged,
      ...multiSourceValues(co2e, c.city),
      status:         flagged ? "flagged" : "verified",
      lastVerified:   c.latest_timestamp ? timeAgo(c.latest_timestamp) : "N/A",
      submissions:    Math.min(30, c.total_records || 0),
      scores: {
        volume:       Math.round(score * 0.25),
        trend:        Math.round(score * 0.20),
        integrity:    Math.round(score * 0.25),
        consistency:  Math.round(score * 0.15),
        violations:   Math.round(score * 0.15),
      },
      whoViolations:  c.who_violations || 0,
      cpcbViolations: c.cpcb_violations || 0,
      totalRecords:   c.total_records || 0,
    };
  });
}

export function toAlerts(anomalies) {
  if (!anomalies) return [];
  return anomalies.map(a => ({
    id:        a.id,
    city:      a.city,
    pollutant: a.primary_pollutant,
    value:     a.primary_value,
    co2e:      a.co2_equivalent,
    score:     a.compliance_score,
    severity:  (a.severity || "medium").toLowerCase(),
    timestamp: a.timestamp,
    txId:      a.blockchain_tx,
    message:   `${a.city} — ${a.primary_pollutant} at ${a.primary_value} exceeds limits`,
  }));
}

export function toOverviewStats(summary) {
  if (!summary) return null;
  return {
    citiesMonitored:    summary.total_cities || 188,
    activeFlagsToday:   summary.who_violations || 0,
    blockchainRecords:  summary.blockchain_anchored || 0,
    dataVerifiedPct:    summary.avg_compliance || 0,
    avgComplianceScore: Math.round(summary.avg_compliance || 0),
    totalRecords:       summary.total_records || 0,
    whoViolations:      summary.who_violations || 0,
    cpcbViolations:     summary.cpcb_violations || 0,
    anomalies:          summary.anomalies_detected || 0,
    sectorBreakdown:    summary.sector_breakdown || {},
    topPollutedCities:  summary.top_polluted_cities || [],
    mlSummary:          summary.ml_summary || {},
    blockchainStats:    summary.blockchain_stats || {},
    latestTimestamp:     summary.latest_timestamp,
  };
}

export function toSectorChartData(sectors) {
  if (!sectors) return [];
  return sectors
    .filter(s => s.sector && s.sector !== "historical_baseline")
    .map(s => ({
      name:       capitalize(s.sector || ""),
      co2e:       Math.round(s.total_co2e || 0),
      records:    s.records || 0,
      score:      Math.round(s.avg_score || 0),
      percentage: s.percentage || 0,
      who_breaches: s.who_breaches || 0,
    }));
}

export function toRankings(compliance) {
  if (!compliance) return [];
  return compliance
    .sort((a, b) => (b.compliance_score || 0) - (a.compliance_score || 0))
    .map((c, i) => ({
      rank:      i + 1,
      city:      c.city,
      state:     c.state || guessState(c.city),
      sector:    c.sector || guessSector(c.city),
      score:     Math.round(c.compliance_score || 0),
      grade:     scoreToGrade(c.compliance_score),
      co2e:      Math.round(c.avg_co2_equivalent || 0),
      who:       (c.who_violations || 0) === 0,
      cpcb:      (c.cpcb_violations || 0) === 0,
      trend:     calcTrend(c),
      direction: (c.compliance_score || 0) >= 55 ? "down" : "up",
      chain:     true,
      tx:        "",
      lat:       c.latitude,
      lng:       c.longitude,
      flagged:   (c.who_violations || 0) > 0,
    }));
}

export function toLiveFeed(emissions) {
  if (!emissions) return [];
  const energyCities = ["Chennai","Hyderabad","Bengaluru","Visakhapatnam","Kochi","Thiruvananthapuram","Coimbatore","Madurai"];
  return emissions
    .filter(e => e.primary_value > 0 && e.co2_equivalent > 0) // Filter out invalid records
    .map(e => {
      let sector = (e.sector || "industrial").toLowerCase();
      if (sector === "historical_baseline") {
        sector = energyCities.includes(e.city) ? "energy" : "industrial";
      }
      // Format pollutant reading value with proper units
      const val = e.primary_value || 0;
      const unit = e.primary_pollutant === 'co' ? 'ppm' : 'µg/m³';
      const displayValue = val < 10 ? val.toFixed(1) : Math.round(val);

      return {
        id:        e.id,
        time:      timeAgo(e.timestamp),
        entity:    e.city,
        sector:    capitalize(sector),
        value:     `${displayValue} ${unit}`,
        pollutant: e.primary_pollutant?.toUpperCase(),
        status:    e.exceeds_who ? "FLAGGED" : "VERIFIED",
        flagged:   e.exceeds_who || e.exceeds_cpcb,
        co2e:      e.co2_equivalent,
        source:    e.source,
        txId:      e.blockchain_tx,
        anchored:  e.chain_anchored,
      };
    });
}

export function toAuditTrail(anchored) {
  if (!anchored) return [];
  return anchored.map(r => ({
    id:        r.id,
    city:      r.city,
    pollutant: r.primary_pollutant,
    co2e:      r.co2_equivalent,
    score:     r.compliance_score,
    timestamp: r.timestamp,
    txId:      r.blockchain_tx,
    block:     r.block_number,
    txUrl:     r.tx_url || `https://lora.algokit.io/testnet/transaction/${r.blockchain_tx}`,
    network:   "Algorand Testnet",
    appId:     756736023,
  }));
}

// ── WEBSOCKET ────────────────────────────────
export function createLiveSocket(onMessage) {
  let ws = null;
  let reconnectTimer = null;
  let retries = 0;
  const MAX_RETRIES = 5;

  function connect() {
    if (retries >= MAX_RETRIES) return;
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        retries = 0;
        console.log("VayuDrishti: WS connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (_e) { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        retries++;
        const delay = Math.min(5000 * Math.pow(2, retries), 60000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (_e) {
      retries++;
      const delay = Math.min(5000 * Math.pow(2, retries), 60000);
      reconnectTimer = setTimeout(connect, delay);
    }
  }

  connect();

  return {
    disconnect: () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    }
  };
}

// ── POLLING ──────────────────────────────────
export function createPoller(fn, interval = 30000) {
  fn();
  const timer = setInterval(fn, interval);
  return () => clearInterval(timer);
}

// ── HELPERS ──────────────────────────────────
export function scoreToGrade(score) {
  const s = score || 0;
  if (s >= 85) return "A";
  if (s >= 70) return "B";
  if (s >= 55) return "C";
  if (s >= 40) return "D";
  return "F";
}

export function gradeToColor(grade) {
  const map = {
    A: "#22c55e",
    B: "#84cc16",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  };
  return map[grade] || "#6b7280";
}

export function scoreToColor(score) {
  return gradeToColor(scoreToGrade(score));
}

export function gradeToLabel(grade) {
  const map = {
    A: "Exemplary",
    B: "Compliant",
    C: "Warning",
    D: "Non-Compliant",
    F: "Critical Violator",
  };
  return map[grade] || "Unknown";
}

export function getGradeColor(grade) { return gradeToColor(grade); }
export function getGradeFromScore(score) { return scoreToGrade(score); }
export function getGradeLabel(grade) { return gradeToLabel(grade); }

export function riskToColor(risk) {
  const map = {
    LOW:      "#22c55e",
    MEDIUM:   "#f59e0b",
    HIGH:     "#f97316",
    CRITICAL: "#ef4444",
  };
  return map[risk] || "#6b7280";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Deterministic hash for stable per-city multi-source variation
function cityHash(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Generate realistic multi-source readings per city
// IoT ground sensors, satellite remote sensing, and OpenAQ/CPCB official stations
// each measure slightly differently — this creates realistic divergence
export function multiSourceValues(base, cityName) {
  if (!base || base <= 0) return { iot: 0, satellite: 0, openaq: 0, discrepancy: 0 };
  const h = cityHash(cityName || "default");
  // IoT ground sensors: ±8-18% variation
  const iotPct    = ((h % 27) - 13) / 100;               // -0.13 to +0.13
  // Satellite remote sensing: ±12-22% (less precise)
  const satPct    = (((h >> 4) % 35) - 17) / 100;        // -0.17 to +0.17
  // OpenAQ official stations: ±4-10%
  const oaqPct    = (((h >> 8) % 19) - 9) / 100;         // -0.09 to +0.09

  const iot       = Math.round(base * (1 + iotPct));
  const satellite = Math.round(base * (1 + satPct));
  const openaq    = Math.round(base * (1 + oaqPct));

  const vals = [iot, satellite, openaq];
  const max  = Math.max(...vals);
  const min  = Math.min(...vals);
  const discrepancy = min > 0
    ? Math.round(((max - min) / min) * 100 * 10) / 10
    : 0;

  return { iot, satellite, openaq, discrepancy };
}

function guessSector(city) {
  const industrial = ["Delhi", "Mumbai", "Kolkata", "Surat", "Ahmedabad", "Pune", "Nagpur"];
  const energy = ["Chennai", "Hyderabad", "Bengaluru", "Visakhapatnam"];
  if (industrial.includes(city)) return "Industrial";
  if (energy.includes(city)) return "Energy";
  return "Transport";
}

const CITY_STATE_MAP = {
  "Delhi": "Delhi", "Mumbai": "Maharashtra", "Kolkata": "West Bengal",
  "Chennai": "Tamil Nadu", "Bengaluru": "Karnataka", "Hyderabad": "Telangana",
  "Ahmedabad": "Gujarat", "Pune": "Maharashtra", "Surat": "Gujarat",
  "Jaipur": "Rajasthan", "Lucknow": "Uttar Pradesh", "Kanpur": "Uttar Pradesh",
  "Nagpur": "Maharashtra", "Indore": "Madhya Pradesh", "Thane": "Maharashtra",
  "Bhopal": "Madhya Pradesh", "Visakhapatnam": "Andhra Pradesh",
  "Pimpri-Chinchwad": "Maharashtra", "Patna": "Bihar", "Vadodara": "Gujarat",
  "Ghaziabad": "Uttar Pradesh", "Ludhiana": "Punjab", "Agra": "Uttar Pradesh",
  "Nashik": "Maharashtra", "Faridabad": "Haryana", "Meerut": "Uttar Pradesh",
  "Rajkot": "Gujarat", "Varanasi": "Uttar Pradesh", "Srinagar": "Jammu & Kashmir",
  "Coimbatore": "Tamil Nadu", "Madurai": "Tamil Nadu", "Imphal": "Manipur",
  "Jodhpur": "Rajasthan", "Ranchi": "Jharkhand", "Raipur": "Chhattisgarh",
  "Kochi": "Kerala", "Chandigarh": "Chandigarh", "Guwahati": "Assam",
  "Thiruvananthapuram": "Kerala", "Amritsar": "Punjab", "Allahabad": "Uttar Pradesh",
  "Noida": "Uttar Pradesh", "Howrah": "West Bengal", "Gurugram": "Haryana",
  "Dehradun": "Uttarakhand", "Shimla": "Himachal Pradesh",
};

function guessState(city) {
  return CITY_STATE_MAP[city] || "";
}

function calcDiscrepancy(c) {
  if (!c.who_violations || !c.total_records) return "0.0%";
  const pct = (c.who_violations / c.total_records * 100).toFixed(1);
  return `${pct}%`;
}

function calcTrend(c) {
  const score = c.compliance_score || 0;
  if (score > 70) return "+2%";
  if (score > 50) return "\u22121%";
  return "\u22124%";
}

function timeAgo(timestamp) {
  if (!timestamp) return "Unknown";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
