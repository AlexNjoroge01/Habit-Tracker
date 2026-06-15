"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAddLine } from "@remixicon/react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

export function CreateHabitDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [category, setCategory] = useState<"build" | "break">("build");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const description = (fd.get("description") as string).trim() || undefined;
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color, category }),
      });
      if (!res.ok) throw new Error("Failed to create");
      toast.success("New habit added");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Couldn't create habit — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <RiAddLine className="h-6 w-6" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Category toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                type="button"
                onClick={() => setCategory("build")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  category === "build"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                🌱 Building
              </button>
              <button
                type="button"
                onClick={() => setCategory("break")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                  category === "break"
                    ? "bg-destructive text-destructive-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                🛑 Breaking
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {category === "build"
                ? "Track daily completions and build a streak"
                : "Track days clean — log a relapse if you slip"}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" maxLength={120} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" maxLength={300} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "black" : "transparent",
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 rounded-full cursor-pointer border-0"
                title="Custom color"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create habit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
