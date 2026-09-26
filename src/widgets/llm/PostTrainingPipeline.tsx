/**
 * PostTrainingPipeline — interactive stage diagram of post-training:
 * Base model → SFT → Reward model → RL optimization → RLVR (reasoning).
 *
 * Stages are selectable buttons (keyboard-operable, aria-pressed); selecting a
 * stage shows what data goes in, what gets trained, and what you get out.
 * Pages can override the stage list via props.
 */
import { useState } from 'react'

export type PipelineStage = {
  id: string
  title: string
  tag: string
  /** Data that goes into this stage */
  data: string
  /** What is being trained / fitted */
  trained: string
  /** What you get out */
  output: string
}

export const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: 'base',
    title: 'Base model',
    tag: 'pretrained',
    data: 'Trillions of web tokens (next-token pretraining).',
    trained: 'Nothing — this is the frozen starting point.',
    output: 'A model that completes text brilliantly but ignores instructions.',
  },
  {
    id: 'sft',
    title: 'SFT',
    tag: 'supervised',
    data: '10K–1M curated (instruction → good response) demonstration pairs.',
    trained: 'All weights, next-token loss on response tokens only.',
    output: 'An instruct model: follows the chat format, still uneven in quality.',
  },
  {
    id: 'rm',
    title: 'Reward model',
    tag: 'preference data',
    data: 'Human (or AI) rankings: same prompt, two responses, which is better?',
    trained: 'A separate scoring head/model under the Bradley–Terry pairwise loss.',
    output: 'A proxy for "helpful" that can score any response automatically.',
  },
  {
    id: 'rl',
    title: 'RL optimization',
    tag: 'PPO / DPO / GRPO',
    data: "Prompts; the policy's own sampled responses, scored by the RM (or the preference pairs directly, for DPO).",
    trained: 'The policy (all weights or LoRA adapters), usually with a KL leash to the SFT model.',
    output: 'An aligned assistant tuned to what humans preferred — the InstructGPT recipe.',
  },
  {
    id: 'rlvr',
    title: 'RLVR (reasoning)',
    tag: 'verifiable rewards',
    data: 'Prompts with checkable answers: math, code with unit tests, formats.',
    trained: 'The policy only, with rule-based rewards (right answer = 1). No reward model.',
    output: 'A reasoning model that chains long chains-of-thought (DeepSeek-R1 style).',
  },
]

export default function PostTrainingPipeline({
  stages = DEFAULT_STAGES,
  heading = 'The post-training pipeline',
}: {
  stages?: PipelineStage[]
  heading?: string
}) {
  const [active, setActive] = useState(0)
  const stage = stages[active]

  return (
    <div className="space-y-4">
      <div role="group" aria-label={heading} className="flex flex-wrap items-stretch gap-2">
        {stages.map((s, i) => {
          const isActive = i === active
          return (
            <div key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                aria-label={`Stage ${i + 1} of ${stages.length}: ${s.title}`}
                className={`min-w-[110px] rounded-lg border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-accent/60 bg-accent/10 text-ink'
                    : 'border-border bg-surface text-ink-muted hover:border-accent/40 hover:text-ink'
                }`}
              >
                <span className={`block font-mono text-[10px] ${isActive ? 'text-accent' : 'text-ink-muted'}`}>
                  {i + 1} · {s.tag}
                </span>
                <span className="block text-sm font-semibold">{s.title}</span>
              </button>
              {i < stages.length - 1 && (
                <span aria-hidden="true" className="text-ink-muted">
                  →
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-border bg-surface-raised/40 p-4" aria-live="polite">
        <h4 className="text-sm font-semibold text-accent">
          Stage {active + 1} — {stage.title}
        </h4>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Data in</dt>
            <dd className="mt-1 text-ink/85">{stage.data}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">What's trained</dt>
            <dd className="mt-1 text-ink/85">{stage.trained}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">What you get</dt>
            <dd className="mt-1 text-ink/85">{stage.output}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
