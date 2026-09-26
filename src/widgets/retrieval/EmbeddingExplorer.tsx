/**
 * EmbeddingExplorer, a 2D toy embedding space. Pick a query word (pills or
 * by clicking a point) and see cosine similarity rank every other point,
 * computed live with cosineSimilarity from src/lib/math.ts. A top-k control
 * mirrors how vector search retrieves k nearest neighbors, not all points.
 */
import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cosineSimilarity } from '../../lib/math'
import { useChartTheme } from '../../lib/chartTheme'
import { ModuleLink, Slider } from '../../components/ui'
import { ScoreBar } from './shared'

type Point = { label: string; x: number; y: number }

/** Hand-placed 2D "embeddings": semantic cousins sit close together. */
const POINTS: Point[] = [
  { label: 'dog', x: 2.6, y: 2.1 },
  { label: 'puppy', x: 2.9, y: 2.45 },
  { label: 'cat', x: 2.2, y: 2.55 },
  { label: 'kitten', x: 2.5, y: 2.85 },
  { label: 'car', x: -2.5, y: 1.9 },
  { label: 'truck', x: -2.85, y: 1.55 },
  { label: 'bus', x: -2.2, y: 1.35 },
  { label: 'banana', x: 0.35, y: -2.6 },
  { label: 'apple', x: 0.8, y: -2.85 },
  { label: 'mango', x: 0.1, y: -2.95 },
]

export default function EmbeddingExplorer() {
  const pal = useChartTheme()
  const reduced = useReducedMotion()
  const [queryLabel, setQueryLabel] = useState('dog')
  const [topK, setTopK] = useState(3)
  const [showLines, setShowLines] = useState(true)

  const q = POINTS.find((p) => p.label === queryLabel) ?? POINTS[0]

  const ranked = useMemo(() => {
    const qVec = [q.x, q.y]
    return POINTS.filter((p) => p.label !== q.label)
      .map((p) => ({ point: p, sim: cosineSimilarity(qVec, [p.x, p.y]) }))
      .sort((a, b) => b.sim - a.sim)
  }, [q])

  const kEff = Math.min(topK, ranked.length)
  const topSet = useMemo(
    () => new Set(ranked.slice(0, kEff).map((r) => r.point.label)),
    [ranked, kEff],
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <div>
        <svg
          viewBox="-3.4 -3.4 6.8 6.8"
          className="h-72 w-72 max-w-full rounded-lg border border-border bg-void/60 sm:h-80 sm:w-80"
          role="img"
          aria-label={`Scatter plot of toy 2D embeddings with ${queryLabel} selected as the query. Click any point to make it the query.`}
        >
          {/* axes */}
          <line x1={-3.2} y1={0} x2={3.2} y2={0} stroke={pal.grid} strokeWidth={0.02} />
          <line x1={0} y1={-3.2} x2={0} y2={3.2} stroke={pal.grid} strokeWidth={0.02} />
          {/* similarity lines from query to every point */}
          {showLines &&
            ranked.map(({ point, sim }) => (
              <motion.line
                key={`line-${point.label}`}
                x1={q.x}
                y1={-q.y}
                x2={point.x}
                y2={-point.y}
                stroke={pal.accent}
                strokeWidth={topSet.has(point.label) ? 0.045 : 0.015}
                initial={false}
                animate={{ opacity: topSet.has(point.label) ? 0.9 : 0.12 + 0.3 * Math.max(0, sim) }}
                transition={reduced ? { duration: 0 } : { duration: 0.3 }}
              />
            ))}
          {/* points, click one to make it the query */}
          {POINTS.map((p) => {
            const isQuery = p.label === queryLabel
            const isTop = topSet.has(p.label)
            return (
              <g
                key={p.label}
                onClick={() => setQueryLabel(p.label)}
                className="cursor-pointer"
                role="button"
                aria-label={`Use ${p.label} as the query`}
              >
                {/* generous invisible hit area for touch */}
                <circle cx={p.x} cy={-p.y} r={0.34} fill="transparent" />
                <motion.circle
                  cx={p.x}
                  cy={-p.y}
                  fill={isQuery ? pal.highlight : isTop ? pal.success : pal.accent}
                  initial={false}
                  animate={{ r: isQuery ? 0.17 : isTop ? 0.14 : 0.11, opacity: isQuery ? 1 : 0.85 }}
                  transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22 }}
                />
                <text
                  x={p.x}
                  y={-p.y - 0.26}
                  textAnchor="middle"
                  fontSize={0.22}
                  fill={isQuery ? pal.highlight : isTop ? pal.success : pal.muted}
                  fontWeight={isQuery ? 700 : isTop ? 600 : 400}
                  className="pointer-events-none select-none"
                >
                  {p.label}
                </text>
              </g>
            )
          })}
        </svg>
        <p className="mt-2 text-center text-[11px] text-ink-muted">
          Tip: click any point in the plot to change the query.
        </p>
      </div>

      <div className="space-y-3">
        <div role="group" aria-label="Pick the query word" className="flex flex-wrap gap-1.5">
          {POINTS.map((p) => (
            <button
              key={p.label}
              onClick={() => setQueryLabel(p.label)}
              aria-pressed={queryLabel === p.label}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                queryLabel === p.label
                  ? 'border-highlight/60 bg-highlight/10 text-highlight'
                  : 'border-border text-ink-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Slider
              label="Neighbors to retrieve (top-k)"
              value={topK}
              min={1}
              max={5}
              step={1}
              onChange={(v) => setTopK(Math.round(v))}
              format={(v) => `k = ${Math.round(v)}`}
            />
          </div>
          <button
            onClick={() => setShowLines((s) => !s)}
            aria-pressed={showLines}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              showLines
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {showLines ? 'Similarity lines: on' : 'Similarity lines: off'}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Cosine similarity of every point with <strong className="text-highlight">{queryLabel}</strong>’s
          vector [{q.x.toFixed(1)}, {q.y.toFixed(1)}], computed live. The {kEff} highlighted rows are what
          a vector search would return for k = {kEff}:
        </p>
        <div className="space-y-1.5">
          {ranked.map(({ point, sim }, i) => (
            <div key={point.label} className={i < kEff ? '' : 'opacity-60'}>
              <ScoreBar
                label={`${i + 1}. ${point.label}${topSet.has(point.label) ? ' ✓' : ''}`}
                value={sim}
                tone={i === 0 ? 'success' : i < kEff ? 'accent' : 'highlight'}
              />
            </div>
          ))}
        </div>
        <p className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2 text-xs text-ink/85" aria-live="polite">
          <strong className="text-accent">k = {kEff} nearest neighbors of “{queryLabel}”:</strong>{' '}
          {ranked.slice(0, kEff).map((r) => r.point.label).join(', ')}. Everything else stays out of the
          result set, exactly like a real ANN index returning only the top-k vectors.
        </p>
        <p className="text-xs text-ink-muted">
          Notice the neighbors: dog↔puppy, car↔truck, banana↔mango. In a real model (384+ dims, trained on
          billions of sentences, see <ModuleLink id="minilm" />) the same geometry holds, just in a space
          you can’t draw.
        </p>
      </div>
    </div>
  )
}
