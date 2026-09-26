/** Shared math utilities for all widgets. Everything runs client-side. */

export function softmax(logits: number[], temperature = 1): number[] {
  const t = Math.max(temperature, 1e-4)
  const scaled = logits.map((l) => l / t)
  const max = Math.max(...scaled)
  const exps = scaled.map((l) => Math.exp(l - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

export function dot(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i]
  return sum
}

export function matVec(m: number[][], v: number[]): number[] {
  return m.map((row) => dot(row, v))
}

/** Deterministic seeded RNG (mulberry32), reproducible widget demos */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard-normal sample via Box-Muller from a seeded RNG */
export function gaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Top-k indices by score (descending) */
export function topK(scores: number[], k: number): number[] {
  return scores
    .map((s, i) => [s, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
    .map(([, i]) => i)
}

/** Top-p (nucleus) indices: smallest set whose probabilities sum >= p */
export function topP(probs: number[], p: number): number[] {
  const sorted = probs.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0])
  const kept: number[] = []
  let cum = 0
  for (const [prob, i] of sorted) {
    kept.push(i)
    cum += prob
    if (cum >= p) break
  }
  return kept
}

/** Sample an index proportionally to probabilities */
export function sampleFrom(probs: number[], rand: () => number): number {
  const r = rand()
  let cum = 0
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i]
    if (r <= cum) return i
  }
  return probs.length - 1
}

export function linspace(n: number, min = 0, max = 1): number[] {
  if (n === 1) return [min]
  const step = (max - min) / (n - 1)
  return Array.from({ length: n }, (_, i) => min + i * step)
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x))
}

export function formatNumber(x: number, digits = 3): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(digits)
}
