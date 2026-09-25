# Molecule workspace → your AI client

Status, 2026-09-22: **implemented and protocol-tested locally; not installed in your account.**

The connector uses the official MCP TypeScript SDK over stdio. It reads the same
public synthetic program as `/workspace`, with one workspace fixed at launch,
and can optionally read one explicitly exported saved notebook.
It does not call an LLM. No OpenAI, OpenRouter or scientific-provider key is needed.

## Try it locally

From this application directory, with Node 22.13+ and installed dependencies:

```sh
node --experimental-strip-types --test scripts/test-mcp.mjs
```

That test starts the actual server as a subprocess and performs MCP initialization,
tool discovery, tool calls and resource reads. It also checks rejected input,
cross-workspace and cross-candidate requests. There is no mock transport.

To connect a local Codex client, run the following **from this application directory**.
This is an optional user action: it changes that client's MCP configuration.

```sh
codex mcp add molecule-demo -- node --experimental-strip-types "$PWD/integrations/mcp/server.mjs" --workspace vivamed-demo
```

Restart the client if necessary and inspect its MCP list. Suggested prompt:

> Use molecule-demo to inspect Endotype Alpha. Search for the functional evidence,
> fetch both Candidate A records, and prepare a context packet asking whether the
> signal reproduces. Include E01 and E02. Explain the unresolved difference in
> conditions. Identify all synthetic data and do not approve or execute anything.

`codex mcp remove molecule-demo` removes the optional client registration.

### Bring your saved work into the conversation

In the local workspace, prepare and save a brief, review it if useful, then click
**Export notebook**. The JSON includes frozen source packets, review rationale,
history and packet fingerprints. Keep the file in a private local directory.
To start a separate connector using exactly that file:

```sh
codex mcp add molecule-notebook -- node --experimental-strip-types "$PWD/integrations/mcp/server.mjs" --workspace vivamed-demo --notebook "/absolute/path/vivamed-demo-research-notebook.json"
```

Replace the example path with your selected export. Ask the client to search for
your saved question and use `get_saved_brief_context` for that brief ID. This
reads a **snapshot at process startup**, not the live notebook database. Export
again and restart the connector when you intentionally want newer saved context.
It does not automatically follow changes or scan Downloads, the vault, or Drive.

The adapter rejects relative paths, final-component symlinks, nonregular files
(including named pipes without blocking), files over 2 MiB,
wrong-workspace data, unsupported schemas and mismatched packet hashes. It also
checks packet contents against the current synthetic fixture format and validates
review/history consistency. Old exports from a different fixture version may be
rejected; there is no silent schema conversion. A hash is not a signature: exported
review identities are not authenticated, and an accepted brief is not approved
scientific knowledge. Only connect exports you intend to disclose to that AI client.

Local Codex supports stdio MCP processes. ChatGPT web uses remote MCP-backed
plugins; a local command alone does not connect it to the web account.
[Official MCP configuration documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Available operations

| Tool | What it does |
| --- | --- |
| `list_programs` | Lists the configured workspace, programs and candidate IDs. |
| `search` | Bounded lexical evidence search, not semantic or literature search. |
| `fetch` | Returns exact source text, fixture version and unreviewed status. |
| `build_context` | Creates an unsaved packet with standards, source versions and omitted-source warnings. |
| `compare_candidates` | Returns prepared qualitative comparison, not measured scores. |
| `get_saved_brief_context` | When a notebook export is selected: reads one frozen saved packet and its review metadata. |

All tools declare read-only, non-destructive, idempotent and closed-world behavior.
Three evidence records are also exposed as MCP resources. Search/fetch return
structured content and matching JSON text using the documented retrieval shape.
[OpenAI MCP server guidance](https://developers.openai.com/api/docs/mcp).

Resource identifiers use `molecule-workspace://` URIs. These work as MCP resource
identifiers, **not publicly resolvable web citations**. A production service needs
authenticated, stable source-page links before promising browser citation UX.

## Real boundaries

- Only `vivamed-demo` (synthetic) or `peptai-test` (empty) may be configured.
- A caller cannot supply a different workspace ID to a tool. Unknown fields fail
  validation rather than silently expanding scope.
- No private vault or live notebook database is read. Optional saved records come
  only from the one export selected in the startup command.
- No filesystem-path **tools**, network fetches, shell execution, writes, approvals,
  signing, wallets, provider jobs or model calls exist.
- Source records are data, not instructions. A consuming agent must preserve that
  boundary and retain source/review labels in its answer.
- Stdio is a local process trust boundary, **not tenant authentication**. Do not
  wrap this connector in a public unauthenticated HTTP endpoint.
- The connector can be used by any compatible MCP client; the scientific records
  and context packet do not belong to one model vendor.

The saved-notebook adapter shares explicitly exported context without bypassing
the application's authentication. A future live adapter needs an authenticated,
workspace-bound API. It must not guess a browser identity, forward spoofable
owner headers or scan a vault automatically.

## ChatGPT web: two deployment paths

1. **Private deployment via Secure MCP Tunnel.** The private stdio server can stay
   local. Setup needs a tunnel ID, a runtime tunnel credential, appropriate
   Platform tunnel roles, workspace association and separate developer-mode
   access. The tunnel client must remain running. This has not been configured;
   account eligibility and permissions have not been checked.
2. **Hosted MCP service.** Add a Streamable HTTP transport, authenticated workspace
   membership, OAuth, stable source URLs, audit and rate limits, and deploy behind
   HTTPS. That is additional implementation; this stdio server is not that service.

Secure MCP Tunnel uses outbound connectivity and does not itself make the local
server a public plugin. Public distribution and private testing have different
requirements. [Official Secure MCP Tunnel documentation](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels).

No account settings, tunnels, credentials or remote deployment were changed by
building this connector. Never reuse a key previously pasted into a conversation.

## Verification and deployment caution

`scripts/test-mcp.mjs` verifies actual protocol behavior. These tests establish
transport and scope handling, not scientific truth or ChatGPT account installation.
The app's dependency audit reported existing build/runtime-chain vulnerabilities;
the current prototype must not be described as production hardened. Keep the dev
server local, and review dependency remediation before public/private-client
deployment.
