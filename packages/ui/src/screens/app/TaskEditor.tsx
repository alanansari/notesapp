import type { LocalTask } from '@noted/core';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useClient } from '../../lib/context';
import { COLUMNS } from './columns';
import styles from './Editor.module.css';

export function TaskEditor({ task, onClose }: { task: LocalTask; onClose: () => void }) {
  const client = useClient();
  const toast = useToast();
  const [title, setTitle] = useState(task.title);
  const latest = useRef(title);
  latest.current = title;

  async function close() {
    const text = latest.current.trim();
    if (!text) await client.tasks.remove(task.id);
    else if (text !== task.title) await client.tasks.rename(task.id, text);
    onClose();
  }

  async function remove() {
    await client.tasks.remove(task.id);
    onClose();
    toast('Task deleted', () => client.tasks.restore(task.id));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        void close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <Modal label="Edit task" fullscreenOnMobile onClose={() => void close()} className={styles.taskDialog}>
      <div className={styles.header}>
        <span className={styles.label}>Edit task</span>
        <span className={styles.flex} />
        <button
          type="button"
          className={styles.close}
          title="Close (Esc)"
          aria-label="Close"
          onClick={() => void close()}
        >
          ×
        </button>
      </div>
      <div className={styles.section}>
        <textarea
          autoFocus
          rows={3}
          className={styles.title}
          value={title}
          placeholder="Task name"
          aria-label="Task name"
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void close();
            }
          }}
        />
      </div>
      <div className={styles.section}>
        <span className={styles.label}>Status</span>
        <div className={styles.statuses} role="radiogroup" aria-label="Status">
          {COLUMNS.map((column) => (
            <button
              key={column.id}
              type="button"
              role="radio"
              aria-checked={task.column === column.id}
              onClick={() => void client.tasks.move(task.id, column.id)}
            >
              <span className={styles.dot} style={{ background: column.dot }} />
              {column.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.taskFooter}>
        <button type="button" className={styles.ghost} onClick={() => void remove()}>
          Delete
        </button>
        <button type="button" className={styles.primary} onClick={() => void close()}>
          Done
        </button>
      </div>
    </Modal>
  );
}
