import type { LocalNote } from '@noted/core';
import { useToast } from '../../components/Toast';
import { useClient } from '../../lib/context';
import { formatDate, isLongNote } from '../../lib/format';
import { Markdown } from '../../lib/markdown';
import styles from './BinView.module.css';

interface BinViewProps {
  notes: LocalNote[];
  query: string;
}

export function BinView({ notes, query }: BinViewProps) {
  const client = useClient();
  const toast = useToast();

  async function emptyTrash() {
    const ids = await client.notes.emptyTrash();
    toast('Trash emptied', async () => {
      for (const id of ids) await client.notes.restoreDeleted(id);
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <span>Notes in trash can be restored until you empty it.</span>
        {notes.length > 0 && !query && (
          <button type="button" className={styles.emptyButton} onClick={() => void emptyTrash()}>
            Empty trash
          </button>
        )}
      </div>

      {notes.length > 0 ? (
        <div className={styles.grid}>
          {notes.map((note) => (
            <article
              key={note.id}
              className={styles.card}
              style={{
                background: `var(--note-${note.color})`,
                ['--card-bg' as string]: `var(--note-${note.color})`,
              }}
            >
              <div className={styles.content}>
                <Markdown body={note.body} />
                {isLongNote(note.body) && <div className={styles.fade} />}
              </div>
              <div className={styles.date}>{formatDate(note.updatedAt)}</div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.restore}
                  onClick={() => {
                    void client.notes.setStatus(note.id, 'active');
                    toast('Note restored', () => client.notes.setStatus(note.id, note.status));
                  }}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    void client.notes.remove(note.id);
                    toast('Note deleted', () => client.notes.restoreDeleted(note.id));
                  }}
                >
                  Delete forever
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>{query ? 'No matches' : 'Trash is empty'}</div>
          <div className={styles.emptyText}>
            {query
              ? 'Nothing here matches your search.'
              : 'Deleted notes show up here first, so nothing disappears by accident.'}
          </div>
        </div>
      )}
    </section>
  );
}
