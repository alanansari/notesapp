import * as z from 'zod';

export const NOTE_COLORS = ['yellow', 'cyan', 'green', 'pink', 'lavender', 'peach'] as const;
export const NOTE_STATUSES = ['active', 'archived', 'trashed'] as const;
export const TASK_COLUMNS = ['backlog', 'todo', 'doing', 'done'] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];
export type NoteStatus = (typeof NOTE_STATUSES)[number];
export type TaskColumn = (typeof TASK_COLUMNS)[number];

const timestamp = z.number().int().nonnegative();

const syncedFields = {
  id: z.uuid(),
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp.nullable(),
};

export const noteSchema = z.object({
  ...syncedFields,
  body: z.string().max(100_000),
  color: z.enum(NOTE_COLORS),
  tags: z.array(z.string().min(1).max(40)).max(30),
  status: z.enum(NOTE_STATUSES),
  order: z.number(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  z: z.number().int(),
});

export const taskSchema = z.object({
  ...syncedFields,
  title: z.string().max(500),
  column: z.enum(TASK_COLUMNS),
  order: z.number(),
});

export type Note = z.infer<typeof noteSchema>;
export type Task = z.infer<typeof taskSchema>;
