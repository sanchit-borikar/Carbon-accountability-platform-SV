import { useState, useEffect, useCallback, useRef } from "react";
import {
  getDashboardSummary, getAllCompliance,
  getAnomalies, getSectors,
  getLatestEmissions,
  getBlockchainStats, getAnchoredRecords,
  getForecast, getCityCompliance,
  getCityEmissions,
  createLiveSocket, createPoller,
  toOverviewStats, toMapMarkers,
  toProfileCards, toAlerts,
  toSectorChartData, toRankings,
  toLiveFeed, toAuditTrail,
  scoreToGrade,
} from "./api";

// ── OVERVIEW HOOK ────────────────────────────
export function useOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const summary = await getDashboardSummary();
      setData(toOverviewStats(summary));
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stop = createPoller(fetchData, 30000);
    return stop;
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ── MAP HOOK ─────────────────────────────────
export function useMapData(role = "public", companyCity = null) {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    const compliance = await getAllCompliance({ limit: 200 });
    let mapped = toMapMarkers(compliance || []);

    if (role === "company" && companyCity) {
      mapped = mapped.filter(m => m.name === companyCity);
    }

    setMarkers(mapped);
    setLastUpdate(new Date());
    setLoading(false);
  }, [role, companyCity]);

  useEffect(() => {
    const stop = createPoller(fetchData, 30000);
    return stop;
  }, [fetchData]);

  return { markers, loading, lastUpdate, refetch: fetchData };
}

// ── PROFILES HOOK ────────────────────────────
export function useProfiles(role = "public", companyCity = null) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const compliance = await getAllCompliance({ limit: 200 });
    let cards = toProfileCards(compliance || []);

    if (role === "company" && companyCity) {
      cards = cards.filter(p => p.name === companyCity);
    }

    setProfiles(cards);
    setLoading(false);
  }, [role, companyCity]);

  useEffect(() => {
    const stop = createPoller(fetchData, 60000);
    return stop;
  }, [fetchData]);

  return { profiles, loading, refetch: fetchData };
}

// ── LIVE FEED HOOK ───────────────────────────
export function useLiveFeed(role = "public", companyCity = null) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef(null);

  useEffect(() => {
    getLatestEmissions(50).then(data => {
      let rows = toLiveFeed(data || []);
      if (role === "company" && companyCity) {
        rows = rows.filter(r => r.entity === companyCity);
      }
      setFeed(rows);
      setLoading(false);
    });
  }, [role, companyCity]);

  useEffect(() => {
    wsRef.current = createLiveSocket((msg) => {
      const row = toLiveFeed([msg])[0];
      if (!row) return;
      if (role === "company" && companyCity && row.entity !== companyCity) return;
      setFeed(prev => [row, ...prev].slice(0, 100));
    });
    return () => wsRef.current?.disconnect();
  }, [role, companyCity]);

  return { feed, loading };
}

// ── ALERTS HOOK ──────────────────────────────
export function useAlerts(role = "public", companyCity = null) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (role === "public") {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const anomalies = await getAnomalies();
    let mapped = toAlerts(anomalies || []);

    if (role === "company" && companyCity) {
      mapped = mapped.filter(a => a.city === companyCity);
    }

    setAlerts(mapped);
    setLoading(false);
  }, [role, companyCity]);

  useEffect(() => {
    const stop = createPoller(fetchData, 30000);
    return stop;
  }, [fetchData]);

  return { alerts, loading, refetch: fetchData };
}

// ── RANKINGS HOOK ────────────────────────────
export function useRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAllCompliance({ limit: 200 }).then(data => {
      const ranked = toRankings(data || []);
      setRankings(ranked);

      if (ranked.length > 0) {
        setStats({
          mostCompliant: ranked[0],
          worstViolator: ranked[ranked.length - 1],
          nationalAvg: Math.round(
            ranked.reduce((s, r) => s + r.score, 0) / ranked.length
          ),
          totalCities: ranked.length,
        });
      }
      setLoading(false);
    });
  }, []);

  return { rankings, loading, stats };
}

// ── ANALYTICS HOOK ───────────────────────────
export function useAnalytics(role = "public", companyCity = null) {
  const [sectors, setSectors] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSectors(),
      getLatestEmissions(200),
    ]).then(([sectorsData, emissions]) => {
      setSectors(toSectorChartData(sectorsData || []));

      const grouped = {};
      const energyCities = ["Chennai","Hyderabad","Bengaluru","Visakhapatnam","Kochi","Thiruvananthapuram","Coimbatore","Madurai"];
      (emissions || []).forEach(e => {
        const hour = new Date(e.timestamp)
          .getHours().toString().padStart(2, "0") + ":00";
        if (!grouped[hour]) {
          grouped[hour] = { industrial: 0, transport: 0, energy: 0 };
        }
        let s = (e.sector || "industrial").toLowerCase();
        if (s === "historical_baseline") {
          s = energyCities.includes(e.city) ? "energy" : "industrial";
        }
        grouped[hour][s] = (grouped[hour][s] || 0) + (e.co2_equivalent || 0);
      });

      const tl = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, vals]) => ({
          time,
          Industry:  Math.round(vals.industrial || 0),
          Transport: Math.round(vals.transport || 0),
          Energy:    Math.round(vals.energy || 0),
        }));
      setTimeline(tl);
      setLoading(false);
    });
  }, [role, companyCity]);

  return { sectors, timeline, loading };
}

// ── BLOCKCHAIN HOOK ──────────────────────────
export function useBlockchain() {
  const [stats, setStats] = useState(null);
  const [anchored, setAnchored] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getBlockchainStats(),
      getAnchoredRecords(),
    ]).then(([statsData, anchoredData]) => {
      setStats(statsData);
      setAnchored(toAuditTrail(anchoredData || []));
      setLoading(false);
    });
  }, []);

  return { stats, anchored, loading };
}

// ── MY COMPANY HOOK ──────────────────────────
export function useMyCompany(companyCity) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!companyCity) return;
    const [compliance, emissions, forecast] = await Promise.all([
      getCityCompliance(companyCity),
      getCityEmissions(companyCity, 90),
      getForecast(companyCity, "pm2_5"),
    ]);

    setData({
      compliance,
      emissions,
      forecast,
      score: Math.round(compliance?.compliance_score || 0),
      co2e:  Math.round(compliance?.avg_co2_equivalent || 0),
      grade: scoreToGrade(compliance?.compliance_score || 0),
    });
    setLoading(false);
  }, [companyCity]);

  useEffect(() => {
    const stop = createPoller(fetchData, 60000);
    return stop;
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
