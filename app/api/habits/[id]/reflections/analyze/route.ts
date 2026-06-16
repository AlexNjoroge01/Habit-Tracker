import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { habits, completions } from "@/db/schema";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { headers } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, session.user.id)));

  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      completedAt: completions.completedAt,
      reflection: completions.reflection,
      reflectionPrompt: completions.reflectionPrompt,
    })
    .from(completions)
    .where(and(eq(completions.habitId, id), isNotNull(completions.reflection)))
    .orderBy(desc(completions.completedAt))
    .limit(50);

  if (rows.length < 3) {
    return NextResponse.json({
      data: {
        summary: "Add at least 3 reflections to unlock pattern analysis.",
        patterns: [],
        recommendation: null,
      },
    });
  }

  const reflectionText = rows
    .map((r, i) => {
      const date = r.completedAt.toISOString().split("T")[0];
      const day = r.completedAt.toLocaleDateString("en-US", { weekday: "long" });
      return `[${i + 1}] ${day} ${date}${r.reflectionPrompt ? ` (prompt: "${r.reflectionPrompt}")` : ""}\n${r.reflection}`;
    })
    .join("\n\n");

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: `You are a behavioral psychology assistant helping users understand their habit patterns.
Analyze the reflection journal entries and identify meaningful patterns. Be empathetic, concise, and actionable.
Look for: timing patterns (days of week, time of day), emotional triggers, environmental factors, momentum patterns.
Respond ONLY with valid JSON in this exact shape:
{"summary":"1-2 sentence overview of the main pattern","patterns":[{"title":"Pattern name","insight":"1 sentence explanation"}],"recommendation":"One concrete, actionable suggestion"}
Return 2-4 patterns maximum. Do not wrap in markdown.`,
    messages: [
      {
        role: "user",
        content: `Habit: "${habit.name}" (${habit.category === "break" ? "habit to break" : "habit to build"})\n\nReflections:\n${reflectionText}`,
      },
    ],
  });

  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }

  let analysis: unknown;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: textBlock.text, patterns: [] };
  } catch {
    analysis = { summary: textBlock.text, patterns: [] };
  }

  return NextResponse.json({ data: analysis });
}
