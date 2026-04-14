import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Eye, EyeOff, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"company" | "regulator">("company");
  const [sector, setSector] = useState("Industry");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(59);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleContinue = () => {
    if (!orgName || !email || !password) return;
    setStep(2);
    // Start countdown
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    setOtpError("");
    if (val && idx < 5) {
      const next = document.getElementById(`otp-${idx + 1}`);
      next?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Please enter all 6 digits"); return; }
    setLoading(true);
    await register({ orgName, email, role, sector, password });
    setLoading(false);
    setStep(3);
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
            {[{ icon: "🛰️", text: "NASA GEOS-CF satellite verification" }, { icon: "🤖", text: "87% accurate AI emission forecasting" }, { icon: "🔗", text: "Polygon blockchain audit trail" }].map((b) => (
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
        <div className="w-full max-w-[480px] animate-fade-up">
          {/* Progress */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step > s ? "bg-success text-primary-foreground" : step === s ? "btn-primary-gradient" : "bg-muted text-muted-foreground"}`} style={{ cursor: "default" }}>
                  {step > s ? <Check size={14} /> : s}
                </div>
                <span className={`text-xs ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>{s === 1 ? "Details" : s === 2 ? "Verify" : "Done"}</span>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-success" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="text-2xl font-display font-bold text-foreground mb-1">Register Organization</h1>
              <p className="text-sm text-muted-foreground mb-6">Authorized organizations only. Domain verified.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Organization Name</label>
                  <input type="text" className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb]" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Official Email</label>
                  <input type="email" className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb]" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">Must be official org domain</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Organization Type</label>
                  <div className="flex gap-2">
                    {[{ key: "company" as const, icon: "🏭", label: "Company Admin" }, { key: "regulator" as const, icon: "⚖️", label: "Regulator" }].map((r) => (
                      <div key={r.key} className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all ${role === r.key ? "btn-primary-gradient" : "border border-input text-muted-foreground hover:border-primary"}`} style={role === r.key ? { cursor: "pointer" } : {}} onClick={() => setRole(r.key)}>
                        {r.icon} {r.label}
                      </div>
                    ))}
                  </div>
                </div>
                {role === "company" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Sector</label>
                    <div className="flex gap-2">
                      {["Industry", "Transport", "Energy"].map((s) => (
                        <div key={s} className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-all ${sector === s ? "btn-primary-gradient" : "btn-secondary-outline"}`} style={{ cursor: "pointer" }} onClick={() => setSector(s)}>{s}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb] pr-10" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground" onClick={() => setShowPw(!showPw)}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                  <div className="relative">
                    <input type="password" className="w-full px-3 py-2.5 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563eb] pr-10" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                    {confirmPw && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {password === confirmPw ? <Check size={16} className="text-success" /> : <span className="text-xs text-danger">✗</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg border border-warning bg-warning-light text-xs text-foreground">
                ⚠️ Only whitelisted organization domains are authorized. Unrecognized domains will be rejected.
              </div>

              <div className="btn-primary-gradient w-full py-3 text-center text-sm font-semibold mt-6" onClick={handleContinue}>Continue →</div>

              <div className="text-center mt-4">
                <span className="text-sm text-muted-foreground">Already have account? </span>
                <span className="text-sm text-primary cursor-pointer hover:underline font-semibold" onClick={() => navigate("/login")}>Log In →</span>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <h2 className="text-xl font-display font-bold text-foreground mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-8">We sent a 6-digit code to <span className="text-primary font-medium">{email}</span></p>

              <div className="flex justify-center gap-3 mb-4">
                {otp.map((v, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    maxLength={1}
                    className={`w-12 h-14 text-center text-lg font-bold border rounded-lg outline-none transition-all ${v ? "border-primary bg-primary-light-bg" : "border-input"} ${otpError ? "border-danger animate-shake" : ""} focus:ring-2 focus:ring-primary/20`}
                    value={v}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                  />
                ))}
              </div>

              {otpError && <p className="text-sm text-danger mb-4">❌ {otpError}</p>}

              <div className="btn-primary-gradient w-full py-3 text-center text-sm font-semibold" onClick={handleVerify}>
                {loading ? "Verifying..." : "Verify OTP"}
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : <span className="text-primary cursor-pointer hover:underline">Resend OTP</span>}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center animate-fade-up">
              <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-primary-foreground" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground mb-2">You're In! 🎉</h2>
              <p className="text-sm text-muted-foreground mb-6">Account created. Pending verification.</p>
              <div className="btn-primary-gradient w-full py-3 text-center text-sm font-semibold" onClick={() => navigate("/dashboard")}>Go to Dashboard →</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
