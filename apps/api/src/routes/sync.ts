import {
  type Note as NoteDTO,
  SYNC_BATCH_LIMIT,
  syncRequestSchema,
  type Task as TaskDTO,
} from '@noted/shared';
import type { FastifyInstance } from 'fastify';
import { type Model, mongo, type Types } from 'mongoose';
import { reserveSeq } from '../models/counter.js';
import { Note, Task, toNoteDTO, toTaskDTO } from '../models/entities.js';
import { requireAuth } from '../plugins/auth.js';

const DUPLICATE_KEY = 11000;

async function applyChanges<T extends { id: string; updatedAt: number }>(
  model: Model<unknown>,
  userId: Types.ObjectId,
  changes: T[],
): Promise<void> {
  if (!changes.length) return;
  const firstSeq = await reserveSeq(userId, changes.length);
  const ops = changes.map((change, index) => ({
    updateOne: {
      filter: { userId, id: change.id, updatedAt: { $lt: change.updatedAt } },
      update: { $set: { ...change, userId, seq: firstSeq + index } },
      upsert: true,
    },
  }));
  try {
    await model.bulkWrite(ops, { ordered: false });
  } catch (error) {
    const staleOnly =
      error instanceof mongo.MongoBulkWriteError &&
      [error.writeErrors].flat().every((e) => e.code === DUPLICATE_KEY);
    if (!staleOnly) throw error;
  }
}

export async function syncRoutes(app: FastifyInstance) {
  app.post('/sync', { onRequest: app.authenticate, bodyLimit: 20 * 1024 * 1024 }, async (request) => {
    const { userId } = requireAuth(request);
    const input = syncRequestSchema.parse(request.body);

    await applyChanges(Note as unknown as Model<unknown>, userId, input.notes);
    await applyChanges(Task as unknown as Model<unknown>, userId, input.tasks);

    const query = { userId, seq: { $gt: input.cursor } };
    const [notes, tasks] = await Promise.all([
      Note.find(query)
        .sort({ seq: 1 })
        .limit(SYNC_BATCH_LIMIT + 1)
        .lean<(NoteDTO & { seq: number })[]>(),
      Task.find(query)
        .sort({ seq: 1 })
        .limit(SYNC_BATCH_LIMIT + 1)
        .lean<(TaskDTO & { seq: number })[]>(),
    ]);

    const merged = [
      ...notes.map((doc) => ({ seq: doc.seq, note: doc })),
      ...tasks.map((doc) => ({ seq: doc.seq, task: doc })),
    ].sort((a, b) => a.seq - b.seq);
    const page = merged.slice(0, SYNC_BATCH_LIMIT);

    return {
      cursor: page.at(-1)?.seq ?? input.cursor,
      hasMore: merged.length > SYNC_BATCH_LIMIT,
      notes: page.flatMap((item) => ('note' in item && item.note ? [toNoteDTO(item.note)] : [])),
      tasks: page.flatMap((item) => ('task' in item && item.task ? [toTaskDTO(item.task)] : [])),
    };
  });
}
