# Molecule scientific workspace — evolution of the existing prototype

Date: 2026-09-22. Scope: inspected implementation baseline and proposed engineering sequence.

> Current status, later on 2026-09-22: Increment 1 and part of Increment 2 are built locally: task-first scientific workbench, durable synthetic research briefs, frozen evidence snapshots, reasoned brief review and record history. A bounded read-only stdio MCP bridge from Increment 4 reads fixtures and explicitly selected exported notebooks. Team authorization, persistent program/source intake and live job execution are not yet implemented. See [LOCAL-WORKBENCH.md](LOCAL-WORKBENCH.md), [MCP-CONNECTION.md](MCP-CONNECTION.md) and [WORKSPACE-HANDOFF.md](WORKSPACE-HANDOFF.md). The inspection narrative and sequence below are preserved as the pre-build baseline, not current delivery claims.

Product direction agreed in conversation: evolve the existing workspace into a portable, model-independent scientific operating environment. PeptAI is the first realistic test workspace; VivaMed remains a separate client deployment. This agreement does not approve third-party data transfers, spending, wallet transactions, or publication.

This document updates the **implementation baseline and proposed sequence** in the September 17 specification. It does not supersede that specification's evidence/review safeguards, historical decisions, or the commercial proposal. No application code, database, deployment, or vault content was changed during this inspection.

## 1. What is actually built

| Surface / source | Inspected behavior | Preserve / evolve |
|---|---|---|
| `app/page.tsx`, `app/globals.css` | Program navigation, knowledge, standards, research and decisions; fictional records in browser state | Keep visual language and information hierarchy; extract reusable shell/components rather than redesigning from scratch |
| `app/memory/page.tsx` | Persisted synthetic assessment, knowledge review, captured integration import and history | Reuse context inspection and item-level review interactions |
| `app/research/page.tsx`, `lib/research-demo.ts` | Fixed three-source Europe PMC retrieval; source identity/hash checks; prepared interpretations, not fresh synthesis | Retain as a public evidence regression example; generalize receipts separately |
| `app/challenge/page.tsx`, `lib/challenge-package.ts` | Import/review of a captured real OpenScience result with two eligible proposals and an excluded faulty citation | Keep the reviewed-result contract and explicit captured-run labeling |
| `lib/memory.ts` | Pure transition logic; command receipts; separate knowledge approval; frozen context; synthetic/public/captured data separation | Preserve invariants and tests; extract general domain concepts into a new core instead of continually adding fixture-specific branches |
| `app/api/memory/route.ts` | Same-origin JSON writes; platform-dispatcher identity; owner-scoped record; revision compare-and-swap | Keep legacy endpoint intact. New workspace API needs membership-based authorization and deployment-specific identity adapters |
| `db/schema.ts` | One revisioned JSON aggregate per owner in `memory_workspaces` | Preserve existing rows. Add scoped records in parallel; no destructive migration |
| `worker/index.ts`, `vite.config.ts`, `db/index.ts` | Cloudflare/Sites-specific execution and persistence boundary | Keep preview working; isolate hosting dependencies from scientific domain logic |

The simulated reviewer role is supplied in the command; it is not a separately authenticated reviewer. Owner isolation is not shared-team authorization. `research_start` retrieves inside the request handler, not through a durable job queue. These are explicit pilot limitations, not production capabilities.

### Verified baseline this turn

Executed locally, without model calls or production writes:

```sh
node --experimental-strip-types --test scripts/test-memory.mjs scripts/test-external.mjs scripts/test-research.mjs scripts/test-challenge.mjs
./node_modules/.bin/tsc --noEmit --incremental false
```

Result: **18/18 domain tests passed; TypeScript passed.** The retrieval tests inject responses; they do not retest Europe PMC availability. No fresh browser, production-build, deployment, dependency-security or live-provider verification was performed. Historical deployment evidence remains in [CHALLENGE-HANDOFF.md](../../integrations/vivamed/CHALLENGE-HANDOFF.md).

## 2. Product shape: same identity, connected workflows

Retain the calm green/ivory palette, typography, program cards, context inspector, source receipts and review experience. Add a shared shell with explicit workspace identity and data classification.

Proposed navigation:

- **Programs:** objectives, candidates/endotypes, unresolved questions and decisions.
- **Evidence & knowledge:** original sources, reviewed extractions, claims, relationships and conflicts.
- **Scientific standards:** charter, criteria and approved workflow versions.
- **Research & design:** scoped conversation, method selection, tool jobs and artifacts.
- **Review & decisions:** scientific approval queue and attributable decision history.
- **Connections:** model/runtime/scientific-tool configuration, permissions and truthful readiness states.

Provenance and budget appear within relevant runs and decisions rather than requiring every scientist to manage infrastructure screens. Start with focused tables and source inspection; add graph/canvas views only when their relationships are backed by usable records.

Source inspiration and reuse constraints: [platform review](../../integrations/vivamed/PLATFORM-REVIEW-2026-09-22.md). Implement appropriate patterns in our design; do not copy unlicensed code or imply another product's features are already connected.

## 3. Core boundaries that make model independence real

### Scientific core

Canonical records: Workspace, Membership, Program, Candidate/Entity, SourceVersion, EvidenceLocator, Observation, ClaimVersion, Relationship, StandardsVersion, ProcedureVersion, ContextSnapshot, Run/Attempt, Artifact, ReviewDecision and Event.

Every scoped operation must enforce workspace and applicable program access. Relationships have type, scope, supporting source/analysis, limitations and review state. Co-mention is not correlation; statistical association is not causation. Derived graph edges never silently become approved facts.

Separate classification axes: source origin (measured/predicted/computed/synthetic), processing (original/extracted/inferred), review state and execution state. Approval does not turn predictions into measurements.

### Context service

Build bounded, permission-aware context from source versions, approved standards, selected artifacts and clearly labeled prior records. Persist selection reasons and omissions. Freeze each run's manifest, including material retrieved during execution. Keep evidence records and reviewer explanations—not hidden model reasoning.

Model-specific prompt formatting belongs at the adapter boundary. Conversation history may be saved as a conversation, but must not become canonical scientific knowledge without the normal evidence/review path. Model independence means portable records and interfaces, not identical results or capabilities across models.

### Tools and runtimes

Distinguish a foundation-model provider, agent runtime, scientific execution tool, evidence connector and provenance/financial integration. Do not give them the same unrestricted interface.

A registered capability needs input/output schema, supported deployment, credential reference, data-egress declaration, cost reporting, permissions, timeout/cancellation behavior, version and validation checks. The job controller owns budgets, attempts and state; results enter as artifacts and proposed claims.

Readiness states: requested → contract verified → fixture tested → live tested → enabled for this workspace. “Not configured,” “unavailable,” and “unsupported” remain visible. A catalog listing must not create a working-looking Run button.

Requested integration backlog (capabilities and exact products still require verification):

| Candidate | Intended evaluation | First gate |
|---|---|---|
| OpenScience | Existing research-executor baseline | Durable worker, source checks and bounded job recovery |
| OpenResearch | Experiment/code execution | Authenticated isolated adapter; extend beyond existing arithmetic fixture |
| NVIDIA BioNeMo | Relevant protein-design/model capabilities | Identify exact service/model, license, compute and API requirements |
| subseq.bio | Requested protein workflow execution | Verify selected program contract, outputs, cost and data handling |
| BIOS | Requested scientific agent integration | Resolve exact product/interface and authorization model |
| LiteFold | Requested folding/design integration | Resolve exact repository/service and supported task |
| Rowan | Requested small-molecule modeling/design workflows | Verify supported operations and API contract rather than assuming de novo design |
| Virtual Biotech / Lobster | Optional specialist engines and reusable components | Task fit, licensing, provider compatibility and controlled evaluation |
| Paperclip / other literature connectors | Evidence acquisition | Coverage, credentials, locators and usage limits |
| Qdrant | Optional derived retrieval index | Demonstrated retrieval need on representative sources |
| Hermes | Optional harness | Remains deferred; no installation implied |

### External conversational clients

Expose the same authorized application operations through an API and, where compatible, MCP. Proposed operations include searching permitted evidence, reading a program, preparing a context packet, requesting a bounded job and inspecting results. They are proposed application contracts, not verified ChatGPT/Codex integration instructions.

Start read-only. Never expose direct database access, arbitrary filesystem/shell execution or automatic approval through a connector. Writes require scoped authority, explicit confirmation where consequential, idempotency and an audit event. Connector access must respect revocation. Tool/source text cannot expand permissions.

### Molecule provenance and treasury

Prepare attributed events for sources, ideas, contributions, analyses and decisions, referencing exact record versions. Add an outbox for later Molecule Labs submission; store receipt/external ID when acknowledged. Local saved, queued for publication and externally recorded are different states. Attribution is not proof of legal ownership.

For treasury: proposal → authorized approval → submitted transaction → confirmed/failed/reconciled. Keep a separate approval policy, spending caps and designated signer boundary. Do not place wallet secrets in the browser or grant signing to a research agent. The actual Molecule Labs and wallet contracts must be verified before implementation; no invented endpoints or automatic on-chain publication.

## 4. Local and cloud deployment without changing the scientific record

Separate IdentityProvider, Repository, SourceStore, JobExecutor, ModelProvider, ProvenancePublisher and TreasuryGateway interfaces from domain rules.

Local mode should begin loopback-only with local identity/storage and explicitly configured network egress. Cloud mode adds authenticated membership, durable workers, shared storage, secret management and backups. The current Sites identity header is trusted only behind its dispatcher; it is not safe as authentication on an arbitrary public server.

Do not promise one-command deployment until install/start/upgrade/backup/restore tests pass on supported environments. Export/import schemas must preserve IDs, provenance, classifications and source versions while excluding credentials. Cloud and local should share scientific contracts, not necessarily infrastructure code.

## 5. Incremental build sequence

### Increment 1 — connected workspace foundation

Add `/workspace` alongside `/`, `/memory`, `/research` and `/challenge`; preserve all existing routes and records. Build a reusable shell and a new scoped domain core with fixture repositories. A visible fixture label is required until real persistence is wired. Separate VivaMed-demo and PeptAI-test identities and records; the PeptAI workspace initially contains no vault data.

Proposed new modules: `lib/workspace/` for domain/schema/policy/context, `components/workspace/` for reusable interface, and `scripts/test-workspace.mjs` for offline behavior. Leave `lib/memory.ts` and `/api/memory` compatible during this increment.

Deliverable walkthrough: select workspace → open program → inspect candidate → inspect supporting/conflicting evidence → inspect standards/context → see eligible workflows and connection readiness. Existing saved demos remain reachable and clearly labeled. No fabricated jobs or synthetic content labeled as PeptAI data.

Acceptance: old 18 tests remain green; workspace/program mismatches fail; raw evidence is distinct from claims; unresolved evidence stays unresolved; unconfigured tools cannot execute; empty PeptAI state is honest; desktop/mobile/navigation checks pass.

### Increment 2 — durable scoped records and read-only vault intake

Add new tables and repository adapters without altering legacy rows. Use server-established identity and membership; fixtures alone do not prove tenant security. Test restart, stale writes, backup/restore and authorized export before any real data intake.

Build a local allowlisted importer with dry-run preview. Exclude credentials, `.env`, authentication caches, hidden/system directories and unapproved attachments; reject path traversal and symlinks escaping the selected scope. Enforce file/total-size limits. Import original content/version hashes, relative paths, headings and explicit links; record unresolved links rather than inventing connections.

Choose one PeptAI program and its authoritative/supporting records. Preserve the vault unmodified and show which material would be stored where. No provider calls during intake. Interpretations and extracted approval candidates stay proposed unless their original approval scope/authority has been explicitly mapped and validated.

Acceptance: repeated import is idempotent; changed files create versions; scoped omissions are reported; source bytes remain unchanged; no cross-workspace leakage; connector egress requires explicit configuration.

### Increment 3 — one live agentic workflow

Durable job controller and one executor first, using the existing OpenScience experience. Freeze context; enforce tools/destinations, cost cap and timeouts; retain artifacts and source checks; route eligible claims to review. Keep cancellation, unknown provider outcomes and partial results visible. Extend OpenResearch for a suitable computational task rather than nesting orchestrators unnecessarily.

Acceptance: real job plus failure/cancel/retry tests; no duplicate billable dispatch on ambiguous timeout; approved results affect future context without rewriting old runs. A second model can consume the same permitted packet; assess its outputs separately instead of assuming equivalence.

### Increment 4 — external clients and additional science tools

Read-only MCP/API access first, then explicitly scoped job requests. Add one protein workflow and one small-molecule workflow after contract verification. Reuse one result/review format; do not implement a new knowledge store for each vendor.

### Increment 5 — Molecule infrastructure and deployment packaging

Verify Molecule Labs and treasury contracts; test against mocks and approved sandbox/test facilities before real publication or funds. Package supported local/cloud installation, migrations and restore procedures. Client-data hosting, provider disclosures and access invitations remain explicit rollout gates.

## 6. Preservation and migration rules

- Never reinterpret historical demo role switches as distinct human approvals.
- Never present captured results as newly executed jobs or fixture hashes as external notarization.
- Keep legacy JSON records unchanged until an explicit migration is versioned, tested and reversible.
- Historical imports must retain original actor/time, source system, simulation status and import time separately.
- Do not mirror all private records automatically into a new workspace or external provider.
- No concurrent dual-write systems without a reconciliation design. Rollback of a UI deployment must not erase records created by newer schemas.
- Global model-provider configuration, credentials and the original vault remain outside routine application edits.

## 7. Immediate handoff

The next code change is **Increment 1**, not a ground-up rewrite or deployment of every requested integration. The end-to-end milestone remains one real, authorized program with evidence intake, a bounded scientific job and durable human-reviewed memory.

This turn completed inspection, baseline tests and the implementation map. It did not implement Increment 1, import the vault, connect new providers or deploy a new version.
