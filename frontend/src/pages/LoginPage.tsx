import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    await login(email, password);
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden items-center justify-center" style={{ background: "linear-gradient(160deg, #1e3a8a, #2563eb)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)" }} />
        <div className="relative text-center px-10">
          <Globe size={48} className="text-primary-foreground mx-auto mb-4 animate-float" />
          <h2 className="text-2xl font-display font-extrabold text-primary-foreground mb-2">VayuDrishti</h2>
          <p className="text-primary-border text-sm mb-8">Join the Accountability Movement</p>
          <div className="space-y-4 text-left">
            {[
              { icon: "🛰️", text: "NASA GEOS-CF satellite verification" },
              { icon: "🤖", text: "87% accurate AI emission forecasting" },
              { icon: "🔗", text: "Polygon blockchain audit trail" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center text-lg">{b.icon}</div>
                <span className="text-sm text-primary-foreground/90">{b.text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-primary-border/70 mt-10">847 Organizations · 3 Sectors · 100% Verified</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[420px] animate-fade-up">
          <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
          <h1 className="text-2xl font-display font-bold text-foreground mb-8">Log In to VayuDrishti</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
              <input type="email" className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb]" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb] pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
              </div>
            </div>
          </div>

          <div className="btn-primary-gradient w-full py-3 text-center text-sm font-semibold mt-6" onClick={handleLogin}>
            {loading ? "Logging in..." : "Log In"}
          </div>

          <div className="text-center mt-4">
            <span className="text-sm text-primary cursor-pointer hover:underline">Forgot Password?</span>
          </div>

          <div className="text-center mt-4">
            <span className="text-sm text-muted-foreground">New organization? </span>
            <span className="text-sm text-primary cursor-pointer hover:underline font-semibold" onClick={() => navigate("/register")}>Register →</span>
          </div>

          <div className="mt-6 p-3 rounded-lg bg-primary-light-bg border border-primary-border text-xs text-muted-foreground">
            💡 Demo: use <span className="font-mono text-primary">'regulator@test.com'</span> for Regulator view, or <span className="font-mono text-primary">'company@test.com'</span> for Company view. Any password works.
          </div>
        </div>
      </div>
    </div>
  );
}
