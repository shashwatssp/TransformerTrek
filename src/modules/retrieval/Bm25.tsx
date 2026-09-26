import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import BM25Lab from '../../widgets/retrieval/BM25Lab'
import { extClass } from '../../widgets/retrieval/shared'

export default function Bm25() {
  return (
    <>
      <Prose>
        <H2>Step 1: TF-IDF refresher</H2>
        <p>
          Before embeddings, search engines ranked documents with one idea: a document is about “neutron
          star” if those words appear <em>often</em> in it (<strong>term frequency</strong>) and rarely
          elsewhere (<strong>inverse document frequency</strong>). Classic TF-IDF multiplies the two, 
          and has an ugly flaw: the score grows <em>linearly</em> with term frequency. A 10,000-word page
          mentioning “star” 40 times always beats a crisp 200-word page mentioning it 8 times. More isn’t
          proportionally more relevant, and <a className={extClass} href="https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables" target="_blank" rel="noopener noreferrer">BM25</a> fixes
          this with two corrections, k1 and b.
        </p>
        <Callout kind="math" title="The full BM25 score">
          score(q, d) = Σ<sub>terms</sub> IDF(t) · f(t,d)·(k₁+1) / ( f(t,d) + k₁·(1 − b + b·|d|/avgdl) )
. Don’t memorize it; the lab below animates each piece.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 2: Term-frequency saturation: k1</H2>
        <p>
          The numerator–denominator pair on the TF term does something TF-IDF never could: it{' '}
          <strong>saturates</strong>. The first mention of “star” earns a big jump, the second a smaller
          one, and by the tenth the curve is nearly flat, a document mentioning a word ten times is
          <em> not</em> ten times more about it. k1 (typically 1.2–2.0) controls how quickly that curve
          bends: k1 = 0 allows a single mention to count fully (a binary “is the word there?” scorer);
          larger k1 keeps rewarding repetition for longer before flattening toward the asymptote k₁+1.
        </p>
        <p>
          The chart in the lab below plots exactly this curve, drag k1 and watch the bend move.
        </p>
      </Prose>

      <Prose>
        <H2>Step 3: Length normalization: b</H2>
        <p>
          Longer documents naturally contain more words, of <em>any</em> word. Without correction, long
          documents win every query. The denominator’s <code>1 − b + b·|d|/avgdl</code> term is the fix: it
          scales each document’s TF ceiling by its length relative to the corpus average. b = 1 is full
          normalization (long docs are penalized hard), b = 0 disables length effects entirely, and the
          classic default b = 0.75 sits in between. In the lab, the two saturation lines, a short doc
          (0.6× average length) and a long one (1.8×), separate as you raise b.
        </p>
      </Prose>

      <Prose>
        <H2>Step 4: IDF: rare words matter</H2>
        <p>
          The IDF multiplier is the “what makes this word special” factor. BM25 uses a Lucene-style variant
          that stays positive even for common terms: IDF(t) = ln(1 + (N − df + 0.5)/(df + 0.5)). A word in
          1 of 6 documents (“neutron”) earns a large weight; a word in all 6 (“star” in an astronomy corpus)
          earns almost none. The lab prints the live IDF for every query term.
        </p>
        <CodeBlock
          language="python"
          filename="rank_bm25_demo.py"
          code={`from rank_bm25 import BM25Okapi

corpus = [doc.split() for doc in documents]
bm25 = BM25Okapi(corpus)                  # k1=1.5, b=0.75 defaults
scores = bm25.get_scores("neutron star".split())
best = sorted(range(len(corpus)), key=lambda i: -scores[i])[:3]`}
        />
      </Prose>

      <Prose>
        <H2>Step 5: Live lab: tune k1 and b yourself</H2>
        <p>
          The workbench runs the <em>real</em> Okapi BM25 implementation from this site’s library over a
          six-document astronomy corpus, every rank, IDF, and curve point below is computed in your
          browser as you drag:
        </p>
        <WidgetFrame
          title="Widget: BM25 lab"
          subtitle="Type a query (or use a preset), then drag k1 and b. Rankings, per-term contributions, and the saturation curve recompute live."
        >
          <BM25Lab />
        </WidgetFrame>
        <Callout kind="tip" title="Experiments worth trying">
          Query “neutron star”, then push k1 → 0: the ranking collapses to “does the word appear at all?”.
          Restore k1, then drag b → 0 and watch long documents creep up. Those two knobs are the entire
          personality of a lexical ranker.
        </Callout>
        <p>
          BM25 stays the lexical half of modern hybrid retrieval, its scores fuse with dense vector
          results in <ModuleLink id="hybrid-search" />, and it complements semantic search in{' '}
          <ModuleLink id="vector-search" />. The deep theory is Robertson &amp; Zaragoza’s{' '}
          <a
            className={extClass}
            href="https://dl.acm.org/doi/10.1561/1500000019"
            target="_blank"
            rel="noopener noreferrer"
          >
            The Probabilistic Relevance Framework: BM25 and Beyond
          </a>
          .
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'TF-IDF scores grow linearly with term frequency, long, repetitive documents win for the wrong reasons.',
          'k1 bends the TF curve: early mentions count a lot, later mentions saturate (toward k1+1).',
          'b normalizes document length: at 0.75 a long doc must earn its frequency against the corpus average (avgdl).',
          'Lucene-style IDF = ln(1 + (N − df + 0.5)/(df + 0.5)), rare terms get big weights, common ones stay positive but small.',
          'BM25 is a 1994-era ranking function that still anchors state-of-the-art hybrid retrieval.',
        ]}
      />
    </>
  )
}
