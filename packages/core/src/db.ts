import type { Note, Task } from '@noted/shared';
import { Dexie, type EntityTable, type Table } from 'dexie';

export type Dirty = 0 | 1;
export type LocalNote = Note & { dirty: Dirty };
export type LocalTask = Task & { dirty: Dirty };

export interface MetaRecord {
  key: string;
  value: unknown;
}

export class NotedDB extends Dexie {
  notes!: EntityTable<LocalNote, 'id'>;
  tasks!: EntityTable<LocalTask, 'id'>;
  meta!: Table<MetaRecord, string>;

  constructor(name = 'noted') {
    super(name);
    this.version(1).stores({
      notes: 'id, status, dirty, updatedAt',
      tasks: 'id, column, dirty',
      meta: 'key',
    });
  }

  async getMeta<T>(key: string): Promise<T | undefined> {
    return (await this.meta.get(key))?.value as T | undefined;
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    await this.meta.put({ key, value });
  }
}

export function nextTimestamp(previous = 0): number {
  return Math.max(Date.now(), previous + 1);
}
