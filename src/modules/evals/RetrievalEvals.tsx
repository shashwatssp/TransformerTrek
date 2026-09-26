/**
 * Module 7.2: Measuring Retrieval Quality
 * Body content follows the registry steps for id 'retrieval-evals'.
 */
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'

const METRICS_SNIPPET = `// Retrieval metrics from scratch (TypeScript), 20 lines, no library needed
type Labeled = { queryId: string; rankedDocIds: string[]; relevant: Set<string> }

/** Fraction of queries where a relevant doc made the top-k. Your recall ceiling. */
export function recallAtK(rows: Labeled[], k: number): number {
  const hits = rows.filter((r) => r.rankedDocIds.slice(0, k).some((d) => r.relevant.has(d)))
  return hits.length / rows.length
}

/** Mean of 1/rank of the FIRST relevant doc. Punishes answers buried deep. */
export function mrr(rows: Labeled[]): number {
  const rr = rows.map((r) => {
    const idx = r.rankedDocIds.findIndex((d) => r.relevant.has(d))
    return idx === -1 ? 0 : 1 / (idx + 1)
  })
  return rr.reduce((a, b) => a + b, 0) / rows.length
}

/** nDCG@k: position-discounted gain over graded relevance (order matters). */
export function ndcgAtK(rows: Labeled[], k: number): number {
  const dcg = (gains: number[]) =>
    gains.reduce((acc, g, i) => acc + g / Math.log2(i + 2), 0)
  const perQuery = rows.map((r) => {
    const gains = r.rankedDocIds.slice(0, k)
      .map((d) => (r.relevant.has(d) ? 1 : 0)) // use graded 0..3 here when you have it
    const ideal = [...gains].sort((a, b) => b, a)
    const idcg = dcg(ideal)
    return idcg === 0 ? 0 : dcg(gains) / idcg
  })
  return perQuery.reduce((a, b) => a + b, 0) / rows.length
}`

/**
 * Module 7.2: Measuring Retrieval Quality
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline, sources).
 */
export default function RetrievalEvals() {
  return (
    <>
      <Prose>
        <p>
          <ModuleLink id="evals" /> covered how models are judged. This module covers the half that
          LLM benchmarks can't see: whether your <em>retriever</em> finds the right context at all.
          This is where most production "the AI is wrong" bugs actually live, and the metrics are
          small enough to implement yourself, in TypeScript, the language your full stack already
          speaks.
        </p>
      </Prose>

      {/* Step 1 */}
      <H2>Step 1: Generation metrics hide retrieval failures</H2>
      <Prose>
        <p>
          Here's the trap. Your RAG product answers badly. Is the <em>generator</em> bad, or did
          the <em>retriever</em> fetch the wrong chunks, so the generator was handed garbage? An
          end-to-end score cannot tell you. The discipline that separates people who've shipped
          retrieval from people who've read about it: <strong>localize before you fix</strong>.
          Instrument the boundary, log what was retrieved for every query, and label a small set
          of queries with the documents that <em>should</em> be retrieved. That labeled set, a{' '}
          <strong>golden set</strong>, turns "it feels worse" into a number.
        </p>
        <Callout kind="info" title="The one-line rule">
          If the right chunk never reached the prompt, no generator on Earth can save you. Recall
          is the ceiling on everything else.
        </Callout>
      </Prose>

      {/* Step 2 */}
      <H2>Step 2: Recall@k and precision@k</H2>
      <Prose>
        <p>
          <strong>Recall@k</strong> asks: for what fraction of queries did at least one relevant
          document make the top-k? (With multiple relevant docs, the stricter variant counts the
          fraction of them you captured.) It is your <em>ceiling</em>, everything downstream
          inherits it. <strong>Precision@k</strong> asks the complementary question: of the k
          chunks you fetched, how many were relevant, your <em>noise</em> measure, which matters
          because irrelevant context dilutes the generator's attention (and your token bill). The
          k you choose is a real decision: k=20 fed through a reranker is a different system than
          k=5 fed straight to the prompt.
        </p>
      </Prose>

      {/* Step 3 */}
      <H2>Step 3: MRR: how high is the first hit?</H2>
      <Prose>
        <p>
          <strong>Mean Reciprocal Rank</strong> scores each query as 1 ÷ (position of the first
          relevant result), then averages. A system that always puts the answer first scores 1.0;
          buried on line ten, 0.1. MRR is the metric for <em>single-answer lookups</em>, "what's
          the refund policy?" has one right document and users who read the first result. Its
          blind spot: queries with several relevant documents, where the second and third good
          hits contribute nothing.
        </p>
      </Prose>

      {/* Step 4 */}
      <H2>Step 4: nDCG: position-aware, graded relevance</H2>
      <Prose>
        <p>
          Real corpora aren't binary: a chunk can be <em>the</em> answer, <em>partially</em>{' '}
          relevant, or merely on-topic. <strong>Normalized Discounted Cumulative Gain</strong>
          handles grades: each result contributes its relevance discounted by log₂(position), so a
          highly relevant doc at rank 1 beats the same doc at rank 5; the score is normalized
          against the ideal ordering of your labels. nDCG@k is the workhorse ranking metric of
          information retrieval (the{' '}
          <a href="https://arxiv.org/abs/2104.08663" target="_blank" rel="noopener noreferrer">BEIR benchmark</a>{' '}
          standardizes exactly this across datasets). Use it when you have graded labels and
          ranking order genuinely matters; use recall@k when coverage is the question.
        </p>
      </Prose>

      {/* Step 5 */}
      <H2>Step 5: A five-minute golden set, in TypeScript</H2>
      <Prose>
        <p>
          Thirty to fifty real queries, each labeled with its relevant document IDs, is enough to
          catch almost any regression in chunking, embedding swaps, or hybrid weights, and the
          metrics themselves are small:
        </p>
      </Prose>
      <CodeBlock language="typescript" filename="retrieval_metrics.ts" code={METRICS_SNIPPET} />
      <Prose>
        <p>
          Wire them into CI: run the golden set on every change to chunk size, embedding model, or
          fusion weight, and fail the change when recall@k drops. For the generation side, is the
          answer faithful to what was retrieved, does it cite, does it abstain, the LLM-judged
          metrics from <a href="https://docs.ragas.io/" target="_blank" rel="noopener noreferrer">RAGAS</a>{' '}
          (faithfulness, context precision/recall) run on the same labeled set. Two layers, one
          habit: separate the planes, measure both, and never ship a retrieval change you didn't
          score. For the serving-side numbers that bound latency and cost, see{' '}
          <ModuleLink id="serving-inference" />.
        </p>

        <KeyTakeaways
          points={[
            'Most "wrong answer" bugs are retrieval bugs; log the retrieval boundary and localize before fixing generation.',
            'A golden set, 30-50 real queries labeled with relevant docs, turns vibes into numbers; it is cheap and private.',
            'Recall@k is the ceiling (did a relevant chunk make top-k?), precision@k is the noise (of the k, how many were relevant?).',
            'MRR scores single-answer lookups by first-hit position; nDCG handles graded relevance with position discounting when order matters.',
            'Run the metrics in CI on every retrieval change; RAGAS-style faithfulness metrics judge the generation side on the same labels.',
          ]}
        />
      </Prose>
    </>
  )
}
