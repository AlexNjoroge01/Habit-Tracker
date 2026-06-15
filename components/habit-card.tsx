"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ActivityGraph } from "./activity-graph";
import { RiskMeter } from "./risk-meter";
import { StreakBadge } from "./streak-badge";
import { CompletionButton } from "./completion-button";
import Link from "next/link";
import { useState } from "react";

interface HabitCardProps {
  habit: {
    id: string;
    name: string;
    description?: string | null;
    color: string;
    category?: string | null;
    currentStreak?: number | null;
    breakProbability?: string | null;
    riskLabel?: string | null;
  };
  completions: Date[];
  isCompletedToday: boolean;
}

export function HabitCard({
  habit,
  completions,
  isCompletedToday,
}: HabitCardProps) {
  const [completedToday, setCompletedToday] = useState(isCompletedToday);
  const [animateStreak, setAnimateStreak] = useState(false);
  const streak = habit.currentStreak ?? 0;
  const pRisk = parseFloat(habit.breakProbability ?? "0.5");
  const riskLabel = habit.riskLabel ?? "medium";
  const isBreak = habit.category === "break";

  const handleComplete = () => {
    setCompletedToday(true);
    setAnimateStreak(true);
    setTimeout(() => setAnimateStreak(false), 700);
  };

  // Consistency score for build habits: probability of success today
  const consistencyPct = Math.round((1 - pRisk) * 100);

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div
          className="w-1 shrink-0"
          style={{ backgroundColor: habit.color }}
        />
        <div className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/habits/${habit.id}`}
                className="font-semibold hover:underline leading-tight"
              >
                {habit.name}
              </Link>
              <StreakBadge streak={streak} category={habit.category} animate={animateStreak} />
            </div>
            {habit.description && (
              <p className="text-sm text-muted-foreground">{habit.description}</p>
            )}
            {!isBreak && (
              <p className="text-xs text-muted-foreground">
                {consistencyPct}% success prediction today
              </p>
            )}
          </CardHeader>

          {!isBreak && (
            <CardContent className="pb-3">
              <ActivityGraph
                completions={completions}
                color={habit.color}
                compact
              />
            </CardContent>
          )}

          <CardFooter className="flex items-center justify-between gap-4 pt-0">
            <div className="flex-1 min-w-0">
              <RiskMeter breakProbability={pRisk} riskLabel={riskLabel} category={habit.category} />
            </div>
            <CompletionButton
              habitId={habit.id}
              habitName={habit.name}
              isCompleted={completedToday}
              streak={streak}
              color={habit.color}
              category={habit.category}
              onComplete={handleComplete}
            />
          </CardFooter>
        </div>
      </div>
    </Card>
  );
}
