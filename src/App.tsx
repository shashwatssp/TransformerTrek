import { getModule, GLOSSARY, MODULES, moduleNumber, SECTIONS, modulesBySection } from './modules/registry'
import { useRoute, useScrollTopOnRoute } from './router'
import { resetProgress, useProgressMap } from './lib/progress'
import { TopNav } from './components/layout/TopNav'
import { Sidebar } from './components/layout/Sidebar'
import { ModuleLayout } from './components/layout/ModuleLayout'
import VisualizationsGallery from './components/VisualizationsGallery'
import RapidReview from './components/RapidReview'
import { Prose, Reveal } from './components/ui'
import { motion, useReducedMotion } from 'motion/react'
import { Suspense, useEffect, useState, type ReactNode } from 'react'

function Home() {
  const reduced = useReducedMotion()
  const progress = useProgressMap()
  const readCount = Object.keys(progress).length
  const firstUnread = MODULES.find((m) => !(m.id in progress))
  const allRead = readCount >= MODULES.length

  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          See how AI
          <span className="text-primary-bright"> actually </span>
          works.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-muted">
          Interactive, visual explanations of transformers, LLMs, and agents, from tokens
          and attention to RAG, MCP, and beyond. Step by step, first thing first.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={firstUnread ? `/modules/${firstUnread.id}` : '/modules/what-is-an-llm'}
            className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/85 active:scale-[0.98]"
          >
            {allRead ? 'Trek complete ✓, revisit from the start' : readCount > 0 ? 'Continue the trek →' : 'Start the trek →'}
          </a>
          <a
            href="/visualizations"
            className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition-all hover:bg-surface-raised active:scale-[0.98]"
          >
            Tour the visualizations
          </a>
          <a
            href="/glossary"
            className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition-all hover:bg-surface-raised active:scale-[0.98]"
          >
            Browse the glossary
          </a>
          <a
            href="/review"
            className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition-all hover:bg-surface-raised active:scale-[0.98]"
          >
            Rapid review
          </a>
        </div>
        {readCount > 0 && !allRead && (
          <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
            You have read {readCount} of {MODULES.length} modules; up next,{' '}
            <span className="font-medium text-ink">{firstUnread?.title}</span>.
          </p>
        )}
        {allRead && (
          <p className="mt-4 text-sm text-success" aria-live="polite">
            ✓ All {MODULES.length} modules read on this device. The glossary and playground make good revisit stops.
          </p>
        )}
      </motion.div>

      {/* Module map */}
      <div className="mt-16 space-y-10">
        {SECTIONS.map((section, si) => {
          const mods = modulesBySection(section.id)
          const doneCount = mods.filter((m) => m.id in progress).length
          const sectionDone = doneCount === mods.length
          return (
          <Reveal key={section.id} delay={Math.min(si * 0.05, 0.2)}>
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                <span className="font-mono text-sm text-ink-muted">{si + 1}.</span> {section.title}
                <span
                  aria-label={`${doneCount} of ${mods.length} modules read`}
                  className={`ml-2 rounded-full px-2 py-0.5 align-middle font-mono text-[10px] ${
                    sectionDone ? 'bg-success/15 text-success' : 'border border-border text-ink-muted'
                  }`}
                >
                  {doneCount}/{mods.length}
                </span>
              </h2>
              <p className="mt-1 text-sm text-ink-muted">{section.blurb}</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mods.map((m) => (
                  <li key={m.id}>
                    <a
                      href={`/modules/${m.id}`}
                      className="block h-full rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-raised/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                    >
                      <span className="font-mono text-[10px] text-ink-muted">Module {moduleNumber(m)}</span>
                      <h3 className="mt-1 text-sm font-semibold text-ink">{m.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">{m.blurb}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
          )
        })}
      </div>
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">That route is not part of the trek.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href="/"
          className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary/85"
        >
          Back to the trek
        </a>
        <a
          href="/playground"
          className="min-h-11 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition-all hover:bg-surface-raised"
        >
          Open the playground
        </a>
      </div>
    </main>
  )
}

/**
 * Stand-in while a lazy module chunk downloads. Without this boundary,
 * tapping a link could not commit the new page: the previous screen (often
 * the homepage, mid-scroll on a phone) stayed frozen until the chunk
 * arrived. The skeleton commits instantly instead.
 */
function ModuleSkeleton() {
  return (
    <div className="mt-8 space-y-4" aria-busy="true">
      <div className="h-48 animate-pulse rounded-xl border border-border bg-surface" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
      <div className="h-4 w-full animate-pulse rounded bg-surface" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-surface" />
      <p className="text-xs text-ink-muted">Loading the interactive module...</p>
    </div>
  )
}

function ModulePage({ id }: { id: string }) {
  const meta = getModule(id)
  if (!meta) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">Module not found</h1>
      <a href="/" className="mt-4 inline-block text-sm text-accent hover:underline">← Back to the trek</a>
      </main>
    )
  }
  return (
    <main className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-6">
      <Sidebar activeModuleId={meta.id} />
      <ModuleLayout meta={meta}>
        {meta.component ? (
          <Suspense fallback={<ModuleSkeleton />}>
            <meta.component />
          </Suspense>
        ) : (
          <Prose>
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-ink-muted">
                🚧 Content for this module is being written. The step outline, prerequisites,
                and sources above are already in place.
              </p>
            </div>
          </Prose>
        )}
      </ModuleLayout>
    </main>
  )
}

function Glossary() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const entries = GLOSSARY.filter(
    (g) => !q || g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q),
  )
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Every term, defined in one line, with a link to the module that explains it.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter terms, e.g. attention, RAG, temperature..."
        aria-label="Filter glossary terms"
        className="mt-4 w-full max-w-sm rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent/60 focus:outline-none"
      />
      <p className="mt-2 font-mono text-xs text-ink-muted" aria-live="polite">
        {entries.length} of {GLOSSARY.length} terms
      </p>
      <dl className="mt-6 space-y-5">
        {entries.map((g) => (
          <div key={g.term} className="border-b border-border pb-4">
            <dt className="text-sm font-semibold text-ink">{g.term}</dt>
            <dd className="mt-1 text-sm text-ink/80">
              {g.def}
              {g.module && (
                <a href={`/modules/${g.module}`} className="ml-2 whitespace-nowrap text-xs text-accent hover:underline">
                  → module {moduleNumber(getModule(g.module)!)}
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {entries.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">
          No terms match "{query}". Try a shorter fragment.
        </p>
      )}
    </main>
  )
}

const WIDGET_LABELS: Record<string, string> = {
  sampler: 'Next-token sampler',
  'next-token': 'Next-token demo',
  tokenizer: 'Tokenizer playground',
  attention: 'Attention playground',
  diagram: 'Full architecture diagram',
  architecture: 'Architecture flow',
  'training-loop': 'Training-loop simulator',
  pipeline: 'Post-training pipeline',
  rag: 'RAG pipeline flow',
  comparison: 'Decision framework',
  'vector-search': 'Vector search + HNSW',
  bm25: 'BM25 lab',
  minilm: 'MiniLM visualizer',
  fusion: 'Hybrid fusion (RRF)',
  'agent-loop': 'Agent loop / ReAct stepper',
  mcp: 'MCP message flow',
  a2a: 'A2A task lifecycle',
  'agent-graph': 'Agent graph builder',
  evals: 'Benchmarks, perplexity & LLM judge',
  'system-prompt': 'System prompt lab',
}

function Playground() {
  const byWidget = new Map<string, typeof MODULES>()
  for (const m of MODULES) {
    if (!m.widget) continue
    if (!byWidget.has(m.widget)) byWidget.set(m.widget, [])
    byWidget.get(m.widget)!.push(m)
  }
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Every interactive demo, free of narrative, each one lives inside its module; tap a card to jump straight in.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {[...byWidget.entries()].map(([w, mods]) => {
          const label = WIDGET_LABELS[w] ?? w
          return (
            <li key={w} className="h-full">
              {mods.length === 1 ? (
                // Single module: the entire card is one large tap/click target
                <a
                  href={`/modules/${mods[0].id}?demo`}
                  aria-label={`Open ${label} (${mods[0].title})`}
                  className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50 hover:bg-surface-raised/40"
                >
                  <span className="font-mono text-xs font-semibold text-accent">{label}</span>
                  <span className="mt-2 flex min-h-11 flex-1 items-center justify-between gap-2 text-sm font-medium text-ink">
                    {mods[0].title}
                    <span aria-hidden className="text-ink-muted">→</span>
                  </span>
                  <span className="mt-0.5 text-xs text-ink-muted">
                    Module <span className="font-mono text-[10px]">{moduleNumber(mods[0])}</span>
                  </span>
                </a>
              ) : (
                // Shared widget: each module gets its own comfortable tap row
                <div className="h-full rounded-xl border border-border bg-surface p-4">
                  <span className="font-mono text-xs font-semibold text-accent">{label}</span>
                  <ul className="mt-2 space-y-1">
                    {mods.map((m) => (
                      <li key={m.id}>
                        <a
                          href={`/modules/${m.id}?demo`}
                          className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-sm text-ink-muted transition hover:bg-surface-raised hover:text-accent"
                        >
                          <span>
                            <span className="mr-2 font-mono text-[10px]">{moduleNumber(m)}</span>
                            {m.title}
                          </span>
                          <span aria-hidden>→</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}

/**
 * Subtle fade when the route path changes (skip animation for reduced motion).
 * Opacity-only on purpose: animating y here leaves a transform (or
 * will-change: transform) on every page's wrapper, which would turn it into
 * the containing block for the expanded widget frames' position: fixed and
 * detach them from the viewport, especially on mobile.
 */
function PageFade({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      key={pageKey}
      initial={reduced ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const route = useRoute()
  useScrollTopOnRoute(route.path, route.demo)

  let page
  if (route.parts[0] === 'modules' && route.parts[1]) page = <ModulePage id={route.parts[1]} />
  else if (route.parts[0] === 'glossary') page = <Glossary />
  else if (route.parts[0] === 'playground') page = <Playground />
  else if (route.parts[0] === 'visualizations') page = <VisualizationsGallery />
  else if (route.parts[0] === 'review') page = <RapidReview />
  else if (route.parts.length === 0) page = <Home />
  else page = <NotFound />

  // The browser tab title follows the route
  const pageTitle =
    route.parts[0] === 'modules' && route.parts[1]
      ? `${getModule(route.parts[1])?.title ?? 'Module not found'} · TransformerTrek`
      : route.parts[0] === 'visualizations'
        ? 'Visualizations · TransformerTrek'
        : route.parts[0] === 'playground'
          ? 'Playground · TransformerTrek'
          : route.parts[0] === 'glossary'
            ? 'Glossary · TransformerTrek'
            : route.parts[0] === 'review'
              ? 'Rapid review · TransformerTrek'
              : 'TransformerTrek · See how AI actually works'
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <div className="min-h-screen bg-void text-ink">
      <a
        href="#main-content"
        onClick={(e) => {
          // Focus behavior instead of appending #main-content to the URL
          e.preventDefault()
          const main = document.getElementById('main-content')
          main?.focus()
          main?.scrollIntoView()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-accent"
      >
        Skip to content
      </a>
      <TopNav activePath={route.path} />
      <div id="main-content" tabIndex={-1}>
        <PageFade pageKey={route.path}>{page}</PageFade>
      </div>
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <p className="text-xs text-ink-muted">
            TransformerTrek, learn how AI actually works. Everything runs locally in your browser:
            no accounts, no tracking, nothing you type leaves your device.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <a
              href="https://github.com/shashwatssp/TransformerTrek"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted transition hover:text-accent"
            >
              GitHub
            </a>
            <a
              href="https://github.com/shashwatssp/TransformerTrek/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-muted transition hover:text-accent"
            >
              MIT License
            </a>
            <button
              onClick={() => {
                if (window.confirm('Clear your reading progress on this device?')) resetProgress()
              }}
              className="text-ink-muted transition hover:text-danger"
            >
              Reset progress
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
