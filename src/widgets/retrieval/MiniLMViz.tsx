/**
 * MiniLMViz, three linked views of the all-MiniLM-L6-v2 recipe:
 * 1. teacher (12L) → student (6L) distillation diagram with per-layer notes
 * 2. animated mean pooling over token embeddings (live arithmetic)
 * 3. a 384-dim vector heatmap + a toy sentence-pair similarity meter
 * The toy embedder (word-overlap) is an honest stand-in for the real model
 * and is labeled as such wherever it is used.
 */
import { useEffect, useMemo, useState } from 'react'
import { cosineSimilarity, gaussian, seededRandom } from '../../lib/math'
import { useChartTheme } from '../../lib/chartTheme'
import { Callout, FadeSwitch, Tabs } from '../../components/ui'
import { Pill, ScoreBar, hashString, toyEmbed } from './shared'

const POOL_TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat']
const POOL_DIMS = 8

const SENTENCES = [
  'The cat sat on the mat',
  'A cat rested on the mat',
  'How do I reset my password?',
  'I forgot my login credentials',
  'The stock market fell sharply',
  'Reset your password in account settings',
]

const LAYER_NOTES = [
  'Layers 1–2 reproduce the teacher’s attention maps on fine, local patterns, which token is looking at which.',
  'Layers 3–4 keep matching the teacher’s attention distributions while the hidden states narrow to 384 dims.',
  'Layers 5–6 must reproduce the teacher’s final-layer attention and value vectors, the highest-fidelity constraint.',
]

/** Per-token embedding rows (8 dims shown of 384), seeded for reproducibility. */
const TOKEN_ROWS: number[][] = POOL_TOKENS.map((t) => {
  const rand = seededRandom(hashString(`token:${t.toLowerCase()}`))
  return Array.from({ length: POOL_DIMS }, () => gaussian(rand) * 0.6)
})

/** Seeded 384-dim "sentence embedding" for the heatmap. */
const HEAT: number[] = (() => {
  const rand = seededRandom(42)
  const v = Array.from({ length: 384 }, () => gaussian(rand))
  const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0))
  return v.map((x) => x / norm)
})()

function heatColor(v: number, max: number): string {
  const a = Math.min(1, Math.abs(v) / max)
  return v >= 0 ? `rgba(34, 211, 238, ${0.15 + 0.85 * a})` : `rgba(245, 158, 11, ${0.15 + 0.85 * a})`
}

export default function MiniLMViz() {
  const pal = useChartTheme()
  const [tab, setTab] = useState('The 6 layers')
  const [selectedLayer, setSelectedLayer] = useState(1)
  const [poolStep, setPoolStep] = useState(0)
  const [poolPlaying, setPoolPlaying] = useState(false)
  const [sentA, setSentA] = useState('How do I reset my password?')
  const [sentB, setSentB] = useState('I forgot my login credentials')

  // Mean-pooling autoplay
  useEffect(() => {
    if (!poolPlaying) return
    if (poolStep >= POOL_TOKENS.length) {
      setPoolPlaying(false)
      return
    }
    const t = setTimeout(() => setPoolStep((v) => v + 1), 650)
    return () => clearTimeout(t)
  }, [poolPlaying, poolStep])

  const pooled = useMemo(() => {
    const shown = TOKEN_ROWS.slice(0, poolStep)
    if (shown.length === 0) return null
    return shown[0].map((_, d) => shown.reduce((a, r) => a + r[d], 0) / shown.length)
  }, [poolStep])

  const heatMax = useMemo(() => Math.max(...HEAT.map(Math.abs)), [])
  const heatStats = useMemo(() => {
    const mean = HEAT.reduce((a, x) => a + x, 0) / HEAT.length
    const norm = Math.sqrt(HEAT.reduce((a, x) => a + x * x, 0))
    return { min: Math.min(...HEAT), max: Math.max(...HEAT), mean, norm }
  }, [])

  const embA = useMemo(() => toyEmbed(sentA), [sentA])
  const embB = useMemo(() => toyEmbed(sentB), [sentB])
  const sim = cosineSimilarity(embA, embB)

  return (
    <div className="space-y-4 text-sm">
      <Tabs tabs={['The 6 layers', 'Mean pooling', '384 dims & similarity']} active={tab} onChange={setTab} />

      <FadeSwitch activeKey={tab}>
      {/* ── Tab 1: distillation diagram ─────────────────────────── */}
      {tab === 'The 6 layers' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                { title: 'Teacher, 12 layers × 768', count: 12, tone: 'border-highlight/50 text-highlight', params: '~109M params' },
                { title: 'Student, 6 layers × 384', count: 6, tone: 'border-accent/50 text-accent', params: '~22M params' },
              ] as const
            ).map((col) => (
              <div key={col.title}>
                <div className="mb-1.5 text-xs font-semibold text-ink-muted">
                  {col.title} <span className="font-normal">({col.params})</span>
                </div>
                <div className="flex flex-col-reverse gap-1">
                  {Array.from({ length: col.count }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => col.count === 6 && setSelectedLayer(i + 1)}
                      aria-label={
                        col.count === 6
                          ? `Student layer ${i + 1}: ${LAYER_NOTES[Math.min(2, Math.floor(i / 2))]}`
                          : `Teacher layer ${i + 1} (reference only)`
                      }
                      className={`rounded border px-2 py-1 text-left text-[11px] transition ${col.tone} ${
                        col.count === 6 && selectedLayer === i + 1 ? 'bg-accent/15' : 'bg-surface'
                      } ${col.count === 6 ? 'cursor-pointer hover:bg-accent/10' : 'cursor-default opacity-70'}`}
                    >
                      {col.count === 6 ? `student L${i + 1}` : `teacher L${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink/85" aria-live="polite">
            <strong className="text-accent">Student layer {selectedLayer}:</strong>{' '}
            {LAYER_NOTES[Math.min(2, Math.floor((selectedLayer - 1) / 2))]} Half the layers, half the width
, the student learns to <em>imitate the teacher’s attention</em>, not just its final output.
          </p>
          <p className="text-xs text-ink-muted">
            Click any student layer (keyboard: Tab + Enter). Distillation recipe per Wang et al. (2020);
            the all-MiniLM-L6-v2 model card documents the 6-layer / 384-dim / 22M-parameter student.
          </p>
        </div>
      )}

      {/* ── Tab 2: mean pooling ─────────────────────────────────── */}
      {tab === 'Mean pooling' && (
        <div className="space-y-3">
          <p className="text-ink/85">
            A transformer emits one vector <em>per token</em>. Sentence embeddings need one vector for the
            whole sentence, so MiniLM <strong>averages</strong> all token vectors (mean pooling). Watch it
            happen, one token at a time, on 8 of the 384 dims:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setPoolStep(0)
                setPoolPlaying(true)
              }}
              aria-label="Play the mean-pooling animation"
              className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
            >
              ▶ Play
            </button>
            <button
              onClick={() => setPoolStep((v) => Math.min(v + 1, POOL_TOKENS.length))}
              aria-label="Advance pooling by one token"
              className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
            >
              Step
            </button>
            <button
              onClick={() => {
                setPoolStep(0)
                setPoolPlaying(false)
              }}
              aria-label="Reset the pooling animation"
              className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
            >
              Reset
            </button>
            <Pill tone="accent">
              {poolStep === 0 ? 'press play' : poolStep < POOL_TOKENS.length ? `averaged ${poolStep}/${POOL_TOKENS.length} tokens` : 'all tokens pooled'}
            </Pill>
          </div>
          <div className="overflow-x-auto">
            {/* 6 of the 8 dims on phones; the table always fits the width */}
            <table className="w-full text-left font-mono text-[10px] sm:text-[11px]">
              <caption className="sr-only">Token embedding rows being averaged into the sentence vector</caption>
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-1.5 font-medium sm:pr-2">token</th>
                  {Array.from({ length: POOL_DIMS }, (_, d) => (
                    <th key={d} className={`py-1 pr-1.5 font-medium sm:pr-2 ${d >= 6 ? 'hidden sm:table-cell' : ''}`}>d{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POOL_TOKENS.map((t, i) => (
                  <tr
                    key={t}
                    className={i < poolStep ? 'bg-accent/10' : ''}
                    aria-label={i < poolStep ? `${t}: included in the average` : `${t}: not yet included`}
                  >
                    <td className="py-1 pr-1.5 text-ink/85 sm:pr-2">{t}</td>
                    {TOKEN_ROWS[i].map((v, d) => (
                      <td
                        key={d}
                        className={`py-1 pr-1.5 sm:pr-2 ${d >= 6 ? 'hidden sm:table-cell' : ''}`}
                        style={{ color: v >= 0 ? pal.accent : pal.highlight }}
                      >
                        {v.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
                {pooled && (
                  <tr className="border-t border-accent/40">
                    <td className="py-1 pr-1.5 font-semibold text-success sm:pr-2">mean</td>
                    {pooled.map((v, d) => (
                      <td key={d} className={`py-1 pr-1.5 font-semibold text-success sm:pr-2 ${d >= 6 ? 'hidden sm:table-cell' : ''}`}>{v.toFixed(1)}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-ink-muted">
            {poolStep < POOL_TOKENS.length
              ? 'Each Step folds one more token row into the running average (green row).'
              : 'Final green row = the sentence vector (8 of 384 dims). The real model also lets attention mix context across tokens before this average.'}
          </p>
        </div>
      )}

      {/* ── Tab 3: 384 dims + similarity meter ──────────────────── */}
      {tab === '384 dims & similarity' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              One sentence = 384 numbers
            </div>
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: 'repeat(24, 1fr)' }}
              role="img"
              aria-label={`Heatmap of a 384-dimensional unit vector. Values range from ${heatStats.min.toFixed(2)} to ${heatStats.max.toFixed(2)}, mean ${heatStats.mean.toFixed(3)}, L2 norm ${heatStats.norm.toFixed(2)}. Cyan cells are positive, amber negative.`}
            >
              {HEAT.map((v, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[2px]"
                  style={{ backgroundColor: heatColor(v, heatMax) }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              Seeded unit vector, 24×16 cells. Computed stats: min {heatStats.min.toFixed(2)}, max{' '}
              {heatStats.max.toFixed(2)}, mean {heatStats.mean.toFixed(3)}, ‖v‖ = {heatStats.norm.toFixed(2)}.{' '}
              <a
                href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                all-MiniLM-L6-v2
              </a>{' '}
              outputs exactly this shape, search then reduces to 384 multiply-adds per candidate.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Sentence-pair similarity meter
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-ink-muted">
                Sentence A
                <select
                  value={sentA}
                  onChange={(e) => setSentA(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {SENTENCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-ink-muted">
                Sentence B
                <select
                  value={sentB}
                  onChange={(e) => setSentB(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  {SENTENCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <ScoreBar label="cosine(A, B)" value={sim} tone={sim > 0.7 ? 'success' : 'accent'} />
            <Callout kind="warn" title="Honesty note, this is a toy, and that’s the lesson">
              This meter uses a word-overlap stand-in, not the real network. Try “How do I reset my
              password?” vs “I forgot my login credentials”: the toy scores ≈ 0 (no shared words), while
              real MiniLM gives ≈ 0.5, it was trained contrastively to score <em>meaning</em>. The toy
              fails exactly where the real model earns its keep.
            </Callout>
          </div>
        </div>
      )}
      </FadeSwitch>
    </div>
  )
}
