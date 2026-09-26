/**
 * Module, Agent Case Studies
 * Body content only; sections follow the registry `steps` order exactly.
 * Describes publicly documented architectures of real agentic products and
 * maps each one to the concepts taught in earlier modules.
 */
import {
  Callout,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  SourceList,
} from '../../components/ui'

export default function CaseStudies() {
  return (
    <>
      {/* Step 1 ─ Why case studies */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1: Why products beat abstractions</H2>
        <Prose>
          <p>
            The modules so far taught the pieces: the agent loop (<ModuleLink id="what-is-an-agent" />),
            tool calling (<ModuleLink id="tools-react" />), memory and planning (
            <ModuleLink id="memory-planning" />), retrieval (<ModuleLink id="rag" />), and the protocols
            (<ModuleLink id="mcp" />, <ModuleLink id="a2a-multiagent" />). This module reads six real
            products as worked exercises: each one is a specific set of choices about those same pieces.
            Nothing here is speculative; the architectures below are the ones the vendors themselves
            document.
          </p>
          <Callout kind="info" title="How to read each case">
            For every product we ask the same four questions: what plays the role of the model, what does
            the agent loop look like, where does knowledge come from, and what makes it feel like a
            product rather than a demo. Those map one to one onto the modules you have already read.
          </Callout>
        </Prose>
      </section>

      {/* Step 2 ─ Perplexity */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2: Perplexity, a search-first RAG machine</H2>
        <Prose>
          <p>
            Perplexity is the purest RAG product on the market. You ask a question, it searches the web,
            and every sentence of the answer arrives with numbered citations. The product is the pipeline
            from <ModuleLink id="rag" />, end to end:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Query understanding.</strong> Your question is rewritten and split into parallel
              searches, because a good answer usually needs more than one retrieval angle.
            </li>
            <li>
              <strong>Retrieval at web scale.</strong> A mix of its own crawler and index plus search
              APIs fetches candidate documents; this is the ingest and retrieve stages of the RAG
              pipeline, run continuously rather than once.
            </li>
            <li>
              <strong>Reranking and synthesis.</strong> The most relevant passages are packed into the
              prompt, and the model is instructed to ground every claim in them and cite by number.
            </li>
            <li>
              <strong>Citations as UI.</strong> Citations are not decoration. They are the trust
              mechanism that makes a probabilistic system acceptable for facts, exactly the "generate
              and cite" stage of <ModuleLink id="rag" />.
            </li>
          </ul>
          <p>
            The agent content is thin by design: little planning, few tools. Perplexity shows that a
            superbly executed retrieval loop is a product on its own, and that "search, cite, answer"
            beats a free-form agent for reliability. Its API exposes this same search pipeline to
            developers.
          </p>
          <SourceList
            sources={[
              { title: 'Perplexity docs and API', url: 'https://docs.perplexity.ai/', note: 'The search-first pipeline, exposed as a product and as an API.' },
              { title: 'Perplexity blog', url: 'https://www.perplexity.ai/hub', note: 'Announcements covering indexing, models, and Deep Research.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 3 ─ ChatGPT */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3: ChatGPT, the assistant that grew tools</H2>
        <Prose>
          <p>
            ChatGPT began as a pure chat model (Module <ModuleLink id="what-is-an-llm" />) and accreted
            agent pieces one at a time, which makes it the best map of how an assistant becomes an
            agent:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Tool calling.</strong> Web search, image generation, the code interpreter sandbox,
              and file analysis are model-invoked tools. The model decides when to call them, and the
              harness executes and returns results, exactly the function calling loop of{' '}
              <ModuleLink id="tools-react" />.
            </li>
            <li>
              <strong>Memory.</strong> Long-term memory stores facts between sessions and injects them
              into the context window, a hosted version of the memory lab in{' '}
              <ModuleLink id="memory-planning" />.
            </li>
            <li>
              <strong>Custom GPTs and agents.</strong> You can ship your own assistant with pinned
              instructions and tools; that "instructions" field is a system prompt, and what goes in one
              is exactly the subject of <ModuleLink id="build-an-agent" />.
            </li>
          </ul>
          <p>
            Notice the trajectory: one model, then tools, then memory, then delegation. That is the same
            build order recommended for your own systems in <ModuleLink id="build-an-agent" />.
          </p>
          <SourceList
            sources={[
              { title: 'OpenAI, ChatGPT', url: 'https://openai.com/index/chatgpt/', note: 'The assistant product line.' },
              { title: 'OpenAI function calling guide', url: 'https://platform.openai.com/docs/guides/function-calling', note: 'The tool mechanism underneath search, code, and files.' },
              { title: 'OpenAI API docs', url: 'https://platform.openai.com/docs', note: 'System prompts, tools, and structured outputs.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 4 ─ Claude */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4: Claude, built for agent workloads</H2>
        <Prose>
          <p>
            Anthropic ships both the models and the playbook. Claude's product surface (claude.ai)
            includes tool use, artifacts, and computer control, but the reason it appears in every agent
            stack is the model behavior plus the engineering guidance around it:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Tool use as a first-class API.</strong> Tools are declared once with JSON schemas,
              the model returns structured tool calls, and the client returns results; the same loop as{' '}
              <ModuleLink id="tools-react" /> with strong instruction following.
            </li>
            <li>
              <strong>Long-context reasoning.</strong> Large context windows let whole codebases and
              document sets sit in the prompt, which changes the planning calculus for agents (see the
              context-window discussion in <ModuleLink id="how-llms-work" />).
            </li>
            <li>
              <strong>The "building effective agents" essay.</strong> Anthropic's guidance is the
              clearest public statement of the field's current wisdom: start with a single model and
              tools, add workflow scaffolds, reach for autonomous agents only when the task demands it.
            </li>
            <li>
              <strong>Claude Code.</strong> A terminal coding agent over the same models: plan, edit
              files, run tests, commit. A reference implementation of the loop-plus-tools pattern.
            </li>
          </ul>
          <SourceList
            sources={[
              { title: 'Anthropic, Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: 'The patterns essay every agent builder should read.' },
              { title: 'Anthropic tool use docs', url: 'https://docs.anthropic.com/en/docs/agents-and-tools/tool-use', note: 'Tool schemas and the agent loop, concretely.' },
              { title: 'Claude Code docs', url: 'https://docs.anthropic.com/en/docs/claude-code/overview', note: 'A production coding agent built on the models.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 5 ─ Cursor & Windsurf */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5: Cursor and Windsurf, agents that know your codebase</H2>
        <Prose>
          <p>
            AI code editors are retrieval systems wearing an IDE. Their defining trick is not the model;
            it is what they put in the context:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Codebase indexing.</strong> The editor embeds your repository into a vector index
              (chunks of code plus metadata). Relevant symbols and files are retrieved for every
              request, which is <ModuleLink id="vector-search" /> over source code.
            </li>
            <li>
              <strong>Context assembly.</strong> The open files, the cursor position, the retrieved
              chunks, and project rules are stitched into one prompt. Quality lives in this assembly,
              more than in the model choice.
            </li>
            <li>
              <strong>The apply loop.</strong> The agent proposes an edit, the editor shows a diff, and
              on accept it re-runs checks. Observe feeds back into perceive: the loop of{' '}
              <ModuleLink id="what-is-an-agent" />, tightened until it feels instant.
            </li>
            <li>
              <strong>Agentic modes.</strong> Cursor's agent and Windsurf's Cascade plan multi-file
              changes, run terminal commands, and iterate on failures: plan-and-execute from{' '}
              <ModuleLink id="memory-planning" /> in daily use.
            </li>
          </ul>
          <p>
            Windsurf documents this flow openly as "Cascade": a reactive planner that keeps a shared
            workspace state (tasks, files, terminal output) and coordinates steps against it. Cursor
            documents its embedding-based codebase index and @-symbol context controls. Reading the two
            together is a free masterclass in production agent context engineering.
          </p>
          <SourceList
            sources={[
              { title: 'Cursor docs', url: 'https://docs.cursor.com/', note: 'Codebase indexing, context features, and agent mode.' },
              { title: 'Windsurf docs: Cascade', url: 'https://docs.windsurf.com/windsurf/cascade', note: 'The agentic flow and its workspace state model.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 6 ─ Devin */}
      <section id="step-6" className="scroll-mt-24">
        <H2>Step 6: Devin, the planner-executor profile</H2>
        <Prose>
          <p>
            Devin (Cognition) is the most autonomous profile in this module: you hand it a ticket and it
            works in its own cloud sandbox with a shell, an editor, and a browser, reporting progress as
            it goes. The architecture pattern:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>A persistent workspace.</strong> Real filesystem, real terminal, real browser. The
              agent's actions are ordinary commands, which makes every step observable and replayable.
            </li>
            <li>
              <strong>Plan, then execute, then recover.</strong> Devin plans the task, executes step by
              step, and re-plans on failure. That reflection cycle is the replan demo of{' '}
              <ModuleLink id="memory-planning" /> at product scale.
            </li>
            <li>
              <strong>Human checkpoints.</strong> It asks for input on decisions that matter (like
              credentials or ambiguous specs), the same input-required pause you saw in the A2A task
              lifecycle of <ModuleLink id="a2a-multiagent" />.
            </li>
          </ul>
          <p>
            Devin also illustrates the honest trade-off of autonomy: more agency means more surface for
            compounding errors, so the product invests heavily in sandboxing, progress traces, and
            easy human takeover. Autonomy is a dial, not a switch.
          </p>
          <SourceList
            sources={[
              { title: 'Devin', url: 'https://devin.ai/', note: 'The product and its sandboxed workspace model.' },
              { title: 'Devin docs', url: 'https://docs.devin.ai/', note: 'Sessions, planning, and integration mechanics.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 7 ─ Common architecture */}
      <section id="step-7" className="scroll-mt-24">
        <H2>Step 7: The common architecture</H2>
        <Prose>
          <p>
            Strip the branding and the six products differ along two axes only: how much the agent plans
            on its own, and what dominates its context (retrieved documents, your codebase, or its own
            workspace state).
          </p>
          <ComparisonTable
            columns={[
              { id: 'product', label: 'Product' },
              { id: 'context', label: 'Context dominates from' },
              { id: 'loop', label: 'Agent loop shape' },
            ]}
            rows={[
              { label: 'Perplexity', values: { product: 'Search + citations', context: 'Retrieved web documents', loop: 'Retrieve, cite, answer (few tools)' } },
              { label: 'ChatGPT', values: { product: 'Assistant + toolbelt', context: 'Conversation, memory, tool results', loop: 'Chat with model-invoked tools' } },
              { label: 'Claude / Claude Code', values: { product: 'Agent-grade models + CLI', context: 'Long documents and codebases', loop: 'Plan, call tools, verify, iterate' } },
              { label: 'Cursor / Windsurf', values: { product: 'IDE agents', context: 'Codebase index + open files', loop: 'Propose diff, apply, re-check' } },
              { label: 'Devin', values: { product: 'Autonomous teammate', context: 'Its own sandbox state', loop: 'Plan, execute, re-plan on failure' } },
            ]}
          />
          <Callout kind="tip" title="What to steal from each">
            From Perplexity: citations as a trust primitive. From ChatGPT: tools added incrementally,
            one capability at a time. From Claude: pick models that follow instructions precisely before
            adding scaffolds. From Cursor and Windsurf: retrieval and context assembly are the product.
            From Devin: observability and human checkpoints make autonomy shippable.
          </Callout>
          <KeyTakeaways
            points={[
              'Every famous agentic product is the same loop from Module 5.1 with different context sources.',
              'Retrieval quality, not model choice, is the main quality lever in Perplexity, Cursor, and Windsurf.',
              'Autonomy is a dial: search-first products barely plan, coding agents re-plan, Devin runs its own workspace.',
              'Trust ships as features: citations, diffs, traces, and checkpoints are what make agent output acceptable.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
