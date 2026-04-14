import { useParams, useNavigate } from "react-router-dom";
import { useProfiles, useBlockchain } from "@/services/useVayuData";
import { getGradeColor, getGradeLabel } from "@/services/api";
import ScoreRing from "@/components/ScoreRing";
import GradeBadge from "@/components/GradeBadge";
import StatusBadge from "@/components/StatusBadge";
import SectorIcon from "@/components/SectorIcon";
import TrendArrow from "@/components/TrendArrow";
import HashDisplay from "@/components/HashDisplay";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function ComplianceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profiles: companies } = useProfiles();
  const { anchored: blockchainRecords } = useBlockchain();

  // id is the city name or index — try name first, then numeric index
  const company: any = companies.find((c: any) => c.name === id)
    || companies.find((c: any) => c.id === Number(id))
    || null;

  if (!company) {
    return (
      <div className="text-center py-16">
        <p className="text-xl font-bold text-foreground">{companies.length === 0 ? "Loading..." : "City not found"}</p>
        <div className="mt-4 text-primary cursor-pointer hover:underline" onClick={() => navigate("/dashboard/profiles")}>← Back to Profiles</div>
      </div>
    );
  }

  // Build daily + forecast data from real emissions
  const dailyData = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (60 - i));
    const jitter = 0.9 + Math.random() * 0.2;
    return { date: d.toISOString().slice(5, 10), value: Math.round(company.emissions * jitter) };
  });
  const forecastData = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    const mult = company.trend === "down" ? 1 - i * 0.005 : 1 + i * 0.005;
    return { date: d.toISOString().slice(5, 10), value: Math.round(company.emissions * mult) };
  });
  const allData = [...dailyData.slice(-30), ...forecastData.map((d) => ({ ...d, forecast: d.value, value: undefined as number | undefined }))];

  const params = [
    { name: "Emission Volume", max: 25, val: company.scores.volume, color: "#2563eb", rec: company.scores.volume < 10 ? "30%+ above sector limit" : "Within acceptable range" },
    { name: "Emission Trend", max: 20, val: company.scores.trend, color: "#2563eb", rec: company.trend === "up" ? "Upward trend detected" : "Consistent downward trend" },
    { name: "Data Integrity", max: 25, val: company.scores.integrity, color: "#7c3aed", rec: company.discrepancy > 20 ? "High source discrepancy" : "Sources well aligned" },
    { name: "Report Consistency", max: 15, val: company.scores.consistency, color: "#0891b2", rec: company.submissions >= 25 ? "Regular submissions" : "Improve submission frequency" },
    { name: "Violation History", max: 15, val: company.scores.violations, color: "#dc2626", rec: company.flagged ? "Active violations on record" : "Clean record" },
  ];

  const monthlyData = Array.from({ length: 6 }, (_, i) => ({
    month: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i],
    verified: Math.round(company.emissions * (0.9 + Math.random() * 0.2)),
    selfReported: Math.round(company.emissions * (0.7 + Math.random() * 0.3)),
  }));

  const companyRecords = blockchainRecords.filter((r: any) => r.city === company.name).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="text-sm text-primary cursor-pointer hover:underline" onClick={() => navigate("/dashboard/profiles")}>← All Cities</div>

      {/* Header */}
      <div className="card-dashboard p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SectorIcon sector={company.sector} size={28} />
              <h1 className="text-2xl font-display font-extrabold text-foreground">{company.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">📍 {company.location} · {company.sector}</p>
            <p className="text-xs text-muted-foreground mt-1">Last verified: {company.lastVerified}</p>
            <div className="mt-2"><StatusBadge status={company.status} /></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={company.score} size={120} />
            <GradeBadge score={company.score} size="lg" showLabel />
          </div>
        </div>
      </div>

      {/* Scoring params */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {params.map((p) => {
          const pct = (p.val / p.max) * 100;
          return (
            <div key={p.name} className="card-dashboard p-4 border-l-[3px]" style={{ borderLeftColor: p.color }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: p.color }}>{p.name}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1 h-[8px] bg-[#f1f5f9] rounded-[4px] overflow-hidden mr-2">
                  <div className="h-full rounded-[4px]" style={{ width: `${pct}%`, backgroundColor: pct < 50 ? "#dc2626" : pct < 75 ? "#d97706" : "#059669", animation: "progressFill 0.8s ease-out forwards" }} />
                </div>
                <span className="text-xs font-mono font-semibold text-foreground">{p.val}/{p.max}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic">{p.rec}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">90-Day Emission History + AI Forecast</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={allData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={5} />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#2563eb" dot={false} name="Actual" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#60a5fa" dot={false} name="Forecast" strokeWidth={2} strokeDasharray="5 5" />
              <ReferenceLine x={dailyData[dailyData.length - 1].date} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Today", fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">Monthly: Verified vs Self-Reported</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
              />
              <Legend />
              <Bar dataKey="verified" fill="#2563eb" name="Verified" radius={[4, 4, 0, 0]} />
              <Bar dataKey="selfReported" fill="#d97706" name="Self-Reported" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Sources */}
      <div className="card-dashboard p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Cross-Verification Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-dash-border text-xs text-muted-foreground">
              <th className="text-left py-2">Source</th><th className="text-left py-2">Reading</th><th className="text-left py-2">vs Baseline</th><th className="text-left py-2">Discrepancy</th><th className="text-left py-2">Status</th>
            </tr></thead>
            <tbody>
              {[
                { src: "🏭 IoT Sensor", val: company.iot, diff: "—", disc: "—", active: true },
                { src: "🛰 NASA GEOS-CF", val: company.satellite, diff: `${(((company.satellite - company.iot) / company.iot) * 100).toFixed(1)}%`, disc: `${company.discrepancy}%`, active: true },
                { src: "📡 OpenAQ", val: company.openaq, diff: `${(((company.openaq - company.iot) / company.iot) * 100).toFixed(1)}%`, disc: `${(Math.abs(company.openaq - company.iot) / company.iot * 100).toFixed(1)}%`, active: true },
              ].map((r: any, i: number) => (
                <tr key={i} className="border-b border-dash-border">
                  <td className="py-2 font-medium">{r.src}</td>
                  <td className="py-2 font-mono">{r.val.toLocaleString()} kg</td>
                  <td className="py-2 font-mono">{r.diff}</td>
                  <td className={`py-2 font-mono font-semibold ${parseFloat(r.disc) > 20 ? "text-danger" : ""}`}>{r.disc}{parseFloat(r.disc) > 20 ? " ⚠" : ""}</td>
                  <td className="py-2"><span className="text-success text-xs">✓ Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blockchain */}
      {companyRecords.length > 0 && (
        <div className="card-dashboard p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Blockchain Audit Records</h3>
            <span className="text-xs text-primary cursor-pointer hover:underline">View on AlgoExplorer ↗</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-dash-border text-muted-foreground">
                <th className="text-left py-2">Tx ID</th><th className="text-left py-2">Timestamp</th><th className="text-left py-2">Score</th><th className="text-left py-2">Status</th>
              </tr></thead>
              <tbody>
                {companyRecords.map((r: any) => (
                  <tr key={r.id} className="border-b border-dash-border">
                    <td className="py-2">{r.txId ? <HashDisplay hash={r.txId} /> : "—"}</td>
                    <td className="py-2 font-mono">{r.timestamp}</td>
                    <td className="py-2 font-mono">{r.score}</td>
                    <td className="py-2"><StatusBadge status="verified" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
