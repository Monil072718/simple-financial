import { z } from "zod";

/** ---------- Shared Enums & Helpers ---------- **/

// Match the statuses used in the frontend mapper
export const StatusEnum = z.enum([
  "todo",
  "pending",
  "assigned",
  "in_progress",
  "review",
  "done",
]);

export const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

// Accept either YYYY-MM-DD or ISO datetime string; also allow null/undefined
const DateStringFlexible = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .or(z.string().datetime())
  .nullable()
  .optional();

/** ---------- Project Schemas ---------- **/

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.number().int().optional(),
  status: z.enum(["active", "archived"]).optional(),
  startDate: DateStringFlexible,
  dueDate: DateStringFlexible,
});

export const projectUpdateSchema = projectCreateSchema.partial();

/** ---------- Task Schemas ---------- **/

export const taskCreateSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  status: StatusEnum.default("todo"),
  priority: PriorityEnum.default("medium"),
  dueDate: DateStringFlexible,
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  status: StatusEnum.optional(),
  priority: PriorityEnum.optional(),
  dueDate: DateStringFlexible,
});

/** ---------- Developer Profile Schemas ---------- **/

export const profileCreateSchema = z.object({
  userId: z.number().int().positive().optional().nullable(),
  fullName: z.string().min(1, "Full name is required"),
  title: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  languages: z.array(z.string().trim()).optional().default([]),
  adminFeedback: z.string().trim().optional().nullable(),
  resumeUrl: z.string().url().optional().nullable(),
});

export const profileUpdateSchema = profileCreateSchema.partial();
