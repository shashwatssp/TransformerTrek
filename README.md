# TransformerTrek

**See how AI actually works.**

Interactive, visual explanations of transformers, large language models, retrieval systems, and agents. From tokens and attention to RAG, MCP, and beyond. Step by step, first thing first.

**Live site:** [transformertrek.vercel.app](https://transformertrek.vercel.app)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

---

## Why TransformerTrek

Most AI content is either hand-wavy blog posts or research papers with no bridge between them. TransformerTrek is the bridge, built on four principles:

- **Every widget computes for real.** Nothing is faked: the attention playground multiplies actual matrices, the BM25 lab scores an actual corpus, the perplexity lab builds an actual bigram model, the system prompt lab counts actual tokens. All math runs in your browser.
- **First thing first.** The curriculum is an ordered path with prerequisites, not a blog list. Each module earns its prerequisites and links back to them.
- **Recall is built in.** Every module ends with a knowledge-check quiz, and a Rapid review page turns the whole trek into flashcards: read the question, say your answer out loud, then reveal a tight model answer. Recalling beats rereading, and it is the fastest way to find out what you actually know.
- **Private by default.** No accounts, no servers, no tracking, nothing you type leaves your device.

## The curriculum

33 modules across 7 sections. Every module pairs step-by-step prose with live widgets, real citations, prerequisites, related modules, and key takeaways.

### 1. Foundations
*Start here, what LLMs are and how they behave.*

- **What is an LLM?** Tokens, next-token prediction, and why probability is the whole game.
- **How does an LLM work?** The inference loop, context windows, temperature and sampling.
- **Why LLMs Hallucinate** Confident nonsense is the default failure mode, why it happens and the mitigation ladder that works.
- **Prompting Patterns** Few-shot examples, chain-of-thought, structured output, and evaluating prompt changes like code.

### 2. Transformers
*Tokens, embeddings, attention, and the architecture that changed everything.*

- **Tokenization & Embeddings** How text becomes numbers, subwords, vocab IDs, dense vectors.
- **Attention, step by step** Q, K, V, scores, masking, softmax, outputs, every number visible.
- **Transformer Architecture** Embedding, then N blocks (attention + MLP), then output. Encoder vs decoder.
- **Next-Token Prediction Lab** Temperature, top-k, top-p: shape the distribution yourself.

### 3. Training LLMs
*Pretraining, scaling laws, post-training, and how different LLMs are made.*

- **Pretraining** Trillions of tokens, one objective: predict the next token.
- **How Different LLMs Are Trained** GPT vs BERT vs T5 objectives; dense vs MoE; Llama 3 and DeepSeek recipes.
- **Fine-tuning & Alignment** SFT, LoRA/QLoRA, RLHF/PPO, DPO, GRPO, and reward hacking.
- **Open-Source Models, Compared** Llama, Mistral, Qwen, Gemma, DeepSeek, Phi: training recipes, licenses, and how to pick.

### 4. Retrieval & Search
*RAG, vector search, BM25, MiniLM, embedding models, vector databases, and hybrid retrieval.*

- **What is RAG?** The 7-stage pipeline that grounds LLMs in your data.
- **RAG vs Fine-tuning** When to retrieve, when to train, when to combine, side by side.
- **Vector & Semantic Search** Embedding spaces, cosine similarity, ANN and HNSW graphs.
- **How BM25 Works** Term saturation, IDF, length normalization, with live k1/b sliders.
- **MiniLM Inside-Out** Distillation, 6 layers, mean pooling, and contrastive training.
- **Hybrid Search & Reranking** BM25 + dense fusion (RRF) and cross-encoder rerankers.
- **Embedding Models, Compared** MiniLM to Qwen3 and Voyage: dims, MTEB, cost, context, Matryoshka, and how to pick.
- **Vector Databases, Compared** Pinecone, Qdrant, Weaviate, Milvus, pgvector: indexes, filtering, hosting, and how to choose.

### 5. Agents & Protocols
*Agents, tools, memory, MCP, A2A, LangChain, LangGraph, ADK.*

- **What is an Agent?** Perceive, reason, act, observe: the loop that changes everything.
- **Tool Calling & ReAct** Function calling, the ReAct loop, and mock tool registries.
- **Memory & Planning** Working memory, long-term memory, plan-and-execute, reflection.
- **MCP, Model Context Protocol** The 2026 spec: stateless core, discovery, Tasks, MCP Apps.
- **A2A & Multi-Agent Patterns** Agent cards, task lifecycle, supervisor/swarm/handoff topologies.
- **LangChain vs LangGraph vs ADK** State, nodes, edges, reducers, graphs with cycles for agent control flow.
- **Build Your Own Agent** The loop, the system prompt, tool design, memory, MCP authoring, and evaluation.
- **Prompt Injection & Agent Security** Direct and indirect injection, least-privilege tools, human approval, and red-teaming your own agent.

### 6. System Design
*Real products read as architecture diagrams, plus a production agent designed end to end.*

- **Case Studies: How Agent Products Work** Perplexity, ChatGPT, Claude, Cursor, Windsurf, and Devin, read as architecture diagrams.
- **System Design: Agentic Systems** Design a production agent end to end: requirements, back-of-envelope math, architecture, failure modes, scaling.
- **Serving & Inference** Prefill vs decode, the KV cache, batching, quantization, and speculative decoding: why tokens cost what they cost.

### 7. Evaluations
*How we measure LLM quality, from perplexity to eval tooling platforms.*

- **How LLMs Are Evaluated** Perplexity, MMLU/HumanEval/GSM8K, LLM-as-judge, contamination, and the tooling platforms.
- **Measuring Retrieval Quality** Recall@k, MRR, nDCG, and faithfulness: why generation metrics hide retrieval failures, implemented in TypeScript.

## Beyond the modules

- **Playground** Every interactive demo on one page, free of narrative. Each card deep-links straight into the widget inside its module.
- **Visualizations** The full gallery, grouped by theme, in reading order, with a one-line explanation and a jump into the module for depth.
- **Rapid review** Say-it-out-loud flashcards for the whole trek (72 cards), with section filters, shuffle, and per-module entry points. Answers are tight, speakable, and backed by short TypeScript snippets where code helps.
- **Knowledge checks** A three-question quiz at the end of every module: instant right/wrong feedback, a one-line explanation, a score, and a retry.
- **Glossary** Every term defined in one line, filterable as you type, each linked to the module that explains it.
- **Reading progress** Mark modules as read, resume where you left off, and watch per-section progress update live. Stored only on your device.

## Privacy and security

TransformerTrek is safe to open anywhere, including a company laptop:

- **No accounts, no cookies, no analytics, no ads, no trackers.**
- **No API calls.** The app never sends your input anywhere; every computation runs locally in your browser.
- The only external requests a visitor's browser makes are to the hosting CDN and to Google Fonts (Inter and JetBrains Mono).
- The only browser storage used is `localStorage` for your theme preference and reading progress, readable only by this site.

## Tech stack

- [React 19](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/) in strict mode
- [Vite](https://vite.dev/) for the build toolchain, with per-module code splitting
- [Tailwind CSS v4](https://tailwindcss.com/) with a custom `@theme` token system (dark and light)
- [Motion](https://motion.dev/) for animation, respecting `prefers-reduced-motion`
- [@xyflow/react](https://reactflow.dev/) for node graphs, [Recharts](https://recharts.org/) for charts
- A custom history-based router and `useSyncExternalStore` stores: no router or state-management dependencies

## Project structure

```
src/
  App.tsx                     # routes, Home, Glossary, Playground, 404, page titles
  router.tsx                  # custom history router: clean paths, SPA link interception,
                              # legacy #/ redirects, scroll management
  main.tsx                    # entry point
  modules/
    registry.ts               # the curriculum: 33 modules, sections, prerequisites, sources
    foundations/              # module content components (one file per module)
    transformer/
    llm/
    retrieval/
    agents/
    system-design/
    evals/
  widgets/                    # interactive visualizations, grouped by track
  components/
    layout/                   # TopNav, Sidebar, ModuleLayout (the module page shell)
    ui/                       # design-system primitives (Prose, CodeBlock, WidgetFrame, ...)
    RapidReview.tsx           # flashcard player
    Quiz.tsx                  # module-end knowledge checks
    VisualizationsGallery.tsx
  lib/
    progress.ts               # reactive localStorage progress store
    quizzes.ts                # question bank: 3 MCQs per module
    review.ts                 # rapid review flashcard bank
    theme.ts                  # dark/light theme store
```

## Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 20.19 or newer and npm.

```bash
# Clone and install
git clone https://github.com/shashwatssp/TransformerTrek.git
cd TransformerTrek
npm install

# Start the dev server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Preview the production build locally
npm run preview
```

There is nothing to configure: no environment variables, no API keys, no backend.

## Deployment

The site deploys as a static build on any static host. On [Vercel](https://vercel.com/), the included `vercel.json` rewrites all paths to `index.html`, so deep links like `/modules/attention` and `/review?module=rag` work on refresh and direct load. Legacy `#/...` links are converted to clean paths on load, so old bookmarks keep working.

## Under the hood

A few implementation notes for the curious:

- **Routing.** A dependency-free router built on the History API: clean URLs, delegated click interception for internal links, `popstate` handling, instant (non-smooth) scroll-to-top on route change, and `?demo` deep links that scroll straight to a module's widget.
- **State.** Reading progress, theme, and navigation are tiny reactive stores built on `useSyncExternalStore`; they sync across tabs via the `storage` event.
- **Loading.** Each module is a lazy-loaded chunk behind a Suspense skeleton, so navigation commits instantly even on slow mobile networks.
- **Layout.** Mobile-first: no horizontal scrolling anywhere, including inside expanded full-screen widgets (`dvh` sizing, safe-area insets, wrapping tables and tabs, fluid charts).
- **Motion.** Entrance animations are opacity-only (transforms would break `position: fixed` widget expansion), and everything honors reduced-motion settings.

## Contributing

Found a bug, a fuzzy explanation, or a broken link? Pull requests and issues are welcome. The bar for content changes: every claim ties to a real source, and every widget must genuinely compute what it shows.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what is shipped and what is next: full-text search, real in-browser embeddings, guided paths, and more.

## License

[MIT](LICENSE)
