import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, DollarSign, AlertCircle, Scale, TrendingUp, MapPin, Building2, Info, RefreshCw, Factory, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import SkeletonLoader from "@/components/SkeletonLoader";

const API_BASE = "http://localhost:8000";
const REFRESH_INTERVAL = 10_000;

// ── Types ───────────────────────────────────────

interface CompanyItem {
  rank: number;
  city: string;
  company_name: string;
  sector: string;
  type: string;
  state: string;
  score: number;
  grade: string;
  severity: string;
  avg_co2e: number;
  who_violations: number;
  cpcb_violations: number;
  daily_penalty: number;
  annual_penalty: number;
  formatted_daily: string;
  formatted_annual: string;
  formatted_annual_cr: string;
  alert: boolean;
}

interface CompanySummary {
  companies: CompanyItem[];
  total: number;
}

interface AlertItem {
  company_name: string;
  city: string;
  sector: string;
  type: string;
  pollutant: string;
  value: number;
  co2e: number;
  severity: string;
  exceeds_who: boolean;
  exceeds_cpcb: boolean;
  timestamp: string;
  message: string;
}

interface CityPenalty {
  city: string;
  state: string;
  total_daily_inr: number;
  total_annual_inr: number;
  formatted: { daily: string; annual: string; annual_cr: string };
  breakdown: {
    pollutant: string;
    severity: string;
    daily_penalty: string;
    annual_penalty: string;
    violations: number;
  }[];
  legal_basis: string;
}

// ── Hook: ticking "Xs ago" ──────────────────────

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

// ── Component ───────────────────────────────────

export default function PenaltiesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<CompanyItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [citySearch, setCitySearch] = useState("");
  const [cityPenalty, setCityPenalty] = useState<CityPenalty | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const relativeTime = useRelativeTime(lastUpdated);

  // ── Derived stats for summary cards ───────────
  const criticalCount = companies.filter(c => c.severity === "CRITICAL").length;
  const totalDailyPenalty = companies.reduce((s, c) => s + (c.daily_penalty || 0), 0);
  const worstViolator = leaderboard[0]?.company_name ?? "--";

  // ── Fetch companies + leaderboard + alerts ────
  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    try {
      const [compRes, lbRes, alertRes] = await Promise.all([
        fetch(`${API_BASE}/api/companies`),
        fetch(`${API_BASE}/api/companies/leaderboard`),
        fetch(`${API_BASE}/api/companies/alerts`),
      ]);

      if (!mountedRef.current) return;

      if (compRes.ok) {
        const data: CompanySummary = await compRes.json();
        setCompanies(data.companies || []);
        setTotalCompanies(data.total || 0);
      }
      if (lbRes.ok) {
        const data = await lbRes.json();
        setLeaderboard(data.leaderboard || []);
      }
      if (alertRes.ok) {
        const data = await alertRes.json();
        setAlerts(data.alerts || []);
      }

      setFetchError(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Penalties fetch failed:", err);
      if (mountedRef.current) setFetchError(true);
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchData]);

  // ── City search ───────────────────────────────
  const handleCitySearch = async () => {
    const trimmed = citySearch.trim();
    if (!trimmed) { toast.error("Please enter a city name"); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/penalties/city/${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        setCityPenalty(data);
        if (data.breakdown.length === 0) toast.info(`No penalty data found for ${trimmed}`);
      } else {
        toast.error(`City "${trimmed}" not found`);
        setCityPenalty(null);
      }
    } catch { toast.error("Failed to search city"); }
    finally { setSearchLoading(false); }
  };

  // ── Helpers ───────────────────────────────────
  const getSeverityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "bg-red-500 text-white";
      case "HIGH":     return "bg-orange-500 text-white";
      case "MEDIUM":   return "bg-yellow-500 text-white";
      case "LOW":      return "bg-green-500 text-white";
      default:         return "bg-gray-400 text-white";
    }
  };
  const getSeverityDot = (s: string) => {
    switch (s) {
      case "CRITICAL": return "text-red-500";
      case "HIGH":     return "text-orange-500";
      case "MEDIUM":   return "text-yellow-500";
      default:         return "text-green-500";
    }
  };
  const getGradeColor = (g: string) => {
    switch (g) {
      case "A": return "text-green-600 bg-green-50 border-green-200";
      case "B": return "text-blue-600 bg-blue-50 border-blue-200";
      case "C": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "D": return "text-orange-600 bg-orange-50 border-orange-200";
      case "F": return "text-red-600 bg-red-50 border-red-200";
      default:  return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // ── Initial skeleton ──────────────────────────
  if (initialLoading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" />
        <SkeletonLoader type="card" />
        <SkeletonLoader type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header + LIVE badge ──────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a] flex items-center gap-2">
            <Scale size={28} className="text-[#2563eb]" />
            Penalty Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            NGT + Environment Protection Act 1986 | Company-level real-time assessment
          </p>
        </div>

        <div className="flex items-center gap-3">
          {fetchError && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              <RefreshCw size={12} className="animate-spin" />
              Retrying...
            </span>
          )}
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-full px-4 py-2 shadow-sm">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-semibold text-slate-700">LIVE</span>
            <div className="w-px h-3.5 bg-slate-200" />
            <span className="text-[11px] text-slate-500">10s refresh</span>
            <div className="w-px h-3.5 bg-slate-200" />
            <span className="text-[11px] text-slate-500">{relativeTime}</span>
            {refreshing && <RefreshCw size={12} className="text-blue-500 animate-spin" />}
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Summary Cards ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Companies Monitored */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Factory size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Companies Monitored</p>
              <p className="text-2xl font-bold text-[#0f172a] mt-1">{totalCompanies}</p>
            </div>
          </div>
        </div>

        {/* Critical Violators */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Critical Violators</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{criticalCount}</p>
            </div>
          </div>
        </div>

        {/* Total Daily Penalty */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <DollarSign size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Daily Penalty</p>
              <p className="text-xl font-bold text-orange-600 mt-1">₹{totalDailyPenalty.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Worst Violator */}
        <div className="bg-white rounded-lg border border-[#e2e8f0] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Zap size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Worst Violator</p>
              <p className="text-sm font-bold text-purple-600 mt-1 truncate" title={worstViolator}>{worstViolator}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE ALERTS TICKER ───────────────── */}
      {alerts.length > 0 && (
        <div className="bg-[#0f172a] rounded-lg border border-slate-700 p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
            </div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live Violation Alerts</span>
            <span className="text-[10px] text-slate-500 ml-auto">{alerts.length} active</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {alerts.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 text-base leading-none ${a.severity === "CRITICAL" ? "text-red-500" : a.severity === "HIGH" ? "text-orange-400" : "text-yellow-400"}`}>
                  {a.severity === "CRITICAL" || a.severity === "HIGH" ? "\u{1F534}" : "\u{1F7E1}"}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-200">{a.company_name}</span>
                  <span className="text-slate-500"> — </span>
                  <span className="text-slate-400">
                    {a.pollutant.toUpperCase()} at <span className="font-mono text-slate-300">{a.value}</span> exceeds {a.exceeds_who ? "WHO" : "CPCB"} limit
                  </span>
                </div>
                <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(a.severity)}`}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION 2: Company Leaderboard ────── */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              Top 20 Company Violators
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Ranked by compliance score — live from CPCB stations</p>
            <p className="text-[11px] text-slate-400 mt-0.5 italic">Penalty estimates based on NGT Schedule rates — Environment Protection Act 1986</p>
          </div>
          {refreshing && <RefreshCw size={16} className="text-blue-500 animate-spin" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#e2e8f0]">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Rank</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Company</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">Grade</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Compliance</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">Severity</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Daily Penalty</th>
                <th className="px-3 py-3 text-right font-semibold text-slate-700">Annual Penalty</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">WHO</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {leaderboard.map((c) => (
                <tr key={`${c.rank}-${c.city}`} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/companies/${c.city}`)}>
                  <td className="px-3 py-3">
                    <span className="font-bold text-slate-700">#{c.rank}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <span className="font-bold text-slate-900">{c.company_name}</span>
                      <p className="text-[11px] text-slate-400">{c.city}, {c.state}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{c.type}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-md font-bold text-sm border ${getGradeColor(c.grade)}`}>
                      {c.grade}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-700">{c.score.toFixed(1)}/100</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getSeverityColor(c.severity)}`}>
                      {c.severity}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-orange-600">{c.formatted_daily}</td>
                  <td className="px-3 py-3 text-right font-semibold text-purple-600">{c.formatted_annual_cr}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                      {c.who_violations}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 justify-center">
                      View Details <ChevronRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SECTION 3: City Search ──────────── */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            Search City Penalties
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Get detailed penalty breakdown for any city</p>
        </div>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
            placeholder="Enter city name (e.g., Delhi, Mumbai, Chennai)"
            className="flex-1 px-4 py-3 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button
            onClick={handleCitySearch}
            disabled={searchLoading}
            className="px-6 py-3 bg-[#2563eb] text-white rounded-lg font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
        </div>

        {searchLoading && (
          <div className="py-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-2">Searching...</p>
          </div>
        )}

        {!searchLoading && cityPenalty && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" />
                    {cityPenalty.city}, {cityPenalty.state}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">Penalty Assessment Summary</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Daily Penalty</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{cityPenalty.formatted.daily}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Annual Penalty</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{cityPenalty.formatted.annual_cr}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Legal Basis</p>
                  <p className="text-sm font-semibold text-slate-700 mt-2">{cityPenalty.legal_basis}</p>
                </div>
              </div>
            </div>

            {cityPenalty.breakdown.length > 0 ? (
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Info size={16} />
                  Penalty Breakdown by Pollutant
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-[#e2e8f0]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Pollutant</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Severity</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Daily Penalty</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Annual Penalty</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Violations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {cityPenalty.breakdown.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 uppercase">{item.pollutant}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getSeverityColor(item.severity)}`}>
                              {item.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-orange-600">{item.daily_penalty}</td>
                          <td className="px-4 py-3 text-right font-semibold text-purple-600">{item.annual_penalty}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                              {item.violations}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info size={24} className="mx-auto mb-2 opacity-50" />
                <p>No violation data available for this city</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
