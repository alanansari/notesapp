import type { LocalTask } from '@noted/core';
import type { TaskColumn } from '@noted/shared';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useClient } from '../../lib/context';
import { COLUMNS } from './columns';
import styles from './Kanban.module.css';

export interface KanbanHandle {
  focusNewTask: () => void;
}

interface KanbanProps {
  ref: Ref<KanbanHandle>;
  tasks: LocalTask[];
  query: string;
  onOpen: (id: string) => void;
}

export function Kanban({ ref, tasks, query, onOpen }: KanbanProps) {
  const client = useClient();
  const toast = useToast();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ column: TaskColumn; task: string | null } | null>(null);
  const [drafts, setDrafts] = useState<Record<TaskColumn, string>>({
    backlog: '',
    todo: '',
    doing: '',
    done: '',
  });
  const todoInput = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ focusNewTask: () => todoInput.current?.focus() }));

  const q = query.trim().toLowerCase();

  function endDrag() {
    setDragging(null);
    setOver(null);
  }

  function drop(column: TaskColumn, beforeId: string | null) {
    if (dragging && dragging !== beforeId) void client.tasks.move(dragging, column, beforeId);
    endDrag();
  }

  async function add(column: TaskColumn) {
    const title = drafts[column].trim();
    if (!title) return;
    await client.tasks.create(title, column);
    setDrafts((d) => ({ ...d, [column]: '' }));
  }

  function remove(task: LocalTask) {
    void client.tasks.remove(task.id);
    toast('Task deleted', () => client.tasks.restore(task.id));
  }

  return (
    <section className={styles.board}>
      {COLUMNS.map((column, index) => {
        const list = tasks.filter((t) => t.column === column.id && (!q || t.title.toLowerCase().includes(q)));
        return (
          <div
            key={column.id}
            className={styles.column}
            data-over={dragging !== null && over?.column === column.id}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              if (over?.column !== column.id || over.task !== null)
                setOver({ column: column.id, task: null });
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(column.id, null);
            }}
          >
            <div className={styles.heading}>
              <span className={styles.dot} style={{ background: column.dot }} />
              <span className={styles.label}>{column.label}</span>
              <span className={styles.count}>{list.length}</span>
            </div>

            {list.map((task) => {
              const done = task.column === 'done';
              return (
                <div
                  key={task.id}
                  draggable
                  className={styles.task}
                  data-dragging={dragging === task.id}
                  data-drop-target={over?.task === task.id && dragging !== task.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', task.id);
                    setDragging(task.id);
                  }}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (over?.task !== task.id) setOver({ column: column.id, task: task.id });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    drop(column.id, task.id);
                  }}
                  onDragEnd={endDrag}
                >
                  <button
                    type="button"
                    className={styles.check}
                    data-done={done}
                    aria-label={done ? 'Mark as not done' : 'Mark as done'}
                    onClick={() => void client.tasks.move(task.id, done ? 'todo' : 'done')}
                  >
                    {done ? '✓' : ''}
                  </button>
                  <div className={styles.taskBody}>
                    <button
                      type="button"
                      className={styles.title}
                      data-done={done}
                      onClick={() => onOpen(task.id)}
                    >
                      {task.title}
                    </button>
                    <div className={styles.taskActions}>
                      {index > 0 && (
                        <button
                          type="button"
                          title="Move left"
                          aria-label="Move left"
                          onClick={() =>
                            void client.tasks.move(
                              task.id,
                              (COLUMNS[index - 1] as (typeof COLUMNS)[number]).id,
                            )
                          }
                        >
                          ‹
                        </button>
                      )}
                      {index < COLUMNS.length - 1 && (
                        <button
                          type="button"
                          title="Move right"
                          aria-label="Move right"
                          onClick={() =>
                            void client.tasks.move(
                              task.id,
                              (COLUMNS[index + 1] as (typeof COLUMNS)[number]).id,
                            )
                          }
                        >
                          ›
                        </button>
                      )}
                      <button
                        type="button"
                        title="Delete"
                        aria-label="Delete task"
                        onClick={() => remove(task)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {list.length === 0 && (
              <div className={styles.empty}>{q ? 'No matching tasks' : column.empty}</div>
            )}

            <input
              ref={column.id === 'todo' ? todoInput : undefined}
              className={styles.add}
              value={drafts[column.id]}
              placeholder="+ Add a task"
              aria-label={`Add a task to ${column.label}`}
              onChange={(e) => setDrafts((d) => ({ ...d, [column.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void add(column.id);
              }}
            />
          </div>
        );
      })}
    </section>
  );
}
