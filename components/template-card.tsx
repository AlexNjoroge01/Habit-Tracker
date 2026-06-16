"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiLoader4Line, RiDownloadLine } from "@remixicon/react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  color: string;
  category: string;
  pack: string;
  installCount: number;
}

interface TemplateCardProps {
  template: Template;
  onInstalled?: () => void;
}

export function TemplateCard({ template, onInstalled }: TemplateCardProps) {
  const [loading, setLoading] = useState(false);

  const handleInstall = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${template.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(typeof error === "string" ? error : "Failed to install");
      }
      toast.success(`"${template.name}" added to your habits`);
      onInstalled?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Install failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: template.color }}
            />
            <CardTitle className="text-sm font-semibold leading-snug">{template.name}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {template.category}
          </Badge>
        </div>
        {template.description && (
          <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
        )}
      </CardHeader>
      <CardFooter className="pt-0 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{template.installCount} installs</span>
        <Button size="sm" onClick={handleInstall} disabled={loading} variant="outline">
          {loading ? (
            <RiLoader4Line className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <RiDownloadLine className="h-3 w-3 mr-1" />
              Add
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
