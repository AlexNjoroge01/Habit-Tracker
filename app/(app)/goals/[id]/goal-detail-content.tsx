"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GoalProgressRing } from "@/components/goal-progress-ring";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  RiArrowLeftLine,
  RiLoader4Line,
  RiLinkM,
  RiDeleteBinLine,
  RiAddLine,
  RiQuillPenLine,
} from "@remixicon/react";
import Link from "next/link";
import { format } from "date-fns";
import { CreateHabitDialog } from "@/components/create-habit-dialog";

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

interface UserHabit {
  id: string;
  name: string;
  color: string;
  category: string;
  currentStreak: number | null;
  archivedAt: string | null;
}

interface JournalEntry {
  id: string;
  body: string;
  createdAt: string;
  habitId: string | null;
  habitName: string | null;
  habitColor: string | null;
}

interface GoalDetail {
  goal: {
    id: string;
    title: string;
    description: string;
    weight: string | null;
    targetDate: string | null;
    createdAt: string;
    userId: string;
  };
  score: { score: string; trend: string; scoreLastWeek: string | null } | null;
  history: { id: string; score: string; recordedAt: string }[];
  habits: LinkedHabit[];
}

const WEIGHT_OPTIONS = [
  { value: 1, label: "Normal (×1)" },
  { value: 2, label: "Important (×2)" },
  { value: 3, label: "Very important (×3)" },
  { value: 5, label: "Critical (×5)" },
];

export function GoalDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<GoalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Journal entries for this goal
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Link habit dialog
  const [linkOpen, setLinkOpen] = useState(false);
  const [allHabits, setAllHabits] = useState<UserHabit[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [weight, setWeight] = useState(1);
  const [linking, setLinking] = useState(false);

  const fetchDetail = async () => {
    try {
      const [detailRes, journalRes] = await Promise.all([
        fetch(`/api/goals/${id}`),
        fetch(`/api/journal?goalId=${id}`),
      ]);
      if (detailRes.ok) {
        const { data } = await detailRes.json();
        setDetail(data);
      }
      if (journalRes.ok) {
        const { data } = await journalRes.json();
        setJournalEntries(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const openLinkDialog = async () => {
    setSelectedHabitId(null);
    setWeight(1);
    setLinkOpen(true);
    setLoadingHabits(true);
    try {
      const res = await fetch("/api/habits");
      if (res.ok) {
        const { data } = await res.json();
        setAllHabits((data ?? []).filter((h: UserHabit) => !h.archivedAt));
      }
    } finally {
      setLoadingHabits(false);
    }
  };

  const handleLink = async () => {
    if (!selectedHabitId) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/goals/${id}/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: selectedHabitId, weight }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Failed to link");
      }
      toast.success("Habit linked — score updated");
      setLinkOpen(false);
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link habit");
    } finally {
      setLinking(false);
    }
  };

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

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;
    setSavingEntry(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newEntry.trim(), goalId: id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Entry saved");
      setNewEntry("");
      fetchDetail();
    } catch {
      toast.error("Couldn't save entry");
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeletingEntryId(entryId);
    try {
      await fetch(`/api/journal?id=${entryId}`, { method: "DELETE" });
      setJournalEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch {
      toast.error("Couldn't delete entry");
    } finally {
      setDeletingEntryId(null);
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
  const goalWeight = detail.goal.weight ? parseFloat(detail.goal.weight) : 1;

  const linkedIds = new Set(detail.habits.map((h) => h.habitId));
  const availableHabits = allHabits.filter((h) => !linkedIds.has(h.id));

  return (
    <div>
      <Link
        href="/goals"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <RiArrowLeftLine className="h-4 w-4" /> Goals
      </Link>

      {/* Header */}
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
            <Badge variant="outline" className="text-xs">
              Weight ×{goalWeight.toFixed(1)} toward dream life
            </Badge>
            {detail.goal.targetDate && (
              <span className="text-xs text-muted-foreground">
                Target: {format(new Date(detail.goal.targetDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Linked habits */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Linked habits ({detail.habits.length})</h2>
          <div className="flex items-center gap-2">
            <CreateHabitDialog
              goalId={id}
              goalTitle={detail.goal.title}
              triggerVariant="button"
              triggerLabel="New habit for this goal"
              onCreated={fetchDetail}
            />
            <Button size="sm" variant="outline" onClick={openLinkDialog}>
              <RiAddLine className="h-3.5 w-3.5 mr-1" />
              Link existing
            </Button>
          </div>
        </div>

        {detail.habits.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <RiLinkM className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No habits linked yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Link one or more habits to start tracking progress toward this goal.
            </p>
            <div className="flex items-center gap-2 justify-center">
              <CreateHabitDialog
                goalId={id}
                goalTitle={detail.goal.title}
                triggerVariant="button"
                triggerLabel="New habit for this goal"
                onCreated={fetchDetail}
              />
              <Button size="sm" variant="outline" onClick={openLinkDialog}>
                Link existing
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.habits.map((h) => {
              const breakProb = h.breakProbability ? parseFloat(h.breakProbability) : 0.5;
              return (
                <Card key={h.habitId}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: h.color }}
                        />
                        <CardTitle className="text-sm font-medium truncate">{h.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {h.category}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
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
                        <p>{h.category === "break" ? "clean days" : "streak"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{h.totalCompletions ?? 0}</p>
                        <p>{h.category === "break" ? "relapses" : "logged"}</p>
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

      {/* Score history chart */}
      {detail.history.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">
            Score history ({detail.history.length} snapshots)
          </h2>
          <div className="flex items-end gap-0.5 h-20 border-b border-border/40 pb-1">
            {detail.history
              .slice()
              .reverse()
              .map((h) => {
                const s = Math.round(parseFloat(h.score));
                return (
                  <div
                    key={h.id}
                    title={`${format(new Date(h.recordedAt), "MMM d")}: ${s}`}
                    className="flex-1 bg-primary/30 hover:bg-primary/60 rounded-sm transition-colors min-w-[3px]"
                    style={{ height: `${Math.max(4, s)}%` }}
                  />
                );
              })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>oldest</span>
            <span>latest</span>
          </div>
        </div>
      )}

      {/* Journey notes (journal entries for this goal) */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <RiQuillPenLine className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Journey notes</h2>
        </div>

        <form onSubmit={handleSaveEntry} className="space-y-2 mb-4">
          <textarea
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[80px] dark:bg-input/30"
            placeholder="Write an observation about this goal — something you've noticed or figured out."
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            maxLength={5000}
          />
          <Button type="submit" size="sm" disabled={savingEntry || !newEntry.trim()}>
            {savingEntry ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Add note
          </Button>
        </form>

        {journalEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap flex-1 leading-relaxed">
                    {entry.body}
                  </p>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    disabled={deletingEntryId === entry.id}
                    className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {deletingEntryId === entry.id ? (
                      <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RiDeleteBinLine className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.createdAt), "MMM d, yyyy")}
                  </span>
                  {entry.habitName && (
                    <div className="flex items-center gap-1">
                      {entry.habitColor && (
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: entry.habitColor }}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">{entry.habitName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Archive */}
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

      {/* Link habit dialog */}
      <Dialog open={linkOpen} onOpenChange={(v) => !linking && setLinkOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link a habit to this goal</DialogTitle>
          </DialogHeader>

          {loadingHabits ? (
            <div className="flex items-center justify-center py-8">
              <RiLoader4Line className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {allHabits.length === 0
                ? "You have no habits yet. Create some habits first."
                : "All your habits are already linked to this goal."}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Choose a habit</Label>
                <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                  {availableHabits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHabitId(h.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted/50 ${
                        selectedHabitId === h.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: h.color }}
                      />
                      <span className="flex-1 font-medium">{h.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {h.category}
                      </Badge>
                      {h.currentStreak != null && h.currentStreak > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {h.currentStreak}d streak
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Weight (how much this habit counts toward the goal)</Label>
                <div className="flex gap-2 flex-wrap">
                  {WEIGHT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWeight(opt.value)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        weight === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(false)} disabled={linking}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={!selectedHabitId || linking || loadingHabits}>
              {linking ? (
                <RiLoader4Line className="h-4 w-4 animate-spin" />
              ) : (
                "Link habit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
