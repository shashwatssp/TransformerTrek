/**
 * A2AFlow — Agent-to-Agent protocol walkthrough in three tabs:
 *  1. Agent Card: the JSON "business card" every A2A agent publishes.
 *  2. Task lifecycle: interactive state machine (submitted → working →
 *     input-required → completed, with cancel/fail branches).
 *  3. Topologies: supervisor / handoff (swarm) / hierarchical graphs
 *     rendered with @xyflow/react.
 */
import { useState, type CSSProperties } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Tabs } from '../../components/ui'

export function A2AFlow() {
  const [tab, setTab] = useState('Agent Card')
  return (
    <div className="space-y-4">
      <Tabs tabs={['Agent Card', 'Task lifecycle', 'Topologies']} active={tab} onChange={setTab} />
      {tab === 'Agent Card' && <AgentCardTab />}
      {tab === 'Task lifecycle' && <LifecycleTab />}
      {tab === 'Topologies' && <TopologiesTab />}
    </div>
  )
}

// ── Tab 1: Agent card ───────────────────────────────────────────────────────

const CARD_JSON = `{
  "name": "Trip Planner",
  "description": "Builds travel itineraries with live pricing.",
  "url": "https://planner.example.com/a2a",
  "version": "1.2.0",
  "capabilities": { "streaming": true, "pushNotifications": false },
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text", "file"],
  "skills": [
    { "id": "itinerary", "name": "Itinerary planning",
      "description": "Multi-city trip plans within a budget" },
    { "id": "pricing", "name": "Price scanning",
      "description": "Live flight and hotel price checks" }
  ]
}`

function AgentCardTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Every A2A agent serves this card at a well-known URL —{' '}
        <code className="font-mono text-accent">/.well-known/agent-card.json</code> in recent
        spec versions. No central registry: you can discover any agent with one GET.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[11px] leading-5 text-ink/85">
{CARD_JSON}
        </pre>
        <ul className="space-y-2 text-xs text-ink/85">
          <li className="rounded border border-border bg-surface-raised/40 px-2.5 py-2">
            <strong className="text-accent">name / description / skills</strong> — what a client
            agent reads to decide <em>whether</em> to delegate (and to whom).
          </li>
          <li className="rounded border border-border bg-surface-raised/40 px-2.5 py-2">
            <strong className="text-accent">url</strong> — where the A2A endpoints live; all
            interaction happens through it.
          </li>
          <li className="rounded border border-border bg-surface-raised/40 px-2.5 py-2">
            <strong className="text-accent">capabilities</strong> — protocol features the agent
            supports (streaming, push notifications) so clients can degrade gracefully.
          </li>
          <li className="rounded border border-border bg-surface-raised/40 px-2.5 py-2">
            <strong className="text-accent">input/output modes</strong> — content types, so a
            client knows it can send text and receive files.
          </li>
        </ul>
      </div>
      <p className="text-[11px] text-ink-muted">
        Compare with MCP (<em>Module 5.4</em>): MCP advertises <em>tools</em> to a model; an A2A
        card advertises a whole <em>agent</em> — skills and endpoints — to other agents.
      </p>
    </div>
  )
}

// ── Tab 2: Task lifecycle ───────────────────────────────────────────────────

type TaskState = 'submitted' | 'working' | 'input-required' | 'completed' | 'canceled'

const STATE_PATH: { state: TaskState; log: string }[] = [
  { state: 'submitted', log: '→ message/send: "Make me a 3-day Tokyo itinerary."' },
  { state: 'working', log: 'Agent accepted the task; status updates start streaming.' },
  { state: 'input-required', log: 'Agent pauses: "What is your budget per day?" — delegation is multi-turn.' },
  { state: 'working', log: '← client replies "$200/day"; the agent continues the same task.' },
  { state: 'completed', log: 'Artifact attached: tokyo-itinerary.md (2.4 kB). Task complete.' },
]

const ALL_STATES: TaskState[] = ['submitted', 'working', 'input-required', 'completed', 'canceled']

function LifecycleTab() {
  const [step, setStep] = useState(0) // 0..5; 5 = terminal (completed)
  const [canceled, setCanceled] = useState(false)
  const done = canceled || step >= STATE_PATH.length

  const state: TaskState = canceled ? 'canceled' : STATE_PATH[Math.min(step, STATE_PATH.length - 1)].state
  const log: string[] = canceled
    ? ['Client canceled the task — the agent stops cleanly and reports cancellation.']
    : STATE_PATH.slice(0, Math.min(step, STATE_PATH.length)).map((s) => s.log)

  const advance = () => setStep((s) => Math.min(s + 1, STATE_PATH.length))
  const cancel = () => setCanceled(true)
  const reset = () => {
    setStep(0)
    setCanceled(false)
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap gap-1.5">
        {ALL_STATES.map((s) => (
          <span
            key={s}
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${
              s === state
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-ink-muted'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      <ol className="space-y-1">
        {log.map((l, i) => (
          <li key={`${i}-${l.slice(0, 16)}`} className="rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-ink/85">
            {l}
          </li>
        ))}
      </ol>

      {state === 'completed' && (
        <div className="rounded border border-success/40 bg-success/10 px-3 py-2 text-xs text-ink">
          <strong className="text-success">Artifact</strong> — the task's deliverable (a file,
          structured data…), returned with the terminal state, not buried in chat.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <button
          onClick={advance}
          disabled={done}
          aria-label="Advance the A2A task to its next state"
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Advance task ▸
        </button>
        <button
          onClick={cancel}
          disabled={done}
          aria-label="Cancel the A2A task"
          className="rounded-lg border border-danger/40 px-3.5 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel task
        </button>
        <button
          onClick={reset}
          aria-label="Reset the task lifecycle demo"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          ↺ Reset
        </button>
      </div>
      <p className="text-[11px] text-ink-muted">
        States are the spec's task-status values. Note <strong>input-required</strong>: A2A
        models delegation as a long-lived conversation, not a one-shot RPC — that's the feature
        plain function calling never had.
      </p>
    </div>
  )
}

// ── Tab 3: Topologies (@xyflow/react) ──────────────────────────────────────

const NODE_STYLE: CSSProperties = {
  background: '#1a2332',
  border: '1px solid #253048',
  borderRadius: 8,
  color: '#e6ebf4',
  fontSize: 11,
  padding: 8,
  width: 128,
}

function mkNode(id: string, label: string, x: number, y: number, accent = false): Node {
  return {
    id,
    position: { x, y },
    data: { label },
    style: accent
      ? { ...NODE_STYLE, borderColor: '#22d3ee', color: '#22d3ee' }
      : NODE_STYLE,
  }
}

function mkEdge(id: string, source: string, target: string, label?: string): Edge {
  return {
    id,
    source,
    target,
    label,
    animated: true,
    style: { stroke: '#3f5478' },
    labelStyle: { fill: '#8b95a8', fontSize: 10 },
    labelBgStyle: { fill: '#111827' },
  }
}

type Topology = { label: string; nodes: Node[]; edges: Edge[]; summary: string }

const TOPOLOGIES: Record<string, Topology> = {
  Supervisor: {
    label: 'Supervisor',
    summary:
      'A supervisor agent owns the goal and delegates to specialist workers; all results report back through it. Easiest to audit and to budget — one place sees everything.',
    nodes: [
      mkNode('sup', 'Supervisor', 240, 20, true),
      mkNode('res', 'Researcher', 40, 170),
      mkNode('cod', 'Coder', 240, 170),
      mkNode('wri', 'Writer', 440, 170),
    ],
    edges: [
      mkEdge('e1', 'sup', 'res', 'delegate'),
      mkEdge('e2', 'sup', 'cod', 'delegate'),
      mkEdge('e3', 'sup', 'wri', 'delegate'),
      mkEdge('e4', 'res', 'sup', 'report'),
      mkEdge('e5', 'cod', 'sup', 'report'),
      mkEdge('e6', 'wri', 'sup', 'report'),
    ],
  },
  'Handoff (swarm)': {
    label: 'Handoff (swarm)',
    summary:
      'No boss: any agent can transfer control directly to a better-suited peer, passing the conversation along. Flexible and cheap to route — but control flow is emergent, so traces are harder to follow.',
    nodes: [
      mkNode('tri', 'Triage', 240, 20, true),
      mkNode('flights', 'Flights', 60, 180),
      mkNode('hotels', 'Hotels', 240, 180),
      mkNode('events', 'Events', 420, 180),
      mkNode('writer', 'Summary writer', 240, 320),
    ],
    edges: [
      mkEdge('e1', 'tri', 'flights', 'handoff'),
      mkEdge('e2', 'tri', 'hotels', 'handoff'),
      mkEdge('e3', 'tri', 'events', 'handoff'),
      mkEdge('e4', 'flights', 'hotels', 'handoff'),
      mkEdge('e5', 'hotels', 'events', 'handoff'),
      mkEdge('e6', 'events', 'writer', 'handoff'),
      mkEdge('e7', 'writer', 'tri', 'cycle'),
    ],
  },
  Hierarchical: {
    label: 'Hierarchical',
    summary:
      'Teams of teams: a coordinator delegates to sub-supervisors, each with its own workers. Scales furthest — and each level is an audit boundary.',
    nodes: [
      mkNode('coord', 'Coordinator', 240, 10, true),
      mkNode('plan', 'Planning lead', 90, 150),
      mkNode('exec', 'Execution lead', 390, 150),
      mkNode('w1', 'Flights', 20, 290),
      mkNode('w2', 'Hotels', 170, 290),
      mkNode('w3', 'Booker', 320, 290),
      mkNode('w4', 'Mailer', 470, 290),
    ],
    edges: [
      mkEdge('e1', 'coord', 'plan', 'delegate'),
      mkEdge('e2', 'coord', 'exec', 'delegate'),
      mkEdge('e3', 'plan', 'w1'),
      mkEdge('e4', 'plan', 'w2'),
      mkEdge('e5', 'exec', 'w3'),
      mkEdge('e6', 'exec', 'w4'),
      mkEdge('e7', 'w3', 'exec', 'report'),
      mkEdge('e8', 'w4', 'exec', 'report'),
    ],
  },
}

function TopologiesTab() {
  const [preset, setPreset] = useState<string>('Supervisor')
  const topology = TOPOLOGIES[preset]
  const [nodes, setNodes] = useState<Node[]>(topology.nodes)
  const [edges, setEdges] = useState<Edge[]>(topology.edges)

  const switchTo = (key: string) => {
    setPreset(key)
    setNodes(TOPOLOGIES[key].nodes)
    setEdges(TOPOLOGIES[key].edges)
  }

  const onNodesChange = (changes: NodeChange[]) =>
    setNodes((nds) => applyNodeChanges(changes, nds))
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges((eds) => applyEdgeChanges(changes, eds))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Topology presets">
        {Object.keys(TOPOLOGIES).map((key) => (
          <button
            key={key}
            onClick={() => switchTo(key)}
            aria-pressed={preset === key}
            aria-label={`Show ${key} topology`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              preset === key
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:bg-surface-raised hover:text-ink'
            }`}
          >
            {TOPOLOGIES[key].label}
          </button>
        ))}
      </div>

      <div
        className="h-[300px] overflow-hidden rounded-lg border border-border"
        role="img"
        aria-label={`${topology.label} topology: ${topology.summary}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          colorMode="dark"
          fitView
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="text-xs text-ink/85">{topology.summary}</p>
      <ul className="sr-only">
        {nodes.map((n) => (
          <li key={n.id}>agent: {String(n.data.label)}</li>
        ))}
      </ul>
    </div>
  )
}
