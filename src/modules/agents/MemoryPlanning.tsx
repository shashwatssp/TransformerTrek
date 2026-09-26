/**
 * Module 5.3: Memory & Planning
 * Body content follows the registry steps for id 'memory-planning'.
 */
import { getModule } from '../registry'
import { ModuleLayout } from '../../components/layout/ModuleLayout'
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { MemoryPlanningViz } from '../../widgets/agents/MemoryPlanningViz'

const meta = getModule('memory-planning')!

const planCode = `# Plan-and-execute with reflection (sketch)
plan = planner_llm(f"Goal: {goal}\\nBreak into steps with dependencies.")
results = {}
for step in plan:
    try:
        results[step.id] = execute(step, results)   # each step = its own ReAct loop
    except ToolError as e:
        critique = reflector_llm(f"Step {step.id} failed: {e}. What missing info caused it?")
        plan.insert_after(step, critique.new_steps) # replan: repair, don't restart
        results[step.id] = None

memory.write(summary_of(results))   # persist the lessons to long-term memory`

export default function MemoryPlanning() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          The loop from <ModuleLink id="what-is-an-agent" /> has a hidden assumption: everything
          the agent needs fits in its context window, and every run starts from zero. Real agents
          need memory that outlives a single context and plans that survive contact with reality.
          This module covers both, then reflection, the trick that lets agents learn within a
          single lifetime, no weight updates required.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1: Working memory: the context window</H2>
      <Prose>
        <p>
          Working memory is whatever the model can attend to right now: system prompt,
          conversation history, tool results, retrieved documents, the agent's own scratchpad.
          You already know it has a hard limit, <ModuleLink id="how-llms-work" /> covered
          context windows, but agents hit two subtler walls long before the token limit:
          <strong> attention dilutes</strong> over long contexts (retrieval quality degrades in
          the middle) and <strong>every appended token costs money on every subsequent call</strong>,
          so an agent that never prunes gets slower and more expensive with each turn.
        </p>
        <p>
          The standard fixes are all forms of <em>compaction</em>: truncate old turns, summarize
          them into a shorter block, or keep a running scratchpad of decisions instead of the full
          transcript. You'll see the arithmetic yourself in the widget below, the budget is
          deliberately tiny so you can break it.
        </p>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2: Long-term memory: vector stores</H2>
      <Prose>
        <p>
          Long-term memory persists across sessions. In practice it is usually a{' '}
          <strong>vector store</strong>: notes, decisions, and outcomes are embedded once, stored,
          and retrieved by similarity at inference time. If that sounds like{' '}
          <ModuleLink id="rag" />, it is exactly RAG, applied to the agent's own experience. The
          embeddings and cosine similarity are the same ones you met in{' '}
          <ModuleLink id="vector-search" />.
        </p>
        <p>
          The{' '}
          <a href="https://arxiv.org/abs/2304.03442" target="_blank" rel="noopener noreferrer">Generative Agents paper (Park et al., 2023)</a>{' '}
          showed how far this scales: 25 simulated "villagers" with a memory stream of thousands
          of observations, retrieved by combining <strong>recency × importance × relevance</strong>.
          Their synthesized behavior, throwing a coherent party, remembering who attended, was
          driven almost entirely by what the memory layer chose to surface.
        </p>
        <Callout kind="info" title="What memory is not">
          Long-term memory is not fine-tuning. It changes <em>what's in the prompt</em>, not the
          weights, which is why it can be written in real time, audited, and deleted per user.
        </Callout>
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3: Plan-and-execute patterns</H2>
      <Prose>
        <p>
          Instead of deciding each move inside one giant loop, <strong>plan-and-execute</strong>{' '}
          splits the job in two: a <em>planner</em> call converts the goal into a list of steps,
          then an <em>executor</em> runs them one by one, each step possibly its own small agent
          loop. The payoff is structural: plans are reviewable before execution ("would you like to
          approve this?"), a failed step doesn't discard the whole plan, and the executor's
          context stays small because it sees one step at a time.
        </p>
        <p>
          The failure that matters is a <strong>plan built on missing information</strong>. Watch
          the Planning tab: the restaurant-booking step fails because the planner never knew about
          a dietary constraint, and the recovery is to <em>insert</em> a step, not restart the
          whole plan. That's replanning, and it's what separates a robust agent from a brittle
          one.
        </p>
        <CodeBlock language="python" filename="plan_and_execute.py" code={planCode} />
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4: Reflection: agents that critique themselves</H2>
      <Prose>
        <p>
          <a href="https://arxiv.org/abs/2303.11366" target="_blank" rel="noopener noreferrer">Reflexion (Shinn et al., 2023)</a>{' '}
          added a third character to the loop: after a failed attempt, a <em>reflector</em> prompt
          asks the model "why did that fail, and what should you try differently?" The critique is
          stored in memory and conditioned into the next attempt. On coding and decision tasks
          this lifted success rates substantially, <strong>with zero weight updates</strong>,
          purely by changing what the context carries forward. It is the same machinery as our
          replan above, applied to the agent's own behavior.
        </p>
        <p>
          Two cautions. First, self-critique can be confidently wrong, a model that misreads a
          failure will "fix" the wrong thing, so reflect against observable evidence (tool errors,
          test results) where possible. Second, none of this is trustworthy until measured, which
          is exactly what <ModuleLink id="evals" /> is for.
        </p>
      </Prose>

      <WidgetFrame
        title="Memory & planning lab"
        subtitle="Memory tab: token-budgeted working memory + cosine-scored recall. Planning tab: execute a plan, watch it fail, watch the replan."
      >
        <MemoryPlanningViz />
      </WidgetFrame>

      <KeyTakeaways
        points={[
          'Working memory = the context window. It is finite and expensive, agents compact (truncate, summarize, scratchpad) or they degrade and cost more every turn.',
          'Long-term memory = a vector store of the agent\'s own experience, retrieved by embedding similarity, RAG applied to memory, not a change to the weights.',
          'Plan-and-execute separates a reviewable plan from cheap step execution; failed steps trigger replanning (insert a step) rather than full restarts.',
          'Reflection turns failures into stored critiques that condition the next attempt, real learning with no gradient steps, but only as good as the evidence it critiques against.',
        ]}
      />
    </ModuleLayout>
  )
}
