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
import HybridFusion from '../../widgets/retrieval/HybridFusion'
import { extClass } from '../../widgets/retrieval/shared'

export default function HybridSearch() {
  return (
    <>
      <Prose>
        <H2>Step 1 — BM25 alone misses meaning; dense misses exactness</H2>
        <p>
          The two retrieval families you’ve met — <ModuleLink id="bm25" /> (lexical) and{' '}
          <ModuleLink id="vector-search" /> (dense) — fail in opposite ways, and the failures barely
          overlap:
        </p>
        <p>
          <strong>BM25 misses meaning.</strong> It matches tokens, so <em>“forgot my login password”</em>{' '}
          never sees the document that says <em>“authentication failures… reset your credentials”</em> — no
          shared words, no score. Dense retrieval solves this: embeddings place the two side by side.
        </p>
        <p>
          <strong>Dense misses exactness.</strong> Embeddings blur what they weren’t trained to preserve:
          error codes (<code>ERR_0x5F3759DF</code>), part numbers, names, rare jargon. A typo-laden or
          hyper-specific token that BM25 would match perfectly can wash out to a generic direction in
          vector space.
        </p>
        <Callout kind="tip" title="The complementary failure">
          Any system where the two rankers’ weaknesses don’t overlap is a system worth fusing — which is
          most of them.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 2 — Reciprocal rank fusion, step by step</H2>
        <p>
          You could fuse scores — but BM25 scores (0…∞, unbounded) and cosine similarities (−1…1) aren’t
          comparable, so calibration is a nightmare. <strong>Reciprocal Rank Fusion (RRF)</strong> sidesteps
          calibration entirely: it uses only <em>ranks</em>. Each document gets
          <strong> 1/(k + rank)</strong> from every list (k = 60 is the standard from the{' '}
          <a className={extClass} href="https://dl.acm.org/doi/10.1145/1571941.1571977" target="_blank" rel="noopener noreferrer">
            Cormack et al. RRF paper
          </a>
          ), and the sums become the fused score. Rank 1 earns 1/61 ≈ 0.0164, rank 2 earns 1/62 ≈ 0.0161 —
          close together, which is why RRF is robust to a single list’s quirks.
        </p>
        <p>
          The lab runs both rankers live over one corpus — real BM25 from this site’s library, plus a toy
          concept-embedder standing in for dense retrieval — then fuses them with the formula, term by term:
        </p>
        <WidgetFrame
          title="Widget — Hybrid fusion lab"
          subtitle="Watch BM25 and dense disagree, then reveal the RRF arithmetic document by document. Drag k to re-weight top ranks."
        >
          <HybridFusion />
        </WidgetFrame>
        <CodeBlock
          language="python"
          filename="rrf.py"
          code={`def rrf(rankings: list[list[str]], k: int = 60) -> dict[str, float]:
    """rankings = [bm25_doc_ids, dense_doc_ids, ...] — best first."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking, start=1):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank)
    return dict(sorted(scores.items(), key=lambda kv: -kv[1]))`}
        />
        <p>
          The same fusion idea powers hybrid search in engines like{' '}
          <a className={extClass} href="https://weaviate.io/blog/hybrid-search-explained" target="_blank" rel="noopener noreferrer">
            Weaviate
          </a>{' '}
          and Elasticsearch — it became the default because it just works.
        </p>
      </Prose>

      <Prose>
        <H2>Step 3 — Cross-encoder rerankers</H2>
        <p>
          Fusion merges two <em>fast, shallow</em> views. For the final top handful, you can afford one
          <em> slow, deep</em> check: a <strong>cross-encoder</strong> reads the query and a candidate
          document <em>together</em> — concatenated, with full attention between them — and outputs a
          relevance score. A bi-encoder (MiniLM-style) embeds query and document <em>separately</em>, so it
          can never model how “forgot” in the query interacts with “credentials” in the document; a
          cross-encoder sees everything. The price: one transformer forward-pass per pair, so it can only
          rerank the ~25–100 candidates fusion shortlists. The{' '}
          <a
            className={extClass}
            href="https://huggingface.co/cross-encoders/ms-marco-MiniLM-L-6-v2"
            target="_blank"
            rel="noopener noreferrer"
          >
            ms-marco MiniLM cross-encoders
          </a>{' '}
          are the standard off-the-shelf choice.
        </p>
        <CodeBlock
          language="python"
          filename="rerank.py"
          code={`from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoders/ms-marco-MiniLM-L-6-v2")
pairs = [(query, doc.text) for doc in candidates[:50]]     # fusion's shortlist
scores = reranker.predict(pairs)                            # one pass per pair
reranked = [doc for _, doc in sorted(zip(scores, candidates[:50]),
                                     key=lambda t: -t[0])][:5]`}
        />
        <Callout kind="info" title="The full hybrid stack">
          BM25 + dense → RRF fusion → cross-encoder rerank of the top ~50 → top 5 into the prompt (
          <ModuleLink id="rag" />). Every stage narrows the candidate set; every stage costs more per
          candidate.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 4 — When each stage pays off</H2>
        <ComparisonTable
          columns={[
            { id: 'scope', label: 'Scope' },
            { id: 'sees', label: 'What it sees' },
            { id: 'cost', label: 'Cost' },
            { id: 'pays', label: 'Pays off when' },
          ]}
          rows={[
            {
              label: 'BM25 (lexical)',
              values: {
                scope: 'Every doc in the index',
                sees: 'Exact tokens — codes, names, typos',
                cost: 'Microseconds per query',
                pays: 'Always — precision on rare tokens, zero ML infra',
              },
            },
            {
              label: 'Dense (bi-encoder)',
              values: {
                scope: 'Every doc in the index',
                sees: 'Meaning — synonyms, paraphrase',
                cost: 'Embedding pass per query + ANN walk',
                pays: 'Vocabulary mismatch matters — natural-language corpora',
              },
            },
            {
              label: 'RRF fusion',
              values: {
                scope: 'Both rank lists',
                sees: 'Ranks only — no score calibration needed',
                cost: 'A dict add per document',
                pays: 'Always with hybrid — 2-line code, no tuning',
              },
            },
            {
              label: 'Cross-encoder rerank',
              values: {
                scope: 'Top ~25–100 candidates',
                sees: 'Query + document jointly, full attention',
                cost: 'One forward pass per pair',
                pays: 'Quality-critical top-5 (RAG answers), latency budget permits',
              },
            },
          ]}
        />
        <Callout kind="warn" title="Don’t skip to the fancy part">
          A cross-encoder can only reorder what fusion found, and fusion can only fuse what retrieval
          recalled. Fix recall first; the stack amplifies, never rescues.
        </Callout>
      </Prose>

      <KeyTakeaways
        points={[
          'BM25 misses meaning (synonyms), dense misses exactness (codes, names) — their failures barely overlap, which is why hybrid wins.',
          'RRF fuses rank lists with Σ 1/(k + rank), k = 60: no score calibration, two lines of code, remarkably robust.',
          'Cross-encoders read query + document jointly for the sharpest relevance signal — priced at one forward pass per pair, so they rerank shortlists only.',
          'The standard stack: BM25 + dense → RRF → cross-encoder top-5 → RAG prompt.',
          'Each stage can only reorder what earlier stages recalled — invest in recall before reranking polish.',
        ]}
      />
    </>
  )
}
