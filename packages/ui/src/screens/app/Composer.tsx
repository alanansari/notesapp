import type { NoteColor } from '@noted/shared';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { ColorPicker } from '../../components/ColorPicker';
import { TagInput } from '../../components/TagInput';
import { useClient } from '../../lib/context';
import { cleanTag } from '../../lib/format';
import styles from './Composer.module.css';

export interface ComposerHandle {
  focus: () => void;
  submit: () => void;
  hasDraft: () => boolean;
}

export function Composer({ ref, tagFilter }: { ref: Ref<ComposerHandle>; tagFilter: string | null }) {
  const { notes } = useClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [color, setColor] = useState<NoteColor>('yellow');
  const [tags, setTags] = useState<string[]>([]);
  const [pendingTag, setPendingTag] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    const all = [...tags, cleanTag(pendingTag), ...(tagFilter ? [tagFilter] : [])].filter(Boolean);
    await notes.create({ body: text, color, tags: [...new Set(all)] });
    setBody('');
    setTags([]);
    setPendingTag('');
    setOpen(false);
    textarea.current?.blur();
  }

  useImperativeHandle(ref, () => ({
    focus: () => {
      setOpen(true);
      textarea.current?.focus();
    },
    submit: () => void submit(),
    hasDraft: () => body.trim().length > 0,
  }));

  return (
    <div
      className={styles.composer}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !body) setOpen(false);
      }}
    >
      <div className={styles.inputRow}>
        <textarea
          ref={textarea}
          className={styles.textarea}
          value={body}
          rows={open ? 4 : 1}
          placeholder="Make a note…"
          aria-label="New note"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setBody(e.target.value);
            setOpen(true);
          }}
        />
        <button
          type="button"
          className={styles.send}
          title="Add note (⌘↵)"
          aria-label="Add note"
          disabled={!body.trim()}
          onClick={() => void submit()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {open && (
        <div className={styles.options}>
          <ColorPicker value={color} onChange={setColor} />
          <TagInput
            tone="composer"
            tags={tags}
            onChange={setTags}
            pending={pendingTag}
            onPendingChange={setPendingTag}
          />
          <span className={styles.hint}>⌘↵ to save · Markdown supported</span>
        </div>
      )}
    </div>
  );
}
