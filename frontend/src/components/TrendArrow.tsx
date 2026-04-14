import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendArrowProps {
  trend: "up" | "down" | "stable";
  pct: number;
}

export default function TrendArrow({ trend, pct }: TrendArrowProps) {
  const config = {
    up: { Icon: ArrowUp, colorClass: "text-danger", label: "↑" },
    down: { Icon: ArrowDown, colorClass: "text-success", label: "↓" },
    stable: { Icon: Minus, colorClass: "text-muted-foreground", label: "→" },
  };
  const { Icon, colorClass } = config[trend];

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Icon size={14} />
      <span className="font-mono text-xs font-medium">{pct}%</span>
    </div>
  );
}
