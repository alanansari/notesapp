import type { LocalNote } from '@noted/core';
import { useEffect, useRef, useState } from 'react';
import { ColorPicker } from '../../components/ColorPicker';
import { Modal } from '../../components/Modal';
import { TagInput } from '../../components/TagInput';
import { useToast } from '../../components/Toast';
import { useClient } from '../../lib/context';
import { cleanTag, formatDate } from '../../lib/format';
import { Markdown } from '../../lib/markdown';
import styles from './Editor.module.css';

export function NoteEditor({ note, onClose }: { note: LocalNote; onClose: () => void }) {
  const client = useClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [pendingTag, setPendingTag] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ body, pendingTag });
  latest.current = { body, pendingTag };

  function scheduleSave(next: string) {
    setBody(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void client.notes.update(note.id, { body: next }), 300);
  }

  async function close() {
    clearTimeout(saveTimer.current);
    const { body: text, pendingTag: tag } = latest.current;
    if (!text.trim()) {
      await client.notes.remove(note.id);
    } else {
      const extra = cleanTag(tag);
      const tags = extra && !note.tags.includes(extra) ? [...note.tags, extra] : note.tags;
      if (text !== note.body || tags !== note.tags) await client.notes.update(note.id, { body: text, tags });
    }
    onClose();
  }

  async function changeStatus(status: 'archived' | 'trashed') {
    clearTimeout(saveTimer.current);
    if (body !== note.body) await client.notes.update(note.id, { body });
    await client.notes.setStatus(note.id, status);
    onClose();
    toast(status === 'archived' ? 'Note archived' : 'Moved to trash', () =>
      client.notes.setStatus(note.id, 'active'),
    );
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        void close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <Modal
      label="Edit note"
      fullscreenOnMobile
      onClose={() => void close()}
      className={styles.noteDialog}
      style={{ background: `var(--note-${note.color})` }}
    >
      <div className={styles.header}>
        <div className={styles.segmented} role="tablist">
          <button type="button" role="tab" aria-selected={!editing} onClick={() => setEditing(false)}>
            Preview
          </button>
          <button type="button" role="tab" aria-selected={editing} onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
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
      <div className={styles.body}>
        {editing ? (
          <textarea
            autoFocus
            className={styles.textarea}
            value={body}
            aria-label="Note text"
            onChange={(e) => scheduleSave(e.target.value)}
          />
        ) : (
          <div className={styles.preview} onClick={() => setEditing(true)}>
            {body.trim() ? (
              <Markdown
                body={body}
                onToggle={async (line) => {
                  clearTimeout(saveTimer.current);
                  await client.notes.update(note.id, { body });
                  await client.notes.toggleChecklistLine(note.id, line);
                  const fresh = await client.db.notes.get(note.id);
                  if (fresh) setBody(fresh.body);
                }}
              />
            ) : (
              <span className={styles.placeholder}>Empty note. Click to write.</span>
            )}
          </div>
        )}
      </div>
      {editing && (
        <div className={styles.syntax}>
          # heading · - list · - [ ] checkbox · **bold** · *italic* · `code`
        </div>
      )}
      <div className={styles.footer}>
        <TagInput
          tags={note.tags}
          onChange={(tags) => void client.notes.update(note.id, { tags })}
          pending={pendingTag}
          onPendingChange={setPendingTag}
        />
        <div className={styles.actions}>
          <ColorPicker
            value={note.color}
            onChange={(color) => void client.notes.update(note.id, { color })}
          />
          <span className={styles.edited}>Edited {formatDate(note.updatedAt)}</span>
          <button type="button" className={styles.ghost} onClick={() => void changeStatus('archived')}>
            Archive
          </button>
          <button type="button" className={styles.ghost} onClick={() => void changeStatus('trashed')}>
            Delete
          </button>
          <button type="button" className={styles.primary} onClick={() => void close()}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
