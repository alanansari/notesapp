import { NOTE_COLORS, type NoteColor } from '@noted/shared';
import styles from './ColorPicker.module.css';

export function ColorPicker({ value, onChange }: { value: NoteColor; onChange: (color: NoteColor) => void }) {
  return (
    <div className={styles.row} role="radiogroup" aria-label="Note colour">
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={color}
          title={color}
          className={styles.swatch}
          style={{ background: `var(--note-${color})` }}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  );
}
