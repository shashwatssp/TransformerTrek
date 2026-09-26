/**
 * Module, Build Your Own Agent
 * Body content only; sections follow the registry `steps` order exactly.
 * A practical guide: the loop, the system prompt (with the SystemPromptLab
 * widget), tool design, memory, MCP authoring, and evaluation.
 */
import { Callout, CodeBlock, ComparisonTable, H2, KeyTakeaways, ModuleLink, Prose, SourceList, WidgetFrame } from '../../components/ui'
import { SystemPromptLab } from '../../widgets/agents/SystemPromptLab'

const mcpSnippet = `# server.py, a minimal MCP server: one tool, one prompt template
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("team-analytics")

@mcp.tool()
def get_metric(name: str) -> str:
    """Return the current value of a named KPI."""
    return str(LOOKUP[name])   # your real data source goes here

@mcp.prompt()
def weekly_review(metric: str) -> str:
    """A reusable prompt the host app can surface to users."""
    return f"You are a finance analyst. Summarize last week's {metric} for the team."

# The host discovers this server via tools/list, calls tools via tools/call.
# Tools = model-controlled. Prompts = user-controlled. Resources = app-controlled.`

const budgetSnippet = `// The whole loop: model + tools + results, repeated until done.
const tools = [
  { name: "get_metric", description: "Read a KPI by name",
    input_schema: { type: "object", properties: { name: { type: "string" } },
                    required: ["name"] } },
]

let messages = [{ role: "user", content: task }]
while (true) {
  const res = await model.create({ system: SYSTEM_PROMPT, tools, messages })
  messages.push(res.message)
  const calls = res.message.content.filter(c => c.type === "tool_use")
  if (calls.length === 0) break                    // model is done
  for (const call of calls) {
    const result = await runTool(call)             // your code executes
    messages.push({ role: "user",                  // feed the observation back
      content: [{ type: "tool_result", tool_use_id: call.id, content: result }] })
  }
}`

export default function BuildAnAgent() {
  return (
    <>
      {/* Step 1 ─ Start with the simplest loop */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1: Start with the simplest loop</H2>
        <Prose>
          <p>
            The error almost everyone makes is starting with a framework. Start with a while loop. An
            agent is a model, a list of tool schemas, and a loop that feeds tool results back until the
            model stops calling tools, exactly the loop you animated in <ModuleLink id="what-is-an-agent" />:
          </p>
          <CodeBlock code={budgetSnippet} language="typescript" filename="agent.ts" />
          <p>
            If this loop solves your task, you are done. Add structure only when the task outgrows it:
            graphs with cycles when control flow gets hairy (<ModuleLink id="frameworks" />), multi-agent
            topologies when roles genuinely diverge (<ModuleLink id="a2a-multiagent" />).
          </p>
        </Prose>
      </section>

      {/* Step 2 ─ Write the system prompt */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2: Write the system prompt like an engineer</H2>
        <Prose>
          <p>
            The system prompt is your agent's constitution. Treat it as an artifact with sections and a
            budget, not a paragraph of vibes. The seven building blocks below cover nearly every
            production prompt; toggle them, edit them, and watch the token cost, then read how the same
            content shifts across model families.
          </p>
          <WidgetFrame
            title="System prompt lab"
            subtitle="Assemble a system prompt from building blocks, with a live token budget and model-specific placement notes."
          >
            <SystemPromptLab />
          </WidgetFrame>
          <p>
            What to include, distilled: a role with a boundary (what the agent is not), every tool with
            its usage rules, the "never" list, an exact output contract, examples when the format is
            fiddly, and stop conditions. What varies by model is mostly <em>where it lives</em> and{' '}
            <em>how much structure it survives</em>, which the lab above explains per family.
          </p>
          <ComparisonTable
            columns={[
              { id: 'openai', label: 'OpenAI' },
              { id: 'claude', label: 'Claude' },
              { id: 'gemini', label: 'Gemini' },
              { id: 'oss', label: 'Open weights' },
            ]}
            rows={[
              {
                label: 'Where instructions live',
                values: {
                  openai: 'system message / instructions parameter',
                  claude: 'dedicated top-level system parameter',
                  gemini: 'systemInstruction field',
                  oss: 'system role via the model chat template',
                },
              },
              {
                label: 'Prompt style that works',
                values: {
                  openai: 'sections plus an output contract near the end',
                  claude: 'explicit sections, tags as markers, long is fine',
                  gemini: 'short numbered rules, exact format demands',
                  oss: 'imperative one-liners, few-shot examples',
                },
              },
              {
                label: 'Watch out for',
                values: {
                  openai: 'tools described twice (schema and prose) drifting apart',
                  claude: 'nothing exotic; do say what rigor you want',
                  gemini: 'formats that demand nested structure in prose',
                  oss: 'chat-template quirks and lost nuance at small sizes',
                },
              },
            ]}
          />
        </Prose>
      </section>

      {/* Step 3 ─ Define tools like products */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3: Define tools like products</H2>
        <Prose>
          <p>
            A tool schema is an API surface, and the model is its only user. The rules that keep agents
            reliable:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Few tools, clearly separated.</strong> Ten overlapping tools confuse selection;
              five sharp ones rarely do. If two tools differ only by a parameter, merge them.
            </li>
            <li>
              <strong>Descriptions written for a new hire.</strong> Say what it does, when to use it,
              and when NOT to use it. The description is the only manual the model gets.
            </li>
            <li>
              <strong>Typed inputs, small outputs.</strong> JSON schemas with required fields prevent
              guessing. Return data, not logs; truncate or summarize huge results before they eat the
              context window (see the working-memory wall in <ModuleLink id="memory-planning" />).
            </li>
            <li>
              <strong>Make failures legible.</strong> Return structured errors the model can read and
              retry differently, so a failure produces a new plan instead of the same call again.
            </li>
          </ul>
          <Callout kind="tip" title="Test tools without a model">
            A good tool schema survives this test: a colleague reading only the schema can predict the
            correct call for a task. If they cannot, the model will not either.
          </Callout>
        </Prose>
      </section>

      {/* Step 4 ─ Add memory and state */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4: Add memory only when memory is the problem</H2>
        <Prose>
          <p>
            State starts as the messages array. Reach for more only when you hit a wall you can name:
            context overflow (summarize or compact), repeat lookups (cache results), or persistence
            across sessions (a vector store for long-term memory, as in{' '}
            <ModuleLink id="memory-planning" />). Every memory write should have a reader you can point
            to; speculative memory becomes a liability you must curate forever.
          </p>
        </Prose>
      </section>

      {/* Step 5 ─ Author an MCP server */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5: Ship your tools as an MCP server</H2>
        <Prose>
          <p>
            Once your tools are worth reusing across apps (Claude Desktop, an IDE, your own agent), wrap
            them in an MCP server instead of pasting schemas into every client. The protocol, from{' '}
            <ModuleLink id="mcp" />, is a JSON-RPC conversation: initialize, discover with tools/list,
            execute with tools/call. Using the official SDK, a minimal server is a few lines:
          </p>
          <CodeBlock code={mcpSnippet} language="python" filename="server.py" />
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Tools</strong> are model-controlled: the model decides when to call them, so their
              descriptions are prompt material.
            </li>
            <li>
              <strong>Prompts</strong> are user-controlled templates your server offers (slash-commands
              in hosts). Great for codified workflows like "weekly review".
            </li>
            <li>
              <strong>Resources</strong> are app-controlled context (files, DB rows) the host attaches.
            </li>
          </ul>
          <p>
            Authoring checklist: one server per domain, tool names namespaced and unambiguous, errors as
            structured results, and read-only default with an explicit confirm-style tool for anything
            destructive. The same system-prompt thinking applies inside each tool description.
          </p>
          <SourceList
            sources={[
              { title: 'MCP docs: build your first server', url: 'https://modelcontextprotocol.io/tutorials/building-a-simple-server', note: 'Official quickstart for servers.' },
              { title: 'MCP TypeScript SDK', url: 'https://github.com/modelcontextprotocol/typescript-sdk', note: 'The TS implementation of the protocol.' },
              { title: 'MCP Python SDK', url: 'https://github.com/modelcontextprotocol/python-sdk', note: 'FastMCP, used in the snippet above.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 6 ─ Evaluate and iterate */}
      <section id="step-6" className="scroll-mt-24">
        <H2>Step 6: Evaluate like a product, not a demo</H2>
        <Prose>
          <p>
            An agent you cannot measure is an agent you cannot improve. Minimum viable evaluation, using
            the ideas from <ModuleLink id="evals" />:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>A trace on every run.</strong> Log the full message list, tool calls, and results.
              Debugging agents without traces is guesswork.
            </li>
            <li>
              <strong>A task list with pass criteria.</strong> Twenty real tasks, each with a checkable
              outcome (right file edited, right answer cited). Re-run after every prompt or tool change.
            </li>
            <li>
              <strong>LLM-as-judge for the fuzzy parts</strong>, with the judge biases (verbosity,
              position) in mind, and human review for anything you ship.
            </li>
          </ul>
          <KeyTakeaways
            points={[
              'Build the while-loop first; add frameworks and topologies only when the task outgrows them.',
              'A system prompt is an artifact with sections: role, tools, guardrails, format, examples, tone, stop conditions.',
              'Tool descriptions are prompts. Write them for a new hire, and make failures structured and retryable.',
              'Wrap mature tools in an MCP server so any host can discover and call them.',
              'Traces plus a twenty-task eval turn agent work from vibes into engineering.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
