import type { TaskColumn } from '@noted/shared';
import { type LocalTask, type NotedDB, nextTimestamp } from './db';
import { orderBetween } from './order';

export function createTasksRepo(db: NotedDB, onChange: () => void) {
  async function siblings(column: TaskColumn, excludeId?: string): Promise<LocalTask[]> {
    const list = await db.tasks
      .where('column')
      .equals(column)
      .filter((t) => t.deletedAt === null && t.id !== excludeId)
      .toArray();
    return list.sort((a, b) => a.order - b.order);
  }

  async function write(task: LocalTask, patch: Partial<LocalTask>): Promise<void> {
    await db.tasks.put({ ...task, ...patch, updatedAt: nextTimestamp(task.updatedAt), dirty: 1 });
    onChange();
  }

  return {
    async create(title: string, column: TaskColumn): Promise<LocalTask> {
      const list = await siblings(column);
      const now = Date.now();
      const task: LocalTask = {
        id: crypto.randomUUID(),
        title,
        column,
        order: orderBetween(list.at(-1)?.order, undefined),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        dirty: 1,
      };
      await db.tasks.add(task);
      onChange();
      return task;
    },

    async rename(id: string, title: string): Promise<void> {
      const task = await db.tasks.get(id);
      if (task) await write(task, { title });
    },

    async move(id: string, column: TaskColumn, beforeId: string | null = null): Promise<void> {
      const task = await db.tasks.get(id);
      if (!task) return;
      const list = await siblings(column, id);
      const index = beforeId ? list.findIndex((t) => t.id === beforeId) : -1;
      const order =
        index < 0
          ? orderBetween(list.at(-1)?.order, undefined)
          : orderBetween(list[index - 1]?.order, list[index]?.order);
      await write(task, { column, order });
    },

    async remove(id: string): Promise<void> {
      const task = await db.tasks.get(id);
      if (!task) return;
      const now = nextTimestamp(task.updatedAt);
      await db.tasks.put({ ...task, deletedAt: now, updatedAt: now, dirty: 1 });
      onChange();
    },

    async restore(id: string): Promise<void> {
      const task = await db.tasks.get(id);
      if (task) await write(task, { deletedAt: null });
    },
  };
}

export type TasksRepo = ReturnType<typeof createTasksRepo>;
