# VivaMed: first memory-aware research workflow

> Historical specification (2026-09-17). Its baseline predates the persisted demo and later integration work. See [EVOLUTION-PLAN.md](EVOLUTION-PLAN.md) for the inspected 2026-09-22 baseline and proposed next sequence. The evidence/review safeguards below remain design requirements, not claims of completed implementation.

Status: implementation specification; not an implemented backend or approved client deployment.
Date: 2026-09-17. Provider: Molecule. Client: VivaMed.

## 1. Outcome and boundaries

A scientist initiates an evidence assessment, a different authorized scientist reviews it, and a fresh session uses the approved knowledge without Rafael reconstructing the context. Evidence, contradictions, procedures and decisions remain inspectable.

First release: one program, a small evidence package, one versioned assessment procedure, one agent runtime, and an optional public-literature connector. Use public or synthetic material only. Synthetic candidates must never be represented as real literature entities.

Excluded: portfolio-wide ranking, autonomous candidate advancement, laboratory execution, automatic changes to scientific standards, confidential client uploads, cross-client learning, and external provenance publication. This document does not modify the Google Doc proposal or authorize purchases, new audiences, or client-data transfers.

Current baseline: `app/page.tsx` contains fictional evidence and React state; `db/schema.ts` is empty. The demo role switch is not authentication. No provider, durable memory or live research workflow is connected.

## 2. Product changes within the existing five areas

| Area | First working behavior |
| --- | --- |
| Programs | Durable program record, current run, unresolved gaps, latest reviewed assessment |
| Knowledge | Source versions, claims, supporting/conflicting links, proposed/approved/superseded states |
| Scientific standards | Readable charter, approved standards and procedure versions; no agent-controlled edits |
| Research workspace | Question, evidence selection, context preview, start/cancel, progress, tool failures and usage |
| Review & decisions | Assessment review plus separate item-level knowledge-update decisions with rationale |

Replace “Generate example assessment” with “Prepare assessment” only when it starts a real server-side job. Retain a clearly separate demo mode until then. A failed connector must produce an explicit failure, never fallback content presented as live research.

## 3. Architecture and ownership

Browser → authenticated application API → durable workflow controller → isolated execution worker → runtime/tool adapters.

The controller owns job state, permitted transitions, budgets, retries and review gates. The runtime reasons within a bounded task; it cannot approve claims, change permissions or rewrite the charter. Provider credentials remain server-side.

Canonical structured records live in a transactional database; source bytes live in versioned file/object storage. Search indexes and runtime memories are derived, replaceable aids—not authoritative records. Agents access program-scoped application operations, not unrestricted database credentials.

For the first engineering increment use a local relational database and local source storage behind repository interfaces. Do not select client hosting through this choice. The existing Sites preview remains a concept; a shared live pilot requires a separately verified identity, storage and worker deployment. Do not expose a local agent service directly to the browser.

Molecule owns reusable orchestration and adapters. VivaMed's records, bespoke standards and decisions remain separately scoped and exportable. Never promote client observations into another client's knowledge or shared skills automatically.

## 4. Minimum record contract

All scoped records carry `workspace_id`, `program_id` where applicable, stable ID, timestamp and actor identity. Enforce scope on reads, writes, jobs, retrieval and exports. Versioned content is not overwritten by later runs.

| Record | Required content |
| --- | --- |
| Membership | Authenticated subject, workspace/program permissions, scientist/reviewer/admin roles |
| Program / Candidate | Name, stable identifiers, objective, public/synthetic classification; candidate belongs to program |
| SourceVersion | Source identity, version, original URL or file reference, content hash, capture time, access classification, extraction status |
| EvidenceLocator | Source-version ID and page/section/line locator; excerpt where permitted; extraction method |
| StandardsVersion | Charter/standards text, version, draft/approved/retired status, approver, approval time |
| ProcedureVersion | Inputs, steps, allowed tools, output schema, checks, version and approval |
| AssessmentRun | Question, initiator, state, context snapshot, runtime/model/config versions, budget, timestamps, checkpoint, parent run |
| ContextSnapshot | Exact standards/procedure versions, evidence locators, approved claim versions, selected prior-run summaries, selection reasons and omissions |
| ToolInvocation | Run ID, tool/version, idempotency key, redacted request/result references, status, attempt, duration and usage |
| ClaimVersion | Candidate/entity, observation/inference/hypothesis/gap, statement, assay conditions and units where applicable, limitations, source links and review state |
| KnowledgeUpdate | Run ID, proposed add/supersede/link-conflict operation, target and expected version, proposed claim, justification |
| ReviewDecision | Exact run/update version, accept/reject/request-changes, authenticated reviewer, rationale, timestamp |
| RunEvent | Append-only task transition, actor, outcome/error and referenced records; no secrets or hidden model reasoning |

Keep provider-reported usage separate from estimated cost. “Unknown” is preferable to fabricated usage. Database validation must reject missing references and cross-program links.

## 5. Execution and review state machines

Run states:

`draft → queued → running → awaiting_review → accepted | changes_requested`

Execution may terminate as `failed`, `cancelled` or `budget_exceeded`. A changed assessment creates a new run revision linked to its predecessor; old results and reviews remain unchanged. Acceptance means the assessment was reviewed, not that a candidate advances.

Knowledge updates independently follow:

`proposed → approved | rejected | changes_requested`

Only an explicit approved update enters default shared-knowledge retrieval. Accepting the assessment does not bulk-approve its proposed updates. Supersession records a link to the previous claim version and preserves it. Genuine conflicting observations may both remain active.

Workflow:

1. Check identity, program access, input classification and run budget.
2. Assemble a bounded context preview: approved standards/procedure, selected sources, relevant approved claims and relevant prior outcomes. Show exclusions and missing evidence.
3. On start, freeze the initial context snapshot and queue the job with an idempotency key.
4. Optionally search Paperclip using approved public identifiers/questions. Capture new source versions and retrieval events; append an immutable execution-context manifest identifying material actually supplied to the model.
5. Execute the procedure; return structured claims, evidence links, contradictions, gaps and proposed knowledge updates.
6. Validate output schema, source references, locators and scope. Automated checks establish traceability, not scientific correctness. Route invalid output to repair or explicit failure within the budget.
7. Pause for an authorized reviewer distinct from the initiating scientist. Require a rationale and item-level decisions.
8. Commit approved knowledge changes and review events transactionally. A stale target version requires re-review rather than last-write-wins.
9. In a new session, retrieve approved current records; make earlier and conflicting versions accessible with clear status.

Workers checkpoint after completed steps. Retry only safe/retryable operations within limits. If a provider outcome is unknown after a timeout, reconcile it before reissuing potentially billable work; expose uncertainty when reconciliation is impossible. Cancellation stops new dispatches and records any already-running call's eventual outcome.

## 6. Memory rules

| Responsibility | Implementation rule |
| --- | --- |
| Working memory | Assemble task-specific context under a token budget; record inputs and omissions; never rely on chat history alone |
| Episodic memory | Save task outcomes, tool failures and reviewer corrections as attributed run records; retrieve only relevant authorized summaries |
| Semantic memory | Store evidence-linked claims with conditions and review state, not unqualified extracted “facts” |
| Procedural memory | Use approved versioned procedures; agent-suggested improvements require tests and human approval |
| Maintenance | Exclude superseded material from default retrieval while retaining provenance; flag staleness and conflicts; no automatic scientific-record deletion |

The charter and permission rules are governed configuration, not learned preferences. A newer result is not inherently stronger evidence. Summaries point to original records and cannot overwrite them. Persist structured explanations and observable actions, not private chain-of-thought.

Retention periods must be agreed before client deployment. Temporary caches may expire independently of source evidence and decision history. Permissions are checked at retrieval time; previously authorized memories do not bypass revoked access. Source text is untrusted data and cannot grant tools, change rules or authorize writes.

## 7. Adapter selection and first live connector

Define one runtime interface: submit a bounded task/context/tool policy, emit progress and structured output, report usage, support cancellation where available, and expose errors. The controller retains durable state independently of the runtime. Unsupported runtime features must be explicit.

Compare Hermes and OpenScience on the same small fixture suite before choosing one. Test citation fidelity, contradictory evidence, malformed output, timeouts, resumability, usage reporting and approved tool boundaries. No silent fallback between runtimes. Record exact versions and results; selection is not yet made.

Paperclip is the first proposed external connector: public search/read only, called server-side. Verify current API, authentication, coverage, terms and data handling before implementation. Queries themselves must contain no confidential information. Provider keys, paid calls and an agreed spend cap are prerequisites to live testing; offline fixtures can test contracts without them.

Qdrant, OpenResearch, Mem0 and Zep are not initial dependencies. Add a retrieval/memory service only against a measured limitation. Do not duplicate the authoritative store inside an agent's private memory.

## 8. Acceptance tests

| ID | Test and pass condition |
| --- | --- |
| A01 | Refresh and restart: program, completed steps, decisions and approved claims survive browser/server restart |
| A02 | Two-person handoff: real distinct identities; scientist cannot approve own run; unauthorized direct API requests fail |
| A03 | Scope isolation: a user/worker from another program cannot read sources, claims, context, search results or exports |
| A04 | Context inspection: each run exposes exact standards/procedure/source versions; unapproved claims are absent from default institutional knowledge |
| A05 | Citation integrity: each evidence-backed claim resolves to a captured source and locator; invented source IDs fail validation |
| A06 | Conflict preservation: synthetic E01/E02 remain visible together; newer evidence does not silently erase older evidence |
| A07 | Scientific distinction: E03 binding-only evidence does not become demonstrated functional activity; gap remains after assessment acceptance |
| A08 | Promotion boundary: accepting a run alone promotes nothing; approved/rejected item decisions affect only their intended updates |
| A09 | Continuity: reviewer B approves an update; a fresh scientist A session uses it with attribution and excludes rejected updates |
| A10 | Concurrency: two reviews against one claim version cannot silently overwrite each other; stale write is rejected |
| A11 | Recovery: worker interruption resumes from durable checkpoint; duplicate start/review requests do not duplicate records or promotion |
| A12 | Provider failure: timeout, bad output, exhausted budget and cancellation produce truthful visible states, not simulated success |
| A13 | Source injection: a document asking to ignore rules or export data cannot change policy, execute unapproved tools or approve knowledge |
| A14 | Memory maintenance: superseded claims are absent from default context but accessible historically; revocation blocks subsequent retrieval |
| A15 | Export: authorized export includes claims, source references, standards versions and decisions without provider secrets |

Run A01–A15 against deterministic public/synthetic fixtures first. Then run the same relevant checks against the chosen live adapter. Report actual results; passing fixtures is not evidence that a live integration works.

## 9. Build sequence and release gates

1. **Durable core:** schema/migrations, repository layer, controller state machine, scoped API contracts and offline tests. Preserve existing demo behavior; label all simulated identities and provider responses.
2. **Review and memory UI:** context inspection, item-level update review, durable history and fresh-session continuity. Remove demo role switching only when real authentication is operational.
3. **Runtime comparison and Paperclip adapter:** use synthetic/public fixtures first; live calls only with credentials, explicit budget and verified provider contract.
4. **Private two-user pilot:** agreed hosting and identity, explicit invitation/access approval, server-enforced roles, worker isolation, backup/restore test, dependency remediation and A01–A15 results.
5. **Client-data gate:** VivaMed approval of hosting, provider disclosures, permissions and retention. Only then consider confidential evidence and additional workflows.

Immediate next implementation unit: durable domain records and the offline workflow/review tests. This does not require a model vendor, paid API call or client data. Live pilot deployment remains gated by identity, infrastructure and budget choices.

## Reference inputs

- Existing concept: `PRODUCT-NOTE.md` and `app/page.tsx` in this directory.
- Working proposal: https://docs.google.com/document/d/1kfjQBN-V1kbEmOLpNVV0UiwNJ_ZohK6eh7LhtobQj2Y/edit
- Agent Memory — The 5-Layer Playbook: https://drive.google.com/file/d/1DslNwq7amjaBZC8mDtDspvTu5VEJwUfC/view

The playbook is an independent synthesis, not an endorsed Anthropic specification. Its claimed savings and timelines are not acceptance criteria or promised outcomes here.
