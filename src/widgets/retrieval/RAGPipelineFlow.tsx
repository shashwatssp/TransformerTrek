/**
 * RAGPipelineFlow, step through the 7-stage RAG pipeline on a tiny corpus.
 * Retrieval scores are computed live with src/lib/bm25.ts (Okapi BM25,
 * k1 = 1.2, b = 0.75). Generation text is scripted per scenario and clearly
 * labeled as illustrative, the retrieval numbers driving it are real.
 */
import { useMemo, useState } from 'react'
import { buildIndex, scoreAll } from '../../lib/bm25'
import { FadeSwitch, Tabs } from '../../components/ui'
import { Pill, toyEmbed } from './shared'

type Chunk = { id: string; title: string; text: string }

const QUERY = 'Why is my brew light blinking red?'

/** Query words a good chunk should cover (stopwords removed). */
const Q_TERMS = ['brew', 'light', 'blinking', 'red']

type ScenarioId = 'clean' | 'distractor' | 'no-match' | 'stale'

const SCENARIOS: Record<ScenarioId, { label: string; hint: string; files: string[]; docs: Chunk[] }> = {
  clean: {
    label: 'Healthy index',
    hint: 'The right chunk exists and retrieval finds it.',
    files: ['handbook/setup-guide.md', 'handbook/troubleshooting.md', 'handbook/specs-200.md'],
    docs: [
      {
        id: 'c1',
        title: 'SolarBrew 300, Setup guide',
        text: 'Fill the reservoir with water, insert a paper filter, and press the brew button. Descale the machine every three months with citric acid.',
      },
      {
        id: 'c2',
        title: 'SolarBrew 300, Troubleshooting',
        text: 'If the brew light blinks red, the water tank is empty or not seated. Refill the tank, press it firmly into place, and restart the brew cycle.',
      },
      {
        id: 'c3',
        title: 'SolarBrew 200, Specs',
        text: 'The SolarBrew 200 has a 0.6 liter tank, one cup size, and no descaling reminder.',
      },
    ],
  },
  distractor: {
    label: 'Distractor chunk',
    hint: 'A plausible-but-wrong chunk outranks the truth.',
    files: ['handbook/setup-guide.md', 'blog/coffee-lights.md', 'handbook/specs-200.md'],
    docs: [
      {
        id: 'c1',
        title: 'SolarBrew 300, Setup guide',
        text: 'Fill the reservoir with water, insert a paper filter, and press the brew button. Descale the machine every three months with citric acid.',
      },
      {
        id: 'c2',
        title: 'Coffee makers, general notes',
        text: 'On many coffee makers a light shows brewing state. A solid green light usually means the machine finished brewing. See your model manual for light codes.',
      },
      {
        id: 'c3',
        title: 'SolarBrew 200, Specs',
        text: 'The SolarBrew 200 has a 0.6 liter tank, one cup size, and no descaling reminder.',
      },
    ],
  },
  'no-match': {
    label: 'Empty retrieval',
    hint: 'Nothing in the index matches the question.',
    files: ['solar/panel-warranty.md', 'solar/inverter-manual.md'],
    docs: [
      {
        id: 'p1',
        title: 'SolarBeam panel, warranty',
        text: 'The SolarBeam 100 W panel carries a 25-year performance warranty. Keep the purchase receipt for warranty claims.',
      },
      {
        id: 'p2',
        title: 'SolarBeam inverter, manual',
        text: 'Mount the inverter vertically with airflow on both sides. The status LED shows grid connection state.',
      },
    ],
  },
  stale: {
    label: 'Stale index',
    hint: 'The chunk was true in 2019, the product has moved on.',
    files: ['handbook/setup-guide.md', 'handbook/troubleshooting-2019.md', 'handbook/specs-200.md'],
    docs: [
      {
        id: 'c1',
        title: 'SolarBrew 300, Setup guide',
        text: 'Fill the reservoir with water, insert a paper filter, and press the brew button. Descale the machine every three months with citric acid.',
      },
      {
        id: 'c2',
        title: 'SolarBrew 300, Troubleshooting (2019)',
        text: 'If the brew light blinks red, the unit requires service. Contact support and quote error code E4. Do not open the tank lid while blinking.',
      },
      {
        id: 'c3',
        title: 'SolarBrew 200, Specs',
        text: 'The SolarBrew 200 has a 0.6 liter tank, one cup size, and no descaling reminder.',
      },
    ],
  },
}

const STAGES = [
  '1 · Ingest',
  '2 · Chunk + embed',
  '3 · Query',
  '4 · Retrieve top-k',
  '5 · Rerank + assemble',
  '6 · Build prompt',
  '7 · Generate + cite',
]

/** Scripted illustrative generations per scenario. */
const ANSWERS: Record<ScenarioId, { without: string; with: string }> = {
  clean: {
    without:
      '“A blinking red light usually indicates a heating-element fault. Unplug the machine for 10 minutes and try again.”, a confident guess from generic training data. Plausible? Sure. True for this machine? No.',
    with: '“The brew light blinks red when the water tank is empty or not seated. Refill the tank, press it firmly into place, and restart the brew cycle.”, grounded in chunk [c2], retrieved with the highest BM25 score.',
  },
  distractor: {
    without:
      '“A blinking red light usually indicates a heating-element fault. Unplug the machine for 10 minutes and try again.”, same generic guess as always.',
    with: '“On many coffee makers, a blinking light relates to brewing state, check your model manual for light codes.”, grounded in a general-notes blog chunk [c2], not your actual model manual. The reranker promoted plausible junk.',
  },
  'no-match': {
    without:
      '“A blinking red light usually indicates a heating-element fault. Unplug the machine for 10 minutes and try again.”, the model still answers something. Nothing anchors it to reality.',
    with: '“I can’t find anything about blinking brew lights in the indexed solar-panel documents.”, an honest refusal. Better than a hallucination, but the user still leaves empty-handed: retrieval failed first.',
  },
  stale: {
    without:
      '“A blinking red light usually indicates a heating-element fault. Unplug the machine for 10 minutes and try again.”, generic guess.',
    with: '“A blinking red light means the unit requires service, contact support and quote error code E4.”, grounded, cited… and outdated. The 2019 chunk says contact support; current firmware just needs a tank refill. Stale index, stale answer.',
  },
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** Fraction of Q_TERMS present in a chunk, the toy reranker's signal. */
function coverage(doc: Chunk): number {
  const tokens = new Set(tokenizeWords(`${doc.title} ${doc.text}`))
  const hits = Q_TERMS.filter((t) => tokens.has(t)).length
  return hits / Q_TERMS.length
}

export default function RAGPipelineFlow() {
  const [scenario, setScenario] = useState<ScenarioId>('clean')
  const [stage, setStage] = useState(0)
  const [k, setK] = useState(2)
  const [tab, setTab] = useState('With RAG')

  const s = SCENARIOS[scenario]
  const index = useMemo(() => buildIndex(s.docs), [s])
  const results = useMemo(() => scoreAll(index, QUERY, 1.2, 0.75), [index])
  const top = results.slice(0, k)

  // Toy rerank: coverage of query terms first, BM25 score as tiebreak.
  const reranked = useMemo(
    () =>
      [...results.slice(0, 4)].sort(
        (a, b) => coverage(b.doc) - coverage(a.doc) || b.score - a.score,
      ),
    [results],
  )

  const embedPreviews = useMemo(
    () => s.docs.map((d) => toyEmbed(`${d.title} ${d.text}`).slice(0, 6)),
    [s],
  )
  const queryPreview = useMemo(() => toyEmbed(QUERY).slice(0, 6), [])
  const topAfterRerank = reranked.slice(0, k)
  const reorderChanged = topAfterRerank.some((r, i) => top[i] && r.doc.id !== top[i].doc.id)

  const contextBlock = topAfterRerank
    .map((r, i) => `[${i + 1}] ${r.doc.id}, ${r.doc.title}: ${r.doc.text}`)
    .join('\n\n')
  const promptText = `Answer using ONLY the context. Cite chunk ids like [1].\n\nContext:\n${contextBlock}\n\nQuestion: ${QUERY}`

  const answer = tab === 'With RAG' ? ANSWERS[scenario].with : ANSWERS[scenario].without
  const grounded = (topAfterRerank[0]?.score ?? 0) > 0

  return (
    <div className="space-y-4 text-sm">
      {/* Scenario + top-k controls */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Failure-mode scenario">
        <span className="text-xs text-ink-muted">Scenario:</span>
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
          <button
            key={id}
            onClick={() => setScenario(id)}
            aria-pressed={scenario === id}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              scenario === id
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {SCENARIOS[id].label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1" role="group" aria-label="Top-k">
          <span className="text-xs text-ink-muted">top-k</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setK(n)}
              aria-pressed={k === n}
              aria-label={`Retrieve top ${n} chunks`}
              className={`h-7 w-7 rounded-md border font-mono text-xs transition ${
                k === n ? 'border-accent/60 bg-accent/10 text-accent' : 'border-border text-ink-muted hover:text-ink'
              }`}
            >
              {n}
            </button>
          ))}
        </span>
      </div>
      <p className="text-xs text-ink-muted">{s.hint}</p>

      {/* Pipeline chips */}
      <nav aria-label="Pipeline stages" className="flex flex-wrap gap-1.5">
        {STAGES.map((label, i) => (
          <button
            key={label}
            onClick={() => setStage(i)}
            aria-current={stage === i ? 'step' : undefined}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              stage === i
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Stage detail */}
      <div className="rounded-lg border border-border bg-surface-raised/40 p-4" aria-live="polite">
        <h4 className="text-sm font-semibold text-ink">Stage {stage + 1}, {STAGES[stage].slice(4)}</h4>

        <FadeSwitch activeKey={stage}>
        {stage === 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-ink/85">Everything starts with getting files into the system, loaders parse them, cleaners strip noise.</p>
            <ul className="flex flex-wrap gap-2">
              {s.files.map((f) => (
                <li key={f} className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-ink/85">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === 1 && (
          <div className="mt-3 space-y-2">
            <p className="text-ink/85">Documents are split into chunks; each chunk gets an embedding vector (first 6 of 384 dims shown, toy vectors for display).</p>
            {s.docs.map((d, i) => (
              <div key={d.id} className="rounded-md border border-border bg-surface p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-accent">{d.id}</span>
                  <span className="text-xs font-medium text-ink">{d.title}</span>
                  <Pill>{tokenizeWords(d.text).length} tokens</Pill>
                </div>
                <div className="mt-1 font-mono text-[11px] text-ink-muted">
                  [{embedPreviews[i].map((x) => x.toFixed(2)).join(', ')}, …]
                </div>
              </div>
            ))}
          </div>
        )}

        {stage === 2 && (
          <div className="mt-3 space-y-2">
            <p className="text-ink/85">The user’s question is embedded with the <em>same model</em>, only then can it be compared with chunk vectors.</p>
            <div className="rounded-md border border-border bg-surface p-2.5 font-mono text-xs text-ink">“{QUERY}”</div>
            <div className="font-mono text-[11px] text-ink-muted">
              query → [{queryPreview.map((x) => x.toFixed(2)).join(', ')}, …]
            </div>
          </div>
        )}

        {stage === 3 && (
          <div className="mt-3 space-y-2">
            <p className="text-ink/85">
              BM25 scores every chunk against the question (computed live, k1 = 1.2, b = 0.75). The top {k} make the cut.
            </p>
            {results.map((r, i) => (
              <div
                key={r.doc.id}
                className={`flex items-center gap-3 rounded-md border px-2.5 py-1.5 ${
                  i < k ? 'border-accent/50 bg-accent/10' : 'border-border bg-surface'
                }`}
              >
                <span className="font-mono text-xs text-ink-muted">#{i + 1}</span>
                <span className="font-mono text-xs text-accent">{r.doc.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink/85">{r.doc.title}</span>
                <span className="font-mono text-xs text-ink">{r.score.toFixed(3)}</span>
              </div>
            ))}
          </div>
        )}

        {stage === 4 && (
          <div className="mt-3 space-y-3">
            <p className="text-ink/85">
              A reranker re-scores the top candidates with a better (pricier) signal. Here: query-term coverage, of the terms{' '}
              {Q_TERMS.map((t) => `“${t}”`).join(', ')}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold text-ink-muted">BM25 order</div>
                {results.slice(0, 4).map((r, i) => (
                  <div key={r.doc.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <span className="font-mono text-ink-muted">#{i + 1}</span>
                    <span className="font-mono text-accent">{r.doc.id}</span>
                    <Pill>{Math.round(coverage(r.doc) * 100)}%</Pill>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-ink-muted">After rerank</div>
                {reranked.map((r, i) => (
                  <div key={r.doc.id} className="flex items-center gap-2 py-0.5 text-xs">
                    <span className="font-mono text-ink-muted">#{i + 1}</span>
                    <span className="font-mono text-accent">{r.doc.id}</span>
                    <Pill>{Math.round(coverage(r.doc) * 100)}%</Pill>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-ink-muted">
              {reorderChanged
                ? '⚠ The reranker promoted a chunk that matches more question words, useful, or a trap? Check the chunk content.'
                : 'Rerank kept the order, both signals agree here.'}
            </p>
          </div>
        )}

        {stage === 5 && (
          <div className="mt-3 space-y-2">
            <p className="text-ink/85">The winning chunks are stitched into the prompt. This string, not the model’s memory, is what the answer will be grounded in.</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-void/60 p-3 font-mono text-[11px] leading-5 text-ink/85">
              {promptText}
            </pre>
          </div>
        )}

        {stage === 6 && (
          <div className="mt-3 space-y-3">
            <Tabs tabs={['With RAG', 'Without RAG']} active={tab} onChange={setTab} />
            <FadeSwitch activeKey={tab}>
              <div className="rounded-md border border-border bg-surface p-3 text-ink/85">{answer}</div>
              {tab === 'With RAG' && (
                <p className="text-xs text-ink-muted">
                  {grounded
                    ? `Grounded in ${topAfterRerank.map((r) => `[${r.doc.id}]`).join(' ')}, live BM25 scores: ${topAfterRerank
                        .map((r) => r.score.toFixed(2))
                        .join(', ')}.`
                    : 'No chunk scored above 0.000, a well-behaved assistant refuses rather than guess.'}
                </p>
              )}
            </FadeSwitch>
            <p className="text-xs text-ink-muted">
              Generation text is scripted per scenario (illustrative); every retrieval score above is computed live in your browser.
            </p>
          </div>
        )}
        </FadeSwitch>
      </div>

      {/* Stage navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStage((v) => Math.max(0, v - 1))}
          disabled={stage === 0}
          aria-label="Previous pipeline stage"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised disabled:opacity-40"
        >
          ← Prev
        </button>
        <span className="font-mono text-xs text-ink-muted">stage {stage + 1} / {STAGES.length}</span>
        <button
          onClick={() => setStage((v) => Math.min(STAGES.length - 1, v + 1))}
          disabled={stage === STAGES.length - 1}
          aria-label="Next pipeline stage"
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink transition hover:bg-surface-raised disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
