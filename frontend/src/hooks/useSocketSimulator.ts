import { useState, useEffect, useRef, useCallback } from "react";
import { companies as initialCompanies, alerts as initialAlerts, blockchainRecords as initialRecords, getGradeFromScore, type Company, type Alert, type BlockchainRecord, type LiveFeedItem } from "@/data/mockData";

let feedId = 0;

export function useSocketSimulator() {
  const [companies, setCompanies] = useState<Company[]>([...initialCompanies]);
  const [alerts, setAlerts] = useState<Alert[]>([...initialAlerts]);
  const [blockchainRecords, setBlockchainRecords] = useState<BlockchainRecord[]>([...initialRecords]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const randomHash = () => {
    const chars = "0123456789abcdef";
    return Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * 16)]).join("");
  };

  const tick = useCallback(() => {
    setCompanies((prev) => {
      const idx = Math.floor(Math.random() * prev.length);
      const updated = [...prev];
      const c = { ...updated[idx] };
      const change = 1 + (Math.random() * 0.06 - 0.03);
      c.emissions = Math.round(c.emissions * change);
      c.iot = c.emissions;
      c.satellite = Math.round(c.emissions * (0.85 + Math.random() * 0.15));
      c.openaq = Math.round(c.emissions * (0.88 + Math.random() * 0.12));
      c.discrepancy = Math.round(Math.abs(c.iot - c.satellite) / c.iot * 100 * 10) / 10;
      c.score = Math.max(0, Math.min(100, c.score + Math.floor(Math.random() * 5 - 2)));
      c.grade = getGradeFromScore(c.score);
      c.flagged = c.discrepancy > 20;
      c.status = c.flagged ? "flagged" : "verified";
      updated[idx] = c;

      const newFeedItems: LiveFeedItem[] = [];
      feedId++;
      if (c.flagged) {
        newFeedItems.push({ id: `f-${feedId}`, time: "just now", text: `${c.name} flagged — ${c.discrepancy}% discrepancy`, type: "flagged", company: c.name });
      } else {
        newFeedItems.push({ id: `f-${feedId}`, time: "just now", text: `${c.name} verified — Score: ${c.score} (${c.grade})`, type: "verified", company: c.name });
      }

      if (Math.random() < 0.05) {
        feedId++;
        const hash = randomHash();
        newFeedItems.push({ id: `f-${feedId}`, time: "just now", text: `${Math.floor(Math.random() * 20 + 5)} records written to Polygon`, type: "blockchain", company: c.name });
        setBlockchainRecords((r) => [{ id: Date.now(), company: c.name, hash, ipfs: "Qm" + randomHash().slice(0, 40), timestamp: new Date().toISOString().replace("T", " ").slice(0, 19), status: "confirmed", tx: "0x" + randomHash() }, ...r].slice(0, 50));
      }

      if (Math.random() < 0.02 && c.discrepancy > 15) {
        setAlerts((a) => [{ id: Date.now(), company: c.name, sector: c.sector, type: "Discrepancy >20%", discrepancy: c.discrepancy, iot: c.iot, satellite: c.satellite, time: "just now", severity: (c.discrepancy > 25 ? "critical" : "high") as "critical" | "high", hash: randomHash(), status: "pending" }, ...a].slice(0, 50));
      }

      setLiveFeed((f) => [...newFeedItems, ...f].slice(0, 50));
      return updated;
    });
  }, []);

  useEffect(() => {
    // Seed initial feed
    const seed: LiveFeedItem[] = [
      { id: "s1", time: "2m ago", text: "SolarGen Corp verified — Score: 92 (A)", type: "verified", company: "SolarGen Corp" },
      { id: "s2", time: "5m ago", text: "CarbonHeavy Mfg flagged — 31.5% discrepancy", type: "flagged", company: "CarbonHeavy Mfg" },
      { id: "s3", time: "12m ago", text: "PowerGrid East submitted report", type: "verified", company: "PowerGrid East" },
      { id: "s4", time: "18m ago", text: "15 records written to Polygon", type: "blockchain", company: "" },
      { id: "s5", time: "25m ago", text: "GreenMove Transport verified — Score: 88 (A)", type: "verified", company: "GreenMove Transport" },
      { id: "s6", time: "32m ago", text: "EcoFreight Ltd score improved to 74", type: "score_change", company: "EcoFreight Ltd" },
    ];
    setLiveFeed(seed);
    intervalRef.current = setInterval(tick, 4000);
    return () => clearInterval(intervalRef.current);
  }, [tick]);

  return { companies, alerts, liveFeed, blockchainRecords, connected: true as const };
}
