import { useEffect, useState } from "react";
import { getGradeFromScore, getGradeColor } from "@/services/api";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeColor?: string;
  showLabel?: boolean;
}

export default function ScoreRing({ score, size = 120, strokeColor, showLabel = true }: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const grade = getGradeFromScore(score);
  const color = strokeColor || getGradeColor(grade);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ filter: `drop-shadow(0 4px 8px ${color}40)` }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="font-display font-bold" fill="currentColor" fontSize={size * 0.22}>
          {animatedScore}
        </text>
        {showLabel && (
          <text x="50%" y="64%" textAnchor="middle" dominantBaseline="middle" className="font-display font-bold" fill={color} fontSize={size * 0.14}>
            {grade}
          </text>
        )}
      </svg>
    </div>
  );
}
