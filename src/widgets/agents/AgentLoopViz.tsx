/**
 * AgentLoopViz — animates the agent loop (perceive → reason → act → observe)
 * over a scripted two-iteration scenario. Every trace line is real content,
 * controls are keyboard-operable, and state changes are announced politely.
 */
import { useEffect, useMemo, useState } from 'react'
import { Slider } from '../../components/ui'

type Phase = 'Perceive' | 'Reason' | 'Act' | 'Observe'
const PHASES: Phase[] = ['Perceive', 'Reason', 'Act', 'Observe']

type Iteration = Record<Phase, string>

const ITERATIONS: Iteration[] = [
  {
    Perceive: 'Read the user request: "What is the weather in Tokyo right now?"',
    Reason: 'No weather data in my context — I cannot know this unaided. A tool exists: get_weather. Plan: call it with city="Tokyo".',
    Act: 'Call get_weather(city="Tokyo")',
    Observe: 'Tool returned: { "temp_c": 22, "condition": "sunny" } — now in context.',
  },
  {
    Perceive: 'The tool result is now in my context window.',
    Reason: 'I have everything needed to answer. No further tool calls required.',
    Act: 'Compose and send the final reply: "Tokyo is 22°C and sunny."',
    Observe: 'User received the answer — goal met, loop terminates.',
  },
]

type Step = { iter: number; phase: Phase; text: string }

const FLAT: Step[] = ITERATIONS.flatMap((it, i) =>
  PHASES.map((p) => ({ iter: i + 1, phase: p, text: it[p] })),
)

const PHASE_HINTS: Record<Phase, string> = {
  Perceive: 'gather input',
  Reason: 'think & decide',
  Act: 'use a tool / reply',
  Observe: 'read the result',
}

export function AgentLoopViz() {
  const [tick, setTick] = useState(0)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(2) // 1..5

  const intervalMs = useMemo(() => 1800 - speed * 300, [speed]) // 1500..300ms

  const atEnd = tick >= FLAT.length - 1

  useEffect(() => {
    if (!running) return
    if (atEnd) {
      setRunning(false)
      return
    }
    const id = setInterval(() => setTick((t) => Math.min(t + 1, FLAT.length - 1)), intervalMs)
    return () => clearInterval(id)
  }, [running, tick, atEnd, intervalMs])

  const current = FLAT[tick]
  const activePhase = current.phase
  const phaseIdx = PHASES.indexOf(activePhase)

  const trace = FLAT.slice(0, tick + 1).slice().reverse()

  const playPause = () => {
    if (atEnd && !running) setTick(0) // restart from the top
    setRunning((r) => !r)
  }

  const stepOnce = () => {
    setRunning(false)
    setTick((t) => Math.min(t + 1, FLAT.length - 1))
  }

  const reset = () => {
    setRunning(false)
    setTick(0)
  }

  return (
    <div className="space-y-4">
      {/* Loop diagram */}
      <div
        role="img"
        aria-label={`Agent loop diagram, iteration ${current.iter} of ${ITERATIONS.length}, currently in the ${activePhase} phase: ${current.text}`}
      >
        <div className="flex flex-wrap items-stretch justify-center gap-2">
          {PHASES.map((p, i) => {
            const active = p === activePhase
            const done = i < phaseIdx
            return (
              <div key={p} className="flex items-stretch gap-2">
                <div
                  className={`flex w-36 flex-col justify-center rounded-lg border px-3 py-2 transition-colors duration-300 sm:w-44 ${
                    active
                      ? 'border-accent bg-accent/10 shadow-[0_0_16px_rgba(34,211,238,0.25)]'
                      : done
                        ? 'border-success/50 bg-success/5'
                        : 'border-border bg-surface-raised/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${active ? 'animate-pulse bg-accent' : done ? 'bg-success' : 'bg-border'}`}
                    />
                    <span className={`text-sm font-semibold ${active ? 'text-accent' : done ? 'text-success' : 'text-ink'}`}>
                      {p}
                    </span>
                  </div>
                  <span className="mt-0.5 text-[11px] text-ink-muted">{PHASE_HINTS[p]}</span>
                </div>
                {i < PHASES.length - 1 && (
                  <span aria-hidden className="self-center text-lg text-ink-muted">→</span>
                )}
              </div>
            )
          })}
        </div>
        <p aria-hidden className="mt-2 text-center text-[11px] text-ink-muted">
          ⟲ observe feeds back into perceive — the loop repeats until the goal is met
        </p>
      </div>

      {/* Current phase narration */}
      <div className="rounded-lg border border-border bg-surface-raised/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-mono text-accent">
            iteration {current.iter}/{ITERATIONS.length} · {activePhase}
          </span>
          <span className="text-ink-muted">step {tick + 1}/{FLAT.length}</span>
        </div>
        <p aria-live="polite" className="mt-1 text-sm text-ink/90">{current.text}</p>
        <p className="sr-only" aria-live="polite">
          Iteration {current.iter}, {activePhase} phase: {current.text}
        </p>
      </div>

      {/* Trace log (newest first) */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Trace</div>
        <ol className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {trace.map((s, i) => (
            <li
              key={`${s.iter}-${s.phase}-${FLAT.length - i}`}
              className={`rounded border px-2.5 py-1.5 text-xs ${i === 0 ? 'border-accent/40 bg-accent/5 text-ink' : 'border-border text-ink-muted'}`}
            >
              <span className="mr-2 font-mono text-[10px]">t{s.iter}.{s.phase[0]}</span>
              <span className="font-medium">{s.phase}</span> — {s.text}
            </li>
          ))}
        </ol>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 border-t border-border pt-3">
        <button
          onClick={playPause}
          aria-pressed={running}
          aria-label={running ? 'Pause the agent loop animation' : 'Play the agent loop animation'}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
        >
          {running ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={stepOnce}
          disabled={atEnd}
          aria-label="Advance one phase"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          Step ▸
        </button>
        <button
          onClick={reset}
          aria-label="Reset the animation to the beginning"
          className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
        >
          ↺ Reset
        </button>
        <div className="w-36">
          <Slider
            label="Speed"
            value={speed}
            min={1}
            max={5}
            step={1}
            onChange={setSpeed}
            format={(v) => `${v}×`}
          />
        </div>
      </div>
    </div>
  )
}
