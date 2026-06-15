"use client";

interface RiskMeterProps {
  breakProbability: number;
  riskLabel: string;
  category?: string | null;
}

const RISK_COLORS = {
  low: "hsl(142 71% 45%)",
  medium: "hsl(38 92% 50%)",
  high: "hsl(0 84% 60%)",
};

export function RiskMeter({ breakProbability, riskLabel, category = "build" }: RiskMeterProps) {
  const pct = Math.round(breakProbability * 100);
  const label = riskLabel as keyof typeof RISK_COLORS;
  const color = RISK_COLORS[label] ?? RISK_COLORS.medium;
  const isBreak = category === "break";

  const RISK_TEXT: Record<string, Record<string, string>> = {
    build: {
      low: "Low chance of breaking today",
      medium: "Watch out — medium risk",
      high: "High chance of breaking today",
    },
    break: {
      low: "Low relapse risk today",
      medium: "Some relapse risk — stay strong",
      high: "High relapse risk today",
    },
  };

  const texts = RISK_TEXT[isBreak ? "break" : "build"];
  const text = texts[label] ?? texts.medium;
  const barLabel = isBreak ? "Relapse risk" : "Break risk";

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">
        {barLabel}: {pct}%
      </span>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {text}
      </span>
    </div>
  );
}
