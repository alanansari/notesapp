import { randomUUID } from 'node:crypto';
import { defaultWorkspace } from '@noted/shared';
import type { Types } from 'mongoose';
import { reserveSeq } from '../models/counter.js';
import { Note, Task } from '../models/entities.js';

/** Gives a new account the same starter notes and tasks a first-time guest sees. */
export async function seedAccount(userId: Types.ObjectId): Promise<void> {
  const { notes, tasks } = defaultWorkspace('account', randomUUID, Date.now());
  const firstSeq = await reserveSeq(userId, notes.length + tasks.length);
  await Note.insertMany(notes.map((note, index) => ({ ...note, userId, seq: firstSeq + index })));
  await Task.insertMany(
    tasks.map((task, index) => ({ ...task, userId, seq: firstSeq + notes.length + index })),
  );
}
