import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, parseCommand, transition } from "../lib/memory.ts";
const actor = "test@example.invalid",
  at = "2026-09-17T18:00:00Z";
const c = (action, extra = {}) =>
  parseCommand({
    id: crypto.randomUUID(),
    revision: 0,
    role: "scientist",
    action,
    ...extra,
  });
test("legacy states import canonical fixture only, replay safely and reject duplicate runs", () => {
  const old = emptyState();
  const cmd = c("import_external", { envelope: { approvedKnowledge: true } });
  const saved = transition(old, cmd, actor, at);
  assert.equal(old.externalEvidence, undefined);
  assert.equal(saved.externalEvidence[0].envelope.approvedKnowledge, false);
  assert.equal(saved.externalEvidence[0].status, "proposed");
  assert.equal(transition(saved, cmd, actor, at), saved);
  assert.throws(
    () => transition(saved, c("import_external"), actor, at),
    /already imported/,
  );
});
test("review gates, persistence and scientific-context separation", () => {
  let s = transition(emptyState(), c("import_external"), actor, at);
  const review = c("review_external", {
    runId: s.externalEvidence[0].id,
    outcome: "accepted",
    rationale: "Arithmetic plumbing verified.",
  });
  assert.throws(() => transition(s, review, actor, at), /reviewer/);
  review.role = "reviewer";
  assert.throws(
    () => transition(s, { ...review, rationale: "" }, actor, at),
    /rationale/,
  );
  assert.throws(
    () => transition(s, { ...review, outcome: "approved" }, actor, at),
    /Invalid/,
  );
  s = transition(s, review, actor, at);
  s = JSON.parse(JSON.stringify(s));
  assert.equal(s.externalEvidence[0].decision.actor, actor);
  assert.throws(
    () => transition(s, { ...review, id: crypto.randomUUID() }, actor, at),
    /already has/,
  );
  s = transition(s, c("start"), actor, at);
  assert.equal(s.knowledge.length, 0);
  assert.equal(s.runs[0].context.approvedKnowledge.length, 0);
  assert.equal(s.runs[0].context.sources.length, 3);
});
test("rejecting a result does not delete provenance", () => {
  let s = transition(emptyState(), c("import_external"), actor, at);
  s = transition(
    s,
    c("review_external", {
      role: "reviewer",
      runId: s.externalEvidence[0].id,
      outcome: "rejected",
      rationale: "Not scientific evidence.",
    }),
    actor,
    at,
  );
  assert.equal(s.externalEvidence[0].status, "rejected");
  assert.equal(s.externalEvidence[0].envelope.provenance.status, "done");
});
