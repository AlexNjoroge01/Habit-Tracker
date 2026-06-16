"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PartnerCard } from "@/components/partner-card";
import { toast } from "sonner";
import { RiLoader4Line, RiUserAddLine } from "@remixicon/react";
import { useSession } from "@/lib/auth-client";

interface Partnership {
  id: string;
  userId: string;
  partnerEmail: string;
  partnerId: string | null;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
}

export function PartnersContent() {
  const { data: session } = useSession();
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchPartnerships = async () => {
    try {
      const res = await fetch("/api/partners");
      if (res.ok) {
        const { data } = await res.json();
        setPartnerships(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerships();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerEmail: email.trim() }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Invite failed");
      }
      toast.success(`Invite sent to ${email}`);
      setEmail("");
      fetchPartnerships();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Accountability Partners</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Invite a friend or coach to view your habit streaks.
        </p>
      </div>

      <form onSubmit={handleInvite} className="flex gap-2 mb-8 max-w-sm">
        <Input
          type="email"
          placeholder="partner@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={inviting}>
          {inviting ? (
            <RiLoader4Line className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RiUserAddLine className="h-4 w-4 mr-1" />
              Invite
            </>
          )}
        </Button>
      </form>

      {partnerships.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No partnerships yet. Invite someone to get started.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {partnerships.map((p) => (
            <PartnerCard
              key={p.id}
              partnership={p}
              currentUserId={session?.user.id ?? ""}
              onAction={fetchPartnerships}
            />
          ))}
        </div>
      )}
    </div>
  );
}
