import * as z from 'zod';
import { noteSchema, taskSchema } from './entities.js';

export const SYNC_BATCH_LIMIT = 500;

export const syncRequestSchema = z.object({
  cursor: z.number().int().nonnegative(),
  notes: z.array(noteSchema).max(SYNC_BATCH_LIMIT),
  tasks: z.array(taskSchema).max(SYNC_BATCH_LIMIT),
});

export const syncResponseSchema = z.object({
  cursor: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  notes: z.array(noteSchema),
  tasks: z.array(taskSchema),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;
