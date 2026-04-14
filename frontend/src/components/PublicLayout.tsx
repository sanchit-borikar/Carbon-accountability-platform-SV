import { Outlet, useNavigate } from "react-router-dom";
import { Globe, LogIn, UserPlus } from "lucide-react";

export default function PublicLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-slate-700 h-14 flex items-center px-4 lg:px-8 justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <Globe size={22} className="text-blue-400" />
          <span className="font-display font-extrabold text-lg text-blue-400">VayuDrishti</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 uppercase tracking-wider ml-2">Public Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">No login required</span>
          <button onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10">
            <LogIn size={14} /> Sign In
          </button>
          <button onClick={() => navigate("/register")} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg">
            <UserPlus size={14} /> Register
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-700 py-6 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-400">VayuDrishti Public Portal</span>
          </div>
          <p className="text-[11px] text-slate-500">Data Sources: OpenAQ + CPCB + NASA GEOS-CF + WAQI | Blockchain: Algorand Testnet | SDG 13 Climate Action</p>
        </div>
      </footer>
    </div>
  );
}
