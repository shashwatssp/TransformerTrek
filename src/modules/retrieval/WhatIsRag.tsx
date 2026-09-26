import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
  StepList,
  WidgetFrame,
} from '../../components/ui'
import RAGPipelineFlow from '../../widgets/retrieval/RAGPipelineFlow'
import { extClass } from '../../widgets/retrieval/shared'

export default function WhatIsRag() {
  return (
    <>
      <Prose>
        <H2>Step 1: Why RAG exists: knowledge vs behavior</H2>
        <p>
          An LLM’s weights hold two very different things. <strong>Behavior</strong> is how the model
          writes, reasons, and follows instructions. <strong>Knowledge</strong> is what it knows, facts
          that were true when training stopped, and only the facts that made it into the training data.
          Ask a model about your company’s refund policy and you’re asking for knowledge it was never
          given.
        </p>
        <p>
          You could bake knowledge in with more training, but that is slow, expensive, and hard to
          update. <strong>Retrieval-Augmented Generation (RAG)</strong> takes the other path: at question
          time, fetch relevant text from a corpus you control and paste it into the prompt. The{' '}
          <a className={extClass} href="https://arxiv.org/abs/2005.11401" target="_blank" rel="noopener noreferrer">
            original RAG paper (Lewis et al., 2020)
          </a>{' '}
          framed this as coupling a parametric memory (the model) with a non-parametric memory (a searchable
          index). The model supplies behavior; the index supplies facts.
        </p>
        <Callout kind="tip" title="The one-sentence version">
          RAG = open-book exams. The model doesn’t need to have memorized your data, it needs to read
          fast and cite honestly.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 2: Stages 1–2: ingest, chunk, embed</H2>
        <p>
          Before any question is asked, you build the index. <strong>Ingest</strong>: load documents from
          wherever they live (PDFs, wikis, tickets) and clean them, headers, page numbers, and boilerplate
          become noise later. <strong>Chunk + embed</strong>: split each document into pieces small enough
          to quote (a few hundred tokens, with overlap so sentences don’t get cut in half), then run each
          chunk through an embedding model to get a vector, a list of numbers where similar meaning lands
          close together. You’ll see exactly how that geometry works in <ModuleLink id="vector-search" />.
        </p>
        <p>
          Chunking is a real decision, not plumbing: too small and chunks lose context (“blinks red” with
          no mention of <em>what</em>); too large and one chunk dilutes several topics, hurting retrieval
          precision. Most RAG failures you’ll meet later in this module trace back to this stage.
        </p>
      </Prose>

      <Prose>
        <H2>Step 3: Stages 3–4: query and retrieve</H2>
        <p>
          A question arrives. It gets embedded with the <em>same model</em> as the corpus, mixing models
          puts the vectors in incompatible spaces. Then the system searches the index for the chunks whose
          vectors (or, in lexical search like <ModuleLink id="bm25" />, whose words) best match the query,
          and keeps the <strong>top-k</strong>, typically 3–10 candidates.
        </p>
        <p>
          The widget below runs this loop on a tiny support corpus. Every score you see is computed in your
          browser, the retrieval stage uses the real BM25 ranking function from this site’s library.
        </p>
      </Prose>

      <WidgetFrame
        title="Widget: RAG pipeline flow"
        subtitle="Step through all 7 stages on a live mini-corpus, then break retrieval on purpose: distractor, empty, and stale-index scenarios."
      >
        <RAGPipelineFlow />
      </WidgetFrame>

      <Prose>
        <H2>Step 4: Stage 5: rerank and assemble context</H2>
        <p>
          The first-pass retrieval optimizes for speed, it must look at every chunk in the index. A{' '}
          <strong>reranker</strong> re-scores only the top candidates with a slower, sharper signal (a
          cross-encoder that reads query and chunk together, more in <ModuleLink id="hybrid-search" />),
          then the best chunks are stitched into a context block. In the widget, stage 5 shows this
          reorder step, watch how a plausible-but-wrong chunk can get <em>promoted</em> when its surface
          features look right.
        </p>
        <Callout kind="warn" title="Garbage in, garbage grounded-out">
          Reranking improves the order of whatever retrieval found. If the truth never made it into the
          top candidates, no reranker can save you.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 5: Stages 6–7: prompt, generate, cite</H2>
        <p>
          Stage 6 wraps the context in instructions: <em>“Answer using ONLY the context. Cite chunk
          ids.”</em> Stage 7 is the model doing what it does best, writing. Grounding doesn’t make the
          model <em>unable</em> to hallucinate, but citing chunk ids gives every sentence a paper trail
          you can check. That audit trail is something fine-tuning can never give you (see{' '}
          <ModuleLink id="rag-vs-fine-tuning" />).
        </p>
        <CodeBlock
          language="python"
          filename="rag_loop.py"
          code={`# The RAG loop in ~15 lines (pseudocode with real library names)
docs = load_documents("handbook/")                      # 1 ingest
chunks = chunk_documents(docs, size=400, overlap=50)    # 2 chunk
index = VectorIndex()
index.add([embed(c.text) for c in chunks])              # 3 embed

def answer(question: str) -> str:
    q = embed(question)                                 # 4 query
    hits = index.search(q, top_k=4)                     # 5 retrieve
    hits = rerank(question, hits)[:4]                   # 6 rerank
    context = "\\n\\n".join(f"[{h.id}] {h.text}" for h in hits)
    prompt = f"Answer using ONLY the context. Cite chunk ids.\\n\\n{context}\\n\\nQ: {question}"
    return llm.generate(prompt)                         # 7 generate`}
        />
        <p>
          The full pipeline has more moving parts in production, the{' '}
          <a
            className={extClass}
            href="https://docs.aws.amazon.com/prescriptive-guidance/latest/retrieval-augmented-generation-options/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AWS Prescriptive Guidance catalog
          </a>{' '}
          maps the architecture options end to end, and the{' '}
          <a className={extClass} href="https://python.langchain.com/docs/tutorials/rag/" target="_blank" rel="noopener noreferrer">
            LangChain RAG tutorial
          </a>{' '}
          is a hands-on companion.
        </p>
      </Prose>

      <Prose>
        <H2>Step 6: Failure modes: retrieval that lies</H2>
        <p>
          “With vs without RAG” isn’t a guaranteed win, it’s a bet that retrieval finds the right text.
          Switch the scenario in the widget to watch each failure unfold:
        </p>
        <StepList
          steps={[
            'Without RAG: the model answers from parametric memory, fluent, confident, and unconstrained by your facts.',
            'Empty retrieval: nothing matches, so a well-behaved assistant refuses. A naive one hallucinates anyway.',
            'Distractor chunk: a plausible-but-wrong chunk outranks the truth and the answer inherits the error, with a citation.',
            'Stale index: the chunk was true once. Grounding anchors the answer to outdated facts.',
          ]}
        />
        <H3>With vs without, side by side</H3>
        <ComparisonTable
          columns={[
            { id: 'plain', label: 'Without RAG (closed-book)' },
            { id: 'rag', label: 'With RAG (open-book)' },
          ]}
          rows={[
            {
              label: 'Where the answer comes from',
              values: {
                plain: 'Frozen weights, training data only',
                rag: 'Chunks fetched at question time',
              },
            },
            {
              label: 'Fresh / private data',
              values: {
                plain: 'Blind, never saw it',
                rag: 'Available if indexed',
              },
            },
            {
              label: 'Provenance',
              values: {
                plain: 'None, cannot cite its source',
                rag: 'Chunk ids you can audit',
              },
            },
            {
              label: 'Characteristic failure',
              values: {
                plain: 'Confident hallucination',
                rag: 'Wrong or stale chunk retrieved',
              },
            },
            {
              label: 'Fix when knowledge changes',
              values: {
                plain: 'Retrain (days–months)',
                rag: 'Update the index (seconds)',
              },
            },
          ]}
        />
        <Callout kind="info" title="Read next">
          When to <em>choose</em> RAG over changing the model’s weights is a real engineering decision,{' '}
          <ModuleLink id="rag-vs-fine-tuning" /> puts both side by side.
        </Callout>
      </Prose>

      <KeyTakeaways
        points={[
          'RAG separates knowledge (in an index you control) from behavior (in the model), updates become an indexing problem, not a training problem.',
          'The 7 stages: ingest → chunk+embed → query → retrieve top-k → rerank+assemble → prompt → generate with citations.',
          'Every stage can fail silently; the most common are bad chunking, distractor chunks, and stale indexes, all visible in the widget.',
          'Grounding gives provenance: cited chunk ids turn "trust me" into an auditable paper trail.',
        ]}
      />
    </>
  )
}
