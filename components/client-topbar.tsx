"use client";

import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiBarChartLine, RiLogoutBoxLine } from "@remixicon/react";
import Link from "next/link";

export function ClientTopbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

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
      <Link href="/dashboard" className="flex items-center gap-2 font-bold md:hidden">
        <RiBarChartLine className="h-5 w-5 text-primary" />
        HabitIQ
      </Link>
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
    </header>
  );
}
