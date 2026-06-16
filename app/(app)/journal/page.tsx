import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalContent } from "./journal-content";

export default function JournalPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <JournalContent />
    </Suspense>
  );
}
