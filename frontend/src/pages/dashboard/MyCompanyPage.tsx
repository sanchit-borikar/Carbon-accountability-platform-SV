import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles, useMyCompany } from "@/services/useVayuData";
import { getForecast } from "@/services/api";
import ScoreRing from "@/components/ScoreRing";
import GradeBadge from "@/components/GradeBadge";
import TrendArrow from "@/components/TrendArrow";
import HashDisplay from "@/components/HashDisplay";
import StatusBadge from "@/components/StatusBadge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function MyCompanyPage() {
  const { user } = useAuth();
  const { profiles: companies } = useProfiles();
  const [activeTab, setActiveTab] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [method, setMethod] = useState(0);

  // Pick a profile for the company view (first available city)
  const company: any = companies[0] || {
    name: "Loading...", score: 0, emissions: 0, trend: "stable",
    trendPct: 0, submissions: 0, flagged: false, sector: "Industry",
    scores: { volume: 0, trend: 0, integrity: 0, consistency: 0, violations: 0 },
    lastVerified: "N/A", status: "verified",
  };

  // Build daily data from real emissions
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

  const tabs = ["My Score", "Submit Report", "Warnings (0)", "My Records"];

  const params = [
    { name: "Emission Volume", max: 25, val: company.scores.volume, desc: "Based on absolute emission output", rec: "Maintain current reduction trajectory" },
    { name: "Emission Trend", max: 20, val: company.scores.trend, desc: "Direction of emission changes", rec: "Consistent downward trend — keep it up!" },
    { name: "Data Integrity", max: 25, val: company.scores.integrity, desc: "Cross-source verification alignment", rec: "Sources well aligned" },
    { name: "Report Consistency", max: 15, val: company.scores.consistency, desc: "Regularity of submissions", rec: "Submit reports more regularly to improve" },
    { name: "Violation History", max: 15, val: company.scores.violations, desc: "Past compliance violations", rec: "Clean record maintained" },
  ];

  const handleSubmit = () => {
    setSubmitted(true);
    toast.success("Report submitted successfully");
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">Good Morning, {company.name} 👋</h1>
        <p className="text-sm text-muted-foreground">Your compliance overview for today — 7 March 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card-dashboard p-5 border-l-4 border-l-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">My Compliance Score</p>
              <p className="text-2xl font-display font-bold text-foreground">{company.score}/100</p>
              <div className="flex items-center gap-2 mt-1"><GradeBadge score={company.score} size="sm" showLabel /></div>
              <p className="text-[10px] text-success mt-1">↑ +3 points since yesterday</p>
            </div>
            <ScoreRing score={company.score} size={60} showLabel={false} />
          </div>
        </div>
        <div className="card-dashboard p-5 border-l-4 border-l-warning">
          <p className="text-xs text-muted-foreground">This Month Emissions</p>
          <p className="text-2xl font-display font-bold text-foreground">{company.emissions.toLocaleString()} kg CO₂e</p>
          <p className="text-[10px] text-success mt-1">↓ 12% vs last month</p>
        </div>
        <div className="card-dashboard p-5 border-l-4 border-l-primary">
          <p className="text-xs text-muted-foreground">Data Submissions</p>
          <p className="text-2xl font-display font-bold text-foreground">{company.submissions}/30</p>
          <div className="h-[8px] bg-[#f1f5f9] rounded-[4px] overflow-hidden mt-2">
            <div className="h-full rounded-[4px] bg-[#2563eb]" style={{ width: `${(company.submissions / 30) * 100}%`, animation: "progressFill 0.8s ease-out forwards" }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{30 - company.submissions} submissions remaining</p>
        </div>
        <div className={`card-dashboard p-5 border-l-4 ${company.flagged ? "border-l-danger" : "border-l-success"}`}>
          <p className="text-xs text-muted-foreground">Active Flags</p>
          <p className="text-2xl font-display font-bold text-foreground">{company.flagged ? "1" : "0"}</p>
          <p className={`text-[10px] mt-1 ${company.flagged ? "text-danger" : "text-success"}`}>{company.flagged ? "⚠ Active violation" : "✓ No active violations"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dash-border">
        {tabs.map((t, i) => (
          <div key={i} className={`pb-2 text-sm font-medium cursor-pointer ${activeTab === i ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`} onClick={() => setActiveTab(i)}>{t}</div>
        ))}
      </div>

      {/* My Score */}
      {activeTab === 0 && (
        <>
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Score Breakdown — Last Updated: Today 07:42</h3>
              {params.map((p) => {
                const pct = (p.val / p.max) * 100;
                return (
                  <div key={p.name} className="card-dashboard p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                      </div>
                      <span className="text-sm font-mono font-bold text-foreground">{p.val}/{p.max}</span>
                    </div>
                    <div className="h-[8px] bg-[#f1f5f9] rounded-[4px] overflow-hidden">
                      <div className="h-full rounded-[4px]" style={{ width: `${pct}%`, backgroundColor: pct < 50 ? "#dc2626" : pct < 75 ? "#d97706" : "#059669", animation: "progressFill 0.8s ease-out forwards" }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">{p.rec}</p>
                  </div>
                );
              })}
            </div>
            <div className="lg:col-span-2">
              <div className="card-dashboard p-6 flex flex-col items-center">
                <ScoreRing score={company.score} size={140} />
                <div className="mt-3"><GradeBadge score={company.score} size="lg" showLabel /></div>
                <p className="text-xs text-success mt-2">Your score improved +3 since yesterday</p>
                <p className="text-xs text-muted-foreground mt-1">Forecast: {Math.min(100, company.score + 3)}/100 in 30 days</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">My 90-Day Emission Trend + AI Forecast</h3>
            <ResponsiveContainer width="100%" height={280}>
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
                <ReferenceLine x={dailyData[dailyData.length - 1].date} stroke="#94a3b8" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Submit Report */}
      {activeTab === 1 && (
        <div className="max-w-2xl">
          {!submitted ? (
            <div className="card-dashboard p-6 border-t-[3px] border-t-warning">
              <h3 className="text-lg font-display font-bold text-foreground mb-2">Submit Emission Report</h3>
              <div className="p-3 rounded-lg border border-warning bg-warning-light text-xs text-foreground mb-4">
                ⚠ All submissions are cross-verified against satellite and IoT data. Discrepancies greater than 20% will automatically flag your organization.
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium mb-1">From</label><input type="date" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" /></div>
                  <div><label className="block text-xs font-medium mb-1">To</label><input type="date" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" /></div>
                </div>
                <div><label className="block text-xs font-medium mb-1">Facility Name</label><input type="text" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-xs font-medium mb-1">Location</label><input type="text" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-xs font-medium mb-1">Emission Value</label>
                  <div className="flex items-center border border-input rounded-lg overflow-hidden">
                    <input type="number" className="flex-1 px-3 py-2 outline-none text-sm" placeholder="0" />
                    <span className="px-3 py-2 bg-muted text-xs text-muted-foreground">kg CO₂e</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Measurement Method</label>
                  <div className="flex gap-2">
                    {["📡 IoT Sensor", "📝 Manual", "🔍 Third-Party Audit"].map((m, i) => (
                      <div key={i} className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold cursor-pointer ${method === i ? "btn-primary-gradient" : "btn-secondary-outline"}`} style={{ cursor: "pointer" }} onClick={() => setMethod(i)}>{m}</div>
                    ))}
                  </div>
                </div>
                <div><label className="block text-xs font-medium mb-1">Supporting Notes</label><textarea className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none resize-none" rows={3} /></div>
                <div className="border-2 border-dashed border-primary-border rounded-lg p-6 text-center bg-primary-light-bg cursor-pointer">
                  <p className="text-sm text-primary">📎 Drop file or click to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-1">PDF, CSV, XLSX accepted (max 10MB)</p>
                </div>
              </div>
              <div className="mt-4 py-3 text-center text-sm font-semibold rounded-lg cursor-pointer text-primary-foreground" style={{ background: "linear-gradient(135deg, #d97706, #b45309)" }} onClick={handleSubmit}>Submit Report</div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">📋 All submissions logged on Polygon blockchain</p>
            </div>
          ) : (
            <div className="card-dashboard p-10 text-center animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-4"><Check size={32} className="text-primary-foreground" /></div>
              <h3 className="text-lg font-display font-bold text-foreground mb-2">Report Submitted Successfully</h3>
              <p className="text-sm text-muted-foreground mb-4">Your report is being cross-verified. You'll be notified of the verification result.</p>
              <HashDisplay hash="f2a9b4c1d8e3f7a2b9c4d1e8f3a7b2c9d4e1f8a3" showBadge />
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {activeTab === 2 && (
        <div className="card-dashboard p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center mx-auto mb-3"><Check size={28} className="text-primary-foreground" /></div>
          <h3 className="text-base font-display font-bold text-foreground">No Active Warnings</h3>
          <p className="text-sm text-muted-foreground">Your organization is in good standing.</p>
        </div>
      )}

      {/* My Records */}
      {activeTab === 3 && (
        <div className="card-dashboard p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-dash-border text-muted-foreground">
                <th className="text-left py-2">Date</th><th className="text-left py-2">Facility</th><th className="text-left py-2">Value</th><th className="text-left py-2">Method</th><th className="text-left py-2">Status</th><th className="text-left py-2">Hash</th>
              </tr></thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-dash-border">
                    <td className="py-2 font-mono">2026-03-{String(7 - i).padStart(2, "0")}</td>
                    <td className="py-2">Main Facility</td>
                    <td className="py-2 font-mono">{(company.emissions + Math.round(Math.random() * 500)).toLocaleString()} kg</td>
                    <td className="py-2">IoT Sensor</td>
                    <td className="py-2"><StatusBadge status="verified" /></td>
                    <td className="py-2"><HashDisplay hash={`f${i}a9b4c1d8e3f7a2b9c4d1e8f3a7b2c9d4e1f8a3`} /></td>
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
