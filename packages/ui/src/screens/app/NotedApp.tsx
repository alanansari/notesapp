import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { CloudPrompt } from '../../components/CloudPrompt';
import { SyncStatus } from '../../components/SyncStatus';
import { ToastProvider } from '../../components/Toast';
import { usePlatform } from '../../lib/context';
import { useIsMobile, useNotes, useSession, useTasks } from '../../lib/hooks';
import { useBoardMode, useTheme } from '../../lib/preferences';
import { BinView } from './BinView';
import { Board } from './Board';
import { Composer, type ComposerHandle } from './Composer';
import { Kanban, type KanbanHandle } from './Kanban';
import styles from './NotedApp.module.css';
import { NoteEditor } from './NoteEditor';
import { ShortcutsDialog } from './ShortcutsDialog';
import { MobileNav, Sidebar } from './Sidebar';
import { TaskEditor } from './TaskEditor';
import { type Counts, VIEW_ORDER, VIEWS, type View } from './views';

export function NotedApp() {
  const mobile = useIsMobile();
  return (
    <ToastProvider raised={mobile}>
      <Workspace mobile={mobile} />
    </ToastProvider>
  );
}

function Workspace({ mobile }: { mobile: boolean }) {
  const { navigate } = usePlatform();
  const session = useSession();
  const allNotes = useNotes();
  const allTasks = useTasks();
  const [theme, setTheme] = useTheme();
  const [boardMode, setBoardMode] = useBoardMode();

  const [view, setView] = useState<View>('notes');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const search = useRef<HTMLInputElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const kanban = useRef<KanbanHandle>(null);

  const notes = allNotes ?? [];
  const tasks = allTasks ?? [];
  const active = useMemo(() => notes.filter((n) => n.status === 'active'), [notes]);

  const counts: Counts = {
    notes: active.length,
    tasks: tasks.filter((t) => t.column !== 'done').length,
    archive: notes.filter((n) => n.status === 'archived').length,
    trash: notes.filter((n) => n.status === 'trashed').length,
  };

  const q = query.trim().toLowerCase();
  const matches = (body: string, tags: string[]) =>
    !q ||
    body.toLowerCase().includes(q) ||
    tags.some((t) => `#${t}`.includes(q.startsWith('#') ? q : `#${q}`));

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of active) for (const tag of note.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [active]);

  const visible = active.filter((n) => matches(n.body, n.tags) && (!tagFilter || n.tags.includes(tagFilter)));
  const binNotes =
    view === 'archive' || view === 'trash'
      ? notes.filter(
          (n) => n.status === (view === 'archive' ? 'archived' : 'trashed') && matches(n.body, n.tags),
        )
      : [];

  const noteBeingEdited = notes.find((n) => n.id === editingNote);
  const taskBeingEdited = tasks.find((t) => t.id === editingTask);
  const modalOpen = Boolean(noteBeingEdited || taskBeingEdited || showShortcuts);

  function go(next: View) {
    setView(next);
    setEditingNote(null);
  }

  function newNote() {
    setView('notes');
    setTimeout(() => composer.current?.focus(), 30);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false);
        else if (typing) target.blur();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!modalOpen && composer.current?.hasDraft()) {
          e.preventDefault();
          composer.current.submit();
        }
        return;
      }
      if (typing || modalOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (e.key === '/') {
        e.preventDefault();
        search.current?.focus();
      } else if (key === 'n') {
        e.preventDefault();
        newNote();
      } else if (key === 't') {
        e.preventDefault();
        setView('tasks');
        setTimeout(() => kanban.current?.focusNewTask(), 30);
      } else if (key === 'd') {
        setTheme(theme === 'dark' ? 'light' : 'dark');
      } else if (e.key === '?') {
        setShowShortcuts(true);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        go(VIEW_ORDER[Number(e.key) - 1] as View);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const loading = allNotes === undefined || allTasks === undefined;
  const viewCount = view === 'tasks' ? `${counts.tasks} open` : `${counts[view]} notes`;

  return (
    <div className={styles.shell}>
      {!mobile && (
        <Sidebar view={view} counts={counts} onSelect={go} onShortcuts={() => setShowShortcuts(true)} />
      )}

      <main className={styles.main}>
        <header className={styles.header}>
          {mobile ? (
            <>
              <div className={styles.mobileLogo}>Noted.</div>
              <span className={styles.flex} />
              <SyncStatus variant="pill" />
              <button
                type="button"
                className={styles.pillButton}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                type="button"
                className={styles.avatarButton}
                aria-label={session ? 'Profile' : 'Log in'}
                onClick={() => navigate(session ? 'profile' : 'login')}
              >
                {session ? <Avatar name={session.user.name} color={session.user.avatar} size={44} /> : '?'}
              </button>
            </>
          ) : (
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{VIEWS[view].title}</h1>
              <span className={styles.count}>{viewCount}</span>
            </div>
          )}
          {!mobile && <span className={styles.flex} />}
          <div className={styles.search}>
            <input
              ref={search}
              type="search"
              value={query}
              placeholder={view === 'tasks' ? 'Search tasks' : 'Search notes or #tags'}
              aria-label="Search"
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className={styles.clear}
                aria-label="Clear search"
                onClick={() => setQuery('')}
              >
                ×
              </button>
            ) : (
              !mobile && <kbd className={styles.slash}>/</kbd>
            )}
          </div>
        </header>

        {!loading && view === 'notes' && (
          <section className={styles.notes}>
            <CloudPrompt noteCount={notes.length} />
            <Composer ref={composer} tagFilter={tagFilter} />

            {tagCounts.length > 0 && (
              <div className={styles.chips}>
                <button
                  type="button"
                  className={styles.chip}
                  aria-pressed={!tagFilter}
                  onClick={() => setTagFilter(null)}
                >
                  All <span>{active.length}</span>
                </button>
                {tagCounts.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    className={styles.chip}
                    aria-pressed={tagFilter === tag}
                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  >
                    #{tag} <span>{count}</span>
                  </button>
                ))}
              </div>
            )}

            {visible.length > 0 && (
              <>
                <div className={styles.modeRow}>
                  <div className={styles.modes} role="radiogroup" aria-label="Board layout">
                    {(
                      [
                        ['free', 'Free', 'Place notes anywhere'],
                        ['grid', 'Grid', 'Arrange notes in a tidy grid'],
                      ] as const
                    ).map(([id, label, hint]) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        title={hint}
                        aria-checked={boardMode === id}
                        onClick={() => setBoardMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Board notes={visible} mode={boardMode} mobile={mobile} onOpen={setEditingNote} />
              </>
            )}

            {active.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>Nothing noted yet</div>
                <div className={styles.emptyText}>
                  Write something in the box above, or press <kbd>N</kbd> from anywhere.
                </div>
              </div>
            )}
            {active.length > 0 && visible.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyTitle}>
                  {q ? `No notes match “${query}”` : 'No notes with this tag'}
                </div>
                <div className={styles.emptyText}>Try a different word, or a tag like #work.</div>
                <button
                  type="button"
                  className={styles.clearFilters}
                  onClick={() => {
                    setQuery('');
                    setTagFilter(null);
                  }}
                >
                  Clear search
                </button>
              </div>
            )}
          </section>
        )}

        {!loading && view === 'tasks' && (
          <Kanban ref={kanban} tasks={tasks} query={query} onOpen={setEditingTask} />
        )}
        {!loading && (view === 'archive' || view === 'trash') && (
          <BinView kind={view} notes={binNotes} query={q} />
        )}
      </main>

      {mobile && (
        <>
          <MobileNav view={view} counts={counts} onSelect={go} />
          {view === 'notes' && (
            <button type="button" className={styles.fab} aria-label="New note" onClick={newNote}>
              +
            </button>
          )}
        </>
      )}

      {noteBeingEdited && (
        <NoteEditor key={noteBeingEdited.id} note={noteBeingEdited} onClose={() => setEditingNote(null)} />
      )}
      {taskBeingEdited && (
        <TaskEditor key={taskBeingEdited.id} task={taskBeingEdited} onClose={() => setEditingTask(null)} />
      )}
      {showShortcuts && <ShortcutsDialog onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
