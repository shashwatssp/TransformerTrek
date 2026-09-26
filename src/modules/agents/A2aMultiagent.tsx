/**
 * Module 5.5: A2A & Multi-Agent Patterns
 * Body content follows the registry steps for id 'a2a-multiagent'.
 */
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { A2AFlow } from '../../widgets/agents/A2AFlow'


const clientCode = `# Delegating to a remote A2A agent (a2a-python sketch)
from a2a.client import A2ACardResolver, A2AClient
from a2a.types import Message, Part, TaskState

resolver = A2ACardResolver(base_url="https://planner.example.com")
card = await resolver.get_agent_card()        # /.well-known/agent-card.json

client = A2AClient(agent_card=card)           # we know its skills + capabilities
task = await client.send_message(
    message=Message(role="user", parts=[Part(text="3-day Tokyo itinerary, $200/day")]),
)

while task.status.state in (TaskState.submitted, TaskState.working):
    task = await client.get_task(task.id)     # or subscribe to live updates

if task.status.state == TaskState.completed:
    print(task.artifacts)                     # the deliverable, not chat text`

export default function A2aMultiagent() {
  return (
    <>
      <Prose>
        <p>
          MCP (<ModuleLink id="mcp" />) standardized how one agent reaches <em>tools</em>. A2A
, the Agent-to-Agent protocol, tackles the next hop: agents discovering and
          delegating to <em>other agents</em>, including ones built by different teams on
          different frameworks. The pieces: a public agent card, a task lifecycle built for
          long-running work, and the topology patterns that structure multi-agent systems.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1: Agent cards: advertising what you can do</H2>
      <Prose>
        <p>
          Before an agent can delegate, it must know whom to trust with what. Every A2A agent
          publishes a JSON <strong>agent card</strong> at a well-known URL (
          <code className="font-mono text-accent">/.well-known/agent-card.json</code> in recent
          spec versions), see the Agent Card tab below. The card answers the questions a
          would-be client has: what skills do you have, where is your endpoint, which protocol
          features (streaming? push?) do you support, and what content types do you accept and
          return.
        </p>
        <p>
          The design point to internalize: there is <strong>no central registry</strong>. Like
          DNS or robots.txt, discovery is decentralized, anyone can run an agent, and any
          client can find out what it does with one authenticated GET. Compare the{' '}
          <a href="https://google.github.io/A2A/" target="_blank" rel="noopener noreferrer">A2A protocol docs</a>{' '}
          and the current spec at{' '}
          <a href="https://a2a-protocol.org" target="_blank" rel="noopener noreferrer">a2a-protocol.org</a>.
        </p>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2: The task lifecycle</H2>
      <Prose>
        <p>
          Delegation is modeled as a <strong>task</strong>, a stateful unit of work with an ID
          and a status (<code className="font-mono text-accent">submitted → working → completed</code>,
          with <code className="font-mono text-accent">input-required</code>,{' '}
          <code className="font-mono text-accent">failed</code>, and{' '}
          <code className="font-mono text-accent">canceled</code> branches). Two design choices
          matter:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>input-required is a first-class state.</strong> A remote agent can come back with a question ("what's your budget?"), and the client answers into the <em>same</em> task. Function calling could never do this, a tool call is one shot.</li>
          <li><strong>Results arrive as artifacts.</strong> Files and structured data attach to the task, separate from the conversational stream.</li>
        </ul>
        <p>Drive the state machine yourself in the Task lifecycle tab, including the cancel path:</p>
      </Prose>
      <WidgetFrame
        title="A2AFlow, cards, tasks, topologies"
        subtitle="Agent Card: what clients discover. Task lifecycle: drive a real delegation (it will ask you for input). Topologies: supervisor vs swarm vs hierarchical."
      >
        <A2AFlow />
      </WidgetFrame>
      <Prose>
        <CodeBlock language="python" filename="a2a_client.py" code={clientCode} />
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3: Supervisor, swarm, and handoff patterns</H2>
      <Prose>
        <p>
          Once you have several agents, control flow is the design decision. The Topologies tab
          above renders the three canonical shapes:
        </p>
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Supervisor</strong>, one orchestrator delegates to specialist workers and collects results. Auditable, budgetable, and the easiest to reason about; the risk is a chatty bottleneck at the center.</li>
          <li><strong>Swarm / handoff</strong>, no boss; any agent transfers control directly to a better-suited peer, carrying the conversation along. Emergent and flexible, but traces are harder to follow and cost control is diffuse.</li>
          <li><strong>Hierarchical</strong>, supervisors of supervisors; teams of teams. Scales furthest and each boundary is an audit point, at the price of the most moving parts.</li>
        </ol>
        <p>
          Frameworks differ mainly in how literally they encode these patterns,{' '}
          <a href="https://arxiv.org/abs/2308.08155" target="_blank" rel="noopener noreferrer">AutoGen (Wu et al., 2023)</a>{' '}
          built its reputation on configurable conversation topologies, and today's{' '}
          <ModuleLink id="frameworks" /> each ship first-class versions of all three.
        </p>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4: When multi-agent beats single-agent</H2>
      <Prose>
        <p>
          Multi-agent systems are not a free upgrade, they multiply LLM calls, coordination
          bugs, and evaluation surface. The honest cases <em>for</em> going multi-agent:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Context isolation</strong>, each specialist keeps a small, focused window instead of one polluted mega-context (the working-memory wall from <ModuleLink id="memory-planning" />).</li>
          <li><strong>Parallelism</strong>, independent subtasks (scan flights <em>and</em> hotels) genuinely run at once.</li>
          <li><strong>Organizational boundaries</strong>, different teams own different agents; A2A-style cards and tasks make the seams explicit and versioned.</li>
          <li><strong>Role separation</strong>, a critic with a different system prompt catches things the author-agent rationalizes away.</li>
        </ul>
        <Callout kind="warn" title="Default to one agent">
          If a single agent with good tools fits in its context window, it will usually beat a
          multi-agent version on latency, cost, and debuggability. Go multi-agent when one of the
          four forces above actually binds, and re-run your <ModuleLink id="evals" /> after every
          topology change, because multi-agent regressions are sneaky.
        </Callout>
      </Prose>

      <KeyTakeaways
        points={[
          'A2A standardizes agent-to-agent delegation: a discoverable agent card, stateful tasks, and artifacts, framework-agnostic by design.',
          'The task lifecycle (submitted → working → input-required → completed/failed/canceled) makes delegation multi-turn and interruptible, the thing one-shot tool calls could never be.',
          'Three canonical topologies: supervisor (auditable hub), swarm/handoff (emergent peer routing), hierarchical (teams of teams).',
          'Go multi-agent only for real forces: context isolation, parallelism, org boundaries, or role separation. Otherwise a single well-tooled agent wins on cost, latency, and debuggability.',
        ]}
      />
    </>
  )
}
