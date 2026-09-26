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
import EmbeddingExplorer from '../../widgets/retrieval/EmbeddingExplorer'
import VectorSearchDemo from '../../widgets/retrieval/VectorSearchDemo'
import { extClass } from '../../widgets/retrieval/shared'

export default function VectorSearch() {
  return (
    <>
      <Prose>
        <H2>Step 1: Embeddings as geometry</H2>
        <p>
          An embedding model maps text to a <strong>vector</strong>, a point in a high-dimensional space, 
          with one rule: texts with similar meaning land close together. “How do I reset my password?” and
          “I forgot my login credentials” share almost no words, yet a trained encoder places them
          neighbors. That is the entire trick behind semantic search: turn <em>meaning</em> into{' '}
          <em>geometry</em>, then search geometrically. (Where those vectors come from, tokenization,
          transformers, distillation, is its own story: <ModuleLink id="tokenization-embeddings" /> and{' '}
          <ModuleLink id="minilm" />.)
        </p>
        <p>
          The explorer below uses a 2D toy space you can actually see. Pick a query and watch cosine
          similarity rank the other words, dog finds puppy before banana.
        </p>
      </Prose>

      <WidgetFrame
        title="Widget: Embedding explorer"
        subtitle="A hand-placed 2D embedding space; similarity lines and rankings are computed live with cosineSimilarity."
      >
        <EmbeddingExplorer />
      </WidgetFrame>

      <Prose>
        <H2>Step 2: Cosine similarity in practice</H2>
        <p>
          The standard closeness measure is <strong>cosine similarity</strong>: the cosine of the angle
          between two vectors, from −1 (opposite) to 1 (identical direction). It ignores length, a long
          document and a short query can still point the same way:
        </p>
        <Callout kind="math" title="cosine(a, b) = a·b / (‖a‖ ‖b‖)">
          Divide the dot product by the product of the norms. If vectors are pre-normalized (‖v‖ = 1),
          cosine similarity <em>is</em> the dot product, which is why vector databases store unit vectors
          and score with a single multiply-accumulate loop, exactly the <code>cosineSimilarity</code>{' '}
          helper powering this site’s widgets.
        </Callout>
        <p>
          Query embedding → compare with every stored vector → rank. That loop is the whole search engine…
          until the corpus grows.
        </p>
      </Prose>

      <Prose>
        <H2>Step 3: Brute force, and why it fails at scale</H2>
        <p>
          Comparing the query with all N vectors (<strong>flat / brute-force search</strong>) is exact and
          perfectly fine for thousands of chunks. At 100 million vectors × 384 dimensions, one query means
          ~38 billion multiply-adds, tens of milliseconds of pure matrix math per question, per user.
          Exact search doesn’t scale; we need to stop checking every vector.
        </p>
      </Prose>

      <Prose>
        <H2>Step 4: ANN and the HNSW graph</H2>
        <p>
          <strong>Approximate Nearest Neighbor (ANN)</strong> algorithms buy speed by giving up the
          guarantee of finding the exact top-1, mostly. The dominant index is{' '}
          <a className={extClass} href="https://arxiv.org/abs/1603.09320" target="_blank" rel="noopener noreferrer">
            Malkov &amp; Yashunin’s HNSW (Hierarchical Navigable Small World)
          </a>{' '}
          (the Pinecone{' '}
          <a className={extClass} href="https://www.pinecone.io/learn/vector-database/" target="_blank" rel="noopener noreferrer">
            vector database primer
          </a>{' '}
          has a friendly write-up). Structure:
        </p>
        <p>
          Every vector is a node in a graph. Nodes are assigned to <strong>layers</strong>, a few on top,
          all of them on layer 0, and each node keeps links to its ~M most similar neighbors per layer.
          Search is a <strong>greedy walk</strong>: start at the top-layer entry point, hop to whichever
          neighbor is most similar to the query, and when no hop improves, drop one layer down. Top layers
          are coarse long-range express lanes; layer 0 is the fine-grained finish.
        </p>
        <WidgetFrame
          title="Widget: HNSW walk vs brute force"
          subtitle="40 seeded points, real greedy descent, every similarity check counted. Pick a target and watch it navigate, sometimes it misses, on purpose."
        >
          <VectorSearchDemo />
        </WidgetFrame>
        <CodeBlock
          language="python"
          filename="hnswlib_quickstart.py"
          code={`import numpy as np
import hnswlib   # pip install hnswlib, the reference implementation

vecs = np.random.randn(1_000_000, 384).astype("float32")
vecs /= np.linalg.norm(vecs, axis=1, keepdims=True)   # unit vectors

index = hnswlib.Index(space="cosine", dim=384)
index.init_index(max_elements=1_000_000, M=16, ef_construction=200)
index.add_items(vecs, num_threads=4)

index.set_ef(64)                       # search-time beam width
labels, dists = index.knn_query(query_vec, k=5)
# ~1–2 ms per query vs ~80 ms brute force, recall@5 typically > 0.98`}
        />
      </Prose>

      <Prose>
        <H2>Step 5: Recall vs speed tradeoffs</H2>
        <p>
          ANN lets you tune a dial, not flip a switch. In HNSW two knobs matter: <strong>M</strong> (edges
          kept per node, memory vs graph quality) and <strong>ef</strong> (beam width at search time, how
          many candidates the walk considers, i.e. compute vs recall). The demo’s greedy walk is ef = 1: the
          fastest, blindest setting, which is exactly why it sometimes stops one hop short of the true
          nearest neighbor.
        </p>
        <ComparisonTable
          columns={[
            { id: 'flat', label: 'Brute force (flat)' },
            { id: 'hnsw', label: 'HNSW (ANN)' },
          ]}
          rows={[
            {
              label: 'Result quality',
              values: { flat: 'Exact top-k, always', hnsw: 'Recall typically 95–99%, tunable via ef' },
            },
            {
              label: 'Per-query cost',
              values: { flat: 'O(N) similarity checks', hnsw: '~O(log N) checks via the layered walk' },
            },
            {
              label: 'Checks at N = 40 (in the widget)',
              values: { flat: '40', hnsw: 'Often 5–15, watch the counter' },
            },
            {
              label: 'Failure mode',
              values: { flat: 'Slow at scale', hnsw: 'Deterministic misses: a greedy walk can hit a local optimum' },
            },
            {
              label: 'Use when',
              values: { flat: 'Corpus ≤ ~100k, or recall is contractual', hnsw: 'Millions+ of vectors, latency budgets' },
            },
          ]}
        />
        <Callout kind="info" title="Where this fits in a real system">
          Vector search is the retrieval engine inside <ModuleLink id="rag" />, and it teams up with lexical
          scoring (BM25) in production stacks, the fusion math is <ModuleLink id="hybrid-search" />.
        </Callout>
      </Prose>

      <KeyTakeaways
        points={[
          'Embeddings turn meaning into geometry: similar text → nearby vectors → search becomes math.',
          'Cosine similarity (dot product of unit vectors) is the standard score, cheap, length-independent, GPU-friendly.',
          'Brute force is exact but O(N); at production scale it is too slow per query.',
          'HNSW builds layered neighbor graphs and greedy-walks them: ~log N checks for ~95–99% recall, tunable via M and ef.',
          'ANN misses are real (watch the widget), recall is a budget you spend for speed, not a guarantee.',
        ]}
      />
    </>
  )
}
