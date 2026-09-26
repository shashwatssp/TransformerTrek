/**
 * Scaled dot-product attention simulation on toy embeddings.
 * Real enough to teach the math; small enough to visualize every number.
 */
import { dot, gaussian, matVec, seededRandom, softmax } from './math'

export type AttentionResult = {
  /** raw scores (q·k / sqrt(d)) before masking */
  scores: number[][]
  /** scores after causal mask applied (masked = -Infinity) */
  masked: number[][]
  /** softmax rows */
  weights: number[][]
  /** weighted sum of values per query token */
  outputs: number[][]
}

export function scaledDotProductAttention(
  Q: number[][],
  K: number[][],
  V: number[][],
  opts: { causal?: boolean; temperature?: number } = {},
): AttentionResult {
  const { causal = true, temperature = 1 } = opts
  const d = K[0].length
  const scale = Math.sqrt(d)
  const n = Q.length
  const scores: number[][] = []
  const masked: number[][] = []
  const weights: number[][] = []
  const outputs: number[][] = []

  for (let i = 0; i < n; i++) {
    const raw = K.map((k) => dot(Q[i], k) / scale)
    scores.push(raw)
    const row: number[] = raw.map((s, j) => (causal && j > i ? -Infinity : s))
    masked.push(row)
    const w = softmax(row.map((s) => s / temperature))
    weights.push(w)
    outputs.push(V.map((_, dk) => w.reduce((acc, wk, j) => acc + wk * V[j][dk], 0)))
  }
  void n
  return { scores, masked, weights, outputs }
}

/** Deterministic toy Q/K/V projections from seeded random matrices */
export function makeProjections(seqs: string[], dModel: number, dHead: number, seed: number) {
  const rand = seededRandom(seed)
  const mk = (rows: number, cols: number): number[][] =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => gaussian(rand)))
  const Wq = mk(dModel, dHead)
  const Wk = mk(dModel, dHead)
  const Wv = mk(dModel, dHead)
  // deterministic token embeddings (hash-based, dModel dims)
  const E: number[][] = seqs.map((t) => {
    const r = seededRandom(hashString(t))
    return Array.from({ length: dModel }, () => gaussian(r))
  })
  return {
    Q: E.map((e) => matVec(Wq, e)),
    K: E.map((e) => matVec(Wk, e)),
    V: E.map((e) => matVec(Wv, e)),
    E,
  }
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Different projection seed per head for the multi-head view */
export function makeHeads(seqs: string[], dModel: number, dHead: number, nHeads: number) {
  return Array.from({ length: nHeads }, (_, h) =>
    makeProjections(seqs, dModel, dHead, 1000 + h * 17),
  )
}
