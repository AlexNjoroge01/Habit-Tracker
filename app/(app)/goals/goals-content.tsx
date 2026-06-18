"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoalCard } from "@/components/goal-card";
import { toast } from "sonner";
import { RiLoader4Line, RiAddLine, RiEditLine, RiCheckLine, RiCloseLine } from "@remixicon/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  weight: string | null;
  score: string | null;
  trend: string | null;
}

const WEIGHT_OPTIONS = [
  { value: 1, label: "Normal ×1" },
  { value: 2, label: "Important ×2" },
  { value: 3, label: "Very important ×3" },
  { value: 5, label: "Critical ×5" },
];

export function GoalsContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState(1);
  const [form, setForm] = useState({ title: "", description: "", targetDate: "" });

  // Dream Life Statement
  const [dreamStatement, setDreamStatement] = useState("");
  const [editingDream, setEditingDream] = useState(false);
  const [draftDream, setDraftDream] = useState("");
  const [savingDream, setSavingDream] = useState(false);
  const [dreamScore, setDreamScore] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      const [goalsRes, profileRes, statsRes] = await Promise.all([
        fetch("/api/goals"),
        fetch("/api/user-profile"),
        fetch("/api/user-stats"),
      ]);
      if (goalsRes.ok) {
        const { data } = await goalsRes.json();
        setGoals(data ?? []);
      }
      if (profileRes.ok) {
        const { data } = await profileRes.json();
        setDreamStatement(data?.dreamStatement ?? "");
      }
      if (statsRes.ok) {
        const { data } = await statsRes.json();
        if (data?.dreamScore != null) {
          setDreamScore(Math.round(parseFloat(data.dreamScore)));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveDream = async () => {
    setSavingDream(true);
    try {
      const res = await fetch("/api/user-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamStatement: draftDream.trim() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDreamStatement(draftDream.trim());
      setEditingDream(false);
      toast.success("Dream life statement saved");
    } catch {
      toast.error("Couldn't save — try again");
    } finally {
      setSavingDream(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          targetDate: form.targetDate || undefined,
          weight,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Failed to create");
      }
      toast.success("Goal created");
      setForm({ title: "", description: "", targetDate: "" });
      setWeight(1);
      setOpen(false);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setSaving(false);
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
      {/* Dream Life Statement */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Dream Life
          </h2>
          {!editingDream && (
            <button
              onClick={() => { setDraftDream(dreamStatement); setEditingDream(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiEditLine className="h-3.5 w-3.5" />
              {dreamStatement ? "Edit" : "Define"}
            </button>
          )}
        </div>

        {editingDream ? (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm resize-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 min-h-[120px] dark:bg-input/30"
              placeholder="Describe the life you want to live — as rich and specific as you'd like. This is your anchor."
              value={draftDream}
              onChange={(e) => setDraftDream(e.target.value)}
              maxLength={5000}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveDream} disabled={savingDream || !draftDream.trim()}>
                {savingDream ? <RiLoader4Line className="h-3.5 w-3.5 animate-spin" /> : <RiCheckLine className="h-3.5 w-3.5" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingDream(false)} disabled={savingDream}>
                <RiCloseLine className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : dreamStatement ? (
          <blockquote className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/80 italic leading-relaxed">
            &ldquo;{dreamStatement}&rdquo;
          </blockquote>
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Before setting goals, describe the life you want to live.
            </p>
            <button
              onClick={() => { setDraftDream(""); setEditingDream(true); }}
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              Write your dream life statement
            </button>
          </div>
        )}
      </div>

      {/* Dream Life Score */}
      {dreamScore !== null && goals.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 mb-6">
          <div className="text-3xl font-bold tabular-nums">{dreamScore}</div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Dream Life Score</p>
            <p className="text-xs text-muted-foreground">Weighted average of all goal scores</p>
          </div>
          <div className="ml-auto">
            <div
              className="h-2 rounded-full bg-muted overflow-hidden w-28"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${dreamScore}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right mt-0.5">/100</p>
          </div>
        </div>
      )}

      {/* Goals header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chapters of your dream life, backed by daily habits.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <RiAddLine className="h-4 w-4 mr-1" />
          New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm mb-3">
            No goals yet. Each goal is a chapter of your dream life.
          </p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <RiAddLine className="h-4 w-4 mr-1" />
            Create your first goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Be alcohol-free"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">What does achieving this look like?</Label>
              <textarea
                id="desc"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                placeholder="Describe the outcome you want — the real-life change you're after."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>How important is this goal to your dream life?</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="date">Target date (optional)</Label>
              <Input
                id="date"
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <RiLoader4Line className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
