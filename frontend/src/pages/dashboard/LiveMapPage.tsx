import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, ZoomControl } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { useMapData } from "@/services/useVayuData";
import { getGradeColor, getGradeFromScore, scoreToColor } from "@/services/api";
import GradeBadge from "@/components/GradeBadge";
import StatusBadge from "@/components/StatusBadge";
import SectorIcon from "@/components/SectorIcon";
import TrendArrow from "@/components/TrendArrow";
import "leaflet/dist/leaflet.css";

/* ─── dynamic heatmap glow based on score ─── */
function getGlow(score: number, co2e: number) {
  const color = score < 40 ? "#dc2626" : score < 60 ? "#d97706" : score < 75 ? "#0891b2" : "#059669";
  const scale = Math.min(1, co2e / 10000);
  return {
    outerRadius: Math.round(20 + scale * 60),
    innerRadius: Math.round(10 + scale * 40),
    color,
    outerOpacity: 0.12 + (1 - score / 100) * 0.08,
    innerOpacity: 0.18 + (1 - score / 100) * 0.12,
  };
}

/* px → meters approximation at India latitudes (~zoom 5) */
const PX_TO_M = 2500;

type LayerMode = "markers" | "heatmap" | "both";
type DataFilter = "all" | "verified" | "self-reported";

export default function LiveMapPage() {
  const { markers: companies, loading: mapLoading, lastUpdate: mapLastUpdate } = useMapData();
  const navigate = useNavigate();
  const [sectorFilter, setSectorFilter] = useState("All");
  const [layerMode, setLayerMode] = useState<LayerMode>("both");
  const [dataFilter, setDataFilter] = useState<DataFilter>("all");
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setLastUpdate((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setLastUpdate(0); }, [companies]);

  /* ─── filtering ─── */
  let filtered = sectorFilter === "All" ? companies : companies.filter((c: any) => c.sector.toLowerCase().includes(sectorFilter.toLowerCase()));
  if (dataFilter === "verified") filtered = filtered.filter((c: any) => c.status === "verified");
  else if (dataFilter === "self-reported") filtered = filtered.filter((c: any) => c.status === "flagged");

  const topPolluters = [...companies].sort((a: any, b: any) => b.emissions - a.emissions).slice(0, 5);
  const mostImproved = [...companies].filter((c: any) => c.trend === "down").sort((a: any, b: any) => b.trendPct - a.trendPct).slice(0, 5);
  const flaggedCompanies = companies.filter((c: any) => c.status === "flagged");
  const verifiedCount = companies.filter((c: any) => c.status === "verified").length;

  const showMarkers = layerMode === "markers" || layerMode === "both";
  const showHeatmap = layerMode === "heatmap" || layerMode === "both";
  const heatmapOnly = layerMode === "heatmap";

  /* ─── helpers ─── */
  const discColor = (d: number) => d > 20 ? "#dc2626" : d >= 10 ? "#d97706" : "#059669";
  const sectorEmoji = (sector: string) => sector.toLowerCase().includes("industr") ? "🏭" : sector === "Transport" ? "🚗" : "⚡";

  /* ─── segmented control helper ─── */
  const Seg = ({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) => (
    <div className="flex bg-[#f1f5f9] rounded-lg p-0.5">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${value === o.key ? "bg-white text-[#1e3a8a] shadow-sm" : "text-[#64748b] hover:text-[#334155]"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-0 -m-4 lg:-m-6 h-[calc(100vh-136px)]">
      {/* Map area */}
      <div className="flex-1 flex flex-col">
        {/* Controls */}
        <div className="bg-card border-b border-dash-border px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: sector pills + layer toggle + data toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sector pills */}
            <div className="flex gap-1.5">
              {["All", "Industrial", "Transport", "Energy"].map((s) => (
                <div key={s} className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${sectorFilter === s ? "btn-primary-gradient" : "btn-secondary-outline"}`} onClick={() => setSectorFilter(s)}>
                  {s === "Industrial" ? "🏭 " : s === "Transport" ? "🚗 " : s === "Energy" ? "⚡ " : ""}{s}
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-[#e2e8f0]" />

            {/* Layer toggle */}
            <Seg value={layerMode} onChange={(k) => setLayerMode(k as LayerMode)}
              options={[{ key: "markers", label: "📍 Markers" }, { key: "heatmap", label: "🌡️ Heatmap" }, { key: "both", label: "⊕ Both" }]} />

            {/* Divider */}
            <div className="w-px h-6 bg-[#e2e8f0]" />

            {/* Data filter */}
            <Seg value={dataFilter} onChange={(k) => setDataFilter(k as DataFilter)}
              options={[{ key: "all", label: "✓ All Data" }, { key: "verified", label: "🛰️ Verified Only" }, { key: "self-reported", label: "📋 Self-Reported" }]} />
          </div>

          {/* Right: live indicator + filtered count */}
          <div className="flex items-center gap-3">
            {dataFilter !== "all" && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{
                background: dataFilter === "verified" ? "#eff6ff" : "#fff7ed",
                color: dataFilter === "verified" ? "#1e40af" : "#c2410c",
              }}>
                {filtered.length} {dataFilter === "verified" ? "verified" : "unverified"} companies
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-dot" />
              <span className="text-xs text-muted-foreground">Live · {lastUpdate}s ago</span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer center={[20.5, 78.9]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true} zoomControl={false}>
            <ZoomControl position="bottomright" />
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />

            {filtered.map((c: any) => {
              const glow = getGlow(c.score, c.emissions);
              const gradeColor = getGradeColor(c.grade);
              const isFlagged = c.status === "flagged";

              return (
                <span key={c.id}>
                  {/* ─── Heatmap glow circles ─── */}
                  {showHeatmap && (
                    <>
                      {/* Outer glow */}
                      <Circle
                        center={[c.lat, c.lng]}
                        radius={(heatmapOnly ? glow.outerRadius * 1.5 : glow.outerRadius) * PX_TO_M}
                        pathOptions={{
                          fillColor: glow.color,
                          fillOpacity: heatmapOnly ? 0.35 : glow.outerOpacity,
                          color: glow.color,
                          weight: 0,
                          opacity: 0,
                          className: isFlagged ? "flagged-glow-pulse" : undefined,
                        }}
                      />
                      {/* Inner glow */}
                      <Circle
                        center={[c.lat, c.lng]}
                        radius={(heatmapOnly ? glow.innerRadius * 1.5 : glow.innerRadius) * PX_TO_M}
                        pathOptions={{
                          fillColor: glow.color,
                          fillOpacity: heatmapOnly ? 0.35 : glow.innerOpacity,
                          color: glow.color,
                          weight: 0,
                          opacity: 0,
                        }}
                      />
                    </>
                  )}

                  {/* ─── Main marker ─── */}
                  {showMarkers && (
                    <CircleMarker
                      center={[c.lat, c.lng]}
                      radius={Math.max(8, Math.log(c.emissions) * 3)}
                      fillColor={gradeColor}
                      color={dataFilter === "verified" ? "#2563eb" : dataFilter === "self-reported" ? "#ea580c" : gradeColor}
                      fillOpacity={0.7}
                      weight={dataFilter !== "all" ? 2 : 1}
                      dashArray={dataFilter === "self-reported" ? "4 3" : undefined}
                    >
                      <Popup>
                        {/* ─── Premium Popup Card ─── */}
                        <div style={{ width: 280, padding: 0, overflow: "hidden" }}>
                          {/* Header */}
                          <div style={{
                            background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                            padding: "12px 16px",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14 }}>{sectorEmoji(c.sector)}</span>
                              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                            </div>
                            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>{c.location}</span>
                          </div>

                          {/* Body */}
                          <div style={{ padding: 16 }}>
                            {/* Score row */}
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>Compliance Score</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <span style={{ fontSize: 24, fontWeight: 700, color: getGradeColor(c.grade) }}>{c.score}</span>
                              <GradeBadge score={c.score} size="sm" />
                            </div>

                            {/* Progress bar */}
                            <div style={{ width: "100%", height: 6, borderRadius: 4, background: "#f1f5f9", marginBottom: 12 }}>
                              <div style={{
                                width: `${c.score}%`, height: "100%", borderRadius: 4,
                                background: getGradeColor(c.grade),
                                animation: "progressBarFill 0.8s ease-out",
                              }} />
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: "#f1f5f9", margin: "12px 0" }} />

                            {/* Data rows */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>� CO2e Emissions</span>
                                <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 500 }}>{c.emissions?.toLocaleString()} μg/m³</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>🏭 Sector</span>
                                <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 500 }}>{c.sector}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b" }}>⚠ WHO Violations</span>
                                <span style={{
                                  fontFamily: "JetBrains Mono, monospace",
                                  fontWeight: 700,
                                  color: c.flagged ? "#dc2626" : "#059669",
                                }}>{c.violations || 0}</span>
                              </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: "#f1f5f9", margin: "12px 0" }} />

                            {/* Status row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                              <StatusBadge status={c.status} />
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>{c.lastVerified}</span>
                            </div>

                            {/* Footer button */}
                            <button
                              onClick={() => navigate(`/dashboard/profiles/${c.id}`)}
                              style={{
                                width: "100%", height: 36, border: "none", borderRadius: 8,
                                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                                color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                              View Full Profile →
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )}
                </span>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-4 py-3 z-[1000] border border-dash-border" style={{ maxWidth: 260 }}>
            <div className="flex items-center gap-4 mb-2">
              {[{ g: "A", c: "#059669" }, { g: "B", c: "#0891b2" }, { g: "C", c: "#d97706" }, { g: "D", c: "#ea580c" }, { g: "F", c: "#dc2626" }].map((l) => (
                <div key={l.g} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.c }} />
                  <span className="text-[10px] font-semibold">{l.g}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", lineHeight: 1.6 }}>
              ● Pulsing red = Flagged today<br />
              ◯ Circle size = Emission volume
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Right Panel ═══ */}
      <div className="hidden lg:block w-80 bg-card border-l border-dash-border overflow-y-auto p-4 space-y-5">
        {/* Top Polluters */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">Top Polluters</h3>
          <div className="space-y-2">
            {topPolluters.map((c: any, i: number) => (
              <div key={c.id} className="card-dashboard p-3 cursor-pointer" onClick={() => navigate(`/dashboard/profiles/${c.id}`)}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary w-4">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-1">
                      <SectorIcon sector={c.sector} size={12} />
                      <span className="text-[10px] text-muted-foreground">{c.emissions.toLocaleString()} kg</span>
                    </div>
                  </div>
                  <GradeBadge score={c.score} size="sm" />
                </div>
                <TrendArrow trend={c.trend} pct={c.trendPct} />
              </div>
            ))}
          </div>
        </div>

        {/* Most Improved Today */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">Most Improved Today</h3>
          <div className="space-y-2">
            {mostImproved.map((c: any) => (
              <div key={c.id} className="card-dashboard p-3 cursor-pointer" onClick={() => navigate(`/dashboard/profiles/${c.id}`)}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                  </div>
                  <TrendArrow trend={c.trend} pct={c.trendPct} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live Alerts Strip ── */}
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: 12,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
            ⚠ {flaggedCompanies.length} Active Flag{flaggedCompanies.length !== 1 ? "s" : ""} Today
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {flaggedCompanies.map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span>{c.discrepancy > 20 ? "🔴" : "🟠"}</span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{c.name}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700, color: "#dc2626", fontFamily: "JetBrains Mono, monospace" }}>{c.discrepancy}%</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/dashboard/alerts")}
            style={{
              marginTop: 10, background: "none", border: "none",
              color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0,
            }}
          >
            View All Alerts →
          </button>
        </div>

        {/* ── Quick Stats Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { value: String(companies.length), label: "Companies", color: "#2563eb" },
            { value: String(flaggedCompanies.length), label: "Flagged", color: "#dc2626" },
            { value: companies.length > 0 ? `${((verifiedCount / companies.length) * 100).toFixed(1)}%` : "0%", label: "Verified", color: "#059669" },
            { value: String(verifiedCount), label: "On-Chain", color: "#7c3aed" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: 14, textAlign: "center",
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
