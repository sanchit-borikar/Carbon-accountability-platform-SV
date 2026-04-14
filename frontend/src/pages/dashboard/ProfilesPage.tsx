import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfiles } from "@/services/useVayuData";
import { scoreToGrade } from "@/services/api";
import GradeBadge from "@/components/GradeBadge";
import StatusBadge from "@/components/StatusBadge";
import SectorIcon from "@/components/SectorIcon";
import TrendArrow from "@/components/TrendArrow";
import { Search } from "lucide-react";

export default function ProfilesPage() {
  const { profiles: companies, loading } = useProfiles();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [statusTab, setStatusTab] = useState("all");

  let filtered = companies.filter((c: any) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (sectorFilter !== "All" && c.sector !== sectorFilter) return false;
    if (gradeFilter !== "All" && c.grade !== gradeFilter) return false;
    if (statusTab === "flagged" && !c.flagged) return false;
    if (statusTab === "verified" && c.status !== "verified") return false;
    return true;
  });

  const tabs = [
    { key: "all", label: `All (${companies.length})` },
    { key: "flagged", label: `🚩 Flagged (${companies.filter((c: any) => c.flagged).length})` },
    { key: "verified", label: `✓ Verified (${companies.filter((c: any) => c.status === "verified").length})` },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl font-display font-bold text-foreground">Company Profiles</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" className="pl-9 pr-3 py-2 bg-card border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 w-64" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dash-border">
        {tabs.map((t) => (
          <div key={t.key} className={`pb-2 text-sm font-medium cursor-pointer ${statusTab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setStatusTab(t.key)}>{t.label}</div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["All", "Industrial", "Transport", "Energy"].map((s) => (
          <div key={s} className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${sectorFilter === s ? "btn-primary-gradient" : "btn-secondary-outline"}`} style={{ cursor: "pointer" }} onClick={() => setSectorFilter(s)}>{s}</div>
        ))}
        <div className="w-px bg-dash-border mx-1" />
        {["All", "A", "B", "C", "D", "F"].map((g) => (
          <div key={g} className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${gradeFilter === g ? "btn-primary-gradient" : "btn-secondary-outline"}`} style={{ cursor: "pointer" }} onClick={() => setGradeFilter(g)}>{g}</div>
        ))}
      </div>

      {loading && <div className="text-center py-8 text-sm text-muted-foreground">Loading profiles...</div>}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c: any, i: number) => (
          <div key={c.id} className="card-dashboard p-5 cursor-pointer" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => navigate(`/dashboard/profiles/${c.id}`)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <SectorIcon sector={c.sector} size={14} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.sector}</span>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <h3 className="text-base font-display font-bold text-foreground mt-1">{c.name}</h3>
            <p className="text-xs text-muted-foreground">📍 {c.location}</p>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Compliance Score</p>
                <p className="text-2xl font-display font-bold text-foreground">{c.score}</p>
              </div>
              <GradeBadge score={c.score} size="md" />
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.score}%`, backgroundColor: c.grade === "A" ? "#059669" : c.grade === "B" ? "#0891b2" : c.grade === "C" ? "#d97706" : c.grade === "D" ? "#ea580c" : "#dc2626" }} />
            </div>

            <div className="border-t border-dash-border mt-4 pt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs font-mono font-semibold text-foreground">{c.emissions.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">kg CO₂e</p></div>
              <div><p className="text-xs font-semibold text-foreground">{c.lastVerified}</p><p className="text-[9px] text-muted-foreground">Last Verified</p></div>
              <div><p className={`text-xs font-mono font-semibold ${c.discrepancy > 20 ? "text-danger" : "text-foreground"}`}>{c.discrepancy}%</p><p className="text-[9px] text-muted-foreground">Discrepancy</p></div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <TrendArrow trend={c.trend} pct={c.trendPct} />
              <span className="text-xs text-primary font-semibold">View Details →</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm font-semibold text-foreground">No companies found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
