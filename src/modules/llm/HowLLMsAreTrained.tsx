/**
 * Module 3.2: How Different LLMs Are Trained
 * Body content only; sections follow the registry `steps` order exactly.
 * Local components: MoERoutingLab (dense vs MoE) and RecipeCard (Llama 3 / DeepSeek).
 */
import { useMemo, useState } from 'react'
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
import { gaussian, seededRandom, softmax, topK } from '../../lib/math'
import { useChartTheme } from '../../lib/chartTheme'
import PostTrainingPipeline from '../../widgets/llm/PostTrainingPipeline'

/* ─────────────────────────── MoE routing lab ─────────────────────────── */

const TOKENS = ['The', 'swift', 'fox', 'jumps']
const D_MODEL = 2048
const D_FF = 4 * D_MODEL
const EXPERT_PARAMS = 3 * D_MODEL * D_FF // SwiGLU: gate + up + down projections
const ATTN_PARAMS = 4 * D_MODEL * D_MODEL // q, k, v, o projections

function MoERoutingLab() {
  const pal = useChartTheme()
  const [numExperts, setNumExperts] = useState(8)
  const [k, setK] = useState(2)

  // Seeded router scores → deterministic softmax probabilities per token
  const routes = useMemo(() => {
    const rand = seededRandom(11 + numExperts * 100 + k)
    return TOKENS.map((t) => {
      const scores = Array.from({ length: numExperts }, () => gaussian(rand))
      const probs = softmax(scores)
      const chosen = topK(probs, k)
      return { token: t, probs, chosen }
    })
  }, [numExperts, k])

  const load = useMemo(() => {
    const l = Array.from({ length: numExperts }, () => 0)
    for (const r of routes) for (const e of r.chosen) l[e] += 1
    return l
  }, [routes, numExperts])

  const totalPerLayer = ATTN_PARAMS + numExperts * EXPERT_PARAMS
  const activePerLayer = ATTN_PARAMS + k * EXPERT_PARAMS
  const activePct = (100 * activePerLayer) / totalPerLayer

  const W = 660
  const H = 300
  const tokenY = (i: number) => 40 + i * 73
  const expertY = (e: number) => 18 + (e * (H - 40)) / numExperts

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider label="Number of experts (E)" value={numExperts} min={4} max={16} step={1} onChange={(v) => setNumExperts(Math.round(v))} format={(v) => String(Math.round(v))} />
        <Slider label="Experts routed per token (top-k)" value={k} min={1} max={4} step={1} onChange={(v) => setK(Math.round(v))} format={(v) => `top-${Math.round(v)}`} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Mixture-of-experts routing: ${TOKENS.length} tokens each routed to their top ${k} of ${numExperts} experts. ${activePct.toFixed(1)} percent of parameters active per token.`}>
        {/* tokens */}
        {TOKENS.map((t, i) => (
          <g key={t}>
            <circle cx={36} cy={tokenY(i)} r={22} fill={pal.nodeBg} stroke={pal.accent} strokeWidth={1.5} />
            <text x={36} y={tokenY(i) + 4} textAnchor="middle" fontSize={11} fill={pal.ink} fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        {/* router */}
        <rect x={140} y={H / 2 - 34} width={104} height={68} rx={10} fill={pal.nodeBg} stroke={pal.primary} strokeWidth={1.5} />
        <text x={192} y={H / 2 + 4} textAnchor="middle" fontSize={13} fill={pal.ink}>
          router
        </text>
        <text x={192} y={H / 2 + 20} textAnchor="middle" fontSize={10} fill={pal.muted} fontFamily="monospace">
          softmax → top-{k}
        </text>
        {TOKENS.map((_, i) => (
          <line key={`in-${i}`} x1={58} y1={tokenY(i)} x2={140} y2={H / 2} stroke={pal.grid} strokeWidth={1.5} />
        ))}
        {/* expert boxes */}
        {Array.from({ length: numExperts }, (_, e) => {
          const isUsed = load[e] > 0
          return (
            <g key={`exp-${e}`}>
              <rect x={470} y={expertY(e)} width={140} height={Math.min(30, (H - 44) / numExperts)} rx={6} fill={isUsed ? 'rgba(34,211,238,0.12)' : pal.tooltipBg} stroke={isUsed ? pal.accent : pal.grid} strokeWidth={isUsed ? 1.5 : 1} />
              <text x={482} y={expertY(e) + 17} fontSize={11} fill={isUsed ? pal.ink : pal.muted} fontFamily="monospace">
                E{e + 1} · {load[e]} tok
              </text>
            </g>
          )
        })}
        {/* routing edges: token → chosen expert, width/opacity by probability */}
        {routes.map((r, i) =>
          r.chosen.map((e) => {
            const p = r.probs[e]
            const y2 = expertY(e) + 12
            return (
              <line key={`t${i}-e${e}`} x1={96} y1={tokenY(i)} x2={470} y2={y2} stroke={pal.accent} strokeOpacity={0.2 + 0.6 * p} strokeWidth={1 + 3 * p} />
            )
          }),
        )}
        <text x={W - 4} y={H - 6} textAnchor="end" fontSize={10} fill={pal.muted}>
          edge width = router probability
        </text>
      </svg>

      <div className="grid grid-cols-3 gap-2 text-sm" aria-live="polite">
        {[
          { k: 'Total params/layer', v: `${(totalPerLayer / 1e6).toFixed(0)}M` },
          { k: 'Active params/token', v: `${(activePerLayer / 1e6).toFixed(0)}M` },
          { k: 'Active fraction', v: `${activePct.toFixed(0)}%` },
        ].map((s) => (
          <div key={s.k} className="rounded-lg border border-border bg-surface-raised/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">{s.k}</div>
            <div className="font-mono text-accent">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs sm:text-sm">
          <caption className="sr-only">Router probabilities for each token and the experts selected</caption>
          <thead>
            <tr className="bg-surface-raised/60 text-left text-[10px] text-ink-muted sm:text-xs">
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">Token</th>
              <th className="px-2 py-1.5 font-medium sm:px-3 sm:py-2">Top-{k} experts (router probability)</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.token} className="border-t border-border">
                <td className="px-2 py-1.5 font-mono text-ink/90 sm:px-3 sm:py-2">{r.token}</td>
                <td className="break-words px-2 py-1.5 font-mono text-ink/80 sm:px-3 sm:py-2">
                  {r.chosen.map((e) => `E${e + 1} (${(100 * r.probs[e]).toFixed(1)}%)`).join(' + ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-muted">
        Router scores are deterministic seeded random vectors, softmaxed per token (src/lib/math.ts). Parameter
        model: attention 4·d² shared, each expert an SwiGLU FFN of 3·d·d_ff weights with d=2048, d_ff=8192, 
        every readout above is computed from your slider values.
      </p>
    </div>
  )
}

/* ─────────────────────────── Recipe cards ─────────────────────────── */

type Recipe = { name: string; kind: string; specs: [string, string][]; note: string }

const RECIPES: Recipe[] = [
  {
    name: 'Llama 3 405B',
    kind: 'dense · scale + engineering',
    specs: [
      ['Parameters', '405B, dense transformer'],
      ['Data', '≈15.6T tokens, heavy filtering + decontamination'],
      ['Hardware', '16,384 H100 GPUs'],
      ['Precision', 'FP8 training at frontier scale'],
      ['Post-training', 'SFT → rejection sampling → DPO (PPO for long-context on 405B)'],
    ],
    note: 'The "just make dense training reliable" school: 4D parallelism, careful data lifecycle, and three rounds of alignment data generation.',
  },
  {
    name: 'DeepSeek-V3',
    kind: 'MoE · efficiency-first',
    specs: [
      ['Parameters', '671B total, 37B active per token (MoE)'],
      ['Data', '14.8T tokens'],
      ['Attention', 'MLA, latent-compressed KV cache'],
      ['Balancing', 'Aux-loss-free expert load balancing (per-expert bias)'],
      ['Objective', 'Next-token + multi-token prediction (MTP)'],
      ['Cost', '≈2.788M H800 GPU-hours (~$5.6M at $2/hr)'],
    ],
    note: 'The "get more per FLOP" school: sparsity, cheap inference, and training tricks that let a 671B model train on a modest cluster.',
  },
]

function RecipeCards() {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      {RECIPES.map((r) => (
        <div key={r.name} className="rounded-xl border border-border bg-surface p-4">
          <h4 className="text-sm font-bold text-ink">{r.name}</h4>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-accent">{r.kind}</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            {r.specs.map(([k2, v]) => (
              <div key={k2} className="flex gap-2">
                <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">{k2}</dt>
                <dd className="text-ink/85">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-muted">{r.note}</p>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

const objectivesSnippet = `# The same transformer, three training objectives
# 1. CAUSAL (GPT): predict the next token, positions can't see the future
loss_gpt   = ce(logits[:, :-1], tokens[:, 1:])            # mask: upper triangle

# 2. MASKED (BERT): reconstruct ~15% randomly corrupted tokens
masked, labels = corrupt(tokens, p=0.15)                  # [MASK] / random / keep
loss_bert  = ce(logits[labels != -100], labels[labels != -100])  # 2-way attention

# 3. SPAN CORRUPTION (T5): blank contiguous spans, generate them after "<extra_0>"
inputs, targets = span_corrupt(tokens, noise_density=0.15)
loss_t5    = ce(decoder_logits, targets)                  # encoder in, decoder generates spans`

const moeSnippet = `class MoEFFN(nn.Module):
    """Each token picks its own experts: capacity without full cost."""
    def __init__(self, d, d_ff, num_experts=8, k=2):
        self.experts = nn.ModuleList([FFN(d, d_ff) for _ in range(num_experts)])
        self.router = nn.Linear(d, num_experts)
        self.k = k

    def forward(self, x):                       # x: (tokens, d)
        probs = self.router(x).softmax(dim=-1)  # (tokens, E)
        top_p, top_i = probs.topk(self.k, -1)   # sparse: k experts per token
        y = torch.zeros_like(x)
        for j in range(self.k):                 # dispatch → compute → combine
            for b in range(x.size(0)):
                y[b] += top_p[b, j] * self.experts[top_i[b, j]](x[b])
        return y                                # only k/E FFNs ran per token`

export default function HowLLMsAreTrained() {
  return (
    <>
      {/* Step 1 ─ Three objectives: causal, masked, span corruption */}
      <section id="step-1" className="scroll-mt-24">
        <H2>Step 1: Three objectives: causal, masked, span corruption</H2>
        <Prose>
          <p>
            Pretraining always reduces to "hide part of the text, make the model reconstruct it", the{' '}
            <ModuleLink id="pretraining" /> recipe. The design question is <em>which part you hide</em> and{' '}
            <em>what the model may look at</em> while guessing. Three answers dominated the field:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Causal language modeling (GPT).</strong> Hide the next token at every position, let the
              model see only the left context via the causal mask from <ModuleLink id="attention" />. Every
              position yields a training signal, and the model can generate, this is the modern LLM paradigm.
            </li>
            <li>
              <strong>Masked language modeling (BERT).</strong> Randomly blank ~15% of tokens (usually with a
              literal <code>[MASK]</code>), let the model see <em>both sides</em> and fill in the blanks. Rich
              bidirectional signal per token, but no notion of "what comes next", so it can't generate.
            </li>
            <li>
              <strong>Span corruption (T5).</strong> Blank <em>contiguous spans</em> and replace them with
              sentinel markers; an encoder reads the damaged text and a decoder generates the missing spans.
              Unifies every task into text-in → text-out.
            </li>
          </ul>
          <CodeBlock code={objectivesSnippet} language="python" filename="objectives.py" />
          <Callout kind="info" title="Same data, different games">
            These objectives train on identical self-supervised corpora. What differs is the supervision each
            token receives, and that choice, more than architecture details, decides what the model is good
            at. See <ModuleLink id="architecture" /> for how encoder, decoder, and encoder-decoder stacks
            realize each game mechanically.
          </Callout>
        </Prose>
      </section>

      {/* Step 2 ─ GPT vs BERT vs T5 */}
      <section id="step-2" className="scroll-mt-24">
        <H2>Step 2: GPT vs BERT vs T5</H2>
        <Prose>
          <p>
            Those three objectives produced three model families that shaped a decade. Side by side:
          </p>
          <ComparisonTable
            columns={[
              { id: 'gpt', label: 'GPT, decoder-only' },
              { id: 'bert', label: 'BERT, encoder-only' },
              { id: 't5', label: 'T5, encoder-decoder' },
            ]}
            rows={[
              {
                label: 'Objective',
                values: {
                  gpt: 'Causal LM, next-token, left to right',
                  bert: 'Masked LM, reconstruct ~15% corrupted tokens',
                  t5: 'Span corruption, generate masked spans from sentinels',
                },
              },
              {
                label: 'What attention sees',
                values: {
                  gpt: 'Only the past (causal mask)',
                  bert: 'Both directions (bidirectional)',
                  t5: 'Encoder bidirectional; decoder causal',
                },
              },
              {
                label: 'Generation ability',
                values: {
                  gpt: 'Native, autoregressive sampling (see the sampler labs)',
                  bert: 'None, fills masks, cannot continue text',
                  t5: 'Only within the task format (spans, short outputs)',
                },
              },
              {
                label: 'Typical scale (era)',
                values: {
                  gpt: '117B → 175B → trillions of tokens (2020s frontier)',
                  bert: '110M–340M, trained once, fine-tuned per task',
                  t5: 'up to 11B, many-task training',
                },
              },
              {
                label: 'Legacy today',
                values: {
                  gpt: 'Every chat model: Llama, DeepSeek, Qwen…',
                  bert: 'Embedding/rerankers, the MiniLM lineage (Module 4.5)',
                  t5: 'Instruction-tuning lineage: FLAN, Tülu…',
                },
              },
            ]}
          />
          <p>
            Sources:{' '}
            <a href="https://arxiv.org/abs/1810.04805" target="_blank" rel="noopener noreferrer">
              Devlin et al., 2019 (BERT)
            </a>
            ,{' '}
            <a href="https://arxiv.org/abs/1910.10683" target="_blank" rel="noopener noreferrer">
              Raffel et al., 2020 (T5)
            </a>
            ,{' '}
            <a href="https://arxiv.org/abs/2005.14165" target="_blank" rel="noopener noreferrer">
              Brown et al., 2020 (GPT-3)
            </a>
            . Causal won for a blunt reason: it's the only objective that's also an{' '}
            <em>inference procedure</em>, the thing you run at deployment is the thing you trained.
          </p>
        </Prose>
      </section>

      {/* Step 3 ─ Dense vs Mixture-of-Experts */}
      <section id="step-3" className="scroll-mt-24">
        <H2>Step 3: Dense vs Mixture-of-Experts</H2>
        <Prose>
          <p>
            In a <strong>dense</strong> transformer every parameter fires for every token. In a{' '}
            <strong>Mixture-of-Experts</strong> layer, the feed-forward block (which holds most of a model's
            parameters) is replicated into E expert copies, and a tiny learned <em>router</em> picks the top-k
            experts for each token individually. Capacity scales with E; per-token cost stays pinned to k
            experts. The idea is old (
            <a href="https://arxiv.org/abs/1701.06538" target="_blank" rel="noopener noreferrer">
              Shazeer et al., 2017
            </a>
            ), but it powers modern frontier models like DeepSeek-V3: 671B parameters total, only ≈37B active
            per token (
            <a href="https://arxiv.org/abs/2412.19437" target="_blank" rel="noopener noreferrer">
              DeepSeek-AI, 2024
            </a>
            ).
          </p>
          <WidgetFrame
            title="MoE routing lab"
            subtitle="Watch the router send each token to its own top-k experts. Slider values drive the parameter arithmetic live."
          >
            <MoERoutingLab />
          </WidgetFrame>
          <p>
            Why bother? Compute, not memory, is the binding constraint of training. A dense model spends full
            compute on every token; an MoE spends <em>selective</em> compute, more total knowledge per unit of
            training FLOPs. The price is engineering pain: expert load balancing (train a bias to keep experts
            evenly used, DeepSeek-V3 does it <em>aux-loss-free</em>), routing instability, and KV-cache-heavy
            inference. <a href="https://arxiv.org/abs/2101.03961" target="_blank" rel="noopener noreferrer">Switch Transformer</a>{' '}
            is the classic reference for the training recipe.
          </p>
          <CodeBlock code={moeSnippet} language="python" filename="moe_router.py" />
        </Prose>
      </section>

      {/* Step 4 ─ Case studies: Llama 3 and DeepSeek recipes */}
      <section id="step-4" className="scroll-mt-24">
        <H2>Step 4: Case studies: Llama 3 and DeepSeek recipes</H2>
        <Prose>
          <p>
            Two published frontier recipes, two philosophies. Both papers are unusually detailed, read them as
            engineering post-mortems, not just results.
          </p>
          <RecipeCards />
          <Callout kind="tip" title="How to read a training recipe">
            Four numbers tell you most of the story: total vs active parameters, total tokens (→ tokens per
            param vs the Chinchilla ≈20 rule), hardware-hours, and the post-training stages. You can place any
            new model release in seconds once you practice on these two.
          </Callout>
        </Prose>
      </section>

      {/* Step 5 ─ Reasoning models: RL with verifiable rewards */}
      <section id="step-5" className="scroll-mt-24">
        <H2>Step 5: Reasoning models: RL with verifiable rewards</H2>
        <Prose>
          <p>
            The newest chapter abandons the reward model for problems with <em>checkable answers</em>. In
            RL with verifiable rewards (RLVR), the reward for a math problem is 1 if the final answer is right
            and 0 otherwise; for code, whether unit tests pass. No human rankings, no learned proxy, the
            ground truth is a program. Trained this way with the GRPO algorithm (
            <a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener noreferrer">
              Shao et al., 2024
            </a>
            ), DeepSeek-R1-Zero discovered long chains-of-thought on its own, including self-checking and
            backtracking, the "aha moment" (
            <a href="https://arxiv.org/abs/2501.12948" target="_blank" rel="noopener noreferrer">
              DeepSeek-R1, 2025
            </a>
            ).
          </p>
          <p>
            Where does this sit in the full pipeline? Pretraining (Step 1 of <ModuleLink id="pretraining" />)
            builds the raw engine; everything after it shapes behavior. Click through the stages:
          </p>
          <WidgetFrame
            title="Post-training pipeline"
            subtitle="Base model → SFT → reward model → RL optimization → RLVR. Select a stage to see data in, what's trained, and what you get."
          >
            <PostTrainingPipeline />
          </WidgetFrame>
          <Callout kind="info" title="Why verifiable rewards matter">
            A learned reward model is a proxy, and proxies get hacked (Module <ModuleLink id="fine-tuning" />).
            A unit test cannot be flattered. RLVR trades coverage (only checkable domains) for integrity (the
            reward is exactly the objective), which is why reasoning models eat math and code benchmarks
            first, then distill the behavior into broader assistants.
          </Callout>
          <KeyTakeaways
            points={[
              'Pretraining = hide part of the text and reconstruct it; the three variants are causal (GPT), masked (BERT), span corruption (T5).',
              'Causal next-token won because training objective and inference procedure are the same thing.',
              'MoE routes each token to top-k of E experts: 671B-param capacity at 37B-param cost (DeepSeek-V3); load balancing is the catch.',
              'Llama 3 = dense scale with relentless engineering; DeepSeek-V3 = efficiency-first sparsity. Read recipes via params, tokens, GPU-hours, post-training stages.',
              'RLVR replaces learned reward models with programmatic checks (math answers, unit tests), reasoning skill without a hackable proxy.',
            ]}
          />
        </Prose>
      </section>
    </>
  )
}
