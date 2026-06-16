"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiLoader4Line, RiArrowRightLine, RiCloseLine } from "@remixicon/react";
import Link from "next/link";

interface Partnership {
  id: string;
  userId: string;
  partnerEmail: string;
  partnerId: string | null;
  status: string;
  invitedAt: Date | string;
  acceptedAt: Date | string | null;
}

interface PartnerCardProps {
  partnership: Partnership;
  currentUserId: string;
  onAction?: () => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  declined: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function PartnerCard({ partnership, currentUserId, onAction }: PartnerCardProps) {
  const [loading, setLoading] = useState(false);
  const isOwner = partnership.userId === currentUserId;
  const isInvitee = !isOwner;
  const isPending = partnership.status === "pending";
  const isActive = partnership.status === "active";

  const handleAction = async (action: "accept" | "decline" | "remove") => {
    setLoading(true);
    try {
      if (action === "remove") {
        const res = await fetch(`/api/partners/${partnership.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to remove");
        toast("Partnership removed");
      } else {
        const res = await fetch(`/api/partners/${partnership.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error(`Failed to ${action}`);
        toast(action === "accept" ? "Partnership accepted!" : "Invite declined");
      }
      onAction?.();
    } catch {
      toast.error("Action failed — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">
              {isOwner ? "You invited" : "Invited by"}:{" "}
              <span className="font-normal text-muted-foreground">
                {isOwner ? partnership.partnerEmail : "them"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">{partnership.partnerEmail}</CardDescription>
          </div>
          <span
            className={`text-xs rounded-full px-2 py-0.5 font-medium ${statusColors[partnership.status] ?? ""}`}
          >
            {partnership.status}
          </span>
        </div>
      </CardHeader>
      <CardFooter className="pt-0 flex items-center justify-end gap-2">
        {loading && <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!loading && isActive && (
          <>
            <Link href={`/partners/${partnership.id}`}>
              <Button size="sm" variant="outline">
                View dashboard <RiArrowRightLine className="h-3 w-3 ml-1" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => handleAction("remove")}
            >
              <RiCloseLine className="h-3 w-3" />
            </Button>
          </>
        )}
        {!loading && isPending && isInvitee && (
          <>
            <Button size="sm" onClick={() => handleAction("accept")}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleAction("decline")}>
              Decline
            </Button>
          </>
        )}
        {!loading && isPending && isOwner && (
          <span className="text-xs text-muted-foreground">Waiting for response…</span>
        )}
      </CardFooter>
    </Card>
  );
}
