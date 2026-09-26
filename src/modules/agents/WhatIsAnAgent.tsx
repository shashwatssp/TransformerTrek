/**
 * Module 5.1: What is an Agent?
 * Body content follows the registry steps for id 'what-is-an-agent'.
 */
import { getModule } from '../registry'
import { ModuleLayout } from '../../components/layout/ModuleLayout'
import {
  Callout,
  CodeBlock,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { AgentLoopViz } from '../../widgets/agents/AgentLoopViz'

const meta = getModule('what-is-an-agent')!

const loopCode = `# The agent loop in its simplest form (pseudocode)
context = user_message
for step in range(max_steps):          # the loop is the agent
    observation = llm(context)          # reason: what should I do next?
    if observation.is_final_answer:
        return observation.text         # goal met → stop
    tool_result = run_tool(observation.tool_call)   # act
    context += observation.text + tool_result        # observe: feed it back
# if we get here, we hit max_steps without an answer, always budget this`

export default function WhatIsAnAgent() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          A chatbot answers; an agent <em>acts</em>. The difference is not the model, it is the
          loop wrapped around it. In this module we build that loop piece by piece: what each turn
          does, why tools are the unlock, and when you should <em>not</em> reach for an agent at
          all. Everything here is a foundation for <ModuleLink id="tools-react" /> and{' '}
          <ModuleLink id="frameworks" />, so take it slowly.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1: From chatbot to agent: the loop</H2>
      <Prose>
        <p>
          Every LLM call you have seen so far is a <strong>function</strong>: text in, text out.
          A chatbot is one call (or a few). An agent is the same model placed inside a{' '}
          <strong>while-loop</strong> that runs until a goal is satisfied. Between iterations the
          agent can consult the world, call an API, read a file, run code, and feed what it
          learned back into its own context. That last part is the magic: the model's{' '}
          <em>output</em> becomes new <em>input</em>.
        </p>
        <p>
          This is the definition used across the field. The{' '}
          <a href="https://arxiv.org/abs/2210.03629" target="_blank" rel="noopener noreferrer">ReAct paper (Yao et al., 2022)</a>{' '}
          showed that interleaving reasoning traces with actions beats either alone, and{' '}
          <a href="https://www.anthropic.com/engineering/building-effective-agents" target="_blank" rel="noopener noreferrer">Anthropic's engineering guide</a>{' '}
          distills it into practice: an agent is "a model using tools in a loop based on
          environmental feedback." Note what an agent is <em>not</em>: it is not a smarter prompt,
          a bigger model, or a chain of fixed steps. The defining feature is that{' '}
          <strong>the model decides the next step at runtime</strong>.
        </p>
        <Callout kind="info" title="Vocabulary check">
          <strong>Workflow</strong> = developer pre-writes the steps, LLM fills them in.{' '}
          <strong>Agent</strong> = LLM chooses the steps itself, with tools, in a loop. Same model,
          radically different control flow.
        </Callout>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2: Perceive → reason → act → observe</H2>
      <Prose>
        <p>
          The loop has four beats, and every framework you will meet (<ModuleLink id="frameworks" />
          , <ModuleLink id="mcp" />, <ModuleLink id="a2a-multiagent" />) is an elaborate way of
          running them:
        </p>
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Perceive</strong>, read the latest state: user message, tool results, errors.</li>
          <li><strong>Reason</strong>, the model decides: do I have enough, or do I need to act?</li>
          <li><strong>Act</strong>, emit something that changes the world: a tool call, a file edit, a reply.</li>
          <li><strong>Observe</strong>, the result lands back in context; perception begins again.</li>
        </ol>
        <p>
          Watch it run. The widget below walks a real two-iteration scenario: the model notices it
          lacks weather data, calls a <code className="font-mono text-accent">get_weather</code>{' '}
          tool, reads the observation, and only then answers. Press play (or step through with the
          keyboard, every control is focusable):
        </p>
      </Prose>
      <WidgetFrame
        title="Agent loop, live trace"
        subtitle="A scripted but faithful run: the model cannot know Tokyo's weather, so it must act first."
      >
        <AgentLoopViz />
      </WidgetFrame>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3: Tools change everything</H2>
      <Prose>
        <p>
          A base model can only manipulate text it has already seen. Tools break that ceiling:
          arithmetic becomes exact (the model is a terrible calculator), knowledge becomes current
          (weights are frozen at training time), and actions become possible (send an email, book
          a flight, merge a PR). The{' '}
          <a href="https://arxiv.org/abs/2302.04761" target="_blank" rel="noopener noreferrer">Toolformer paper (Schick et al., 2023)</a>{' '}
          showed models can even learn <em>when</em> to call which tool from examples alone.
        </p>
        <p>
          The full mechanics, JSON schemas, argument validation, the ReAct format, are the
          subject of <ModuleLink id="tools-react" />. For now, internalize the loop itself; it is
          genuinely this small:
        </p>
        <CodeBlock language="python" filename="agent_loop.py" code={loopCode} />
        <Callout kind="tip" title="Reading the code">
          Three things make this an agent rather than a chatbot: the <code className="font-mono text-accent">for</code> loop,
          the tool call inside it, and <code className="font-mono text-accent">context += tool_result</code>, 
          observation feeding perception. Delete any one of the three and you have a chatbot again.
        </Callout>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4: When <em>not</em> to build an agent</H2>
      <Prose>
        <H3>The honest tradeoffs</H3>
        <p>
          Agents are the most complex tool in the box, and complexity compounds: each loop turn is
          another LLM call (latency and cost multiply), each tool call is a new failure surface,
          and errors <em>accumulate</em> instead of washing out, a wrong turn in step 2 steers
          every later step. Anthropic's guidance is blunt: use the simplest thing that works. A
          single call answers most questions; a fixed chain handles most pipelines; reserve agents
          for genuinely open-ended control flow.
        </p>
      </Prose>
      <Callout kind="warn" title="A 30-second test before building an agent">
        Can you write the steps of the task down in advance? Then it is a workflow, not an agent, 
        hard-code them, and spend the saved complexity on evaluation. Reach for an agent only when
        the <em>model</em> must decide the path (unknown number of steps, unknown tools, unknown
        order), for example "research X and write a memo" rather than "summarize this PDF."
      </Callout>
      <Prose>
        <p>
          If you do need one, you need infrastructure: protocols so tools and agents can be
          discovered and shared (<ModuleLink id="mcp" />, <ModuleLink id="a2a-multiagent" />),
          memory so loops survive past one context window (<ModuleLink id="memory-planning" />),
          and, critically, a way to measure whether any of it works (<ModuleLink id="evals" />).
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'An agent is an LLM in a loop that acts (tools) and observes (results feed back) until a goal is met, the model picks the next step at runtime.',
          'The four beats: perceive → reason → act → observe. Every agent framework is a fancy way of running this loop.',
          'Tools are the unlock: they fix arithmetic, add current knowledge, and enable real-world actions.',
          'Agents amplify errors and cost with every turn, if you can pre-write the steps, build a workflow instead.',
        ]}
      />
    </ModuleLayout>
  )
}
