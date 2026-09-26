/**
 * Module 6.1: How LLMs Are Evaluated
 * Body content follows the registry steps for id 'evals'.
 */
import { getModule } from '../registry'
import { ModuleLayout } from '../../components/layout/ModuleLayout'
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import { BenchmarksChart } from '../../widgets/agents/BenchmarksChart'
import { PerplexityLab } from '../../widgets/agents/PerplexityLab'
import { LlmJudgeExplainer } from '../../widgets/agents/LlmJudgeExplainer'

const meta = getModule('evals')!

const pplCode = `import math
# PPL from per-token logprobs (what HF's perplexity guide does with real models)
logprobs = llm.logprobs("the agent calls a tool")   # natural log per token
avg_nll = -sum(logprobs) / len(logprobs)
ppl = math.exp(avg_nll)          # exp(cross-entropy) == branching factor
# in bits (log2), as in our bigram lab: PPL = 2 ** (total_bits / N)`

export default function Evals() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          Everything you've built so far, models (<ModuleLink id="pretraining" />), agents (
          <ModuleLink id="what-is-an-agent" />), protocols, is only as good as your ability to{' '}
          <em>measure</em> it. This module covers the measurement stack from the bottom up:
          perplexity, the benchmarks you'll see quoted everywhere, LLM-as-judge for open-ended
          quality, and why benchmarks quietly stop working.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1: Perplexity: measuring surprise</H2>
      <Prose>
        <p>
          Perplexity answers one question: on held-out text, how unsure was the model at each
          next token? Formally it's <code className="font-mono text-accent">exp(cross-entropy)</code>
, which reads as the <strong>effective branching factor</strong>: a PPL of 40 means the
          model behaves roughly as if it were undecided among 40 equally likely continuations at
          every token. Lower is better; it's the purest measure of a language model, needing no
          task format at all. The{' '}
          <a href="https://huggingface.co/docs/transformers/perplexity" target="_blank" rel="noopener noreferrer">Hugging Face perplexity guide</a>{' '}
          shows the standard recipe on real models.
        </p>
        <CodeBlock language="python" filename="ppl.py" code={pplCode} />
        <p>
          Its limits matter as much as its uses: PPL measures <em>text probability</em>, not
          helpfulness or truthfulness, and it's only comparable under identical tokenization, 
          the lab below rebuilds the whole concept from a count table so the machinery is
          visible:
        </p>
      </Prose>
      <WidgetFrame
        title="Perplexity lab, a real bigram model"
        subtitle="Counts, smoothed probabilities, per-token surprise, and PPL are computed in your browser from the pinned corpus. Pick a sentence and slide k."
      >
        <PerplexityLab />
      </WidgetFrame>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2: Benchmarks: MMLU, HumanEval, GSM8K</H2>
      <Prose>
        <p>
          Perplexity can't tell you if a model can <em>do</em> things, so the field standardized
          capability tests, benchmark = fixed task set + fixed prompt format + automatic scorer:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong><a href="https://arxiv.org/abs/2009.03300" target="_blank" rel="noopener noreferrer">MMLU</a></strong> (Hendrycks et al., 2020), 57-subject multiple-choice knowledge exam; accuracy scoring.</li>
          <li><strong><a href="https://arxiv.org/abs/2107.03374" target="_blank" rel="noopener noreferrer">HumanEval</a></strong> (Chen et al., 2021), 164 Python problems; pass@k by <em>executing</em> the code against unit tests.</li>
          <li><strong><a href="https://arxiv.org/abs/2110.14168" target="_blank" rel="noopener noreferrer">GSM8K</a></strong> (Cobbe et al., 2021), grade-school math word problems; exact-match final answers.</li>
        </ul>
        <p>
          The chart below uses real published numbers from the{' '}
          <a href="https://arxiv.org/abs/2303.08774" target="_blank" rel="noopener noreferrer">GPT-4 Technical Report</a>
, one model generation apart, identical protocols. Notice how uneven progress is per
          capability: that's why{' '}
          <a href="https://arxiv.org/abs/2209.01946" target="_blank" rel="noopener noreferrer">HELM</a>{' '}
          argues for holistic multi-metric reporting instead of a single scoreboard:
        </p>
      </Prose>
      <WidgetFrame
        title="Benchmark jumps, one generation apart"
        subtitle="GPT-3.5 vs GPT-4, published numbers, accuracy/pass rates in %, higher is better."
      >
        <BenchmarksChart />
      </WidgetFrame>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3: LLM-as-judge</H2>
      <Prose>
        <p>
          Most real usage is open-ended, there's no unit test for "is this a good pitch."
          The dominant solution: a strong model scores outputs against a rubric, pairwise or
          absolute. It's cheap, scales to thousands of comparisons, and correlates well with
          human preferences, but it inherits the judge's blind spots. The classic catalogue
          from{' '}
          <a href="https://arxiv.org/abs/2306.05685" target="_blank" rel="noopener noreferrer">Zheng et al. (MT-Bench, 2023)</a>:{' '}
          <strong>verbosity bias</strong> (longer looks better), <strong>position bias</strong>{' '}
          (first-listed wins more often), and <strong>self-preference</strong>. Try to out-judge
          the judge below:
        </p>
      </Prose>
      <WidgetFrame
        title="LLM-as-judge, exposed"
        subtitle="Tab 1: pick the better answer yourself. Tab 2: flip the rubric weights and watch the judge overrule you."
      >
        <LlmJudgeExplainer />
      </WidgetFrame>
      <Callout kind="tip" title="Making judges trustworthy">
        Randomize answer order and average, blind the judge to model identities, use rubrics
        with concrete anchors, and, for anything high-stakes, calibrate against a held-out
        set of human-labeled examples. A judge is a model: it needs its own{' '}
        <strong>eval</strong>.
      </Callout>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4: Contamination and benchmark rot</H2>
      <Prose>
        <p>
          Benchmarks die in two ways. <strong>Contamination</strong>: test questions leak into
          training data (they're scraped from the same web), so scores measure memorization, 
          <a href="https://arxiv.org/abs/2401.08525" target="_blank" rel="noopener noreferrer"> GSM1k (Scale/Valen, 2024)</a>{' '}
          rebuilt GSM8K-style problems from scratch and watched several models drop{' '}
          <em>hundreds</em> of rank points, exposing exactly that. <strong>Saturation</strong>{' '}
          (a.k.a. <em>benchmark rot</em>): as models improve, scores pile against the ceiling
          (MMLU is near exhausted among frontier models), the benchmark stops discriminating,
          and the field moves on, which is why leaderboards churn through "the new MMLU" every
          year or two.
        </p>
        <p>
          Defenses, in order of reliability: keep a <strong>private held-out set</strong> that
          has never touched the internet; prefer <em>dynamic</em> or executable evals (code
          that must pass tests, agents judged on outcomes); report your prompt format and
          variance, because few-shot formatting changes scores by points; and re-benchmark
          anything you didn't measure yourself.
        </p>
      <Callout kind="warn" title="The regression you won't notice">
          Every upstream change, a new checkpoint, a new judge prompt, a new retrieval stage in{' '}
          <ModuleLink id="rag" />, can silently move quality. A small private eval suite run on
          every change is the single highest-leverage habit in LLM engineering.
        </Callout>
      </Prose>

      {/* ── Step 5 ─────────────────────────────────────── */}
      <H2>Step 5: The eval tooling landscape</H2>
      <Prose>
        <p>
          The steps above tell you <em>what</em> to measure; a young ecosystem of platforms tells
          you <em>where</em> to record it. Tools sort into overlapping jobs:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li>
            <strong>Tracing & observability</strong> capture every prompt, tool call, retrieval,
            and cost as spans you can replay. <strong>LangSmith</strong> (LangChain-native, managed)
            and <strong>Langfuse</strong> (open source, self-hostable, framework-agnostic) dominate;
            <strong> Arize Phoenix</strong> builds on OpenTelemetry, so it plugs into ML observability
            you may already run.
          </li>
          <li>
            <strong>Datasets & experiments</strong> version test sets and score model versions
            against them. <strong>Braintrust</strong> is the eval-first pick (its experiments and
            CI gating are the product); <strong>W&amp;B Weave</strong> fits teams already living in
            Weights &amp; Biases.
          </li>
          <li>
            <strong>CI eval frameworks</strong> run assertions in your pipeline: <strong>promptfoo</strong>{' '}
            (config-driven, also does red teaming) and <strong>DeepEval</strong> (pytest-style unit
            tests for LLM outputs) treat evals as code, no platform required.
          </li>
          <li>
            <strong>RAG-specific metrics</strong>: <strong>RAGAS</strong> scores faithfulness, answer
            relevancy, and context precision/recall without reference answers, a quick scoreboard
            for the pipeline in <ModuleLink id="rag" />.
          </li>
          <li>
            <strong>Human preference at scale</strong> lives in <strong>LMArena</strong>'s crowd
            battles (great for ranking frontier models, useless for your private prompts), and a
            lightweight proxy like <strong>Helicone</strong> can add logging without touching app
            code.
          </li>
        </ul>
        <p>
          Two axes to keep straight: <strong>offline vs online</strong>. Offline evals run before
          release (CI on every change, experiment runs). Online evals run in production: sampled
          LLM-as-judge, user feedback, and drift alerts on traced quality. Mature teams do both,
          because the lab never fully predicts the street.
        </p>
        <p>
          A pragmatic adoption path: start with promptfoo or DeepEval in CI (evals as code, zero
          vendor), add Langfuse or Phoenix for production tracing once real traffic flows, and
          graduate to Braintrust or LangSmith when shared datasets and dashboards need to outlive
          individual contributors. Platforms are optional; the habits (step 4) are not.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'Perplexity = exp(cross-entropy), the effective branching factor on held-out text, pure, format-free, but blind to helpfulness and tokenization-fragile.',
          'Benchmarks pair fixed task sets with automatic scoring: MMLU (knowledge), HumanEval (executable code), GSM8K (math), protocol details change the numbers.',
          'LLM-as-judge scales to open-ended quality but carries verbosity, position, and self-preference biases, randomize, blind, and calibrate it against humans.',
          'Benchmarks rot: contamination inflates scores (GSM1k proved it), saturation flattens them, private held-out sets and executable evals are the durable core of any eval strategy.',
          'Tooling sorts into tracing (LangSmith, Langfuse, Phoenix), datasets/experiments (Braintrust, Weave), CI frameworks (promptfoo, DeepEval), and RAG metrics (RAGAS); run evals as code offline and sampled judges online.',
        ]}
      />
    </ModuleLayout>
  )
}
