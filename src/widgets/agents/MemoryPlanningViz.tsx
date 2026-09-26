/**
 * MemoryPlanningViz, two labs in one widget:
 *  1. Memory: working memory (a token-budgeted context window) vs long-term
 *     memory (a small vector store). Recall scores every entry with real
 *     cosine similarity (src/lib/math) against a fixed task query.
 *  2. Planning: a plan-and-execute timeline where a deterministic tool
 *     failure triggers reflection and a replan you can watch happen.
 */
import { useState } from 'react'
import { FadeSwitch, Tabs } from '../../components/ui'
import { cosineSimilarity } from '../../lib/math'

const estTokens = (s: string) => Math.ceil(s.length / 4)

// ── Lab 1: Memory ───────────────────────────────────────────────────────────

type MemEntry = { id: number; title: string; text: string; vec: number[]; isNew?: boolean }

const LTS_SEED: MemEntry[] = [
  { id: 1, title: 'Client preferences', text: 'Client prefers quiet venues; dislikes noisy izakaya.', vec: [0.9, 0.1, 0.7, 0.2] },
  { id: 2, title: 'Budget policy', text: 'Team policy: client dinners under ¥15,000/person.', vec: [0.8, 0.3, 0.6, 0.1] },
  { id: 3, title: 'Paris trip (old task)', text: 'October trip to Paris was rainy; packed umbrella.', vec: [0.1, 0.9, 0.1, 0.8] },
  { id: 4, title: 'Booking workflow', text: 'Restaurant booking requires confirmation email to client.', vec: [0.7, 0.2, 0.9, 0.0] },
]

const QUERY = { label: 'Book a client dinner in Tokyo, quiet, Thursday', vec: [0.9, 0.15, 0.85, 0.1] }
const RECALL_THRESHOLD = 0.6
const BUDGET = 80

function MemoryLab() {
  const [lts, setLts] = useState<MemEntry[]>(LTS_SEED)
  const [retrievedIds, setRetrievedIds] = useState<number[]>([])
  const [written, setWritten] = useState(false)

  const base = {
    system: 'You are a helpful executive assistant.',
    conversation: 'User: Book a client dinner in Tokyo next Thursday.',
    scratchpad: 'Constraints: Thursday, ¥15,000/person, quiet venue.',
  }

  const retrieved = lts.filter((e) => retrievedIds.includes(e.id))
  const used = [base.system, base.conversation, base.scratchpad, ...retrieved.map((e) => e.text)].reduce(
    (acc, t) => acc + estTokens(t),
    0,
  )
  const over = used > BUDGET

  const recall = () => {
    const relevant = lts
      .map((e) => ({ e, sim: cosineSimilarity(QUERY.vec, e.vec) }))
      .filter(({ sim }) => sim >= RECALL_THRESHOLD)
      .map(({ e }) => e.id)
    setRetrievedIds(relevant)
  }

  const writeMemory = () => {
    if (written) return
    const entry: MemEntry = {
      id: Math.max(...lts.map((e) => e.id)) + 1,
      title: 'Scratchpad summary (written)',
      text: 'Client dinner: Thursday, quiet venue, ¥15,000/person cap.',
      vec: [0.6, 0.3, 0.7, 0.2],
      isNew: true,
    }
    setLts([entry, ...lts])
    setWritten(true)
  }

  const sim = (e: MemEntry) => cosineSimilarity(QUERY.vec, e.vec)

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Task query: <span className="font-medium text-ink">"{QUERY.label}"</span>, recall scores
        every long-term entry with live cosine similarity (threshold {RECALL_THRESHOLD}).
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {/* Working memory */}
        <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            Working memory <span className="normal-case text-[10px] text-ink-muted">(context window)</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {[
              { label: 'system', text: base.system },
              { label: 'conversation', text: base.conversation },
              { label: 'scratchpad', text: base.scratchpad },
              ...retrieved.map((e) => ({ label: `retrieved #${e.id}`, text: e.text })),
            ].map((item) => (
              <li key={item.label + item.text} className="flex items-start justify-between gap-2 rounded border border-border bg-surface px-2 py-1.5 text-xs">
                <span>
                  <span className="mr-1.5 font-mono text-[10px] text-ink-muted">{item.label}</span>
                  {item.text}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-accent">{estTokens(item.text)}t</span>
              </li>
            ))}
          </ul>
          <div
            className="mt-3"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={BUDGET}
            aria-valuenow={used}
            aria-label={`Context window usage: ${used} of ${BUDGET} tokens${over ? ', over budget' : ''}`}
          >
            <div className="flex justify-between font-mono text-[10px] text-ink-muted">
              <span>context usage</span>
              <span className={over ? 'text-danger' : 'text-accent'}>{used}/{BUDGET} tokens</span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div
                className={`h-full transition-all duration-300 ${over ? 'bg-danger' : 'bg-accent'}`}
                style={{ width: `${Math.min(100, (used / BUDGET) * 100)}%` }}
              />
            </div>
          </div>
          {over && (
            <p className="mt-2 rounded border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] text-ink">
              Over budget, the host must drop or summarize something before the next call. This
              is the <strong>working-memory wall</strong>.
            </p>
          )}
        </div>

        {/* Long-term memory */}
        <div className="rounded-lg border border-border bg-surface-raised/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-success">
            Long-term memory <span className="normal-case text-[10px] text-ink-muted">(vector store)</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {lts.map((e) => {
              const s = sim(e)
              const relevant = s >= RECALL_THRESHOLD
              return (
                <li key={e.id} className="rounded border border-border bg-surface px-2 py-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">
                      {e.title}
                      {e.isNew && <span className="ml-1.5 rounded bg-highlight/20 px-1 py-0.5 font-mono text-[9px] text-highlight">new</span>}
                    </span>
                    <span className={`shrink-0 font-mono text-[10px] ${relevant ? 'text-success' : 'text-ink-muted'}`}>
                      sim {s.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-ink-muted">{e.text}</div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          onClick={recall}
          aria-label="Recall memories relevant to the task query from long-term memory"
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          ⤵ Recall relevant memories
        </button>
        <button
          onClick={writeMemory}
          disabled={written}
          aria-label="Write the scratchpad summary into long-term memory"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✎ Write observation to memory
        </button>
        <button
          onClick={() => setRetrievedIds([])}
          disabled={retrievedIds.length === 0}
          aria-label="Clear retrieved memories from working memory"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✕ Clear retrieved
        </button>
        <span className="text-xs text-ink-muted">
          {retrievedIds.length > 0
            ? `${retrievedIds.length} entr${retrievedIds.length === 1 ? 'y' : 'ies'} injected into working memory`
            : 'nothing retrieved yet'}
        </span>
      </div>
      <p className="text-[11px] leading-5 text-ink-muted">
        Try it in order: recall (three entries fit, barely), then write + recall again, the
        written memory comes back too, and the budget breaks. That tension is why agents summarize
        and compact instead of appending forever.
      </p>
    </div>
  )
}

// ── Lab 2: Planning ─────────────────────────────────────────────────────────

type Status = 'pending' | 'done' | 'failed'
type Sub = { id: number; title: string; status: Status; replanned?: boolean }

const PLAN_SEED: Sub[] = [
  { id: 1, title: 'Check calendar availability', status: 'pending' },
  { id: 2, title: "Pick a restaurant near the client's hotel", status: 'pending' },
  { id: 3, title: 'Book the table', status: 'pending' },
  { id: 4, title: 'Send confirmation email', status: 'pending' },
]

const EXEC_LOGS: string[] = [
  '✓ Calendar: Thursday 19:00 is free.',
  '✗ "Pick a restaurant" failed, booking tool returned 403: venue requires dietary constraints the planner never had.',
  '⟳ Reflection → replan: inserted "Ask the client for dietary constraints" before retrying.',
  '✓ Client: one vegetarian, no shellfish.',
  '✓ Retry succeeded: quiet restaurant near the hotel with vegetarian options.',
  '✓ Table booked for Thursday 19:00.',
  '✓ Confirmation email sent. All plan steps done.',
]

function PlanningLab() {
  const [subs, setSubs] = useState<Sub[]>(PLAN_SEED)
  const [execCount, setExecCount] = useState(0)
  const [replans, setReplans] = useState(0)
  const [log, setLog] = useState<string[]>([])

  const allDone = subs.every((s) => s.status === 'done')

  const executeNext = () => {
    const n = execCount
    if (n >= 6) return
    setExecCount(n + 1)
    setLog((prev) => [...prev, EXEC_LOGS[n] as string])
    if (n === 0) {
      setSubs((prev) => prev.map((s) => (s.id === 1 ? { ...s, status: 'done' as Status } : s)))
    } else if (n === 1) {
      // Deterministic failure → reflection → replan
      setSubs((prev) =>
        prev.map((s) => (s.id === 2 ? { ...s, status: 'failed' as Status } : s)),
      )
      setReplans((r) => r + 1)
    } else if (n === 2) {
      setSubs((prev) => {
        const copy = prev.map((s) => (s.id === 2 ? { ...s, status: 'pending' as Status } : s))
        const idx = copy.findIndex((s) => s.id === 2)
        copy.splice(idx, 0, { id: 5, title: 'Ask the client for dietary constraints', status: 'pending' as Status, replanned: true })
        return copy
      })
    } else if (n === 3) {
      setSubs((prev) => prev.map((s) => (s.id === 5 ? { ...s, status: 'done' as Status } : s)))
    } else if (n === 4) {
      setSubs((prev) => prev.map((s) => (s.id === 2 ? { ...s, status: 'done' as Status } : s)))
    } else if (n === 5) {
      setSubs((prev) => prev.map((s) => (s.id === 3 ? { ...s, status: 'done' as Status } : s)))
    } else {
      setSubs((prev) => prev.map((s) => (s.id === 4 ? { ...s, status: 'done' as Status } : s)))
    }
  }

  const reset = () => {
    setSubs(PLAN_SEED)
    setExecCount(0)
    setReplans(0)
    setLog([])
  }

  const chip = (s: Status) =>
    s === 'done'
      ? 'border-success/40 bg-success/10 text-success'
      : s === 'failed'
        ? 'border-danger/40 bg-danger/10 text-danger'
        : 'border-border text-ink-muted'

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {subs.map((s) => (
          <li
            key={s.id}
            className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-sm ${chip(s.status)}`}
          >
            <span>
              {s.id}. {s.title}
              {s.replanned && <span className="ml-1.5 rounded bg-highlight/20 px-1 py-0.5 font-mono text-[9px] text-highlight">replan</span>}
            </span>
            <span className="shrink-0 font-mono text-[10px] uppercase">{s.status}</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={executeNext}
          disabled={allDone}
          aria-label="Execute the next plan step"
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Execute next step ▸
        </button>
        <button
          onClick={reset}
          aria-label="Reset the plan to its initial state"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          ↺ Reset plan
        </button>
        <span className="text-xs text-ink-muted">replans: {replans}</span>
      </div>

      <div aria-live="polite">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Executor log</div>
        {log.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">No steps executed yet.</p>
        ) : (
          <ol className="mt-1 space-y-1">
            {log.map((l, i) => (
              <li key={`${i}-${l.slice(0, 12)}`} className="rounded border border-border bg-surface px-2 py-1 font-mono text-[11px] text-ink/85">
                {l}
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="text-[11px] leading-5 text-ink-muted">
        Watch step 2: it fails the first time on purpose. Without a replan the run would either
        die or retry the identical call forever, the reflection step is what turns a dead end
        into a detour.
      </p>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────────────

export function MemoryPlanningViz() {
  const [tab, setTab] = useState('Memory')
  return (
    <div className="space-y-4">
      <Tabs tabs={['Memory', 'Planning']} active={tab} onChange={setTab} />
      <FadeSwitch activeKey={tab}>{tab === 'Memory' ? <MemoryLab /> : <PlanningLab />}</FadeSwitch>
    </div>
  )
}
