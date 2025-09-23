import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.number().int().optional(),
  status: z.enum(["active","archived"]).optional(),
  startDate: z.string().date().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const taskCreateSchema = z.object({
  projectId: z.number().int(),
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.number().int().optional(),
  status: z.enum(["todo","in_progress","done"]).optional(),
  priority: z.enum(["low","medium","high"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();
