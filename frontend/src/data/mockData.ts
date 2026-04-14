export interface Company {
  id: number;
  name: string;
  sector: string;
  score: number;
  grade: string;
  location: string;
  emissions: number;
  trend: "up" | "down" | "stable";
  trendPct: number;
  lat: number;
  lng: number;
  flagged: boolean;
  iot: number;
  satellite: number;
  openaq: number;
  discrepancy: number;
  status: string;
  lastVerified: string;
  submissions: number;
  scores: {
    volume: number;
    trend: number;
    integrity: number;
    consistency: number;
    violations: number;
  };
}

export interface Alert {
  id: number;
  company: string;
  sector: string;
  type: string;
  discrepancy: number;
  iot: number;
  satellite: number;
  time: string;
  severity: "critical" | "high" | "medium";
  hash: string;
  status: string;
}

export interface BlockchainRecord {
  id: number;
  company: string;
  hash: string;
  ipfs: string;
  timestamp: string;
  status: string;
  tx: string;
}

export interface LiveFeedItem {
  id: string;
  time: string;
  text: string;
  type: "verified" | "flagged" | "blockchain" | "score_change";
  company: string;
}

export const companies: Company[] = [
  { id:1, name:"SteelCore Industries", sector:"Industry", score:23, grade:"F", location:"Mumbai, MH", emissions:45200, trend:"up", trendPct:8.3, lat:18.96, lng:72.82, flagged:true, iot:45200, satellite:38100, openaq:41200, discrepancy:18.6, status:"flagged", lastVerified:"2 hours ago", submissions:18, scores:{ volume:4, trend:3, integrity:5, consistency:6, violations:5 } },
  { id:2, name:"GreenMove Transport", sector:"Transport", score:88, grade:"A", location:"Mumbai, MH", emissions:1200, trend:"down", trendPct:4.1, lat:19.07, lng:72.87, flagged:false, iot:1200, satellite:1180, openaq:1195, discrepancy:1.7, status:"verified", lastVerified:"5 min ago", submissions:30, scores:{ volume:23, trend:18, integrity:24, consistency:14, violations:14 } },
  { id:3, name:"PowerGrid East", sector:"Energy", score:61, grade:"C", location:"Delhi, DL", emissions:18900, trend:"stable", trendPct:0.2, lat:28.63, lng:77.21, flagged:false, iot:18900, satellite:17200, openaq:18200, discrepancy:9.9, status:"verified", lastVerified:"1 hour ago", submissions:27, scores:{ volume:14, trend:12, integrity:16, consistency:11, violations:8 } },
  { id:4, name:"CarbonHeavy Mfg", sector:"Industry", score:12, grade:"F", location:"Kolkata, WB", emissions:89000, trend:"up", trendPct:14.2, lat:22.57, lng:88.36, flagged:true, iot:89000, satellite:61000, openaq:58000, discrepancy:31.5, status:"flagged", lastVerified:"3 hours ago", submissions:11, scores:{ volume:2, trend:1, integrity:2, consistency:4, violations:3 } },
  { id:5, name:"EcoFreight Ltd", sector:"Transport", score:74, grade:"B", location:"Bengaluru, KA", emissions:3400, trend:"down", trendPct:6.8, lat:12.97, lng:77.59, flagged:false, iot:3400, satellite:3280, openaq:3310, discrepancy:3.5, status:"verified", lastVerified:"8 min ago", submissions:29, scores:{ volume:18, trend:16, integrity:22, consistency:13, violations:13 } },
  { id:6, name:"SolarGen Corp", sector:"Energy", score:92, grade:"A", location:"Ahmedabad, GJ", emissions:420, trend:"down", trendPct:11.3, lat:23.02, lng:72.57, flagged:false, iot:420, satellite:415, openaq:418, discrepancy:1.2, status:"verified", lastVerified:"3 min ago", submissions:30, scores:{ volume:24, trend:19, integrity:25, consistency:15, violations:15 } },
  { id:7, name:"ChemWorks Inc", sector:"Industry", score:38, grade:"D", location:"Hyderabad, TS", emissions:32000, trend:"up", trendPct:5.7, lat:17.38, lng:78.48, flagged:true, iot:32000, satellite:24500, openaq:25800, discrepancy:23.4, status:"flagged", lastVerified:"4 hours ago", submissions:20, scores:{ volume:8, trend:6, integrity:9, consistency:8, violations:7 } },
  { id:8, name:"MetroTransit", sector:"Transport", score:55, grade:"C", location:"Chennai, TN", emissions:7800, trend:"stable", trendPct:0.8, lat:13.08, lng:80.27, flagged:false, iot:7800, satellite:7650, openaq:7720, discrepancy:1.9, status:"verified", lastVerified:"15 min ago", submissions:25, scores:{ volume:13, trend:11, integrity:14, consistency:10, violations:10 } },
];

export const alerts: Alert[] = [
  { id:1, company:"CarbonHeavy Mfg", sector:"Industry", type:"Discrepancy >20%", discrepancy:31.5, iot:89000, satellite:61000, time:"2 min ago", severity:"critical", hash:"a3f9c2b1d8e4f7a2b1c9d3e8f2a4b7c1d9e3f8a2", status:"pending" },
  { id:2, company:"ChemWorks Inc", sector:"Industry", type:"Discrepancy >20%", discrepancy:23.4, iot:32000, satellite:24500, time:"47 min ago", severity:"high", hash:"b7c2d9e4f1a8b3c7d2e9f4a1b8c3d7e2f9a4b1c8", status:"pending" },
  { id:3, company:"SteelCore Industries", sector:"Industry", type:"Emission Spike", discrepancy:18.6, iot:45200, satellite:38100, time:"2 hours ago", severity:"medium", hash:"c1d8e3f9a2b7c4d1e8f3a9b2c7d4e1f8a3b9c2d7", status:"warning_sent" },
];

export const blockchainRecords: BlockchainRecord[] = [
  { id:1, company:"SolarGen Corp", hash:"d4e9f2a7b1c8d3e7f4a2b9c1d8e4f7a3b2c9d1e8", ipfs:"QmX8f2kL9mNpR4sT7vW3yA1bC6dE0fH5jK8lM2nP9qR", timestamp:"2026-03-07 19:42:11", status:"confirmed", tx:"0x7f3a2b9c1d8e4f6a3b2c7d9e1f4a8b3c2d7e9f1a" },
  { id:2, company:"GreenMove Transport", hash:"e1f8a3b2c9d4e7f2a1b8c3d9e4f7a2b1c8d3e9f4", ipfs:"QmY9g3lM0nOqS5tU8wX4zA2bD7eF1gI6jL9mN3oQ0r", timestamp:"2026-03-07 19:38:44", status:"confirmed", tx:"0x8a4b3c0d9e5f7a4b3c8d0e2f5a9b4c3d8e0f2a5b" },
  { id:3, company:"EcoFreight Ltd", hash:"f2a9b4c1d8e3f7a2b9c4d1e8f3a7b2c9d4e1f8a3", ipfs:"QmZ0h4mN1oPs6uV9xY5aB3cE8fG2hJ7kM0nO4pR1s", timestamp:"2026-03-07 19:35:02", status:"confirmed", tx:"0x9b5c4d1e0f6a5b4c9d1e3f6b0c5d4e9f1a3b6c0d" },
];

// Generate 90-day daily emission data
export function generateDailyData(baseEmission: number, trend: string): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const now = new Date(2026, 2, 7);
  let val = baseEmission;
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const variance = (Math.random() - 0.5) * 0.15 * baseEmission;
    const trendFactor = trend === "up" ? 0.001 * (90 - i) : trend === "down" ? -0.001 * (90 - i) : 0;
    val = baseEmission * (1 + trendFactor) + variance;
    data.push({ date: d.toISOString().split("T")[0], value: Math.round(Math.max(0, val)) });
  }
  return data;
}

// Generate 24-hour hourly data
export function generateHourlyData(): { hour: string; industry: number; transport: number; energy: number }[] {
  const data: { hour: string; industry: number; transport: number; energy: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const h = i.toString().padStart(2, "0") + ":00";
    data.push({
      hour: h,
      industry: Math.round(15000 + Math.random() * 10000),
      transport: Math.round(3000 + Math.random() * 5000),
      energy: Math.round(5000 + Math.random() * 8000),
    });
  }
  return data;
}

// Generate forecast data (30 days ahead)
export function generateForecastData(baseEmission: number, trend: string): { date: string; value: number }[] {
  const data: { date: string; value: number }[] = [];
  const now = new Date(2026, 2, 7);
  let val = baseEmission;
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const trendFactor = trend === "down" ? -0.003 * i : trend === "up" ? 0.002 * i : 0;
    val = baseEmission * (1 + trendFactor) + (Math.random() - 0.5) * 0.1 * baseEmission;
    data.push({ date: d.toISOString().split("T")[0], value: Math.round(Math.max(0, val)) });
  }
  return data;
}

export function getGradeColor(grade: string): string {
  switch (grade) {
    case "A": return "#059669";
    case "B": return "#0891b2";
    case "C": return "#d97706";
    case "D": return "#ea580c";
    case "F": return "#dc2626";
    default: return "#94a3b8";
  }
}

export function getGradeLabel(grade: string): string {
  switch (grade) {
    case "A": return "Exemplary";
    case "B": return "Compliant";
    case "C": return "Warning";
    case "D": return "Non-Compliant";
    case "F": return "Critical Violator";
    default: return "Unknown";
  }
}

export function getGradeFromScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export const sectorEmissionMonthly = [
  { month: "Oct", verified: 120, flagged: 8, discrepancyRate: 6.7 },
  { month: "Nov", verified: 134, flagged: 12, discrepancyRate: 8.9 },
  { month: "Dec", verified: 145, flagged: 15, discrepancyRate: 10.3 },
  { month: "Jan", verified: 158, flagged: 10, discrepancyRate: 6.3 },
  { month: "Feb", verified: 167, flagged: 18, discrepancyRate: 10.8 },
  { month: "Mar", verified: 172, flagged: 23, discrepancyRate: 13.4 },
];

export const gradeDistribution = [
  { grade: "A", count: 142, color: "#059669" },
  { grade: "B", count: 231, color: "#0891b2" },
  { grade: "C", count: 287, color: "#d97706" },
  { grade: "D", count: 124, color: "#ea580c" },
  { grade: "F", count: 63, color: "#dc2626" },
];
