import { db } from "./index";
import { habitTemplates } from "./schema";
import { count } from "drizzle-orm";

const templates = [
  {
    name: "Morning Meditation",
    description:
      "10 minutes of mindfulness each morning to start the day with clarity and calm.",
    color: "#8b5cf6",
    category: "build",
    pack: "Morning Routine",
  },
  {
    name: "Daily Walk",
    description:
      "30 minutes of walking to boost energy, mood, and cardiovascular health.",
    color: "#ef4444",
    category: "build",
    pack: "Fitness",
  },
  {
    name: "No Social Media Before Noon",
    description:
      "Protect your morning focus by keeping social media off until after midday.",
    color: "#f59e0b",
    category: "break",
    pack: "Digital Wellness",
  },
  {
    name: "Read 20 Minutes",
    description:
      "A daily reading habit to grow your knowledge and wind down before sleep.",
    color: "#3b82f6",
    category: "build",
    pack: "Learning",
  },
  {
    name: "Lights Out by 11pm",
    description:
      "A consistent bedtime protects sleep quality and next-day performance.",
    color: "#22c55e",
    category: "build",
    pack: "Sleep Hygiene",
  },
];

async function seed() {
  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(habitTemplates);

  if (existing > 0) {
    console.log(`Skipped: ${existing} template(s) already in database.`);
    return;
  }

  const inserted = await db.insert(habitTemplates).values(templates).returning();
  console.log(`Seeded ${inserted.length} templates:`);
  inserted.forEach((t) => console.log(`  • [${t.pack}] ${t.name}`));
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
