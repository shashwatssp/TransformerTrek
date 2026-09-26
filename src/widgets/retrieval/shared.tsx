/**
 * Shared helpers for the Retrieval & Search track (M10–M15).
 * Everything here runs client-side; the toy embedder is an honest stand-in
 * for a real sentence model and is always labeled as such in the UI.
 */
import type { ReactNode } from 'react'
import { gaussian, seededRandom } from '../../lib/math'

/** Styling for inline external links — matches SourceList. */
export const extClass =
  'font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent'

/** FNV-1a string hash — same scheme as src/lib/attention.ts. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Toy bag-of-words embedding in D dims. Each word contributes a fixed
 * pseudo-random vector (seeded by the word hash); the result is L2-normalized.
 * Word overlap dominates — it is NOT a semantic model. Widgets using it must
 * say so in the UI.
 */
export function toyEmbed(text: string, dims = 384): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const v = new Array<number>(dims).fill(0)
  for (const w of words) {
    const rand = seededRandom(hashString(w))
    for (let i = 0; i < dims; i++) v[i] += gaussian(rand)
  }
  let norm = 0
  for (const x of v) norm += x * x
  const inv = 1 / (Math.sqrt(norm) + 1e-9)
  return v.map((x) => x * inv)
}

/** Horizontal labeled bar for a 0..1 (or custom max) score. */
export function ScoreBar({
  label,
  value,
  max = 1,
  tone = 'accent',
  suffix,
}: {
  label: string
  value: number
  max?: number
  tone?: 'accent' | 'highlight' | 'success' | 'danger'
  suffix?: string
}) {
  const bg =
    tone === 'accent'
      ? 'bg-accent'
      : tone === 'highlight'
        ? 'bg-highlight'
        : tone === 'success'
          ? 'bg-success'
          : 'bg-danger'
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-44 shrink-0 truncate text-ink-muted" title={label}>
        {label}
      </span>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised"
        role="img"
        aria-label={`${label}: ${value.toFixed(3)}${suffix ?? ''}`}
      >
        <div className={`h-full transition-[width] duration-500 ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-ink">
        {value.toFixed(3)}
        {suffix}
      </span>
    </div>
  )
}

/** Small status pill. */
export function Pill({
  children,
  tone = 'muted',
}: {
  children: ReactNode
  tone?: 'muted' | 'accent' | 'success' | 'highlight' | 'danger'
}) {
  const tones = {
    muted: 'border-border text-ink-muted',
    accent: 'border-accent/50 text-accent',
    success: 'border-success/50 text-success',
    highlight: 'border-highlight/50 text-highlight',
    danger: 'border-danger/50 text-danger',
  } as const
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}
