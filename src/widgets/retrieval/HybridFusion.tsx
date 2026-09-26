/**
 * HybridFusion, two live rankers over one tiny corpus:
 *  · BM25 (real, from src/lib/bm25.ts), loves exact keyword repetition
 *  · a toy concept-embedder (honest stand-in for dense retrieval), loves
 *    meaning-level overlap via a visible concept table
 * Their ranks disagree; reciprocal rank fusion merges them live, with the
 * 1/(k + rank) arithmetic shown per document as the animation reveals it.
 */
import { useEffect, useMemo, useState } from 'react'
import { buildIndex, scoreAll } from '../../lib/bm25'
import { cosineSimilarity, gaussian, seededRandom } from '../../lib/math'
import { Slider } from '../../components/ui'
import { Pill, ScoreBar, hashString } from './shared'

type Doc = { id: string; title: string; text: string }

const QUERY = 'forgot my login password'

const DOCS: Doc[] = [
  {
    id: 'd1',
    title: 'Sign-in troubleshooting',
    text: 'Cannot sign in? Authentication failures mean wrong or expired credentials. Reset your password to fix access.',
  },
  {
    id: 'd2',
    title: 'Audit log',
    text: 'Every login attempt is written to the log. Failed logins are flagged and shipped to the audit service nightly.',
  },
  {
    id: 'd3',
    title: 'Account billing',
    text: 'Your account invoice renews monthly. Update the billing card in settings to avoid service interruptions.',
  },
  {
    id: 'd4',
    title: 'Firewood logs',
    text: 'Seasoned birch logs burn slowly. Stack the logs bark-side up for a clean, steady fire.',
  },
  {
    id: 'd5',
    title: 'Password policy',
    text: 'A strong password expires yearly. Password managers generate and store strong passwords. Review the policy with HR annually.',
  },
  {
    id: 'd6',
    title: 'Login help',
    text: 'Reset a forgotten password and recover your login. Contact IT if your account stays locked out.',
  },
]

/** The toy model's whole "semantic knowledge", a visible concept table. */
const CONCEPTS: Record<string, string> = {
  forgot: 'auth', forgotten: 'auth', login: 'auth', logins: 'auth', password: 'auth',
  passwords: 'auth', sign: 'auth', cannot: 'auth', authentication: 'auth',
  credentials: 'auth', access: 'auth', reset: 'auth', locked: 'auth',
  log: 'logging', logs: 'logging', logging: 'logging', audit: 'logging',
  invoice: 'billing', billing: 'billing', payment: 'billing',
}

const STOPWORDS = new Set(['my', 'the', 'a', 'in', 'to', 'is', 'are', 'and', 'or', 'your', 'if', 'with', 'for', 'on', 'of'])

const DIMS = 384

function conceptVec(concept: string): number[] {
  const rand = seededRandom(hashString(`concept:${concept}`))
  return Array.from({ length: DIMS }, () => gaussian(rand))
}

function wordVec(word: string): number[] {
  const rand = seededRandom(hashString(`w:${word}`))
  return Array.from({ length: DIMS }, () => gaussian(rand))
}

/**
 * Toy dense embedding: each token contributes its concept vector plus half its
 * own word vector, same-concept tokens point the same way, word noise keeps
 * documents distinguishable. NOT a real semantic model; labeled as such in UI.
 */
function conceptEmbed(text: string): number[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const v = new Array<number>(DIMS).fill(0)
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue
    const c = CONCEPTS[t]
    const base = c ? conceptVec(c) : wordVec(t)
    const w = wordVec(t)
    for (let i = 0; i < DIMS; i++) v[i] += base[i] + 0.5 * w[i]
  }
  let norm = 0
  for (const x of v) norm += x * x
  const inv = 1 / (Math.sqrt(norm) + 1e-9)
  return v.map((x) => x * inv)
}

function ranksOf(ids: string[], score: (id: string) => number): Map<string, number> {
  const sorted = [...ids].sort((a, b) => score(b) - score(a))
  return new Map(sorted.map((id, i) => [id, i + 1]))
}

export default function HybridFusion() {
  const [k, setK] = useState(60)
  const [reveal, setReveal] = useState(0)
  const [playing, setPlaying] = useState(false)

  // BM25 ranks, real scoring
  const index = useMemo(() => buildIndex(DOCS), [])
  const bm25 = useMemo(() => scoreAll(index, QUERY, 1.2, 0.75), [index])
  const bm25Score = useMemo(() => new Map(bm25.map((r) => [r.doc.id, r.score])), [bm25])
  const bm25Rank = useMemo(() => ranksOf(DOCS.map((d) => d.id), (id) => bm25Score.get(id) ?? 0), [bm25Score])

  // Dense ranks, toy concept model
  const denseScore = useMemo(() => {
    const q = conceptEmbed(QUERY)
    return new Map(DOCS.map((d) => [d.id, cosineSimilarity(q, conceptEmbed(`${d.title} ${d.text}`))]))
  }, [])
  const denseRank = useMemo(() => ranksOf(DOCS.map((d) => d.id), (id) => denseScore.get(id) ?? 0), [denseScore])

  // Reciprocal rank fusion, live from the two rank lists
  const fused = useMemo(
    () =>
      DOCS.map((d) => ({
        doc: d,
        bm25Rank: bm25Rank.get(d.id) ?? 0,
        denseRank: denseRank.get(d.id) ?? 0,
        rrf: 1 / (k + (bm25Rank.get(d.id) ?? 0)) + 1 / (k + (denseRank.get(d.id) ?? 0)),
      })).sort((a, b) => b.rrf - a.rrf),
    [bm25Rank, denseRank, k],
  )
  const maxRrf = fused[0]?.rrf ?? 1

  useEffect(() => {
    if (!playing) return
    if (reveal >= fused.length) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setReveal((v) => v + 1), 600)
    return () => clearTimeout(t)
  }, [playing, reveal, fused.length])

  const shown = fused.slice(0, reveal)

  return (
    <div className="space-y-4 text-sm">
      <p className="text-xs text-ink-muted">
        Query: <span className="font-mono text-ink">“{QUERY}”</span>, BM25 ranks keyword hits; the toy
        dense model ranks concept overlap. Hover any doc to see why.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 text-xs font-semibold text-ink-muted">BM25 ranks <Pill>live</Pill></div>
          {bm25.map((r, i) => (
            <div key={r.doc.id} className="flex items-center gap-2 py-0.5 text-xs" title={r.doc.title}>
              <span className="font-mono text-ink-muted">#{i + 1}</span>
              <span className="font-mono text-accent">{r.doc.id}</span>
              <span className="min-w-0 flex-1 truncate text-ink/85">{r.doc.title}</span>
              <span className="font-mono text-ink">{r.score.toFixed(2)}</span>
            </div>
          ))}
          <p className="mt-2 text-[11px] text-ink-muted">
            “Password policy” wins on raw keyword count; the actual fix doc “Sign-in troubleshooting”
            barely places, BM25 can’t see that <em>login</em> ≈ <em>sign in</em> ≈ <em>authentication</em>.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 text-xs font-semibold text-ink-muted">Dense ranks <Pill tone="highlight">toy concept model</Pill></div>
          {[...denseScore.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id, s], i) => {
              const d = DOCS.find((x) => x.id === id)!
              return (
                <div key={id} className="flex items-center gap-2 py-0.5 text-xs" title={d.title}>
                  <span className="font-mono text-ink-muted">#{i + 1}</span>
                  <span className="font-mono text-accent">{id}</span>
                  <span className="min-w-0 flex-1 truncate text-ink/85">{d.title}</span>
                  <span className="font-mono text-ink">{s.toFixed(3)}</span>
                </div>
              )
            })}
          <p className="mt-2 text-[11px] text-ink-muted">
            Concept table (visible honesty): forgot/login/password/sign/authentication/credentials →
            <span className="font-mono"> auth</span>; log/logs/audit → <span className="font-mono">logging</span>.
            A real dense model learned equivalents from data.
          </p>
        </div>
      </div>

      {/* Fusion controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setReveal(0)
              setPlaying(true)
            }}
            aria-label="Run the reciprocal rank fusion animation"
            className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
          >
            ▶ Fuse
          </button>
          <button
            onClick={() => setReveal((v) => Math.min(v + 1, fused.length))}
            aria-label="Reveal one more fused document"
            className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
          >
            Step
          </button>
          <button
            onClick={() => {
              setReveal(0)
              setPlaying(false)
            }}
            aria-label="Reset the fusion animation"
            className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
        <div className="min-w-[220px] flex-1">
          <Slider label="k, rank dampener (paper default 60)" value={k} min={0} max={100} step={1} onChange={setK} format={(v) => String(v)} />
        </div>
      </div>

      {/* Fused ranking */}
      <div className="rounded-lg border border-border bg-surface-raised/40 p-3" aria-live="polite">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          RRF score = 1/(k + rank<sub>bm25</sub>) + 1/(k + rank<sub>dense</sub>)
        </div>
        {reveal === 0 && <p className="text-xs text-ink-muted">Press Fuse, documents appear in fused order, best first.</p>}
        <div className="space-y-1.5">
          {shown.map((f) => (
            <div key={f.doc.id} className="rounded-md border border-border bg-surface p-2">
              <ScoreBar
                label={`${f.doc.id} · ${f.doc.title}`}
                value={f.rrf}
                max={maxRrf}
                tone="success"
              />
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
                <Pill>bm25 #{f.bm25Rank}</Pill>
                <Pill>dense #{f.denseRank}</Pill>
                <span className="break-all font-mono">
                  1/({k}+{f.bm25Rank}) + 1/({k}+{f.denseRank}) = {(1 / (k + f.bm25Rank)).toFixed(4)} +{' '}
                  {(1 / (k + f.denseRank)).toFixed(4)} = {f.rrf.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {reveal >= fused.length && reveal > 0 && (
          <p className="mt-2 text-xs text-ink/85">
            Fusion lifted <span className="font-mono text-accent">d1</span> (Sign-in troubleshooting) above{' '}
            <span className="font-mono text-accent">d5</span> (Password policy): BM25 over-trusted keyword
            frequency, dense caught the intent, RRF lets both be partially right. Try k → 0: top ranks
            dominate; k → 100: the lists blur together.
          </p>
        )}
      </div>
    </div>
  )
}
