import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PartnerDetailContent } from "./partner-detail-content";

export default function PartnerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      }
    >
      <PartnerDetailContent />
    </Suspense>
  );
}
