import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Scale, AlertTriangle, BarChart3, Calendar, RefreshCw, ExternalLink, CheckCircle, Shield, TrendingDown, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { toast } from "sonner";
import SkeletonLoader from "@/components/SkeletonLoader";

const API_BASE = "http://localhost:8000";
const REFRESH_INTERVAL = 30_000;

// ── WHO limits ────────────────────────────────────
const WHO_LIMITS: Record<string, { limit: number; unit: string }> = {
  pm2_5:            { limit: 15,   unit: "µg/m³" },
  pm10:             { limit: 45,   unit: "µg/m³" },
  nitrogen_dioxide: { limit: 10,   unit: "µg/m³" },
  no2:              { limit: 10,   unit: "µg/m³" },
  sulphur_dioxide:  { limit: 40,   unit: "µg/m³" },
  so2:              { limit: 40,   unit: "µg/m³" },
  carbon_monoxide:  { limit: 4000, unit: "µg/m³" },
  co:               { limit: 4000, unit: "µg/m³" },
  co2_equivalent:   { limit: 1800, unit: "µg/m³" },
};

// ── Recommendations ───────────────────────────────
const RECOMMENDATIONS: Record<string, { title: string; impact: string; cost: string; roi: string; subsidy: string; priority: "HIGH" | "MEDIUM" }[]> = {
  energy: [
    { title: "Install Flue Gas Desulfurization", impact: "Reduces SO2 by 90%", cost: "₹3 Cr", roi: "5 years", subsidy: "MoEF&CC 2022 — mandatory for coal plants", priority: "HIGH" },
    { title: "SCR DeNOx System", impact: "Reduces NO2 by 85%", cost: "₹2 Cr", roi: "4 years", subsidy: "Central pollution control grant available", priority: "HIGH" },
    { title: "Switch to Solar Hybrid", impact: "Reduces CO2e by 60%", cost: "₹400 Lakh", roi: "7 years", subsidy: "PM KUSUM — 30% subsidy", priority: "MEDIUM" },
  ],
  industrial: [
    { title: "Electrostatic Precipitators", impact: "Reduces PM2.5 by 40%", cost: "₹1.5 Cr", roi: "3.5 years", subsidy: "SIDBI green loan at 4% interest", priority: "HIGH" },
    { title: "Wet Scrubber Installation", impact: "Reduces SO2 + PM by 70%", cost: "₹80 Lakh", roi: "2.5 years", subsidy: "State pollution board rebate 20%", priority: "HIGH" },
    { title: "ISO 14001 Certification", impact: "Reduces violations by 25%", cost: "₹10 Lakh", roi: "1.5 years", subsidy: "No subsidy — but reduces NGT penalty risk", priority: "MEDIUM" },
  ],
};

// ── Types ─────────────────────────────────────────

interface PollutantBreakdown {
  pollutant: string;
  avg_value: number;
  max_value: number;
  avg_co2e: number;
  score: number;
  who_violations: number;
  cpcb_violations: number;
  daily_penalty: string;
  records: number;
}

interface CompanyDetail {
  city: string;
  company_name: string;
  sector: string;
  type: string;
  state: string;
  score: number;
  grade: string;
  severity: string;
  total_daily_penalty: number;
  total_annual_penalty: number;
  formatted: { daily: string; annual: string; annual_cr: string };
  pollutant_breakdown: PollutantBreakdown[];
  legal_basis: string;
  data_source: string;
}

interface EmissionRecord {
  id: number;
  city: string;
  primary_pollutant: string;
  primary_value: number;
  co2_equivalent: number;
  compliance_score: number;
  timestamp: string;
  source: string;
}

interface AlertItem {
  company_name: string;
  city: string;
  pollutant: string;
  value: number;
  severity: string;
  exceeds_who: boolean;
  exceeds_cpcb: boolean;
  timestamp: string;
  source: string;
  message: string;
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

// ── Relative time hook ────────────────────────────
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

function timeAgo(ts: string) {
  const secs = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Component ─────────────────────────────────────

export default function CompanyDetailPage() {
  const { city } = useParams<{ city: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [emissions, setEmissions] = useState<EmissionRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [blockchain, setBlockchain] = useState<BlockchainRecord[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const relativeTime = useRelativeTime(lastUpdated);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current || !city) return;
    setRefreshing(true);
    try {
      const [compRes, emRes, alertRes, bcRes] = await Promise.all([
        fetch(`${API_BASE}/api/companies/${encodeURIComponent(city)}`),
        fetch(`${API_BASE}/api/emissions/city/${encodeURIComponent(city)}?limit=500`),
        fetch(`${API_BASE}/api/companies/alerts`),
        fetch(`${API_BASE}/api/blockchain/anchored`),
      ]);
      if (!mountedRef.current) return;
      if (compRes.ok) setCompany(await compRes.json());
      if (emRes.ok) {
        const emData = await emRes.json();
        setEmissions(Array.isArray(emData) ? emData : []);
      }
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setAlerts((alertData.alerts || []).filter((a: AlertItem) => a.city.toLowerCase() === city.toLowerCase()));
      }
      if (bcRes.ok) {
        const bcData = await bcRes.json();
        const arr = Array.isArray(bcData) ? bcData : [];
        setBlockchain(arr.filter((r: BlockchainRecord) => r.city.toLowerCase() === city.toLowerCase()));
      }
      setFetchError(false);
      setLastUpdated(new Date());
    } catch {
      if (mountedRef.current) setFetchError(true);
    } finally {
      if (mountedRef.current) { setInitialLoading(false); setRefreshing(false); }
    }
  }, [city]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchData]);

  // ── Helpers ───────────────────────────────────
  const getGradeColor = (g: string) => {
    switch (g) {
      case "A": return "bg-green-500 text-white";
      case "B": return "bg-lime-500 text-white";
      case "C": return "bg-amber-500 text-white";
      case "D": return "bg-orange-500 text-white";
      case "F": return "bg-red-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };
  const getSeverityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "bg-red-500 text-white";
      case "HIGH": return "bg-orange-500 text-white";
      case "MEDIUM": return "bg-yellow-500 text-white";
      case "LOW": return "bg-green-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };
  const getTimesOverBg = (times: number) => {
    if (times > 10) return "bg-red-100 text-red-800";
    if (times > 5) return "bg-orange-100 text-orange-800";
    if (times > 2) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };
  const getTimesOverStatus = (times: number) => {
    if (times > 10) return "CRITICAL";
    if (times > 5) return "HIGH";
    if (times > 2) return "MEDIUM";
    return "OK";
  };

  // ── Chart data ────────────────────────────────
  const chartData = emissions
    .filter(e => ["pm2_5", "pm25", "so2", "no2"].includes(e.primary_pollutant))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .reduce<Record<string, { date: string; ts: number; pm2_5?: number; so2?: number; no2?: number }>>((acc, e) => {
      const d = new Date(e.timestamp).toISOString().slice(0, 10);
      if (!acc[d]) acc[d] = { date: d, ts: new Date(e.timestamp).getTime() };
      const key = (e.primary_pollutant === "pm25" ? "pm2_5" : e.primary_pollutant) as "pm2_5" | "so2" | "no2";
      acc[d][key] = e.primary_value;
      return acc;
    }, {});
  const chartDataArr = Object.values(chartData).sort((a, b) => a.ts - b.ts);

  // ── Loading ───────────────────────────────────
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="profile" />
        <SkeletonLoader type="card" />
        <SkeletonLoader type="table" />
        <SkeletonLoader type="chart" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate("/dashboard/penalties")} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft size={16} /> Back to Penalties
        </button>
        <div className="text-center py-16">
          <AlertTriangle size={48} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Company not found</h2>
          <p className="text-sm text-muted-foreground mt-2">No data available for "{city}"</p>
          <button onClick={() => fetchData()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalRecords = company.pollutant_breakdown.reduce((s, p) => s + p.records, 0);
  const totalWho = company.pollutant_breakdown.reduce((s, p) => s + p.who_violations, 0);
  const recs = RECOMMENDATIONS[company.sector] || RECOMMENDATIONS["industrial"];

  return (
    <div className="space-y-6">
      {/* ── Back button ─────────────────────────── */}
      <button onClick={() => navigate("/dashboard/penalties")} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
        <ArrowLeft size={16} /> Back to Penalties
      </button>

      {/* ═══ SECTION 1 — COMPANY HEADER ═══════════ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Grade circle */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg ${getGradeColor(company.grade)}`}>
              {company.grade}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-[#0f172a]">{company.company_name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{company.type}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-slate-600">{company.city}, {company.state}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">CPCB Station</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityColor(company.severity)}`}>{company.severity}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-500">Compliance Score</p>
              <p className="text-2xl font-bold text-[#0f172a]">{company.score}<span className="text-sm text-slate-400">/100</span></p>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-[#e2e8f0] rounded-full px-3 py-1.5">
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="absolute w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">LIVE</span>
              <div className="w-px h-3 bg-slate-200" />
              <span className="text-[10px] text-slate-500">30s</span>
              <div className="w-px h-3 bg-slate-200" />
              <span className="text-[10px] text-slate-500">{relativeTime}</span>
              {refreshing && <RefreshCw size={10} className="text-blue-500 animate-spin" />}
            </div>
          </div>
        </div>
        {fetchError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-orange-600">
            <RefreshCw size={12} className="animate-spin" /> Unable to load data. Retrying...
            <button onClick={fetchData} className="underline font-semibold">Retry now</button>
          </div>
        )}
      </div>

      {/* ═══ SECTION 2 — 4 SUMMARY CARDS ═════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center text-lg">&#9878;&#65039;</div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Daily Penalty</p>
              <p className={`text-xl font-bold mt-0.5 ${company.total_daily_penalty > 0 ? "text-red-600" : "text-green-600"}`}>{company.formatted.daily}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center text-lg">&#128197;</div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Annual Penalty</p>
              <p className="text-xl font-bold text-purple-600 mt-0.5">{company.formatted.annual_cr}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center text-lg">&#9888;&#65039;</div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">WHO Violations</p>
              <p className="text-xl font-bold text-orange-600 mt-0.5">{totalWho.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-lg">&#128202;</div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total Records</p>
              <p className="text-xl font-bold text-blue-600 mt-0.5">{totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3 — POLLUTANT BREAKDOWN ═════ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
        <div className="p-5 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-[#0f172a]">Pollutant Breakdown</h2>
          <p className="text-xs text-muted-foreground mt-1">Per-pollutant analysis against WHO limits</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#e2e8f0]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Pollutant</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg Value</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">WHO Limit</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Times Over</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">WHO Violations</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Daily Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {company.pollutant_breakdown.map((p) => {
                const whoInfo = WHO_LIMITS[p.pollutant];
                const whoLimit = whoInfo?.limit ?? 0;
                const timesOver = whoLimit > 0 ? p.avg_value / whoLimit : 0;
                const status = getTimesOverStatus(timesOver);
                return (
                  <tr key={p.pollutant} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 uppercase">{p.pollutant}</span>
                      <p className="text-[10px] text-slate-400">{p.records.toLocaleString()} records</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{p.avg_value.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{whoLimit > 0 ? `${whoLimit} ${whoInfo?.unit}` : "N/A"}</td>
                    <td className="px-4 py-3 text-center">
                      {whoLimit > 0 ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${getTimesOverBg(timesOver)}`}>
                          {timesOver.toFixed(1)}x
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${getSeverityColor(status)}`}>{status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">{p.who_violations.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-600">{p.daily_penalty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ SECTION 4 — PENALTY BREAKDOWN CARD ══ */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-bold text-[#0f172a] mb-4 flex items-center gap-2">
          <Scale size={20} className="text-red-600" />
          Penalty Assessment
        </h2>
        <div className="space-y-2 mb-4">
          {company.pollutant_breakdown.filter(p => p.daily_penalty !== "₹0").map((p) => (
            <div key={p.pollutant} className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 uppercase">{p.pollutant}</span>
              <span className="font-semibold text-orange-600">{p.daily_penalty} / day</span>
            </div>
          ))}
        </div>
        <div className="border-t border-red-200 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Total Daily Penalty</span>
            <span className="text-2xl font-bold text-red-600">{company.formatted.daily}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Total Annual Penalty</span>
            <span className="text-lg font-bold text-purple-600">{company.formatted.annual}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Annual (Crore)</span>
            <span className="text-lg font-bold text-purple-700">{company.formatted.annual_cr}</span>
          </div>
        </div>
        <div className="border-t border-red-200 mt-4 pt-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Based on NGT Schedule rates under Environment Protection Act 1986, Section 15.
            Actual penalties determined by NGT tribunal.
          </p>
        </div>
      </div>

      {/* ═══ SECTION 5 — 90 DAY EMISSION TREND ═══ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
        <h2 className="text-lg font-bold text-[#0f172a] mb-1">90-Day Emission Trend</h2>
        <p className="text-xs text-muted-foreground mb-4">Pollutant values vs WHO limits — {emissions.length} records</p>
        {chartDataArr.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartDataArr} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                labelFormatter={(v) => `Date: ${v}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={15} stroke="#3b82f6" strokeDasharray="6 3" label={{ value: "WHO PM2.5", position: "right", fontSize: 10, fill: "#3b82f6" }} />
              <ReferenceLine y={40} stroke="#f97316" strokeDasharray="6 3" label={{ value: "WHO SO2", position: "right", fontSize: 10, fill: "#f97316" }} />
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="6 3" label={{ value: "WHO NO2", position: "right", fontSize: 10, fill: "#ef4444" }} />
              <Line type="monotone" dataKey="pm2_5" name="PM2.5" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="so2" name="SO2" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="no2" name="NO2" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
            <p>No emission trend data available</p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 6 — LIVE ALERTS FEED ════════ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-500" />
            Live Alerts
          </h2>
          <span className="text-[10px] text-slate-500">{alerts.length} active</span>
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {alerts.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-[#e2e8f0]">
                <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${a.severity === "CRITICAL" ? "bg-red-500" : a.severity === "HIGH" ? "bg-orange-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{a.company_name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getSeverityColor(a.severity)}`}>{a.severity}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.pollutant.toUpperCase()} at <span className="font-mono font-semibold text-slate-700">{a.value}</span> exceeds {a.exceeds_who ? "WHO" : "CPCB"} limit
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400">{timeAgo(a.timestamp)}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">{a.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
            <p className="text-sm font-semibold text-green-700">No active alerts</p>
            <p className="text-xs text-slate-400 mt-1">All readings within permissible limits</p>
          </div>
        )}
      </div>

      {/* ═══ SECTION 7 — BLOCKCHAIN AUDIT TRAIL ══ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Blockchain Audit Trail
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">Algorand Testnet</span>
              <span className="text-[10px] text-green-600 font-semibold">Carbon-Negative Chain &#10003;</span>
            </div>
          </div>
        </div>
        {blockchain.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-[#e2e8f0]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">TX ID</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Block</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Pollutant</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">CO2e</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {blockchain.slice(0, 20).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={r.tx_url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        {r.blockchain_tx.slice(0, 16)}...
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{r.block_number.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 uppercase">{r.primary_pollutant}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">{r.co2_equivalent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-green-600">&#10004;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <Shield size={32} className="mx-auto text-blue-300 mb-3" />
            <p className="text-sm text-slate-600 font-medium">Records are being anchored to Algorand blockchain.</p>
            <p className="text-xs text-slate-400 mt-1">App ID: 756736023</p>
            <a href="https://lora.algokit.io/testnet/app/756736023" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2 font-semibold">
              View on Explorer <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>

      {/* ═══ SECTION 8 — RECOMMENDATIONS ═════════ */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-5">
        <h2 className="text-lg font-bold text-[#0f172a] mb-1 flex items-center gap-2">
          <TrendingDown size={20} className="text-green-600" />
          Emission Reduction Recommendations
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Sector-specific measures for {company.sector} facilities</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recs.map((rec, i) => (
            <div key={i} className="rounded-lg border border-[#e2e8f0] p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {rec.priority}
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-2">{rec.title}</h3>
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1 mb-3">
                <TrendingDown size={12} /> {rec.impact}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Cost</p>
                  <p className="text-xs font-bold text-slate-700">{rec.cost}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">ROI</p>
                  <p className="text-xs font-bold text-slate-700">{rec.roi}</p>
                </div>
              </div>
              <p className="text-[11px] text-blue-600 mb-3">{rec.subsidy}</p>
              <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors">
                Learn More <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
