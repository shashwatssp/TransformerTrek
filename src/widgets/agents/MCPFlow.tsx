/**
 * MCPFlow, Model Context Protocol walkthrough in three tabs:
 *  1. Sequence: animated host ↔ client ↔ server message exchange (initialize,
 *     discovery, tools/call, observation).
 *  2. Primitives: tools (model-controlled), resources (app-controlled),
 *     prompts (user-controlled) with example payloads.
 *  3. 2026 spec: stateless core + Tasks.
 */
import { useEffect, useState } from 'react'
import { FadeSwitch, Slider, Tabs } from '../../components/ui'

type Lane = 'host' | 'client' | 'server'
type Msg = { from: Lane; to: Lane; label: string; note: string }

const SEQ: Msg[] = [
  { from: 'host', to: 'client', label: 'start client, one per server', note: 'The host app opens one client connection per MCP server it wants to use.' },
  { from: 'client', to: 'server', label: 'initialize → version + capabilities', note: 'Handshake: both sides declare protocol version and what they support.' },
  { from: 'server', to: 'client', label: 'result → its capabilities', note: 'The server advertises the tools, resources, and prompts it offers.' },
  { from: 'client', to: 'server', label: 'tools/list', note: 'Discovery, the host learns every tool and its JSON Schema.' },
  { from: 'server', to: 'client', label: 'result → tool schemas', note: 'Schemas go straight into the model\'s tool registry (Module 5.2).' },
  { from: 'client', to: 'server', label: 'tools/call { get_forecast }', note: 'The LLM emitted a tool call; the host validated it and the client forwarded it.' },
  { from: 'server', to: 'client', label: 'result → forecast data', note: 'The server executes and returns the observation.' },
  { from: 'client', to: 'host', label: 'observation → into context', note: 'Back into the agent loop of Module 5.1: MCP standardized only the plumbing.' },
]

const LANES: { id: Lane; title: string; sub: string }[] = [
  { id: 'host', title: 'Host', sub: 'the AI app (Claude Desktop, IDE…)' },
  { id: 'client', title: 'Client', sub: '1:1 connector inside the host' },
  { id: 'server', title: 'Server', sub: 'exposes tools/resources/prompts' },
]

const LANE_LABEL: Record<Lane, string> = { host: 'host', client: 'client', server: 'server' }

const PRIMITIVES = [
  {
    name: 'Tools',
    control: 'Model-controlled, the LLM decides when to call',
    code: `// client → server
{ "method": "tools/call",
  "params": { "name": "get_forecast",
              "arguments": { "city": "Tokyo", "days": 3 } } }`,
    who: 'Like function calling (Module 5.2), but any app can use any compliant server.',
  },
  {
    name: 'Resources',
    control: 'App-controlled, the host attaches them for context',
    code: `// client → server
{ "method": "resources/read",
  "params": { "uri": "file:///reports/q3.csv" } }`,
    who: 'URI-addressed data (files, DB rows, API docs) the app decides to include.',
  },
  {
    name: 'Prompts',
    control: 'User-controlled, the human picks them',
    code: `// client → server
{ "method": "prompts/get",
  "params": { "name": "code-review",
              "arguments": { "language": "ts" } } }`,
    who: 'Reusable, parameterized templates surfaced as slash-commands in the UI.',
  },
]

export function MCPFlow() {
  const [tab, setTab] = useState('Sequence')
  return (
    <div className="space-y-4">
      <Tabs tabs={['Sequence', 'Primitives', '2026 spec']} active={tab} onChange={setTab} />
      <FadeSwitch activeKey={tab}>
        {tab === 'Sequence' && <SequenceTab />}
        {tab === 'Primitives' && <PrimitivesTab />}
        {tab === '2026 spec' && <SpecTab />}
      </FadeSwitch>
    </div>
  )
}

function SequenceTab() {
  const [shown, setShown] = useState(1)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(2)
  const intervalMs = 1800 - speed * 300
  const atEnd = shown >= SEQ.length

  useEffect(() => {
    if (!running) return
    if (atEnd) {
      setRunning(false)
      return
    }
    const id = setInterval(() => setShown((s) => Math.min(s + 1, SEQ.length)), intervalMs)
    return () => clearInterval(id)
  }, [running, shown, atEnd, intervalMs])

  const last = SEQ[shown - 1]

  return (
    <div className="space-y-3">
      {/* Lanes */}
      <div role="img" aria-label={`MCP sequence diagram: ${LANE_LABEL[last.from]} sends "${last.label}" to ${LANE_LABEL[last.to]}. ${last.note}`}>
        <div className="grid grid-cols-3 gap-2">
          {LANES.map((lane) => {
            const active = last.from === lane.id || last.to === lane.id
            return (
              <div
                key={lane.id}
                className={`rounded-lg border px-3 py-2 text-center transition-colors duration-300 ${
                  active ? 'border-accent bg-accent/10' : 'border-border bg-surface-raised/60'
                }`}
              >
                <div className={`text-sm font-semibold ${active ? 'text-accent' : 'text-ink'}`}>{lane.title}</div>
                <div className="mt-0.5 text-[10px] leading-4 text-ink-muted">{lane.sub}</div>
              </div>
            )
          })}
        </div>

        {/* Messages */}
        <ol className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {SEQ.slice(0, shown).map((m, i) => {
            const isLast = i === shown - 1
            return (
              <li
                key={`${i}-${m.label}`}
                className={`rounded border px-2.5 py-1.5 text-xs ${isLast ? 'border-accent/50 bg-accent/5' : 'border-border text-ink-muted'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-accent">
                    {LANE_LABEL[m.from]} → {LANE_LABEL[m.to]}
                  </span>
                  <span className={`font-mono ${isLast ? 'text-ink' : ''}`}>{m.label}</span>
                </div>
                {isLast && <div className="mt-1 text-ink-muted">{m.note}</div>}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
        <button
          onClick={() => {
            if (atEnd && !running) setShown(1)
            setRunning((r) => !r)
          }}
          aria-pressed={running}
          aria-label={running ? 'Pause the MCP message sequence' : 'Play the MCP message sequence'}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          {running ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => {
            setRunning(false)
            setShown((s) => Math.min(s + 1, SEQ.length))
          }}
          disabled={atEnd}
          aria-label="Show the next MCP message"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          Step ▸
        </button>
        <button
          onClick={() => {
            setRunning(false)
            setShown(1)
          }}
          aria-label="Reset the sequence to the first message"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          ↺ Reset
        </button>
        <div className="w-36">
          <Slider label="Speed" value={speed} min={1} max={5} step={1} onChange={setSpeed} format={(v) => `${v}×`} />
        </div>
        <span className="text-xs text-ink-muted">
          message {Math.min(shown, SEQ.length)}/{SEQ.length}
        </span>
      </div>
    </div>
  )
}

function PrimitivesTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Everything a server can offer falls into three primitives, the difference is{' '}
        <strong className="text-ink">who controls when it's used</strong>:
      </p>
      {PRIMITIVES.map((p) => (
        <div key={p.name} className="rounded-lg border border-border bg-surface-raised/40 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-ink">{p.name}</span>
            <span className="text-[11px] text-accent">{p.control}</span>
          </div>
          <pre className="mt-2 overflow-x-auto rounded border border-border bg-surface p-2 font-mono text-[11px] leading-5 text-ink/85">
{p.code}
          </pre>
          <p className="mt-1.5 text-[11px] text-ink-muted">{p.who}</p>
        </div>
      ))}
      <p className="text-[11px] text-ink-muted">
        Source:{' '}
        <a href="https://modelcontextprotocol.io/docs/concepts/tools" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          MCP docs, tools
        </a>
        ,{' '}
        <a href="https://modelcontextprotocol.io/docs/concepts/resources" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          resources
        </a>
        ,{' '}
        <a href="https://modelcontextprotocol.io/docs/concepts/prompts" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          prompts
        </a>
        .
      </p>
    </div>
  )
}

function SpecTab() {
  return (
    <div className="space-y-3 text-sm text-ink/90">
      <p>
        The protocol is evolving on a fixed release train, and the{' '}
        <a href="https://modelcontextprotocol.io/specification/latest" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          latest specification
        </a>
        , developed in the open in the{' '}
        <a href="https://github.com/modelcontextprotocol/modelcontextprotocol" target="_blank" rel="noopener noreferrer" className="text-accent underline">
          spec repo
        </a>
        , pulls MCP toward a lighter, more deployable core:
      </p>
      <ul className="list-disc space-y-2 pl-6 text-[13px]">
        <li>
          <strong>Stateless core.</strong> After the initialize handshake, servers shouldn't need
          to hold per-session state between calls, each request carries what it needs. Servers
          become horizontally scalable and can restart freely behind a load balancer.
        </li>
        <li>
          <strong>Tasks.</strong> Long-running operations become first-class: a client starts a
          <em> task</em>, then polls or receives status updates and collects the result when it's
          ready, instead of holding one HTTP request open for minutes. Work becomes resumable
          and cancellable.
        </li>
        <li>
          <strong>Discovery everywhere.</strong> Servers declare capabilities at initialize and
          expose lists (tools/list, resources/list, prompts/list), the host never hard-codes what
          a server can do.
        </li>
        <li>
          <strong>Richer surfaces.</strong> Work on MCP Apps extends the protocol so servers can
          deliver structured, interactive UI, not just text, back to the host.
        </li>
      </ul>
      <p className="rounded border border-highlight/40 bg-highlight/5 px-3 py-2 text-[12px] text-ink/85">
        Why it matters: a stateless core makes MCP servers cloud-native infrastructure, and Tasks
        make them well-behaved citizens behind agents that run for minutes, not milliseconds.
      </p>
    </div>
  )
}
