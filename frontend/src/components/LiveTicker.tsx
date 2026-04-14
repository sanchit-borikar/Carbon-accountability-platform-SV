import { useLiveFeed } from "@/services/useVayuData";

export default function LiveTicker() {
  const { feed } = useLiveFeed();

  const getDot = (status: string) => {
    if (status === "FLAGGED") return "🔴";
    return "🔵";
  };

  const tickerItems = feed.length > 0
    ? feed.slice(0, 15).map((f: any) => `${getDot(f.status)} ${f.entity} ${f.sector} — ${f.value} CO₂e — ${f.status}`)
    : [
        "🔵 Connecting to live data feed...",
        "🔵 Waiting for emission readings...",
      ];

  const tickerText = tickerItems.join(" · ");
  const doubled = tickerText + " · " + tickerText;

  return (
    <div className="ticker-bg text-primary-foreground h-9 flex items-center overflow-hidden z-50 relative">
      <div className="animate-ticker whitespace-nowrap flex items-center text-xs font-mono text-white tracking-wide">
        <span className="px-4">{doubled}</span>
      </div>
    </div>
  );
}
