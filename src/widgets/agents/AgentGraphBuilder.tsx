/**
 * AgentGraphBuilder, a LangGraph-style state graph (nodes, conditional
 * edges, reducers, cycles) rendered with @xyflow/react. A step-through
 * execution trace highlights the active node, the edges taken (including
 * the retry cycle), and a live state panel shows reducers at work.
 */
import { useEffect, useState } from 'react'
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
import { Button } from '../../components/ui'
import { useChartTheme, type ChartPalette } from '../../lib/chartTheme'

// ── Static graph definition (styles follow the theme) ─────────────────────────────

function nodeStyle(pal: ChartPalette) {
  return {
    background: pal.nodeBg,
    border: `1px solid ${pal.nodeBorder}`,
    borderRadius: 8,
    color: pal.nodeText,
    fontSize: 11,
    padding: 8,
    width: 132,
  }
}

function pillStyle(pal: ChartPalette) {
  return {
    ...nodeStyle(pal),
    borderRadius: 999,
    background: pal.labelBg,
    width: 84,
    fontSize: 10,
    color: pal.muted,
  }
}

function buildBaseNodes(pal: ChartPalette): Node[] {
  return [
    { id: 'start', data: { label: 'START' }, position: { x: 0, y: 76 }, style: pillStyle(pal) },
    { id: 'retrieve', data: { label: 'retrieve' }, position: { x: 104, y: 66 }, style: nodeStyle(pal) },
    { id: 'grade', data: { label: 'grade_documents' }, position: { x: 256, y: 66 }, style: nodeStyle(pal) },
    { id: 'generate', data: { label: 'generate' }, position: { x: 408, y: 66 }, style: nodeStyle(pal) },
    { id: 'end', data: { label: 'END' }, position: { x: 560, y: 76 }, style: pillStyle(pal) },
    { id: 'rewrite', data: { label: 'rewrite_query' }, position: { x: 256, y: 196 }, style: nodeStyle(pal) },
  ]
}

function buildBaseEdges(pal: ChartPalette): Edge[] {
  return [
    { id: 'e1', source: 'start', target: 'retrieve', style: { stroke: pal.axis } },
    { id: 'e2', source: 'retrieve', target: 'grade', style: { stroke: pal.axis } },
    { id: 'e3', source: 'grade', target: 'generate', label: 'relevant', labelStyle: { fill: pal.muted, fontSize: 10 }, labelBgStyle: { fill: pal.labelBg }, style: { stroke: pal.axis } },
    { id: 'e4', source: 'grade', target: 'rewrite', label: 'not relevant', labelStyle: { fill: pal.muted, fontSize: 10 }, labelBgStyle: { fill: pal.labelBg }, style: { stroke: pal.axis } },
    { id: 'e5', source: 'rewrite', target: 'retrieve', label: 'retry, cycle', labelStyle: { fill: pal.highlight, fontSize: 10 }, labelBgStyle: { fill: pal.labelBg }, style: { stroke: pal.axis, strokeDasharray: '4 3' } },
    { id: 'e6', source: 'generate', target: 'end', label: 'grounded', labelStyle: { fill: pal.muted, fontSize: 10 }, labelBgStyle: { fill: pal.labelBg }, style: { stroke: pal.axis } },
    { id: 'e7', source: 'generate', target: 'rewrite', label: 'not grounded, cycle', labelStyle: { fill: pal.highlight, fontSize: 10 }, labelBgStyle: { fill: pal.labelBg }, style: { stroke: pal.axis, strokeDasharray: '4 3' } },
  ]
}

const CYCLE_EDGES = new Set(['e5', 'e7'])

// ── Scripted execution trace ───────────────────────────────────────────────

type AgentState = {
  question: string
  documents: string[]
  generation: string
  web_searches: number
}

type ExecStep = {
  node: string
  edgeTaken?: string
  cond?: string
  log: string
  state: AgentState
}

const Q1 = 'which animals hibernate?'
const Q2 = 'true hibernators: body-temperature drop and torpor'
const D1 = [
  'bear winter denning (pregnancy, not hibernation)',
  'ski resort winter operations guide',
  'bat roost construction manual',
]
const D2 = [
  'true hibernators: hedgehogs, dormice, some bats',
  'ground squirrels: torpor cycles in winter',
]
const ANSWER =
  'True hibernators include hedgehogs, dormice, some bats, and ground squirrels; bears enter a lighter torpor.'

const INITIAL_STATE: AgentState = { question: Q1, documents: [], generation: '', web_searches: 0 }

const STEPS: ExecStep[] = [
  {
    node: 'retrieve',
    edgeTaken: 'e2',
    log: 'retrieve: fetched 3 documents → documents: replace (last write wins)',
    state: { question: Q1, documents: D1, generation: '', web_searches: 0 },
  },
  {
    node: 'grade',
    cond: 'not relevant',
    edgeTaken: 'e4',
    log: 'grade_documents: only 1/3 relevant → router chose "not relevant"',
    state: { question: Q1, documents: D1, generation: '', web_searches: 0 },
  },
  {
    node: 'rewrite',
    edgeTaken: 'e5',
    log: 'rewrite_query: sharpened the question, CYCLE edge back to retrieve',
    state: { question: Q2, documents: D1, generation: '', web_searches: 0 },
  },
  {
    node: 'retrieve',
    edgeTaken: 'e2',
    log: 'retrieve #2: 2 better documents → documents: replace; web_searches: 1 (add reducer)',
    state: { question: Q2, documents: D2, generation: '', web_searches: 1 },
  },
  {
    node: 'grade',
    cond: 'relevant',
    edgeTaken: 'e3',
    log: 'grade_documents: 2/2 relevant → router chose "relevant"',
    state: { question: Q2, documents: D2, generation: '', web_searches: 1 },
  },
  {
    node: 'generate',
    cond: 'grounded',
    edgeTaken: 'e6',
    log: 'generate: answer grounded in 2/2 documents → "grounded" → END',
    state: { question: Q2, documents: D2, generation: ANSWER, web_searches: 1 },
  },
]

// ── Component ───────────────────────────────────────────────────────────────

export function AgentGraphBuilder() {
  const pal = useChartTheme()
  const [step, setStep] = useState(0) // steps executed
  const [nodes, setNodes] = useState<Node[]>(() => buildBaseNodes(pal))
  const [edges, setEdges] = useState<Edge[]>(() => buildBaseEdges(pal))

  // Rebuild base styling when the theme flips (positions reset, acceptable)
  useEffect(() => {
    setNodes(buildBaseNodes(pal))
    setEdges(buildBaseEdges(pal))
  }, [pal])

  const onNodesChange = (changes: NodeChange[]) =>
    setNodes((nds) => applyNodeChanges(changes, nds))
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges((eds) => applyEdgeChanges(changes, eds))

  const runNext = () => setStep((s) => Math.min(s + 1, STEPS.length))
  const runAll = () => setStep(STEPS.length)
  const reset = () => setStep(0)

  const done = step >= STEPS.length
  const lastIdx = step - 1
  const current = step > 0 ? STEPS[lastIdx] : null
  const isCycle = current?.edgeTaken ? CYCLE_EDGES.has(current.edgeTaken) : false

  // Derive styling: visited (before last) = success, last = accent active
  const visited = new Set(STEPS.slice(0, Math.max(0, lastIdx)).map((s) => s.node))
  const active = current?.node ?? null
  const takenEdges = new Set(STEPS.slice(0, step).map((s) => s.edgeTaken).filter(Boolean) as string[])

  const styledNodes: Node[] = nodes.map((n) => {
    let style = { ...n.style }
    if (visited.has(n.id)) style = { ...style, borderColor: pal.success }
    if (active === n.id) style = { ...style, borderColor: pal.accent, color: pal.accent }
    return { ...n, style }
  })

  const styledEdges: Edge[] = edges.map((e) => {
    if (e.id === current?.edgeTaken) return { ...e, animated: true, style: { ...e.style, stroke: pal.accent } }
    if (takenEdges.has(e.id)) return { ...e, style: { ...e.style, stroke: pal.success } }
    return e
  })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Graph */}
        <div
          className="h-[290px] overflow-hidden rounded-lg border border-border"
          role="img"
          aria-label={
            current
              ? `State graph execution: ${current.node} just ran${current.cond ? ` and took the "${current.cond}" conditional edge` : ''}.`
              : 'State graph execution not started.'
          }
        >
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            colorMode={pal.colorMode}
            fitView
            proOptions={{ hideAttribution: false }}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* State + log */}
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-surface-raised/40 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Shared state {current ? <span className="normal-case text-[10px] text-accent">· after {current.node}</span> : '· initial'}
            </div>
            <StatePanel state={current ? current.state : INITIAL_STATE} />
          </div>
          <div aria-live="polite">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Trace</div>
            <ol className="mt-1 max-h-36 space-y-1 overflow-y-auto pr-1">
              {STEPS.slice(0, step).map((s, i) => (
                <li
                  key={`${i}-${s.node}`}
                  className={`rounded border px-2 py-1 font-mono text-[10px] leading-4 ${i === lastIdx ? 'border-accent/40 bg-accent/5 text-ink' : 'border-border text-ink-muted'}`}
                >
                  {s.log}
                </li>
              ))}
              {step === 0 && <li className="px-2 py-1 font-mono text-[10px] text-ink-muted">press "Run next node" to execute</li>}
            </ol>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button onClick={runNext}>{done ? '✓ run complete' : 'Run next node ▸'}</Button>
        <button
          onClick={runAll}
          disabled={done}
          aria-label="Run all remaining graph nodes"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run all ▸▸
        </button>
        <button
          onClick={reset}
          aria-label="Reset the graph execution"
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          ↺ Reset
        </button>
        {current?.cond && (
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] text-accent">
            conditional edge: {current.cond}
          </span>
        )}
        {isCycle && (
          <span className="rounded-full border border-highlight/40 bg-highlight/10 px-2.5 py-1 font-mono text-[10px] text-highlight">
            ⟲ cycle edge traversed
          </span>
        )}
      </div>
    </div>
  )
}

function StatePanel({ state }: { state: AgentState }) {
  return (
    <ul className="mt-1.5 space-y-1 font-mono text-[10px] leading-4">
      <li className="flex items-start justify-between gap-2">
        <span className="text-ink/85">question: "{truncate(state.question, 34)}"</span>
        <span className="shrink-0 rounded bg-primary/15 px-1 text-primary-bright">replace</span>
      </li>
      <li className="flex items-start justify-between gap-2">
        <span className="text-ink/85">documents: ({state.documents.length}) "{truncate(state.documents[0] ?? '', 26)}"</span>
        <span className="shrink-0 rounded bg-primary/15 px-1 text-primary-bright">replace</span>
      </li>
      <li className="flex items-start justify-between gap-2">
        <span className="text-ink/85">generation: "{truncate(state.generation, 30)}"</span>
        <span className="shrink-0 rounded bg-primary/15 px-1 text-primary-bright">replace</span>
      </li>
      <li className="flex items-start justify-between gap-2">
        <span className={`text-ink/85 ${state.web_searches > 0 ? 'text-success' : ''}`}>web_searches: {state.web_searches}</span>
        <span className="shrink-0 rounded bg-success/15 px-1 text-success">add</span>
      </li>
    </ul>
  )
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`
}
