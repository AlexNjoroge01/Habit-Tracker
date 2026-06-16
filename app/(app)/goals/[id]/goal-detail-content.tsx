"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GoalProgressRing } from "@/components/goal-progress-ring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RiArrowLeftLine, RiLoader4Line, RiLinkM, RiDeleteBinLine, RiSparklingLine } from "@remixicon/react";
import Link from "next/link";
import { format } from "date-fns";

interface LinkedHabit {
  habitId: string;
  weight: string;
  name: string;
  color: string;
  category: string;
  currentStreak: number | null;
  totalCompletions: number | null;
  breakProbability: string | null;
  riskLabel: string | null;
}

interface GoalDetail {
  goal: {
    id: string;
    title: string;
    description: string;
    targetDate: string | null;
    createdAt: string;
    userId: string;
  };
  score: { score: string; trend: string; scoreLastWeek: string | null } | null;
  history: { id: string; score: string; recordedAt: string }[];
  habits: LinkedHabit[];
}

export function GoalDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/goals/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        setDetail(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleUnlinkHabit = async (habitId: string) => {
    setDeletingHabitId(habitId);
    try {
      await fetch(`/api/goals/${id}/habits/${habitId}`, { method: "DELETE" });
      toast("Habit unlinked");
      fetchDetail();
    } catch {
      toast.error("Failed to unlink");
    } finally {
      setDeletingHabitId(null);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      toast("Goal archived");
      router.push("/goals");
    } catch {
      toast.error("Failed to archive");
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground py-8 text-center">Goal not found.</p>;
  }

  const score = detail.score ? Math.round(parseFloat(detail.score.score)) : 0;
  const trend = (detail.score?.trend ?? "stable") as "improving" | "declining" | "stable";
  const prevScore = detail.score?.scoreLastWeek
    ? Math.round(parseFloat(detail.score.scoreLastWeek))
    : null;
  const delta = prevScore !== null ? score - prevScore : null;

  return (
    <div>
      <Link
        href="/goals"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <RiArrowLeftLine className="h-4 w-4" /> Goals
      </Link>

      <div className="flex items-start gap-6 mb-8">
        <GoalProgressRing score={score} trend={trend} size={96} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-snug">{detail.goal.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{detail.goal.description}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge
              variant="secondary"
              className={
                trend === "improving"
                  ? "text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-200"
                  : trend === "declining"
                  ? "text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200"
                  : ""
              }
            >
              {trend}
              {delta !== null && ` (${delta >= 0 ? "+" : ""}${delta} vs last week)`}
            </Badge>
            {detail.goal.targetDate && (
              <span className="text-xs text-muted-foreground">
                Target: {format(new Date(detail.goal.targetDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Linked habits ({detail.habits.length})</h2>
          <span className="text-xs text-muted-foreground">These habits drive your score</span>
        </div>

        {detail.habits.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <RiLinkM className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No habits linked yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Link habits from your{" "}
              <Link href="/habits" className="text-primary underline underline-offset-2">
                habit list
              </Link>{" "}
              to drive this goal&apos;s score.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.habits.map((h) => {
              const breakProb = h.breakProbability ? parseFloat(h.breakProbability) : 0.5;
              return (
                <Card key={h.habitId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: h.color }}
                        />
                        <CardTitle className="text-sm font-medium">{h.name}</CardTitle>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnlinkHabit(h.habitId)}
                        disabled={deletingHabitId === h.habitId}
                      >
                        {deletingHabitId === h.habitId ? (
                          <RiLoader4Line className="h-3 w-3 animate-spin" />
                        ) : (
                          <RiDeleteBinLine className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-2 text-xs text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">{h.currentStreak ?? 0}</p>
                        <p>streak</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{h.totalCompletions ?? 0}</p>
                        <p>total</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          ×{parseFloat(h.weight).toFixed(1)}
                        </p>
                        <p>weight</p>
                      </div>
                    </div>
                    <Progress value={Math.round(breakProb * 100)} className="h-1.5 mt-2" />
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {detail.history.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-3">Score history (last {detail.history.length} snapshots)</h2>
          <div className="flex items-end gap-1 h-20">
            {detail.history
              .slice()
              .reverse()
              .map((h) => {
                const s = Math.round(parseFloat(h.score));
                return (
                  <div
                    key={h.id}
                    title={`${format(new Date(h.recordedAt), "MMM d")}: ${s}`}
                    className="flex-1 bg-primary/20 rounded-sm min-w-[4px]"
                    style={{ height: `${Math.max(4, s)}%` }}
                  />
                );
              })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleArchive}
          disabled={archiving}
        >
          {archiving ? (
            <RiLoader4Line className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <RiDeleteBinLine className="h-4 w-4 mr-1" />
          )}
          Archive goal
        </Button>
      </div>
    </div>
  );
}
