/**
 * Module 5.6 — LangChain vs LangGraph vs ADK
 * Body content follows the registry steps for id 'frameworks'.
 */
import { getModule } from '../registry'
import { ModuleLayout } from '../../components/layout/ModuleLayout'
import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { AgentGraphBuilder } from '../../widgets/agents/AgentGraphBuilder'

const meta = getModule('frameworks')!

const lcelCode = `# LangChain: composable components piped into a chain (LCEL)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

chain = (
    ChatPromptTemplate.from_messages([
        ("system", "You are a concise assistant."),
        ("human", "{question}"),
    ])
    | llm                    # a chat model
    | StrOutputParser()      # pull the string out
)

answer = chain.invoke({"question": "Why do agents need loops?"})
# Control flow is fixed by YOU, at build time — great for pipelines.`

const langgraphCode = `# LangGraph: the agent is a state machine you declare
from typing import Annotated, TypedDict
from operator import add
from langgraph.graph import StateGraph, START, END

class AgentState(TypedDict):
    question: str
    documents: list[str]
    web_searches: Annotated[int, add]      # reducer: parallel writes ADD

g = StateGraph(AgentState)
g.add_node("retrieve", retrieve)           # each node: (state) -> partial state
g.add_node("grade_documents", grade)
g.add_node("rewrite_query", rewrite)
g.add_node("generate", generate)

g.add_edge(START, "retrieve")
g.add_edge("retrieve", "grade_documents")
g.add_conditional_edges(                   # the router is a function you write
    "grade_documents", route,
    {"relevant": "generate", "not relevant": "rewrite_query"},
)
g.add_edge("rewrite_query", "retrieve")    # the cycle — impossible in a DAG
g.add_conditional_edges("generate", check_grounded,
    {"grounded": END, "not grounded": "rewrite_query"})

app = g.compile()                          # runs steps, checkpoints state`

export default function Frameworks() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          You could build every agent so far with raw HTTP calls. Frameworks exist to take the
          boilerplate — state threading, streaming, retries, checkpointing — and give it names.
          This module walks the three you'll actually meet: <strong>LangChain</strong> (the
          component library), <strong>LangGraph</strong> (its graph runtime), and{' '}
          <strong>Google ADK</strong> (the agent-first newcomer). The concepts transfer to
          every other framework too.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1 — LangChain: the chained abstractions</H2>
      <Prose>
        <p>
          <a href="https://python.langchain.com/docs/introduction/" target="_blank" rel="noopener noreferrer">LangChain</a>{' '}
          is a parts bin: standardized wrappers for models, prompt templates, output parsers,
          retrievers, and vector stores. Compose them with the <strong>pipe operator</strong> —
          each piece consumes the previous one's output — and you get declarative pipelines
          (LCEL) with streaming, batching, and async for free.
        </p>
        <CodeBlock language="python" filename="lcel_chain.py" code={lcelCode} />
        <p>
          What chains can't express is <strong>branching and looping decided at runtime</strong> —
          the pipeline shape is fixed when you write it. The moment you need "if the retrieval
          was bad, go back and try again," you've outgrown chains. That's where LangGraph starts.
        </p>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2 — LangGraph: state, nodes, edges</H2>
      <Prose>
        <p>
          <a href="https://langchain-ai.github.io/langgraph/" target="_blank" rel="noopener noreferrer">LangGraph</a>{' '}
          models an agent as a <strong>state machine</strong>: one shared state object,{' '}
          <strong>nodes</strong> that are plain functions (state in → partial state update out),
          and <strong>edges</strong> that decide who runs next — including{' '}
          <em>conditional</em> edges chosen by a router function. This is the vocabulary the
          whole ecosystem uses now, which is why the glossary defines it (
          <a href="https://langchain-ai.github.io/langgraph/" target="_blank" rel="noopener noreferrer">official docs</a>{' '}
          are excellent).
        </p>
        <CodeBlock language="python" filename="agent_graph.py" code={langgraphCode} />
        <Callout kind="tip" title="Reading the graph">
          Nodes are boring on purpose — <code className="font-mono text-accent">retrieve</code>,{' '}
          <code className="font-mono text-accent">grade</code>, <code className="font-mono text-accent">generate</code>{' '}
          are just functions. All the interesting decisions live in the <em>edges</em>, which
          means control flow is inspectable at a glance instead of buried in nested loops.
        </Callout>
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3 — Reducers: merging parallel state</H2>
      <Prose>
        <p>
          LangGraph can run nodes in <strong>parallel</strong> (fan-out from one node), which
          raises a question chat frameworks never had: if two nodes write{' '}
          <code className="font-mono text-accent">web_searches</code> at the same time, who
          wins? The answer is a <strong>reducer</strong> — a per-key merge function declared
          with the state. <code className="font-mono text-accent">Annotated[int, add]</code>{' '}
          sums concurrent writes; a list key might concatenate; the default is last-write-wins
          (<em>replace</em>). You saw both behaviors side by side in the widget's state panel.
        </p>
        <p>
          This tiny concept is what makes map-reduce over LLM calls — send 10 subqueries at
          once, merge results — a declarative one-liner instead of threading boilerplate.
        </p>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4 — Graphs with cycles: why agents need them</H2>
      <Prose>
        <p>
          Workflows are DAGs — they go forward. Agents need <strong>cycles</strong>: retry a
          failed tool, re-retrieve after a rewrite, critique and regenerate. A cycle is just an
          edge back to an earlier node, guarded by a conditional edge so it eventually exits —
          plus a step budget in the host, because "eventually" needs a hard limit (the loop
          failure mode from <ModuleLink id="tools-react" />). Run the graph below and watch the
          answer take the <em>retry cycle</em> once before exiting through{' '}
          <code className="font-mono text-accent">grounded</code>:
        </p>
      </Prose>
      <WidgetFrame
        title="AgentGraphBuilder — a stateful agent graph"
        subtitle="Step through execution: conditional edges route, the retry cycle loops retrieve←rewrite, and the state panel shows replace vs add reducers."
      >
        <AgentGraphBuilder />
      </WidgetFrame>

      {/* ── Step 5 ─────────────────────────────────────────────── */}
<H2>Step 5 — Google ADK and where it fits</H2>
      <Prose>
        <p>
          <a href="https://google.github.io/adk-docs/" target="_blank" rel="noopener noreferrer">Google's Agent Development Kit (ADK)</a>{' '}
          starts one level higher: where LangGraph gives you graph primitives, ADK gives you{' '}
          <em>agent roles</em> out of the box — LLM agents, sequential/parallel workflow agents,
          and a native multi-agent tree (parent agents delegate to child agents, sharing session
          state). It's model-agnostic but integrates tightly with Gemini and Vertex AI, and it
          speaks A2A-friendly patterns natively (<ModuleLink id="a2a-multiagent" />).
        </p>
        <p>Where each one earns its keep:</p>
        <ComparisonTable
          columns={[
            { id: 'langchain', label: 'LangChain' },
            { id: 'langgraph', label: 'LangGraph' },
            { id: 'adk', label: 'Google ADK' },
          ]}
          rows={[
            {
              label: 'Mental model',
              values: {
                langchain: 'Parts bin + chained pipelines (LCEL)',
                langgraph: 'State machine: nodes, edges, reducers, cycles',
                adk: 'Agent roles + workflow agents + agent tree',
              },
            },
            {
              label: 'Control flow',
              values: {
                langchain: 'Fixed by the developer at build time',
                langgraph: 'Dynamic — conditional edges and cycles at runtime',
                adk: 'Declarative workflow agents (sequential/parallel/loop) + routing',
              },
            },
            {
              label: 'Best for',
              values: {
                langchain: 'Straightforward pipelines, quick prototypes, broad integrations',
                langgraph: 'Controllable agents, human-in-the-loop, checkpointing, durable runs',
                adk: 'Gemini/Vertex-centric teams; multi-agent hierarchies out of the box',
              },
            },
            {
              label: 'Multi-agent story',
              values: {
                langchain: 'Compose chains; no native topology',
                langgraph: 'Supervisor/swarm patterns as graphs (subgraphs)',
                adk: 'First-class: parent/child agents, delegation, shared session state',
              },
            },
            {
              label: 'Bounded loops & retries',
              values: {
                langchain: 'Manual — you write the loop',
                langgraph: 'Native: cycle edges + conditional exits + step budgets',
                adk: 'LoopAgent with max_iterations; escalation signals',
              },
            },
          ]}
        />
        <p className="text-sm text-ink-muted">
          All three interoperate with MCP for tools (<ModuleLink id="mcp" />), and every one of
          them still needs the loop you built in <ModuleLink id="what-is-an-agent" /> — the
          framework is the plumbing, not the agent.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'LangChain = composable components chained at build time — perfect pipelines, no runtime branching.',
          'LangGraph = a shared state object, function nodes, and edges (including conditional) — control flow you can read, checkpoint, and rerun.',
          'Reducers define how parallel writes merge (add vs replace) — the enabler of fan-out map-reduce over LLM calls.',
          'Cycles (guarded by conditional edges and step budgets) are what make agents self-correcting instead of one-pass brittle.',
          'ADK rises a level: agent roles, workflow agents, and native multi-agent trees — tightest around Gemini/Vertex, A2A-friendly.',
        ]}
      />
    </ModuleLayout>
  )
}
