'use client';

import { useState } from 'react';
import styles from './landing.module.css';

const FAQS: [question: string, answer: string][] = [
  ['Is Noted free?', 'Yes. You can create notes and tasks for free on the web and desktop apps.'],
  [
    'Do I need an account?',
    'No. Noted works right away and saves everything on your device. Create a free account when you want a cloud backup and your notes on every device.',
  ],
  [
    'Does Noted work offline?',
    'Yes. Notes and tasks are saved on your device first, so you can keep writing without a connection. Changes sync automatically when you reconnect.',
  ],
  [
    'Can I use Noted in the browser?',
    'Yes. Noted runs in any modern browser. Sign in with the same account on the desktop app and your notes are already there.',
  ],
  ['Which systems does the desktop app support?', 'The desktop app is available for macOS and Windows.'],
  [
    'What happens to deleted notes?',
    'Deleted notes go to Trash first, where you can restore them. Archive lets you hide notes from your board without deleting them.',
  ],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={styles.faqList}>
      {FAQS.map(([question, answer], i) => (
        <div key={question} className={styles.faqItem}>
          <button
            type="button"
            className={styles.faqQuestion}
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{question}</span>
            <span className={styles.faqIcon} aria-hidden>
              +
            </span>
          </button>
          {open === i && <div className={styles.faqAnswer}>{answer}</div>}
        </div>
      ))}
    </div>
  );
}
