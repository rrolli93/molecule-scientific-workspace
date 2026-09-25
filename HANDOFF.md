# Molecule Observatory — Claude Code handoff

Prepared 2026-09-23. Handoff only; no new features added for this checkpoint.

## Location and Git

Project root on this Mac:

```text
<repository root>
```

Extracted from the vault it was developed in; this is now a standalone repository. This
checkpoint includes app source, lockfile, migrations, tests, docs and the related
historical VivaMed research/integration files listed below. Unrelated vault work
is deliberately left untouched. From this directory, get the checkpoint hash:

```sh
git log -1 --format='%h %s' -- HANDOFF.md
git status --short -- .
```

All app code already lives on the Mac. `/root/scientific_ui` and other `/root/...`
names were AI-agent identifiers, NOT container directories. No container export
is needed. Dependencies/build output are reproducible and ignored. Local saved
records remain under `.wrangler/state` on this Mac, intentionally not in Git.
Do not delete that directory; export notebook records before any storage reset.

## Product and implemented work

Molecule/PeptAI is building a client-facing scientific workspace, initially for
VivaMed: durable evidence, context, scientific standards, human review and
provenance, independent of the foundation model. Scientific agents/tools should
eventually operate on this shared context. It is not simply a shared chatbot.

Latest `/workspace` design: **Molecule Observatory**, with navy instrument-like
surfaces, cobalt actions, acid-yellow accents, technical labels, large typography
and paper-like evidence panels. Six sections: Programs, Evidence & knowledge,
Scientific standards, Research & design, Review & decisions, Connections.

Implemented:

- Evidence Atlas: two candidates, three sources, two proposed interpretations,
  six explicit membership/citation links; source inspector, candidate filtering,
  Map/List views, keyboard arrows, mobile list, native-dialog **Focus atlas**.
  This is NOT a causal biological knowledge graph or measured assay plot.
- Scoped Cmd/Ctrl K navigation/search and guided research briefs with exact
  source versions, omissions and standards; provider-independent JSON/Markdown.
- Durable D1 notebook: server-reconstructed snapshots, SHA-256, required review
  rationale, immutable reviewed records, history, idempotency and CAS conflicts.
  Accepting a brief does NOT approve scientific claims or execute a job.
- Real read-only stdio MCP adapter, optionally reading an explicitly selected
  exported notebook. Protocol tested; no ChatGPT/Codex client registered yet.
- Explicit-file Markdown vault preview CLI with original text/hashes and bounded
  path/symlink/credential checks. No UI import or upload is implemented.
- Preserved `/`, `/memory`, `/research`, `/challenge` legacy demonstrations.
  Research retrieves three selected Europe PMC records and checks fingerprints;
  interpretation is prepared, not fresh synthesis. Challenge shows captured
  historical OpenScience output, not a newly executed job.

VivaMed workspace is synthetic; PeptAI workspace is empty. No real vault import,
team authorization, live scientific execution in the new workspace, automatic
knowledge promotion, Molecule attribution publication or wallet operations exist.

## Runtime and deployment

- Latest version: `http://localhost:3034/workspace` after starting the dev server.
  No listener was present on port 3034 at handoff inspection. Do not assume a
  previous coding session's background server survives.
- Hosted legacy demo: https://vivamed-workspace-concept.molecule-ag-8483.chatgpt.site
  still shows the **old design**. The Observatory/notebook/MCP increment has not
  been deployed there. No remote migration/deployment was done for this handoff.
- React/Next-style routes via vinext/Vite, Cloudflare Worker + D1. Hosting metadata
  is in `.openai/hosting.json`. `build/sites-vite-plugin.ts` is REQUIRED source,
  not generated output; its ignore exception is included in this checkpoint.
- A build packages migrations but neither deploys nor applies them remotely.

## Exact setup and start commands

Node >=22.13 (verified with 22.22.0), npm. Synthetic workspace/tests need no API key.
Never commit keys. A key previously pasted into chat should be treated as exposed.

```sh
cd "<repository root>"
npm ci
npm run build
```

Only for a NEW local database, initialize in this order. Both tables already exist
in this Mac's `.wrangler/state`; do NOT replay these CREATE TABLE migrations there.

```sh
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chunky_sue_storm.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_round_susan_delgado.sql
```

Start:

```sh
npm run dev -- --port 3034
```

Open `http://localhost:3034/workspace`. Use localhost, not an assumed IPv4 address:
this Mac may bind localhost to IPv6. Do NOT tunnel or expose this dev server to a
LAN. The local-demo identity is not authentication; config rejects non-loopback
development hosts. Use synthetic questions/review text only.

`npm start` cannot load this Worker's `cloudflare:` imports in plain Node. Optional
production-build preview (not deployment):

```sh
npx wrangler dev --config dist/server/wrangler.json --local --port 3035 --ip localhost --persist-to .wrangler/state
```

Notebook 401 is expected there without configured trusted production identity.

## Verification and exact tests

All **52/52 tests passed again on 2026-09-23**, covering domain logic, notebook
invariants, real MCP protocol, scoped intake and atlas. TypeScript, targeted lint
and production build also passed again. Prior 2026-09-22 checks passed browser
tests for desktop/mobile, navigation, isolation, source inspection, filtering,
keyboard/focus, exports, notebook persistence and API guards. These are software
checks, not scientific validation or production security certification.

```sh
node --experimental-strip-types --test scripts/test-memory.mjs scripts/test-external.mjs scripts/test-research.mjs scripts/test-challenge.mjs scripts/test-workspace.mjs scripts/test-notebook-invariants.mjs scripts/test-mcp.mjs scripts/test-vault-intake.mjs scripts/test-atlas.mjs
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint components/workspace lib/workspace app/workspace/page.tsx scripts/test-atlas.mjs scripts/verify-observatory.mjs
npm run build
```

With dev server running and Google Chrome installed:

```sh
node scripts/verify-workspace.mjs
node scripts/verify-observatory.mjs
```

Additional integration checks APPEND synthetic QA records. Local synthetic DB only:

```sh
node scripts/verify-notebook.mjs
node scripts/verify-notebook-browser.mjs
```

Screenshots go to `/tmp/molecule-*.png`, not runtime inputs. Legacy verifier
scripts may have different ports/identity assumptions; read before running them.
Do not indiscriminately run every verifier against hosted/client data.

## File map and external artifacts

- `app/workspace/page.tsx` and `workspace.css`, `workbench.css`, `observatory.css`:
  route and layered styles (Observatory overrides last).
- `components/workspace/`: shell, program desk, atlas, source drawer, notebook.
- `lib/workspace/core.ts`, `atlas.ts`, `notebook.ts`: scoped fixtures, context,
  graph derivation and notebook invariants.
- `app/api/workspace-notebook/route.ts`: identity, validation and D1 CAS writes.
- `db/`, `drizzle/`: schema and both migrations.
- `integrations/mcp/`: stdio adapter and snapshot validation.
- `integrations/vault/preview.mjs`: explicit-file dry-run intake.
- `scripts/`: tests and browser/API verifiers.
- `MCP-CONNECTION.md`, `VAULT-INTAKE.md`, `LOCAL-WORKBENCH.md`: detailed setup.
- `WORKSPACE-HANDOFF.md`: incremental history; older sections are historical.
- `PRODUCT-NOTE.md`, `IMPLEMENTATION-SPEC.md`, `EVOLUTION-PLAN.md`,
  `PRODUCT-RESEARCH-2026-09-22.md`: product vision, roadmap and research.

Outside project root, relative to the parent PeptAI vault:

- `integrations/vivamed/`: historical provider probes, captured outputs, platform
  research and setup notes. Included in this handoff commit.
- `sources/research_vivamed_exendin-academic.json`,
  `sources/research_vivamed_exendin-general.json`,
  `sources/research_vivamed_exendin-live-receipts.json`: historical research inputs,
  included in the handoff commit, not runtime dependencies.
- Historical OpenScience scripts reference `/tmp/vivamed-openscience.cWO5CJ` and
  a vault-root `.env`. These one-off experiments are NOT needed for this app,
  build, MCP or tests. Do not assume temporary runtimes exist or rerun paid probes
  without reviewing scope/setup. No secrets/third-party runtime copied into Git.
- Parent `AGENTS.md` and `docs/vault-maintenance/canonical-state-guide.md` govern
  vault work. Read the guide before substantive scientific vault work. If pilot
  state/sources change, run parent's `python3 scripts/check-canonical-state.py`.
  App-only changes do not alter those scientific sources.

## Remaining work, priority order

1. Improve usability with Rafael: last screenshot had oversized headings/spacing
   pushing the atlas below the fold. He wants distinctive scientific design and
   intuitive interaction, not a generic dashboard/landing page. Preserve the
   source → brief → review workflow while improving information density.
2. Safe pilot foundations: dependency remediation, authenticated owner/team
   roles, deployment/egress policy, backup/restore and migration verification.
   No private data or public local-demo identity before these gates.
3. Reviewed, bounded PeptAI intake and persistent program/source data. Replace
   fixtures only with explicitly selected, reviewed material; preserve versions,
   contradictions, provenance and frozen context. Do not ingest the whole vault.
4. Register/test an intentional MCP client with approval. Current local read-only
   snapshot is not live remote database access. Context must remain portable
   between OpenAI, Anthropic and open models.
5. One end-to-end scientific execution adapter: explicit authorization, budget,
   sandbox, immutable receipts, cancellation/failure states and human review.
   BioNeMo/Rowan/OpenResearch/OpenScience/etc. catalog entries are not execution.
6. Typed knowledge relationships and reviewed memory; never promote predictions,
   inferred correlations or model output into measured/approved evidence.
7. Molecule attribution/provenance and treasury as separately authorized work;
   signing, spending and publication require explicit authority.
8. Deploy only after verification and an explicit release decision. Old hosted
   demo remains separate until then.

## Constraints and gotchas

- Preserve local notebook records and legacy routes. No resets to make tests pass.
- Evidence, interpretation, approval and execution are distinct. Atlas layout is
  schematic, not scientific distance or scoring. Brief review is not claim review.
- MCP snapshot hashes establish integrity, not reviewer authentication. Snapshot
  is frozen at launch; no arbitrary file access or implicit live database sharing.
- Cloud identity headers require a trusted dispatcher stripping spoofed headers
  and blocking direct Worker access. Team authorization is not yet built.
- Last audit recorded 2026-09-22: production-only audit zero after patches; full
  graph still 18 advisories including 12 high. Dev/tooling dependencies can enter
  runtime. Review coordinated upgrades; do not blindly run force fixes.
- Competitor products inspired requirements; unlicensed code was not copied.
  Research/catalog descriptions do not prove provider integration works.
- Preserve unrelated dirty vault files; commit only scoped changes. No remote Git
  push or cloud deployment was requested for this handoff.
