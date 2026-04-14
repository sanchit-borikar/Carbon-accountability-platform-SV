import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import ScoreRing from "@/components/ScoreRing";
import GradeBadge from "@/components/GradeBadge";

export default function ForSections() {
  const navigate = useNavigate();

  const regulatorChecks = [
    "Live discrepancy alerts with SHA-256 audit hashes",
    "One-click PDF compliance reports (A/B/C/D/F)",
    "Send warning notices directly to companies",
    "Full immutable Polygon blockchain audit trail",
    "AI-powered violation history scoring",
  ];

  const companyChecks = [
    "Submit verified emission data with IoT support",
    "View your 0-100 daily compliance score",
    "AI forecasts 30/60/90 days ahead",
    "Respond directly to regulator notices",
    "Blockchain-verified submission history",
  ];

  return (
    <>
      {/* For Regulators */}
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl p-10 relative overflow-hidden" style={{ background: "linear-gradient(160deg, #1e3a8a, #2563eb, #0891b2)" }}>
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)" }} />
              <div className="relative">
                <span className="text-5xl mb-4 block">⚖️</span>
                <h3 className="text-2xl font-display font-bold text-primary-foreground">Powerful Regulator Tools</h3>
              </div>
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-4">Take Real Enforcement Action</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Move beyond self-reported data. VayuDrishti gives regulators live discrepancy alerts, blockchain-verified audit trails, and one-click PDF compliance reports.
              </p>
              <div className="space-y-3 mb-6">
                {regulatorChecks.map((c) => (
                  <div key={c} className="flex items-start gap-2">
                    <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{c}</span>
                  </div>
                ))}
              </div>
              <div className="btn-primary-gradient inline-block px-6 py-3 text-sm font-semibold" onClick={() => navigate("/register")}>Get Regulator Access →</div>
            </div>
          </div>
        </div>
      </section>

      {/* For Companies */}
      <section className="py-20" style={{ background: "#f0f7ff" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-4">Manage Your Compliance Score</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Track your 0-100 daily score, submit verified emission reports, and stay ahead of regulatory enforcement with AI-powered trend forecasts.
              </p>
              <div className="space-y-3 mb-6">
                {companyChecks.map((c) => (
                  <div key={c} className="flex items-start gap-2">
                    <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{c}</span>
                  </div>
                ))}
              </div>
              <div className="btn-secondary-outline inline-block px-6 py-3 text-sm font-semibold" onClick={() => navigate("/register")}>Register Your Company →</div>
            </div>
            {/* Mock company card */}
            <div className="card-dashboard p-6 max-w-sm mx-auto">
              <h4 className="text-sm font-semibold text-muted-foreground mb-4">My Compliance Score</h4>
              <div className="flex items-center justify-center mb-4">
                <ScoreRing score={74} size={120} />
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <GradeBadge score={74} size="md" showLabel />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Emission Volume", w: 72 },
                  { label: "Trend", w: 80 },
                  { label: "Data Integrity", w: 88 },
                  { label: "Consistency", w: 86 },
                  { label: "Violations", w: 86 },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${b.w}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">EcoFreight Ltd · Transport</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
