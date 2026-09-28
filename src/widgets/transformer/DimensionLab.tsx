import { useState } from 'react'
import { WidgetFrame } from '../../components/ui'
import { cosineSimilarity } from '../../lib/math'

/**
 * Dimension lab: a 10-dimensional toy meaning space where every dimension is a
 * hand-named concept. A slider truncates the space to k dimensions and every
 * cosine similarity recomputes for real on the truncated vectors, so you can
 * watch meaning get sharper as dimensions are added, and inspect exactly which
 * dimension contributes which slice of a similarity.
 */

const DIM_LABELS = ['feline', 'canine', 'royalty', 'masculine', 'feminine', 'animate', 'fruit', 'vehicle', 'size', 'wheeled']

type WordVec = { word: string; vec: number[] }

// Canonical 10-dim vectors, one named concept per dimension.
const WORDS: WordVec[] = [
  { word: 'cat', vec: [1, 0, 0, 0, 0, 1, 0, 0, 0.7, 0] },
  { word: 'dog', vec: [0, 1, 0, 0, 0, 1, 0, 0, 0.6, 0] },
  { word: 'kitten', vec: [1, 0, 0, 0, 0, 1, 0, 0, 1, 0] },
  { word: 'king', vec: [0, 0, 1, 1, 0, 1, 0, 0, 0.3, 0] },
  { word: 'queen', vec: [0, 0, 1, 0, 1, 1, 0, 0, 0.3, 0] },
  { word: 'apple', vec: [0, 0, 0, 0, 0, 0, 1, 0, 0.5, 0] },
  { word: 'car', vec: [0, 0, 0, 0, 0, 0, 0, 1, 0.6, 1] },
  { word: 'truck', vec: [0, 0, 0, 0, 0, 0, 0, 1, 0.9, 1] },
]

const PAIRS: [string, string][] = [
  ['cat', 'dog'],
  ['kitten', 'cat'],
  ['king', 'queen'],
  ['cat', 'king'],
  ['car', 'truck'],
  ['apple', 'car'],
]

function truncate(v: number[], k: number): number[] {
  return v.slice(0, k)
}

/** Cosine with a zero-vector guard: an all-zero vector carries no information. */
function safeCosine(a: number[], b: number[]): number {
  const zero = a.every((x) => x === 0) || b.every((x) => x === 0)
  if (zero) return 0
  return cosineSimilarity(a, b)
}

export function DimensionLab() {
  const [k, setK] = useState(2)
  const [pairIdx, setPairIdx] = useState(0)

  const [wA, wB] = PAIRS[pairIdx]
  const a = WORDS.find((w) => w.word === wA)!
  const b = WORDS.find((w) => w.word === wB)!
  const ta = truncate(a.vec, k)
  const tb = truncate(b.vec, k)
  const cos = safeCosine(ta, tb)

  // Per-dimension contribution to the cosine: a_i * b_i / (|a| |b|).
  // These slices sum to exactly cos(a, b).
  const normA = Math.sqrt(ta.reduce((s, x) => s + x * x, 0))
  const normB = Math.sqrt(tb.reduce((s, x) => s + x * x, 0))
  const denom = normA * normB
  const contrib = ta.map((x, i) => (denom > 0 ? (x * tb[i]) / denom : 0))

  // Full similarity matrix at current k.
  const sims: number[][] = WORDS.map((wa) => WORDS.map((wb) => safeCosine(truncate(wa.vec, k), truncate(wb.vec, k))))

  const activeDims = DIM_LABELS.slice(0, k)
  const droppedDims = DIM_LABELS.slice(k)

  const simColor = (s: number) => {
    const alpha = Math.min(1, Math.abs(s)) * 0.6 + 0.05
    return s >= 0
      ? `color-mix(in srgb, var(--color-accent) ${alpha * 100}%, transparent)`
      : `color-mix(in srgb, var(--color-danger) ${alpha * 100}%, transparent)`
  }

  const story =
    k <= 2
      ? 'At 2 dimensions the model has room for only 2 concepts. Everything unrelated is exactly 0, and some words collapse to the all-zero vector: they simply cannot be represented.'
      : k <= 5
        ? 'More concept slots exist now, but the big ones (animate, size, vehicle) are still missing, so words that should be close are not, and words that should be far can look related.'
      : k < 10
        ? 'Getting detailed: the right pairs are pulling ahead, but subtle facts (size, wheeled) are still blurred.'
        : 'All 10 concepts have a dimension. Similarity now sorts words the way we intuitively group them: this is what "detailed representation" means numerically.'

  return (
    <WidgetFrame
      title="Dimension lab: what dimensions do, one concept at a time"
      subtitle="A 10-dim toy meaning space, one named concept per dimension. Slide the dimension count and every similarity recomputes on the truncated vectors."
    >
      {/* Dimension count slider */}
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="flex items-center justify-between text-ink-muted">
            <span>dimensions the model has</span>
            <span className="font-mono text-accent">k = {k}</span>
          </span>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer accent-accent"
            aria-label="Number of dimensions"
          />
        </label>
        <div className="flex flex-wrap gap-1" aria-label="Dimensions present at this size">
          {activeDims.map((d) => (
            <span key={d} className="rounded-full border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {d}
            </span>
          ))}
          {droppedDims.map((d) => (
            <span key={d} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-ink-muted/60 line-through">
              {d}
            </span>
          ))}
        </div>
        <p className="text-[11px] leading-5 text-ink-muted" aria-live="polite">{story}</p>
      </div>

      {/* Similarity matrix */}
      <div className="mt-5 overflow-x-auto">
        <div className="mb-1 text-xs font-medium text-ink">Cosine similarity matrix at k = {k} dims</div>
        <table className="border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="px-1" />
              {WORDS.map((w) => (
                <th key={w.word} className="px-1 py-0.5 font-mono font-normal text-ink-muted">{w.word}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WORDS.map((wa, i) => (
              <tr key={wa.word}>
                <th className="px-1 py-0.5 text-right font-mono font-normal text-ink-muted">{wa.word}</th>
                {WORDS.map((wb, j) => (
                  <td key={wb.word} className="p-0">
                    <span
                      title={`cos(${wa.word}, ${wb.word}) = ${sims[i][j].toFixed(3)}`}
                      className="flex h-7 w-9 items-center justify-center rounded font-mono text-[9px] text-ink"
                      style={{ background: i === j ? 'var(--color-surface-raised)' : simColor(sims[i][j]) }}
                    >
                      {i === j ? '1' : sims[i][j].toFixed(2)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-dimension contribution for the selected pair */}
      <div className="mt-5">
        <div className="text-xs font-medium text-ink">Which dimensions contribute to one similarity?</div>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Word pair">
          {PAIRS.map(([x, y], i) => (
            <button
              key={`${x}-${y}`}
              onClick={() => setPairIdx(i)}
              aria-pressed={pairIdx === i}
              className={`rounded border px-2.5 py-1 font-mono text-xs transition ${
                pairIdx === i ? 'border-accent/60 bg-accent/15 text-accent' : 'border-border text-ink-muted hover:text-ink'
              }`}
            >
              {x} · {y}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          {DIM_LABELS.map((d, i) => {
            const c = contrib[i]
            const inactive = i >= k
            return (
              <div key={d} className={`flex items-center gap-2 text-[11px] ${inactive ? 'opacity-35' : ''}`}>
                <span className={`w-16 text-right font-mono ${i < k ? 'text-ink' : 'text-ink-muted'}`}>{d}</span>
                <span className="relative h-3 flex-1 rounded bg-surface">
                  {/* contribution bars diverge from a zero baseline at 40% */}
                  <span className="absolute inset-y-0 left-[50%] w-px bg-border" />
                  <span
                    className="absolute inset-y-0 rounded"
                    style={{
                      background: c >= 0 ? 'var(--color-accent)' : 'var(--color-danger)',
                      left: c >= 0 ? '50%' : `${50 + (c / 1.1) * 50}%`,
                      width: `${(Math.abs(c) / 1.1) * 50}%`,
                    }}
                  />
                </span>
                <span className="w-12 text-right font-mono text-ink-muted">{c.toFixed(3)}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-ink-muted" aria-live="polite">
          cos({wA}, {wB}) = <span className="font-mono text-accent">{cos.toFixed(3)}</span> at k = {k}. Each bar is one
          dimension's share of that number; the bars sum to the cosine exactly. This is what "dimensions contribute"
          means: meaning lives in which dimensions light up, and how strongly.
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        Hand-named 10-dim space for readability. Real models learn every direction themselves, unnamed, and use
        hundreds to tens of thousands of dimensions; the constraint is identical: k dimensions = k independent feature
        directions, and too few forces unrelated concepts to collide (see the model dimensions reference below for
        real numbers).
      </p>
    </WidgetFrame>
  )
}
