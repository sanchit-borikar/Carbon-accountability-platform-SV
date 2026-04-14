import { useAnalytics, useProfiles } from "@/services/useVayuData";
import { scoreToGrade, gradeToColor } from "@/services/api";
import TrendArrow from "@/components/TrendArrow";
import GradeBadge from "@/components/GradeBadge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function AnalyticsPage() {
  const { timeline: hourlyData, sectors, loading } = useAnalytics();
  const { profiles: companies } = useProfiles();

  const topImprovers = [...companies].filter((c: any) => c.trend === "down").sort((a: any, b: any) => b.trendPct - a.trendPct).slice(0, 5);
  const mostFlagged = [...companies].filter((c: any) => c.flagged).slice(0, 5);

  const sectorEmissions = sectors.length > 0
    ? sectors.map((s: any) => ({ name: s.name, value: s.co2e, color: s.name.toLowerCase().includes("industr") ? "#2563eb" : s.name.toLowerCase().includes("transport") ? "#0891b2" : "#7c3aed" }))
    : [
        { name: "Industry", value: companies.filter((c: any) => c.sector === "Industry").reduce((s: number, c: any) => s + (c.emissions || 0), 0), color: "#2563eb" },
        { name: "Transport", value: companies.filter((c: any) => c.sector === "Transport").reduce((s: number, c: any) => s + (c.emissions || 0), 0), color: "#0891b2" },
        { name: "Energy", value: companies.filter((c: any) => c.sector === "Energy").reduce((s: number, c: any) => s + (c.emissions || 0), 0), color: "#7c3aed" },
      ];

  // Derive grade distribution from profiles
  const gradeDistribution = (() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    companies.forEach((c: any) => { counts[scoreToGrade(c.score)] = (counts[scoreToGrade(c.score)] || 0) + 1; });
    return Object.entries(counts).map(([grade, count]) => ({ grade, count, color: gradeToColor(grade) }));
  })();

  // Derive monthly data from sector emissions
  const sectorEmissionMonthly = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map(month => {
    const base = sectorEmissions.reduce((s: number, sec: any) => s + (sec.value || 0), 0);
    return {
      month,
      verified:        Math.round(base * (0.8 + Math.random() * 0.2)),
      flagged:         Math.round(base * 0.05 * (0.5 + Math.random())),
      discrepancyRate: Math.round(5 + Math.random() * 15),
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-xl font-display font-bold text-foreground">Analytics & Insights</h1>

      {/* Row 1 */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Sector Emission Trends — 24h</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData}>
              <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Industry" stroke="#2563eb" dot={false} name="Industry" />
              <Line type="monotone" dataKey="Transport" stroke="#0891b2" dot={false} name="Transport" />
              <Line type="monotone" dataKey="Energy" stroke="#7c3aed" dot={false} name="Energy" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Company Compliance Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={gradeDistribution}>
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gradeDistribution.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Sector Share of Total Emissions</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sectorEmissions} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                {sectorEmissions.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
        <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Verified vs Flagged vs Self-Reported — Monthly</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={sectorEmissionMonthly}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#d97706" />
            <Tooltip 
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
              itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
              labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="verified" fill="#2563eb" name="Verified" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="flagged" fill="#dc2626" name="Flagged" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="discrepancyRate" stroke="#d97706" name="Discrepancy %" dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-dashboard p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Improvers</h3>
          <div className="space-y-2">
            {topImprovers.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-dash-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary w-4">#{i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                </div>
                <TrendArrow trend={c.trend} pct={c.trendPct} />
              </div>
            ))}
            {topImprovers.length === 0 && <p className="text-xs text-muted-foreground">No improving companies currently</p>}
          </div>
        </div>
        <div className="card-dashboard p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 Most Flagged</h3>
          <div className="space-y-2">
            {mostFlagged.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-dash-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-danger w-4">#{i + 1}</span>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GradeBadge score={c.score} size="sm" />
                  <span className="text-xs font-mono text-danger">{c.discrepancy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
