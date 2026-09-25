import { useState } from 'react';
import { cleanTag } from '../lib/format';
import styles from './TagInput.module.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  pending?: string;
  onPendingChange?: (value: string) => void;
  tone?: 'note' | 'composer';
}

export function TagInput({ tags, onChange, pending, onPendingChange, tone = 'note' }: TagInputProps) {
  const [local, setLocal] = useState('');
  const value = pending ?? local;
  const setValue = onPendingChange ?? setLocal;

  return (
    <div className={styles.row} data-tone={tone}>
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={styles.tag}
          aria-label={`Remove tag ${tag}`}
          onClick={() => onChange(tags.filter((t) => t !== tag))}
        >
          #{tag} ×
        </button>
      ))}
      <input
        className={styles.input}
        value={value}
        placeholder="Add tag…"
        aria-label="Add tag"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = cleanTag(value);
            if (tag && !tags.includes(tag)) onChange([...tags, tag]);
            setValue('');
          } else if (e.key === 'Backspace' && !value && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
      />
    </div>
  );
}
