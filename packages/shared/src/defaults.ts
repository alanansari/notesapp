import type { Note, Task } from './entities.js';

// Guests are nudged to sign up; accounts get the same starter board without that pitch.
export type DefaultsAudience = 'guest' | 'account';

export interface DefaultWorkspace {
  notes: Note[];
  tasks: Task[];
}

export function defaultWorkspace(
  audience: DefaultsAudience,
  newId: () => string,
  now: number,
): DefaultWorkspace {
  const base = { createdAt: now, updatedAt: now, deletedAt: null };
  const guest = audience === 'guest';

  const notes: Note[] = [
    {
      ...base,
      x: null,
      y: null,
      id: newId(),
      body: `# Welcome to Noted\n- [x] Open Noted\n- [ ] Write your first note\n- [ ] Drag this card somewhere new\n\n${
        guest
          ? 'Everything you write is saved on this device, even offline.'
          : 'Everything you write is saved offline and synced to your account.'
      }`,
      color: 'yellow',
      tags: ['start'],
      status: 'active',
      order: 0,
      z: 3,
    },
    {
      ...base,
      x: null,
      y: null,
      id: newId(),
      body: 'Press `N` for a new note, `/` to search and `?` for every shortcut.',
      color: 'cyan',
      tags: ['tips'],
      status: 'active',
      order: 1,
      z: 2,
    },
    {
      ...base,
      x: null,
      y: null,
      id: newId(),
      body: guest
        ? '# Back up your notes\nCreate a free account to keep everything in the cloud and pick up where you left off on the web, macOS and Windows.'
        : '# Your notes follow you\nLog in on the web, macOS or Windows and pick up right where you left off.',
      color: 'green',
      tags: ['tips'],
      status: 'active',
      order: 2,
      z: 1,
    },
  ];

  const tasks: Task[] = [
    guest
      ? { ...base, id: newId(), title: 'Sign up to sync across devices', column: 'backlog', order: 0 }
      : { ...base, id: newId(), title: 'Log in on another device', column: 'backlog', order: 0 },
    { ...base, id: newId(), title: 'Drag this task to Doing', column: 'todo', order: 0 },
    { ...base, id: newId(), title: 'Open Noted for the first time', column: 'done', order: 0 },
  ];

  return { notes, tasks };
}
