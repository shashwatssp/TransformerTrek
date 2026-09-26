/**
 * Module 5.4 — MCP — Model Context Protocol
 * Body content follows the registry steps for id 'mcp'.
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
import { MCPFlow } from '../../widgets/agents/MCPFlow'

const meta = getModule('mcp')!

const sdkCode = `// Connecting to an MCP server with the official TypeScript SDK
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const client = new Client({ name: "trek-demo", version: "1.0.0" })
await client.connect(new StreamableHTTPClientTransport("https://mcp.example.com/mcp"))

const { tools } = await client.listTools()          // discovery → your tool registry
const result = await client.callTool({              // one standardized call shape
  name: "get_forecast",
  arguments: { city: "Tokyo", days: 3 },
})`

export default function Mcp() {
  return (
    <ModuleLayout meta={meta}>
      <Prose>
        <p>
          <ModuleLink id="tools-react" /> ended on a problem: every app hand-wires its own tool
          registry, and every tool author writes app-specific glue. MCP — the Model Context
          Protocol — replaces that N×M matrix of custom integrations with one standard. Here's
          what it actually specifies, including where the{' '}
          <a href="https://modelcontextprotocol.io/specification/latest" target="_blank" rel="noopener noreferrer">latest specification</a>{' '}
          is taking it.
        </p>
      </Prose>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
<H2>Step 1 — The N×M problem MCP solves</H2>
      <Prose>
        <p>
          Suppose M tool providers (weather, GitHub, your Postgres, Spotify…) and N AI
          applications (Claude Desktop, your IDE, your homegrown agent). Without a standard,
          connecting them all means writing and maintaining <strong>N × M</strong> adapters — and
          every new player multiplies the work. This was USB-before-the-USB.
        </p>
        <p>
          MCP — introduced by{' '}
          <a href="https://modelcontextprotocol.io/introduction" target="_blank" rel="noopener noreferrer">Anthropic in late 2024</a>{' '}
          and now governed as an open standard — collapses the matrix to{' '}
          <strong>N + M</strong>: apps implement the client side once; tool providers implement
          the server side once. This module's own docs site, your IDE, and thousands of servers
          already speak it.
        </p>
        <Callout kind="info" title="Protocol, not product">
          MCP doesn't execute anything and isn't a marketplace. It's a message contract (built on
          JSON-RPC 2.0) for <em>discovering</em> capabilities and <em>invoking</em> them — the
          union jack of N×M problems.
        </Callout>
      </Prose>

      {/* ── Step 2 ─────────────────────────────────────────────── */}
<H2>Step 2 — Hosts, clients, servers</H2>
      <Prose>
        <p>
          Three roles, and the boundaries between them are the security model:
        </p>
        <ol className="my-4 list-decimal space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Host</strong> — the AI application the user runs (an IDE, Claude Desktop, your agent). It owns the LLM and the context.</li>
          <li><strong>Client</strong> — a connector the host spawns, one per server, holding that single connection's lifecycle.</li>
          <li><strong>Server</strong> — an external process (local stdio or remote HTTP) exposing capabilities under one protocol.</li>
        </ol>
        <p>
          Watch the full handshake in the Sequence tab — initialize, capability exchange,{' '}
          <code className="font-mono text-accent">tools/list</code> discovery, then a real{' '}
          <code className="font-mono text-accent">tools/call</code>:
        </p>
      </Prose>
      <WidgetFrame
        title="MCPFlow — the standard conversation"
        subtitle="Sequence tab: the full handshake. Primitives tab: tools/resources/prompts. 2026 spec tab: stateless core + Tasks."
      >
        <MCPFlow />
      </WidgetFrame>

      {/* ── Step 3 ─────────────────────────────────────────────── */}
<H2>Step 3 — Tools, resources, prompts: the primitives</H2>
      <Prose>
        <p>
          A server can offer exactly three kinds of capability, and the distinction that matters
          is <strong>who controls when each is used</strong> (see the Primitives tab above):
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Tools</strong> — model-controlled. The LLM decides to call them, as in <ModuleLink id="tools-react" />.</li>
          <li><strong>Resources</strong> — app-controlled. URI-addressed data the <em>host</em> attaches for context (a file, a DB row) — the model doesn't choose them mid-generation.</li>
          <li><strong>Prompts</strong> — user-controlled. Reusable templates the <em>human</em> picks deliberately, like a slash-command.</li>
        </ul>
        <p>
          Getting these three right is what let one integration serve many surfaces: the same
          GitHub MCP server powers an IDE's @-mentions (resources), an agent's pull-request tool
          (tools), and a "/review" command (prompts).
        </p>
      </Prose>

      {/* ── Step 4 ─────────────────────────────────────────────── */}
<H2>Step 4 — Discovery and capabilities</H2>
      <Prose>
        <p>
          Nothing about a server is hard-coded. At connection time the{' '}
          <code className="font-mono text-accent">initialize</code> handshake trades protocol
          versions and <strong>capabilities</strong> ("I offer tools and resources"); afterwards
          the client enumerates specifics with{' '}
          <code className="font-mono text-accent">tools/list</code>,{' '}
          <code className="font-mono text-accent">resources/list</code>,{' '}
          <code className="font-mono text-accent">prompts/list</code> — each returning JSON
          Schemas that drop straight into the tool registry you built in{' '}
          <ModuleLink id="tools-react" />. Wire a new server into a host and its tools appear
          with zero host-side code. That's the whole trick.
        </p>
        <CodeBlock language="ts" filename="mcp_client.ts" code={sdkCode} />
        <Callout kind="warn" title="Trust boundary">
          Discovery means the host <em>learns</em> tool descriptions at runtime — and the model
          reads them. A malicious server can describe itself as benign. Hosts therefore gate
          sensitive calls behind human approval, and you should treat server metadata as
          untrusted input, not documentation.
        </Callout>
      </Prose>

      {/* ── Step 5 ─────────────────────────────────────────────── */}
<H2>Step 5 — The 2026 spec: stateless core and Tasks</H2>
      <Prose>
        <p>
          The early protocol assumed one chatty, stateful session per connection. The{' '}
          <a href="https://modelcontextprotocol.io/specification/latest" target="_blank" rel="noopener noreferrer">current specification work</a>{' '}
          (done in the open in the{' '}
          <a href="https://github.com/modelcontextprotocol/modelcontextprotocol" target="_blank" rel="noopener noreferrer">spec repo</a>, via numbered SEPs) pushes two upgrades — the{' '}
          <strong>2026 spec</strong> tab in the widget above walks them:
        </p>
        <ul className="my-4 list-disc space-y-1.5 pl-6 text-sm text-ink/90">
          <li><strong>Stateless core</strong> — after initialize, calls carry what they need; servers hold no per-session state. Now they scale horizontally and restart without breaking clients.</li>
          <li><strong>Tasks</strong> — long operations become first-class objects you can poll, resume, and cancel, instead of one HTTP request held open for minutes.</li>
          <li><strong>MCP Apps</strong> — an extension bringing structured, interactive UI from server to host, so a server can return a small app rather than a wall of text.</li>
        </ul>
        <p>
          The same standardization story is now happening <em>between</em> agents — that's{' '}
          <ModuleLink id="a2a-multiagent" />.
        </p>
      </Prose>

      <KeyTakeaways
        points={[
          'MCP turns N×M app↔tool integrations into N+M: one client implementation per app, one server implementation per tool provider, one message contract for all.',
          'Host (owns the LLM) → client (one per server) → server (exposes capabilities) — the boundaries are the security model.',
          'Three primitives, distinguished by who controls them: tools (model), resources (app), prompts (user).',
          'Discovery is runtime and schema-driven: initialize negotiates capabilities, tools/list returns JSON Schemas ready for your registry.',
          'The 2026 direction — stateless core, Tasks, MCP Apps — makes servers scalable cloud infrastructure fit for long-running agents.',
        ]}
      />
    </ModuleLayout>
  )
}
