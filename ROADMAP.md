# TransformerTrek Roadmap

Last updated: September 2026

TransformerTrek is an interactive, client-side application for learning how transformers, LLMs, retrieval systems, and agents actually work. Every explanation pairs prose with a live widget: nothing is faked, all math runs in the browser, and there are no accounts or servers.

## Where we are

The core curriculum is in place: 34 modules across 7 sections (Foundations, Transformers, Training, Retrieval & Search, Agents & Protocols, System Design, Evals), each with step-by-step prose, real citations, prerequisites, and key takeaways. The Transformers section now opens with The Transformer, Mapped: the complete architecture as one clickable diagram (decoder-only and encoder-decoder views) with real tensor shapes.

Shipped highlights:

- 20+ interactive widgets: tokenizer, attention playground, architecture flow, next-token sampler, training-loop simulator, MoE routing lab, RAG pipeline, BM25 lab, HNSW walk, hybrid fusion, agent loop, MCP flow, A2A lifecycle, agent graph builder, benchmark charts, and more.
- A Visualizations gallery collecting every widget on one page, grouped by theme.
- A Playground page listing every demo as a one-tap jump that deep-links straight into the widget inside its module.
- Topical deep dives: case studies of real agent products (Perplexity, ChatGPT, Claude, Cursor, Windsurf, Devin), a build-your-own-agent guide with a system prompt lab, and an honest comparison of open-weight model families.
- The questions engineers actually get asked, now first-class modules: why LLMs hallucinate, prompting patterns, serving and inference (KV cache, batching, quantization, speculative decoding), measuring retrieval quality (recall@k, MRR, nDCG in TypeScript), and prompt injection and agent security.
- Knowledge checks: a three-question quiz at the end of every module, plus a Rapid review page of say-it-out-loud flashcards with tight model answers and short TypeScript snippets.
- Clean-path URLs (/modules/attention) with legacy hash links redirected on load.
- Dark and light themes, mobile-first responsive layout, reduced-motion support, keyboard-friendly widgets, and reading progress saved locally.

## Now (next 4 to 6 weeks)

- Full-text search across modules, glossary terms, and widget titles.
- Copy quality pass: consistent voice, sentence-level polish, and a style guide so new modules stay consistent.
- Accessibility audit: contrast checks in both themes, screen-reader labels on every widget control, and focus order cleanup.
- Widget captions: every visualization gets a one-line "what am I looking at" summary for readers who land from the gallery.

## Next (1 to 3 months)

- Real embeddings in the browser: run an actual MiniLM-class model via ONNX in the Embedding Explorer so similarity scores come from a trained model instead of a toy space.
- Progress export and import: let readers move their reading progress between devices without accounts.
- Shareable widget links: deep links that open a widget pre-set to an interesting state (a chosen attention head, a specific query, a tuned k1/b pair).
- Guided paths: curated routes through the material, such as "RAG engineer in a weekend" or "Agent fundamentals", each pairing modules with exercises.
- More case studies: coding agents, customer-support agents, and a failure-story teardown of a real production incident.

## Later (3 to 6 months)

- Optional cloud sync and profiles, with local-first defaults preserved.
- Community contributions: a lightweight pipeline for proposing new modules, widgets, and corrections.
- Notebook mode: combine widgets, personal notes, and exported summaries into a study artifact readers can download.
- New tracks: vision transformers, diffusion models, and a deeper reinforcement learning track covering RLHF through RLVR end to end.
- Embeds: standalone widget embeds for external blogs and courseware, with a sandboxed bundle.

## Principles

- Every claim ties to a source; every widget computes for real.
- Client-side first: no required accounts, no tracking, works offline after first load.
- First thing first: each module earns its prerequisites and links back to them.
- Accessible by default: both themes, every control keyboard-reachable, motion respects user settings.
