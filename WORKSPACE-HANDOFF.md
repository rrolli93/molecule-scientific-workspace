# Molecule Observatory — interactive evidence atlas

Latest design/build iteration, 2026-09-22. Local route remains `/workspace`.
The hosted VivaMed URL has not been updated.

## Observatory iteration

The user asked for a substantially less generic, more striking scientific
interface. This iteration replaces the green/ivory dashboard aesthetic with a
midnight instrument surface, cobalt actions, acid-yellow accents, large sans-serif
typography, numbered navigation and warm-paper evidence/notebook surfaces.
The visual system is scoped to `/workspace`; legacy demonstration routes remain
separate. No third-party fonts or visual assets are fetched.

The new **Evidence Atlas** is functional, not decorative: it derives candidate,
source and proposed-interpretation nodes from the existing fixture records. Links
express explicit candidate/source membership and source/claim citations. Selecting
a node highlights its connected records and opens an inspector with exact text,
limitations and source actions. Candidate filtering changes both visible records
and link counts; Map/List modes expose the same records. Mobile uses the readable
record list. A source action opens the existing provenance drawer; candidate and
claim records can open the scoped research-brief workflow.

**Focus atlas** opens a native modal work surface with keyboard containment and a
return action. The diagram has unique SVG and heading IDs when shown in focus mode.
Arrow keys navigate visible graph records; mobile record selection brings the
inspector into view. Motion preferences are respected.

This is a schematic of synthetic records, not a molecular structure, computed
biological network, learned correlation graph, measured assay plot or live agent
activity. Proposed claims remain proposed; graph exploration approves nothing.
The durable notebook, API, MCP connector and vault-preview safety boundaries are
unchanged. No migration, provider job, private-vault read or account registration
was performed for this visual/interaction iteration.

Validation: **52/52 domain/protocol/intake/atlas tests passed**, TypeScript and
targeted lint passed, and production builds passed. The existing browser workflow
verifier passed after its source locator was scoped to the dossier (the atlas now
also exposes that source). The new Observatory browser verifier passed source and
interpretation inspection, candidate filtering, visible counts, arrow navigation,
focus mode with preserved selection, nested source-modal Escape/focus behavior,
Candidate B / E03 brief preparation, Map/List parity, mobile inspector access,
reduced motion and workspace isolation. No notebook writes or provider calls were
performed by that verifier. Screenshots were inspected on desktop and mobile.

The last visual review centered a filtered candidate lane instead of leaving it
in its original whole-program row. Returning from a Candidate B brief now initializes
the atlas selection on Candidate B. Diagram positions remain schematic, with no
scientific distance or magnitude implied. Use the **local** preview, not the old
hosted URL, to inspect this iteration.

## Previous iteration — durable notebook and navigation

Current implementation, 2026-09-22. Route: `/workspace`. The historical read-only
increment below is preserved for context; it no longer describes all current
capabilities.

## What changed in the interface

- A workspace-scoped **Find or jump to…** navigator searches the bundled evidence
  and opens workspace sections. Use the visible sidebar control or ⌘/Ctrl K.
  It is local lexical navigation, not a scientific search engine or AI answer.
  Native modal behavior contains focus; Escape explicitly dismisses even when
  the search input contains text. Switching to empty PeptAI exposes no VivaMed
  source results.
- A program-record strip and three actionable workflow stages connect source
  inspection, research-brief preparation and review. The source drawer now
  displays record identity, version, candidate scope and synthetic origin.
- A saved research notebook is integrated directly into Research & design and
  is the primary content in Review & decisions. The prepared fixture claims and
  earlier demonstration links remain available in a secondary expandable area.
  The brief preview has a direct focus/scroll action to its notebook.
- Save/reload/export, frozen context records, explicit accepted/rejected brief
  reviews and record history are real local workflows. **Accepting a brief is
  not scientific validation, claim approval, agent execution or permission to
  spend.** Unsaved form state still resets on refresh.
- Mobile navigation exposes all six sections in a two-column grid instead of
  a clipped horizontal list. Scientific annotations use a darker paper-palette
  color; measured foreground/background pairs for the corrected labels range
  from 5.04:1 to 5.96:1. This is a focused contrast correction, not a complete
  accessibility certification.
- The MCP catalog entry distinguishes a built local read-only connector from
  unimplemented integrations. Its inline guide explains intentional notebook
  export, client registration and snapshot refresh. [MCP-CONNECTION.md](MCP-CONNECTION.md)
  has setup and security boundaries. No AI client has been registered by the UI.

The design uses technical record labels, source-linked evidence relationships,
warm paper surfaces and evergreen navigation. It does not add decorative
scientific measurements, inferred scores or simulated running-agent controls.

## Current boundaries

Only synthetic demonstration material is available. PeptAI remains empty: no
vault intake or persistent program-record implementation is implied by the saved
brief notebook. Local notebook mode is a single-computer demonstration, not
multi-user authentication. Cloud identity is separately configured and must not
trust arbitrary client-supplied identity headers. Nothing in this increment
establishes a hosted production deployment, live scientific-provider integration,
Molecule attribution publication or wallet capability.

The new MCP adapter is read-only and may read only an explicitly selected export;
it does not share a live private database, scan the vault or connect a ChatGPT
account automatically. Scientific rules and program records remain synthetic.

## Current UI validation

Final implementation verification: **48/48 domain, real MCP-protocol and scoped
vault-preview tests passed**, along with TypeScript, targeted ESLint and the
production build. Local HTTP checks passed same-origin/content/size guards,
server-side source reconstruction, idempotency, concurrent revision conflicts,
immutable reviews and workspace isolation. The built worker was also run locally:
both an anonymous request and a spoofed identity-header request to the new notebook
endpoint returned 401 with production identity flags absent. The temporary
production-preview worker was stopped afterward; the development preview remains
the user-facing local surface.

The new additive D1 migration creates `research_notebooks` with a composite owner /
workspace key. It was applied only to the local emulator. Legacy memory records,
the hosted database and scientific vault sources were not migrated or changed.
Browser/HTTP tests leave a small set of clearly labeled synthetic QA briefs for
inspection; they do not delete prior saved work.
The final browser run also passed the actual downloaded notebook through the MCP
snapshot validator, checked full equality and found the saved question exactly
once. This verifies the UI/API export contract against the connector, in addition
to the separate real stdio protocol tests.

Two compatible dependency patches were applied (`fast-uri` and
`baseline-browser-mapping`). `npm audit --omit=dev` then reported zero advisories.
The full dependency graph still reports **18 advisories, including 12 high**,
predominantly build/tooling chains. Dev-dependency classification is not proof
that no component enters a deployed bundle. Public/client deployment requires
coordinated toolchain remediation and runtime review; this is not a security
certification. No blind `audit fix --force` was run.

The new [scoped vault preview](VAULT-INTAKE.md) was tested against synthetic
temporary files only. It preserves selected text and fingerprints, rejects unsafe
paths/files and obvious credentials, and emits a dry-run manifest; no UI import,
database promotion, actual PeptAI intake or scientific authority inference occurs.

TypeScript and targeted UI ESLint passed. The updated general workspace browser
verifier passed scoped navigation/search, source inspection, both brief exports,
workspace switching and mobile layouts. The dedicated notebook browser verifier
passed save, required review rationale, persisted review after reload and notebook
export. These are software behavior checks, not scientific validation.

The initial visual pass identified two real mobile regressions caused by legacy
global `header` and `nav` selectors: an overlapping notebook heading and clipped
horizontal record columns. Scoped notebook styles corrected both; browser
geometry checks now cover the heading boundary and vertical record navigation.
Refreshed desktop/mobile program and notebook screenshots were inspected at
`/tmp/molecule-workspace-desktop.png`, `/tmp/molecule-workspace-mobile.png`,
`/tmp/molecule-workspace-notebook-desktop.png` and
`/tmp/molecule-workspace-notebook-mobile.png`. The native search field's first
Escape initially cleared text instead of dismissing; explicit keyboard handling
fixed it and the scoped-navigation browser check passed afterward.

## Historical record — connected workspace increment 1

Implemented locally on 2026-09-22. Route: `/workspace`.

> Updated later on 2026-09-22 with the task-first design iteration below. Earlier increment-1 details are retained; new validation total is 28/28 domain tests.

## Task-first design iteration

Revisited BiotechOS's public workflow with the Parallel Web skill and inspected the existing pinned source checkout, particularly inbox actions and the candidate/criteria table. Sources: [product walkthrough](https://souravucsf.github.io/BiotechOS/), [live demo description](https://biotechos-frontend.onrender.com/), [inbox source](https://github.com/souravUCSF/BiotechOS/blob/2e77a8ee08c85c0e8ddba19b12753aa88e6f761a/frontend/src/app/mailbox/page.tsx), [candidate table source](https://github.com/souravUCSF/BiotechOS/blob/2e77a8ee08c85c0e8ddba19b12753aa88e6f761a/frontend/src/app/moleculedb/page.tsx). Public extraction artifact: `/tmp/biotechos-ux-review.json`. No shared-demo actions were executed and no upstream source code was copied.

The key design inference: organize the entry point around a scientific question and its next action, instead of asking the user to infer a workflow from navigation categories.

Implemented:

- A prominent investigation entry point, with a small source-linked evidence map.
- A two-item “Needs attention” queue, prepared from the fixture, linking directly to the relevant candidate's investigation. This is not a connected email inbox or live triage engine.
- A qualitative candidate/criteria comparison with direct source links and explicit missing evidence. It is not a scored or approved TPP; no thresholds or measurements were invented.
- Candidate selection moves focus to its dossier, rather than updating something silently below the fold.
- A native modal source drawer with keyboard focus containment, Escape/close, and related-source navigation. Opening a source does not approve it.
- A three-step investigation guide: read evidence, frame question, review/export. “Opened this session” is transient navigation state, not scientific review.
- Readable Markdown research briefs as well as JSON exports. Both retain synthetic classification, source versions, standards, limitations and omissions. No external model receives the export automatically.
- Dark evergreen navigation, warm paper surfaces, more compact record styling, clearer action hierarchy and mobile comparison-scroll guidance. Legacy pages retain their styling.

Validation: 28/28 domain tests; TypeScript, targeted ESLint and production build passed. Browser verification passed the redesigned flow, related-source switching, Escape, question focus, both export formats, scoped empty PeptAI state and all six mobile layouts. No API/provider calls or browser errors were observed in this flow. Screenshots inspected at `/tmp/molecule-workspace-desktop.png`, `/tmp/molecule-workspace-mobile.png`, `/tmp/molecule-workspace-brief.png` and `/tmp/molecule-workspace-source.png`.

Further BiotechOS-inspired features belong behind the durable-core/live-execution work: real incoming-evidence triage with extraction review; approved/versioned program criteria; reported-versus-recomputed assay QC when actual raw data and validated analysis methods are available; program-grounded conversation with claim/source validation. None of those capabilities is established by this UI iteration. Procurement and treasury remain separately permissioned work, not automatic inbox actions.

The preview remains local at `http://localhost:3034/workspace`; no hosted deployment, client data migration, vault import, wallet operation or provider-configuration change was made.

## What works

- Shared Molecule shell, retaining the existing green/ivory design, program hierarchy and scientific-review vocabulary.
- Explicit VivaMed synthetic-demo and empty PeptAI-test workspaces. Switching resets selected evidence, question, source inspector and context preview.
- Candidate selection, source inspection, evidence search, prepared claim/source relationships and versioned demonstration standards.
- Context preview with exact fixture source versions, explicit omissions, warnings for incomplete candidate evidence and no auto-approved claims. JSON download is local; no model receives the packet.
- Integration catalog with category filters and 15 requested/captured/deferred entries. Each shows its missing setup/verification gate. None is enabled for execution.
- Links to the existing saved review, public-evidence and captured-agent demonstrations. No migration or synchronization is implied.
- New domain tests and a local-only browser verification script.

## Important boundaries

This is the connected **read-only fixture foundation**, not the complete scientific platform. It does not implement persistent new-workspace storage, team authorization, vault intake, live job submission, a conversational model interface, MCP, external provenance publication, or a wallet. The client-side scope checks establish fixture consistency, not tenant security. All bundled scientific data is synthetic. PeptAI contains no imported vault records.

Existing `/api/memory`, its storage schema, legacy transitions and production decisions were not changed. The original landing page gained only a link to `/workspace`. This increment was not deployed to the hosted VivaMed site.

## Validation

- 26/26 domain tests passed (18 existing + 8 workspace tests).
- TypeScript, targeted ESLint and production build passed.
- Browser checks passed: candidate/source navigation; source-inspector focus; context JSON download; empty question and empty selection rejection; omission warnings; evidence search; standards; absence of approval/execution controls; empty PeptAI; refresh reset; all six mobile views without horizontal page overflow.
- The browser verifier observed no `/api/` requests, external-provider requests, or page errors while exercising the new route.
- Desktop and mobile screenshots inspected: `/tmp/molecule-workspace-desktop.png`, `/tmp/molecule-workspace-mobile.png`.

Browser verification initially needed an approved unsandboxed Chrome launch. The test waits for hydration before clicking. A candidate-select accessibility label was corrected during testing.

## Run locally

From this directory, with existing dependencies installed:

```sh
npm run dev -- --port 3034
node --experimental-strip-types --test scripts/test-memory.mjs scripts/test-external.mjs scripts/test-research.mjs scripts/test-challenge.mjs scripts/test-workspace.mjs
node scripts/verify-workspace.mjs
```

Browser verification defaults to `http://localhost:3034`; override `WORKSPACE_TEST_URL` if the server selects a different port. The verifier refuses non-local targets. No database initialization, credential setup or provider account is needed for the new route. Existing saved-demo links still need their existing platform/local database setup.

## Next increment

The [evolution plan](EVOLUTION-PLAN.md) remains the roadmap. Next: durable workspace-scoped records and a local, allowlisted dry-run importer, then one bounded live job. Before real data, verify identity/membership enforcement and storage/egress boundaries. Do not infer authorization to ingest or transmit the entire PeptAI vault from this build.
