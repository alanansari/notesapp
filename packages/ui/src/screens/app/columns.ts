import type { TaskColumn } from '@noted/shared';

export const COLUMNS: { id: TaskColumn; label: string; dot: string; empty: string }[] = [
  { id: 'backlog', label: 'Backlog', dot: '#B9A9EC', empty: 'Park someday tasks here.' },
  { id: 'todo', label: 'To do', dot: '#F2C94C', empty: 'Nothing to do. Add a task below.' },
  { id: 'doing', label: 'Doing', dot: '#56B8EA', empty: 'Drag a task here when you start it.' },
  { id: 'done', label: 'Done', dot: '#6FCF97', empty: 'Finished tasks land here.' },
];
