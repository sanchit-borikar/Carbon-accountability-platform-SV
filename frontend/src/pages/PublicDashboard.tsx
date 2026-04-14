import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Globe, AlertTriangle, Search, Shield, ExternalLink, RefreshCw,
  Activity, Download, Info, ChevronRight, CheckCircle, TrendingUp
} from "lucide-react";
import SkeletonLoader from "@/components/SkeletonLoader";
import "leaflet/dist/leaflet.css";

const API = "http://localhost:8001";
const API_MAIN = "http://localhost:8000";
const REFRESH = 30_000;

// ── Types ─────────────────────────────────────────
interface CityData {
  city: string;
  state: string;
  sector: string;
  score: number;
  co2e: number;
  who_violations: number;
  cpcb_violations: number;
  latitude: number;
  longitude: number;
  grade: string;
}

interface AlertItem {
  company_name: string;
  city: string;
  pollutant: string;
  value: number;
  severity: string;
  exceeds_who: boolean;
  timestamp: string;
}

interface FeedItem {
  id: number;
  city: string;
  sector: string;
  co2e: number;
  score: number;
  exceeds_who: boolean;
  timestamp: string;
  source: string;
}

interface BlockchainRecord {
  id: number;
  city: string;
  primary_pollutant: string;
  co2_equivalent: number;
  compliance_score: number;
  timestamp: string;
  blockchain_tx: string;
  block_number: number;
  tx_url: string;
}

interface SummaryData {
  totalRecords: number;
  citiesMonitored: number;
  whoViolations: number;
  blockchainRecords: number;
}

// ── Helpers ───────────────────────────────────────
function useRelativeTime(date: Date | null) {
  const [text, setText] = useState("--");
  useEffect(() => {
    if (!date) return;
    const tick = () => {
      const secs = Math.round((Date.now() - date.getTime()) / 1000);
      if (secs < 5) setText("just now");
      else if (secs < 60) setText(`${secs}s ago`);
      else setText(`${Math.floor(secs / 60)}m ${secs % 60}s ago`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [date]);
  return text;
}

const gradeColor = (g: string) => {
  switch (g) {
    case "A": return "#22c55e";
    case "B": return "#84cc16";
    case "C": return "#f59e0b";
    case "D": return "#f97316";
    case "F": return "#ef4444";
    default: return "#94a3b8";
  }
};

const sevColor = (s: string) => {
  switch (s) {
    case "CRITICAL": return "bg-red-500 text-white";
    case "HIGH": return "bg-orange-500 text-white";
    case "MEDIUM": return "bg-yellow-500 text-white";
    case "LOW": return "bg-green-500 text-white";
    default: return "bg-gray-400 text-white";
  }
};

// ── Component ─────────────────────────────────────
export default function PublicDashboard() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [violations, setViolations] = useState<CityData[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [blockchain, setBlockchain] = useState<BlockchainRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mapLayer, setMapLayer] = useState<"scores" | "violations" | "compliant" | "sectors">("scores");
  const [citySearch, setCitySearch] = useState("");
  const [searchResult, setSearchResult] = useState<CityData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [verifyTx, setVerifyTx] = useState("");
  const [verifyResult, setVerifyResult] = useState<BlockchainRecord | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const mountedRef = useRef(true);
  const relTime = useRelativeTime(lastUpdated);

  const fetchAll = useCallback(async () => {
    try {
      const [compRes, summRes, feedRes, bcRes] = await Promise.all([
        fetch(`${API_MAIN}/api/compliance`),
        fetch(`${API_MAIN}/api/dashboard/summary`),
        fetch(`${API_MAIN}/api/emissions/latest`),
        fetch(`${API_MAIN}/api/blockchain/anchored`),
      ]);
      if (!mountedRef.current) return;

      if (compRes.ok) {
        const data = await compRes.json();
        const arr = (Array.isArray(data) ? data : data.cities || []).map((c: any) => {
          const score = c.compliance_score ?? c.score ?? 0;
          const co2e = c.avg_co2_equivalent ?? c.co2e ?? 0;
          let grade = c.grade || "F";
          if (!c.grade) {
            if (score >= 75) grade = "A";
            else if (score >= 60) grade = "B";
            else if (score >= 45) grade = "C";
            else if (score >= 30) grade = "D";
            else grade = "F";
          }
          return {
            city: c.city,
            state: c.state || "",
            sector: c.sector || c.risk_level || "Industrial",
            score: Math.round(score * 10) / 10,
            co2e: Math.round(co2e),
            who_violations: c.who_violations || 0,
            cpcb_violations: c.cpcb_violations || 0,
            latitude: c.latitude || 0,
            longitude: c.longitude || 0,
            grade,
          };
        });
        setCities(arr);
        setViolations(arr.filter((c: CityData) => c.who_violations > 0 || c.score < 40));
      }
      if (summRes.ok) {
        const d = await summRes.json();
        setSummary({
          totalRecords: d.total_records || d.totalRecords || 0,
          citiesMonitored: d.total_cities || d.citiesMonitored || 0,
          whoViolations: d.who_violations || d.whoViolations || 0,
          blockchainRecords: d.blockchain_anchored || d.blockchainRecords || 0,
        });
      }
      if (feedRes.ok) {
        const d = await feedRes.json();
        const arr = Array.isArray(d) ? d : d.records || [];
        setFeed(arr.slice(0, 50).map((r: any) => ({
          id: r.id,
          city: r.city,
          sector: r.sector,
          co2e: r.co2_equivalent || r.co2e || 0,
          score: r.compliance_score || 0,
          exceeds_who: r.exceeds_who,
          timestamp: r.timestamp,
          source: r.source || "unknown",
        })));
      }
      if (bcRes.ok) {
        const arr = await bcRes.json();
        setBlockchain(Array.isArray(arr) ? arr : []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Public fetch:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const iv = setInterval(fetchAll, REFRESH);
    return () => { mountedRef.current = false; clearInterval(iv); };
  }, [fetchAll]);

  // City search
  const handleSearch = async () => {
    const q = citySearch.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchResult(null);
    const match = cities.find(c => c.city.toLowerCase() === q.toLowerCase());
    if (match) {
      setSearchResult(match);
    } else {
      try {
        const res = await fetch(`${API_MAIN}/api/compliance/${encodeURIComponent(q)}`);
        if (res.ok) {
          const c = await res.json();
          const score = c.compliance_score ?? c.score ?? 0;
          const co2e = c.avg_co2_equivalent ?? c.co2e ?? 0;
          let grade = "F";
          if (score >= 75) grade = "A";
          else if (score >= 60) grade = "B";
          else if (score >= 45) grade = "C";
          else if (score >= 30) grade = "D";
          setSearchResult({
            city: c.city, state: c.state || "", sector: c.sector || "Industrial",
            score: Math.round(score * 10) / 10, co2e: Math.round(co2e),
            who_violations: c.who_violations || 0, cpcb_violations: c.cpcb_violations || 0,
            latitude: c.latitude || 0, longitude: c.longitude || 0, grade,
          });
        }
      } catch { /* no result */ }
    }
    setSearchLoading(false);
  };

  // Blockchain verify
  const handleVerify = () => {
    const tx = verifyTx.trim();
    if (!tx) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    const match = blockchain.find(b => b.blockchain_tx === tx);
    if (match) {
      setVerifyResult(match);
    }
    setVerifyLoading(false);
  };

  // Map filter
  const mapCities = cities.filter(c => {
    if (!c.latitude || !c.longitude) return false;
    if (mapLayer === "violations") return c.who_violations > 0 || c.score < 40;
    if (mapLayer === "compliant") return c.score >= 60;
    return true;
  });

  // Chart data — most recent feed grouped by hour
  const chartMap: Record<string, { time: string; Industrial: number; Transport: number; Energy: number }> = {};
  feed.forEach(f => {
    const h = new Date(f.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (!chartMap[h]) chartMap[h] = { time: h, Industrial: 0, Transport: 0, Energy: 0 };
    const s = (f.sector || "").toLowerCase();
    if (s.includes("industr")) chartMap[h].Industrial += f.co2e;
    else if (s.includes("transport")) chartMap[h].Transport += f.co2e;
    else chartMap[h].Energy += f.co2e;
  });
  const chartData = Object.values(chartMap).slice(-24);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" />
        <SkeletonLoader type="card" />
        <SkeletonLoader type="chart" />
        <SkeletonLoader type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── HERO ──────────────────────────────────── */}
      <div className="text-center py-6">
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-[#0f172a] mb-2">
          India Carbon Emission Transparency
        </h1>
        <p className="text-base text-slate-500 font-medium mb-1">Public Portal — No Login Required</p>
        <p className="text-sm text-slate-400 italic">"Know who is polluting your air"</p>
        <div className="flex items-center gap-2 justify-center mt-3">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="absolute w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
          </div>
          <span className="text-xs font-semibold text-slate-600">LIVE</span>
          <span className="text-[11px] text-slate-400">30s refresh</span>
          <span className="text-[11px] text-slate-400">{relTime}</span>
        </div>
      </div>

      {/* ── LIVE STATS BAR ────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-blue-600">{summary?.totalRecords?.toLocaleString() || 0}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Records Today</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-emerald-600">{summary?.citiesMonitored || 0}+</p>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Cities Monitored</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-red-600">{violations.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Violations Active</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-3xl font-extrabold text-purple-600">{blockchain.length}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Blockchain Records</p>
        </div>
      </div>

      {/* ═══ SECTION 1 — TOP POLLUTERS (SHAME WALL) ═══ */}
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="bg-red-50 border-b border-red-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h2 className="text-lg font-bold text-red-900">Top Polluters Right Now</h2>
          </div>
          <span className="text-[10px] text-red-400 font-semibold">{violations.length} violations</span>
        </div>
        <div className="divide-y divide-red-100">
          {violations.slice(0, 10).map((v, i) => {
            const whoTimes = v.co2e > 0 ? (v.co2e / 1800).toFixed(1) : "0";
            return (
              <div key={v.city} className="px-5 py-4 flex items-center gap-4 hover:bg-red-50/50 transition-colors">
                <span className="text-2xl font-black text-red-300 w-8 text-right">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{v.city}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">{v.sector}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{v.state} &middot; WHO exceeded {whoTimes}x</p>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, 100 - v.score)}%`, backgroundColor: gradeColor(v.grade) }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-bold text-slate-800">{v.co2e?.toLocaleString()} <span className="text-[10px] text-slate-400">ug/m3</span></p>
                  <p className="text-xs text-slate-500">Score: {v.score}/100</p>
                  <span className="text-[10px] font-bold text-red-600 uppercase">Violation</span>
                </div>
              </div>
            );
          })}
        </div>
        {violations.length > 10 && (
          <div className="px-5 py-3 border-t border-red-100 text-center">
            <span className="text-xs font-semibold text-red-600 cursor-pointer hover:underline">See all {violations.length} violations</span>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — INDIA MAP ═════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            <Globe size={20} className="text-blue-600" />
            India Emission Map
          </h2>
          <div className="flex gap-2 flex-wrap">
            {(["scores", "violations", "compliant", "sectors"] as const).map(l => (
              <button
                key={l}
                onClick={() => setMapLayer(l)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${mapLayer === l ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
              >
                {l === "scores" ? "City Scores" : l === "violations" ? "Violations Only" : l === "compliant" ? "Compliant Cities" : "Sector View"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[450px]">
          <MapContainer
            center={[22.5, 78.9]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='OpenStreetMap + CARTO'
            />
            {mapCities.map((c) => (
              <CircleMarker
                key={c.city}
                center={[c.latitude, c.longitude]}
                radius={Math.max(6, Math.min(18, (c.co2e || 0) / 1500))}
                fillColor={gradeColor(c.grade)}
                fillOpacity={0.7}
                stroke={true}
                color={gradeColor(c.grade)}
                weight={1.5}
              >
                <Popup>
                  <div className="text-xs min-w-[180px]">
                    <p className="font-bold text-sm text-slate-900 mb-1">{c.city}</p>
                    <p className="text-slate-500 mb-2">{c.state} &middot; {c.sector}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Score:</span><span className="font-bold" style={{ color: gradeColor(c.grade) }}>{c.score}/100 ({c.grade})</span></div>
                      <div className="flex justify-between"><span>CO2e:</span><span className="font-mono font-bold">{c.co2e?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>WHO Violations:</span><span className="font-bold text-red-600">{c.who_violations}</span></div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> A/B Grade</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> C Grade</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> D Grade</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> F Grade</span>
          <span className="ml-auto">{mapCities.length} cities shown</span>
        </div>
      </div>

      {/* ═══ SECTION 3 — CITY SEARCH ═══════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2 mb-4">
          <Search size={20} className="text-blue-600" />
          Search Any City
        </h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={citySearch}
            onChange={e => setCitySearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Enter city name (e.g., Delhi, Mumbai, Chennai)"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button onClick={handleSearch} disabled={searchLoading} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Search size={18} /> Search
          </button>
        </div>

        {searchLoading && <div className="text-center py-6"><div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>}

        {!searchLoading && searchResult && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">{searchResult.city}</h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${searchResult.score < 40 ? "bg-red-100 text-red-700" : searchResult.score < 60 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                {searchResult.score < 40 ? "VIOLATION" : searchResult.score < 60 ? "WARNING" : "COMPLIANT"}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">{searchResult.state} &middot; {searchResult.sector}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-slate-500 uppercase font-semibold">Score</p>
                <p className="text-2xl font-bold mt-1" style={{ color: gradeColor(searchResult.grade) }}>{searchResult.score}/100</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-slate-500 uppercase font-semibold">CO2 Equivalent</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{searchResult.co2e?.toLocaleString()} <span className="text-sm text-slate-400">ug/m3</span></p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-slate-500 uppercase font-semibold">WHO Status</p>
                <p className="text-lg font-bold mt-1">
                  {searchResult.who_violations > 0
                    ? <span className="text-red-600">Exceeded ({(searchResult.co2e / 1800).toFixed(1)}x limit)</span>
                    : <span className="text-green-600">Within Limit</span>
                  }
                </p>
              </div>
            </div>
            {blockchain.filter(b => b.city.toLowerCase() === searchResult.city.toLowerCase()).length > 0 && (
              <p className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                <Shield size={12} />
                {blockchain.filter(b => b.city.toLowerCase() === searchResult.city.toLowerCase()).length} blockchain records verified
                <a href="https://lora.algokit.io/testnet/app/756736023" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800 flex items-center gap-0.5">View on Algorand <ExternalLink size={10} /></a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ SECTION 4 — BLOCKCHAIN VERIFY TOOL ════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2 mb-1">
          <Shield size={20} className="text-purple-600" />
          Verify Any Emission Record
        </h2>
        <p className="text-sm text-slate-500 mb-4">Enter a Transaction ID to verify this record has not been tampered with</p>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={verifyTx}
            onChange={e => setVerifyTx(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleVerify()}
            placeholder="Paste Algorand Transaction ID..."
            className="flex-1 px-4 py-3 border border-slate-200 rounded-lg font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
          />
          <button onClick={handleVerify} disabled={verifyLoading} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
            Verify Now
          </button>
        </div>

        {verifyResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={20} className="text-green-600" />
              <span className="font-bold text-green-800">VERIFIED — Record anchored on Algorand</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><p className="text-[10px] text-slate-500 uppercase">City</p><p className="font-bold">{verifyResult.city}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase">Pollutant</p><p className="font-bold uppercase">{verifyResult.primary_pollutant}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase">CO2e</p><p className="font-bold font-mono">{verifyResult.co2_equivalent.toLocaleString()}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase">Block</p><p className="font-bold font-mono">{verifyResult.block_number.toLocaleString()}</p></div>
            </div>
            <a href={verifyResult.tx_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-purple-600 font-semibold mt-3 hover:underline">
              View on Explorer <ExternalLink size={10} />
            </a>
          </div>
        )}

        {verifyTx && !verifyLoading && !verifyResult && (
          <p className="text-sm text-slate-500 mt-2">No matching record found. Paste a valid Algorand TX ID from VayuDrishti.</p>
        )}

        {/* Quick sample TX IDs */}
        {blockchain.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-2">Sample TX IDs to try:</p>
            <div className="flex flex-wrap gap-2">
              {blockchain.slice(0, 3).map(b => (
                <button key={b.id} onClick={() => { setVerifyTx(b.blockchain_tx); }} className="text-[11px] font-mono text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded hover:bg-purple-100 transition-colors truncate max-w-[200px]">
                  {b.blockchain_tx.slice(0, 20)}...
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION 5 — LIVE FEED ═════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            <Activity size={20} className="text-green-600" />
            Live Emission Feed
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="absolute w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            Updates every 30 seconds
          </div>
        </div>

        {/* Mini chart */}
        {chartData.length > 0 && (
          <div className="px-5 pt-4">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pubInd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pubTrans" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} /><stop offset="95%" stopColor="#0891b2" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pubEn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Area type="monotone" dataKey="Industrial" stroke="#2563eb" fill="url(#pubInd)" />
                <Area type="monotone" dataKey="Transport" stroke="#0891b2" fill="url(#pubTrans)" />
                <Area type="monotone" dataKey="Energy" stroke="#7c3aed" fill="url(#pubEn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Time</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">City</th>
                <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Sector</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-600">CO2e</th>
                <th className="px-4 py-2.5 text-center font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feed.slice(0, 20).map(f => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                    {new Date(f.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{f.city}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">{f.sector}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700">{f.co2e?.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${f.exceeds_who ? "bg-red-500" : f.score < 60 ? "bg-yellow-500" : "bg-green-500"}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ SECTION 6 — DOWNLOAD OPEN DATA ════════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2 mb-1">
          <Download size={20} className="text-blue-600" />
          Download Public Data
        </h2>
        <p className="text-sm text-slate-500 mb-5">All emission data is open and free</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <a href={`${API_MAIN}/api/emissions?limit=5000`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 font-bold text-xs">CSV</div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Download JSON — All Cities</p>
              <p className="text-[10px] text-slate-400">5000+ emission records</p>
            </div>
          </a>
          <a href={`${API_MAIN}/api/emissions/latest`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">JSON</div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Download JSON — Latest 1000</p>
              <p className="text-[10px] text-slate-400">Last 6 hours of data</p>
            </div>
          </a>
          <a href={`${API_MAIN}/api/dashboard/summary`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-xs">API</div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">Dashboard Summary API</p>
              <p className="text-[10px] text-slate-400">Real-time aggregate data</p>
            </div>
          </a>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Info size={12} />
          Data license: Open Government Data (OGD) | Updated: Every 60 seconds | Source: OpenAQ + CPCB + NASA + WAQI
        </div>
      </div>

      {/* ═══ SECTION 7 — ABOUT & METHODOLOGY ══════ */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-6">
        <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2 mb-4">
          <Info size={20} className="text-emerald-600" />
          How We Calculate Emissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-bold text-emerald-800 mb-3">CO2e Conversion (IPCC AR6 2023)</h3>
            <div className="bg-white/60 rounded-lg p-4 border border-emerald-100">
              <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-mono text-sm text-emerald-800">
                <span className="font-bold">PM2.5</span><span>x 110 = CO2e</span>
                <span className="font-bold">NO2</span><span>x 298 = CO2e</span>
                <span className="font-bold">SO2</span><span>x 132 = CO2e</span>
                <span className="font-bold">CO</span><span>x&nbsp;&nbsp;&nbsp;1 = CO2e</span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-emerald-800 mt-4 mb-2">Compliance Score Formula</h3>
            <div className="bg-white/60 rounded-lg p-4 border border-emerald-100 text-xs text-emerald-700 space-y-1">
              <p className="font-mono">(1 - co2e/sector_limit) x 100</p>
              <p className="font-mono">Anomaly penalty: -25 points</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-800 mb-3">Data Sources</h3>
            <div className="space-y-2">
              {[
                { name: "OpenAQ", desc: "Global open air quality data" },
                { name: "CPCB", desc: "India's Central Pollution Control Board" },
                { name: "NASA GEOS-CF", desc: "Satellite remote sensing" },
                { name: "WAQI", desc: "World Air Quality Index" },
              ].map(s => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-emerald-800">{s.name}</span>
                  <span className="text-emerald-600">{s.desc}</span>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-bold text-emerald-800 mt-4 mb-2">Blockchain</h3>
            <div className="text-sm text-emerald-700">
              <p>Algorand Testnet (Carbon-Negative PoS)</p>
              <a href="https://lora.algokit.io/testnet/app/756736023" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline mt-1">
                App ID: 756736023 <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── What public CANNOT see ────────────────── */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700">What this public portal does NOT show</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
          <span>Individual company names</span>
          <span>Private compliance reports</span>
          <span>Company-specific breakdown</span>
          <span>Internal admin tools</span>
          <span>User management</span>
          <span>Raw database queries</span>
          <span>API keys or credentials</span>
          <span>Other companies' private data</span>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={() => window.location.href = "/login"} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
            Sign in for full access <ChevronRight size={12} />
          </button>
          <button onClick={() => window.location.href = "/register"} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
            Register your organization <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
