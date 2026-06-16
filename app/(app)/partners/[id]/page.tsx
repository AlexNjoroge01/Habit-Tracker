"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RiLoader4Line, RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

interface HabitRow {
  id: string;
  name: string;
  color: string;
  category: string;
  currentStreak: number | null;
  longestStreak: number | null;
  totalCompletions: number | null;
  breakProbability: string | null;
  riskLabel: string | null;
  isCompletedToday: boolean;
}

interface DashboardData {
  partnership: { id: string; partnerEmail: string; status: string };
  habits: HabitRow[];
}

const riskColors: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
};

export default function PartnerDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/partners/${id}`)
      .then((r) => r.json())
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground py-8 text-center">Partnership not found.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/partners" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <RiArrowLeftLine className="h-4 w-4" /> Partners
        </Link>
        <h1 className="text-2xl font-bold">Partner Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.partnership.partnerEmail}</p>
      </div>

      {data.habits.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No habits to show.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.habits.map((h) => {
            const breakProb = h.breakProbability ? parseFloat(h.breakProbability) : 0.5;
            const pct = Math.round(breakProb * 100);
            return (
              <Card key={h.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: h.color }} />
                      <CardTitle className="text-sm font-semibold">{h.name}</CardTitle>
                    </div>
                    {h.isCompletedToday && (
                      <Badge variant="secondary" className="text-xs">✓ today</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">{h.currentStreak ?? 0}</p>
                      <p>streak</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{h.longestStreak ?? 0}</p>
                      <p>best</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{h.totalCompletions ?? 0}</p>
                      <p>total</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Break risk</span>
                      <span className={riskColors[h.riskLabel ?? "medium"]}>
                        {h.riskLabel ?? "medium"} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
