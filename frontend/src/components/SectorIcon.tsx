interface SectorIconProps {
  sector: string;
  size?: number;
}

export default function SectorIcon({ sector, size = 20 }: SectorIconProps) {
  const icons: Record<string, string> = {
    Industry: "🏭",
    Transport: "🚗",
    Energy: "⚡",
    Regulation: "⚖️",
  };
  return <span style={{ fontSize: size }}>{icons[sector] || "🏢"}</span>;
}
