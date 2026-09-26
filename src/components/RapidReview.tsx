/**
 * Rapid review: flashcard-style recall practice across every module.
 * Read the question, say your answer OUT LOUD, then reveal a tight
 * ~30-second model answer, with a short TypeScript snippet where it
 * helps. Purely static: the bank lives in src/lib/review.ts, no AI,
 * no network, nothing saved anywhere.
 */
import { useMemo, useState } from 'react'
import { useRoute } from '../router'
import { getModule, moduleNumber, SECTIONS, modulesBySection } from '../modules/registry'
import { getReview, type ReviewCard } from '../lib/review'
import { CodeBlock } from './ui'

type Card = { moduleId: string; card: ReviewCard }

/** One flashcard at a time: question, say-it-out-loud pause, reveal. */
function Player({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [perm, setPerm] = useState<number[] | null>(null)

  if (cards.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-border bg-surface p-6 text-center text-sm text-ink-muted">
        No cards here yet.
      </p>
    )
  }

  const pos = i % cards.length
  const { moduleId, card } = cards[perm ? perm[pos] : pos]
  const meta = getModule(moduleId)!
  const go = (delta: number) => {
    setI((v) => (v + delta + cards.length) % cards.length)
    setRevealed(false)
  }
  const shuffle = () => {
    if (perm) {
      setPerm(null)
    } else {
      const p = cards.map((_, n) => n)
      for (let n = p.length - 1; n > 0; n--) {
        const j = Math.floor(Math.random() * (n + 1))
        ;[p[n], p[j]] = [p[j], p[n]]
      }
      setPerm(p)
    }
    setI(0)
    setRevealed(false)
  }

  const chip =
    'flex min-h-11 items-center rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:border-accent/50 hover:text-accent active:scale-[0.98]'

  return (
    <section className="mt-8 rounded-xl border border-accent/25 bg-accent/5 p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-ink-muted">
        <span>
          {pos + 1} / {cards.length}
          {perm ? ' (shuffled)' : ''}
        </span>
        <span>
          Module {moduleNumber(meta)}, {meta.title}
        </span>
      </div>

      <p className="mt-4 text-lg font-semibold leading-7 text-ink">{card.q}</p>

      {!revealed ? (
        <div className="mt-5">
          <p className="text-sm text-ink-muted">
            Say your answer out loud first, as if explaining it to a colleague. Then check yourself.
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="mt-3 min-h-11 w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/85 active:scale-[0.98] sm:w-auto"
          >
            Reveal answer
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm leading-6 text-ink/90">
            {card.a}
          </div>
          {card.code && <CodeBlock language="typescript" filename="snippet.ts" code={card.code} />}
          <a
            href={`/modules/${moduleId}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Open the full module ({moduleNumber(meta)}, {meta.title}) →
          </a>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => go(-1)} className={chip} aria-label="Previous card">
          ← Prev
        </button>
        <button onClick={() => go(1)} className={chip} aria-label="Next card">
          Next →
        </button>
        <button onClick={shuffle} className={chip}>
          {perm ? '↺ Original order' : '⇄ Shuffle'}
        </button>
      </div>
    </section>
  )
}

/**
 * Cross-cutting review page. Deep links: /review?module=<id> jumps straight
 * to one module's cards (the entry point on every module page).
 */
export default function RapidReview() {
  const route = useRoute()
  const deepModule = new URLSearchParams(route.search).get('module')
  const deepMeta = deepModule ? getModule(deepModule) : undefined
  const [sectionFilter, setSectionFilter] = useState('all')
  // Static whole-trek count for the header copy, computed once
  const totalCards = useMemo(() => {
    let n = 0
    for (const s of SECTIONS) for (const m of modulesBySection(s.id)) n += getReview(m.id).length
    return n
  }, [])

  const cards = useMemo<Card[]>(() => {
    if (deepMeta) return getReview(deepMeta.id).map((card) => ({ moduleId: deepMeta.id, card }))
    const pool = sectionFilter === 'all' ? SECTIONS : SECTIONS.filter((s) => s.id === sectionFilter)
    const out: Card[] = []
    for (const s of pool)
      for (const m of modulesBySection(s.id))
        for (const card of getReview(m.id)) out.push({ moduleId: m.id, card })
    return out
  }, [deepMeta, sectionFilter])

  const filterKey = deepMeta ? `module:${deepMeta.id}` : `section:${sectionFilter}`

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Rapid review</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          {totalCards} questions across the whole trek. Read one, say your answer out loud, then reveal
          a tight model answer. Recalling beats rereading: it is the fastest way to find out what
          you actually know.
        </p>
      </header>

      {deepMeta ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <span className="text-ink-muted">
            Filtered to <span className="font-medium text-ink">{deepMeta.title}</span>
          </span>
          <a
            href="/review"
            className="ml-auto min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent/50 hover:text-accent"
          >
            Show all sections
          </a>
        </div>
      ) : (
        <nav aria-label="Filter by section" className="mt-6 flex flex-wrap gap-2">
          {[{ id: 'all', title: 'All sections' }, ...SECTIONS].map((s) => (
            <button
              key={s.id}
              onClick={() => setSectionFilter(s.id)}
              aria-pressed={sectionFilter === s.id}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sectionFilter === s.id
                  ? 'border-accent/60 bg-accent/10 text-accent'
                  : 'border-border text-ink-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>
      )}

      {/* Keyed by filter so card position and reveals reset on filter change */}
      <Player key={filterKey} cards={cards} />
    </main>
  )
}
