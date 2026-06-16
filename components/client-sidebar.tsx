"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiBarChartLine,
  RiHome4Line,
  RiListCheck2,
  RiSettings3Line,
  RiLayoutGridLine,
  RiTeamLine,
  RiQuillPenLine,
  RiFlag2Line,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: RiHome4Line },
  { href: "/habits", label: "Habits", icon: RiListCheck2 },
  { href: "/goals", label: "Goals", icon: RiFlag2Line },
  { href: "/journal", label: "Journal", icon: RiQuillPenLine },
  { href: "/templates", label: "Templates", icon: RiLayoutGridLine },
  { href: "/partners", label: "Partners", icon: RiTeamLine },
  { href: "/settings", label: "Settings", icon: RiSettings3Line },
];

export function ClientSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="hidden md:flex md:flex-col w-56 border-r bg-card shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 font-bold text-base">
          <RiBarChartLine className="h-5 w-5 text-primary" />
          <span>HabitIQ</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      {user && (
        <div className="p-4 border-t">
          <p className="text-xs font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      )}
    </aside>
  );
}
