import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  numeric,
  uniqueIndex,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 300 }),
  color: varchar("color", { length: 7 }).default("#22c55e").notNull(),
  category: varchar("category", { length: 10 }).default("build").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
});

export const completions = pgTable(
  "completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").defaultNow().notNull(),
    note: varchar("note", { length: 280 }),
    reflection: text("reflection"),
    reflectionPrompt: varchar("reflection_prompt", { length: 300 }),
  },
  (table) => [
    uniqueIndex("completions_habit_date_uidx").on(
      table.habitId,
      sql`DATE(${table.completedAt})`
    ),
  ]
);

export const habitStats = pgTable("habit_stats", {
  habitId: uuid("habit_id")
    .primaryKey()
    .references(() => habits.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  totalCompletions: integer("total_completions").default(0).notNull(),
  lastComputed: timestamp("last_computed").defaultNow().notNull(),
  breakProbability: numeric("break_probability", { precision: 5, scale: 4 })
    .default("0.5000")
    .notNull(),
  riskLabel: varchar("risk_label", { length: 6 }).default("medium").notNull(),
});

// ─── Habit Templates ────────────────────────────────────────────────────────

export const habitTemplates = pgTable("habit_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 300 }),
  color: varchar("color", { length: 7 }).default("#22c55e").notNull(),
  category: varchar("category", { length: 10 }).default("build").notNull(),
  pack: varchar("pack", { length: 60 }).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  installCount: integer("install_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Accountability Partners ─────────────────────────────────────────────────

export const accountabilityPartners = pgTable("accountability_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  partnerEmail: varchar("partner_email", { length: 255 }).notNull(),
  partnerId: text("partner_id").references(() => user.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

export const partnerComments = pgTable("partner_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnershipId: uuid("partnership_id")
    .notNull()
    .references(() => accountabilityPartners.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  habitId: uuid("habit_id").references(() => habits.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  targetDate: date("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  archivedAt: timestamp("archived_at"),
});

export const goalHabits = pgTable("goal_habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  habitId: uuid("habit_id")
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  weight: numeric("weight", { precision: 3, scale: 2 }).default("1.00").notNull(),
},
(table) => [
  uniqueIndex("goal_habits_uidx").on(table.goalId, table.habitId),
]);

export const goalScores = pgTable("goal_scores", {
  goalId: uuid("goal_id")
    .primaryKey()
    .references(() => goals.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 5, scale: 2 }).default("0").notNull(),
  scoreLastWeek: numeric("score_last_week", { precision: 5, scale: 2 }),
  trend: varchar("trend", { length: 10 }).default("stable").notNull(),
  lastComputed: timestamp("last_computed").defaultNow().notNull(),
});

export const goalScoreHistory = pgTable("goal_score_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});
