"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { RiLoader4Line, RiArrowDownSLine, RiDeleteBinLine } from "@remixicon/react";

interface Goal {
  id: string;
  title: string;
}

interface Habit {
  id: string;
  name: string;
  color: string;
  category: string;
  archivedAt: string | null;
}

interface JournalEntry {
  id: string;
  body: string;
  createdAt: string;
  goalId: string | null;
  goalTitle: string | null;
  habitId: string | null;
  habitName: string | null;
  habitColor: string | null;
}

export function JournalContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [goalsRes, habitsRes, entriesRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/habits"),
        fetch("/api/journal"),
      ]);
      if (goalsRes.ok) {
        const { data } = await goalsRes.json();
        setGoals(data ?? []);
      }
      if (habitsRes.ok) {
        const { data } = await habitsRes.json();
        setHabits((data ?? []).filter((h: Habit) => !h.archivedAt));
      }
      if (entriesRes.ok) {
        const { data } = await entriesRes.json();
        setEntries(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          goalId: selectedGoalId || undefined,
          habitId: selectedHabitId || undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Failed to save");
      }
      toast.success("Entry saved");
      setBody("");
      setSelectedGoalId("");
      setSelectedHabitId("");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entry deleted");
      fetchData();
    } catch {
      toast.error("Couldn't delete entry");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Journal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A captain&apos;s log — write observations, realisations, and findings from your journey. Link entries to a goal or habit to see them there too.
        </p>
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-10 rounded-xl border bg-card p-5">
        <div className="space-y-1.5">
          <Label htmlFor="body">Entry</Label>
          <textarea
            id="body"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm resize-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[140px] dark:bg-input/30"
            placeholder="What are you noticing? What have you figured out? What matters?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            required
          />
          <p className="text-xs text-muted-foreground text-right">{body.length}/5000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {goals.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="goal">Link to goal (optional)</Label>
              <div className="relative">
                <select
                  id="goal"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent pl-2.5 pr-8 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">No goal</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
                <RiArrowDownSLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {habits.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="habit">Link to habit (optional)</Label>
              <div className="relative">
                <select
                  id="habit"
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent pl-2.5 pr-8 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  <option value="">No habit</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.category})
                    </option>
                  ))}
                </select>
                <RiArrowDownSLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <Button type="submit" disabled={saving || !body.trim()}>
          {saving && <RiLoader4Line className="h-4 w-4 animate-spin mr-1.5" />}
          Save entry
        </Button>
      </form>

      {/* Entries list */}
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">
          No entries yet. Write your first one above.
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            All entries ({entries.length})
          </h2>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-foreground whitespace-pre-wrap flex-1 leading-relaxed">
                  {entry.body}
                </p>
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deleting === entry.id}
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  {deleting === entry.id ? (
                    <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RiDeleteBinLine className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.createdAt), "MMM d, yyyy · h:mm a")}
                </span>
                {entry.goalTitle && (
                  <Badge variant="secondary" className="text-xs">
                    Goal: {entry.goalTitle}
                  </Badge>
                )}
                {entry.habitName && (
                  <div className="flex items-center gap-1.5">
                    {entry.habitColor && (
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: entry.habitColor }}
                      />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {entry.habitName}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
