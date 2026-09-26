import type { ReactNode } from 'react'
import { getModule, moduleNumber, neighbors, SECTIONS, type ModuleMeta } from '../../modules/registry'
import { toggleCompleted, useIsCompleted } from '../../lib/progress'
import { Quiz } from '../Quiz'
import { SourceList, StepList } from '../ui'

/**
 * Full-page module shell implementing the content principles:
 * numbered identity, prerequisite banner for direct jumps, ordered step
 * outline, sources, see-also cross-references, and progress tracking.
 */
export function ModuleLayout({ meta, children }: { meta: ModuleMeta; children: ReactNode }) {
  // Live from the reactive localStorage store, sidebar + badge update instantly
  const done = useIsCompleted(meta.id)
  const section = SECTIONS.find((s) => s.id === meta.section)
  const { prev, next } = neighbors(meta.id)
  const prereqs = meta.prerequisites.map(getModule).filter((m): m is ModuleMeta => !!m)
  const related = meta.related.map(getModule).filter((m): m is ModuleMeta => !!m)

  return (
    <article className="min-w-0 flex-1 pb-24 pt-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <a href="#/" className="transition hover:text-ink">Trek</a>
        <span>/</span>
        <span>{section ? `${SECTIONS.findIndex((s) => s.id === section.id) + 1}. ${section.title}` : meta.section}</span>
        <span>/</span>
        <span className="font-mono text-accent">Module {moduleNumber(meta)}</span>
      </div>

      {/* Title */}
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
      <p className="mt-2 max-w-2xl text-base text-ink-muted">{meta.blurb}</p>

      {/* Prerequisite banner, for readers who jumped straight here */}
      {prereqs.length > 0 && (
        <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-highlight">
            Before you start
          </div>
          <p className="mt-1 text-sm text-ink/80">
            This module assumes you're familiar with:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {prereqs.map((p) => (
              <li key={p.id}>
                <a
                  href={`#/modules/${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink transition hover:border-accent/50 hover:text-accent"
                >
                  <span className="font-mono text-[10px] text-ink-muted">{moduleNumber(p)}</span>
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            Jumped straight here? No problem, skim the links above, then continue.
          </p>
        </div>
      )}

      {/* Step outline, first thing first */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">
          This module, step by step
        </div>
        <StepList steps={meta.steps} />
      </div>

      {/* Content */}
      <div className="mt-8">{children}</div>

      {/* Knowledge check, when this module has quiz questions */}
      <Quiz moduleId={meta.id} title={meta.title} />

      {/* Sources & further reading */}
      {meta.sources.length > 0 && (
        <section className="mt-12 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink">
            Sources &amp; further reading
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Every module is built from real documentation and papers, verify and go deeper.
          </p>
          <SourceList sources={meta.sources} />
        </section>
      )}

      {/* See also, cross-reference graph */}
      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">See also</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.id}>
                <a
                  href={`#/modules/${r.id}`}
                  className="block rounded-lg border border-border bg-surface p-3 transition hover:border-accent/50"
                >
                  <span className="font-mono text-[10px] text-ink-muted">{moduleNumber(r)}</span>
                  <span className="ml-2 text-sm font-medium text-ink">{r.title}</span>
                  <p className="mt-1 text-xs text-ink-muted">{r.blurb}</p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer: mark as read + prev/next */}
      <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => toggleCompleted(meta.id)}
          aria-pressed={done}
          aria-label={done ? `"${meta.title}" marked as read, click to unmark` : `Mark "${meta.title}" as read (saved on this device)`}
          className={`inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
            done
              ? 'border border-success/40 bg-success/10 text-success'
              : 'bg-primary text-white hover:bg-primary/85'
          }`}
        >
          {done ? '✓ Read' : 'Mark as read'}
        </button>
        <nav aria-label="Previous / next module" className="grid gap-2 text-sm sm:flex sm:items-center sm:justify-end sm:gap-3">
          {prev ? (
            <a
              href={`#/modules/${prev.id}`}
              className="flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-ink-muted transition hover:text-ink"
            >
              <span aria-hidden>←</span>
              <span className="truncate">{prev.title}</span>
            </a>
          ) : <span />}
          {next ? (
            <a
              href={`#/modules/${next.id}`}
              className="flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 py-2 text-ink-muted transition hover:text-ink sm:max-w-[16rem]"
            >
              <span className="truncate">{next.title}</span>
              <span aria-hidden>→</span>
            </a>
          ) : <span />}
        </nav>
      </div>
    </article>
  )
}
