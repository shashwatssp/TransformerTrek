/**
 * ReActStepper, steps through a real ReAct trace for a multi-hop question.
 * The two "mock" tools are genuinely executed in the browser: `search` looks
 * up a pinned mini-corpus, `calculator` parses and evaluates arithmetic via a
 * shunting-yard evaluator (no eval()). Observations are therefore real outputs.
 */
import { useState } from 'react'

// ── Mock tool implementations (actually executed) ──────────────────────────

const KNOWLEDGE: Record<string, string> = {
  'population of france': 'France has an estimated population of 68,000,000 people (2024).',
  'population of japan': 'Japan has an estimated population of 124,000,000 people (2024).',
  'population of germany': 'Germany has an estimated population of 83,000,000 people (2024).',
}

/** Tiny shunting-yard evaluator for + - * / and parentheses. Safe: no eval. */
export function evaluateExpression(expr: string): number {
  const tokens = expr.match(/\d+(\.\d+)?|[+\-*/()]/g)
  if (!tokens) throw new Error('no tokens')
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const out: (number | string)[] = []
  const ops: string[] = []
  for (const t of tokens) {
    if (/^\d/.test(t)) out.push(parseFloat(t))
    else if (t === '(') ops.push(t)
    else if (t === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') out.push(ops.pop() as string)
      if (ops.length === 0) throw new Error('unbalanced parentheses')
      ops.pop()
    } else {
      while (
        ops.length > 0 &&
        ops[ops.length - 1] !== '(' &&
        prec[ops[ops.length - 1]] >= prec[t]
      ) {
        out.push(ops.pop() as string)
      }
      ops.push(t)
    }
  }
  while (ops.length > 0) {
    const op = ops.pop() as string
    if (op === '(') throw new Error('unbalanced parentheses')
    out.push(op)
  }
  const stack: number[] = []
  for (const t of out) {
    if (typeof t === 'number') stack.push(t)
    else {
      const b = stack.pop()
      const a = stack.pop()
      if (a === undefined || b === undefined) throw new Error('malformed expression')
      stack.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b)
    }
  }
  const result = stack.pop()
  if (result === undefined || stack.length > 0 || !Number.isFinite(result)) {
    throw new Error('malformed expression')
  }
  return result
}

function runTool(tool: string, args: Record<string, string>): string {
  if (tool === 'search') {
    const q = (args['query'] ?? '').toLowerCase()
    for (const key of Object.keys(KNOWLEDGE)) {
      if (q.includes(key)) return KNOWLEDGE[key]
    }
    return 'No results found.'
  }
  if (tool === 'calculator') {
    try {
      return String(evaluateExpression(args['expression'] ?? ''))
    } catch {
      return 'Error: could not parse the expression.'
    }
  }
  return `Unknown tool: ${tool}`
}

// ── The scripted ReAct trace (observations computed at render) ─────────────

type Action = { tool: string; args: Record<string, string> }
type TraceStep = { thought: string; action?: Action; finalAnswer?: string }

const QUESTION = 'What is 12% of the population of France?'

const TRACE: TraceStep[] = [
  {
    thought:
      'This question has two parts: France\'s population and a percentage of it. I don\'t have current population data in my context, I should search first.',
    action: { tool: 'search', args: { query: 'population of France' } },
  },
  {
    thought:
      'The search says 68,000,000 people. Now I need 12% of that: 68,000,000 × 0.12. I must not do this in my head, the calculator tool exists precisely for this.',
    action: { tool: 'calculator', args: { expression: '68000000 * 0.12' } },
  },
  {
    thought: 'The calculator returned 8,160,000. Both parts are resolved, I can answer now.',
    finalAnswer: '12% of France\'s population (≈68,000,000) is 8,160,000 people.',
  },
]

const TOOL_REGISTRY = [
  { name: 'search', description: 'Search a small fact corpus.', parameters: { query: 'string' } },
  { name: 'calculator', description: 'Evaluate an arithmetic expression exactly.', parameters: { expression: 'string' } },
]

// ── Component ───────────────────────────────────────────────────────────────

export function ReActStepper() {
  const [shown, setShown] = useState(0) // how many trace steps are visible
  const done = shown >= TRACE.length
  const finalStep = TRACE[TRACE.length - 1].finalAnswer ?? ''

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      {/* Transcript */}
      <div aria-live="polite" className="space-y-3">
        <div className="rounded-lg border border-border bg-surface-raised/60 px-3 py-2 text-sm">
          <span className="mr-2 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-bright">USER</span>
          {QUESTION}
        </div>

        {TRACE.slice(0, shown).map((s, i) => {
          const isFinal = s.finalAnswer !== undefined
          return (
            <div key={i} className="space-y-2">
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-ink/90">
                <span className="mr-2 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-bright">THOUGHT</span>
                {s.thought}
              </div>
              {s.action && (
                <>
                  <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                    <span className="mr-2 rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">ACTION</span>
                    <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-xs text-ink/90 sm:whitespace-pre">
{`{ "tool": "${s.action.tool}", "args": ${JSON.stringify(s.action.args)} }`}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                    <span className="mr-2 rounded bg-success/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">OBSERVATION</span>
                    <span className="font-mono text-xs text-ink/90">{runTool(s.action.tool, s.action.args)}</span>
                  </div>
                </>
              )}
              {isFinal && (
                <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-medium text-ink">
                  <span className="mr-2 rounded bg-success/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">FINAL ANSWER</span>
                  {s.finalAnswer}
                </div>
              )}
            </div>
          )
        })}

        {done && (
          <p className="rounded border border-border px-3 py-2 text-xs text-ink-muted">
            Trace complete, 2 tool calls, 3 model turns. Note how each observation became the
            input of the next thought.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button
            onClick={() => setShown((s) => Math.min(s + 1, TRACE.length))}
            disabled={done}
            aria-label="Show the next ReAct step"
            className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next step ▸
          </button>
          <button
            onClick={() => setShown(0)}
            aria-label="Reset the ReAct trace"
            className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
          >
            ↺ Reset
          </button>
          <span className="text-xs text-ink-muted">
            step {Math.min(shown, TRACE.length)}/{TRACE.length}{done ? `, ${finalStep.length} chars, computed live` : ''}
          </span>
        </div>
      </div>

      {/* Tool registry */}
      <aside aria-label="Mock tool registry" className="rounded-lg border border-border bg-surface-raised/40 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Tool registry <span className="normal-case text-[10px]">(what the model sees)</span>
        </div>
        <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-ink/85 sm:whitespace-pre">
{JSON.stringify(TOOL_REGISTRY, null, 2)}
        </pre>
        <p className="mt-2 text-[11px] leading-5 text-ink-muted">
          The model never sees tool <em>code</em>, only these schemas. It selects a tool by name
          and fills the arguments; the host executes it and returns the observation.
        </p>
      </aside>
    </div>
  )
}
