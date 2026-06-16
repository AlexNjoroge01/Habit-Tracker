"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoalCard } from "@/components/goal-card";
import { toast } from "sonner";
import { RiLoader4Line, RiAddLine, RiCloseLine } from "@remixicon/react";
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
  score: string | null;
  trend: string | null;
}

export function GoalsContent() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", targetDate: "" });

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const { data } = await res.json();
        setGoals(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

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
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Failed to create");
      }
      toast.success("Goal created");
      setForm({ title: "", description: "", targetDate: "" });
      setOpen(false);
      fetchGoals();
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track long-term goals backed by your habits.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <RiAddLine className="h-4 w-4 mr-1" />
          New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No goals yet. Create one to link your habits and track progress.
        </p>
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
                placeholder="Run a 5K"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <textarea
                id="desc"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                placeholder="What does achieving this look like?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
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
