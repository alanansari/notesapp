import type { NoteColor, NoteStatus } from '@noted/shared';
import { type LocalNote, type NotedDB, nextTimestamp } from './db';
import { orderBetween } from './order';

export interface NewNoteInput {
  body: string;
  color: NoteColor;
  tags: string[];
}

type NotePatch = Partial<Pick<LocalNote, 'body' | 'color' | 'tags' | 'status' | 'order' | 'x' | 'y' | 'z'>>;

export function createNotesRepo(db: NotedDB, onChange: () => void) {
  async function patchMany(patches: { id: string; patch: NotePatch }[]): Promise<void> {
    await db.transaction('rw', db.notes, async () => {
      for (const { id, patch } of patches) {
        const note = await db.notes.get(id);
        if (!note) continue;
        await db.notes.put({ ...note, ...patch, updatedAt: nextTimestamp(note.updatedAt), dirty: 1 });
      }
    });
    onChange();
  }

  const update = (id: string, patch: NotePatch) => patchMany([{ id, patch }]);

  return {
    async create(input: NewNoteInput): Promise<LocalNote> {
      const all = await db.notes.filter((n) => n.deletedAt === null).toArray();
      const firstOrder = Math.min(...all.map((n) => n.order));
      const topZ = Math.max(1, ...all.map((n) => n.z));
      const anyPlaced = all.some((n) => n.status === 'active' && n.x !== null);
      const now = Date.now();
      const note: LocalNote = {
        id: crypto.randomUUID(),
        body: input.body,
        color: input.color,
        tags: input.tags,
        status: 'active',
        order: all.length ? firstOrder - 1 : 0,
        x: anyPlaced ? 0 : null,
        y: anyPlaced ? 0 : null,
        z: topZ + 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        dirty: 1,
      };
      await db.notes.add(note);
      onChange();
      return note;
    },

    update,
    patchMany,

    setStatus: (id: string, status: NoteStatus) => update(id, { status }),

    async toggleChecklistLine(id: string, line: number): Promise<void> {
      const note = await db.notes.get(id);
      if (!note) return;
      const lines = note.body.split('\n');
      const current = lines[line];
      if (current === undefined) return;
      lines[line] = /^- \[x\]/i.test(current)
        ? current.replace(/^- \[x\]/i, '- [ ]')
        : current.replace(/^- \[ \]/, '- [x]');
      await update(id, { body: lines.join('\n') });
    },

    async bringToFront(id: string): Promise<void> {
      const active = await db.notes.where('status').equals('active').toArray();
      await update(id, { z: Math.max(1, ...active.map((n) => n.z)) + 1 });
    },

    async sendToBack(id: string): Promise<void> {
      const active = await db.notes.where('status').equals('active').toArray();
      await update(id, { z: Math.min(1, ...active.map((n) => n.z)) - 1 });
    },

    async moveBefore(id: string, targetId: string, sorted: LocalNote[]): Promise<void> {
      const rest = sorted.filter((n) => n.id !== id);
      const index = rest.findIndex((n) => n.id === targetId);
      if (index < 0) return;
      const draggedFrom = sorted.findIndex((n) => n.id === id);
      const targetFrom = sorted.findIndex((n) => n.id === targetId);
      const insertAt = draggedFrom <= targetFrom ? index + 1 : index;
      await update(id, { order: orderBetween(rest[insertAt - 1]?.order, rest[insertAt]?.order) });
    },

    async remove(id: string): Promise<void> {
      await db.transaction('rw', db.notes, async () => {
        const note = await db.notes.get(id);
        if (!note) return;
        const now = nextTimestamp(note.updatedAt);
        await db.notes.put({ ...note, deletedAt: now, updatedAt: now, dirty: 1 });
      });
      onChange();
    },

    async restoreDeleted(id: string): Promise<void> {
      await db.transaction('rw', db.notes, async () => {
        const note = await db.notes.get(id);
        if (!note) return;
        await db.notes.put({ ...note, deletedAt: null, updatedAt: nextTimestamp(note.updatedAt), dirty: 1 });
      });
      onChange();
    },

    async emptyTrash(): Promise<string[]> {
      const trashed = await db.notes
        .where('status')
        .equals('trashed')
        .filter((n) => n.deletedAt === null)
        .toArray();
      await db.transaction('rw', db.notes, async () => {
        for (const note of trashed) {
          const now = nextTimestamp(note.updatedAt);
          await db.notes.put({ ...note, deletedAt: now, updatedAt: now, dirty: 1 });
        }
      });
      onChange();
      return trashed.map((n) => n.id);
    },
  };
}

export type NotesRepo = ReturnType<typeof createNotesRepo>;
