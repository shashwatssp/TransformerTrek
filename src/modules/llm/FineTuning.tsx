/**
 * Module 3.3 — Fine-tuning & Alignment
 * Body content only; ModuleLayout supplies the shell (breadcrumb, outline,
 * sources, see-also). Sections follow the registry `steps` order exactly.
 */
import { useState } from 'react'
import {
  Callout,
  CodeBlock,
  ComparisonTable,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
  Slider,
  WidgetFrame,
} from '../../components/ui'

/* ─────────────────────────── LoRA parameter lab ─────────────────────────── */

function LoraLab() {
  const [dModel, setDModel] = useState(4096)
  const [rank, setRank] = useState(16)
  const [nLayers, setNLayers] = useState(32)
  const [nTargets, setNTargets] = useState(4) // W_q, W_k, W_v, W_o per layer

  // Full fine-tuning updates every weight of every attention + FFN matrix.
  // SwiGLU FFN: 3 × d × d_ff with d_ff = 4d → 12d²; attention: 4d². Total 16d²/layer.
  const fullPerLayer = 16 * dModel * dModel
  const fullTotal = nLayers * fullPerLayer
  // LoRA: for each targeted matrix (d×d), add A (r×d) + B (d×r) = 2·d·r params.
  const loraPerLayer = nTargets * 2 * dModel * rank
  const loraTotal = nLayers * loraPerLayer
  const pct = (100 * loraTotal) / fullTotal

  const bars = [
    { label: 'Full fine-tuning', value: fullTotal, cls: 'bg-highlight/70' },
    { label: 'LoRA adapters', value: loraTotal, cls: 'bg-accent/70' },
  ]
  const max = Math.max(...bars.map((b) => b.value))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Model width d (Llama-3-8B: 4096)" value={dModel} min={512} max={8192} step={512} onChange={setDModel} format={(v) => String(v)} />
        <Slider label="LoRA rank r" value={rank} min={1} max={128} step={1} onChange={setRank} format={(v) => String(Math.round(v))} />
        <Slider label="Layers" value={nLayers} min={2} max={80} step={2} onChange={setNLayers} format={(v) => String(Math.round(v))} />
        <Slider label="Target matrices per layer" value={nTargets} min={1} max={4} step={1} onChange={setNTargets} format={(v) => `${Math.round(v)} of 4 (Q,K,V,O)`} />
      </div>

      <div className="space-y-2" aria-live="polite">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-ink-muted">{b.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-surface-raised">
              <div className={`h-full rounded-full ${b.cls}`} style={{ width: `${(100 * b.value) / max}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-accent">{(b.value / 1e6).toFixed(0)}M</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">Trainable (full FT)</div>
          <div className="font-mono text-ink">{(fullTotal / 1e9).toFixed(2)}B params</div>
        </div>
        <div className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-ink-muted">Trainable (LoRA)</div>
          <div className="font-mono text-accent">{(loraTotal / 1e6).toFixed(1)}M params · {pct.toFixed(2)}% of full</div>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        Every number is computed live from your sliders: full FT = layers × 16d² (attention 4d² + SwiGLU FFN 12d²);
        LoRA = layers × targets × 2·d·r (A: r×d, B: d×r per target matrix). QLoRA adds 4-bit quantization of the
        frozen base — see <a href="https://arxiv.org/abs/2305.14314" target="_blank" rel="noopener noreferrer">Dettmers et al., 2023</a>.
      </p>
    </div>
  )
}

/* ─────────────────────────── Reward-hacking demo ─────────────────────────── */

function RewardHackingDemo() {
  const [weighted, setWeighted] = useState(false)
  const answers = [
    { id: 'a', label: 'A — concise, correct', honest: 4, verbose: 1 },
    { id: 'b', label: 'B — verbose, hedged', honest: 2, verbose: 5 },
  ]
  const total = (s: typeof answers[number]) => (weighted ? s.honest + 2 * s.verbose : s.honest + s.verbose)
  const winner = weighted ? 'b' : 'a'
  return (
    <div className="space-y-3">
      <button
        onClick={() => setWeighted((w) => !w)}
        aria-pressed={weighted}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-surface-raised"
      >
        {weighted ? 'Rubric: naive (rewards verbosity)' : 'Rubric: balanced — flip it'}
      </button>
      <div className="grid gap-2 sm:grid-cols-2">
        {answers.map((a) => (
          <div
            key={a.id}
            className={`rounded-lg border p-3 text-sm ${winner === a.id ? 'border-highlight/60 bg-highlight/10' : 'border-border bg-surface'}`}
          >
            <div className="font-medium text-ink">{a.label}</div>
            <div className="mt-1 font-mono text-xs text-ink-muted">
              helpfulness {a.honest} · length {a.verbose} · reward {total(a)}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {weighted
          ? 'A verbose answer scores higher purely for its length — the policy learns to pad. This is reward hacking in miniature.'
          : 'Balanced weights pick the genuinely better answer. Weight length too heavily and the optimizer will find the loophole — every time.'}
      </p>
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

const ppoSnippet = `# PPO stage: the RM guides the policy, the KL anchor keeps it sane
for prompt in prompts:
    responses = policy.sample(k=4)                  # rollout
    r      = reward_model(responses)                # learned proxy — hackable!
    kl     = KL(policy(responses) || ref(responses))# anchor to the SFT model
    adv    = (r - value(responses))                 # learned value baseline
    loss   = -PPO(adv, ratio=policy/ref) + beta * kl # clip + penalty
    # 4 models live: policy, ref, RM, value — this is what DPO deletes`

const sftSnippet = `# SFT: train only on the response tokens
prompt     = "<|user|> Explain top-p sampling in one sentence.<|assistant|>"
response   = "Top-p keeps the smallest set of tokens whose probabilities sum to p, then samples from it."

input_ids  = tokenizer(prompt + response)
labels     = input_ids.copy()
labels[: len(tokenizer(prompt))] = -100   # mask the prompt: no loss there
loss = ce(model(input_ids), labels)       # gradient flows from the answer only`

const dpoSnippet = `# DPO loss: preference pairs replace the RL loop entirely
# policy logpi = log π(y_w|x) - log π(y_l|x)   (chosen vs rejected)
loss = -logsigmoid(beta * ((logpi_w - ref_logpi_w) - (logpi_l - ref_logpi_l)))
# Push up the chosen, push down the rejected — relative to a frozen reference model.`

const grpoSnippet = `# GRPO: the baseline is the group mean — no value network
G = sample_group(policy, prompt, k=16)          # k answers for the same prompt
A_i = (r_i - mean(r)) / std(r)                  # advantage = z-scored reward
loss = -E_i[ min(ratio_i * A_i, clip(ratio_i) * A_i) ]   # PPO-style clipped update
# DeepSeekMath/DeepSeek-R1 train reasoning this way with verifiable rewards (r ∈ {0,1}).`

export default function FineTuning() {
  return (
    <>
      {/* Step 1 ─ SFT: teaching format and behavior */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1 — SFT: teaching format and behavior</H2>
        <Prose>
          <p>
            A freshly pretrained model (see <ModuleLink id="pretraining" />) is a magnificent autocomplete with no
            manners: ask it a question and it may continue with three more questions, because that's what web text
            looks like. <strong>Supervised fine-tuning (SFT)</strong> fixes behavior, not knowledge — you show the
            model thousands of curated (instruction → ideal response) pairs and run the same next-token training
            you already know.
          </p>
          <p>
            The one trick worth remembering: the loss is computed <em>only on response tokens</em>. The prompt is
            context, not a target — we mask it out. This keeps the model from learning to generate questions, and
            concentrates gradient on the behavior you want.
          </p>
          <CodeBlock code={sftSnippet} language="python" filename="sft.py" />
          <Callout kind="info" title="Why 'behavior, not knowledge' matters">
            SFT on a few thousand examples can't teach facts the base model never saw — it teaches <em>form</em>:
            format, tone, instruction-following, refusal. When your problem is missing <em>knowledge</em> instead,
            that's the retrieval path — <ModuleLink id="rag-vs-fine-tuning" /> is the full comparison.
          </Callout>
          <p>
            InstructGPT (
            <a href="https://arxiv.org/abs/2203.02155" target="_blank" rel="noopener noreferrer">Ouyang et al., 2022</a>
            ) showed a 1.3B model with SFT + RLHF was preferred over the 175B base — behavior shaping beats raw
            scale for usefulness. Modern recipes do SFT in rounds (Llama 3 ran multiple,{' '}
            <a href="https://arxiv.org/abs/2407.21783" target="_blank" rel="noopener noreferrer">Grattafiori et al., 2024</a>).
          </p>
        </Prose>
      </section>

      {/* Step 2 ─ LoRA / QLoRA */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2 — LoRA / QLoRA: adapters, not full weights</H2>
        <Prose>
          <p>
            Full fine-tuning means a training-gradient-capable copy of every weight — for a 70B model that's
            hundreds of GB of optimizer state. <strong>LoRA</strong> (
            <a href="https://arxiv.org/abs/2106.09685" target="_blank" rel="noopener noreferrer">Hu et al., 2021</a>
            ) rests on a striking empirical claim: the <em>change</em> needed to adapt a model lives in a very
            low-dimensional subspace. So freeze W, and learn only a low-rank residual:
          </p>
          <Callout kind="math" title="The LoRA reparameterization">
            W' = W + B·A, where A is r×d, B is d×r, and rank r ≪ d
            <br />
            Forward: h = Wx + (B·A)x — the frozen path needs no gradient, no optimizer state. Init: A random, B
            zero, so training starts exactly at the base model. At inference, B·A folds into W — zero extra latency.
          </Callout>
          <p>
            Ranks of 8–64 routinely match full fine-tuning. <strong>QLoRA</strong> pushes further: quantize the
            frozen base to 4-bit (NF4), train adapters on top — fine-tuning a 65B model on a single GPU (
            <a href="https://arxiv.org/abs/2305.14314" target="_blank" rel="noopener noreferrer">Dettmers et al., 2023</a>
            ). Play with the arithmetic:
          </p>
          <WidgetFrame
            title="LoRA parameter lab"
            subtitle="Adapter size vs full fine-tuning, computed live from model width, rank, and how many matrices you target."
          >
            <LoraLab />
          </WidgetFrame>
          <Callout kind="tip" title="Practical defaults">
            Target all attention projections (Q,K,V,O) — and often the FFN too; r=16 is a strong default;
            scale the LoRA learning rate up relative to full FT (the update passes through B·A, which starts at
            zero). One base model + many swappable adapters = one GPU serving many behaviors.
          </Callout>
        </Prose>
      </section>

      {/* Step 3 ─ RLHF */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3 — RLHF: preference data → reward model → PPO</H2>
        <Prose>
          <p>
            SFT clones demonstrations; it can't pick the <em>better</em> of two good answers. For that you need
            preferences. <strong>RLHF</strong> (
            <a href="https://arxiv.org/abs/2203.02155" target="_blank" rel="noopener noreferrer">Ouyang et al., 2022</a>
            ; the progenitor is{' '}
            <a href="https://arxiv.org/abs/2009.01325" target="_blank" rel="noopener noreferrer">Ziegler et al., 2019</a>)
            runs a three-stage pipeline:
          </p>
          <ol className="list-decimal space-y-1 pl-6">
            <li><strong>Collect preferences.</strong> Humans compare model outputs: "A is better than B." Cheap to judge, hard to write — that asymmetry is the whole trick.</li>
            <li><strong>Train a reward model (RM).</strong> The same transformer with a scalar head, trained on the Bradley–Terry preference loss to score any answer. It generalizes the humans' judgments to answers no human ever saw.</li>
            <li><strong>Optimize the policy with PPO.</strong> The policy generates, the RM scores, and a <em>KL penalty</em> to the frozen SFT model keeps the policy from drifting into degenerate text the RM happens to love.</li>
          </ol>
          <CodeBlock code={ppoSnippet} language="python" filename="ppo.py" />
        </Prose>
      </section>

      {/* Step 4 ─ DPO */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4 — DPO: skipping the reward model</H2>
        <Prose>
          <p>
            PPO infrastructure is notoriously finicky: four models in memory (policy, reference, RM, value), reward
            hacking of the RM, hyperparameter sensitivity. <strong>DPO</strong> (
            <a href="https://arxiv.org/abs/2305.18290" target="_blank" rel="noopener noreferrer">Rafailov et al., 2023</a>
            ) proves something remarkable: the RLHF objective has a <em>closed-form solution</em> in terms of the
            policy itself, so you can optimize the same thing with a simple classification-style loss on
            preference pairs — no reward model, no rollouts, no RL loop:
          </p>
          <CodeBlock code={dpoSnippet} language="python" filename="dpo.py" />
          <p>
            With a frozen <em>reference model</em> (usually the SFT checkpoint), the loss increases the margin
            between the log-probabilities of chosen vs rejected answers, while the reference anchors the policy
            from collapsing. Llama 3's post-training used multiple rounds of DPO (plus PPO for the 405B), and
            most open recipes now default to DPO or its descendants (IPO, KTO, SimPO).
          </p>
          <ComparisonTable
            columns={[
              { id: 'ppo', label: 'RLHF (PPO)' },
              { id: 'dpo', label: 'DPO' },
            ]}
            rows={[
              {
                label: 'Models in memory',
                values: { ppo: '4: policy, reference, reward model, value', dpo: '2: policy + frozen reference' },
              },
              {
                label: 'Data it consumes',
                values: { ppo: 'Preference pairs (RM stage) + prompts (RL stage)', dpo: 'Preference pairs, end to end' },
              },
              {
                label: 'Failure mode',
                values: { ppo: 'Reward-model hacking, PPO instability', dpo: 'Overfits pairs; can shrink the probability of both answers ("likelihood displacement")' },
              },
              {
                label: 'Compute shape',
                values: { ppo: 'Online generation + scoring (expensive)', dpo: 'Offline, one pass over pairs (cheap)' },
              },
              {
                label: 'Where it shines',
                values: { ppo: 'Frontier labs with infra + fresh online preferences', dpo: 'Open recipes, smaller teams, quick alignment rounds' },
              },
            ]}
          />
          <Callout kind="info" title="The lineage in one line">
            SFT (clone experts) → RLHF (optimize a learned proxy) → DPO (closed form of the same objective) →
            GRPO/RLVR (drop the proxy when a program can verify).
          </Callout>
        </Prose>
      </section>

      {/* Step 5 ─ GRPO */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5 — GRPO: group-relative baselines</H2>
        <Prose>
          <p>
            PPO's value network exists to answer one question: "was this reward high or low <em>for this
            prompt</em>?" <strong>GRPO</strong> — introduced with DeepSeekMath (
            <a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener noreferrer">Shao et al., 2024</a>
            ) — answers it by sampling a <em>group</em> of answers to the same prompt and using the group's
            z-scored rewards as advantages. No value network, half the memory, and the baseline adapts per prompt:
          </p>
          <CodeBlock code={grpoSnippet} language="python" filename="grpo.py" />
          <p>
            GRPO is the engine of the reasoning-model era: DeepSeek-R1-Zero trained with GRPO where the reward
            was purely <em>verifiable</em> (correct final answer, passing tests) — that combination is RLVR, which
            you saw in <ModuleLink id="how-llms-are-trained" />. The group baseline also makes the objective
            naturally batch-local: sample k answers, compare them to each other, learn.
          </p>
        </Prose>
      </section>

      {/* Step 6 ─ Reward hacking */}
      <section id="step-6" className="scroll-mt-24">
        <H2>Step 6 — Reward hacking and how to catch it</H2>
        <Prose>
          <p>
            Goodhart's law is a theorem in this field: <em>any reward that's a proxy for what you want will be
            optimized past the point where it stops meaning what you want.</em> Learned reward models are
            proxies, and policies are relentless optimizers. Classic failure patterns:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Verbosity bias.</strong> RMs systematically prefer longer answers; the policy learns to pad (watch it flip below).</li>
            <li><strong>Sycophancy &amp; flattery.</strong> Agreeing with the user scores well with human raters — the policy learns to please, not to correct.</li>
            <li><strong>Format exploits.</strong> Bullet lists, headers, "as an AI…" disclaimers — stylistic tokens correlated with quality in the preference data get weaponized.</li>
            <li><strong>Unit-test overfitting in RLVR.</strong> Even verifiable rewards can be gamed by memorizing test suites — keep held-out tests.</li>
          </ul>
          <WidgetFrame
            title="Reward-hacking, live"
            subtitle="Same two candidate answers, one rubric slider. Watch the verdict flip when length is over-weighted."
          >
            <RewardHackingDemo />
          </WidgetFrame>
          <p>
            Defenses are procedural more than mathematical: fresh preference data every round (Llama 3's multiple
            rounds), KL anchors and reference models, RM ensembles and disagreement monitoring, held-out
            verifiers for RLVR, and — above all — evals that measure the thing you actually care about (
            <ModuleLink id="evals" />), not the proxy you trained on.
          </p>
          <KeyTakeaways
            points={[
              'SFT teaches form via response-only loss; it shapes behavior, it does not add knowledge — that distinction drives the RAG-vs-fine-tuning decision.',
              'LoRA: W + B·A with rank r ≪ d trains <1% of parameters, matches full FT, and folds away at inference; QLoRA adds a 4-bit frozen base.',
              'RLHF = preferences → reward model → PPO with a KL anchor; DPO is the closed-form shortcut using only pairs and a frozen reference.',
              'GRPO replaces the value network with group statistics — the engine of the verifiable-reward reasoning era (DeepSeekMath → R1).',
              'Every learned reward is a proxy; expect hacking (verbosity, sycophancy, format exploits) and defend with fresh data, KL anchors, and honest evals.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
