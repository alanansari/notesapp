import Link from 'next/link';
import { DownloadCta, DownloadProvider, PlatformCards } from './_landing/downloads';
import { Faq } from './_landing/Faq';
import { HeaderActions } from './_landing/HeaderActions';
import styles from './_landing/landing.module.css';

const PILLARS = [
  {
    title: 'Sticky notes',
    body: 'A board of colourful notes you can drag anywhere or snap into a grid.',
    tint: '#EDE9A6',
  },
  {
    title: 'Tasks',
    body: 'A four-column kanban from Backlog to Done, right beside your notes.',
    tint: '#C5ECF6',
  },
  { title: 'Search & tags', body: 'Find any note instantly and filter your board by tag.', tint: '#F5D4DB' },
  {
    title: 'Works offline',
    body: 'Everything is saved on your device and syncs when you reconnect.',
    tint: '#D6EAC3',
  },
];

const KANBAN = [
  { label: 'Backlog', dot: '#B9A9EC', items: ['Offline mode', 'Sync API'], done: false },
  { label: 'To do', dot: '#F2C94C', items: ['Release notes', 'Book dentist'], done: false },
  { label: 'Doing', dot: '#56B8EA', items: ['Settings page'], done: false },
  { label: 'Done', dot: '#6FCF97', items: ['Ship v2.3', 'Passport'], done: true },
];

const SHORTCUTS = [
  { keys: 'N', label: 'New note' },
  { keys: 'T', label: 'New task' },
  { keys: '/', label: 'Search' },
  { keys: '⌘ ↵', label: 'Save note' },
  { keys: '1–4', label: 'Switch view' },
  { keys: 'D', label: 'Dark mode' },
];

const OFFLINE = [
  {
    title: 'Saved on your device',
    body: 'Every edit is stored locally the instant you make it.',
    dot: '#86CFFA',
  },
  {
    title: 'No account needed',
    body: 'Start writing right away. Sign up only when you want a cloud backup.',
    dot: '#F5D4DB',
  },
  {
    title: 'Syncs when you reconnect',
    body: 'Changes made offline upload automatically once you’re back online.',
    dot: '#6FCF97',
  },
  {
    title: 'Search without a signal',
    body: 'Search, tags and filters all run on your device.',
    dot: '#F2C94C',
  },
];

const TAGS = ['#work', '#ideas', '#home', '#reading'];

const Check = () => (
  <span className={styles.check} aria-hidden>
    ✓
  </span>
);

export default function LandingPage() {
  return (
    <DownloadProvider>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <a href="#top" className={styles.brand}>
              Noted.
            </a>
            <nav className={styles.nav} aria-label="Sections">
              <a href="#features">Features</a>
              <a href="#offline">Offline</a>
              <a href="#everywhere">Download</a>
              <a href="#faq">FAQ</a>
            </nav>
            <HeaderActions />
          </div>
        </header>

        <main>
          <section id="top" className={styles.hero}>
            <span className={styles.pill}>
              <span className={styles.pillDot} />
              Now with offline support
            </span>
            <h1 className={styles.heroTitle}>Your notes and tasks, in one calm place.</h1>
            <p className={styles.heroLead}>
              Noted puts sticky notes and a simple kanban side by side. Jot something down, drag it where it
              belongs, and find it again in a keystroke, online or off.
            </p>
            <div className={styles.heroActions}>
              <DownloadCta variant="hero" />
              <Link href="/app" className={styles.ctaSecondary}>
                Open in browser <span aria-hidden>→</span>
              </Link>
            </div>

            <div className={styles.preview} aria-hidden>
              <div className={styles.windowBar}>
                <span style={{ background: '#F2A7A0' }} />
                <span style={{ background: '#F2D38C' }} />
                <span style={{ background: '#A9DDB0' }} />
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewSide}>
                  <div className={styles.previewLogo}>Noted.</div>
                  <div className={styles.previewNav} data-active="true">
                    <span>Sticky Notes</span>
                    <small>7</small>
                  </div>
                  <div className={styles.previewNav}>
                    <span>Tasks</span>
                    <small>7</small>
                  </div>
                  <div className={styles.previewNav} data-muted="true">
                    Archive
                  </div>
                  <div className={styles.previewNav} data-muted="true">
                    Trash
                  </div>
                </div>
                <div className={styles.previewMain}>
                  <div className={styles.previewComposer}>
                    <div>Make a note…</div>
                    <div />
                  </div>
                  <div className={styles.previewBoard}>
                    <div
                      className={styles.mini}
                      style={{ left: 0, top: 0, width: 210, background: '#EDE9A6' }}
                    >
                      <div className={styles.miniTitle}>Q4 planning</div>
                      <div>☑ Draft roadmap</div>
                      <div>☐ Review with Priya</div>
                      <div>☐ Budget sign-off</div>
                      <div className={styles.miniTag}>#work</div>
                    </div>
                    <div
                      className={styles.mini}
                      data-lifted="true"
                      style={{ left: 230, top: 26, width: 200, background: '#C5ECF6' }}
                    >
                      Habit tracker that asks one question a day. <em>Keep it tiny.</em>
                      <div className={styles.miniTag}>#ideas</div>
                    </div>
                    <div
                      className={styles.mini}
                      style={{ left: 450, top: 0, width: 200, background: '#F5D4DB' }}
                    >
                      <div className={styles.miniTitle}>To read</div>
                      <div>• Shape Up</div>
                      <div>• A Pattern Language</div>
                    </div>
                    <div
                      className={styles.mini}
                      style={{ left: 120, top: 190, width: 210, background: '#D6EAC3' }}
                    >
                      <div className={styles.miniTitle}>Groceries</div>
                      <div>☐ Oat milk</div>
                      <div>☑ Lemons</div>
                    </div>
                    <div
                      className={styles.mini}
                      style={{ left: 480, top: 170, width: 190, background: '#DDD9F3' }}
                    >
                      Call mum on Sunday.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.pillars}>
              {PILLARS.map((p) => (
                <div key={p.title} className={styles.pillarCard}>
                  <span className={styles.pillarTint} style={{ background: p.tint }} />
                  <div className={styles.pillarTitle}>{p.title}</div>
                  <div className={styles.pillarBody}>{p.body}</div>
                </div>
              ))}
            </div>
          </section>

          <div id="features" />

          <section className={styles.split} style={{ paddingTop: 88 }}>
            <div className={styles.copy}>
              <span className={styles.eyebrow}>Freeform</span>
              <h2 className={styles.h2}>Put notes where your thinking goes.</h2>
              <p className={styles.lead}>
                Drag sticky notes anywhere on the board, pull one to the front, or push it behind the rest.
                When it gets busy, switch to Grid and everything lines up.
              </p>
              <ul className={styles.checks}>
                <li>
                  <Check />
                  Free and Grid layouts, one toggle apart
                </li>
                <li>
                  <Check />
                  Bring to front and send to back
                </li>
                <li>
                  <Check />
                  Six soft colours to sort at a glance
                </li>
              </ul>
            </div>
            <div className={styles.freeformArt} aria-hidden>
              <div className={styles.dots} />
              <div
                className={styles.art}
                style={{ left: '8%', top: '12%', width: '44%', background: '#F5DCC0' }}
              >
                Interview notes: Sam R.<div className={styles.artSub}>Strong on frontend architecture…</div>
              </div>
              <div
                className={styles.art}
                data-lifted="true"
                style={{ left: '38%', top: '34%', width: '44%', background: '#EDE9A6' }}
              >
                <div className={styles.artTools}>
                  <span>↑ Front</span>
                  <span>↓ Back</span>
                </div>
                Launch checklist<div className={styles.artSub}>☑ Copy · ☐ Screens · ☐ QA</div>
              </div>
              <div
                className={styles.art}
                style={{ left: '14%', top: '64%', width: '36%', background: '#D6EAC3' }}
              >
                Weekend at the lake
              </div>
              <div className={styles.segmented}>
                <span data-active="true">Free</span>
                <span>Grid</span>
              </div>
            </div>
          </section>

          <section className={styles.split}>
            <div className={styles.kanbanArt} aria-hidden>
              {KANBAN.map((col) => (
                <div key={col.label} className={styles.kanbanCol}>
                  <div className={styles.kanbanHead}>
                    <span style={{ background: col.dot }} />
                    <span>{col.label}</span>
                  </div>
                  {col.items.map((item) => (
                    <div key={item} className={styles.kanbanCard} data-done={col.done}>
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className={styles.copy}>
              <span className={styles.eyebrow}>Organized</span>
              <h2 className={styles.h2}>A kanban for everything that needs doing.</h2>
              <p className={styles.lead}>
                Tasks live next to your notes, across Backlog, To do, Doing and Done. Drag a card to move it,
                or open it to rename it and change its status.
              </p>
              <div className={styles.featureGrid}>
                <span>Drag between columns</span>
                <span>Quick edit pop-up</span>
                <span>One-click done</span>
                <span>Undo on delete</span>
              </div>
            </div>
          </section>

          <section className={styles.split}>
            <div className={styles.copy}>
              <span className={styles.eyebrow}>Findable</span>
              <h2 className={styles.h2}>Find anything in a keystroke.</h2>
              <p className={styles.lead}>
                Search every note and task as you type, filter by tag, and keep your hands on the keyboard.
                Write in Markdown with headings, lists and checkboxes you can tick right on the card.
              </p>
              <div className={styles.tags}>
                <span data-active="true">All</span>
                {TAGS.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className={styles.shortcuts}>
              <div className={styles.shortcutsTitle}>Keyboard shortcuts</div>
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className={styles.shortcut}>
                  <span>{s.label}</span>
                  <kbd>{s.keys}</kbd>
                </div>
              ))}
            </div>
          </section>

          <section id="offline" className={styles.offlineWrap}>
            <div className={styles.offline}>
              <div className={styles.copy}>
                <span className={styles.eyebrow} data-tone="dark">
                  Offline
                </span>
                <h2 className={styles.h2}>Keeps working when the Wi-Fi doesn’t.</h2>
                <p className={styles.lead} data-tone="dark">
                  Every note and task is saved on your device first. Write on a plane, plan on the train, and
                  Noted syncs everything the moment you’re back online.
                </p>
              </div>
              <div className={styles.offlineList}>
                {OFFLINE.map((o) => (
                  <div key={o.title} className={styles.offlineItem}>
                    <span style={{ background: o.dot }} />
                    <div>
                      <strong>{o.title}</strong>
                      <p>{o.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="everywhere" className={styles.everywhere}>
            <div className={styles.centerCopy}>
              <span className={styles.eyebrow}>Everywhere</span>
              <h2 className={styles.h2}>On the web and on your desktop.</h2>
              <p className={styles.lead}>
                Use Noted in any modern browser, or install the desktop app for macOS and Windows. Same
                account, same notes, everywhere.
              </p>
            </div>
            <PlatformCards />
          </section>

          <section id="faq" className={styles.faq}>
            <h2 className={styles.h2}>Frequently asked questions</h2>
            <Faq />
          </section>

          <section className={styles.section} style={{ paddingTop: 120 }}>
            <div className={styles.final}>
              <h2>Start noting.</h2>
              <p>Free to start. No account needed. Pick up on any device where you left off.</p>
              <DownloadCta variant="final" />
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <span>Noted.</span>
            <small>© {new Date().getFullYear()} Noted. All rights reserved.</small>
          </div>
          <div className={styles.footerCols}>
            <div>
              <span>Product</span>
              <a href="#features">Features</a>
              <a href="#offline">Offline</a>
              <a href="#everywhere">Download</a>
            </div>
            <div>
              <span>Account</span>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Sign up</Link>
              <Link href="/profile">Profile</Link>
            </div>
          </div>
        </footer>
      </div>
    </DownloadProvider>
  );
}
