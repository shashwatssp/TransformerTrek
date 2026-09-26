/**
 * Module 4.8: Vector Databases, Compared
 * Body content follows the registry steps for id 'vector-databases'.
 * Product details (pricing, index support) evolve quickly; figures are
 * approximate and each claim links to a primary source.
 */
import { getModule } from '../registry'
import { ModuleLayout } from '../../components/layout/ModuleLayout'
import {
  Callout,
  H2,
  KeyTakeaways,
  ModuleLink,
  Prose,
} from '../../components/ui'
import { extClass } from '../../widgets/retrieval/shared'

const meta = getModule('vector-databases')!

const th = 'py-1 pr-3 font-medium text-left'
const td = 'py-1.5 pr-3 text-left align-top'

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={extClass} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export default function VectorDatabases() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          <ModuleLink id="vector-search" /> showed why brute force dies at scale and how HNSW saves
          it. This module covers the systems that productionize that idea: the databases that hold
          billions of vectors, filter them by metadata, fuse them with BM25, and stay up at 3 a.m.
          You will learn the index zoo, the hosting models, and a selection guide that matches
          <ModuleLink id="embedding-models" /> to a store.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
      <H2>Step 1: Why a dedicated database</H2>
      <Prose>
        <p>
          A vector database is four things in one box:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>An ANN index</strong> (HNSW, IVF, DiskANN) so queries touch a logarithmic slice of the corpus instead of all of it.</li>
          <li><strong>CRUD with consistency</strong>: insert, update, delete, and re-embed without rebuilding the world. A raw FAISS index is a static file; a database is not.</li>
          <li><strong>Metadata filtering</strong>: "nearest neighbors among docs where tenant = 42 and date &gt; 2025". Filtering before or during search is one of the trickiest, most differentiating parts.</li>
          <li><strong>Production plumbing</strong>: replication, backups, auth, multi-tenancy, observability.</li>
        </ul>
        <Callout kind="info" title="You may not need one">
          Below roughly a million vectors, brute force over a NumPy array (or sqlite + a scan) is
          milliseconds and has zero moving parts. Add a vector database when scale, filtering, or
          concurrent writes demand it, not before.
        </Callout>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
      <H2>Step 2: The index zoo: HNSW, IVF, DiskANN</H2>
      <Prose>
        <p>
          Every product below is a wrapper around a small set of algorithms. Knowing them means you
          can read any vendor's spec sheet:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">ANN index type comparison</caption>
            <thead>
              <tr className="text-ink-muted">
                <th className={th}>Index</th>
                <th className={th}>Idea</th>
                <th className={th}>Strengths</th>
                <th className={th}>Costs</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Flat (brute force)</td>
                <td className={td + ' font-sans'}>Score every vector, exact.</td>
                <td className={td + ' font-sans'}>100% recall, zero tuning.</td>
                <td className={td + ' font-sans'}>O(N) per query; fine under ~100K vectors.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>HNSW</td>
                <td className={td + ' font-sans'}>Layered proximity graph, greedy walk from the top (the demo in <ModuleLink id="vector-search" />).</td>
                <td className={td + ' font-sans'}>High recall, low latency, the industry default.</td>
                <td className={td + ' font-sans'}>Memory-hungry link lists; slow builds; deletion is awkward.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>IVF / IVF-PQ</td>
                <td className={td + ' font-sans'}>Cluster into lists, probe the closest few; PQ compresses vectors to bytes.</td>
                <td className={td + ' font-sans'}>Compact memory (10x to 100x with PQ), fast builds.</td>
                <td className={td + ' font-sans'}>Recall depends on nprobe; PQ loses precision.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>DiskANN / Vamana</td>
                <td className={td + ' font-sans'}>Graph index designed to stream from NVMe with a small RAM cache.</td>
                <td className={td + ' font-sans'}>Billions of vectors on one node, SSD budget not RAM budget.</td>
                <td className={td + ' font-sans'}>Higher latency than RAM-resident HNSW.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>ScaNN / Annoy</td>
                <td className={td + ' font-sans'}>Quantization-based (ScaNN) and random-projection forests (Annoy).</td>
                <td className={td + ' font-sans'}>ScaNN trades recall/latency well; Annoy is simple and read-only friendly.</td>
                <td className={td + ' font-sans'}>Largely superseded by the above in modern stores.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-muted">
          The universal trade-off is recall vs speed vs memory. Compare implementations with{' '}
          <Ext href="https://ann-benchmarks.com/">ann-benchmarks</Ext>, and always re-measure on
          your own dimension and distribution: graphs built for 384-dim MiniLM vectors behave
          differently at 3072.
        </p>
      </Prose>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
      <H2>Step 3: The landscape: managed, self-hosted, embedded</H2>
      <Prose>
        <p>
          Products differ less on the index (most run HNSW) than on the operational model:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Vector database product comparison</caption>
            <thead>
              <tr className="text-ink-muted">
                <th className={th}>Product</th>
                <th className={th}>Model</th>
                <th className={th}>Standout traits</th>
                <th className={th}>Watch out for</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Pinecone</td>
                <td className={td}>managed SaaS</td>
                <td className={td + ' font-sans'}>Serverless, zero ops, mature filtering.</td>
                <td className={td + ' font-sans'}>Proprietary, cost scales with usage; data leaves your premises.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Qdrant</td>
                <td className={td}>OSS + cloud</td>
                <td className={td + ' font-sans'}>Rust, strong payload filtering, scalar/PQ quantization, clean API.</td>
                <td className={td + ' font-sans'}>Younger ecosystem than Postgres-class tools.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Weaviate</td>
                <td className={td}>OSS + cloud</td>
                <td className={td + ' font-sans'}>Hybrid search (BM25 + vector) built in, GraphQL, modules for embedding.</td>
                <td className={td + ' font-sans'}>Concept overhead (classes, modules) before first query.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Milvus / Zilliz</td>
                <td className={td}>OSS + cloud</td>
                <td className={td + ' font-sans'}>Scale-first: many index types, GPU indexes, separable storage/compute.</td>
                <td className={td + ' font-sans'}>Distributed-systems complexity; overkill for small corpora.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>pgvector</td>
                <td className={td}>Postgres extension</td>
                <td className={td + ' font-sans'}>HNSW in your existing Postgres; joins with relational data; one system to operate.</td>
                <td className={td + ' font-sans'}>Scale ceiling vs purpose-built stores; tuning for huge corpora.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Elasticsearch / OpenSearch</td>
                <td className={td}>OSS + managed</td>
                <td className={td + ' font-sans'}>Best-in-class BM25, vectors alongside logs, mature hybrid.</td>
                <td className={td + ' font-sans'}>JVM ops weight; vector features trail specialists.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Redis</td>
                <td className={td}>OSS + managed</td>
                <td className={td + ' font-sans'}>Microsecond latency, vectors in the cache layer.</td>
                <td className={td + ' font-sans'}>RAM pricing; persistence semantics to learn.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Chroma</td>
                <td className={td}>embedded / server</td>
                <td className={td + ' font-sans'}>The fastest path from notebook to RAG prototype.</td>
                <td className={td + ' font-sans'}>Not aimed at large production fleets.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>LanceDB</td>
                <td className={td}>embedded, disk-based</td>
                <td className={td + ' font-sans'}>Columnar files (Lance), vectors next to multimodal data, zero server.</td>
                <td className={td + ' font-sans'}>You own the infra concerns a server would handle.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>Vespa</td>
                <td className={td}>OSS + managed</td>
                <td className={td + ' font-sans'}>Real ranking (ML inference at query time) at extreme scale.</td>
                <td className={td + ' font-sans'}>Steep learning curve, heavy footprint.</td>
              </tr>
              <tr className="border-t border-border">
                <td className={td + ' text-accent'}>FAISS</td>
                <td className={td}>library, not a DB</td>
                <td className={td + ' font-sans'}>Meta's research-grade index implementations, powers many products' cores.</td>
                <td className={td + ' font-sans'}>No CRUD, filtering, or serving; you build the rest.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
      <H2>Step 4: Filtering, hybrid, and operational realities</H2>
      <Prose>
        <p>
          Three features separate a vector <em>database</em> from a vector <em>index</em>:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li>
            <strong>Filtering.</strong> <em>Post-filtering</em> (search first, filter after) can
            return zero results when the top-k all fail the predicate. <em>Pre-filtering</em>{' '}
            (filter first, search within) can starve the ANN graph. Good engines do filtered HNSW:
            the graph walk respects the predicate as it goes. Test filtering with realistic
            selectivity, it is where recall silently dies.
          </li>
          <li>
            <strong>Hybrid search.</strong> Dense vectors miss exact tokens ("error code E-402");
            BM25 misses meaning. Engines that fuse both (Weaviate, Elasticsearch, Qdrant, Vespa)
            via <ModuleLink id="hybrid-search" /> RRF win benchmarks and prod incidents alike.
          </li>
          <li>
            <strong>Quantization and lifecycle.</strong> Scalar or product quantization shrinks
            memory several-fold at a recall cost you must measure. Also check: re-embedding when
            you swap models (<em>every</em> vector must be recomputed), backup/restore, and
            multi-tenant isolation if you serve many customers.
          </li>
        </ul>
      </Prose>

      {/* ── Step 5 ─────────────────────────────────────────────── */}
      <H2>Step 5: How to choose: a decision guide</H2>
      <Prose>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Already running Postgres?</strong> Start with <Ext href="https://github.com/pgvector/pgvector">pgvector</Ext>. One system, joins, transactions, and it comfortably handles many millions of vectors with HNSW. Graduate only when measured.</li>
          <li><strong>Prototype:</strong> Chroma embedded or LanceDB, zero servers, delete later without grief.</li>
          <li><strong>Managed, scale with zero ops:</strong> Pinecone (or Zilliz for Milvus semantics), pay for uptime and serverless elasticity.</li>
          <li><strong>Self-hosted specialist:</strong> Qdrant for filtering-heavy workloads; Weaviate if hybrid is central.</li>
          <li><strong>Hybrid-first / existing search team:</strong> Elasticsearch or OpenSearch, especially when the corpus already lives there.</li>
          <li><strong>Hundreds of millions to billions of vectors:</strong> Milvus, Vespa, or DiskANN-backed deployments; hire or already-have distributed-systems experience.</li>
        </ul>
        <p>
          Then measure like an engineer: index your corpus with each finalist, run 50 real queries,
          and plot recall@10 against p99 latency and RAM. Migration between stores is mostly
          "re-embed and re-index", cheap in the abstract, expensive at a billion vectors, so
          change your mind early if you can.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'A vector database = ANN index + CRUD + metadata filtering + production plumbing; below ~1M vectors you may need none of it.',
          'The index zoo is small: Flat (exact), HNSW (default graph), IVF-PQ (compact), DiskANN (disk-scale); all trade recall, latency, and memory.',
          'Products differ mainly on operational model: managed (Pinecone), self-hosted OSS (Qdrant, Weaviate, Milvus, Vespa), embedded (Chroma, LanceDB), extensions (pgvector), or a library (FAISS).',
          'Filtering strategy and hybrid fusion (BM25 + dense via RRF) decide real-world quality as much as the index does.',
          'Choose with data: recall@10 vs p99 latency vs RAM on your own corpus, and prefer the boring option that lives where your data already is.',
        ]}
      />
    </ModuleLayout>
  )
}
