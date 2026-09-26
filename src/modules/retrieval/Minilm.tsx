import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import MiniLMViz from '../../widgets/retrieval/MiniLMViz'
import { extClass } from '../../widgets/retrieval/shared'

export default function Minilm() {
  return (
    <>
      <Prose>
        <H2>Step 1 — Why distill a transformer?</H2>
        <p>
          The embedding model behind most RAG demos is not a giant. <strong>all-MiniLM-L6-v2</strong> —
          “the MiniLM” — is a <em>student</em> copy of a much bigger <em>teacher</em>: same behavior on
          similarity tasks, a fraction of the size. Distillation is copying by training: the student is
          rewarded not for matching labeled answers but for matching the teacher’s internal behavior.
          Why bother? Because retrieval runs the embedding model on <em>every</em> document and{' '}
          <em>every</em> query — when you’re embedding 10 million chunks, a 22M-parameter student that is
          5× faster and 5× smaller than its 109M teacher is not a nice-to-have (the{' '}
          <a className={extClass} href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2" target="_blank" rel="noopener noreferrer">
            model card
          </a>{' '}
          lists the exact numbers). The full recipe is from{' '}
          <a className={extClass} href="https://arxiv.org/abs/1908.06954" target="_blank" rel="noopener noreferrer">
            Wang et al. — MiniLM: Deep Self-Attention Distillation
          </a>.
        </p>
        <Callout kind="info" title="Prerequisites, gently">
          This module leans on attention mechanics — if Q/K/V are fuzzy, skim{' '}
          <ModuleLink id="attention" /> first, and <ModuleLink id="vector-search" /> for why embedding
          geometry matters.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 2 — The 6-layer architecture</H2>
        <p>
          MiniLM’s student is a standard transformer encoder, shrunk: <strong>6 layers</strong> (half the
          teacher’s 12) and <strong>384 hidden dims</strong> (half of 768), ~22M parameters. The clever part
          is <em>what</em> it imitates: not just the teacher’s final output, but its{' '}
          <strong>self-attention distributions</strong> — the attention maps themselves, layer by layer.
          Matching internal structure transfers more of “how the teacher reads” than matching outputs alone.
        </p>
        <WidgetFrame
          title="Widget — MiniLM inside-out"
          subtitle="Three tabs: the teacher→student layer diagram, an animated mean-pooling table, and a 384-dim heatmap with a sentence-pair similarity meter."
        >
          <MiniLMViz />
        </WidgetFrame>
      </Prose>

      <Prose>
        <H2>Step 3 — Mean pooling: sentence → vector</H2>
        <p>
          An encoder outputs one vector per token — but sentence search needs one vector per sentence.
          MiniLM’s answer is the simplest thing that works: <strong>mean pooling</strong> — average the
          token vectors across every dimension. (SBERT’s authors found this beats using the single [CLS]
          token for sentence similarity — see{' '}
          <a className={extClass} href="https://arxiv.org/abs/1908.10084" target="_blank" rel="noopener noreferrer">
            Reimers &amp; Gurevych, Sentence-BERT
          </a>
          .) The pooling tab above animates the arithmetic; nothing is hidden.
        </p>
        <CodeBlock
          language="python"
          filename="minilm_quickstart.py"
          code={`from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
#   6 layers, 384 dims, mean pooling, ~22M parameters

emb = model.encode(["How do I reset my password?",
                    "I forgot my login credentials"])
sim = model.similarity(emb[0], emb[1])   # ≈ 0.5 — meaning, not word overlap`}
        />
      </Prose>

      <Prose>
        <H2>Step 4 — Contrastive training: pull matches together</H2>
        <p>
          Distillation gives the student the teacher’s language understanding. What makes it a{' '}
          <em>retrieval</em> model is <strong>contrastive training</strong> (the SBERT recipe): show the
          encoder pairs — a sentence, its true paraphrase, and hard impostors — and train so that matched
          pairs score high (cosine close to 1) while mismatched pairs score low. Every training step{' '}
          <em>pulls</em> true matches together in space and <em>pushes</em> impostors apart. That is why the
          geometry from <ModuleLink id="vector-search" /> exists at all: the space is carved by this loss.
        </p>
        <Callout kind="tip" title="Where the training pairs come from">
          The classic recipe trains on NLI (entailment ≈ match) plus mined hard negatives, then fine-tunes
          on STS-B similarity scores — see the{' '}
          <a className={extClass} href="https://sbert.net/" target="_blank" rel="noopener noreferrer">
            SBERT documentation
          </a>{' '}
          for the full pipeline.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 5 — 384 dims in action</H2>
        <p>
          The output is a 384-dimension unit vector — 384 numbers that <em>are</em> the sentence, at least
          for search purposes. The heatmap tab shows the shape: no single dimension means anything alone;
          <em> direction</em> carries the meaning. Two sentences become a single cosine similarity, computed
          in 384 multiply-adds — cheap enough to compare against millions of vectors in a hardware-optimized
          loop.
        </p>
        <p>
          That closes the loop: <ModuleLink id="rag" /> retrieves with models like this one,{' '}
          <ModuleLink id="bm25" /> remains its lexical counterpart, and <ModuleLink id="hybrid-search" />{' '}
          fuses the two. Small, fast, good-enough — MiniLM is the workhorse that made semantic search a
          default rather than a luxury.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Distillation copies a big teacher into a small student by matching internal behavior, not just outputs — 12L/768 → 6L/384, ~109M → ~22M params.',
          'MiniLM’s signature trick: distill the teacher’s self-attention distributions layer by layer.',
          'Mean pooling averages all token vectors into one sentence vector (384 dims), beating [CLS] pooling for similarity.',
          'Contrastive training carves the space: matched pairs pulled together, impostors pushed apart.',
          'The result: 384-dim unit vectors where search = cosine = 384 multiply-adds — fast enough for million-vector indexes.',
        ]}
      />
    </>
  )
}
