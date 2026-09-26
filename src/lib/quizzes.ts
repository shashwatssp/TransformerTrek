/**
 * Knowledge-check question bank, keyed by module id.
 * Each module gets three questions: recall, conceptual understanding,
 * and a common misconception. Everything is answered locally in the
 * browser; nothing is submitted anywhere.
 */

export type QuizQuestion = {
  /** The question text. */
  q: string
  /** Answer options; `answer` indexes into this array. */
  options: string[]
  /** Index of the correct option. */
  answer: number
  /** One-line explanation shown after answering. */
  why: string
}

export const QUIZZES: Record<string, QuizQuestion[]> = {
  // ── Foundations ──────────────────────────────────────────────
  'what-is-an-llm': [
    {
      q: 'What does an LLM actually read as input?',
      options: [
        'Raw characters, one byte at a time',
        'Tokens: integer IDs from a fixed subword vocabulary',
        'Whole sentences as semantic units',
        'Images of the text rendered as pixels',
      ],
      answer: 1,
      why: 'Text is chopped into subword tokens from a fixed vocabulary (often 50k-200k entries). Everything downstream operates on these integer IDs, never on raw letters or words.',
    },
    {
      q: 'The model has produced a probability distribution over the vocabulary. What happens next?',
      options: [
        'It re-runs the whole network until the distribution converges',
        'It picks a grammar rule to expand the sentence',
        'It samples one token from the distribution, appends it, and repeats',
        'It outputs the full paragraph in one shot',
      ],
      answer: 2,
      why: 'Generation is autoregression: sample one token from the distribution, append it to the context, predict again. One guess at a time, thousands of times.',
    },
    {
      q: 'True or false: temperature and top-p change the model\'s weights.',
      options: [
        'True, they fine-tune the model on the fly',
        'False, they only reshape the probability distribution before sampling',
        'True, but only for open-source models',
        'False, they change the vocabulary size',
      ],
      answer: 1,
      why: 'Sampling knobs like temperature, top-k, and top-p reshape the next-token distribution before the die is cast. The model itself is frozen; no weights change.',
    },
  ],
  'how-llms-work': [
    {
      q: 'What is the "context window" of an LLM?',
      options: [
        'The GUI panel where you type prompts',
        'The maximum number of tokens the model can attend to in one pass',
        'The number of layers in the transformer',
        'A time limit on how long a request may run',
      ],
      answer: 1,
      why: 'The context window is the maximum number of tokens the model can consider in a single inference pass. Everything the model "knows" about your request must fit inside it.',
    },
    {
      q: 'Setting temperature close to 0 makes the model…',
      options: [
        'Deterministic: it almost always picks the highest-probability token',
        'Completely random: all tokens become equally likely',
        'Smarter: it uses more compute per token',
        'Faster: it skips layers of the network',
      ],
      answer: 0,
      why: 'Dividing logits by a small T sharpens the distribution, so the argmax token dominates. High temperature does the opposite, flattening the distribution toward randomness.',
    },
    {
      q: 'Top-p (nucleus) sampling keeps…',
      options: [
        'Exactly p percent of the vocabulary',
        'The p most frequent tokens in the training data',
        'The smallest set of top tokens whose probabilities sum to at least p',
        'Tokens that appeared in the prompt p times',
      ],
      answer: 2,
      why: 'Top-p keeps the smallest nucleus of tokens whose cumulative probability reaches p, then renormalizes and samples. Top-k, by contrast, keeps a fixed count k.',
    },
  ],

  // ── Transformers ─────────────────────────────────────────────
  'tokenization-embeddings': [
    {
      q: 'Why do tokenizers use subwords instead of whole words?',
      options: [
        'Subwords are shorter, so models run faster',
        'A small reusable set of pieces can spell anything, including words never seen before',
        'Grammar rules require word boundaries',
        'Whole words cannot be sorted alphabetically',
      ],
      answer: 1,
      why: 'A fixed vocabulary cannot list every word in every language, but a few thousand reusable subword pieces (built by byte-pair encoding) can compose any text, even misspellings and new words.',
    },
    {
      q: 'What is an embedding?',
      options: [
        'A compressed ZIP of the training data',
        'A dense vector where semantic closeness becomes geometric closeness',
        'The token ID in the vocabulary table',
        'A layer that translates text to speech',
      ],
      answer: 1,
      why: 'Each token ID maps to a dense vector learned during training. In that space, similar meanings end up near each other, which is what makes vector search and attention possible.',
    },
    {
      q: 'A common blind spot of vocab IDs is that…',
      options: [
        'Rare or unseen words get split into pieces with less obvious meaning',
        'IDs grow without bound as the conversation gets longer',
        'IDs leak your training data to users',
        'IDs are too large to fit in 64-bit integers',
      ],
      answer: 0,
      why: 'Because the vocabulary is fixed, rare words shatter into many pieces (e.g. "un + believ + able"), and each piece carries less meaning than a whole-word token would.',
    },
  ],
  'attention': [
    {
      q: 'In attention, what roles do the Query, Key, and Value vectors play?',
      options: [
        'Query asks "what am I looking for?", Keys advertise "what I contain", Values are what gets mixed',
        'Query stores the output, Keys cache the input, Values normalize the scores',
        'All three are copies of the same token embedding',
        'Query is the learning rate, Key is the momentum, Value is the weight',
      ],
      answer: 0,
      why: 'Each token projects its embedding into a Query (what it seeks), a Key (what it offers), and a Value (the content to pass along). Matching query·key scores decide how much of each value gets mixed in.',
    },
    {
      q: 'What does the causal mask do in a decoder?',
      options: [
        'Prevents the model from attending to tokens that come later in the sequence',
        'Removes punctuation tokens from the input',
        'Blocks attention to the system prompt',
        'Limits attention to at most one head',
      ],
      answer: 0,
      why: 'The mask sets attention scores to future positions to −∞ before softmax, so a decoder-only model can only look at previous tokens. That is what makes next-token training valid.',
    },
    {
      q: 'After the scores are computed, softmax is applied to…',
      options: [
        'Turn raw dot-product scores into weights that are positive and sum to 1',
        'Normalize the values to unit length',
        'Convert vectors back into text',
        'Clip gradients during backpropagation',
      ],
      answer: 0,
      why: 'Row by row, softmax exponentiates and normalizes the scores, turning them into a probability-like set of attention weights used for the weighted sum of values.',
    },
  ],
  'architecture': [
    {
      q: 'What does one transformer block contain?',
      options: [
        'An attention layer followed by an MLP (feed-forward) layer, with residuals and LayerNorm',
        'A convolution and a pooling layer',
        'A decision tree and a random forest',
        'An encoder and a decoder sharing weights',
      ],
      answer: 0,
      why: 'Each block is attention (tokens exchange information) plus an MLP (each token is transformed independently), wrapped with residual connections and LayerNorm. The stack of N blocks is the model.',
    },
    {
      q: 'Why are residual connections important in deep stacks?',
      options: [
        'They reduce the parameter count',
        'They give gradients a direct path through the network, letting very deep stacks train',
        'They convert logits to probabilities',
        'They encrypt the weights',
      ],
      answer: 1,
      why: 'Each block adds its output to its input (x + f(x)). That identity path keeps signals and gradients flowing, which is what makes 80+ layer stacks trainable.',
    },
    {
      q: 'GPT-style LLMs are which variant?',
      options: [
        'Encoder-only',
        'Decoder-only',
        'Encoder-decoder',
        'Diffusion',
      ],
      answer: 1,
      why: 'Decoder-only stacks with causal attention predict the next token and double as generation engines. Encoders (like BERT) see both sides and are used for understanding tasks.',
    },
  ],
  'next-token-lab': [
    {
      q: 'Logits are…',
      options: [
        'Probabilities that already sum to 1',
        'Raw, unbounded scores, one per vocabulary entry, before softmax',
        'The gradients of the loss',
        'Token IDs after sorting',
      ],
      answer: 1,
      why: 'Logits are the model\'s raw per-vocab scores with no constraints. Only after softmax do they become positive probabilities that sum to 1.',
    },
    {
      q: 'Raising top-k from 10 to 100 makes generation…',
      options: [
        'More constrained: fewer candidate tokens',
        'More varied: more candidate tokens can be sampled',
        'Slower but identical in output',
        'Deterministic',
      ],
      answer: 1,
      why: 'Top-k cuts the tail of the distribution to k candidates. A larger k admits more (usually lower-probability) tokens, so outputs get more varied and occasionally weirder.',
    },
    {
      q: 'A text is looping "the cat sat the cat sat the cat…". The most likely fix is…',
      options: [
        'Increase temperature or lower top-p to add variety',
        'Train the model longer',
        'Set temperature to 0',
        'Use a bigger context window',
      ],
      answer: 0,
      why: 'Repetition is the signature of too-sharp distributions (greedy or near-greedy decoding). A bit more temperature, or tighter top-p/top-k, reintroduces productive randomness.',
    },
  ],

  // ── Training ─────────────────────────────────────────────────
  'pretraining': [
    {
      q: 'The pretraining objective is…',
      options: [
        'Classify each input into one of a thousand categories',
        'Predict the next token over trillions of tokens of text',
        'Minimize pixel difference between generated images',
        'Maximize the reward from human raters',
      ],
      answer: 1,
      why: 'Pretraining is self-supervised next-token prediction at enormous scale. No labels are needed; the text itself provides the supervision signal.',
    },
    {
      q: 'Chinchilla-style compute-optimal training says…',
      options: [
        'Parameters and training tokens should scale roughly proportionally (≈20 tokens per parameter)',
        'Always train as long as possible on as little data as possible',
        'Model size does not matter at all',
        'Use exactly 100 billion tokens regardless of size',
      ],
      answer: 0,
      why: 'Hoffmann et al. showed many models were undertrained on data: for a fixed compute budget, scale parameters and tokens together, about 20 tokens per parameter.',
    },
    {
      q: 'A falling training loss with a worsening validation loss usually means…',
      options: [
        'The model is overfitting, memorizing the training set instead of generalizing',
        'The learning rate is too small',
        'The model is converging perfectly',
        'The tokenizer is broken',
      ],
      answer: 0,
      why: 'Loss curves hide a lot: a widening train/validation gap is the classic overfitting signature, one reason data cleaning and held-out evaluation matter.',
    },
  ],
  'how-llms-are-trained': [
    {
      q: 'BERT, GPT, and T5 correspond to which objectives, respectively?',
      options: [
        'Masked language modeling, causal next-token, span corruption',
        'Causal next-token, masked language modeling, image captioning',
        'Span corruption, causal next-token, masked language modeling',
        'All three use reward modeling',
      ],
      answer: 0,
      why: 'BERT masks tokens and predicts them from both sides; GPT predicts the next token causally; T5 reconstructs corrupted spans. The objective shapes what the model is good at.',
    },
    {
      q: 'Mixture-of-Experts (MoE) models…',
      options: [
        'Route each token to a small set of specialized feed-forward experts, adding capacity without proportionally adding compute',
        'Train several small models and average their outputs',
        'Use human experts to label data',
        'Cannot be used for language modeling',
      ],
      answer: 0,
      why: 'MoE layers keep many expert MLPs but activate only a few per token. You get a huge parameter count (capacity) while paying only for the active experts.',
    },
    {
      q: 'Reasoning models like modern o1/R1-style systems are typically improved with…',
      options: [
        'RL with verifiable rewards (e.g. checking math answers)',
        'Removing the tokenizer',
        'Doubling the context window only',
        'Switching to encoder architecture',
      ],
      answer: 0,
      why: 'When the answer can be checked automatically (math, code), reinforcement learning against that verifier produces long chains of thought that genuinely improve reasoning.',
    },
  ],
  'fine-tuning': [
    {
      q: 'What does SFT (Supervised Fine-Tuning) add over pretraining?',
      options: [
        'It teaches format and behavior by training on curated (instruction, response) pairs',
        'It increases the vocabulary size',
        'It replaces the attention mechanism',
        'It trains on raw web text again',
      ],
      answer: 0,
      why: 'SFT tunes a pretrained model on high-quality instruction/response pairs, with loss usually on the response tokens only. It shapes behavior; it does not inject much new knowledge.',
    },
    {
      q: 'LoRA/QLoRA reduce fine-tuning cost by…',
      options: [
        'Training tiny low-rank adapter matrices instead of updating all weights (QLoRA adds 4-bit quantization of the frozen base)',
        'Deleting most layers of the model',
        'Training on shorter sequences only',
        'Using CPUs instead of GPUs',
      ],
      answer: 0,
      why: 'LoRA freezes the base weights and learns small adapter matrices (often <1% of parameters). QLoRA quantizes the frozen base to 4 bits, so big models fit on modest GPUs.',
    },
    {
      q: '"Reward hacking" is when…',
      options: [
        'The policy exploits reward-model errors (verbosity, flattery) to score high without being genuinely good',
        'A hacker steals the model weights',
        'The reward function is open-sourced',
        'The model refuses to answer',
      ],
      answer: 0,
      why: 'RLHF optimizes against a learned reward model, and any imperfection becomes an exploit: longer answers, sycophancy, or confident nonsense that the reward model mistakenly prefers.',
    },
  ],
  'open-source-models': [
    {
      q: '"Open-weights" models are ones where…',
      options: [
        'The trained parameters are downloadable so you can run, fine-tune, and self-host them',
        'Only the architecture diagram is published',
        'The training data is always public too',
        'They must be used through a paid API',
      ],
      answer: 0,
      why: 'Open weights mean the model parameters are available for download. Note the license: usage terms differ per family, and training data or code may not be included.',
    },
    {
      q: 'Which is a reasonable first check when choosing between open-weight families?',
      options: [
        'License terms, size variants, context length, and benchmark fit for your task',
        'The founder\'s blog frequency',
        'Whether the model has the longest name',
        'Only the release date',
      ],
      answer: 0,
      why: 'Llama, Mistral, Qwen, Gemma, DeepSeek, and Phi differ in license, sizes, context, and strengths. Match the model to your task, budget, and deployment constraints.',
    },
    {
      q: 'The fastest way to try an open model tonight is…',
      options: [
        'Run a quantized build locally (e.g. via Ollama/llama.cpp) or use a hosted inference endpoint',
        'Pretrain a smaller copy from scratch',
        'Scrape the model card HTML',
        'Wait for the weights to arrive by email',
      ],
      answer: 0,
      why: 'Quantized community builds run on laptops, and free-tier hosted endpoints exist for most major families. Pretraining from scratch is a research project, not a demo.',
    },
  ],

  // ── Retrieval & Search ───────────────────────────────────────
  'rag': [
    {
      q: 'At a high level, RAG improves LLM answers by…',
      options: [
        'Fine-tuning the model on the user\'s documents every night',
        'Retrieving relevant chunks at inference time and injecting them into the prompt',
        'Increasing the model\'s parameter count',
        'Removing the need for a prompt',
      ],
      answer: 1,
      why: 'Retrieval-Augmented Generation grounds the generator: at question time, relevant snippets are fetched from your corpus and placed in context, so the model answers from evidence.',
    },
    {
      q: 'Which is an early-stage pair of the RAG pipeline?',
      options: [
        'Ingest/chunk/embed, then query and retrieve',
        'Generate, then cite',
        'Evaluate, then deploy',
        'Tokenize, then sample',
      ],
      answer: 0,
      why: 'The 7-stage pipeline starts with ingest → chunk → embed, then at query time: embed the query → retrieve → rerank → assemble context → generate with citations.',
    },
    {
      q: 'A RAG answer cites sources that do not contain the claim. This is most often…',
      options: [
        'A retrieval failure: the right chunk was never fetched (or was beaten by look-alike chunks)',
        'Proof the model is sentient',
        'A tokenizer bug',
        'Impossible with RAG',
      ],
      answer: 0,
      why: 'Retrieval that lies, wrong or missing chunks, is the dominant RAG failure mode. Fix ranking, chunking, and evaluation before blaming the generator.',
    },
  ],
  'rag-vs-fine-tuning': [
    {
      q: 'The core distinction between RAG and fine-tuning is…',
      options: [
        'RAG injects knowledge at inference; fine-tuning changes behavior baked into the weights',
        'RAG is always cheaper and always better',
        'Fine-tuning retrieves documents; RAG trains weights',
        'They are the same thing with different names',
      ],
      answer: 0,
      why: 'Knowledge that changes often (policies, docs, catalogs) belongs in a retriever; style, format, and behavior belong in weights. Many products combine both.',
    },
    {
      q: 'Your product\'s FAQ changes weekly. Which approach fits best?',
      options: [
        'RAG, so the index is updated without retraining',
        'Full fine-tuning re-run weekly',
        'Hard-code the FAQ in the system prompt forever',
        'Neither; LLMs already know your FAQ',
      ],
      answer: 0,
      why: 'Fresh, changing knowledge is the textbook RAG use case: update the index and the model answers from it immediately, no retraining required.',
    },
    {
      q: 'What did the Balaguer et al. (2024) case study measure?',
      options: [
        'Fine-tuning helped, RAG helped further, and combining both worked best',
        'Fine-tuning always beats RAG by 50 points',
        'RAG cannot work in agriculture',
        'Neither approach improved over the base model',
      ],
      answer: 0,
      why: 'In the agriculture case study, fine-tuning added about +6pp over the base, RAG about +5pp further, and the combined pipeline was best. Treat it as evidence to test on your own data.',
    },
  ],
  'vector-search': [
    {
      q: 'Cosine similarity compares two embeddings by…',
      options: [
        'The dot product of their normalized vectors, i.e. the angle between them',
        'Their difference in length',
        'Common substrings',
        'Alphabetical order of the source text',
      ],
      answer: 0,
      why: 'Normalize both vectors and take the dot product: 1 means same direction (very similar), 0 means orthogonal (unrelated). It ignores magnitude, which is why it suits text embeddings.',
    },
    {
      q: 'Why does exact nearest-neighbor search fail at scale?',
      options: [
        'Brute force compares the query to every vector, which is too slow for millions+ items',
        'It returns wrong results',
        'It uses too much disk',
        'Vectors cannot be compared',
      ],
      answer: 0,
      why: 'Brute-force search is O(N) per query. Approximate nearest neighbor (ANN) indexes like HNSW trade a little recall for orders-of-magnitude speed.',
    },
    {
      q: 'HNSW speeds up search using…',
      options: [
        'A layered small-world graph you navigate from coarse top layers down to precise bottom layers',
        'Sorting all vectors alphabetically',
        'A full table scan with a GPU',
        'Hashing text into buckets by keyword',
      ],
      answer: 0,
      why: 'Hierarchical Navigable Small World graphs let search hop across layers: coarse layers move you near the answer fast, lower layers refine it. Recall vs speed is tunable.',
    },
  ],
  'bm25': [
    {
      q: 'The BM25 parameter k1 controls…',
      options: [
        'Term-frequency saturation: how quickly repeated terms stop adding score',
        'The number of documents returned',
        'The embedding dimension',
        'The learning rate',
      ],
      answer: 0,
      why: 'k1 caps how much extra score a term earns by repeating. Once a term appears several times, extra occurrences matter less, keyword spam does not win.',
    },
    {
      q: 'The parameter b controls…',
      options: [
        'Length normalization: how strongly long documents are penalized',
        'The batch size',
        'The boost for rare terms',
        'The number of index shards',
      ],
      answer: 0,
      why: 'b balances score against document length: at b≈1, long documents are discounted fully; at b=0, length does not matter. It stops long docs from winning just by being long.',
    },
    {
      q: 'IDF (inverse document frequency) rewards…',
      options: [
        'Terms that are rare across the corpus but present in this document',
        'Terms that appear in every document',
        'The shortest documents',
        'The most recent documents',
      ],
      answer: 0,
      why: 'A term in almost every document ("the", "and") carries no signal; a term in 3 of a million documents is nearly a fingerprint. IDF scores that distinctiveness.',
    },
  ],
  'minilm': [
    {
      q: 'MiniLM is able to be small and fast because it is…',
      options: [
        'Distilled: trained to mimic a larger teacher model\'s behavior',
        'A rule-based scorer with no neural network',
        'Trained on only 100 sentences',
        'An API wrapper around GPT',
      ],
      answer: 0,
      why: 'Knowledge distillation transfers a big teacher\'s scores into a compact student. MiniLM keeps 6 layers and produces useful 384-dim sentence embeddings cheaply.',
    },
    {
      q: 'How does MiniLM turn token embeddings into one sentence vector?',
      options: [
        'Mean pooling: average the token vectors across positions',
        'Take the first token only',
        'Multiply all token vectors together',
        'Use the longest token\'s vector',
      ],
      answer: 0,
      why: 'Mean pooling averages token embeddings into a fixed-size sentence vector (384 dims in the classic checkpoint), which is what gets compared with cosine similarity.',
    },
    {
      q: 'Contrastive training improves embeddings by…',
      options: [
        'Pulling matched (similar) pairs together and pushing mismatched pairs apart in vector space',
        'Sorting sentences alphabetically',
        'Adding more layers per training step',
        'Removing rare words from the vocabulary',
      ],
      answer: 0,
      why: 'With pairs/triples of similar vs dissimilar sentences, the model learns a space where "same meaning" literally means "nearby", which is the property search needs.',
    },
  ],
  'hybrid-search': [
    {
      q: 'BM25 and dense retrieval fail in complementary ways because…',
      options: [
        'BM25 misses meaning (synonyms); dense search misses exactness (IDs, rare terms)',
        'Both fail only on short documents',
        'BM25 needs GPUs; dense does not',
        'Dense search cannot run on English text',
      ],
      answer: 0,
      why: 'Lexical matching is blind to paraphrase, and embeddings blur exact tokens like error codes or part numbers. Hybrid retrieval keeps both strengths.',
    },
    {
      q: 'Reciprocal Rank Fusion (RRF) combines ranked lists by…',
      options: [
        'Adding Σ 1/(k + rank) contributions from each list, rewarding items ranked high everywhere',
        'Averaging the raw similarity scores directly',
        'Taking whichever list is longer',
        'A random coin flip per document',
      ],
      answer: 0,
      why: 'RRF only uses ranks, not raw scores, so incomparable BM25 and cosine scores never need calibrating. Documents that do decently on both lists float to the top.',
    },
    {
      q: 'A cross-encoder reranker improves precision by…',
      options: [
        'Jointly encoding (query, document) pairs so the model scores relevance with full interaction between them',
        'Embedding both separately and taking the dot product',
        'Counting keyword overlaps',
        'Re-ranking by document length',
      ],
      answer: 0,
      why: 'Bi-encoders embed query and document independently (fast but coarse). A cross-encoder reads them together and scores the pair, which is far more accurate, that is why it is used to rerank a shortlist.',
    },
  ],
  'embedding-models': [
    {
      q: 'MTEB is best used as…',
      options: [
        'A shortlist filter across many tasks, since the aggregate score hides per-task differences',
        'The single number that decides your production embedding model',
        'A training dataset for embeddings',
        'A vector database benchmark',
      ],
      answer: 0,
      why: 'The Massive Text Embedding Benchmark aggregates retrieval, clustering, similarity, and more. Use it to shortlist, then evaluate on your own data, leaderboard leaders rotate monthly.',
    },
    {
      q: 'Matryoshka (MRL) embeddings are valuable because…',
      options: [
        'Every prefix of the vector remains useful, letting you trade dimension (storage) for recall at will',
        'They compress text to one byte',
        'They work without a tokenizer',
        'They only support Russian text',
      ],
      answer: 0,
      why: 'Trained so prefixes stay meaningful, MRL vectors can be truncated (e.g. 1536→256 dims) for cheaper storage and search, with modest recall loss and no new model.',
    },
    {
      q: 'When comparing embedding models for production, which set matters most?',
      options: [
        'Dimensions, context length, cost, multilingual coverage, and measured recall on your queries',
        'The model card\'s star rating',
        'Number of GitHub stars',
        'Release year only',
      ],
      answer: 0,
      why: 'Practical fit beats a single leaderboard number: match dims (storage), context (long docs), price (volume), languages, and, critically, recall on your own labeled queries.',
    },
  ],
  'vector-databases': [
    {
      q: 'Compared to keeping vectors in Postgres as plain floats, a vector database adds…',
      options: [
        'ANN indexes (HNSW/IVF/DiskANN), metadata filtering, CRUD, and hybrid retrieval',
        'A new programming language',
        'Automatic model fine-tuning',
        'Tokenization as a service',
      ],
      answer: 0,
      why: 'A dedicated vector DB packages fast approximate search with the operational features (updates, filters, hybrid scoring) that production retrieval needs.',
    },
    {
      q: 'Filtered vector search (e.g. "category = news, then nearest neighbors") is tricky because…',
      options: [
        'Aggressive pre-filtering can prune the graph and hurt recall, so engines use filterable indexes or post-filtering tradeoffs',
        'Filters are impossible to express',
        'It requires re-embedding every document per query',
        'Only BM25 supports filters',
      ],
      answer: 0,
      why: 'The index and the filter must cooperate: Qdrant-style filterable HNSW, Weaviate-era partitions, and post-filter heuristics all trade recall and latency differently.',
    },
    {
      q: 'pgvector is a good default when…',
      options: [
        'Your data already lives in Postgres and you want ANN search without a new system',
        'You need billion-scale sub-millisecond search above all',
        'You cannot install any extension',
        'You only use BM25',
      ],
      answer: 0,
      why: 'pgvector brings HNSW/IVFFlat inside Postgres: one system, real transactions, SQL joins. Dedicated engines (Qdrant, Milvus, Pinecone) still win at extreme scale or latency.',
    },
  ],

  // ── Agents & Protocols ───────────────────────────────────────
  'what-is-an-agent': [
    {
      q: 'What turns a chatbot into an agent?',
      options: [
        'A larger context window',
        'A loop that can act via tools and observe the results until the goal is met',
        'A faster GPU',
        'A longer system prompt',
      ],
      answer: 1,
      why: 'The agent loop, perceive → reason → act → observe, lets the system affect the world (APIs, files, searches) and react to what happened, instead of only producing text.',
    },
    {
      q: 'Tools change everything because they…',
      options: [
        'Let the model get fresh, real-world information and take real actions beyond its weights',
        'Make the model hallucinate less automatically',
        'Replace the need for training',
        'Guarantee the plan will succeed',
      ],
      answer: 0,
      why: 'A model\'s weights are frozen and its knowledge ages. Tools connect it to live state and side effects, search results, databases, emails, which no amount of parameters provides.',
    },
    {
      q: 'When is building an agent the wrong choice?',
      options: [
        'When a fixed, predictable workflow solves the problem reliably',
        'When the task needs current data',
        'When the task spans multiple systems',
        'Never; agents are always right',
      ],
      answer: 0,
      why: 'Anthropic\'s guidance: use workflows for predictability, agents for open-ended variability. If a scripted pipeline is reliable, an autonomous loop adds cost, latency, and failure modes.',
    },
  ],
  'tools-react': [
    {
      q: 'In function calling, the model…',
      options: [
        'Emits a structured call (name + JSON arguments) against schemas you provided; your code executes it',
        'Executes the function inside the GPU',
        'Compiles Python at runtime',
        'Only calls functions defined by the hardware',
      ],
      answer: 0,
      why: 'The model never runs anything. It outputs a structured tool call that your application validates and executes, then feeds the result back as an observation.',
    },
    {
      q: 'The ReAct loop alternates…',
      options: [
        'Thought → Action → Observation, repeating until the goal is met',
        'Train → Validate → Deploy',
        'Prompt → Response → Prompt',
        'Encode → Decode → Encode',
      ],
      answer: 0,
      why: 'ReAct interleaves reasoning ("Thought") with tool use ("Action") and its result ("Observation"), so each step is informed by real feedback from the environment.',
    },
    {
      q: 'Good tool descriptions matter because…',
      options: [
        'The model chooses tools based on their names, descriptions, and schemas, vague tools get ignored or misused',
        'They are compiled into the weights',
        'They are only read by humans',
        'They determine the context window size',
      ],
      answer: 0,
      why: 'Tool schemas are the model\'s only interface documentation. Clear names, parameter descriptions, and examples measurably improve tool selection and argument quality.',
    },
  ],
  'memory-planning': [
    {
      q: 'An agent\'s "working memory" is usually…',
      options: [
        'The context window, with everything the loop has accumulated so far',
        'The GPU\'s VRAM only',
        'A SQL database of all user conversations',
        'The model\'s weights, updated each session',
      ],
      answer: 0,
      why: 'Working memory is what fits in the context window: the task, tool results, and history. Managing what stays, gets summarized, or gets dropped is a core agent-engineering skill.',
    },
    {
      q: 'Long-term memory across sessions is typically implemented with…',
      options: [
        'A vector store of past notes/retrieved on demand by embedding the current task',
        'A bigger temperature',
        'Fine-tuning after every message',
        'Screenshots of previous chats',
      ],
      answer: 0,
      why: 'Write durable facts and artifacts to a vector database (or similar), then retrieve relevant items into context when a new task starts, memory becomes retrieval.',
    },
    {
      q: 'Reflexion-style reflection helps because…',
      options: [
        'The agent critiques its own failed attempt and stores the lesson for the next try',
        'It lowers the cost per token',
        'It removes the need for tools',
        'It makes the model deterministic',
      ],
      answer: 0,
      why: 'Self-critique turns a failed trajectory into feedback ("the search returned no results, try broader terms"), which measurably improves the next attempt without retraining.',
    },
  ],
  'mcp': [
    {
      q: 'MCP exists to solve the N×M integration problem, meaning…',
      options: [
        'N applications each needing custom adapters for M tools; MCP standardizes the interface once',
        'N models needing M GPUs each',
        'N tokens per M characters',
        'N users and M permissions',
      ],
      answer: 0,
      why: 'Before MCP, every app × every tool was a custom integration. MCP defines one protocol: any compliant client can talk to any compliant server.',
    },
    {
      q: 'The three core primitives an MCP server can expose are…',
      options: [
        'Tools (actions), resources (data), and prompts (templates)',
        'Models, weights, and datasets',
        'Tables, rows, and columns',
        'GET, POST, and DELETE only',
      ],
      answer: 0,
      why: 'Tools are model-invoked actions, resources are context the app can attach, prompts are reusable templates. Servers advertise all three through capability discovery.',
    },
    {
      q: 'In MCP architecture, a "host" is…',
      options: [
        'The application (e.g. an IDE or chat app) that runs clients connecting to servers',
        'The GPU cluster',
        'The training dataset',
        'A user account type',
      ],
      answer: 0,
      why: 'Hosts (Claude Desktop, an IDE) embed MCP clients; each client maintains a session with one server, which provides tools/resources/prompts.',
    },
  ],
  'a2a-multiagent': [
    {
      q: 'An A2A "agent card" is…',
      options: [
        'A machine-readable description of what an agent can do and how to reach it',
        'A payment method for API usage',
        'A GPU firmware card',
        'The agent\'s chat history',
      ],
      answer: 0,
      why: 'Agent cards advertise identity, capabilities, skills, and endpoints so other agents can discover and interact with them without bespoke integrations.',
    },
    {
      q: 'In the supervisor pattern…',
      options: [
        'A lead agent delegates subtasks to worker agents and integrates their results',
        'All agents vote on every token',
        'One agent does everything alone',
        'Humans approve every message',
      ],
      answer: 0,
      why: 'Supervisor (orchestrator) topologies centralize planning and coordination, with workers executing narrow roles; swarm/handoff patterns instead pass control peer-to-peer.',
    },
    {
      q: 'Multi-agent beats single-agent when…',
      options: [
        'The task genuinely splits into parallelizable, separable roles with clear interfaces',
        'You want more tokens billed',
        'The task is a single short lookup',
        'Latency does not matter at all',
      ],
      answer: 0,
      why: 'Multi-agent adds coordination overhead and failure modes. It pays off when context isolation, parallelism, or specialization actually help the task.',
    },
  ],
  'frameworks': [
    {
      q: 'LangGraph models agent workflows as…',
      options: [
        'State graphs: nodes, edges, reducers, and cycles, as a durable runtime',
        'A linear chain of prompts only',
        'A spreadsheet of templates',
        'A fixed neural architecture',
      ],
      answer: 0,
      why: 'LangGraph generalizes LangChain\'s chains into a graph with shared state, so control flow can loop (cycles), essential for agent retry/refine behavior.',
    },
    {
      q: 'Reducers in LangGraph exist to…',
      options: [
        'Merge state updates coming from parallel branches deterministically',
        'Shrink the context window',
        'Compress model weights',
        'Reduce the number of nodes',
      ],
      answer: 0,
      why: 'When parallel nodes update the same state key, a reducer (e.g. append or overwrite) defines how updates combine, keeping concurrent execution consistent.',
    },
    {
      q: 'Why do agents need graphs with cycles, unlike classic DAG pipelines?',
      options: [
        'Because acting on observations means looping: try, check, retry or refine until done',
        'Cycles make models smarter',
        'DAGs cannot represent prompts',
        'They do not; acyclic graphs are always enough',
      ],
      answer: 0,
      why: 'A fixed DAG cannot express "if the tool result is bad, go back and try again". Cycles let the runtime revisit nodes, which is the essence of agentic control flow.',
    },
  ],

  // ── System Design ────────────────────────────────────────────
  'agent-case-studies': [
    {
      q: 'Perplexity\'s product architecture is best characterized as…',
      options: [
        'Search-first RAG: query understanding, retrieval, then grounded generation with citations',
        'A pure chatbot with no retrieval',
        'A fine-tuned model with no search',
        'A single embedding lookup',
      ],
      answer: 0,
      why: 'Perplexity treats search as the core: it reformulates queries, searches multiple sources, and generates answers with inline citations, RAG as the product.',
    },
    {
      q: 'Cursor and Windsurf stand out because they…',
      options: [
        'Index your codebase and ground agent edits in retrieved, repository-aware context',
        'Only autocomplete single lines',
        'Refuse to use tools',
        'Run the model without any context',
      ],
      answer: 0,
      why: 'Code agents win on context: embeddings + symbol-aware retrieval over the repo let the agent propose edits that fit your codebase, not just generic snippets.',
    },
    {
      q: 'Devin-style products illustrate which profile?',
      options: [
        'Planner-executor: decompose the goal, work long-horizon, report progress',
        'Single-shot Q&A',
        'Pure autocomplete',
        'Retrieval-free generation',
      ],
      answer: 0,
      why: 'Long-horizon coding agents separate planning from execution, maintain task state, and check their work, the planner-executor architecture under the demo.',
    },
  ],
  'build-an-agent': [
    {
      q: 'The right starting point for an agent is…',
      options: [
        'The simplest loop that works, then add complexity only where it demonstrably helps',
        'A 12-tool multi-agent swarm on day one',
        'Fine-tuning before any prompt exists',
        'A vector database with no data',
      ],
      answer: 0,
      why: 'Start minimal: one loop, a few tools, clear success criteria. Every addition (memory, more tools, sub-agents) should trace to a measured failure, not speculation.',
    },
    {
      q: 'System prompts should be written…',
      options: [
        'Like an engineer: explicit role, rules, tool-use policy, and failure handling, versioned and tested',
        'Like poetry, to inspire the model',
        'As short as possible, always one line',
        'Never; the model reads its weights',
      ],
      answer: 0,
      why: 'The system prompt is the agent\'s spec: it defines behavior boundaries and how to use tools. Treat it like code, reviewed, versioned, and evaluated.',
    },
    {
      q: '"Evaluate like a product, not a demo" means…',
      options: [
        'Define task-level success metrics and run them on every change, including tool-call traces',
        'Only show it to executives once',
        'Trust a single impressive screenshot',
        'Evaluate only the final text, never the steps',
      ],
      answer: 0,
      why: 'Demos hide failure modes. Datasets of real tasks, automated scoring (and tracing of intermediate tool calls) tell you whether changes actually improved the agent.',
    },
  ],
  'agent-system-design': [
    {
      q: 'Back-of-envelope math in agent design (tokens/sec, users, cost) exists to…',
      options: [
        'Sanity-check architecture choices (timeouts, rate limits, budget) before building',
        'Decorate the design doc',
        'Replace load testing entirely',
        'Prove the model is intelligent',
      ],
      answer: 0,
      why: 'Rough numbers on load, token spend, and latency expose bottlenecks early: queueing, retry storms, and cost ceilings shape the design more than clever prompts.',
    },
    {
      q: 'A production agent design should treat failure modes as…',
      options: [
        'First-class: guardrails, timeouts, retries with budgets, human fallbacks, and audits',
        'Impossible; agents do not fail',
        'Something users will tolerate silently',
        'Only a deployment concern, never a design one',
      ],
      answer: 0,
      why: 'Tool calls fail, models go astray, queues fill. Designing detection, containment (rate limits, budgets), and graceful degradation is what separates a product from a demo.',
    },
    {
      q: 'Scaling levers for an agent backend include…',
      options: [
        'Parallelizing tool execution, caching, streaming, queueing long jobs, and right-sizing model tiers per step',
        'Only buying a bigger GPU',
        'Removing all logging',
        'Increasing everyone\'s latency equally',
      ],
      answer: 0,
      why: 'Scale comes from architecture: cheap models for easy steps, caches for repeated work, async queues for long tasks, and parallel tools, not a single heroic server.',
    },
  ],

  // ── Evals ────────────────────────────────────────────────────
  'evals': [
    {
      q: 'Perplexity measures…',
      options: [
        'How "surprised" the model is by held-out text: exp(cross-entropy); lower is better',
        'How confused users are by the UI',
        'The number of parameters',
        'Latency in milliseconds',
      ],
      answer: 0,
      why: 'Perplexity quantifies how well the model predicts unseen text. It is a great pretraining signal but says little about instruction-following or safety, hence benchmarks.',
    },
    {
      q: 'MMLU, HumanEval, and GSM8K test respectively…',
      options: [
        'Broad knowledge, code generation, and grade-school math reasoning',
        'Images, audio, and video',
        'Only translation quality',
        'Tokenization speed',
      ],
      answer: 0,
      why: 'Each benchmark probes a different capability slice. A model\'s aggregate "score" hides this, always check which slices matter for your use case.',
    },
    {
      q: '"Benchmark contamination" refers to…',
      options: [
        'Test questions leaking into training data, inflating scores without real ability',
        'Viruses in the dataset',
        'Too many benchmarks existing',
        'Models refusing to answer',
      ],
      answer: 0,
      why: 'When eval items end up in pretraining data, scores look great and mean little. That "benchmark rot" is why fresh, private, task-specific evals matter for real decisions.',
    },
  ],
  'why-llms-hallucinate': [
    {
      q: 'Why do LLMs hallucinate?',
      options: [
        'They are trained to be plausible, not truthful, fluent fabrication is good next-token prediction',
        'They contain a random-number bug that leaks into outputs',
        'Only small models hallucinate; frontier models are immune',
        'Hallucinations only happen at high temperature',
      ],
      answer: 0,
      why: 'The training objective rewards likely continuations, not verified claims, and binary-graded evals reward guessing over abstaining, so confident answers stay rational even at the edge of knowledge.',
    },
    {
      q: 'Does lowering temperature reduce hallucinations?',
      options: [
        'Yes, low temperature makes models more accurate',
        'No, temperature changes sampling randomness, not whether the top choice is true',
        'Yes, but only below 0.5',
        'No, only top-p affects truthfulness',
      ],
      answer: 1,
      why: 'Temperature sharpens or flattens the distribution; it cannot add knowledge. A temperature-0 model repeats the same wrong answer with total confidence. Truthfulness comes from grounding, evals, and abstention.',
    },
    {
      q: 'Which ordering best describes the hallucination mitigation ladder?',
      options: [
        'More parameters → more training → longer context',
        'Ground with RAG → force citations → gate abstention in code → verify faithfulness → human review for high stakes',
        'Add emojis → raise temperature → hope',
        'Prompt harder → fine-tune on everything → shut down retrieval',
      ],
      answer: 1,
      why: 'You contain the blast radius instead of patching the model: move knowledge into a retrievable, citable index, let the system say "I couldn\'t find this", and verify claims against context before they reach users.',
    },
  ],
  'prompting-patterns': [
    {
      q: 'What do few-shot examples actually do?',
      options: [
        'Fine-tune the model during the API call',
        'Condition the model in-context: format, tone, and edge-case handling without any weight updates',
        'Increase the context window',
        'Reduce the cost per token',
      ],
      answer: 1,
      why: 'Examples are conditioning, not training, the model imitates the pattern they demonstrate. Keep them diverse, or it over-imitates and answers every input like the last example.',
    },
    {
      q: 'When does chain-of-thought prompting help most?',
      options: [
        'On every task, always, it is free',
        'On math, logic, and multi-step tasks; it costs tokens and can even hurt on simple ones',
        'Only for creative writing',
        'Only when the model is large enough to refuse',
      ],
      answer: 1,
      why: 'Intermediate tokens become context for later predictions, more compute per answer. That is why reasoning models do it natively, and why simple tasks (where it adds cost and noise) should skip it.',
    },
    {
      q: 'The production pattern for reliable JSON from an LLM is…',
      options: [
        'Ask nicely in prose and parse with regex',
        'Constrain with a schema at decode time, validate the parse, and retry once with the validation error',
        'Set temperature to 2 so the JSON is more creative',
        'Avoid JSON; use screenshots',
      ],
      answer: 1,
      why: 'Schema-constrained decoding removes most failures; validating against the shape your code needs and retrying with the error message covers the rest. The schema is a contract, the retry is its enforcement.',
    },
  ],
  'serving-inference': [
    {
      q: 'Why is the first generated token slower than the rest?',
      options: [
        'The model warms up its weights during the first token',
        'Prefill processes the whole prompt in one parallel, compute-bound pass; afterwards decode runs one token at a time from the KV cache',
        'The first token is downloaded from the provider',
        'Tokenization only happens after the first token',
      ],
      answer: 1,
      why: 'TTFT is the prefill bill (grows with prompt length); every later token is a memory-bandwidth-bound decode step reading the cached K/V. Long prompts cost TTFT, not stream speed.',
    },
    {
      q: 'What makes "long context" expensive to serve?',
      options: [
        'The KV cache grows linearly with tokens, layers × KV-heads × head-dim × 2 × bytes per sequence',
        'Long prompts require retraining',
        'Embedding models cannot handle long text',
        'It does not; context is free',
      ],
      answer: 0,
      why: 'Cached keys and values are RAM per sequence. A 70B-class model at 128K tokens holds ~20 GiB of cache for one user, which is why PagedAttention treats the cache like virtual memory.',
    },
    {
      q: 'What does speculative decoding promise?',
      options: [
        'The same output distribution, 2-3× faster: a small draft model proposes tokens, the big model verifies them in one pass',
        'A smarter model with no extra compute',
        'Perfect predictions of future prompts',
        'Fewer tokens in the vocabulary',
      ],
      answer: 0,
      why: 'Verification of several drafted tokens is one cheap parallel pass, so accepted tokens cost a single step instead of several. The big model keeps veto power, quality is unchanged.',
    },
  ],
  'retrieval-evals': [
    {
      q: 'Why evaluate retrieval separately from generation?',
      options: [
        'To make dashboards look busier',
        'Because if the right chunk never reached the prompt, no generator can recover, and end-to-end scores blame the wrong component',
        'Because generation metrics are illegal in production',
        'Because retrieval and generation use the same tokenizer',
      ],
      answer: 1,
      why: 'Most "the AI is wrong" bugs are retrieval misses. Log the retrieval boundary, label a small golden set of queries, and localize: retrieval miss vs retrieved-but-ignored.',
    },
    {
      q: 'Recall@k, MRR, and nDCG answer, respectively…',
      options: [
        'Did a relevant doc make top-k? How high is the first hit? How good is the ranking with position discounting?',
        'How fast is search? How much RAM? How many GPUs?',
        'All three measure the same thing with different names',
        'Only nDCG is used in production',
      ],
      answer: 0,
      why: 'Recall@k is your coverage ceiling; MRR scores single-answer lookups by first-hit position; nDCG handles graded relevance when ranking order matters. Pick per question type, not habit.',
    },
    {
      q: 'You have no labeled data. How do you bootstrap an eval set?',
      options: [
        'Wait for the vendor to send one',
        'Collect 30-50 real queries, hand-label the relevant documents, version it, and run recall@k in CI on every retrieval change',
        'Use training data as the eval set',
        'Copy the MTEB leaderboard into a spreadsheet',
      ],
      answer: 1,
      why: 'A tiny, honest, private golden set beats any public benchmark for your system, an hour of labeling buys regression detection for every chunking, embedding, and fusion change.',
    },
  ],
  'agent-security': [
    {
      q: 'What is the root cause of prompt injection?',
      options: [
        'Models are trained on malicious data',
        'LLMs have no privilege separation between instructions and data, everything arrives as tokens in one context',
        'JSON is inherently insecure',
        'Only chat UIs are vulnerable',
      ],
      answer: 1,
      why: 'The system prompt, the user message, and a hostile web page are indistinguishable at the token level. The model guesses what to obey, so defense must be architectural, not string matching.',
    },
    {
      q: 'Which is the agent-specific threat?',
      options: [
        'Direct injection from the user\'s own keyboard',
        'Indirect injection: hostile instructions hidden in emails, pages, tickets, or tool results the agent reads as data',
        'Slow API responses',
        'Lexical search returning old documents',
      ],
      answer: 1,
      why: 'The attacker never talks to your agent, they leave a note where it will look. The blast radius is the tool list, which is why tool design is a security decision.',
    },
    {
      q: 'The containment playbook for an agent with tools is…',
      options: [
        'Longer system prompts listing every forbidden phrase',
        'Least-privilege tools, sandboxed execution, human approval for irreversible actions, and an adversarial red-team suite in CI',
        'Trust the model; it was aligned',
        'Remove all logging so attackers learn nothing',
      ],
      answer: 1,
      why: 'You cannot fully patch the model, so you contain the blast radius: read-only defaults, scoped credentials, the human fires destructive actions, and evals assert refusal and abstention behavior on every change.',
    },
  ],
}

/** Questions for a module, or undefined when the module has no quiz yet. */
export function getQuiz(moduleId: string): QuizQuestion[] | undefined {
  const quiz = QUIZZES[moduleId]
  return quiz && quiz.length > 0 ? quiz : undefined
}
