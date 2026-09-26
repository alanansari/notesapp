export type View = 'notes' | 'tasks' | 'trash';

export const VIEWS: Record<View, { title: string; short: string }> = {
  notes: { title: 'Sticky Notes', short: 'Notes' },
  tasks: { title: 'Tasks', short: 'Tasks' },
  trash: { title: 'Trash', short: 'Trash' },
};

export const VIEW_ORDER: View[] = ['notes', 'tasks', 'trash'];

export type Counts = Record<View, number>;
