export type View = 'notes' | 'tasks' | 'archive' | 'trash';

export const VIEWS: Record<View, { title: string; short: string }> = {
  notes: { title: 'Sticky Notes', short: 'Notes' },
  tasks: { title: 'Tasks', short: 'Tasks' },
  archive: { title: 'Archive', short: 'Archive' },
  trash: { title: 'Trash', short: 'Trash' },
};

export const VIEW_ORDER: View[] = ['notes', 'tasks', 'archive', 'trash'];

export type Counts = Record<View, number>;
