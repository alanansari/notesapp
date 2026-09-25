import type { LocalNote } from '@noted/core';
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useClient } from '../../lib/context';
import { formatDate, isLongNote } from '../../lib/format';
import { Markdown } from '../../lib/markdown';
import type { BoardMode } from '../../lib/preferences';
import styles from './Board.module.css';

interface BoardProps {
  notes: LocalNote[];
  mode: BoardMode;
  mobile: boolean;
  onOpen: (id: string) => void;
}

interface Point {
  x: number;
  y: number;
}

function estimateHeight(note: LocalNote, mobile: boolean): number {
  const perLine = mobile ? 16 : 26;
  const lines = note.body.split('\n').reduce((sum, l) => sum + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return Math.max(mobile ? 150 : 200, Math.min(mobile ? 180 : 230, lines * (mobile ? 20 : 23)) + 96);
}

export function Board({ notes, mode, mobile, onOpen }: BoardProps) {
  const client = useClient();
  const canvas = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<(Point & { id: string }) | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const positions = useRef<Record<string, Point>>({});
  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    observer.current = new ResizeObserver((entries) => {
      setHeights((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.nid;
          const h = Math.round(entry.borderBoxSize[0]?.blockSize ?? 0);
          if (id && h && next[id] !== h) {
            next[id] = h;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
    return () => {
      ro.disconnect();
      observer.current?.disconnect();
    };
  }, []);

  const observe = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    observer.current?.observe(el);
    return () => observer.current?.unobserve(el);
  }, []);

  const cardWidth = mobile ? Math.max(140, Math.floor((width - 12) / 2)) : 260;
  const gap = mobile ? 12 : 22;
  const heightOf = (note: LocalNote) => heights[note.id] ?? estimateHeight(note, mobile);

  const columns = Math.max(1, Math.floor((width + gap) / (cardWidth + gap)));
  const columnHeights = new Array<number>(columns).fill(0);
  const layout: Record<string, Point> = {};
  for (const note of notes) {
    if (mode === 'free' && note.x !== null && note.y !== null) {
      layout[note.id] = { x: Math.min(note.x, Math.max(0, width - cardWidth)), y: note.y };
      continue;
    }
    const col = columnHeights.indexOf(Math.min(...columnHeights));
    layout[note.id] = { x: col * (cardWidth + gap), y: columnHeights[col] ?? 0 };
    columnHeights[col] = (columnHeights[col] ?? 0) + heightOf(note) + gap;
  }
  positions.current = layout;

  const draggedNote = drag ? notes.find((n) => n.id === drag.id) : undefined;
  const canvasHeight = Math.max(
    480,
    ...notes.map((n) => (layout[n.id]?.y ?? 0) + heightOf(n) + 40),
    drag && draggedNote ? drag.y + heightOf(draggedNote) + 40 : 0,
  );

  function startDrag(event: ReactPointerEvent, note: LocalNote, origin: Point) {
    if (event.button !== 0) return;
    const start = { px: event.clientX, py: event.clientY, moved: false };
    let current: Point = origin;

    const move = (e: PointerEvent) => {
      const dx = e.clientX - start.px;
      const dy = e.clientY - start.py;
      if (!start.moved && Math.hypot(dx, dy) < 5) return;
      start.moved = true;
      current = { x: Math.max(0, Math.min(width - cardWidth, origin.x + dx)), y: Math.max(0, origin.y + dy) };
      setDrag({ id: note.id, ...current });
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      if (!start.moved) return onOpen(note.id);

      if (mode === 'grid') {
        const cx = current.x + cardWidth / 2;
        const cy = current.y + 60;
        let best: string | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const [id, p] of Object.entries(positions.current)) {
          if (id === note.id) continue;
          const distance = Math.hypot(p.x + cardWidth / 2 - cx, p.y + 60 - cy);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = id;
          }
        }
        if (best) void client.notes.moveBefore(note.id, best, notes);
        return;
      }

      const frozen = notes
        .filter((n) => n.id !== note.id && n.x === null && positions.current[n.id])
        .map((n) => ({ id: n.id, patch: positions.current[n.id] as Point }));
      void client.notes.patchMany([{ id: note.id, patch: current }, ...frozen]);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  return (
    <div ref={canvas} className={styles.canvas} style={{ height: canvasHeight }}>
      {notes.map((note) => {
        const dragging = drag?.id === note.id;
        const pos = dragging ? drag : (layout[note.id] ?? { x: 0, y: 0 });
        const long =
          isLongNote(note.body) || (mobile && (note.body.length > 120 || note.body.split('\n').length > 6));
        return (
          <div
            key={note.id}
            ref={observe}
            data-nid={note.id}
            role="button"
            tabIndex={0}
            aria-label="Open note"
            className={styles.card}
            data-dragging={dragging}
            style={{
              left: Math.round(pos.x),
              top: Math.round(pos.y),
              zIndex: dragging ? 9999 : note.z + 1000,
              width: cardWidth,
              background: `var(--note-${note.color})`,
              ['--card-bg' as string]: `var(--note-${note.color})`,
            }}
            onPointerDown={(e) => startDrag(e, note, pos)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(note.id);
            }}
            onMouseEnter={() => setHover(note.id)}
            onMouseLeave={() => setHover((h) => (h === note.id ? null : h))}
          >
            <div className={styles.tools} data-visible={mobile || hover === note.id}>
              {mode === 'free' && (
                <>
                  <button
                    type="button"
                    title="Bring to front"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => void client.notes.bringToFront(note.id)}
                  >
                    ↑ Front
                  </button>
                  <button
                    type="button"
                    title="Send to back"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => void client.notes.sendToBack(note.id)}
                  >
                    ↓ Back
                  </button>
                </>
              )}
            </div>
            <div className={styles.content}>
              <Markdown
                body={note.body}
                onToggle={(line) => void client.notes.toggleChecklistLine(note.id, line)}
              />
              {long && <div className={styles.fade} />}
            </div>
            <div className={styles.meta}>
              {note.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
              <span className={styles.flex} />
              {long && <span>Read more</span>}
              <span>{formatDate(note.updatedAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
