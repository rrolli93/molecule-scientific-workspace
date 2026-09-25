# VivaMed scientific workspace: first product slice

> Historical first-slice note. Statements below about no live retrieval or connected models describe that slice, not all subsequent work. See [EVOLUTION-PLAN.md](EVOLUTION-PLAN.md) for the current inspected implementation map and [challenge handoff](../../integrations/vivamed/CHALLENGE-HANDOFF.md) for the captured real-agent demonstration.

This is a concept prototype for Molecule's internal discussion. All programs, evidence, standards and findings are fictional. No external research service or actual AI assessment is connected.

The original route (`/`) remains a reset-on-refresh demonstration with simulated identities. The new `/memory` route saves synthetic assessments, frozen context, review decisions and item-level knowledge approvals in Sites D1, scoped to the signed-in owner's platform-provided email. Its scientist/reviewer switch still simulates two roles held by the same person; it is not a multi-user approval system. There are no uploads, confidential evidence, external models or paid provider calls.

## Persistent-memory walkthrough

1. Open `/memory` from the original concept's “Saved memory” link.
2. As Demo scientist, prepare a synthetic assessment.
3. Inspect its frozen context, three exact fixture evidence versions, standards and findings.
4. Switch to Demo reviewer. Enter an assessment rationale and accept it.
5. Separately approve the inference update and reject the gap update, each with a rationale.
6. Refresh; saved decisions remain. Switch to Demo scientist and prepare the next run.
7. Inspect “Approved knowledge included (1)”: only the approved claim carries forward. The earlier run's snapshot still has zero approved claims.

Findings are deliberately fixed, not generated or improved by an AI. Rejected fixture proposals can appear for review in a later run; they do not enter approved knowledge. Requesting changes preserves the review but does not automatically revise the fixture.

## Storage and pilot limits

One transactional, revisioned JSON aggregate per authenticated owner contains runs, knowledge and events. Conditional writes prevent stale-tab overwrites, and command receipts prevent duplicate submissions. This is a bounded first slice (100 runs / 1.5 million serialized characters), not the normalized multi-program schema or immutable audit ledger planned in `IMPLEMENTATION-SPEC.md`. There is no delete/reset endpoint for saved records.

The worker trusts the Sites dispatcher identity header. It must not be exposed as a standalone public worker. Missing identity fails closed; cross-origin writes are rejected. Owner-scoped records are not shared team records, and an email identity change does not automatically migrate them. Broader access, actual reviewer permissions, retention, source uploads, model workers and backup/restore validation remain pilot gates.

Implementation choice: the existing Sites deployment requires platform-backed persistence, so this slice uses D1 (local SQLite emulation for tests), rather than the generic local repository suggested in the specification. Client hosting is not committed by this choice.

## Walkthrough

1. Open Endotype Alpha from Programs.
2. Expand the task context and inspect the demonstration standards.
3. Generate the example assessment; inspect evidence links E01–E03.
4. Open scientific review. Switch to Demo reviewer in the top-right control.
5. Enter a rationale and accept the assessment or request changes.
6. Return to Programs and inspect the decision trail.

Accepting an assessment is not advancing a candidate: the unresolved evidence gaps remain visible. The role switch demonstrates a handoff, not actual identity or permission enforcement.

## What this lets Rafael decide

- Does the product feel like a place VivaMed scientists could work?
- Are program records, source evidence and standards accessible enough?
- Is the handoff between a scientist and a reviewer understandable?
- Which missing interaction would prevent this from being useful?

## First working implementation, after product direction is accepted

Keep the interface, scientific records, and agent runtime separated. Suggested records: Program, Candidate, EvidenceSource (including version and locator), Claim (observation/inference/gap and supporting or conflicting links), StandardsVersion, AssessmentRun, ReviewDecision. An accepted decision references the exact run, standards version and evidence snapshots, with a real user identity.

Build a server-side context assembler that selects the approved standards, relevant program state, authorized source material, and one versioned workflow. Retrieval is an input to this process, not the authority for accepting a claim. Store canonical records and source files independently of any search index or agent session.

Evaluate one OpenScience runtime adapter against one Hermes runtime adapter on the same bounded evidence-assessment task. Test completion, source fidelity, tool failures, review pauses, costs and restart recovery. Select one before expanding the implementation; neither is integrated in this prototype.

Paperclip is a candidate connector for external evidence. Assess coverage, citations, data handling and commercial use before connecting client material. Existing direct database tools remain possible. Qdrant should be introduced only if retrieval evaluation justifies an additional index. OpenResearch may later support computational experiment execution. None of these providers is required to view this prototype.

The first real team deployment needs authenticated identities, server-enforced program permissions, isolated workers, durable job state, backups, cost ceilings and audit events. Connect selected provenance events to Molecule Protocol after verifying its actual integration contract. Do not represent browser-session history as immutable provenance.

Start with a small representative evidence package; full portfolio ranking of approximately 100 compounds/sequences remains a later scoped deliverable. This note does not change the Google Doc proposal or commit Molecule to a deployment platform.

## Local development

This is not a production-ready application. Dependency auditing still reports advisories in the starter/tooling dependency tree; review and resolve these before any real-client rollout.

Run `npm ci`, then `npm run dev -- --port 3022`. Production validation: `npm run build`.

Memory tests:

- `node --experimental-strip-types --test scripts/test-memory.mjs`: deterministic domain tests.
- `npm run build`, then `npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chunky_sue_storm.sql`: initialize a new local test database once.
- Start dev on port 3024; `node scripts/verify-memory.mjs` exercises real local database/API/browser behavior. It injects synthetic identity headers only into a loopback development server; it is not a production sign-in mechanism.

The migration is packaged for Sites to apply to its managed database during deployment. Do not run the local initialization SQL again against an existing table. Original concept checks remain in `scripts/verify-prototype.mjs`.
