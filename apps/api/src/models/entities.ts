import {
  NOTE_COLORS,
  NOTE_STATUSES,
  type Note as NoteDTO,
  TASK_COLUMNS,
  type Task as TaskDTO,
} from '@noted/shared';
import { model, Schema } from 'mongoose';

const syncedFields = {
  userId: { type: Schema.Types.ObjectId, required: true },
  id: { type: String, required: true },
  seq: { type: Number, required: true },
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  deletedAt: { type: Number, default: null },
};

const options = { id: false, versionKey: false } as const;

function withSyncIndexes<S extends Schema>(schema: S): S {
  schema.index({ userId: 1, id: 1 }, { unique: true });
  schema.index({ userId: 1, seq: 1 });
  return schema;
}

const noteSchema = withSyncIndexes(
  new Schema(
    {
      ...syncedFields,
      body: { type: String, default: '' },
      color: { type: String, enum: NOTE_COLORS, required: true },
      tags: { type: [String], default: [] },
      status: { type: String, enum: NOTE_STATUSES, required: true },
      order: { type: Number, required: true },
      x: { type: Number, default: null },
      y: { type: Number, default: null },
      z: { type: Number, required: true },
    },
    options,
  ),
);

const taskSchema = withSyncIndexes(
  new Schema(
    {
      ...syncedFields,
      title: { type: String, default: '' },
      column: { type: String, enum: TASK_COLUMNS, required: true },
      order: { type: Number, required: true },
    },
    options,
  ),
);

export const Note = model('Note', noteSchema);
export const Task = model('Task', taskSchema);

type Stored<T> = T & { seq: number };

export function toNoteDTO(doc: Stored<NoteDTO>): NoteDTO {
  const { id, body, color, tags, status, order, x, y, z, createdAt, updatedAt, deletedAt } = doc;
  return { id, body, color, tags, status, order, x, y, z, createdAt, updatedAt, deletedAt };
}

export function toTaskDTO(doc: Stored<TaskDTO>): TaskDTO {
  const { id, title, column, order, createdAt, updatedAt, deletedAt } = doc;
  return { id, title, column, order, createdAt, updatedAt, deletedAt };
}
