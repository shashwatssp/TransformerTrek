import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  H3,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import DecisionFramework from '../../widgets/retrieval/DecisionFramework'
import { extClass } from '../../widgets/retrieval/shared'

export default function RagVsFineTuning() {
  return (
    <>
      <Prose>
        <H2>Step 1 — The core distinction: knowledge vs behavior</H2>
        <p>
          Keep one distinction and most “should we fine-tune?” meetings shrink to five minutes. A model’s
          weights encode <strong>behavior</strong> — how it writes, formats, reasons, follows process. They
          also encode <strong>knowledge</strong> — facts about the world, frozen at training time. The two
          need different fixes:
        </p>
        <p>
          <strong>RAG changes what the model can see.</strong> It retrieves text at question time and pastes
          it into the prompt (<ModuleLink id="rag" />). Nothing about the model changes — which also means
          nothing about the model can <em>learn</em> from it.
        </p>
        <p>
          <strong>Fine-tuning changes what the model is like.</strong> Gradient updates on curated examples
          shift behavior permanently — tone, output format, domain vocabulary, a knack for your schema. But
          facts absorbed this way are silent, lossy, and expiring: you can’t cite them, audit them, or
          refresh them without another training run. The mechanics are covered in{' '}
          <ModuleLink id="fine-tuning" />.
        </p>
        <Callout kind="tip" title="Rule of thumb">
          New facts the model must <em>read</em> → retrieval. New behavior the model must{' '}
          <em>exhibit</em> → training. Most failed projects tried to do the first with the second.
        </Callout>
      </Prose>

      <Prose>
        <H2>Step 2 — Side by side: how each works</H2>
        <p>
          The{' '}
          <a
            className={extClass}
            href="https://docs.aws.amazon.com/prescriptive-guidance/latest/retrieval-augmented-generation-options/rag-vs-fine-tuning.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            AWS Prescriptive Guidance comparison
          </a>{' '}
          lays out the advantages and disadvantages of each path. Condensed to the dimensions that actually
          decide projects:
        </p>
        <ComparisonTable
          columns={[
            { id: 'rag', label: 'RAG' },
            { id: 'ft', label: 'Fine-tuning' },
          ]}
          rows={[
            {
              label: 'What it changes',
              values: {
                rag: 'The prompt — model untouched',
                ft: 'The weights — behavior itself',
              },
            },
            {
              label: 'Data needed',
              values: {
                rag: 'Your raw documents (no labels)',
                ft: 'Hundreds–thousands of curated (input → ideal output) pairs',
              },
            },
            {
              label: 'Update path',
              values: {
                rag: 'Re-index a document — seconds, instant rollout',
                ft: 'New training run + evaluation — days to weeks',
              },
            },
            {
              label: 'Cost profile',
              values: {
                rag: 'Cheap upfront; pay per-query retrieval + longer prompts',
                ft: 'Expensive upfront (data + training); shorter prompts afterwards',
              },
            },
            {
              label: 'Latency',
              values: {
                rag: 'Adds retrieval hop (tens of ms typical)',
                ft: 'None beyond base model',
              },
            },
            {
              label: 'Provenance',
              values: {
                rag: 'Citations per answer (chunk ids)',
                ft: 'None — knowledge is melted into weights',
              },
            },
            {
              label: 'Failure modes',
              values: {
                rag: 'Wrong/stale chunk retrieved; index drift',
                ft: 'Catastrophic forgetting; facts go stale silently; overfit to training style',
              },
            },
            {
              label: 'Can it teach new behavior?',
              values: {
                rag: 'No — context helps, but format/style stay',
                ft: 'Yes — this is its superpower',
              },
            },
          ]}
        />
        <CodeBlock
          language="python"
          filename="same_goal_two_paths.py"
          code={`# RAG: change knowledge without touching weights
index.add(embed_batch(new_docs))         # new facts, same model, live instantly

# Fine-tuning: change behavior without touching knowledge
trainer.train(peft="lora", rank=16,      # new format & tone, same facts
              dataset=curated_style_pairs)`}
        />
      </Prose>

      <Prose>
        <H2>Step 3 — The 4-question decision framework</H2>
        <p>
          AWS Prescriptive Guidance recommends deciding with four questions, in order. Answer them for your
          project — the widget scores your answers live and explains every point it awards:
        </p>
        <WidgetFrame
          title="Widget — Decision framework"
          subtitle="Four questions from AWS Prescriptive Guidance; the scorecard and recommendation update as you answer."
        >
          <DecisionFramework />
        </WidgetFrame>
        <Callout kind="warn" title="The trap the framework prevents">
          Teams fine-tune to inject knowledge because it feels like “teaching.” It works on the training
          split — then the knowledge changes, or a user asks for a source, and the approach collapses.
        </Callout>
      </Prose>

      <Prose>
          <H2>Step 4 — When to combine: hybrid strategies</H2>
        <p>
          The choice is not either/or. The strongest production systems layer both, each doing the job it’s
          good at — and one strategy even fine-tunes the retrieval model itself, distilling a domain expert
          from a general one (<ModuleLink id="minilm" /> shows how):
        </p>
        <ComparisonTable
          columns={[
            { id: 'strategy', label: 'Hybrid strategy' },
            { id: 'works', label: 'What it solves' },
            { id: 'watch', label: 'Watch out for' },
          ]}
          rows={[
            {
              label: 'Fine-tune for format, RAG for facts',
              values: {
                strategy: 'LoRA teaches schema/tone; retrieval injects live knowledge at answer time',
                works: 'The default enterprise pattern — stable behavior, fresh facts',
                watch: 'Two systems to maintain and evaluate',
              },
            },
            {
              label: 'RAG first, fine-tune second',
              values: {
                strategy: 'Ship retrieval in weeks; fine-tune later only if behavior gaps persist',
                works: 'Time-to-value; the fine-tuning scope is revealed by real failures',
                watch: 'Requires retrieval evals before the training budget conversation',
              },
            },
            {
              label: 'Fine-tune the retriever, not the generator',
              values: {
                strategy: 'Contrastive training on a sentence encoder (MiniLM-style) adapts search to your domain',
                works: 'Domain jargon and synonyms without touching the LLM',
                watch: 'Needs click-through or labeled pairs',
              },
            },
            {
              label: 'Periodic fine-tune + RAG on top',
              values: {
                strategy: 'Scheduled training for slow-moving domain structure; RAG for everything that moves',
                works: 'Regulated domains with both stable doctrine and daily updates',
                watch: 'Drift between training runs; version both index and weights',
              },
            },
          ]}
        />
      </Prose>

      <Prose>
        <H2>Step 5 — Evidence from the field: what studies found</H2>
        <p>
          The clearest head-to-head numbers come from{' '}
          <a className={extClass} href="https://arxiv.org/abs/2401.08406" target="_blank" rel="noopener noreferrer">
            Balaguer et al. (2024), “RAG vs Fine-Tuning: Pipelines, Tradeoffs, and a Case Study on
            Agriculture”
          </a>
          . On their agriculture QA benchmark, measured accuracy moved like this:
        </p>
        <ComparisonTable
          columns={[
            { id: 'pipeline', label: 'Pipeline' },
            { id: 'result', label: 'Measured accuracy' },
            { id: 'meaning', label: 'What it suggests' },
          ]}
          rows={[
            {
              label: 'Base model, no adaptation',
              values: {
                pipeline: 'Prompt only',
                result: 'Baseline',
                meaning: 'The starting line every method must beat',
              },
            },
            {
              label: 'Fine-tuned model',
              values: {
                pipeline: 'LoRA fine-tuning on domain data',
                result: '+6 percentage points over baseline',
                meaning: 'Training on the domain genuinely helps',
              },
            },
            {
              label: 'Fine-tuned + RAG',
              values: {
                pipeline: 'RAG layered on the fine-tuned model',
                result: '+5 percentage points further',
                meaning: 'Even a fine-tuned model still needs fresh, cited context',
              },
            },
          ]}
        />
        <p>
          Two takeaways generalize. First, the two methods stack — the best pipeline was fine-tuning{' '}
          <em>and</em> RAG, because they fix different things. Second, RAG alone was the cheapest path to
          most of the gain: no labels, no training runs, and every answer carries a citation. The{' '}
          <a
            className={extClass}
            href="https://aws.amazon.com/blogs/machine-learning/tailoring-foundation-models-for-your-business-needs-a-comprehensive-guide-to-rag-fine-tuning-and-hybrid-approaches/"
            target="_blank"
            rel="noopener noreferrer"
          >
            AWS field guide to RAG, fine-tuning, and hybrid approaches
          </a>{' '}
          reaches the same conclusion from deployment experience: default to RAG, add fine-tuning when
          behavior — not knowledge — is the bottleneck.
        </p>
        <H3>The 30-second summary</H3>
        <KeyTakeaways
          points={[
            'Knowledge vs behavior is the fork in the road: retrieval changes what the model sees; training changes what the model is like.',
            'Fine-tuning needs labeled data and a re-train per update; RAG needs documents and re-indexes in seconds.',
            'Only RAG provides provenance — weights cannot cite their sources.',
            'The AWS 4-question framework (what’s missing? how often does it change? citations needed? ML budget?) resolves most decisions in minutes.',
            'arXiv 2401.08406 measured them stacking: fine-tuning +6pp, RAG +5pp further, combined best.',
          ]}
        />
      </Prose>
    </>
  )
}
