/**
 * Module 5.2: Tool Calling & ReAct
 * Body content follows the registry steps for id 'tools-react'.
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
import { ReActStepper } from '../../widgets/agents/ReActStepper'


const schemaCode = `{
  "name": "get_weather",
  "description": "Get the current weather for a city.",
  "parameters": {
    "type": "object",
    "properties": {
      "city": { "type": "string", "description": "City name, e.g. 'Tokyo'" },
      "unit": { "type": "string", "enum": ["celsius", "fahrenheit"] }
    },
    "required": ["city"]
  }
}`

const reactCode = `# Formatting one ReAct turn, the model generates the first two lines,
# your code executes the action and appends the observation.
def react_turn(llm, tools, history, user_msg):
    prompt = react_prompt(tools, history, user_msg)
    text = llm(prompt)                      # "Thought: ...\\nAction: search(...)"
    thought, action = parse_react(text)
    if action is None:                      # no action → the model is done
        return extract_final_answer(text)
    result = execute(action.name, action.args, tools)   # YOUR code runs the tool
    history.append((thought, action, result))           # Observation
    return None                             # loop continues`

export default function ToolsReact() {
  return (
    <>
      <Prose>
        <p>
          <ModuleLink id="what-is-an-agent" /> ended with a loop that needs two things it doesn't
          have yet: a standard way to <em>describe</em> tools to a model, and a standard way for
          the model to <em>use</em> them. This module covers both, then runs a complete ReAct
          trace on a real multi-step question.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1: Function calling: schemas and arguments</H2>
      <Prose>
        <p>
          A tool is declared to the model as <strong>data</strong>, not code: a name, a
          description, and a JSON Schema of its parameters. The model reads these schemas at
          request time and, when useful, responds with a structured call,{' '}
          <code className="font-mono text-accent">{"{ name, arguments }"}</code>, instead of
          prose. Crucially, <strong>the model never executes anything</strong>: your application
          receives the JSON, validates the arguments against the schema, runs the real function,
          and appends the result to the conversation. That execution boundary is your security
          perimeter; the{' '}
          <a href="https://platform.openai.com/docs/guides/function-calling" target="_blank" rel="noopener noreferrer">OpenAI function calling guide</a>{' '}
          and the equivalent docs from every major provider follow this exact shape.
        </p>
        <CodeBlock language="json" filename="tool_schema.json" code={schemaCode} />
        <Callout kind="tip" title="Descriptions are prompts">
          The model chooses tools by reading their <em>descriptions</em>. "Get current weather for
          a city" gets chosen exactly when it should; a vague description ("does weather stuff")
          causes wrong tool choices. Write tool docs like prompts, because that's how they're used.
        </Callout>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2: The ReAct loop: Thought → Action → Observation</H2>
      <Prose>
        <p>
          The{' '}
          <a href="https://arxiv.org/abs/2210.03629" target="_blank" rel="noopener noreferrer">ReAct paper (Yao et al., 2022)</a>{' '}
          gave the loop a textual format that still dominates agent design. Instead of emitting
          raw JSON into a void, the model writes its reasoning out loud:
        </p>
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Thought</strong>, "what do I know, what's missing, what should I try?"</li>
          <li><strong>Action</strong>, a tool call in the agreed format.</li>
          <li><strong>Observation</strong>, the environment's response, appended by the host.</li>
          <li>…repeat until a <strong>Final Answer</strong>.</li>
        </ol>
        <p>
          Why does writing the thought down help? Same reason chain-of-thought helps: it gives the
          model a place to notice gaps (<em>"I don't know France's population"</em>) before
          committing to an action, and it gives you a readable trace for debugging, every wrong
          turn is visible in the transcript.
        </p>
        <CodeBlock language="python" filename="react_turn.py" code={reactCode} />
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3: A mock tool registry, live</H2>
      <Prose>
        <p>
          Enough theory, run a trace. The widget below has a registry with two tools: a{' '}
          <code className="font-mono text-accent">search</code> over a tiny fact corpus and a{' '}
          <code className="font-mono text-accent">calculator</code> that really parses and
          evaluates arithmetic in your browser (no canned strings, the observation for{' '}
          <code className="font-mono text-accent">68000000 * 0.12</code> is computed the moment
          the step renders). Watch the observation of step 1 become the raw material of step 2:
        </p>
      </Prose>
      <WidgetFrame
        title="ReAct stepper"
        subtitle="Question → Thought → Action (tool-call JSON) → Observation → … → Final Answer"
      >
        <ReActStepper />
      </WidgetFrame>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4: Multi-step tool chains</H2>
      <Prose>
        <p>
          Real tasks chain tools where <strong>one call's output is the next call's input</strong>:
          search for a figure → compute with it → format it into an email → send. Three failure
          modes show up immediately, and every framework (<ModuleLink id="frameworks" />) is
          partly machinery for handling them:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Propagated errors</strong>, a bad search poisons every later step. Mitigation: validate observations before use, let the model reconsider.</li>
          <li><strong>Loops</strong>, the model retries the same failing call forever. Mitigation: a hard <code className="font-mono text-accent">max_steps</code> budget and loop detection in the host.</li>
          <li><strong>Argument hallucination</strong>, the model invents parameter values not present in context. Mitigation: schema validation with clear error messages fed back as observations.</li>
        </ul>
        <p>
          Also notice what the registry is not: it's ad-hoc, defined per-app. The moment you want
          the <em>same</em> tools available to many apps, or tools from someone else's server, 
          you need a protocol. That's <ModuleLink id="mcp" />.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Tools are declared as JSON schemas (name, description, parameters); the model emits a call, your code executes it, the result returns as an observation.',
          'The model never runs anything, the host executes tools, which makes the host the security boundary.',
          'ReAct = Thought → Action → Observation, repeated: writing the thought down exposes gaps before acting and gives you a debuggable trace.',
          'Chains fail by propagated errors, infinite loops, and hallucinated arguments, budget steps, validate schemas, feed errors back as observations.',
        ]}
      />
    </>
  )
}
