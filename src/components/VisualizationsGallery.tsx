/**
 * Visualizations gallery, every interactive widget on one page, in reading
 * order, grouped by theme. For people short on time: scroll through, play
 * with each demo, and read the full module only where you want depth.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getModule, moduleNumber } from '../modules/registry'
import { WidgetFrame } from './ui'
import { NextTokenSampler } from '../widgets/transformer/NextTokenSampler'
import { AttentionPlayground } from '../widgets/transformer/AttentionPlayground'
import { ArchitectureDiagram } from '../widgets/transformer/ArchitectureDiagram'
import { ArchitectureFlow } from '../widgets/transformer/ArchitectureFlow'
import { EncoderDecoderFlow } from '../widgets/transformer/EncoderDecoderFlow'
import { EmbeddingBuilder } from '../widgets/transformer/EmbeddingBuilder'
import { DimensionLab } from '../widgets/transformer/DimensionLab'
import { ModelDimensions } from '../widgets/transformer/ModelDimensions'
import { TokenizerPlayground } from '../widgets/transformer/TokenizerPlayground'
import TrainingLoopViz from '../widgets/llm/TrainingLoopViz'
import ScalingLawsChart from '../widgets/llm/ScalingLawsChart'
import PostTrainingPipeline from '../widgets/llm/PostTrainingPipeline'
import { PerplexityLab } from '../widgets/agents/PerplexityLab'
import { BenchmarksChart } from '../widgets/agents/BenchmarksChart'
import EmbeddingExplorer from '../widgets/retrieval/EmbeddingExplorer'
import VectorSearchDemo from '../widgets/retrieval/VectorSearchDemo'
import BM25Lab from '../widgets/retrieval/BM25Lab'
import RAGPipelineFlow from '../widgets/retrieval/RAGPipelineFlow'
import HybridFusion from '../widgets/retrieval/HybridFusion'
import MiniLMViz from '../widgets/retrieval/MiniLMViz'
import DecisionFramework from '../widgets/retrieval/DecisionFramework'
import { AgentLoopViz } from '../widgets/agents/AgentLoopViz'
import { ReActStepper } from '../widgets/agents/ReActStepper'
import { MemoryPlanningViz } from '../widgets/agents/MemoryPlanningViz'
import { MCPFlow } from '../widgets/agents/MCPFlow'
import { A2AFlow } from '../widgets/agents/A2AFlow'
import { AgentGraphBuilder } from '../widgets/agents/AgentGraphBuilder'
import { LlmJudgeExplainer } from '../widgets/agents/LlmJudgeExplainer'
import { SystemPromptLab } from '../widgets/agents/SystemPromptLab'

type Entry = {
  /** Widget title (used only when the widget is not self-framed) */
  title: string
  moduleId: string
  node: ReactNode
  /** Widgets that already include their own WidgetFrame */
  selfFramed?: boolean
}

type Group = {
  id: string
  title: string
  blurb: string
  entries: Entry[]
}

const GROUPS: Group[] = [
  {
    id: 'language-models',
    title: 'How language models work',
    blurb: 'From raw probabilities to trained, aligned models. Sliders and charts run on live math.',
    entries: [
      { title: 'Next-token sampler', moduleId: 'how-llms-work', selfFramed: true, node: <NextTokenSampler /> },
      { title: 'Training-loop simulator', moduleId: 'pretraining', node: <TrainingLoopViz /> },
      { title: 'Scaling laws chart', moduleId: 'pretraining', node: <ScalingLawsChart /> },
      { title: 'Post-training pipeline', moduleId: 'fine-tuning', node: <PostTrainingPipeline /> },
      { title: 'Perplexity lab', moduleId: 'evals', node: <PerplexityLab /> },
      { title: 'Benchmarks chart', moduleId: 'evals', node: <BenchmarksChart /> },
    ],
  },
  {
    id: 'transformers',
    title: 'Inside a transformer',
    blurb: 'Tokenize, attend, stack blocks. Every matrix in the attention playground is computed in your browser.',
    entries: [
      { title: 'Full architecture diagram', moduleId: 'transformer-map', selfFramed: true, node: <ArchitectureDiagram /> },
      { title: 'Tokenizer playground', moduleId: 'tokenization-embeddings', selfFramed: true, node: <TokenizerPlayground /> },
      { title: 'Embedding builder', moduleId: 'tokenization-embeddings', selfFramed: true, node: <EmbeddingBuilder /> },
      { title: 'Dimension lab', moduleId: 'tokenization-embeddings', selfFramed: true, node: <DimensionLab /> },
      { title: 'Model dimensions reference', moduleId: 'tokenization-embeddings', selfFramed: true, node: <ModelDimensions /> },
      { title: 'Attention playground', moduleId: 'attention', selfFramed: true, node: <AttentionPlayground /> },
      { title: 'Architecture flow', moduleId: 'architecture', selfFramed: true, node: <ArchitectureFlow /> },
      { title: 'Encoder-decoder flow', moduleId: 'architecture', selfFramed: true, node: <EncoderDecoderFlow /> },
    ],
  },
  {
    id: 'retrieval',
    title: 'Retrieval and search',
    blurb: 'Embeddings, cosine similarity, BM25, HNSW graphs, and full RAG pipelines you can drive.',
    entries: [
      { title: 'Embedding explorer', moduleId: 'vector-search', node: <EmbeddingExplorer /> },
      { title: 'Vector search + HNSW', moduleId: 'vector-search', node: <VectorSearchDemo /> },
      { title: 'BM25 lab', moduleId: 'bm25', node: <BM25Lab /> },
      { title: 'RAG pipeline flow', moduleId: 'rag', node: <RAGPipelineFlow /> },
      { title: 'Hybrid fusion (RRF)', moduleId: 'hybrid-search', node: <HybridFusion /> },
      { title: 'MiniLM visualizer', moduleId: 'minilm', node: <MiniLMViz /> },
      { title: 'RAG vs fine-tuning framework', moduleId: 'rag-vs-fine-tuning', node: <DecisionFramework /> },
    ],
  },
  {
    id: 'agents',
    title: 'Agents and protocols',
    blurb: 'The agent loop, ReAct, memory and planning, MCP, A2A, graphs, judges, and prompt building.',
    entries: [
      { title: 'Agent loop trace', moduleId: 'what-is-an-agent', node: <AgentLoopViz /> },
      { title: 'ReAct stepper', moduleId: 'tools-react', node: <ReActStepper /> },
      { title: 'Memory and planning lab', moduleId: 'memory-planning', node: <MemoryPlanningViz /> },
      { title: 'MCP message flow', moduleId: 'mcp', node: <MCPFlow /> },
      { title: 'A2A: cards, tasks, topologies', moduleId: 'a2a-multiagent', node: <A2AFlow /> },
      { title: 'Agent graph builder', moduleId: 'frameworks', node: <AgentGraphBuilder /> },
      { title: 'LLM judge explainer', moduleId: 'evals', node: <LlmJudgeExplainer /> },
      { title: 'System prompt lab', moduleId: 'build-an-agent', node: <SystemPromptLab /> },
    ],
  },
]

/**
 * Mounts heavy widgets only once they come near the viewport. The gallery
 * stacks ~20 interactive widgets; mounting them all at once makes phones
 * janky and slow to become interactive. The placeholder keeps the scroll
 * position roughly stable until the real widget mounts.
 */
function LazyMount({ children, minHeight = 320 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (mounted || !ref.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMounted(true)
          io.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [mounted])

  return (
    <div ref={ref} style={mounted ? undefined : { minHeight }}>
      {mounted ? children : null}
    </div>
  )
}

function ModuleRef({ id }: { id: string }) {
  const m = getModule(id)
  if (!m) return null
  return (
    <p className="mt-2 text-xs text-ink-muted">
      <a href={`/modules/${m.id}`} className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent">
        Open the full module ({moduleNumber(m)}, {m.title})
      </a>
    </p>
  )
}

export default function VisualizationsGallery() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Visualizations</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Short on time? This page lines up every interactive demo in reading order. Play with each one,
          read the one-line explanation, and jump into the full module wherever you want depth.
        </p>
        <nav aria-label="Jump to a section" className="mt-4 flex flex-wrap gap-2">
          {GROUPS.map((g, gi) => (
            <button
              key={g.id}
              onClick={() => document.getElementById(g.id)?.scrollIntoView({ behavior: 'smooth' })}
              className="min-h-9 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-accent/50 hover:text-accent"
            >
              {gi + 1}. {g.title}
            </button>
          ))}
        </nav>
      </header>

      {GROUPS.map((g, gi) => (
        <section key={g.id} id={g.id} className="mt-12 scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="font-mono text-sm text-ink-muted">{gi + 1}.</span> {g.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{g.blurb}</p>

          <div className="mt-6 space-y-4">
            {g.entries.map((e, ei) => (
              <div key={`${g.id}-${ei}`}>
                <LazyMount>
                  {e.selfFramed ? e.node : <WidgetFrame title={e.title}>{e.node}</WidgetFrame>}
                </LazyMount>
                <ModuleRef id={e.moduleId} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
