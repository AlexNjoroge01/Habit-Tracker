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

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
