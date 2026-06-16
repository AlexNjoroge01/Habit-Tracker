import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTemplates } from "@/lib/data";
import { TemplateCard } from "@/components/template-card";

export async function TemplatesContent() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const templates = await getTemplates();

  const packs = [...new Set(templates.map((t) => t.pack))].sort();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Template Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Proven habit packs — install any to add it to your habit list.
        </p>
      </div>

      {templates.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No templates yet. Check back soon.
        </p>
      ) : (
        <div className="space-y-8">
          {packs.map((pack) => {
            const packTemplates = templates.filter((t) => t.pack === pack);
            return (
              <div key={pack}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {pack}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {packTemplates.map((t) => (
                    <TemplateCard key={t.id} template={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
