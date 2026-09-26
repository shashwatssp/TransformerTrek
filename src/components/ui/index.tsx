/**
 * Shared UI primitives for module content and widgets.
 * Design tokens come from Tailwind v4 @theme in global.css.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { getModule, moduleNumber, type SourceRef } from '../../modules/registry'

/** Docs-grade reading typography */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-trek space-y-4 text-[15px] leading-7 text-ink/90">
      {children}
    </div>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink">
      {children}
    </h2>
  )
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold text-ink">{children}</h3>
  )
}

const calloutStyles = {
  info: 'border-primary/40 bg-primary/5',
  tip: 'border-success/40 bg-success/5',
  warn: 'border-highlight/40 bg-highlight/5',
  math: 'border-accent/40 bg-accent/5',
} as const

export function Callout({
  kind = 'info',
  title,
  children,
}: {
  kind?: keyof typeof calloutStyles
  title?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-lg border ${calloutStyles[kind]} px-4 py-3 text-sm`}>
      {title && <div className="mb-1 font-semibold text-ink">{title}</div>}
      <div className="text-ink/85">{children}</div>
    </div>
  )
}

export function CodeBlock({
  code,
  language = 'python',
  filename,
}: {
  code: string
  language?: string
  filename?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-ink-muted">{filename ?? language}</span>
        <button
          onClick={copy}
          className="rounded px-2 py-0.5 font-mono text-xs text-ink-muted transition hover:bg-surface-raised hover:text-ink"
        >
          {copied ? 'copied ✓' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code className="font-mono text-ink/90">{code}</code>
      </pre>
    </div>
  )
}

/**
 * Scroll-triggered reveal with a soft spring. Wrap sections/lists to give
 * the page a gentle entrance. No-ops under prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Cross-fades keyed content (stage/tab panels) instead of snapping.
 */
export function FadeSwitch({
  activeKey,
  children,
}: {
  activeKey: string | number
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeKey}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Frames an interactive widget with a consistent header and a full-screen
 * expand mode. Expand is a true full-screen takeover: the same section node
 * switches to fixed inset-0 (no margins, edge to edge) so all widget state
 * (sliders, animations) is preserved. Works on mobile via dvh sizing and
 * safe-area padding; Escape or the collapse button exits.
 */
export function WidgetFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  const [expanded, setExpanded] = useState(false)

  // Full-screen mode: Escape closes, body scroll locks.
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [expanded])

  const shell = expanded
    ? 'fixed inset-0 z-[100] my-0 flex h-dvh flex-col rounded-none border-0 bg-surface'
    : 'my-8 overflow-hidden rounded-xl border border-border bg-surface'

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 110, damping: 22 }}
      className={shell}
      aria-label={title}
    >
      <header
        className={`flex items-center gap-3 border-b border-border bg-surface-raised/50 px-4 py-3 ${
          expanded ? 'sticky top-0 z-10 shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</p>}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${title}, back to the page` : `Expand ${title} full screen`}
          title={expanded ? 'Collapse' : 'Expand full screen'}
          className="ml-auto flex min-h-9 shrink-0 items-center rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-accent/50 hover:text-accent sm:min-h-0"
        >
          {expanded ? '⤡ Collapse' : '⤢ Expand'}
        </button>
      </header>
      <div
        className={
          expanded
            ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6'
            : 'p-4'
        }
      >
        <div className={expanded ? 'mx-auto max-w-5xl' : undefined}>{children}</div>
      </div>
    </motion.section>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-center justify-between text-ink-muted">
        <span>{label}</span>
        <span className="font-mono text-accent">{format ? format(value) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer accent-accent"
      />
    </label>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[]
  active: string
  onChange: (t: string) => void
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 text-xs">
      {tabs.map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={active === t}
          onClick={() => onChange(t)}
          className={`shrink-0 rounded-md px-3 py-1.5 font-medium transition ${
            active === t
              ? 'bg-primary/20 text-primary-bright'
              : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

export function KeyTakeaways({ points }: { points: string[] }) {
  return (
    <div className="my-8 rounded-xl border border-success/30 bg-success/5 p-5">
      <h3 className="text-sm font-semibold tracking-wide text-success uppercase">Key takeaways</h3>
      <ul className="mt-3 space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink/85">
            <span className="text-success">◆</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Internal link to another module (hash routing) */
export function ModuleLink({ id, children }: { id: string; children?: ReactNode }) {
  const meta = getModule(id)
  const label = children ?? meta?.title ?? id
  return (
    <a
      href={`#/modules/${id}`}
      className="rounded font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent"
      title={meta ? `Module ${moduleNumber(meta)}, ${meta.title}` : id}
    >
      {label}
    </a>
  )
}

/** Numbered step list, the "first thing first" outline */
export function StepList({
  steps,
  numbered = true,
}: {
  steps: string[]
  numbered?: boolean
}) {
  return (
    <ol className="my-4 space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-ink/90">
          {numbered ? (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 font-mono text-[10px] font-semibold text-accent">
              {i + 1}
            </span>
          ) : (
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
          )}
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Side-by-side comparison table, for "X vs Y: when to use which".
 * Rows are dimension labels; columns are the compared options.
 */
export function ComparisonTable< ColId extends string >({
  columns,
  rows,
}: {
  /** e.g. [{ id: 'rag', label: 'RAG' }, { id: 'ft', label: 'Fine-tuning' }] */
  columns: { id: ColId; label: string }[]
  /** e.g. [{ label: 'What it changes', values: { rag: '…', ft: '…' } }] */
  rows: { label: string; values: Record<ColId, string> }[]
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-raised/60">
            <th className="px-4 py-2.5 text-left font-medium text-ink-muted">Dimension</th>
            {columns.map((c) => (
              <th key={c.id} className="px-4 py-2.5 text-left font-semibold text-accent">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border align-top">
              <td className="px-4 py-3 font-medium text-ink/85">{r.label}</td>
              {columns.map((c) => (
                <td key={c.id} className="px-4 py-3 text-ink/80">{r.values[c.id]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** "Sources & further reading", real external links with notes */
export function SourceList({ sources }: { sources: SourceRef[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {sources.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-0.5 font-mono text-xs text-ink-muted">[{i + 1}]</span>
          <span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent"
            >
              {s.title}
            </a>
            {s.note && <span className="text-ink-muted">, {s.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Simple styled button for widget controls, comfortable touch target */
export function Button({
  children,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost'
}) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white hover:bg-primary/85 active:bg-primary/75'
      : 'border border-border text-ink hover:bg-surface-raised active:bg-surface'
  return (
    <button
      onClick={onClick}
      className={`min-h-9 rounded-lg px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.97] sm:py-1.5 ${styles}`}
    >
      {children}
    </button>
  )
}
