"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface StreakBadgeProps {
  streak: number;
  category?: string | null;
  animate?: boolean;
}

export function StreakBadge({ streak, category = "build", animate = false }: StreakBadgeProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (animate) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [animate, streak]);

  const isBreak = category === "break";

  return (
    <Badge
      variant="secondary"
      className={`gap-1 transition-transform ${pulse ? "scale-125" : "scale-100"}`}
    >
      {isBreak ? "✨" : "🔥"} {streak} {isBreak ? "days clean" : streak === 1 ? "day" : "days"}
    </Badge>
  );
}
