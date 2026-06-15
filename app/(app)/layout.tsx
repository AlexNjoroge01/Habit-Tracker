import { Suspense } from "react";
import { ClientSidebar } from "@/components/client-sidebar";
import { ClientTopbar } from "@/components/client-topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="hidden md:block w-56 border-r bg-card" />}>
        <ClientSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<div className="h-14 border-b" />}>
          <ClientTopbar />
        </Suspense>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
