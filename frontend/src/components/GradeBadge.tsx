import { getGradeColor, getGradeLabel } from "@/services/api";

interface GradeBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function GradeBadge({ score, size = "md", showLabel = false }: GradeBadgeProps) {
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";
  const color = getGradeColor(grade);
  const label = getGradeLabel(grade);
  const sizeMap = { sm: 28, md: 40, lg: 64 };
  const fontMap = { sm: "text-xs", md: "text-sm", lg: "text-xl" };
  const s = sizeMap[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center font-bold font-display"
        style={{ width: s, height: s, backgroundColor: color, color: "white", fontSize: s * 0.4, boxShadow: `inset 0 0 12px rgba(255,255,255,0.3), 0 4px 12px ${color}60` }}
      >
        {grade}
      </div>
      {showLabel && <span className={`${fontMap[size]} font-semibold`} style={{ color }}>{label}</span>}
    </div>
  );
}
