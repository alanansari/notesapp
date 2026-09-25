import { Modal } from '../../components/Modal';
import styles from './ShortcutsDialog.module.css';

export const SHORTCUTS = [
  { keys: 'N', label: 'New note' },
  { keys: 'T', label: 'New task' },
  { keys: '/', label: 'Search' },
  { keys: '⌘ ↵', label: 'Save note' },
  { keys: '1–4', label: 'Switch view' },
  { keys: 'D', label: 'Toggle dark mode' },
  { keys: 'Esc', label: 'Close' },
  { keys: '?', label: 'This list' },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Keyboard shortcuts" onClose={onClose} className={styles.dialog}>
      <div className={styles.title}>Keyboard shortcuts</div>
      {SHORTCUTS.map((s) => (
        <div key={s.keys} className={styles.row}>
          <span>{s.label}</span>
          <kbd>{s.keys}</kbd>
        </div>
      ))}
    </Modal>
  );
}
