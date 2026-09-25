# Current local workbench

2026-09-22 · Synthetic demonstration, not a production biotech deployment.

## Open and use

While the development server runs, open **http://localhost:3034/workspace**.

The latest visual iteration is **Molecule Observatory**. Start with the interactive
**Follow the signal** atlas: click a candidate, source or proposed interpretation;
use its inspector to trace sources or prepare a brief. **Focus atlas** expands the
work surface. Arrow keys navigate diagram records; mobile shows the same records
as a list. Its links are explicit membership/citation relationships, not biological
causality. The older hosted VivaMed page does not yet contain this iteration.

1. Choose **Investigate Candidate A**. Open E01 and E02 to inspect the unresolved difference in conditions.
2. Frame a question and choose **Review research brief →**. Sources, versions, omissions and demonstration standards are explicit. Changing the question or selection invalidates that preview.
3. Choose **Save or review in notebook ↓**, then **Save current brief**. This saves a server-reconstructed context snapshot to local D1 storage. It does not call a model.
4. Enter a review rationale and accept or reject the **brief**. Acceptance is about the framing/evidence package, not approval of scientific claims or execution. Reviewed records are immutable; create a new brief for a different decision.
5. Refresh, then open **Review & decisions**. Your saved records remain. **Export notebook** downloads a portable JSON snapshot suitable for the explicit-file MCP adapter described in [MCP-CONNECTION.md](MCP-CONNECTION.md).

Use **⌘K / Ctrl K** or the sidebar search to navigate areas and inspect scoped sources. The PeptAI workspace remains empty; no vault content has been copied or sent anywhere.

## Start on this machine

From `prototypes/vivamed-command-center`:

```sh
npm ci
npm run build
# One-time initialization of NEW local databases only:
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chunky_sue_storm.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_round_susan_delgado.sql
npm run dev -- --port 3034
```

Both tables already exist in this machine's local test database. Do not replay schema creation against an initialized database. A clean checkout needs the one-time initialization above; existing deployments need their normal migration process. `npm run build` packages SQL migrations but does not apply them remotely.

The local notebook uses the explicit `local-demo` identity and a loopback-bound development server. It is not password-protected against other users/processes on this computer. **Use synthetic questions and review text only.** Do not tunnel/proxy this development server or expose it to a LAN. The configuration rejects a non-loopback development host. D1 state lives under this app's `.wrangler/state`; deleting that directory deletes local saved records. Export records before resetting development storage.

This is a Cloudflare Worker build, so plain `vinext start` / `npm start` cannot load its `cloudflare:` binding imports in Node. For a **production-build preview**, use `npx wrangler dev --config dist/server/wrangler.json --local --port 3035 --ip localhost --persist-to .wrangler/state`. This deliberately has no local-demo identity: the notebook endpoint should return 401 until a trusted deployment identity is configured. Do not enable identity merely to hide that expected denial.

## What persists and what does not

| Record | Behavior |
|---|---|
| Saved brief | Exact server-reconstructed source/standards snapshot, question, omissions and SHA-256 |
| Review | Required rationale, decision, actor and timestamp; no scientific knowledge promotion |
| Record history | Saved and review events; duplicate commands do not append duplicate events |
| Cross-tab edits | Revision conflict instead of silent overwrite; reload to inspect current state |
| UI selection/search | Transient; resets on refresh |
| Provider execution | None; tool catalog is still a roadmap except the separately launched read-only MCP bridge |

Notebook API: `GET /api/workspace-notebook?workspaceId=…`, `POST /api/workspace-notebook`. Records are keyed by owner and workspace. The client submits source IDs, not trusted source text. Same-origin JSON writes, scoped IDs, bounded input, 100-record pilot limit and compare-and-swap writes are enforced. Fingerprints establish byte integrity, not scientific truth. The server-local clock/identity is not an externally attested provenance receipt.

## Remote deployment gate

This increment has **not** been deployed to the hosted VivaMed URL or connected to a ChatGPT account. Production builds do not enable local-demo access. A new deployment must verify a trusted authenticated dispatcher, owner/workspace permissions, migrations, backup/restore, dependencies and egress policy before importing private data. Enabling `WORKSPACE_TRUST_SITES_IDENTITY` is only safe when spoofed inbound identity headers are stripped and direct worker access is unavailable. Team authorization is still unbuilt.

ChatGPT MCP transport/account setup is separate from the application build. Read the verified options in [MCP-CONNECTION.md](MCP-CONNECTION.md); the local stdio bridge does not automatically install a ChatGPT connector.

## Scoped vault preview

The independently runnable [vault intake preview](VAULT-INTAKE.md) reads only explicitly selected Markdown files, returns original text and byte fingerprints, and leaves wikilinks unresolved. It rejects traversal, symlink files, non-regular files, excess size and obvious credential patterns. It has been tested with synthetic temporary notes only. It does not yet populate the application or imply permission to upload the real PeptAI vault.

## Tests

```sh
node --experimental-strip-types --test scripts/test-memory.mjs scripts/test-external.mjs scripts/test-research.mjs scripts/test-challenge.mjs scripts/test-workspace.mjs scripts/test-notebook-invariants.mjs scripts/test-mcp.mjs
node --test scripts/test-vault-intake.mjs
node --experimental-strip-types --test scripts/test-atlas.mjs
npx tsc --noEmit --incremental false
node scripts/verify-workspace.mjs
node scripts/verify-notebook.mjs
node scripts/verify-notebook-browser.mjs
```

The last two scripts append clearly marked synthetic QA records to the local notebook and preserve existing records. Browser checks require installed Google Chrome. Never point mutating verification scripts at a client/hosted database.
