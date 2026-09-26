/**
 * VectorSearchDemo — a miniature HNSW-style index over 40 seeded points.
 * A greedy walk descends the layers; every similarity evaluation is counted
 * and compared against brute force (all 40 points). Cosine similarity comes
 * from src/lib/math.ts.
 */
import { useEffect, useMemo, useState } from 'react'
import { cosineSimilarity, seededRandom } from '../../lib/math'
import { Tabs } from '../../components/ui'
import { Pill } from './shared'

const N = 40
const M = 2 // edges kept per node per layer
const SEED = 20260114

type Node = { x: number; y: number; level: number }
type Attempt = { layer: number; from: number; to: number; evals: number; sim: number }

function vec(n: Node): number[] {
  return [n.x, n.y]
}

function buildGraph() {
  const rand = seededRandom(SEED)
  const nodes: Node[] = []
  for (let i = 0; i < N; i++) {
    nodes.push({
      x: 0.25 + rand() * 0.75,
      y: 0.25 + rand() * 0.75,
      level: (() => {
        let level = 0
        let r = rand()
        while (r < 0.35 && level < 2) {
          level++
          r = rand()
        }
        return level
      })(),
    })
  }
  const topLevel = Math.max(...nodes.map((n) => n.level))

  // adjacency per layer: layers[layer][i] = neighbor ids of node i on that layer
  const layers: number[][][] = []
  for (let layer = 0; layer <= topLevel; layer++) {
    const present = nodes.map((_, i) => i).filter((i) => nodes[i].level >= layer)
    const adj: number[][] = Array.from({ length: N }, () => [])
    for (const i of present) {
      const sims = present
        .filter((j) => j !== i)
        .map((j) => ({ j, s: cosineSimilarity(vec(nodes[i]), vec(nodes[j])) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, M)
      for (const { j } of sims) {
        if (!adj[i].includes(j)) adj[i].push(j)
        if (!adj[j].includes(i)) adj[j].push(i)
      }
    }
    layers.push(adj)
  }

  let entry = 0
  for (let i = 1; i < N; i++) if (nodes[i].level > nodes[entry].level) entry = i
  return { nodes, layers, entry, topLevel }
}

function greedyWalk(
  nodes: Node[],
  layers: number[][][],
  entry: number,
  topLevel: number,
  target: number,
): { attempts: Attempt[]; evals: number; found: number } {
  const attempts: Attempt[] = []
  let current = entry
  let currentSim = cosineSimilarity(vec(nodes[current]), vec(nodes[target]))
  let evals = 1 // the entry point itself
  for (let layer = topLevel; layer >= 0; layer--) {
    let improved = true
    while (improved) {
      improved = false
      const neighbors = layers[layer][current] ?? []
      let best: number | null = null
      let bestSim = currentSim
      for (const j of neighbors) {
        evals++
        const s = cosineSimilarity(vec(nodes[j]), vec(nodes[target]))
        if (s > bestSim) {
          bestSim = s
          best = j
        }
      }
      if (best !== null) {
        attempts.push({ layer, from: current, to: best, evals: neighbors.length, sim: bestSim })
        current = best
        currentSim = bestSim
        improved = true
      } else {
        attempts.push({ layer, from: current, to: -1, evals: neighbors.length, sim: currentSim })
      }
    }
  }
  return { attempts, evals, found: current }
}

export default function VectorSearchDemo() {
  const graph = useMemo(() => buildGraph(), [])
  const { nodes, layers, entry, topLevel } = graph
  const [target, setTarget] = useState(11)
  const [reveal, setReveal] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState('HNSW walk')

  const walk = useMemo(() => greedyWalk(nodes, layers, entry, topLevel, target), [nodes, layers, entry, topLevel, target])
  const trueNN = useMemo(() => {
    let best = 0
    for (let i = 1; i < N; i++) {
      if (cosineSimilarity(vec(nodes[i]), vec(nodes[target])) > cosineSimilarity(vec(nodes[best]), vec(nodes[target]))) best = i
    }
    return best
  }, [nodes, target])

  useEffect(() => {
    if (!playing) return
    if (reveal >= walk.attempts.length) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setReveal((v) => Math.min(v + 1, walk.attempts.length)), 700)
    return () => clearTimeout(t)
  }, [playing, reveal, walk.attempts.length])

  const reset = (newTarget?: number) => {
    if (newTarget !== undefined) setTarget(newTarget)
    setReveal(0)
    setPlaying(false)
  }

  const revealed = walk.attempts.slice(0, reveal)
  const evalsSoFar = reveal > 0 ? revealed.reduce((a, s) => a + s.evals, 0) + 1 : 0
  const lastStep = revealed[revealed.length - 1]
  const currentNode = lastStep ? (lastStep.to >= 0 ? lastStep.to : lastStep.from) : entry
  const done = reveal >= walk.attempts.length && reveal > 0
  const bruteEvals = N

  const hit = (i: number) => (i === target ? '#f59e0b' : i === currentNode && reveal > 0 ? '#34d399' : '#3b4a63')
  const pathEdges = revealed.filter((s) => s.to >= 0)

  return (
    <div className="space-y-4 text-sm">
      <Tabs tabs={['HNSW walk', 'Brute force']} active={view} onChange={setView} />

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <svg
          viewBox="0 0 100 100"
          className="h-72 w-72 rounded-lg border border-border bg-void/60 sm:h-96 sm:w-96"
          role="img"
          aria-label={
            view === 'HNSW walk'
              ? `Layered graph search animation: at step ${reveal} of ${walk.attempts.length}, current node ${currentNode}`
              : 'Brute force: the query compares against all 40 points'
          }
        >
          {/* edges of the layer currently being walked */}
          {view === 'HNSW walk' &&
            layers.map((adj, layer) => (
              <g key={`edges-${layer}`} opacity={reveal > 0 ? 0.35 : 0.18}>
                {adj.map((nbrs, i) =>
                  nbrs
                    .filter((j) => j > i)
                    .map((j) => (
                      <line
                        key={`${layer}-${i}-${j}`}
                        x1={nodes[i].x * 100}
                        y1={100 - nodes[i].y * 100}
                        x2={nodes[j].x * 100}
                        y2={100 - nodes[j].y * 100}
                        stroke="#253048"
                        strokeWidth={0.35}
                      />
                    )),
                )}
              </g>
            ))}

          {/* brute-force: lines from target to everything */}
          {view === 'Brute force' &&
            nodes.map((n, i) =>
              i === target ? null : (
                <line
                  key={`bf-${i}`}
                  x1={nodes[target].x * 100}
                  y1={100 - nodes[target].y * 100}
                  x2={n.x * 100}
                  y2={100 - n.y * 100}
                  stroke="#22d3ee"
                  strokeWidth={0.3}
                  opacity={0.35}
                />
              ),
            )}

          {/* walked path */}
          {view === 'HNSW walk' &&
            pathEdges.map((s, i) => (
              <line
                key={`path-${i}`}
                x1={nodes[s.from].x * 100}
                y1={100 - nodes[s.from].y * 100}
                x2={nodes[s.to].x * 100}
                y2={100 - nodes[s.to].y * 100}
                stroke="#22d3ee"
                strokeWidth={0.9}
                opacity={0.9}
              />
            ))}

          {/* nodes */}
          {nodes.map((n, i) => (
            <circle key={i} cx={n.x * 100} cy={100 - n.y * 100} r={i === entry ? 2.4 : 1.7} fill={hit(i)} opacity={0.95} />
          ))}

          {/* entry marker + target ring */}
          {view === 'HNSW walk' && (
            <text x={nodes[entry].x * 100 + 3} y={100 - nodes[entry].y * 100 - 2} fontSize={3.2} fill="#8b95a8">
              entry
            </text>
          )}
          <circle
            cx={nodes[target].x * 100}
            cy={100 - nodes[target].y * 100}
            r={4}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={0.8}
          />
        </svg>

        <div className="space-y-3">
          <div role="group" aria-label="Pick a target node" className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-ink-muted">Target:</span>
            {[3, 11, 19, 27, 35, 39].map((i) => (
              <button
                key={i}
                onClick={() => reset(i)}
                aria-pressed={target === i}
                className={`rounded-md border px-2 py-1 font-mono text-xs transition ${
                  target === i ? 'border-highlight/60 bg-highlight/10 text-highlight' : 'border-border text-ink-muted hover:text-ink'
                }`}
              >
                #{i}
              </button>
            ))}
          </div>

          {view === 'HNSW walk' ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setReveal(0)
                    setPlaying(true)
                  }}
                  aria-label="Run the HNSW greedy walk from the start"
                  className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-primary/85"
                >
                  ▶ Run
                </button>
                <button
                  onClick={() => setReveal((v) => Math.min(v + 1, walk.attempts.length))}
                  aria-label="Step one hop"
                  className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
                >
                  Step
                </button>
                <button
                  onClick={() => reset()}
                  aria-label="Reset the animation"
                  className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-raised"
                >
                  Reset
                </button>
              </div>

              <div className="rounded-lg border border-border bg-surface-raised/40 p-3" aria-live="polite">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Pill tone="accent">similarity checks: {evalsSoFar}</Pill>
                  <Pill>brute force: {bruteEvals}</Pill>
                  <Pill tone="highlight">layer {lastStep ? lastStep.layer : topLevel}</Pill>
                </div>
                <p className="mt-2 text-xs text-ink/85">
                  {reveal === 0
                    ? `Greedy walk starts at node #${entry} (the top-layer entry point) and always moves to the neighbor most similar to the target — or stops and descends.`
                    : lastStep?.to === -1
                      ? `No neighbor of #${lastStep.from} beats its similarity (${lastStep.sim.toFixed(3)}) on layer ${lastStep.layer} — local optimum, descend.`
                      : `Hopped to #${lastStep?.to} (cosine ${lastStep?.sim.toFixed(3)}).`}
                </p>
                {done && (
                  <p className="mt-2 text-xs">
                    {walk.found === trueNN ? (
                      <span className="text-success">
                        ✓ Found #{walk.found} — the true nearest neighbor — using {walk.evals} checks vs {bruteEvals} for brute force.
                      </span>
                    ) : (
                      <span className="text-highlight">
                        ⚠ Stopped at #{walk.found} (cosine {cosineSimilarity(vec(nodes[walk.found]), vec(nodes[target])).toFixed(3)}),
                        but the true NN is #{trueNN} (
                        {cosineSimilarity(vec(nodes[trueNN]), vec(nodes[target])).toFixed(3)}). That’s the
                        <em> approximate</em> in ANN — recall traded for speed.
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-surface-raised/40 p-3" aria-live="polite">
              <p className="text-xs text-ink/85">
                Brute force computes cosine similarity between the query and <strong>every one</strong> of the{' '}
                {N} points — exact, but O(N) per query. At 40 points that’s nothing; at 100 million vectors
                it’s why vector databases need ANN indexes like HNSW.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Pill tone="accent">similarity checks: {bruteEvals}</Pill>
                <Pill tone="success">always finds the true NN</Pill>
              </div>
            </div>
          )}

          <p className="text-xs text-ink-muted">
            {done && walk.found !== trueNN
              ? 'Try the same target with brute force, then run HNSW again — the walk is deterministic, so it misses the same way every time. Larger M (more edges) would fix it at a memory cost.'
              : 'Every similarity value is computed live from the seeded 2D vectors — nothing is precomputed.'}
          </p>
        </div>
      </div>
    </div>
  )
}
