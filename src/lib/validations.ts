import { z } from "zod";

// Match the statuses used in the frontend mapper
const StatusEnum = z.enum([
  "todo",
  "pending",
  "assigned",
  "in_progress",
  "review",
  "done",
]);

const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

// Accept either ISO datetime or YYYY-MM-DD (string) or null/undefined
const DateStringFlexible = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .or(z.string().datetime())
  .nullable()
  .optional();

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.number().int().optional(),
  status: z.enum(["active", "archived"]).optional(),
  startDate: z
    .string()
    .date()
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  projectId: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  status: StatusEnum.default("todo"),
  priority: PriorityEnum.default("medium"),
  dueDate: DateStringFlexible,
});
// export const taskUpdateSchema = taskCreateSchema.partial();

export const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  status: StatusEnum.optional(),
  priority: PriorityEnum.optional(),
  dueDate: DateStringFlexible,
});
