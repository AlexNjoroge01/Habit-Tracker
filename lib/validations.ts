import { z } from "zod";

export const createHabitSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default("#22c55e"),
  category: z.enum(["build", "break"]).default("build"),
  goalId: z.string().uuid().optional(),
});

export const updateHabitSchema = createHabitSchema
  .partial()
  .extend({ archivedAt: z.coerce.date().optional() });

export const logCompletionSchema = z.object({
  date: z.string().optional(),
  note: z.string().max(280).optional(),
});

export const undoCompletionSchema = z.object({
  date: z.string(),
});

export const addReflectionSchema = z.object({
  completionId: z.string().uuid(),
  reflection: z.string().min(1).max(2000),
  prompt: z.string().max(300).optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Templates ───────────────────────────────────────────────────────────────

export const publishTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default("#22c55e"),
  category: z.enum(["build", "break"]).default("build"),
  pack: z.string().min(1).max(60),
});

export const installTemplateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
});

export const createGoalTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  pack: z.string().min(1).max(60),
});

export const installGoalTemplateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// ─── Accountability Partners ─────────────────────────────────────────────────

export const invitePartnerSchema = z.object({
  partnerEmail: z.string().email(),
});

export const addCommentSchema = z.object({
  body: z.string().min(1).max(1000),
  habitId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
});

// ─── Goals ───────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  targetDate: z.string().optional(),
  weight: z.number().min(0.1).max(5).optional().default(1),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  archivedAt: z.coerce.date().optional(),
});

export const linkHabitSchema = z.object({
  habitId: z.string().uuid(),
  weight: z.number().min(0.1).max(5).optional().default(1),
});

// ─── Journal ─────────────────────────────────────────────────────────────────

export const addJournalEntrySchema = z.object({
  body: z.string().min(1).max(5000),
  goalId: z.string().uuid().optional(),
  habitId: z.string().uuid().optional(),
});

// ─── User Profile ─────────────────────────────────────────────────────────────

export const updateDreamStatementSchema = z.object({
  dreamStatement: z.string().max(5000),
});
