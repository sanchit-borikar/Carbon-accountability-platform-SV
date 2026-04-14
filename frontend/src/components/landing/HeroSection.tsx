import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

export default function HeroSection() {
  const navigate = useNavigate();

  const trustBadges = [
    "NASA GEOS-CF Verified",
    "Polygon Blockchain",
    "87% AI Accuracy",
    "SDG 13 Aligned",
  ];

  return (
    <section className="relative overflow-hidden py-16 lg:py-24" style={{ background: "linear-gradient(to bottom, hsl(221 100% 98%), white)" }}>
      {/* Radial gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(37,99,235,0.08) 0%, transparent 60%)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="animate-fade-up">
            <div className="text-xs font-medium text-muted-foreground mb-6">Home / Platform Overview</div>
            <h1 className="font-display font-extrabold text-[#0f172a] leading-tight text-[36px] md:text-[44px] lg:text-[72px]">
              Track. Verify.
            </h1>
            <h1 className="gradient-text font-display font-extrabold leading-tight text-[36px] md:text-[44px] lg:text-[72px]">
              Hold Polluters<br />Accountable.
            </h1>

            <p className="mt-6 text-base lg:text-lg text-dash-dim leading-relaxed max-w-[520px]">
              Real-time carbon emission tracking across Industry, Transport & Energy — cross-verified by satellite, IoT sensors, and blockchain-immutable records.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <div className="btn-primary-gradient px-6 py-3 text-sm font-semibold" onClick={() => navigate("/dashboard/map")}>View Live Emission Map →</div>
              <div className="btn-secondary-outline px-6 py-3 text-sm font-semibold" onClick={() => navigate("/register")}>Register Your Organization</div>
            </div>

            <div className="flex flex-wrap gap-4 mt-6">
              {trustBadges.map((b) => (
                <div key={b} className="flex items-center gap-1.5">
                  <Check size={14} className="text-[#2563eb]" />
                  <span className="text-xs text-[#64748b]">{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - floating card */}
          <div className="flex justify-center animate-float mt-12 lg:mt-0" style={{ animationDelay: "0.5s" }}>
            <div className="w-full max-w-[380px] rounded-2xl p-5 border border-primary-border" style={{ background: "linear-gradient(135deg, hsl(214 100% 97%), hsl(214 100% 93%))", boxShadow: "0 24px 64px rgba(37,99,235,0.18), 0 8px 24px rgba(37,99,235,0.12)" }}>
              {/* Mini header */}
              <div className="rounded-lg px-3 py-2 flex items-center justify-between mb-4 btn-primary-gradient" style={{ cursor: "default" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🌐</span>
                  <span className="text-xs font-bold text-primary-foreground">VayuDrishti</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                  <span className="text-[10px] text-primary-foreground/80">LIVE</span>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { n: "847", l: "Companies", color: "text-[#2563eb]" }, 
                  { n: "23", l: "Alerts", color: "text-[#dc2626]" }, 
                  { n: "92%", l: "Verified", color: "text-[#059669]" }
                ].map((s) => (
                  <div key={s.l} className="bg-card rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${s.color}`}>{s.n}</div>
                    <div className="text-[9px] text-[#64748b]">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Mini chart bars */}
              <div className="space-y-2 mb-4">
                <div className="text-[9px] text-[#64748b] font-medium">Sector Emissions</div>
                {[
                  { icon: "🏭", name: "Industry", pct: 67, color: "#2563eb" },
                  { icon: "🚗", name: "Transport", pct: 42, color: "#0891b2" },
                  { icon: "⚡", name: "Energy", pct: 58, color: "#7c3aed" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="text-[10px] w-16">{s.icon} {s.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color, animation: "progressFill 1s ease forwards" }} />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground w-6">{s.pct}%</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 mt-[10px]">
                {[
                  { dot: "bg-[#059669]", text: "SolarGen verified — A (92)" },
                  { dot: "bg-[#dc2626]", text: "CarbonHeavy flagged — 31.5%" },
                  { dot: "bg-[#7c3aed]", text: "15 records → Polygon" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 animate-fade-up border-b border-[#f0f0f0] pb-[3px]" style={{ animationDelay: `${i * 0.15}s` }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                    <span className="text-[9px] text-muted-foreground">{f.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 mt-3 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                <span className="text-[10px] text-primary font-medium">LIVE · Updating every 5s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
