import { useState, useEffect, useMemo } from "react";
import { useProfiles, useAnalytics } from "@/services/useVayuData";
import { multiSourceValues } from "@/services/api";
import StatusBadge from "@/components/StatusBadge";
import HashDisplay from "@/components/HashDisplay";
import SkeletonLoader from "@/components/SkeletonLoader";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Copy, Save } from "lucide-react";
import { toast } from "sonner";

const IPCC_FACTORS: Record<string, number> = {
  "PM2.5": 110,
  "PM10":  50,
  "NO2":   298,
  "SO2":   132,
  "CO":    1,
  "CO2":   1,
  "NOx":   298,
  "CH4":   25,
  "N2O":   298
};

const UNIT_CONVERSION: Record<string, number> = {
  "μg/m³": 1,
  "ppm":   1000,
  "ppb":   1,
  "mg/m³": 1000,
  "kg":    1000000,
  "tonnes":1000000000,
  "kWh":   820,
  "MWh":   820000
};

const SECTOR_MULTIPLIERS: Record<string, number> = {
  "Industrial": 1.2,
  "Transport":  1.0,
  "Energy":     0.9
};

const WHO_LIMITS: Record<string, number> = {
  "PM2.5": 25,
  "PM10":  50,
  "NO2":   40,
  "SO2":   20,
  "CO":    4000
};

const CPCB_LIMITS: Record<string, number> = {
  "PM2.5": 60,
  "PM10":  100,
  "NO2":   80,
  "SO2":   80,
  "CO":    2000
};

export default function DataVerificationPage() {
  const { profiles: companies } = useProfiles();
  const { timeline: hourlyData } = useAnalytics();
  const [loading, setLoading] = useState(true);
  const [sourceTab, setSourceTab] = useState(0);

  const [calcPollutant, setCalcPollutant] = useState("PM2.5");
  const [calcValue, setCalcValue] = useState("");
  const [calcUnit, setCalcUnit] = useState("μg/m³");
  const [calcSector, setCalcSector] = useState("Industrial");
  const [calcResult, setCalcResult] = useState<{
    co2e: number;
    formula: string;
    ipccFactor: number;
    sectorMultiplier: number;
  } | null>(null);
  const [calcError, setCalcError] = useState("");

  const handleCalculate = () => {
    const val = parseFloat(calcValue);
    if (isNaN(val) || val <= 0) {
      setCalcError("Please enter a valid positive number");
      setCalcResult(null);
      return;
    }
    setCalcError("");

    const valueInUg = val * (UNIT_CONVERSION[calcUnit] || 1);
    const ipcc = IPCC_FACTORS[calcPollutant] || 1;
    const secMult = SECTOR_MULTIPLIERS[calcSector] || 1;

    const co2e = valueInUg * ipcc * secMult;

    const formattedVal = val.toString();
    const formattedCo2e = Number(co2e.toFixed(2)).toLocaleString("en-US", { maximumFractionDigits: 2 });
    
    const formula = `${formattedVal} ${calcUnit} × ${ipcc} ${secMult !== 1 ? `× ${secMult} ` : ""}= ${formattedCo2e}`;

    setCalcResult({
      co2e: Number(co2e.toFixed(2)),
      formula,
      ipccFactor: ipcc,
      sectorMultiplier: secMult
    });
  };

  const handleCopyResult = () => {
    if (calcResult) {
      navigator.clipboard.writeText(calcResult.co2e.toString());
      toast.success("Result copied to clipboard");
    }
  };

  const handleSaveToReport = async () => {
    if (!calcResult) return;
    
    const payload = {
      pollutant: calcPollutant,
      raw_value: parseFloat(calcValue),
      unit: calcUnit,
      sector: calcSector,
      co2e: calcResult.co2e,
      ipcc_factor: calcResult.ipccFactor,
      formula: calcResult.formula,
      standard: "IPCC AR6 2023",
      timestamp: new Date().toISOString(),
      source: "manual_calculator"
    };

    try {
      const res = await fetch("http://localhost:8000/api/manual-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("API failed");
      toast.success("✓ Report saved successfully", { duration: 3000 });
    } catch (e) {
      toast.error("✗ Failed to save — using local storage", { duration: 3000 });
      const existing = JSON.parse(localStorage.getItem("manual_reports") || "[]");
      existing.push(payload);
      localStorage.setItem("manual_reports", JSON.stringify(existing));
    }
  };

  // Build multi-source timeline from hourly sector data
  const multiSourceTimeline = useMemo(() => {
    return hourlyData.map((h: any) => {
      const total = (h.Industry || 0) + (h.Transport || 0) + (h.Energy || 0);
      const ms = multiSourceValues(total, h.time);
      return {
        time: h.time,
        IoT: ms.iot || Math.round(total * 0.95),
        Satellite: ms.satellite || Math.round(total * 1.08),
        OpenAQ: ms.openaq || Math.round(total * 0.98),
      };
    });
  }, [hourlyData]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <SkeletonLoader type="table" />;

  const sources = ["🏭 IoT Sensors", "🛰 Satellite", "📡 OpenAQ"];

  const liveRows = companies.map((c: any) => ({
    time: c.lastVerified,
    entity: c.name,
    location: c.location,
    sector: c.sector,
    value: sourceTab === 0 ? c.iot : sourceTab === 1 ? c.satellite : c.openaq,
    status: c.status,
  }));

  const verifications = [...companies]
    .filter((c: any) => c.discrepancy > 0)
    .sort((a: any, b: any) => b.discrepancy - a.discrepancy)
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="text-xl font-display font-bold text-foreground">Data & Verification</h1>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left - Live Data Feed */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card-dashboard p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Live Data Feed</h3>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                <span className="text-[10px] text-primary font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {sources.map((s, i) => (
                <div key={i} className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${sourceTab === i ? "btn-primary-gradient" : "btn-secondary-outline"}`} style={{ cursor: "pointer" }} onClick={() => setSourceTab(i)}>{s}</div>
              ))}
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card"><tr className="border-b border-dash-border text-muted-foreground">
                  <th className="text-left py-2">Time</th><th className="text-left py-2">Entity</th><th className="text-left py-2">Sector</th><th className="text-left py-2">Value</th><th className="text-left py-2">Status</th>
                </tr></thead>
                <tbody>
                  {liveRows.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-dash-border hover:bg-primary-light-bg transition-colors">
                      <td className="py-2 font-mono">{r.time}</td>
                      <td className="py-2 font-medium">{r.entity}</td>
                      <td className="py-2">{r.sector}</td>
                      <td className="py-2 font-mono">{(r.value || 0).toLocaleString()} kg</td>
                      <td className="py-2"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 shadow-sm">
            <h3 className="text-[14px] font-bold text-[#0f172a] mb-4">24-Hour Multi-Source Comparison</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={multiSourceTimeline}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: "10px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                  itemStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
                  labelStyle={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: "#0f172a" }}
                />
                <Legend />
                <Area type="monotone" dataKey="IoT" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} name="IoT Sensors" />
                <Area type="monotone" dataKey="Satellite" stroke="#0891b2" fill="#0891b2" fillOpacity={0.15} name="Satellite" />
                <Area type="monotone" dataKey="OpenAQ" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} name="OpenAQ" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right - Verification Engine */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-dashboard p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Cross-Verification Engine</h3>
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-3">
              {verifications.map((c: any) => (
                <div key={c.id} className="border border-dash-border rounded-lg p-3">
                  <p className="text-sm font-semibold text-foreground">{c.name} <span className="text-xs text-muted-foreground">· {c.sector}</span></p>
                  <div className="space-y-1 mt-2 text-xs font-mono">
                    <div className="flex justify-between"><span className="text-muted-foreground">🏭 IoT:</span><span>{(c.iot || 0).toLocaleString()} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">🛰 Satellite:</span><span>{(c.satellite || 0).toLocaleString()} kg</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">📡 OpenAQ:</span><span>{(c.openaq || 0).toLocaleString()} kg</span></div>
                  </div>
                  <div className={`flex justify-between mt-2 text-xs font-semibold ${c.discrepancy > 20 ? "text-danger" : "text-foreground"}`}>
                    <span>Δ Discrepancy:</span><span>{c.discrepancy}%</span>
                  </div>
                  <div className={`mt-2 p-2 rounded-lg text-xs ${c.discrepancy > 20 ? "bg-danger-light border border-danger/20 text-danger" : "bg-success-light border border-success/20 text-success"}`}>
                    {c.discrepancy > 20 ? "⚠ FLAGGED — Exceeds 20% threshold" : "✓ VERIFIED — Within threshold"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Flow */}
          <div className="card-dashboard p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Decision Flow</h3>
            <div className="flex items-center justify-center gap-1 text-[10px] font-mono">
              <div className="px-2 py-1 bg-primary-light-bg text-primary rounded">IoT</div>
              <span>→</span>
              <div className="px-2 py-1 bg-primary-light-bg text-primary rounded">NASA</div>
              <span>→</span>
              <div className="px-2 py-1 bg-primary text-primary-foreground rounded font-semibold">Cross-Verify</div>
              <span>→</span>
              <div className="flex flex-col items-center gap-1">
                <div className="px-2 py-0.5 bg-danger-light text-danger rounded">FLAG 🚨</div>
                <div className="px-2 py-0.5 bg-success-light text-success rounded">AUDIT ✓</div>
              </div>
            </div>
          </div>

          {/* GHG Calculator */}
          <div className="card-dashboard p-5 border-t-[3px] border-t-warning">
            <h3 className="text-sm font-semibold text-foreground mb-1">⚗️ GHG Protocol Calculator</h3>
            <p className="text-[10px] text-muted-foreground mb-4">Convert raw readings to standardized CO₂e</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Pollutant Type</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none bg-card"
                  value={calcPollutant}
                  onChange={(e) => setCalcPollutant(e.target.value)}
                >
                  <option value="PM2.5">PM2.5</option><option value="PM10">PM10</option><option value="NO2">NO2</option><option value="SO2">SO2</option><option value="CO">CO</option><option value="CO2">CO2</option><option value="NOx">NOx</option><option value="CH4">CH4 (Methane)</option><option value="N2O">N2O (Nitrous Oxide)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Raw Value</label>
                <input 
                  type="number" 
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-card transition-colors ${calcError ? "border-danger focus:border-danger" : "border-input focus:border-primary"}`} 
                  placeholder="Enter value" 
                  value={calcValue}
                  onChange={(e) => {
                    setCalcValue(e.target.value);
                    if (calcError) setCalcError("");
                  }}
                />
                {calcError && <p className="text-[10px] text-danger mt-1">{calcError}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Unit</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none bg-card"
                  value={calcUnit}
                  onChange={(e) => setCalcUnit(e.target.value)}
                >
                  <option value="μg/m³">μg/m³</option><option value="ppm">ppm</option><option value="ppb">ppb</option><option value="mg/m³">mg/m³</option><option value="kg">kg</option><option value="tonnes">tonnes</option><option value="kWh">kWh</option><option value="MWh">MWh</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Sector</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none bg-card"
                  value={calcSector}
                  onChange={(e) => setCalcSector(e.target.value)}
                >
                  <option value="Industrial">Industrial</option><option value="Transport">Transport</option><option value="Energy">Energy</option>
                </select>
              </div>

              <button 
                onClick={handleCalculate}
                className="w-full flex items-center justify-center font-semibold text-white rounded-[8px] transition-opacity hover:opacity-90" 
                style={{ background: "#f97316", height: "44px" }}
              >
                Calculate CO2e
              </button>
            </div>

            {calcResult && (
              <div className="mt-4 p-4 rounded-lg bg-[#f0fdf4] border border-[#bbf7d0]">
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[#15803d] uppercase tracking-wider mb-1">CO2e Equivalent</p>
                  <div className="text-[28px] font-bold text-[#15803d] leading-none mb-1">
                    {calcResult.co2e.toLocaleString()} <span className="text-sm font-normal">μg/m³</span>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <p className="text-[12px] font-mono text-[#64748b]">Formula: {calcResult.formula}</p>
                  <p className="text-[11px] text-[#94a3b8]">Standard: IPCC AR6 2023</p>
                </div>

                <div className="space-y-2 mb-4">
                  {(() => {
                    const limit = WHO_LIMITS[calcPollutant];
                    if (!limit) return null;
                    const exceeds = calcResult.co2e > limit;
                    return (
                      <div className={`p-2 rounded border text-xs font-medium ${exceeds ? "bg-[#fef2f2] border-[#fecaca] text-[#ef4444]" : "bg-[#f0fdf4] border-[#bbf7d0] text-[#22c55e]"}`}>
                        {exceeds ? "⚠ Exceeds WHO limit" : "✓ Within WHO limit"} <span className="opacity-80 font-normal"> <br/>(limit: {limit.toLocaleString()} μg/m³)</span>
                      </div>
                    );
                  })()}
                  
                  {(() => {
                    const limit = CPCB_LIMITS[calcPollutant];
                    if (!limit) return null;
                    const exceeds = calcResult.co2e > limit;
                    return (
                      <div className={`p-2 rounded border text-xs font-medium ${exceeds ? "bg-[#fef2f2] border-[#fecaca] text-[#ef4444]" : "bg-[#f0fdf4] border-[#bbf7d0] text-[#22c55e]"}`}>
                        {exceeds ? "⚠ Exceeds CPCB limit" : "✓ Within CPCB limit"} <span className="opacity-80 font-normal"> <br/>(limit: {limit.toLocaleString()} μg/m³)</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-2 mb-3">
                  <button onClick={handleCopyResult} className="flex-1 py-1.5 px-3 bg-white border border-[#bbf7d0] rounded-md text-xs font-semibold text-[#15803d] flex items-center justify-center gap-1.5 hover:bg-green-50 transition-colors">
                    <Copy size={14} /> Copy Result
                  </button>
                  <button onClick={handleSaveToReport} className="flex-1 py-1.5 px-3 bg-[#15803d] text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#166534] transition-colors">
                    <Save size={14} /> Save to Report
                  </button>
                </div>

                <div className="text-center mt-3">
                  <button 
                    onClick={() => {
                      setCalcResult(null);
                      setCalcValue("");
                      setCalcError("");
                    }} 
                    className="text-[11px] font-medium text-[#64748b] hover:text-[#0f172a] transition-colors"
                  >
                    ← Calculate another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
