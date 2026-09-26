import { getModule, GLOSSARY, MODULES, moduleNumber, SECTIONS, modulesBySection } from './modules/registry'
import { useRoute, useScrollTopOnRoute } from './router'
import { TopNav } from './components/layout/TopNav'
import { Sidebar } from './components/layout/Sidebar'
import { ModuleLayout } from './components/layout/ModuleLayout'
import { Prose } from './components/ui'

function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        See how AI
        <span className="text-primary-bright"> actually </span>
        works.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-muted">
        Interactive, visual explanations of transformers, LLMs, and agents — from tokens
        and attention to RAG, MCP, and beyond. Step by step, first thing first.
      </p>
      <div className="mt-6 flex gap-3">
        <a
          href="#/modules/what-is-an-llm"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          Start the trek →
        </a>
        <a
          href="#/glossary"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          Browse the glossary
        </a>
      </div>

      {/* Module map */}
      <div className="mt-16 space-y-10">
        {SECTIONS.map((section, si) => (
          <section key={section.id}>
            <h2 className="text-lg font-semibold tracking-tight">
              <span className="font-mono text-sm text-ink-muted">{si + 1}.</span> {section.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{section.blurb}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modulesBySection(section.id).map((m) => (
                <li key={m.id}>
                  <a
                    href={`#/modules/${m.id}`}
                    className="block h-full rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50 hover:bg-surface-raised/40"
                  >
                    <span className="font-mono text-[10px] text-ink-muted">Module {moduleNumber(m)}</span>
                    <h3 className="mt-1 text-sm font-semibold text-ink">{m.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">{m.blurb}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}

function ModulePage({ id }: { id: string }) {
  const meta = getModule(id)
  if (!meta) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">Module not found</h1>
        <a href="#/" className="mt-4 inline-block text-sm text-accent hover:underline">← Back to the trek</a>
      </main>
    )
  }
  return (
    <main className="mx-auto flex max-w-7xl gap-8 px-4 sm:px-6">
      <Sidebar activeModuleId={meta.id} />
      <ModuleLayout meta={meta}>
        {meta.component ? (
          <meta.component />
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
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Every term, defined in one line, with a link to the module that explains it.
      </p>
      <dl className="mt-8 space-y-5">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="border-b border-border pb-4">
            <dt className="text-sm font-semibold text-ink">{g.term}</dt>
            <dd className="mt-1 text-sm text-ink/80">
              {g.def}
              {g.module && (
                <a href={`#/modules/${g.module}`} className="ml-2 whitespace-nowrap text-xs text-accent hover:underline">
                  → module {moduleNumber(getModule(g.module)!)}
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </main>
  )
}

const WIDGET_LABELS: Record<string, string> = {
  sampler: 'Next-token sampler',
  'next-token': 'Next-token demo',
  tokenizer: 'Tokenizer playground',
  attention: 'Attention playground',
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
  evals: 'Benchmark charts + perplexity lab',
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
        Every interactive demo, free of narrative — each one lives inside its module; jump straight in.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {[...byWidget.entries()].map(([w, mods]) => (
          <li key={w} className="rounded-xl border border-border bg-surface p-4">
            <span className="font-mono text-xs font-semibold text-accent">{WIDGET_LABELS[w] ?? w}</span>
            <ul className="mt-2 space-y-1">
              {mods.map((m) => (
                <li key={m.id}>
                  <a
                    href={`#/modules/${m.id}`}
                    className="text-xs text-ink-muted transition hover:text-accent"
                  >
                    <span className="font-mono text-[10px]">{moduleNumber(m)}</span>
                    {' '}
                    {m.title}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function App() {
  const route = useRoute()
  useScrollTopOnRoute(route.path)

  let page
  if (route.parts[0] === 'modules' && route.parts[1]) page = <ModulePage id={route.parts[1]} />
  else if (route.parts[0] === 'glossary') page = <Glossary />
  else if (route.parts[0] === 'playground') page = <Playground />
  else page = <Home />

  return (
    <div className="min-h-screen bg-void text-ink">
      <a
        href="#main-content"
        onClick={(e) => {
          // Don't let the hash router treat this as a navigation
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
      <div id="main-content" tabIndex={-1}>{page}</div>
      <footer className="border-t border-border py-8 text-center text-xs text-ink-muted">
        TransformerTrek — learn how AI actually works. Everything computed client-side.
      </footer>
    </div>
  )
}
