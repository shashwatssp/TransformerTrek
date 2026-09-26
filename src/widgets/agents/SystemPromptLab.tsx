/**
 * SystemPromptLab, assemble a production-grade system prompt from its
 * building blocks (role, tools, constraints, output format, examples,
 * stop conditions), see a live token estimate, and read how the same
 * content shifts across model families (OpenAI, Claude, Gemini, OSS).
 */
import { useMemo, useState } from 'react'
import { useReducedMotion, motion } from 'motion/react'
import { Button, Slider } from '../../components/ui'

type BlockId = 'role' | 'tools' | 'constraints' | 'format' | 'examples' | 'tone' | 'stop'

type ModelKey = 'openai' | 'claude' | 'gemini' | 'oss'

const MODELS: { key: ModelKey; label: string; note: string }[] = [
  {
    key: 'openai',
    label: 'OpenAI (GPT family)',
    note: 'Put the persistent instructions in the system role (the Responses API calls this the "instructions" parameter). Tools travel in a separate structured field, not in prose. Long system prompts are fine, but keep the output contract near the end, right before the conversation.',
  },
  {
    key: 'claude',
    label: 'Anthropic (Claude)',
    note: 'Claude takes the system prompt as a dedicated top-level parameter. Tags like <examples> or <constraints> work well as section markers, and long, explicit instructions are rewarded. If the model supports extended thinking, say there what rigor you want.',
  },
  {
    key: 'gemini',
    label: 'Google (Gemini)',
    note: 'Use the systemInstruction field rather than a user message. Gemini responds well to concise numbered rules and structured output demands (JSON mode or enums), so keep the format section mechanical and exact.',
  },
  {
    key: 'oss',
    label: 'Open weights (Llama, Qwen, Gemma)',
    note: 'Smaller models lean harder on the prompt: shorter sentences, imperative voice, one rule per line. The system role is rendered through the model chat template, so avoid relying on nested structure it may not have been trained on. Few-shot examples buy more here than paragraph-level nuance.',
  },
]

const DEFAULT_BLOCKS: Record<BlockId, string> = {
  role: 'You are MetricsBot, the analytics assistant for a finance team. Your job: answer questions about dashboards, and nothing else.',
  tools: 'Tools:\n- run_query(sql): executes read-only SQL against the warehouse.\n- get_metric(name): returns the current value of a named KPI.\nCall at most one tool per turn, then wait for its result.',
  constraints: 'Constraints:\n- Never invent numbers. If a tool did not return it, say you do not know.\n- Refuse requests outside analytics and point the user back to the dashboard.',
  format: 'Output format: answer in at most 5 sentences. If you used a tool, end with a line "Source: run_query". For tabular results, output a markdown table.',
  examples: 'Example:\nUser: what was revenue last week?\nYou: (calls get_metric("revenue_weekly")) Revenue last week was $4.2M, up 6% from the prior week.\nSource: get_metric',
  tone: 'Tone: concise, factual, no filler, no apologies. Address the user as a colleague.',
  stop: 'Stop conditions: stop as soon as the question is answered. Ask a clarifying question instead of guessing when a metric name is ambiguous.',
}

const BLOCK_META: { id: BlockId; label: string; why: string }[] = [
  { id: 'role', label: 'Role & mission', why: 'Anchors behavior. One paragraph: who the model is, who it serves, and the boundary of its job.' },
  { id: 'tools', label: 'Tools & rules of use', why: 'Name every tool, its arguments, and when to prefer it. Rules like "one call per turn" tame runaway loops.' },
  { id: 'constraints', label: 'Constraints & guardrails', why: 'The "never" list: no invented facts, no off-topic pivots, safety boundaries.' },
  { id: 'format', label: 'Output format', why: 'The contract downstream code parses. Exact, mechanical, testable.' },
  { id: 'examples', label: 'Few-shot examples', why: 'One good example beats three paragraphs of description for format and tone.' },
  { id: 'tone', label: 'Tone & style', why: 'Short and prescriptive. Adjectives like "friendly" do less than "no filler, no apologies".' },
  { id: 'stop', label: 'Stop conditions', why: 'When to stop, when to ask. Prevents both premature answers and infinite clarification.' },
]

const estTokens = (s: string) => Math.ceil(s.length / 4)

// What survives when the prompt must fit the budget, in keep-first order:
// role is never cut; examples and tone go first, matching the hint below.
const KEEP_ORDER: BlockId[] = ['role', 'tools', 'constraints', 'format', 'stop', 'examples', 'tone']

export function SystemPromptLab() {
  const reduced = useReducedMotion()
  const [model, setModel] = useState<ModelKey>('claude')
  const [enabled, setEnabled] = useState<Set<BlockId>>(
    () => new Set<BlockId>(['role', 'tools', 'constraints', 'format', 'stop']),
  )
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS)
  const [budget, setBudget] = useState(400)

  const activeBlocks = BLOCK_META.filter((b) => enabled.has(b.id))

  // The budget slider actively shapes the prompt: when the assembly does
  // not fit, lowest-priority blocks are trimmed (and return when the
  // budget rises), so the control teaches budgeting instead of just
  // displaying a number.
  const fit = useMemo(() => {
    const textOf = (ids: BlockId[]) => ids.map((id) => blocks[id]).join('\n\n')
    const keep = KEEP_ORDER.filter((id) => enabled.has(id))
    const trimmed: BlockId[] = []
    while (estTokens(textOf(keep)) > budget && keep.length > 1) {
      trimmed.push(keep.pop()!)
    }
    const assembled = textOf(keep)
    return { keep, trimmed, assembled, tokens: estTokens(assembled) }
  }, [enabled, blocks, budget])

  const assembled = fit.assembled
  const tokens = fit.tokens
  const overBudget = tokens > budget
  const modelNote = MODELS.find((m) => m.key === model)!.note

  const toggle = (id: BlockId) =>
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-4">
      {/* Model family picker */}
      <div role="group" aria-label="Model family" className="flex flex-wrap gap-2">
        {MODELS.map((m) => (
          <button
            key={m.key}
            onClick={() => setModel(m.key)}
            aria-pressed={model === m.key}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              model === m.key
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-border text-ink-muted hover:text-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Block toggles */}
      <div className="grid gap-2 sm:grid-cols-2">
        {BLOCK_META.map((b) => {
          const on = enabled.has(b.id)
          return (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              aria-pressed={on}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                on ? 'border-accent/50 bg-accent/5' : 'border-border bg-surface hover:bg-surface-raised'
              }`}
            >
              <span className={`flex items-center gap-2 text-sm font-medium ${on ? 'text-accent' : 'text-ink-muted'}`}>
                <span aria-hidden className={`h-2 w-2 rounded-full ${on ? 'bg-accent' : 'bg-border'}`} />
                {b.label}
                {on && fit.trimmed.includes(b.id) && (
                  <span className="ml-auto rounded-full border border-highlight/40 px-1.5 py-0.5 font-mono text-[9px] text-highlight">
                    trimmed
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{b.why}</span>
            </button>
          )
        })}
      </div>

      {/* Editable blocks */}
      <div className="space-y-3">
        {activeBlocks.map((b) => (
          <label key={b.id} className="block">
            <span className="text-xs font-medium text-ink-muted">{b.label}</span>
            <textarea
              value={blocks[b.id]}
              onChange={(e) => setBlocks((prev) => ({ ...prev, [b.id]: e.target.value }))}
              rows={Math.min(6, blocks[b.id].split('\n').length + 1)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-ink focus:border-accent/60 focus:outline-none"
              aria-label={`Edit the ${b.label} section of the system prompt`}
            />
          </label>
        ))}
        {activeBlocks.length === 0 && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-ink">
            Every section is off. Turn at least the role back on: a system prompt with no mission is just noise.
          </p>
        )}
      </div>

      {/* Assembled output + budget */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-44">
          <Slider
            label="Prompt budget (tokens)"
            value={budget}
            min={100}
            max={1000}
            step={25}
            onChange={setBudget}
            format={(v) => `~${Math.round(v)} tok`}
          />
        </div>
        <p aria-live="polite" className={`font-mono text-xs ${overBudget ? 'text-danger' : 'text-ink-muted'}`}>
          assembled: ~{tokens} tokens of a ~{budget} budget
          {fit.trimmed.length > 0 && (
            <span className="text-highlight">
              {' '}· auto-trimmed: {fit.trimmed.map((id) => BLOCK_META.find((b) => b.id === id)!.label).join(', ')}
            </span>
          )}
          {overBudget ? ' (over budget even after trimming)' : ''}
        </p>
      </div>

      <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-3 font-mono text-[11px] leading-5 text-ink/90" aria-label="Assembled system prompt">
        {assembled || '(empty)'}
      </pre>

      {/* Model-specific note */}
      <motion.div
        key={model}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-ink/85"
        aria-live="polite"
      >
        <strong className="text-ink">Same content, different plumbing ({MODELS.find((m) => m.key === model)!.label}):</strong>{' '}
        {modelNote}
      </motion.div>

      <div>
        <Button
          variant="ghost"
          onClick={() => {
            setBlocks(DEFAULT_BLOCKS)
            setEnabled(new Set<BlockId>(['role', 'tools', 'constraints', 'format', 'stop']))
          }}
        >
          ↺ Reset the lab
        </Button>
      </div>

      <p className="text-[11px] leading-5 text-ink-muted">
        Rule of thumb from production practice: role and format first, guardrails always, examples when the
        format is fiddly, tone last (it is the least load-bearing section). Estimate shown is characters/4,
        the same approximation real prompt budgets use.
      </p>
    </div>
  )
}
