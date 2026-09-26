import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export type Section = {
  id: string
  title: string
  blurb: string
}

/** A link to real, external documentation or a paper. */
export type SourceRef = {
  title: string
  url: string
  note?: string
}

export type ModuleMeta = {
  id: string
  section: string
  order: number
  title: string
  blurb: string
  widget?: string
  /** Ordered outline — the "first thing first" reading sequence for this module. */
  steps: string[]
  /** Module ids that should be understood first (prerequisite DAG). */
  prerequisites: string[]
  /** Cross-reference "see also" module ids. */
  related: string[]
  /** Real external sources this module is built from. */
  sources: SourceRef[]
  component: LazyExoticComponent<ComponentType> | null
}

export const SECTIONS: Section[] = [
  { id: 'foundations', title: 'Foundations', blurb: 'Start here — what LLMs are and how they behave.' },
  { id: 'transformers', title: 'Transformers', blurb: 'Tokens, embeddings, attention, and the architecture that changed everything.' },
  { id: 'training', title: 'Training LLMs', blurb: 'Pretraining, scaling laws, post-training, and how different LLMs are made.' },
  { id: 'retrieval', title: 'Retrieval & Search', blurb: 'RAG, vector search, BM25, MiniLM, and hybrid retrieval.' },
  { id: 'agents', title: 'Agents & Protocols', blurb: 'Agents, tools, memory, MCP, A2A, LangChain, LangGraph, ADK.' },
  { id: 'evals', title: 'Evaluations', blurb: 'How we measure LLM quality.' },
]

/**
 * Registry of all modules. Component fields are filled in by each track;
 * `null` component = "coming soon" placeholder rendering.
 */
export const MODULES: ModuleMeta[] = [
  // ── Foundations ──────────────────────────────────────────────
  {
    id: 'what-is-an-llm', section: 'foundations', order: 1,
    title: 'What is an LLM?', blurb: 'Tokens, next-token prediction, and why probability is the whole game.',
    widget: 'next-token',
    steps: [
      'Tokens: how models read text',
      'Next-token prediction: one guess at a time',
      'Probability is the whole game',
      'Why scale changes everything',
    ],
    prerequisites: [],
    related: ['how-llms-work', 'tokenization-embeddings'],
    sources: [
      { title: 'Karpathy — Intro to Large Language Models', url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g', note: 'The 1-hour big-picture talk.' },
      { title: 'Language Models are Few-Shot Learners (GPT-3)', url: 'https://arxiv.org/abs/2005.14165', note: 'The paper that defined the modern LLM paradigm.' },
      { title: 'Hugging Face LLM Course, ch. 1', url: 'https://huggingface.co/learn/llm-course/chapter1/1', note: 'Hands-on companion.' },
    ],
    component: lazy(() => import('./foundations/WhatIsAnLLM')),
  },
  {
    id: 'how-llms-work', section: 'foundations', order: 2,
    title: 'How does an LLM work?', blurb: 'The inference loop, context windows, temperature and sampling.',
    widget: 'sampler',
    steps: [
      'The inference loop, end to end',
      'Context windows and their limits',
      'Temperature: controlling randomness',
      'Sampling strategies: top-k and top-p',
    ],
    prerequisites: ['what-is-an-llm'],
    related: ['next-token-lab', 'tokenization-embeddings'],
    sources: [
      { title: "Karpathy — Let's build GPT from scratch", url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY', note: 'Build the loop yourself, line by line.' },
      { title: 'The Illustrated GPT-2 (Visualizing the Language Model)', url: 'https://jalammar.github.io/illustrated-gpt2/' },
      { title: 'OpenAI — Better Language Models (GPT-2)', url: 'https://openai.com/index/better-language-models/' },
    ],
    component: lazy(() => import('./foundations/HowLLMsWork')),
  },
  // ── Transformers ─────────────────────────────────────────────
  {
    id: 'tokenization-embeddings', section: 'transformers', order: 3,
    title: 'Tokenization & Embeddings', blurb: 'How text becomes numbers — subwords, vocab IDs, dense vectors.',
    widget: 'tokenizer',
    steps: [
      'Characters → subwords → tokens',
      'Byte-pair encoding, step by step',
      'Vocab IDs and their blind spots',
      'From token IDs to dense embeddings',
    ],
    prerequisites: ['what-is-an-llm'],
    related: ['attention', 'vector-search'],
    sources: [
      { title: 'Hugging Face — Summary of the tokenizers', url: 'https://huggingface.co/docs/transformers/tokenizer_summary' },
      { title: 'Sennrich et al. — Neural Machine Translation of Rare Words with Subword Units (BPE)', url: 'https://arxiv.org/abs/1508.07909' },
      { title: 'The Illustrated Word2Vec', url: 'https://jalammar.github.io/illustrated-word2vec/' },
    ],
    component: lazy(() => import('./transformer/TokenizationEmbeddings')),
  },
  {
    id: 'attention', section: 'transformers', order: 4,
    title: 'Attention, step by step', blurb: 'Q, K, V, scores, masking, softmax, outputs — every number visible.',
    widget: 'attention',
    steps: [
      'The problem: one vector per word is not enough',
      'Queries, Keys, Values — the library metaphor',
      'Scores: dot products, row by row',
      'Softmax: turning scores into weights',
      'Masking: what a decoder may not see',
      'Weighted sums: the output',
    ],
    prerequisites: ['tokenization-embeddings'],
    related: ['architecture', 'how-llms-work'],
    sources: [
      { title: 'Vaswani et al. — Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', note: 'The original transformer paper.' },
      { title: 'The Illustrated Transformer', url: 'https://jalammar.github.io/illustrated-transformer/' },
      { title: 'Transformer Explainer (Polo Club)', url: 'https://poloclub.github.io/transformer-explainer/', note: 'Interactive Sankey-style walkthrough.' },
      { title: 'BertViz — attention head visualization', url: 'https://github.com/jessevig/bertviz' },
    ],
    component: lazy(() => import('./transformer/Attention')),
  },
  {
    id: 'architecture', section: 'transformers', order: 5,
    title: 'Transformer Architecture', blurb: 'Embedding → N blocks (attention + MLP) → output. Encoder vs decoder.',
    widget: 'architecture',
    steps: [
      'The big picture: blocks in a stack',
      'Inside a block: attention + MLP',
      'Residual connections and LayerNorm',
      'Encoder vs decoder vs decoder-only',
    ],
    prerequisites: ['attention'],
    related: ['attention', 'how-llms-are-trained'],
    sources: [
      { title: 'The Annotated Transformer (Harvard NLP)', url: 'https://nlp.seas.harvard.edu/annotated-transformer/', note: 'The paper, implemented line by line.' },
      { title: 'Vaswani et al. — Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
      { title: 'Transformer Explainer (Polo Club)', url: 'https://poloclub.github.io/transformer-explainer/' },
    ],
    component: lazy(() => import('./transformer/Architecture')),
  },
  {
    id: 'next-token-lab', section: 'transformers', order: 6,
    title: 'Next-Token Prediction Lab', blurb: 'Temperature, top-k, top-p — shape the distribution yourself.',
    widget: 'sampler',
    steps: [
      'Logits → probabilities review',
      'Temperature in practice',
      'Top-k: cut the tail',
      'Top-p: the nucleus rule',
      'Putting it together: the decode loop',
    ],
    prerequisites: ['how-llms-work'],
    related: ['how-llms-work', 'attention'],
    sources: [
      { title: 'Hugging Face — Generation strategies', url: 'https://huggingface.co/docs/transformers/generation_strategies' },
      { title: 'Holtzman et al. — The Curious Case of Neural Text Degeneration (top-p)', url: 'https://arxiv.org/abs/1904.09751' },
    ],
    component: lazy(() => import('./transformer/NextTokenLab')),
  },
  // ── Training ─────────────────────────────────────────────────
  {
    id: 'pretraining', section: 'training', order: 7,
    title: 'Pretraining', blurb: 'Trillions of tokens, one objective: predict the next token.',
    widget: 'training-loop',
    steps: [
      'The objective: next-token over trillions of tokens',
      'Data pipelines and cleaning',
      'Loss curves and what they hide',
      'Scaling laws: parameters vs data',
      'Chinchilla: compute-optimal training',
    ],
    prerequisites: ['architecture'],
    related: ['how-llms-are-trained', 'evals'],
    sources: [
      { title: 'Kaplan et al. — Scaling Laws for Neural Language Models', url: 'https://arxiv.org/abs/2001.08361' },
      { title: 'Hoffmann et al. — Training Compute-Optimal Large Language Models (Chinchilla)', url: 'https://arxiv.org/abs/2203.15556' },
      { title: 'Gao et al. — The Pile (training corpus)', url: 'https://arxiv.org/abs/2101.00027' },
    ],
    component: null,
  },
  {
    id: 'how-llms-are-trained', section: 'training', order: 8,
    title: 'How Different LLMs Are Trained', blurb: 'GPT vs BERT vs T5 objectives; dense vs MoE; Llama 3 & DeepSeek recipes.',
    widget: 'pipeline',
    steps: [
      'Three objectives: causal, masked, span corruption',
      'GPT vs BERT vs T5',
      'Dense vs Mixture-of-Experts',
      'Case studies: Llama 3 and DeepSeek recipes',
      'Reasoning models: RL with verifiable rewards',
    ],
    prerequisites: ['pretraining'],
    related: ['fine-tuning', 'architecture'],
    sources: [
      { title: 'Devlin et al. — BERT', url: 'https://arxiv.org/abs/1810.04805' },
      { title: 'Raffel et al. — T5 (Exploring the Limits of Transfer Learning)', url: 'https://arxiv.org/abs/1910.10683' },
      { title: 'The Llama 3 Herd of Models', url: 'https://arxiv.org/abs/2407.21783' },
      { title: 'DeepSeek-V3 Technical Report', url: 'https://arxiv.org/abs/2412.19437' },
    ],
    component: null,
  },
  {
    id: 'fine-tuning', section: 'training', order: 9,
    title: 'Fine-tuning & Alignment', blurb: 'SFT, LoRA/QLoRA, RLHF/PPO, DPO, GRPO — and reward hacking.',
    widget: 'pipeline',
    steps: [
      'SFT: teaching format and behavior',
      'LoRA / QLoRA: adapters, not full weights',
      'RLHF: preference data → reward model → PPO',
      'DPO: skipping the reward model',
      'GRPO: group-relative baselines',
      'Reward hacking and how to catch it',
    ],
    prerequisites: ['pretraining'],
    related: ['rag-vs-fine-tuning', 'how-llms-are-trained'],
    sources: [
      { title: 'Hu et al. — LoRA', url: 'https://arxiv.org/abs/2106.09685' },
      { title: 'Dettmers et al. — QLoRA', url: 'https://arxiv.org/abs/2305.14314' },
      { title: 'Ouyang et al. — InstructGPT (RLHF)', url: 'https://arxiv.org/abs/2203.02155' },
      { title: 'Rafailov et al. — DPO', url: 'https://arxiv.org/abs/2305.18290' },
      { title: 'Shao et al. — DeepSeekMath (GRPO)', url: 'https://arxiv.org/abs/2402.03300' },
    ],
    component: null,
  },
  // ── Retrieval & Search ───────────────────────────────────────
  {
    id: 'rag', section: 'retrieval', order: 10,
    title: 'What is RAG?', blurb: 'The 7-stage pipeline that grounds LLMs in your data.',
    widget: 'rag',
    steps: [
      'Why RAG exists: knowledge vs behavior',
      'Stages 1–2: ingest, chunk, embed',
      'Stages 3–4: query and retrieve',
      'Stage 5: rerank and assemble context',
      'Stages 6–7: prompt, generate, cite',
      'Failure modes: retrieval that lies',
    ],
    prerequisites: ['how-llms-work'],
    related: ['rag-vs-fine-tuning', 'vector-search', 'hybrid-search'],
    sources: [
      { title: 'Lewis et al. — Retrieval-Augmented Generation (original RAG paper)', url: 'https://arxiv.org/abs/2005.11401' },
      { title: 'AWS Prescriptive Guidance — RAG options and architectures', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/retrieval-augmented-generation-options/' },
      { title: 'LangChain — RAG tutorial', url: 'https://python.langchain.com/docs/tutorials/rag/' },
    ],
    component: lazy(() => import('./retrieval/WhatIsRag')),
  },
  {
    id: 'rag-vs-fine-tuning', section: 'retrieval', order: 11,
    title: 'RAG vs Fine-tuning', blurb: 'When to retrieve, when to train, when to combine — side by side.',
    widget: 'comparison',
    steps: [
      'The core distinction: knowledge vs behavior',
      'Side by side: how each works',
      'The 4-question decision framework',
      'When to combine: hybrid strategies',
      'Evidence from the field: what studies found',
    ],
    prerequisites: ['rag', 'fine-tuning'],
    related: ['rag', 'fine-tuning', 'vector-search'],
    sources: [
      { title: 'AWS Prescriptive Guidance — Comparing RAG and fine-tuning', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/retrieval-augmented-generation-options/rag-vs-fine-tuning.html', note: 'Advantages/disadvantages table and recommendations.' },
      { title: 'Balaguer et al. — RAG vs Fine-tuning: Pipelines, Tradeoffs, and a Case Study on Agriculture', url: 'https://arxiv.org/abs/2401.08406', note: 'Measured: fine-tuning +6pp, RAG +5pp further, combined best.' },
      { title: 'AWS ML Blog — Tailoring foundation models: RAG, fine-tuning, and hybrid approaches', url: 'https://aws.amazon.com/blogs/machine-learning/tailoring-foundation-models-for-your-business-needs-a-comprehensive-guide-to-rag-fine-tuning-and-hybrid-approaches/' },
    ],
    component: lazy(() => import('./retrieval/RagVsFineTuning')),
  },
  {
    id: 'vector-search', section: 'retrieval', order: 12,
    title: 'Vector & Semantic Search', blurb: 'Embedding spaces, cosine similarity, ANN and HNSW graphs.',
    widget: 'vector-search',
    steps: [
      'Embeddings as geometry',
      'Cosine similarity in practice',
      'Brute force — and why it fails at scale',
      'ANN and the HNSW graph',
      'Recall vs speed tradeoffs',
    ],
    prerequisites: ['tokenization-embeddings'],
    related: ['minilm', 'bm25', 'rag'],
    sources: [
      { title: 'Malkov & Yashunin — HNSW', url: 'https://arxiv.org/abs/1603.09320' },
      { title: 'Pinecone — Vector databases', url: 'https://www.pinecone.io/learn/vector-database/' },
      { title: 'Hugging Face — Sentence similarity task', url: 'https://huggingface.co/tasks/sentence-similarity' },
    ],
    component: lazy(() => import('./retrieval/VectorSearch')),
  },
  {
    id: 'bm25', section: 'retrieval', order: 13,
    title: 'How BM25 Works', blurb: 'Term saturation, IDF, length normalization — with live k1/b sliders.',
    widget: 'bm25',
    steps: [
      'TF-IDF refresher',
      'Term-frequency saturation: k1',
      'Length normalization: b',
      'IDF: rare words matter',
      'Live lab: tune k1 and b yourself',
    ],
    prerequisites: [],
    related: ['vector-search', 'hybrid-search'],
    sources: [
      { title: 'Robertson & Zaragoza — The Probabilistic Relevance Framework: BM25 and Beyond', url: 'https://dl.acm.org/doi/10.1561/1500000019' },
      { title: 'Elastic — Practical BM25: the algorithm and its variables', url: 'https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables' },
    ],
    component: lazy(() => import('./retrieval/Bm25')),
  },
  {
    id: 'minilm', section: 'retrieval', order: 14,
    title: 'MiniLM Inside-Out', blurb: 'Distillation, 6 layers, mean pooling, and contrastive training.',
    widget: 'minilm',
    steps: [
      'Why distill a transformer?',
      'The 6-layer architecture',
      'Mean pooling: sentence → vector',
      'Contrastive training: pull matches together',
      '384 dims in action',
    ],
    prerequisites: ['vector-search'],
    related: ['vector-search', 'hybrid-search'],
    sources: [
      { title: 'Wang et al. — MiniLM: Deep Self-Attention Distillation', url: 'https://arxiv.org/abs/1908.06954' },
      { title: 'Reimers & Gurevych — Sentence-BERT', url: 'https://arxiv.org/abs/1908.10084' },
      { title: 'SBERT documentation', url: 'https://sbert.net/' },
    ],
    component: lazy(() => import('./retrieval/Minilm')),
  },
  {
    id: 'hybrid-search', section: 'retrieval', order: 15,
    title: 'Hybrid Search & Reranking', blurb: 'BM25 + dense fusion (RRF) and cross-encoder rerankers.',
    widget: 'fusion',
    steps: [
      'BM25 alone misses meaning; dense misses exactness',
      'Reciprocal rank fusion, step by step',
      'Cross-encoder rerankers',
      'When each stage pays off',
    ],
    prerequisites: ['bm25', 'vector-search'],
    related: ['rag', 'minilm'],
    sources: [
      { title: 'Cormack et al. — Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods', url: 'https://dl.acm.org/doi/10.1145/1571941.1571977' },
      { title: 'Weaviate — Hybrid search explained', url: 'https://weaviate.io/blog/hybrid-search-explained' },
      { title: 'Hugging Face — ms-marco cross-encoder rerankers', url: 'https://huggingface.co/cross-encoders/ms-marco-MiniLM-L-6-v2' },
    ],
    component: lazy(() => import('./retrieval/HybridSearch')),
  },
  // ── Agents & Protocols ───────────────────────────────────────
  {
    id: 'what-is-an-agent', section: 'agents', order: 16,
    title: 'What is an Agent?', blurb: 'Perceive → reason → act → observe — the loop that changes everything.',
    widget: 'agent-loop',
    steps: [
      'From chatbot to agent: the loop',
      'Perceive → reason → act → observe',
      'Tools change everything',
      'When not to build an agent',
    ],
    prerequisites: ['how-llms-work'],
    related: ['tools-react', 'frameworks'],
    sources: [
      { title: 'Yao et al. — ReAct', url: 'https://arxiv.org/abs/2210.03629' },
      { title: 'Anthropic — Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents' },
    ],
    component: lazy(() => import('./agents/WhatIsAnAgent')),
  },
  {
    id: 'tools-react', section: 'agents', order: 17,
    title: 'Tool Calling & ReAct', blurb: 'Function calling, the ReAct loop, and mock tool registries.',
    widget: 'agent-loop',
    steps: [
      'Function calling: schemas and arguments',
      'The ReAct loop: Thought → Action → Observation',
      'A mock tool registry, live',
      'Multi-step tool chains',
    ],
    prerequisites: ['what-is-an-agent'],
    related: ['what-is-an-agent', 'mcp'],
    sources: [
      { title: 'Yao et al. — ReAct', url: 'https://arxiv.org/abs/2210.03629' },
      { title: 'Schick et al. — Toolformer', url: 'https://arxiv.org/abs/2302.04761' },
      { title: 'OpenAI — Function calling guide', url: 'https://platform.openai.com/docs/guides/function-calling' },
    ],
    component: lazy(() => import('./agents/ToolsReact')),
  },
  {
    id: 'memory-planning', section: 'agents', order: 18,
    title: 'Memory & Planning', blurb: 'Working memory, long-term memory, plan-and-execute, reflection.',
    widget: 'agent-loop',
    steps: [
      'Working memory: the context window',
      'Long-term memory: vector stores',
      'Plan-and-execute patterns',
      'Reflection: agents that critique themselves',
    ],
    prerequisites: ['tools-react', 'vector-search'],
    related: ['tools-react', 'a2a-multiagent'],
    sources: [
      { title: 'Park et al. — Generative Agents', url: 'https://arxiv.org/abs/2304.03442' },
      { title: 'Shinn et al. — Reflexion', url: 'https://arxiv.org/abs/2303.11366' },
    ],
    component: lazy(() => import('./agents/MemoryPlanning')),
  },
  {
    id: 'mcp', section: 'agents', order: 19,
    title: 'MCP — Model Context Protocol', blurb: 'The 2026 spec: stateless core, discovery, Tasks, MCP Apps.',
    widget: 'mcp',
    steps: [
      'The N×M problem MCP solves',
      'Hosts, clients, servers',
      'Tools, resources, prompts: the primitives',
      'Discovery and capabilities',
      'The 2026 spec: stateless core and Tasks',
    ],
    prerequisites: ['tools-react'],
    related: ['a2a-multiagent', 'frameworks'],
    sources: [
      { title: 'Model Context Protocol — official docs', url: 'https://modelcontextprotocol.io/introduction' },
      { title: 'MCP TypeScript SDK', url: 'https://github.com/modelcontextprotocol/typescript-sdk' },
    ],
    component: lazy(() => import('./agents/Mcp')),
  },
  {
    id: 'a2a-multiagent', section: 'agents', order: 20,
    title: 'A2A & Multi-Agent Patterns', blurb: 'Agent cards, task lifecycle, supervisor/swarm/handoff topologies.',
    widget: 'a2a',
    steps: [
      'Agent cards: advertising what you can do',
      'The task lifecycle',
      'Supervisor, swarm, and handoff patterns',
      'When multi-agent beats single-agent',
    ],
    prerequisites: ['mcp'],
    related: ['mcp', 'memory-planning'],
    sources: [
      { title: 'A2A protocol — official docs', url: 'https://google.github.io/A2A/' },
      { title: 'Wu et al. — AutoGen', url: 'https://arxiv.org/abs/2308.08155' },
    ],
    component: lazy(() => import('./agents/A2aMultiagent')),
  },
  {
    id: 'frameworks', section: 'agents', order: 21,
    title: 'LangChain vs LangGraph vs ADK', blurb: 'State, nodes, edges, reducers — graphs with cycles for agent control flow.',
    widget: 'agent-graph',
    steps: [
      'LangChain: the chained abstractions',
      'LangGraph: state, nodes, edges',
      'Reducers: merging parallel state',
      'Graphs with cycles: why agents need them',
      'Google ADK and where it fits',
    ],
    prerequisites: ['tools-react'],
    related: ['mcp', 'what-is-an-agent'],
    sources: [
      { title: 'LangGraph — official docs', url: 'https://langchain-ai.github.io/langgraph/' },
      { title: 'LangChain — introduction', url: 'https://python.langchain.com/docs/introduction/' },
      { title: 'Google ADK — documentation', url: 'https://google.github.io/adk-docs/' },
    ],
    component: lazy(() => import('./agents/Frameworks')),
  },
  // ── Evals ────────────────────────────────────────────────────
  {
    id: 'evals', section: 'evals', order: 22,
    title: 'How LLMs Are Evaluated', blurb: 'Perplexity, MMLU/HumanEval/GSM8K, LLM-as-judge, contamination.',
    widget: 'evals',
    steps: [
      'Perplexity: measuring surprise',
      'Benchmarks: MMLU, HumanEval, GSM8K',
      'LLM-as-judge',
      'Contamination and benchmark rot',
    ],
    prerequisites: ['pretraining'],
    related: ['pretraining', 'how-llms-are-trained'],
    sources: [
      { title: 'Hendrycks et al. — MMLU', url: 'https://arxiv.org/abs/2009.03300' },
      { title: 'Liang et al. — HELM', url: 'https://arxiv.org/abs/2209.01946' },
      { title: 'Chen et al. — Evaluating Codex (HumanEval)', url: 'https://arxiv.org/abs/2107.03374' },
    ],
    component: lazy(() => import('./evals/Evals')),
  },
]

export function modulesBySection(sectionId: string): ModuleMeta[] {
  return MODULES.filter((m) => m.section === sectionId).sort((a, b) => a.order - b.order)
}

export function getModule(id: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id)
}

/** Stable display number "section.module" — e.g. retrieval section, 3rd module → "4.3". */
export function moduleNumber(m: ModuleMeta): string {
  const sIdx = SECTIONS.findIndex((s) => s.id === m.section) + 1
  const inSection = modulesBySection(m.section).findIndex((x) => x.id === m.id) + 1
  return `${sIdx}.${inSection}`
}

export function neighbors(id: string): { prev?: ModuleMeta; next?: ModuleMeta } {
  const idx = MODULES.findIndex((m) => m.id === id)
  return {
    prev: idx > 0 ? MODULES[idx - 1] : undefined,
    next: idx >= 0 && idx < MODULES.length - 1 ? MODULES[idx + 1] : undefined,
  }
}

/** Terms for the glossary page */
export const GLOSSARY: { term: string; def: string; module?: string }[] = [
  { term: 'Agent', def: 'A system that perceives, reasons, acts via tools, and observes results in a loop until a goal is met.', module: 'what-is-an-agent' },
  { term: 'A2A', def: 'Agent-to-Agent protocol — standardized agent cards, task delegation, and inter-agent communication.', module: 'a2a-multiagent' },
  { term: 'ANN', def: 'Approximate Nearest Neighbor search — sublinear vector search trading a little recall for a lot of speed.', module: 'vector-search' },
  { term: 'Attention', def: 'Mechanism where each token computes weighted relevance (query·key) to all others and mixes their values.', module: 'attention' },
  { term: 'BM25', def: 'Probabilistic lexical ranking function with term-frequency saturation (k1) and length normalization (b).', module: 'bm25' },
  { term: 'Chinchilla scaling', def: 'Compute-optimal training: scale parameters and data proportionally (~20 tokens per parameter).', module: 'pretraining' },
  { term: 'Context window', def: 'The maximum number of tokens a model can attend to in one inference pass.', module: 'how-llms-work' },
  { term: 'Cosine similarity', def: 'Dot product of normalized vectors — the standard similarity metric for embeddings.', module: 'vector-search' },
  { term: 'Cross-encoder', def: 'A reranker that jointly encodes (query, document) pairs for much better relevance scoring than bi-encoders.', module: 'hybrid-search' },
  { term: 'Dense retrieval', def: 'Semantic search over embedding vectors, as opposed to sparse lexical matching like BM25.', module: 'vector-search' },
  { term: 'DPO', def: 'Direct Preference Optimization — alignment via a closed-form loss on preference pairs, no reward model or RL loop.', module: 'fine-tuning' },
  { term: 'Embedding', def: 'A dense vector representation of text where semantic closeness ≈ geometric closeness.', module: 'tokenization-embeddings' },
  { term: 'Embedding model', def: 'A model (like MiniLM) trained to map sentences into a shared vector space for search/clustering.', module: 'minilm' },
  { term: 'GRPO', def: 'Group Relative Policy Optimization — critic-free RL that normalizes rewards within sampled groups.', module: 'fine-tuning' },
  { term: 'HNSW', def: 'Hierarchical Navigable Small World — layered graph index powering fast ANN search in vector DBs.', module: 'vector-search' },
  { term: 'Hybrid search', def: 'Combining BM25 lexical scores with dense vector scores (often via RRF) for better recall.', module: 'hybrid-search' },
  { term: 'LangGraph', def: 'Orchestration runtime modeling agent workflows as state graphs: nodes, edges, reducers, cycles.', module: 'frameworks' },
  { term: 'LoRA / QLoRA', def: 'Parameter-efficient fine-tuning: train tiny adapter matrices instead of full weights (QLoRA adds 4-bit quantization).', module: 'fine-tuning' },
  { term: 'MCP', def: 'Model Context Protocol — standard protocol connecting agents to tools, resources, and prompts (2026: stateless core, Tasks).', module: 'mcp' },
  { term: 'MiniLM', def: 'Distilled 6-layer transformer encoder producing 384-dim sentence embeddings via mean pooling.', module: 'minilm' },
  { term: 'MoE', def: 'Mixture of Experts — route each token to a few specialized feed-forward experts for huge capacity at sub-linear cost.', module: 'how-llms-are-trained' },
  { term: 'Perplexity', def: 'exp(cross-entropy) — how "surprised" a model is by held-out text. Lower is better.', module: 'evals' },
  { term: 'RAG', def: 'Retrieval-Augmented Generation — retrieve relevant chunks at inference time and inject them into the prompt.', module: 'rag' },
  { term: 'ReAct', def: 'Reasoning + Acting pattern: interleave Thought → Action → Observation until done.', module: 'tools-react' },
  { term: 'Reward hacking', def: 'Policy exploits reward-model errors (verbosity, flattery) to score high without being genuinely good.', module: 'fine-tuning' },
  { term: 'RLHF', def: 'RL from Human Feedback — train a reward model on preferences, optimize the policy against it (usually PPO).', module: 'fine-tuning' },
  { term: 'RRF', def: 'Reciprocal Rank Fusion — combine multiple ranked lists via Σ 1/(k + rank).', module: 'hybrid-search' },
  { term: 'SFT', def: 'Supervised Fine-Tuning — next-token training on curated (instruction, response) pairs; loss on response tokens only.', module: 'fine-tuning' },
  { term: 'Softmax', def: 'Exponentiate and normalize a score vector into a probability distribution.', module: 'attention' },
  { term: 'Temperature', def: 'Divide logits by T before softmax: T→0 sharpens (deterministic), T→∞ flattens (random).', module: 'how-llms-work' },
  { term: 'Token', def: 'Subword unit from a fixed vocabulary — the atoms LLMs read and write.', module: 'tokenization-embeddings' },
  { term: 'Top-k / Top-p', def: 'Sampling filters: keep k highest-probability tokens, or the smallest nucleus whose mass ≥ p.', module: 'next-token-lab' },
]
