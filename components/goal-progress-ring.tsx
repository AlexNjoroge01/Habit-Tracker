"use client";

const SIZE = 80;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface GoalProgressRingProps {
  score: number;
  trend?: "improving" | "declining" | "stable";
  size?: number;
}

const trendColors: Record<string, string> = {
  improving: "#22c55e",
  declining: "#ef4444",
  stable: "#6366f1",
};

export function GoalProgressRing({ score, trend = "stable", size = SIZE }: GoalProgressRingProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const offset = CIRCUMFERENCE * (1 - clampedScore / 100);
  const color = trendColors[trend] ?? "#6366f1";
  const scale = size / SIZE;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          className="text-muted/30"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontSize: size * 0.22 }}
      >
        <span className="font-bold leading-none" style={{ color }}>
          {clampedScore}
        </span>
        <span className="text-muted-foreground leading-none" style={{ fontSize: size * 0.13 }}>
          /100
        </span>
      </div>
    </div>
  );
}
