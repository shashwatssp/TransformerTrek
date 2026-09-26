/**
 * Module, System Design: Agentic Systems
 * Body content only; sections follow the registry `steps` order exactly.
 * A single end-to-end case study: a production customer-support agent,
 * designed the way a systems interview would score it — requirements,
 * back-of-envelope math, architecture, failure modes, scaling.
 */
import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  SourceList,
} from '../../components/ui'

export default function AgentSystemDesign() {
  return (
    <>
      {/* Step 1 ─ Problem statement */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1: The problem statement</H2>
        <Prose>
          <p>
            The previous modules taught the pieces: the agent loop (<ModuleLink id="what-is-an-agent" />),
            tools (<ModuleLink id="tools-react" />), memory (<ModuleLink id="memory-planning" />),
            retrieval (<ModuleLink id="rag" />), protocols (<ModuleLink id="mcp" />), and how real
            products compose them (<ModuleLink id="agent-case-studies" />). This module is the capstone:
            we design one complete system the way you would in a system-design interview — from a
            one-paragraph problem statement to an architecture you can defend.
          </p>
          <Callout kind="info" title="The case: SupportPilot">
            An e-commerce company with 10,000 support tickets per day wants an agent that reads each
            ticket, answers policy questions from the knowledge base, takes safe account actions
            (order lookup, refunds, address updates), and hands anything risky to a human. It must be
            cheaper than the current 12-person support team it assists, and every action must be
            explainable after the fact.
          </Callout>
          <p>
            Two sentences in that paragraph drive everything: <em>10,000 tickets per day</em> gives us
            the load numbers, and <em>explainable after the fact</em> gives us the audit requirement.
            A design that ignores either fails, no matter how good the model is.
          </p>
          <SourceList
            sources={[
              { title: 'Anthropic, Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: 'Start from the task, not the framework; workflows vs agents.' },
              { title: 'OpenAI, A practical guide to building agents', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', note: 'A production checklist that mirrors this design order.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 2 ─ Functional requirements */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2: Functional requirements</H2>
        <Prose>
          <p>
            Functional requirements say what the system <em>does</em>. The discipline is the same as in{' '}
            <ModuleLink id="build-an-agent" />: each requirement becomes either a tool, a prompt, or a
            routing rule. Nothing is allowed to stay vague.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>FR1 — Intake &amp; triage.</strong> Accept tickets from the web form and email;
              classify (billing, shipping, product, abuse) and route. Abusive or legal-threat tickets
              skip the agent entirely and go straight to a human queue.
            </li>
            <li>
              <strong>FR2 — Grounded answers.</strong> Every policy answer must come from knowledge-base
              retrieval with citations, the full pipeline of <ModuleLink id="rag" />. No retrieval, no
              answer — the agent says it will check and escalates instead of guessing.
            </li>
            <li>
              <strong>FR3 — Safe actions.</strong> A small, versioned tool set: order lookup
              (read-only), refund up to $100, resend shipping label, update address. Anything beyond
              those boundaries is a human job.
            </li>
            <li>
              <strong>FR4 — Escalation.</strong> Hand off to a human with a summary, the full trace,
              and everything already tried. The customer is never dead-ended by the agent.
            </li>
            <li>
              <strong>FR5 — Memory.</strong> Within a ticket, the full conversation is working memory
              (<ModuleLink id="memory-planning" />). Across tickets, customer facts come only from the
              approved profile API — never from the model&apos;s own recollection.
            </li>
            <li>
              <strong>FR6 — Audit.</strong> Every prompt, tool call, and side effect is recorded
              append-only with a session id, so any outcome can be replayed.
            </li>
          </ul>
          <Callout kind="tip" title="Requirement → design decision">
            FR2 forces hybrid retrieval with citations. FR3 forces permissioned, versioned tools.
            FR4 forces a human-approval state in the state machine. FR6 forces an append-only log.
            If a requirement does not change the architecture, it was decoration.
          </Callout>
        </Prose>
      </section>

      {/* Step 3 ─ Non-functional requirements */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3: Non-functional requirements</H2>
        <Prose>
          <p>
            Non-functional requirements are where agent systems are actually won or lost, because they
            carry the numbers the design must hit. Vague NFRs (&quot;fast and reliable&quot;) produce
            vague systems; each row below names a target and why that number.
          </p>
          <ComparisonTable
            columns={[
              { id: 'target', label: 'Target' },
              { id: 'why', label: 'Why this number' },
            ]}
            rows={[
              {
                label: 'Latency: p95 first response',
                values: { target: '< 30 s', why: 'A human agent takes ~2 min; customers tolerate a short wait for a good answer. The queue absorbs bursts — the model never sees raw load.' },
              },
              {
                label: 'Availability',
                values: { target: '99.9% for intake; degraded mode = human inbox', why: 'Tickets must never be lost, even when the model provider is down. Losing a ticket is worse than answering slowly.' },
              },
              {
                label: 'Cost per ticket',
                values: { target: '≤ $0.15 all-in', why: 'At 10k tickets/day this is the ops budget line. It drives model routing and caching decisions later.' },
              },
              {
                label: 'Safety bound',
                values: { target: 'No irreversible action above $100 without human approval', why: 'Bounded blast radius. A wrong answer is recoverable; a wrong $5,000 refund is not.' },
              },
              {
                label: 'Auditability',
                values: { target: '100% of prompts and tool calls logged, append-only', why: 'Disputes and compliance demand replay. Also the only way to debug a probabilistic system.' },
              },
              {
                label: 'Quality gate',
                values: { target: '≥ 90% on the golden eval set; zero fabricated policy answers', why: 'A wrong policy answer costs a chargeback; an escalated ticket costs cents. Tolerance is asymmetric.' },
              },
            ]}
          />
          <p>
            The evaluation gate is not an afterthought — it is an NFR with the same standing as
            latency. How to build that eval set is the subject of <ModuleLink id="evals" />.
          </p>
        </Prose>
      </section>

      {/* Step 4 ─ Back-of-envelope math */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4: Back-of-envelope math</H2>
        <Prose>
          <p>
            Before drawing a single box, do the arithmetic. These five minutes decide the queue sizes,
            the model routing, and the budget — and they tell you which parts of the design are load-bearing.
          </p>
          <CodeBlock
            language="text"
            filename="capacity & cost envelope"
            code={`Load
  10,000 tickets/day ÷ 86,400 s     ≈ 0.12 tickets/s  (average)
  peak factor 3×                    ≈ 0.35 tickets/s  (peak)
  wall-clock ≈ 45 s per ticket      ≈ 16 concurrent sessions (peak)
  design for 50 concurrent          3× headroom for bursts

Tokens per ticket
  ~8 model turns × (4,000 input + 250 output)
  = 32,000 input + 2,000 output tokens

Cost per ticket  (mid-tier frontier model, $3/M input · $15/M output)
  input:   0.032 M × $3.00  = $0.096
  output:  0.002 M × $15.00 = $0.030
  total                     ≈ $0.13/ticket   →  $1,300/day at 10k tickets
  with triage on a small model + prompt caching
                             ≈ $0.08/ticket   →  fits the $0.15 NFR

Retrieval corpus
  100k docs × ~4 chunks = 400k vectors × 384 dims × 4 bytes ≈ 0.6 GB
  → fits on one node; HNSW recall@10 > 0.95 at ~5 ms`}
          />
          <Callout kind="math" title="What the math already decided">
            Three conclusions fall out before any architecture exists. First, concurrency is tiny
            (dozens, not thousands), so the hard problem is correctness and cost, not throughput.
            Second, the naive $0.13/ticket busts nothing but leaves no margin — so triage turns get
            routed to a small model and the static prefix gets cached, landing under $0.15. Third,
            the corpus fits on one node, so the vector database is boring on day one — spend the
            complexity budget elsewhere.
          </Callout>
        </Prose>
      </section>

      {/* Step 5 ─ Architecture */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5: The architecture, end to end</H2>
        <Prose>
          <p>
            The system has five planes: intake, orchestration, model access, tools, and state. The
            orchestrator is a <strong>durable state machine</strong> — one per ticket — and the model
            is a component inside it, not the system itself.
          </p>
          <CodeBlock
            language="text"
            filename="SupportPilot — component view"
            code={`Tickets (web form, email)
   │
   ▼
Intake queue ───────────── load leveling · backpressure · 99.9% durable
   │
   ▼
Orchestrator (one durable state machine per ticket)
   │  TRIAGE → RESEARCH → PROPOSE → ACT → VERIFY → RESPOND
   │     ▲                                     │
   │     └──────── re-plan on failure ─────────┘
   │     (APPROVE state for actions > $100 → human)
   │
   ├──▶ Model gateway     route by task · prefix cache · retries · token meter
   ├──▶ Tool layer (MCP)  kb-search · orders-lookup · refund · escalate
   │                          ├── hybrid retrieval: BM25 + vectors + reranker
   │                          └── Orders API (read-only) · payments (guarded)
   ├──▶ Postgres           session state · append-only audit log
   └──▶ Traces & metrics   per-step spans · $ per ticket · eval triggers
   │
   ▼
Response + citations ─▶ customer · sampled 2% ─▶ human review queue`}
          />
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Intake queue.</strong> The only always-on surface (the 99.9% NFR). If everything
              behind it is down, tickets wait instead of disappearing.
            </li>
            <li>
              <strong>Orchestrator as a state machine.</strong> Each state is a prompt plus a check;
              each transition is persisted, LangGraph-style (<ModuleLink id="frameworks" />), so a
              crash resumes from the last checkpoint instead of restarting the ticket.
            </li>
            <li>
              <strong>Model gateway.</strong> Every model call goes through one service that routes by
              task (triage → small model, negotiation → frontier model), caches the static prefix, and
              meters tokens. This is where the $0.08/ticket math is actually enforced.
            </li>
            <li>
              <strong>Tool layer as MCP servers</strong> (<ModuleLink id="mcp" />). Tools are versioned
              and permissioned independently of prompts: the refund tool is the only component that can
              touch payments, and it enforces the $100 bound itself — the model cannot talk it out of it.
            </li>
            <li>
              <strong>Postgres for state and audit.</strong> One durable store for session state and the
              append-only log (FR6). No agent state lives in worker memory.
            </li>
          </ul>
          <p>
            The shape rhymes with what you saw in <ModuleLink id="agent-case-studies" />: Devin&apos;s
            durable workspace, Cursor&apos;s context assembly, Claude&apos;s loop-with-verification —
            minus the product branding.
          </p>
          <SourceList
            sources={[
              { title: 'LangGraph, official docs', url: 'https://langchain-ai.github.io/langgraph/', note: 'Durable, checkpointed state machines for agent control flow.' },
              { title: 'MCP, official docs', url: 'https://modelcontextprotocol.io/introduction', note: 'The tool-server interface used for the tool layer.' },
            ]}
          />
        </Prose>
      </section>

      {/* Step 6 ─ Failure modes */}
      <section id="step-6" className="scroll-mt-24">
        <H2>Step 6: Failure modes and guardrails</H2>
        <Prose>
          <p>
            A design that cannot say how it fails is a demo. Each failure below is paired with a
            guardrail that has a number or a mechanism attached — the agent-equivalent of idempotency
            and backpressure in classic distributed systems.
          </p>
          <ComparisonTable
            columns={[
              { id: 'how', label: 'How it shows up' },
              { id: 'guard', label: 'Guardrail' },
            ]}
            rows={[
              {
                label: 'Runaway loops',
                values: { how: 'The model repeats the same tool call with the same arguments, burning tokens.', guard: 'Step budget: max 10 tool calls per session, plus a loop detector on consecutive (tool, args) pairs; on trip, abort to human with the trace.' },
              },
              {
                label: 'Duplicate side effects',
                values: { how: 'A retried turn issues the same refund twice.', guard: 'Idempotency keys: side-effecting tools accept a client-supplied key and are safe to replay.' },
              },
              {
                label: 'Prompt injection',
                values: { how: 'Instructions hidden in a retrieved document hijack the agent.', guard: 'Tool output is untrusted data, never instructions; the web-connected kb-search and the refund tool never share a context window; actions are allowlisted.' },
              },
              {
                label: 'Context overflow',
                values: { how: 'Long history plus many chunks blows the window mid-task.', guard: 'Compress history to a rolling summary; rerank retrieval to top-5 chunks; fail loudly rather than truncating silently.' },
              },
              {
                label: 'Tool timeout cascade',
                values: { how: 'The orders API slows down; sessions pile up; the queue backs up.', guard: 'Per-tool timeouts plus a circuit breaker; degrade to “I’ll follow up by email” instead of retrying forever.' },
              },
              {
                label: 'Confident nonsense',
                values: { how: 'The agent answers a policy question without evidence.', guard: 'Answers must cite retrieved chunks; low confidence escalates; 2% of all replies are sampled for human review.' },
              },
              {
                label: 'Cost spike',
                values: { how: 'A prompt change doubles the turns per ticket overnight.', guard: 'Per-session and per-day token budgets; alerting on $/ticket drift; evals in CI catch the turn-count regression before deploy.' },
              },
            ]}
          />
          <Callout kind="warn" title="The pattern behind every guardrail">
            Each one converts an unbounded risk into a bounded number: a step budget, a dollar cap, a
            timeout, a sample rate. Where you cannot bound it, you gate it behind a human — that is the
            APPROVE state, and it is a feature of the state machine, not an apology.
          </Callout>
        </Prose>
      </section>

      {/* Step 7 ─ Scaling levers */}
      <section id="step-7" className="scroll-mt-24">
        <H2>Step 7: Scaling levers</H2>
        <Prose>
          <p>
            The design above comfortably handles 10×. When growth comes, pull these levers in order —
            cheapest first — instead of reaching for a rewrite:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Route by difficulty.</strong> Triage and classification already run on the small
              model; move more turn types (canned policy answers) over as eval scores allow. This is
              the biggest cost lever.
            </li>
            <li>
              <strong>Cache aggressively.</strong> The system prompt and tool schemas are static per
              session; prefix caching cuts input cost ~90% on later turns.
            </li>
            <li>
              <strong>Parallelize tools.</strong> Independent lookups (order + knowledge base) belong
              in one turn with parallel calls, not serial turns that multiply latency and cost.
            </li>
            <li>
              <strong>Scale out orchestrators.</strong> Workers are stateless over durable state
              (Postgres), so scaling is adding workers behind the queue — no shard rebalancing.
            </li>
            <li>
              <strong>Shard retrieval when it stops being boring.</strong> 0.6 GB → 60 GB means a real
              ANN index, read replicas, and an incremental re-embedding pipeline.
            </li>
            <li>
              <strong>Async the slow path.</strong> Label generation becomes a background job with a
              callback, not a blocking tool call holding a session open.
            </li>
            <li>
              <strong>Keep evals in CI.</strong> Every prompt or tool change runs the golden set from{' '}
              <ModuleLink id="evals" />; a quality regression blocks the deploy exactly like a failing
              test.
            </li>
          </ul>
          <KeyTakeaways
            points={[
              'Requirements come first: the agent exists to hit measurable NFRs, not to demo tool calls.',
              'Back-of-envelope math does the real design work — budgets chose the routing, caching, and queue before any box was drawn.',
              'The orchestrator is a durable state machine; the model is a component inside it.',
              'Every failure mode gets a guardrail with a number attached; what cannot be bounded gets gated by a human.',
              'Scaling levers are boring on purpose: routing, caching, stateless workers, and evals in CI.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
