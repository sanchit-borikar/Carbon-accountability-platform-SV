import { useState } from "react";
import GradeBadge from "@/components/GradeBadge";

type Tab = "industry" | "transport" | "energy";

const tabConfig = {
  industry: {
    icon: "🏭",
    label: "Industry",
    fields: [
      { label: "Monthly Energy Usage", suffix: "kWh", key: "energy" },
      { label: "Production Output", suffix: "tonnes", key: "output" },
    ],
    fuelOptions: ["Coal", "Natural Gas", "Renewable"],
    avg: 25000,
  },
  transport: {
    icon: "🚗",
    label: "Transport",
    fields: [
      { label: "Fleet Size", suffix: "vehicles", key: "fleet" },
      { label: "Avg Monthly Distance", suffix: "km", key: "distance" },
    ],
    fuelOptions: ["Diesel", "Petrol", "Electric", "Hybrid"],
    avg: 8000,
  },
  energy: {
    icon: "⚡",
    label: "Energy",
    fields: [
      { label: "Generation Capacity", suffix: "MW", key: "capacity" },
      { label: "Monthly Output", suffix: "MWh", key: "monthlyOutput" },
    ],
    fuelOptions: ["Coal", "Gas", "Solar", "Wind", "Hydro"],
    avg: 15000,
  },
};

export default function CarbonCalculator() {
  const [tab, setTab] = useState<Tab>("industry");
  const [result, setResult] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const config = tabConfig[tab];

  const calculate = () => {
    const base = tab === "industry" ? 1200 : tab === "transport" ? 450 : 800;
    const rand = Math.random() * 0.4 + 0.8;
    setResult(Math.round(base * rand * 10));
  };

  const score = result ? Math.min(100, Math.max(0, Math.round(100 - (result / config.avg) * 50))) : 0;

  return (
    <section className="py-20 bg-card">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-dashboard p-8 border-t-[3px] border-t-primary">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Estimate Your Emission Impact</h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(Object.keys(tabConfig) as Tab[]).map((t) => (
              <div
                key={t}
                className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all ${tab === t ? "btn-primary-gradient" : "btn-secondary-outline"}`}
                onClick={() => { setTab(t); setResult(null); setValues({}); }}
                style={tab === t ? { cursor: "pointer" } : {}}
              >
                {tabConfig[t].icon} {tabConfig[t].label}
              </div>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4 mb-6">
            {config.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
                <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    type="number"
                    className="flex-1 px-3 py-2.5 bg-transparent outline-none text-sm"
                    placeholder="0"
                    value={values[f.key] || ""}
                    onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  />
                  <span className="px-3 text-xs text-muted-foreground bg-muted h-full flex items-center py-2.5">{f.suffix}</span>
                </div>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fuel Type</label>
              <select className="w-full px-3 py-2.5 border border-input rounded-lg text-sm bg-card outline-none focus:ring-2 focus:ring-primary/20">
                {config.fuelOptions.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="btn-primary-gradient w-full py-3 text-center text-sm font-semibold" onClick={calculate}>
            Calculate Emissions →
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6 p-5 rounded-xl border-2 border-primary/20 bg-primary-light-bg animate-slide-in-top">
              <div className="text-2xl font-display font-bold text-primary mb-1">
                Estimated: {result.toLocaleString()} kg CO₂e / month
              </div>
              <p className="text-sm text-muted-foreground">
                {config.label} avg: {config.avg.toLocaleString()} kg CO₂e
              </p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, (result / config.avg) * 100)}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-muted-foreground">Predicted grade:</span>
                <GradeBadge score={score} size="sm" showLabel />
              </div>
              <div className="mt-3 text-sm text-primary font-semibold cursor-pointer hover:underline" onClick={() => {}}>
                Register to get your verified score →
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
