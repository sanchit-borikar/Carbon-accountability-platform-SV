import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = ["Home", "About", "How It Works", "Carbon Data", "Contact"];

  return (
    <nav className={`sticky top-0 z-40 transition-all duration-300 border-b ${scrolled ? "glass-nav border-transparent" : "bg-card border-dash-border"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <span className="text-2xl">🌐</span>
          <span className="font-display font-extrabold text-lg text-[#1e3a8a]">VayuDrishti</span>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          {links.map((l) => (
            <span key={l} className="text-sm font-medium text-slate-600 hover:text-primary transition-all duration-200 cursor-pointer active:text-primary active:underline underline-offset-4">{l}</span>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <div className="btn-secondary-outline px-4 py-2 text-sm font-semibold" onClick={() => navigate("/login")}>Log In</div>
          <div className="btn-primary-gradient px-4 py-2 text-sm font-semibold" onClick={() => navigate("/register")}>Register Org</div>
        </div>

        <div className="lg:hidden cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-card border-t border-dash-border animate-fade-up">
          <div className="px-4 py-4 space-y-3">
            {links.map((l) => (
              <div key={l} className="text-sm font-medium text-dash-dim py-2 cursor-pointer hover:text-primary">{l}</div>
            ))}
            <div className="flex gap-3 pt-2">
              <div className="btn-secondary-outline px-4 py-2 text-sm font-semibold flex-1 text-center" onClick={() => { navigate("/login"); setMobileOpen(false); }}>Log In</div>
              <div className="btn-primary-gradient px-4 py-2 text-sm font-semibold flex-1 text-center" onClick={() => { navigate("/register"); setMobileOpen(false); }}>Register</div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
