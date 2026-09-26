/**
 * EmbeddingExplorer — a 2D toy embedding space. Pick a query word and see
 * cosine similarity rank every other point, computed live with
 * cosineSimilarity from src/lib/math.ts.
 */
import { useMemo, useState } from 'react'
import { cosineSimilarity } from '../../lib/math'
import { ModuleLink } from '../../components/ui'
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
  const [queryLabel, setQueryLabel] = useState('dog')

  const ranked = useMemo(() => {
    const q = POINTS.find((p) => p.label === queryLabel) ?? POINTS[0]
    const qVec = [q.x, q.y]
    return POINTS.filter((p) => p.label !== q.label)
      .map((p) => ({ point: p, sim: cosineSimilarity(qVec, [p.x, p.y]) }))
      .sort((a, b) => b.sim - a.sim)
  }, [queryLabel])

  const q = POINTS.find((p) => p.label === queryLabel) ?? POINTS[0]

  return (
    <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
      <div>
        <svg
          viewBox="-3.4 -3.4 6.8 6.8"
          className="h-72 w-72 rounded-lg border border-border bg-void/60 sm:h-80 sm:w-80"
          role="img"
          aria-label={`Scatter plot of toy 2D embeddings with ${queryLabel} selected as the query`}
        >
          {/* axes */}
          <line x1={-3.2} y1={0} x2={3.2} y2={0} stroke="#253048" strokeWidth={0.02} />
          <line x1={0} y1={-3.2} x2={0} y2={3.2} stroke="#253048" strokeWidth={0.02} />
          {/* similarity lines from query to every point */}
          {ranked.map(({ point, sim }) => (
            <line
              key={`line-${point.label}`}
              x1={q.x}
              y1={-q.y}
              x2={point.x}
              y2={-point.y}
              stroke="#22d3ee"
              strokeWidth={sim > ranked[0].sim ? 0.045 : 0.015}
              opacity={sim > ranked[0].sim ? 0.9 : 0.12 + 0.3 * Math.max(0, sim)}
            />
          ))}
          {/* points */}
          {POINTS.map((p) => {
            const isQuery = p.label === queryLabel
            return (
              <g key={p.label}>
                <circle
                  cx={p.x}
                  cy={-p.y}
                  r={isQuery ? 0.17 : 0.11}
                  fill={isQuery ? '#f59e0b' : '#22d3ee'}
                  opacity={isQuery ? 1 : 0.85}
                />
                <text
                  x={p.x}
                  y={-p.y - 0.26}
                  textAnchor="middle"
                  fontSize={0.22}
                  fill={isQuery ? '#f59e0b' : '#8b95a8'}
                  fontWeight={isQuery ? 700 : 400}
                >
                  {p.label}
                </text>
              </g>
            )
          })}
        </svg>
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
        <p className="text-xs text-ink-muted">
          Cosine similarity of every point with <strong className="text-highlight">{queryLabel}</strong>’s
          vector [{q.x.toFixed(1)}, {q.y.toFixed(1)}], computed live:
        </p>
        <div className="space-y-1.5">
          {ranked.map(({ point, sim }, i) => (
            <ScoreBar
              key={point.label}
              label={`${i + 1}. ${point.label}`}
              value={sim}
              tone={i === 0 ? 'success' : 'accent'}
            />
          ))}
        </div>
        <p className="text-xs text-ink-muted">
          Notice the neighbors: dog↔puppy, car↔truck, banana↔mango. In a real model (384+ dims, trained on
          billions of sentences — see <ModuleLink id="minilm" />) the same geometry holds, just in a space
          you can’t draw.
        </p>
      </div>
    </div>
  )
}
