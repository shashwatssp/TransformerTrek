/**
 * Module 1.4: Prompting Patterns
 * Body content follows the registry steps for id 'prompting-patterns'.
 */
import {
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { SystemPromptLab } from '../../widgets/agents/SystemPromptLab'

const STRUCTURED_SNIPPET = `// Structured output with validation and one retry (TypeScript)
const ResponseSchema = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    confidence: { type: "number" },
  },
  required: ["sentiment", "confidence"],
} as const

const res = await llm({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: ` + "`${prompt}\\n\\nReturn JSON only.`" + ` }],
  response_format: { type: "json_schema", json_schema: { name: "verdict", schema: ResponseSchema } },
})

function parse(text: string) {
  try {
    const data = JSON.parse(text)
    // Validate the parsed value against what your code actually needs
    if (!["positive", "neutral", "negative"].includes(data.sentiment)) throw new Error("bad sentiment")
    return data
  } catch {
    return null // caller retries once with the validation error appended
  }
}`

/**
 * Module 1.4: Prompting Patterns
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline, sources).
 */
export default function PromptingPatterns() {
  return (
    <>
      <Prose>
        <p>
          You now know what the model is (<ModuleLink id="what-is-an-llm" />) and how it fails
          (<ModuleLink id="why-llms-hallucinate" />). Prompting is how you steer it, and while it
          is the cheapest lever, "cheap" is not the same as "easy". This module covers the five
          patterns that do almost all of the real work, and the habit that separates production
          prompting from vibes: measuring every change.
        </p>
      </Prose>

      {/* Step 1 */}
      <H2>Step 1: Zero-shot, one-shot, few-shot</H2>
      <Prose>
        <p>
          A <strong>zero-shot</strong> prompt states the task and hopes the model has seen it
          enough in training. <strong>One-shot</strong> adds a single worked example;{' '}
          <strong>few-shot</strong> adds several. Every example is in-context learning of the kind{' '}
          <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener noreferrer">the GPT-3 paper</a>{' '}
          made famous: no weights change, the examples are just conditioning. Use few-shot when
          output <em>format</em> and <em>edge-case handling</em> matter, one good example beats
          three paragraphs of description, which is why the system prompt lab below treats examples
          as a first-class block. The cost is tokens paid on every call, and a subtle trap: models
          over-imitate, so keep your examples diverse or every input gets answered like the last
          one.
        </p>
      </Prose>

      {/* Step 2 */}
      <H2>Step 2: Chain-of-thought: when reasoning out loud helps</H2>
      <Prose>
        <p>
          Asking the model to work through steps before answering, "think step by step", or an
          explicit plan-then-answer structure, measurably helps on math, logic, and multi-step
          tasks. The mechanism is the loop you already understand: intermediate tokens become
          context for later predictions, effectively giving the model more compute per answer.
          Modern <em>reasoning models</em> do this natively (trained with RL on verifiable tasks,{' '}
          <ModuleLink id="how-llms-are-trained" />), so explicit prompting matters most with smaller
          or older models. Chain-of-thought costs tokens and latency, and on simple tasks it can
          <em> hurt</em>, the model talks itself out of the right answer. It is a tool with a
          profile, not a spice to sprinkle everywhere.
        </p>
      </Prose>

      {/* Step 3 */}
      <H2>Step 3: Structured output: JSON you can ship</H2>
      <Prose>
        <p>
          In a product, the model's output is a function return value: some other component parses
          it. Free-form prose plus "please reply in JSON" will betray you occasionally, one
          markdown fence and your parser dies. The production pattern is three layers:{' '}
          <strong>constrain</strong> (response formats / JSON Schema the API enforces at decode
          time), <strong>validate</strong> (parse and check against the shape your code needs),{' '}
          <strong>retry</strong> (feed the validation error back once). Two attempts plus a typed
          fallback covers essentially all real-world failures:
        </p>
      </Prose>
      <CodeBlock language="typescript" filename="structured.ts" code={STRUCTURED_SNIPPET} />
      <Prose>
        <p>
          Notice what this is: the same tool-schema idea from <ModuleLink id="tools-react" />,
          pointed at the model's own output. The schema is a contract; the retry path is the
          contract's enforcement.
        </p>
      </Prose>

      {/* Step 4 */}
      <H2>Step 4: System prompts: the persistent contract</H2>
      <Prose>
        <p>
          The system prompt is the part of the context that persists across the whole conversation:
          role, rules, tool policy, output format, stop conditions. Treat it like an engineer,
          versioned, reviewed, and tested, because it is the closest thing a model has to a
          service configuration. The lab below assembles one from its building blocks and shows
          how the same content is phrased for different model families:
        </p>
      </Prose>
      <WidgetFrame
        title="System prompt lab"
        subtitle="Toggle the building blocks, edit each section, watch the token estimate, then compare OpenAI vs Claude vs Gemini vs open-weights conventions."
      >
        <SystemPromptLab />
      </WidgetFrame>

      {/* Step 5 */}
      <H2>Step 5: Evaluate prompt changes, never vibes-review them</H2>
      <Prose>
        <p>
          The reason prompting feels unstable is that people change a prompt, try three inputs,
          feel something, and ship. Every prompt edit is a code change: run it against your private
          eval set (<ModuleLink id="evals" />), twenty to fifty real cases with known outputs,
          before it merges. Keep the old prompt versioned so you can revert, and watch token count
          too: a prompt that got "better" while doubling cost per call is not better. This habit,
          more than any phrasing trick, is what makes prompting a production discipline.
        </p>

        <KeyTakeaways
          points={[
            'Few-shot examples teach format and edge-case handling in context, no weights change; keep examples diverse or the model over-imitates.',
            'Chain-of-thought gives the model more compute per answer and helps on multi-step tasks, but costs tokens and can hurt on easy ones.',
            'Structured output = constrain (schema-enforced decoding) + validate + retry; the schema is a contract, the retry path is its enforcement.',
            'The system prompt is the model\'s service configuration: role, rules, tool policy, format, stop conditions, versioned and reviewed like code.',
            'Evaluate every prompt change on a private eval set with token cost in view; vibes-reviewing prompts is why prompting feels unstable.',
          ]}
        />
      </Prose>
    </>
  )
}
