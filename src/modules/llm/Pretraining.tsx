/**
 * Module 3.1 — Pretraining
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline,
 * sources, see-also). Sections follow the registry `steps` order exactly.
 */
import {
  Callout,
  CodeBlock,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  WidgetFrame,
} from '../../components/ui'
import TrainingLoopViz from '../../widgets/llm/TrainingLoopViz'
import ScalingLawsChart from '../../widgets/llm/ScalingLawsChart'

const pretrainingLoop = `# The pretraining inner loop — one optimizer step out of ~500,000
model.train()
for step, batch in enumerate(dataloader):        # batch ≈ 4M tokens
    logits = model(batch.tokens[:, :-1])          # positions 0..T-1 predict 1..T
    loss = F.cross_entropy(
        logits.reshape(-1, vocab_size),
        batch.tokens[:, 1:].reshape(-1),          # the target is the NEXT token
    )
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()
    lr_scheduler.step()                           # warmup → cosine (Step 3)
    optimizer.zero_grad(set_to_none=True)`

const lrSchedule = `def lr_at(step, total, warmup, peak, floor=0.05):
    """Linear warmup, then cosine decay to floor × peak."""
    if step < warmup:                        # early steps are fragile — go slow
        return peak * (step + 1) / warmup
    t = (step - warmup) / (total - warmup)
    return peak * floor + 0.5 * peak * (1 - floor) * (1 + math.cos(math.pi * t))`

export default function Pretraining() {
  return (
    <>
      {/* Step 1 ─ The objective: next-token over trillions of tokens */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1 — The objective: next-token over trillions of tokens</H2>
        <Prose>
          <p>
            Strip away the mystique and pretraining is one game, played trillions of times: hide the next
            word, guess it, measure how surprised the model was, and nudge every weight to be a little less
            surprised next time. That's it. Everything from a spelling rule to a chain of algebraic reasoning
            is learned as a side effect of getting better at this single game.
          </p>
          <p>
            Formally, the model outputs a probability for every token in the vocabulary at each position — the
            softmax over logits you met in <ModuleLink id="attention" /> — and training minimizes the average
            negative log-probability it assigned to the tokens that actually occurred:
          </p>
          <Callout kind="math" title="The objective (cross-entropy on next tokens)">
            L(θ) = −(1/T) · Σ<sub>t=1..T</sub> log P<sub>θ</sub>(x<sub>t</sub> | x<sub>&lt;t</sub>)
            <br />
            The causal mask guarantees position t never peeks at x<sub>t</sub> or beyond — recall{' '}
            <ModuleLink id="attention" /> and <ModuleLink id="architecture" />. Perplexity (Module{' '}
            <ModuleLink id="evals">evals</ModuleLink>) is just exp(L) on held-out text.
          </Callout>
          <p>
            Why did this particular objective conquer the field? Because it's <em>self-supervised</em>: the
            labels are the data. No one had to annotate "the cat sat" — every token of every web page is both
            input and target, so the amount of available supervision scales with the corpus, not with human
            labeling budgets. That's what unlocked runs over <em>trillions</em> of tokens: Llama 3 was
            pretrained on roughly 15.6 trillion (
            <a
              href="https://arxiv.org/abs/2407.21783"
              target="_blank"
              rel="noopener noreferrer"
            >
              Grattafiori et al., 2024
            </a>
            ), two orders of magnitude beyond GPT-3's 300 billion (
            <a
              href="https://arxiv.org/abs/2005.14165"
              target="_blank"
              rel="noopener noreferrer"
            >
              Brown et al., 2020
            </a>
            ).
          </p>
          <p>
            In practice the corpus is chopped into documents, concatenated, and sliced into sequences of a few
            thousand tokens; a "step" trains on a batch of sequences — often millions of tokens at once. The
            inner loop fits in a dozen lines:
          </p>
          <CodeBlock code={pretrainingLoop} language="python" filename="pretrain_loop.py" />
          <p>
            Note what's <em>absent</em>: no reward, no human preference, no instruction following. Pretraining
            builds raw capability — the "what text comes next" engine. Shaping it into an assistant comes much
            later, in <ModuleLink id="how-llms-are-trained" /> and <ModuleLink id="fine-tuning" />.
          </p>
        </Prose>
      </section>

      {/* Step 2 ─ Data pipelines and cleaning */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2 — Data pipelines and cleaning</H2>
        <Prose>
          <p>
            Models become what they eat. The raw web is spam, boilerplate, duplicate scraped pages, and the
            occasional gem — so a huge fraction of pretraining engineering is a laundering pipeline that turns
            internet sewage into a curriculum. The standard stages:
          </p>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              <strong>Acquire.</strong> Common Crawl snapshots give petabytes of scraped pages; curated adds
              Wikipedia, code, books, papers.
            </li>
            <li>
              <strong>Filter.</strong> Language identification, heuristic quality rules, and model-based
              classifiers drop low-quality pages (the{' '}
              <a
                href="https://arxiv.org/abs/1911.00359"
                target="_blank"
                rel="noopener noreferrer"
              >
                CCNet
              </a>{' '}
              recipe is the classic template).
            </li>
            <li>
              <strong>Deduplicate.</strong> Exact and fuzzy (MinHash/LSH) dedup — duplicates waste compute and
              encourage memorization.
            </li>
            <li>
              <strong>Decontaminate.</strong> Remove text overlapping evaluation benchmarks, or your eval
              scores are lies (see <ModuleLink id="evals" />).
            </li>
            <li>
              <strong>Mix and weight.</strong> Upsample high-quality sources, downsample spam; the mixture is a
              recipe decision, not an accident.
            </li>
          </ol>
          <p>
            Public examples: <a href="https://arxiv.org/abs/2101.00027" target="_blank" rel="noopener noreferrer">The Pile</a>{' '}
            (825 GiB of deliberately mixed sources) and{' '}
            <a href="https://arxiv.org/abs/2406.17557" target="_blank" rel="noopener noreferrer">FineWeb</a> — 15
            trillion tokens of filtered Common Crawl from 96 snapshots, built with GPT-3-style quality filtering
            plus fuzzy dedup, the same league as Llama 3's web data.
          </p>
          <Callout kind="warn" title="Contamination is a data bug, not a footnote">
            If a benchmark's test set leaks into training data, the model can parrot answers it memorized.
            Every serious training pipeline now ships with benchmark-overlap removal and n-gram decontamination
            checks — and every serious eval treats contamination as a first-class failure mode.
          </Callout>
        </Prose>
      </section>

      {/* Step 3 ─ Loss curves and what they hide */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3 — Loss curves and what they hide</H2>
        <Prose>
          <p>
            The loss curve is the EKG of a training run. Its overall shape is reassuringly boring: a steep
            plunge, a long smooth tail. But the average hides most of the story. Validation loss — not training
            loss — is the signal to watch, because the gap between them is memorization. Bumps and spikes have
            causes worth reading: a data mixture change, a corrupted shard, a gradient explosion. And the
            learning-rate schedule leaves fingerprints everywhere.
          </p>
          <p>
            Two schedule facts you'll see in every modern recipe. First, <strong>warmup</strong>: early in
            training the model is far from any optimum and Adam's second-moment estimates are still noise, so
            the full learning rate can wreck the run — you ramp up over the first few hundred or thousand
            steps. Second, <strong>cosine decay</strong>: after warmup, the rate glides down so late updates
            fine-tune instead of bouncing. Run the simulator: scrub the step slider and watch both panels
            move.
          </p>
          <WidgetFrame
            title="Training-loop simulator"
            subtitle="Play a simulated run: loss descent (left) next to the warmup + cosine LR schedule (right), computed from your sliders."
          >
            <TrainingLoopViz />
          </WidgetFrame>
          <p>The schedule itself is a five-line function:</p>
          <CodeBlock code={lrSchedule} language="python" filename="lr_schedule.py" />
          <Callout kind="info" title="Loss spikes are normal — panic is optional">
            Large runs (
            <a href="https://arxiv.org/abs/2204.02311" target="_blank" rel="noopener noreferrer">
              PaLM
            </a>
            , Llama 3) publish post-mortems of mid-training loss spikes. Standard responses: roll back to a
            checkpoint, skip the suspect data shard, restart with a tweaked schedule. A single spike that
            recovers is rarely fatal; an unexplained one during eval season is.
          </Callout>
        </Prose>
      </section>

      {/* Step 4 ─ Scaling laws: parameters vs data */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4 — Scaling laws: parameters vs data</H2>
        <Prose>
          <p>
            Why did everyone suddenly believe trillion-token runs were a good idea? Because loss turned out to
            be one of the most predictable quantities in machine learning.{' '}
            <a href="https://arxiv.org/abs/2001.08361" target="_blank" rel="noopener noreferrer">
              Kaplan et al. (2020)
            </a>{' '}
            trained hundreds of models across seven orders of magnitude of compute and found that validation
            loss follows clean <em>power laws</em> in parameters N, data D, and compute C:
          </p>
          <Callout kind="math" title="The scaling-law form">
            L(N, D) ≈ A / N<sup>α</sup> + B / D<sup>β</sup> + E
            <br />
            Each term is an irreducible floor E plus diminishing returns: double the parameters or the data and
            loss drops by a roughly constant fraction. α, β, A, B are fitted constants — and knowing them lets
            you forecast the loss of a run before you've trained it.
          </Callout>
          <p>
            Kaplan's group drew one controversial conclusion: parameters matter more than data, so for a fixed
            compute budget you should build the biggest model you can afford and give it comparatively few
            tokens. That philosophy produced GPT-3 (175B params, 300B tokens) and DeepMind's Gopher (280B
            params, 300B tokens —{' '}
            <a href="https://arxiv.org/abs/2112.11446" target="_blank" rel="noopener noreferrer">Rae et al., 2021</a>).
            Then someone checked the math.
          </p>
        </Prose>
      </section>

      {/* Step 5 ─ Chinchilla: compute-optimal training */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5 — Chinchilla: compute-optimal training</H2>
        <Prose>
          <p>
            <a href="https://arxiv.org/abs/2203.15556" target="_blank" rel="noopener noreferrer">
              Hoffmann et al. (2022)
            </a>{' '}
            re-ran the scaling analysis with three independent approaches and got a different answer: for a
            fixed compute budget C, loss is minimized when parameters and data grow <em>together</em> — in
            roughly equal proportion. The resulting rule of thumb: <strong>≈20 training tokens per
            parameter</strong>. The punchline was a model swap at identical compute: Chinchilla (70B params,
            1.4T tokens) beat the 4×-larger Gopher (280B params, 300B tokens) across nearly every benchmark.
          </p>
          <p>
            The plot below is computed live from the paper's fitted law — L(N, D) = E + A/N<sup>0.34</sup> + B/D
            <sup>0.28</sup>, with the frontier found by minimizing over model size at each compute budget.
            Published runs (GPT-3, Gopher, Chinchilla, Llama 3) are scored through the same equation, and the
            tokens-per-parameter slider shows the penalty for deviating from the compute-optimal ratio.
          </p>
          <WidgetFrame
            title="Chinchilla scaling-law lab"
            subtitle="Log-log frontier computed in-browser from the Hoffmann et al. fitted constants; slide compute and tokens-per-param yourself."
          >
            <ScalingLawsChart />
          </WidgetFrame>
          <p>
            Look at Llama 3 405B: 15.6T tokens over 405B parameters is ≈38 tokens per param — nearly double the
            Chinchilla ratio. Was that wasteful? No: <strong>training-optimal ≠ inference-optimal</strong>. A
            checkpoint's training compute is paid once; serving it is paid forever. Frontier labs now
            deliberately over-train smaller models (Llama 3 8B saw ≈1,950 tokens per param) because a cheaper
            inference footprint for billions of requests beats a marginally lower training loss. Chinchilla
            tells you where the loss floor is; economics tells you where to stop.
          </p>
          <KeyTakeaways
            points={[
              'Pretraining is next-token cross-entropy over trillions of tokens — self-supervised, so data scales with the corpus, not with labels.',
              'Data pipelines (filter → dedup → decontaminate → mix) decide model quality as much as architecture does; contamination poisons evals.',
              'Watch validation loss; read spikes and bumps as signals about data and schedule. Warmup + cosine decay is the default schedule.',
              'Loss follows power laws: L(N, D) ≈ A/N^α + B/D^β + E — quality is forecastable before you train.',
              'Chinchilla: at fixed compute, scale params and tokens together (≈20:1). Modern models over-train past that rule for inference economics.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
