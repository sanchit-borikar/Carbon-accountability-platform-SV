import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Globe, Home, Map, Building2, BarChart3, AlertTriangle, Factory, TrendingUp, Settings, LogOut, Bell, Search, Menu, X, Trophy, Scale, BrainCircuit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LiveTicker from "@/components/LiveTicker";
import { useAlerts } from "@/services/useVayuData";
import { toast } from "sonner";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: Home },
  { path: "/dashboard/map", label: "Live Map", icon: Map },
  { path: "/dashboard/profiles", label: "Profiles", icon: Building2 },
  { path: "/dashboard/data", label: "Data & Verify", icon: BarChart3 },
  { path: "/dashboard/rankings", label: "Rankings", icon: Trophy },
  { path: "/dashboard/penalties", label: "Penalties", icon: Scale },
  
  { path: "/dashboard/alerts", label: "Alerts & Reports", icon: AlertTriangle, regulatorOnly: true },
  { path: "/dashboard/company", label: "My Company", icon: Factory, companyOnly: true },
  { path: "/dashboard/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/dashboard/predictive", label: "Predictive Modeling", icon: BrainCircuit },
  { path: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { alerts } = useAlerts(user?.role || "public");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path + "/"));

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.regulatorOnly && user?.role !== "regulator") {
      toast.error("Regulator access only");
      return;
    }
    if (item.companyOnly && user?.role !== "company") return;
    navigate(item.path);
    setSidebarOpen(false);
  };

  const filteredItems = navItems.filter((n) => {
    if (n.companyOnly && user?.role !== "company") return false;
    return true;
  });

  const pendingAlerts = alerts.length;
  const initials = user?.orgName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "EC";
  const pageTitle = filteredItems.find((n) => isActive(n.path))?.label || "Dashboard";

  return (
    <div className="min-h-screen flex flex-col">
      <LiveTicker />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky top-9 z-30 h-[calc(100vh-36px)] w-[260px] bg-[#0f172a] flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          {/* Logo */}
          <div className="p-5 flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <span className="font-display font-extrabold text-lg text-[#60a5fa]">VayuDrishti</span>
          </div>

          {/* Role badge */}
          <div className="px-5 mb-2">
            {user?.role === "regulator" ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dbeafe] text-[#1e40af] uppercase tracking-wider">Regulator</span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] uppercase tracking-wider">Company Admin</span>
            )}
          </div>

          {/* Live status */}
          <div className="mx-4 p-3 rounded-lg bg-white/5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2563eb] shadow-[0_0_8px_#2563eb] animate-pulse-dot" />
              <span className="text-xs font-semibold text-[#e2e8f0]">LIVE</span>
              <span className="text-xs text-[#94a3b8]">Connected</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Updating every 5s</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              const locked = item.regulatorOnly && user?.role !== "regulator";
              return (
                <div
                  key={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${active ? "bg-[rgba(37,99,235,0.12)] border-l-[3px] border-[#2563eb] text-[#60a5fa] shadow-[inset_3px_0_0_#2563eb,4px_0_20px_rgba(37,99,235,0.1)]" : locked ? "text-[#94a3b8] opacity-50" : "text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[rgba(255,255,255,0.05)] hover:translate-x-1"}`}
                  onClick={() => handleNavClick(item)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.label === "Alerts & Reports" && user?.role === "regulator" && pendingAlerts > 0 && (
                    <span className="ml-auto text-[10px] font-bold bg-danger text-primary-foreground px-1.5 py-0.5 rounded-full">{pendingAlerts}</span>
                  )}
                  {locked && <span className="ml-auto text-xs">🔒</span>}
                </div>
              );
            })}
          </nav>

          {/* User bottom */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.orgName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-danger transition-colors" onClick={() => { logout(); navigate("/"); }}>
              <LogOut size={14} />
              <span>Log Out</span>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-foreground/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

        {/* Main */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header */}
          <header className="sticky top-9 z-10 bg-white border-b border-[#e2e8f0] h-16 flex items-center px-4 lg:px-6 gap-4">
            <div className="lg:hidden cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-display font-bold text-[#0f172a]">{pageTitle}</h2>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" className="pl-9 pr-3 py-2 bg-[#f1f5f9] border border-transparent rounded-lg text-sm outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all w-48" placeholder="Search companies..." />
              </div>
              {user?.role === "regulator" && (
                <div className="relative cursor-pointer group" onClick={() => navigate("/dashboard/alerts")}>
                  <Bell size={18} className={`text-[#64748b] group-hover:text-[#2563eb] group-hover:animate-wobble transition-colors ${pendingAlerts > 0 ? "animate-[wobblePeriodic_10s_ease-in-out_infinite]" : ""}`} />
                  {pendingAlerts > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-primary-foreground text-[9px] font-bold flex items-center justify-center">{pendingAlerts}</div>}
                </div>
              )}
              <div className="w-px h-6 bg-[#e2e8f0]" />
              <span className="text-xs text-[#64748b] hidden lg:block">{new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"}, {user?.orgName}</span>
              <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-xs font-bold text-white shadow-sm">{initials}</div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto" style={{ background: "hsl(var(--dash-bg))" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
