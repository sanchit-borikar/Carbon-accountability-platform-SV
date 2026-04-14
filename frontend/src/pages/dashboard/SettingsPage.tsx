import { useAuth } from "@/contexts/AuthContext";
import { Check, Globe, Bell, Shield, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <h1 className="text-xl font-display font-bold text-foreground">Settings</h1>

      <div className="card-dashboard p-6">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><Globe size={18} className="text-primary" /> Organization Profile</h2>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Organization Name</label><input type="text" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" defaultValue={user?.orgName} /></div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Email</label><input type="email" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none" defaultValue={user?.email} /></div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1">Role</label><input type="text" className="w-full px-3 py-2 border border-input rounded-lg text-sm outline-none bg-muted" value={user?.role || ""} readOnly /></div>
        </div>
      </div>

      <div className="card-dashboard p-6">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><Bell size={18} className="text-primary" /> Notifications</h2>
        <div className="space-y-3">
          {["Email alerts for flagged companies", "Live ticker notifications", "Weekly compliance digest"].map((n) => (
            <div key={n} className="flex items-center justify-between py-2 border-b border-dash-border">
              <span className="text-sm text-foreground">{n}</span>
              <div className="w-10 h-5 bg-primary rounded-full flex items-center px-0.5 cursor-pointer"><div className="w-4 h-4 bg-primary-foreground rounded-full ml-auto" /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="btn-primary-gradient inline-block px-6 py-2.5 text-sm font-semibold">Save Changes</div>
    </div>
  );
}
