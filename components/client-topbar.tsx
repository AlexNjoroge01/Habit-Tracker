"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RiBarChartLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiHome4Line,
  RiListCheck2,
  RiSettings3Line,
  RiLayoutGridLine,
  RiTeamLine,
  RiQuillPenLine,
  RiFlag2Line,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: RiHome4Line },
  { href: "/habits", label: "Habits", icon: RiListCheck2 },
  { href: "/goals", label: "Goals", icon: RiFlag2Line },
  { href: "/journal", label: "Journal", icon: RiQuillPenLine },
  { href: "/templates", label: "Templates", icon: RiLayoutGridLine },
  { href: "/partners", label: "Partners", icon: RiTeamLine },
  { href: "/settings", label: "Settings", icon: RiSettings3Line },
];

export function ClientTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b px-4 md:px-6 h-14 shrink-0">
      {/* Mobile: hamburger + logo */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Open navigation menu"
        >
          <RiMenuLine className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <RiBarChartLine className="h-5 w-5 text-primary" />
          HabitIQ
        </Link>
      </div>

      {/* Desktop: empty left spacer */}
      <div className="hidden md:block" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {user && (
            <DropdownMenuItem disabled className="flex flex-col items-start">
              <span className="font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
            <RiLogoutBoxLine className="h-4 w-4 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile navigation drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="p-0 flex flex-col">
          <SheetHeader className="border-b p-4 shrink-0">
            <SheetTitle>
              <div className="flex items-center gap-2 font-bold text-base">
                <RiBarChartLine className="h-5 w-5 text-primary" />
                HabitIQ
              </div>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-2 flex-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
            <div className="p-4 border-t shrink-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
