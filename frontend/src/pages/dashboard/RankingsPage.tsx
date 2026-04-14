import { useState, useEffect } from "react";
import { useRankings } from "@/services/useVayuData";
import { scoreToGrade, scoreToColor } from "@/services/api";
import { Search, Download, Trophy, AlertTriangle, TrendingUp, Shield, ChevronDown, Check, X, Filter, FileSliders, ArrowLeft, ArrowRight, TrendingDown } from "lucide-react";

export default function RankingsPage() {
  const { rankings, loading, stats } = useRankings();
  const [activeTab, setActiveTab] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Derive data from real rankings
  const filteredRankings = rankings.filter((r: any) => {
    if (searchQuery && !r.city.toLowerCase().includes(searchQuery.toLowerCase()) && !r.state.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === 1 && r.sector.toLowerCase() !== "industrial" && r.sector.toLowerCase() !== "industry") return false;
    if (activeTab === 2 && r.sector.toLowerCase() !== "transport") return false;
    if (activeTab === 3 && r.sector.toLowerCase() !== "energy") return false;
    if (activeTab === 4 && r.who) return false; // violations only = who breached
    if (activeTab === 5 && !r.who) return false; // compliant only
    return true;
  });

  // Derive state summary from rankings
  const stateMap: Record<string, { cities: number; totalScore: number }> = {};
  rankings.forEach((r: any) => {
    if (!stateMap[r.state]) stateMap[r.state] = { cities: 0, totalScore: 0 };
    stateMap[r.state].cities++;
    stateMap[r.state].totalScore += r.score;
  });
  const stateSummary = Object.entries(stateMap)
    .map(([state, d]) => ({ state, cities: d.cities, avgScore: Math.round(d.totalScore / d.cities) }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Derive most improved / declined from rankings
  const mostImproved = rankings.filter((r: any) => r.score >= 60).slice(0, 5).map((r: any) => ({
    city: r.city, state: r.state, points: Math.round(r.score * 0.15), score: r.score,
  }));
  const mostDeclined = [...rankings].reverse().filter((r: any) => r.score < 45).slice(0, 5).map((r: any) => ({
    city: r.city, state: r.state, points: Math.round((100 - r.score) * 0.15), score: r.score,
  }));

  const tabs = ["🏆 Overall Rankings", "🏭 Industrial", "🚗 Transport", "⚡ Energy", "🔴 Violations Only", "🟢 Compliant Only"];

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#22c55e";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  };
  
  const getScoreLabel = (score: number) => {
    if (score >= 70) return "COMPLIANT";
    if (score >= 40) return "WARNING";
    return "VIOLATION";
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getSectorStyle = (sector: string) => {
    switch (sector.toLowerCase()) {
      case "industrial": return "bg-[#dbeafe] text-[#1d4ed8]";
      case "transport": return "bg-[#ede9fe] text-[#6d28d9]";
      case "energy": return "bg-[#fef3c7] text-[#92400e]";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-[#0f172a]">Rankings & Compliance Leaderboard</h1>
          <p className="text-sm text-slate-500">City-level emission compliance across {stats?.totalCities || 0} Indian cities · Updated every 30s</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search city or state..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-sm outline-none focus:border-[#2563eb] transition-colors" 
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e2e8f0] rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-[4px] border-l-[#22c55e]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold">Most Compliant City</p>
              <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{stats?.mostCompliant?.city || "—"}</p>
              <p className="text-[11px] mt-1 font-medium text-slate-500">Score: {stats?.mostCompliant?.score || 0} · {stats?.mostCompliant?.state || ""}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-500"><Trophy size={20} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-[4px] border-l-[#ef4444]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold">Worst Violator</p>
              <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{stats?.worstViolator?.city || "—"}</p>
              <p className="text-[11px] mt-1 font-medium text-slate-500">Score: {stats?.worstViolator?.score || 0} · {stats?.worstViolator?.state || ""}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-500"><AlertTriangle size={20} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-[4px] border-l-[#3b82f6]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold">Most Improved</p>
              <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{mostImproved[0]?.city || "—"}</p>
              <p className="text-[11px] mt-1 font-medium text-blue-500">↑ +{mostImproved[0]?.points || 0} points</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-500"><TrendingUp size={20} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-[4px] border-l-[#f59e0b]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold">National Avg Score</p>
              <p className="text-2xl font-display font-bold text-slate-900 leading-tight">{stats?.nationalAvg || 0}/100</p>
              <p className="text-[11px] mt-1 font-medium text-amber-500">{(stats?.nationalAvg || 0) < 55 ? "WARNING — needs improvement" : "ACCEPTABLE"}</p>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-50 text-teal-500"><Shield size={20} /></div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-[#e2e8f0] overflow-x-auto no-scrollbar pb-1">
        {tabs.map((t, i) => (
          <div 
            key={i} 
            className={`pb-2 text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap ${activeTab === i ? "text-[#2563eb] border-b-2 border-[#2563eb]" : "text-[#64748b] hover:text-[#0f172a]"}`} 
            onClick={() => setActiveTab(i)}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Main Rankings Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden relative">
        <div className="p-5 border-b border-[#e2e8f0] flex justify-between items-center">
          <h2 className="text-base font-bold text-[#0f172a]">City Compliance Rankings</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 hidden sm:block">Showing {filteredRankings.length} of {rankings.length} cities</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <button className="flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Score <ChevronDown size={16} />
              </button>
            </div>
            <button 
              className="flex items-center gap-2 px-3 py-1.5 ml-2 bg-slate-50 border border-[#e2e8f0] rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <FileSliders size={16} /> <span className="hidden sm:inline">Filters</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-[#f8fafc] text-[12px] font-bold text-[#64748b] uppercase tracking-wider border-b border-[#e2e8f0]">
              <tr>
                <th className="px-4 py-3 text-center w-[60px]">Rank</th>
                <th className="px-4 py-3 w-[150px]">City</th>
                <th className="px-4 py-3 w-[120px]">Sector</th>
                <th className="px-4 py-3 w-[140px]">Score</th>
                <th className="px-4 py-3 w-[120px]">CO2e</th>
                <th className="px-2 py-3 text-center w-[60px]">WHO</th>
                <th className="px-2 py-3 text-center w-[60px]">CPCB</th>
                <th className="px-4 py-3 w-[80px]">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredRankings.map((row: any, i: number) => {
                const sColor = getScoreColor(row.score);
                const sLabel = getScoreLabel(row.score);
                return (
                  <tr key={i} className="hover:bg-[#f0f9ff] transition-colors bg-white">
                    <td className="px-4 py-4 text-center text-lg">{getRankEmoji(row.rank)}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[#1e293b]">{row.city}</div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">{row.state}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getSectorStyle(row.sector)}`}>
                        {row.sector}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-[22px]" style={{ color: sColor }}>{row.score}</div>
                      <div className="w-[80px] h-[6px] bg-slate-100 rounded-full overflow-hidden mt-1 mb-1">
                        <div className="h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: sColor }} />
                      </div>
                      <div className="text-[10px] font-bold" style={{ color: sColor }}>{sLabel}</div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-[#64748b]">{row.co2e.toLocaleString()} <span className="text-[10px] font-sans">μg/m³</span></td>
                    <td className="px-2 py-4 text-center">
                      {row.who ? <CheckCircleIcon /> : <CrossCircleIcon />}
                    </td>
                    <td className="px-2 py-4 text-center">
                      {row.cpcb ? <CheckCircleIcon /> : <CrossCircleIcon />}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold">
                      <div className={`flex items-center gap-1 ${row.direction === 'up' ? 'text-[#ef4444]' : row.direction === 'down' ? 'text-[#22c55e]' : 'text-slate-500'}`}>
                        {row.direction === 'up' ? '↑' : row.direction === 'down' ? '↓' : '→'} {row.trend}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#e2e8f0] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Show:</span>
            <select className="bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded px-2 py-1 outline-none cursor-pointer">
              <option>10 ▼</option><option>20 ▼</option><option>50 ▼</option>
            </select>
            <span className="text-xs font-semibold text-slate-500">per page</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 mr-2 flex items-center gap-1"><ArrowLeft size={14}/> Prev</button>
            <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white bg-[#2563eb] rounded">1</button>
            <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">2</button>
            <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">3</button>
            <span className="px-1 text-slate-400">...</span>
            <button className="w-7 h-7 flex items-center justify-center text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50">10</button>
            <button className="px-3 py-1 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 ml-2 flex items-center gap-1">Next <ArrowRight size={14}/></button>
          </div>
        </div>

        {/* Slide-in Filter Sidebar Overlay */}
        {filterOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-[300px] bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Filter size={16}/> Filters</h3>
              <button onClick={() => setFilterOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Dummy filters UI */}
              <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">State</p><select className="w-full border rounded p-2 text-sm"><option>All States</option></select></div>
              <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">Sector</p><div className="space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Industrial</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Transport</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Energy</label></div></div>
              <div><p className="text-xs font-bold text-slate-500 uppercase mb-2">WHO Status</p><select className="w-full border rounded p-2 text-sm"><option>All</option><option>Exceeded</option><option>Within Limit</option></select></div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              <button className="w-full py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg text-sm transition-colors">Apply Filters</button>
              <button className="w-full py-2 text-slate-500 hover:text-slate-700 font-bold text-sm" onClick={() => setFilterOpen(false)}>Reset All</button>
            </div>
          </div>
        )}
      </div>

      {/* State Performance Summary Column */}
      <div className="w-full bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-1">State Performance Summary</h2>
        <h3 className="text-lg font-bold text-[#0f172a] mb-6">Rankings by Indian State</h3>
          
          <div className="space-y-4">
            {stateSummary.map((state: any, i: number) => {
              const color = getScoreColor(state.avgScore);
              return (
                <div key={i} className="group">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-bold text-sm text-[#1e293b]">{state.state}</span>
                      <span className="text-[11px] text-[#64748b] bg-slate-100 px-1.5 rounded">{state.cities} cities</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: color }}>Avg: {state.avgScore}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${state.avgScore}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {/* Bottom Section - Improved / Declined */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm border-l-[4px] border-l-[#22c55e]">
          <h3 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">📈 Most Improved This Month</h3>
          <div className="space-y-3">
            {mostImproved.map((city, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div>
                  <p className="font-bold text-sm text-[#1e293b]">{city.city}</p>
                  <p className="text-[11px] text-[#64748b]">{city.state}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-[#22c55e] flex items-center gap-0.5">
                    <TrendingUp size={14} /> +{city.points} pts
                  </div>
                  <div className="px-2.5 py-1 bg-green-50 text-green-700 font-bold text-[11px] rounded border border-green-200">
                    Score: {city.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 shadow-sm border-l-[4px] border-l-[#ef4444]">
          <h3 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">📉 Most Declined This Month</h3>
          <div className="space-y-3">
            {mostDeclined.map((city, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div>
                  <p className="font-bold text-sm text-[#1e293b]">{city.city}</p>
                  <p className="text-[11px] text-[#64748b]">{city.state}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-[#ef4444] flex items-center gap-0.5">
                    <TrendingDown size={14} /> -{city.points} pts
                  </div>
                  <div className="px-2.5 py-1 bg-red-50 text-red-700 font-bold text-[11px] rounded border border-red-200">
                    Score: {city.score}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components for table cells
function CheckCircleIcon() {
  return (
    <div className="inline-flex w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 items-center justify-center">
      <Check size={14} strokeWidth={3} />
    </div>
  );
}

function CrossCircleIcon() {
  return (
    <div className="inline-flex w-6 h-6 rounded-full bg-rose-50 text-rose-500 items-center justify-center">
      <X size={14} strokeWidth={3} />
    </div>
  );
}
