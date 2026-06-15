import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { HabitDetailContent } from "./habit-detail-content";

type Props = { params: Promise<{ id: string }> };

export default function HabitDetailPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      }
    >
      <HabitDetailContent params={params} />
    </Suspense>
  );
}
