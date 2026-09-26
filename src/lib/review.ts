/**
 * Rapid review bank: flashcard-style recall practice keyed by module id.
 * Each card is a question to answer OUT LOUD before revealing a tight,
 * ~30-second model answer. Some cards add a small TypeScript snippet,
 * because more product engineers are asked these questions in code.
 * Purely static and local: no AI, no network.
 */

export type ReviewCard = {
  /** The question, phrased the way an interviewer or colleague would ask it. */
  q: string
  /** A tight, speakable model answer. */
  a: string
  /** Optional short TypeScript snippet that backs the answer. */
  code?: string
}

export const REVIEW: Record<string, ReviewCard[]> = {
  // ── Foundations ──────────────────────────────────────────────
  'what-is-an-llm': [
    {
      q: 'Explain what an LLM actually does, in under a minute.',
      a: 'An LLM reads text as tokens and, at each step, scores every token in its vocabulary as a candidate for what comes next. Softmax turns those scores into probabilities, sampling picks one, the output is appended, and the loop repeats. Everything else (chat, code, agents) is engineering around that next-token loop. Scale is what turned it from autocomplete into general capability.',
    },
    {
      q: 'Why do tokenizers use subwords instead of whole words?',
      a: 'A fixed vocabulary cannot list every word in every language, but a few thousand reusable subword pieces (built by byte-pair encoding) can spell anything, including typos and brand-new words. The tradeoff: rare words shatter into pieces that each carry less meaning.',
    },
  ],
  'how-llms-work': [
    {
      q: 'Walk me through the inference loop of an LLM.',
      a: 'Tokenize the prompt, run one forward pass to get logits over the vocabulary, softmax into probabilities, sample one token, append it, repeat until a stop condition. The prompt is processed once (prefill); each output token is one decode step. The context window bounds everything the loop can attend to.',
    },
    {
      q: 'What do temperature, top-k, and top-p actually change?',
      a: 'They reshape the next-token distribution before sampling; none of them change the model. Temperature divides the logits: near zero is near-deterministic, high is near-random. Top-k keeps the k highest-probability tokens; top-p keeps the smallest set whose probability mass reaches p. Low randomness for factual tasks, more for creative ones.',
    },
  ],
  'tokenization-embeddings': [
    {
      q: 'Explain byte-pair encoding.',
      a: 'Start from characters, then repeatedly merge the most frequent adjacent pair into a new token until you reach the target vocabulary size. Common words become single tokens; rare words become a few reusable pieces. It is why LLMs handle typos and code, and why they miscount letters: they see pieces, not characters.',
    },
    {
      q: 'What is an embedding, and why does semantic search depend on it?',
      a: 'A dense vector learned so that similar meanings land near each other: geometric closeness stands in for semantic closeness. You compare vectors with cosine similarity instead of comparing strings, which is what makes searching by meaning possible at all.',
    },
  ],
  'attention': [
    {
      q: 'Explain self-attention. What are Q, K, and V?',
      a: 'Every token projects its embedding into a Query (what it is looking for), a Key (what it offers), and a Value (what it passes along). Score each query against every key with a dot product, scale by the square root of the head dimension, softmax into weights, and take the weighted sum of values. Each token leaves with a context-aware representation.',
    },
    {
      q: 'Why scale attention scores, and what does the causal mask do?',
      a: 'Dot products grow with dimension, which saturates softmax and kills gradients; dividing by sqrt(d_k) keeps variance stable. The causal mask sets scores for future positions to negative infinity, so a decoder can only attend to the past. That constraint is what makes next-token training valid.',
    },
  ],
  'architecture': [
    {
      q: 'What is inside one transformer block?',
      a: 'Multi-head attention (tokens exchange information) followed by an MLP applied per token, each wrapped with a residual connection and LayerNorm. The residual path gives gradients a direct route, which is what makes very deep stacks trainable. Stack N blocks and end with a projection onto the vocabulary.',
    },
    {
      q: 'Compare encoder-only, decoder-only, and encoder-decoder models.',
      a: 'Encoder-only (BERT) sees both sides: bidirectional, great for classification and embeddings. Decoder-only (GPT, Llama) is causal and predicts the next token: the standard for chat and generation. Encoder-decoder (T5) reads the full input and generates the output: strong for translation and summarization. Modern chat LLMs are decoder-only.',
    },
  ],
  'next-token-lab': [
    {
      q: 'Greedy decoding vs sampling: when would you use each?',
      a: 'Greedy picks the highest-probability token every step: deterministic, safe, repetitive. Sampling draws from the distribution: creative, noisier. The production default is a mild temperature with top-p around 0.9; structured extraction or SQL wants temperature near zero.',
    },
    {
      q: 'The model repeats the same phrase over and over. What do you do?',
      a: 'Repetition is the signature of a too-sharp distribution. Raise temperature a little, tighten top-p or top-k, add a frequency penalty if the API has one, and check the prompt for accidental loops. Fix sampling before blaming the model.',
    },
  ],
  'pretraining': [
    {
      q: 'What is pretraining, and what is the objective?',
      a: 'Self-supervised next-token prediction over trillions of tokens: no labels, the text is its own supervision. You minimize cross-entropy on the next token, so the honest description of what pretraining learns is "the likelihood of internet text".',
    },
    {
      q: 'What are scaling laws, and what did Chinchilla change?',
      a: 'Loss falls predictably as you scale parameters, data, and compute. Chinchilla showed earlier models were undertrained on data: for a fixed compute budget, scale parameters and tokens roughly proportionally, about 20 tokens per parameter. It reframed "bigger" into "bigger and more data".',
    },
  ],
  'how-llms-are-trained': [
    {
      q: 'Compare the GPT, BERT, and T5 training objectives.',
      a: 'GPT: causal next-token prediction. BERT: masked language modeling, predict hidden tokens while seeing both sides. T5: span corruption, corrupt spans and reconstruct them. The objective shapes the strengths: generation, understanding, or structured seq2seq.',
    },
    {
      q: 'What is Mixture-of-Experts and why does it matter?',
      a: 'MoE replaces the single feed-forward layer with many expert MLPs and routes each token to a few of them. You get a huge parameter count while paying only for the active experts per token: capacity without proportional compute. Mixtral and DeepSeek are the canonical examples.',
    },
  ],
  'fine-tuning': [
    {
      q: 'Explain the RLHF pipeline end to end.',
      a: 'Three stages: SFT on curated demonstrations to teach format and behavior; train a reward model on human preference rankings between outputs; run RL (usually PPO) to maximize reward with a KL penalty keeping the policy near the SFT model. It aligns behavior; it does not inject knowledge.',
    },
    {
      q: 'DPO vs PPO, and what is LoRA?',
      a: 'DPO skips the reward model and the RL loop: a closed-form loss on preference pairs optimizes the policy directly, simpler and more stable but offline. LoRA freezes the base weights and trains tiny low-rank adapters, often under 1% of parameters; QLoRA adds 4-bit quantization of the frozen base so a big model fits on one GPU.',
    },
  ],
  'open-source-models': [
    {
      q: 'What do "open weights" mean, and what else should you check?',
      a: 'The trained parameters are downloadable: you can run, fine-tune, and self-host. Check the license (commercial terms vary), the size variants, context length, and measured quality on your task. Open weights do not include the training data or the compute behind them.',
    },
    {
      q: 'When would you self-host an open model instead of calling an API?',
      a: 'When data cannot leave your perimeter, when your per-token volume beats API pricing, or when you need fine-tuned behavior offline. You take on serving, scaling, and updates. Start with a quantized build via Ollama or vLLM, never a from-scratch pretrain.',
    },
  ],
  'rag': [
    {
      q: 'Explain the RAG pipeline end to end.',
      a: 'Index time: ingest, chunk, embed, store vectors. Query time: embed the question, retrieve top-k similar chunks, optionally rerank, assemble them into the prompt, generate a grounded answer with citations. Knowledge lives in an index you control, so freshness and access control never touch the weights.',
    },
    {
      q: 'Your RAG system gives wrong answers. How do you debug it?',
      a: 'Localize before you fix: was the right chunk retrieved at all? If not, the problem is retrieval: chunking, embeddings, hybrid search, reranking. If it was retrieved but ignored, the problem is generation: grounding instructions and citations. Log retrieved chunks per query so you can tell the two apart.',
    },
  ],
  'rag-vs-fine-tuning': [
    {
      q: 'When do you choose RAG, fine-tuning, or both?',
      a: 'RAG for knowledge that changes, is private, or needs citations: update the index, not the weights. Fine-tuning for behavior: format, style, domain language. Both when you need grounded facts and consistent style. Default order: prompt first, RAG second, fine-tune last.',
    },
    {
      q: 'Is fine-tuning how you add new facts to a model?',
      a: 'No, and saying otherwise is the classic mistake. Fine-tuning shapes behavior and format; it is a poor, unauditable place to store facts that change. Fresh or proprietary knowledge belongs in a retriever. Fine-tune only after retrieval is measured and the remaining gap is behavioral.',
    },
  ],
  'vector-search': [
    {
      q: 'What is cosine similarity and why is it the default for embeddings?',
      a: 'The dot product of two normalized vectors: the cosine of the angle between them. It ignores magnitude and measures direction, so it captures meaning rather than length: one means same direction, zero means unrelated. Normalize once at write time and comparisons stay cheap.',
      code: `function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}`,
    },
    {
      q: 'Why do we need approximate nearest neighbor search like HNSW?',
      a: 'Exact search compares the query to every vector: linear per query, dead at scale. HNSW builds a layered small-world graph so the walk touches a logarithmic slice of the corpus. You trade a little recall for orders-of-magnitude speed, tunable with the ef search parameters.',
    },
  ],
  'bm25': [
    {
      q: 'Explain how BM25 scores a document.',
      a: 'TF-IDF with two refinements: term-frequency saturation via k1, so repeating a keyword stops paying, and length normalization via b, so long documents do not win by being long. IDF weights rare terms higher. It is purely lexical, which is exactly why it pairs well with dense search.',
    },
    {
      q: 'Why does BM25 still matter in the embedding era?',
      a: 'It is exact where embeddings are fuzzy: error codes, part numbers, names, rare terms. Dense retrieval misses exact tokens; BM25 misses paraphrases. Hybrid systems keep both and fuse the rankings. BM25 is cheap, interpretable, and requires no training.',
    },
  ],
  'minilm': [
    {
      q: 'How does a 6-layer MiniLM produce one 384-dim vector per sentence?',
      a: 'Distillation trains the small student to match a larger teacher. It encodes the tokens, then mean-pools across positions into a single vector. Contrastive training pulls matching sentences together and pushes mismatches apart, shaping the space for similarity search.',
    },
    {
      q: 'What is knowledge distillation?',
      a: 'Training a small student model to mimic a large teacher, often by matching the teacher\'s soft probability distributions rather than hard labels. The student keeps most of the quality at a fraction of the size and latency, which is how MiniLM-class models run on laptops.',
    },
  ],
  'hybrid-search': [
    {
      q: 'Explain Reciprocal Rank Fusion.',
      a: 'For each ranked list, every document earns 1/(k + rank) with k around 60, and you sum across lists. It uses ranks only, so incomparable scores (BM25 vs cosine) never need calibrating. Documents that do decently on every list float to the top.',
      code: `function rrf(rankings: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>()
  for (const ranking of rankings)
    ranking.forEach((docId, i) =>
      scores.set(docId, (scores.get(docId) ?? 0) + 1 / (k + i + 1)))
  return scores
}`,
    },
    {
      q: 'Why rerank with a cross-encoder instead of retrieving with one?',
      a: 'A bi-encoder embeds query and document separately: precomputable, fast, coarse. A cross-encoder reads them together and scores relevance with full token interaction: much more accurate, but you must run it per pair. So retrieve top-100 fast with a bi-encoder, then rerank down to top-5.',
    },
  ],
  'embedding-models': [
    {
      q: 'How do you choose an embedding model for production?',
      a: 'Shortlist with MTEB, then measure recall@k on your own labeled queries: the aggregate leaderboard hides per-task differences. Check dimension (the storage bill), context length, cost, languages, and license. Matryoshka models let you truncate vectors later to trade storage for recall.',
    },
    {
      q: 'What are Matryoshka embeddings?',
      a: 'Vectors trained so every prefix stays useful. Embed once at full dimension, keep 256 of 1536 dimensions for the fast first-pass search, and rerank the survivors with full vectors: one model, many storage tiers, no re-embedding when you change your mind.',
    },
  ],
  'vector-databases': [
    {
      q: 'What does a vector database add over storing floats in Postgres?',
      a: 'A maintained ANN index (HNSW, IVF, DiskANN), CRUD without rebuilding the world, metadata filtering that cooperates with the graph, hybrid retrieval, replication, backups. Below roughly a million vectors, brute force or pgvector inside your existing Postgres is fine.',
    },
    {
      q: 'Why is filtered vector search tricky?',
      a: 'Pre-filtering can starve the ANN graph so the walk never reaches valid neighbors; post-filtering can return too few results. Good engines do filterable HNSW: the graph walk respects the predicate as it goes. Test filtering at realistic selectivity; that is where recall silently dies.',
    },
  ],
  'what-is-an-agent': [
    {
      q: 'What makes a system an agent rather than a chatbot?',
      a: 'A loop: perceive, reason, act with tools, observe results, repeat until the goal is met. The model decides the next step at runtime instead of following a script, and tools are the unlock: current knowledge plus real actions. If you can pre-write all the steps, build a workflow instead.',
    },
    {
      q: 'When should you NOT build an agent?',
      a: 'When a fixed workflow solves the task reliably. Agents multiply latency, cost, and failure surface with every turn. Use the simplest thing that works: one call, then a chain, then an agent only when the model genuinely must choose the path.',
    },
  ],
  'tools-react': [
    {
      q: 'Walk me through function calling. Who executes the tool?',
      a: 'You give the model tool schemas: name, description, JSON Schema parameters. The model emits a structured call; your code validates the arguments, executes the real function, and appends the result as an observation. The model never runs anything: the host is the security boundary.',
      code: `for (let step = 0; step < MAX_STEPS; step++) {
  const res = await llm(messages, tools)          // may emit a tool call
  if (!res.toolCall) return res.text              // final answer
  const obs = await execute(res.toolCall)         // YOUR code runs it
  messages.append(res.toolCall, obs)              // observation -> context
}`,
    },
    {
      q: 'What is the ReAct pattern?',
      a: 'Interleave Thought, Action, and Observation in the transcript until a final answer. Writing the reasoning out loud lets the model notice gaps before acting and gives you a readable trace for debugging. It is the textual loop most agent frameworks still use.',
    },
  ],
  'memory-planning': [
    {
      q: 'How does an agent get long-term memory?',
      a: 'A vector store of the agent\'s own notes and outcomes: write durable facts, embed them, retrieve by similarity into context when a new task starts. It is RAG applied to memory: it changes what is in the prompt, never the weights. Working memory is just the context window; compact it or costs grow every turn.',
    },
    {
      q: 'What is plan-and-execute, and where does reflection fit?',
      a: 'A planner call turns the goal into steps; an executor runs them one at a time. A failed step inserts a repair step instead of restarting: replanning. Reflection adds a critic pass that turns failures into stored lessons for the next attempt: learning with zero weight updates.',
    },
  ],
  'mcp': [
    {
      q: 'What problem does MCP solve, and how?',
      a: 'The N-times-M problem: N apps times M tools of custom glue. MCP standardizes one protocol: apps implement the client once, tool providers implement the server once. It defines the primitives (tools, resources, prompts) plus discovery, so servers plug into any compliant host.',
    },
    {
      q: 'In MCP, what are hosts, clients, and servers?',
      a: 'The host is the application (an IDE or chat app) and spawns one client per server connection. Servers are external processes exposing tools, resources, and prompts. The boundaries are the security model: the host decides which servers exist and what they may touch.',
    },
  ],
  'a2a-multiagent': [
    {
      q: 'What is A2A, and what is an agent card?',
      a: 'The Agent-to-Agent protocol: how agents discover and delegate to each other across teams and frameworks. The agent card is a JSON document at a well-known URL advertising skills, endpoints, and capabilities: discovery without a central registry. Tasks model delegation, with states like input-required and artifacts for results.',
    },
    {
      q: 'Compare supervisor, swarm, and hierarchical multi-agent topologies.',
      a: 'Supervisor: one orchestrator delegates to specialists; auditable and easy to reason about, with a bottleneck risk. Swarm/handoff: peers transfer control directly; flexible but harder to trace. Hierarchical: supervisors of supervisors; scales furthest with the most moving parts. Default to one agent unless a real force binds.',
    },
  ],
  'frameworks': [
    {
      q: 'LangChain vs LangGraph: what does each give you?',
      a: 'LangChain is the parts bin: prompts, models, and parsers composed into fixed pipelines (LCEL). LangGraph is the runtime: a shared state object, function nodes, edges including conditional ones, and reducers for parallel writes. Chains cannot loop; graphs can, and cycles are what make agents self-correcting.',
    },
    {
      q: 'Why do agent runtimes need cycles and reducers?',
      a: 'Acting on observations means retrying: a failed tool result must route back to an earlier node, which a DAG cannot express. Budget the cycles with step limits. Reducers define how parallel branch updates merge (append for lists and counters, replace otherwise) so concurrent nodes stay deterministic.',
    },
  ],
  'agent-case-studies': [
    {
      q: 'How does Perplexity work at an architecture level?',
      a: 'Search-first RAG: rewrite the query, search multiple sources, rerank, and generate an answer with inline citations. Retrieval quality is the product; the model is a component. It is the clearest example of RAG as a whole system rather than a feature.',
    },
    {
      q: 'What is the common architecture across agent products like Cursor, Devin, and ChatGPT?',
      a: 'Ground everything in retrieval (Cursor indexes your repo), maintain state over long horizons (Devin\'s planner-executor loop), and grow tools around the conversation (ChatGPT). Tool schemas as the interface, and evals on real tasks. The products are compositions of the patterns in this track.',
    },
  ],
  'build-an-agent': [
    {
      q: 'What do you do on day one of building an agent?',
      a: 'The simplest loop that works: one model, a few tools with clear schemas, a written system prompt treated like code, and explicit success criteria. Every addition (memory, sub-agents, more tools) must trace to a measured failure. Evaluate like a product: task datasets, traced tool calls, automated scoring on every change.',
    },
    {
      q: 'How should you write a system prompt?',
      a: 'Like an engineer: explicit role, rules, tool-use policy, and failure handling, versioned and reviewed. The system prompt is the agent\'s spec; vague prompts produce vague agents. Prefer a few illustrative examples over paragraphs of adjectives.',
    },
  ],
  'agent-system-design': [
    {
      q: 'How do you approach designing a production agent system?',
      a: 'Requirements first, then back-of-envelope math: users, tokens per task, cost, latency budget. Then the architecture: models per step, tools, memory, queues. Failure modes are first-class: timeouts, retry budgets, human fallbacks, audit logs. Scaling levers (caching, parallel tools, cheap models for easy steps) come last.',
    },
    {
      q: 'Name three failure modes you would design for in an agent backend.',
      a: 'Tool calls failing: retries with budgets and clear error observations. The model going astray: guardrails, step budgets, human approval for irreversible actions. Load: queueing, streaming, rate limits, because LLM backends are queueing systems. Design detection and containment, not just the happy path.',
    },
  ],
  'evals': [
    {
      q: 'What is perplexity, and what is it good and bad for?',
      a: 'exp(cross-entropy) on held-out text: how surprised the model is, effectively the number of equally likely continuations per token. Lower is better, and it is a great pretraining signal. It says nothing about helpfulness, truthfulness, or task quality: that is what benchmarks and task evals are for.',
    },
    {
      q: 'What is LLM-as-judge, and what are its known biases?',
      a: 'A strong model scores outputs against a rubric: cheap, scalable, correlates well with humans. Known biases from the MT-Bench work: verbosity (longer looks better), position (first-listed wins more), self-preference. Calibrate against human labels, randomize order, blind identities, and remember the judge needs its own eval.',
    },
    {
      q: 'What is benchmark contamination?',
      a: 'Test questions leaking into training data (both are scraped from the same web), so scores measure memorization. GSM1k rebuilt GSM8K-style problems from scratch and watched models collapse. Defenses: private held-out sets, dynamic or executable evals, and re-benchmarking anything you did not measure yourself.',
    },
  ],
  'why-llms-hallucinate': [
    {
      q: 'Why do LLMs hallucinate at all?',
      a: 'Because the objective is plausibility, not truth: a next-token model produces fluent continuations whether or not it knows the facts, and binary-graded evals reward guessing over admitting uncertainty. Confident fabrication is rational behavior under that training. It is the default failure mode, not a patchable bug.',
    },
    {
      q: 'How do you reduce hallucinations in a product?',
      a: 'A ladder: ground with RAG so facts come from an index; force citations; let the system abstain when retrieval is weak; verify with a faithfulness check; keep humans on high-stakes outputs. And never use temperature to fix facts: temperature changes randomness, not accuracy.',
    },
    {
      q: 'Does temperature make a model lie more?',
      a: 'No. Temperature reshapes the sampling distribution: it changes randomness, not correctness. Low temperature makes the model deterministic, not truthful; it will repeat the same wrong answer confidently. Truthfulness comes from grounding, abstention design, and measurement.',
    },
  ],
  'prompting-patterns': [
    {
      q: 'Few-shot prompting: what is it and when do you use it?',
      a: 'Put a handful of input-to-output examples in the prompt and the model imitates the pattern: format, tone, edge-case handling, with no weight updates. Use it when output format and edge cases matter. Watch two costs: tokens paid on every call, and over-imitation if the examples are too uniform.',
    },
    {
      q: 'What is chain-of-thought, and when does it help?',
      a: 'Ask the model to reason through steps before answering. Intermediate tokens become context for later predictions: more compute per answer. It measurably helps on math, logic, and multi-step tasks; reasoning models do it natively. It costs tokens and latency and can hurt on easy tasks, so measure rather than assume.',
    },
    {
      q: 'How do you get reliable JSON out of an LLM?',
      a: 'Three layers: constrain with a schema at decode time (response format / JSON Schema), validate the parsed value against what your code needs, and retry once with the validation error appended. The schema is the contract; the retry path is its enforcement.',
      code: `const res = await llm({ schema: ResponseSchema, input })  // schema-constrained
const data = validate(JSON.parse(res.text))              // typed check
return data ?? retryWithError(res.text)                  // one retry, then fallback`,
    },
  ],
  'serving-inference': [
    {
      q: 'Prefill vs decode: why is the first token slower than the rest?',
      a: 'Prefill processes the entire prompt in one parallel pass: compute-bound, and it produces the first token. Decode then generates one token at a time, reading the KV cache: memory-bandwidth-bound. TTFT is the prefill bill and grows with prompt length; every later token is a decode step.',
    },
    {
      q: 'What is the KV cache, and why does long context eat RAM?',
      a: 'During prefill the stack stores every layer\'s keys and values so decode never recomputes the past. Cache size scales as layers x KV-heads x head-dim x 2 x bytes x tokens, per sequence: a 70B-class model at 128K tokens holds about 20 GiB for one user. PagedAttention (vLLM) manages it like virtual memory to cut waste.',
      code: `const kvBytes = (layers: number, kvHeads: number, headDim: number,
                 tokens: number, bytesPerElem = 2) =>
  layers * kvHeads * headDim * 2 * bytesPerElem * tokens  // K and V: x2`,
    },
    {
      q: 'What are quantization and speculative decoding?',
      a: 'Quantization stores weights (and the KV cache) in INT8 or 4-bit instead of 16-bit: less memory, faster decode in a memory-bound workload, with a small quality cost you must measure. Speculative decoding uses a small draft model to propose tokens that the big model verifies in one pass: 2-3x throughput with the same output distribution.',
    },
  ],
  'retrieval-evals': [
    {
      q: 'Why evaluate retrieval separately from generation?',
      a: 'Because if the right chunk never reached the prompt, no generator can save you, and end-to-end scores blame the wrong component. Label a small golden set of queries, compute retrieval metrics on it, and localize failures: retrieval miss versus retrieved-but-ignored.',
    },
    {
      q: 'Define recall@k, MRR, and nDCG.',
      a: 'Recall@k: did a relevant document make the top k (your coverage ceiling). MRR: the mean of 1 divided by the rank of the first relevant hit (how high the answer sits). nDCG: position-discounted gain over graded relevance (order and degree both matter). Recall for coverage, MRR for single-answer lookups, nDCG for ranking quality.',
      code: `const recallAtK = (ranked: string[], relevant: Set<string>, k: number) =>
  ranked.slice(0, k).some((d) => relevant.has(d)) ? 1 : 0`,
    },
    {
      q: 'You have no labeled data. How do you bootstrap an eval set?',
      a: 'Collect 30-50 real queries from logs or teammates, hand-label the relevant documents (about an hour), and version the set. Run recall@k on every retrieval change and LLM-judged faithfulness on the answers. A tiny, honest, private set beats any public leaderboard for your system.',
    },
  ],
  'agent-security': [
    {
      q: 'What is prompt injection, and why can it not be fully patched?',
      a: 'Untrusted text carrying instructions the model follows: the root cause is that LLMs have no privilege separation between instructions and data. Direct injection comes from the user; indirect injection hides in emails, pages, tickets, and tool results your agent reads as data. Defense is architecture, never string matching.',
    },
    {
      q: 'How do you secure an agent that has tools?',
      a: 'Least privilege per tool: read-only defaults, scoped credentials. Human approval for irreversible actions: payments, deletes, sends. Sandboxed execution, retrieved content treated as untrusted input, full logging, and an adversarial red-team suite in CI. The tool list is your permission model.',
      code: `async function execute(name: string, args: unknown) {
  const tool = tools.get(name)
  if (!tool) throw new Error("Unknown tool")
  if (tool.destructive) await approve(tool)  // human in the loop
  return tool.run(args)                      // scope enforced server-side
}`,
    },
    {
      q: 'Jailbreak vs prompt injection: what is the difference?',
      a: 'A jailbreak bypasses the model\'s safety training ("pretend you have no rules"): it attacks the policy layer. Prompt injection hijacks the task: new instructions smuggled into context redirect a legitimate capability. Different targets, different defenses: provider-side training for jailbreaks, architecture and privilege separation for injection.',
    },
  ],
}

/** Cards for a module; empty when the module has none yet. */
export function getReview(moduleId: string): ReviewCard[] {
  return REVIEW[moduleId] ?? []
}
