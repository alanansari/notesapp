import type { ReactNode } from 'react';
import styles from './markdown.module.css';

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let index = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const k = `${key}-${index++}`;
    if (token.startsWith('**')) out.push(<strong key={k}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) out.push(<code key={k}>{token.slice(1, -1)}</code>);
    else out.push(<em key={k}>{token.slice(1, -1)}</em>);
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ body, onToggle }: { body: string; onToggle?: (line: number) => void }) {
  return (
    <div className={styles.root}>
      {body.split('\n').map((line, i) => {
        const heading = line.match(/^(#{1,3})\s+(.*)/);
        if (heading) {
          return (
            <div key={i} className={heading[1]?.length === 1 ? styles.h1 : styles.h2}>
              {inline(heading[2] ?? '', String(i))}
            </div>
          );
        }
        const check = line.match(/^- \[( |x)\]\s?(.*)/i);
        if (check) {
          const done = check[1]?.toLowerCase() === 'x';
          return (
            <div key={i} className={styles.row}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                className={styles.checkbox}
                data-done={done}
                disabled={!onToggle}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle?.(i);
                }}
              >
                {done ? '✓' : ''}
              </button>
              <span className={done ? styles.done : undefined}>{inline(check[2] ?? '', String(i))}</span>
            </div>
          );
        }
        const bullet = line.match(/^[-*]\s+(.*)/);
        if (bullet) {
          return (
            <div key={i} className={styles.row}>
              <span className={styles.bullet}>•</span>
              <span>{inline(bullet[1] ?? '', String(i))}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className={styles.gap} />;
        return <div key={i}>{inline(line, String(i))}</div>;
      })}
    </div>
  );
}
