import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, parseCommand, transition } from "../lib/memory.ts";
import {
  challengePackage as pack,
  approvedChallengeClaims,
} from "../lib/challenge-package.ts";
const actor = "test@example.invalid",
  at = "2026-09-17T19:00:00Z";
const command = (action, extra = {}) =>
  parseCommand({
    id: crypto.randomUUID(),
    revision: 0,
    role: "scientist",
    action,
    ...extra,
  });
test("server-canonical challenge import ignores injected claims, preserves old memory and replays", () => {
  const original = emptyState(),
    c = command("challenge_import", { claims: [{ status: "approved" }] });
  const s = transition(original, c, actor, at);
  assert.equal(original.challengeRecords, undefined);
  assert.equal(s.challengeRecords[0].claims.length, 2);
  assert(s.challengeRecords[0].claims.every((c) => c.status === "proposed"));
  assert.equal(transition(s, c, actor, at), s);
  assert.throws(
    () => transition(s, command("challenge_import"), actor, at),
    /already imported/,
  );
  assert.throws(
    () =>
      transition(
        original,
        command("challenge_import", { role: "reviewer" }),
        actor,
        at,
      ),
    /scientist/,
  );
});
test("review requires role and rationale; quarantined citation cannot be approved", () => {
  let s = transition(emptyState(), command("challenge_import"), actor, at);
  const c = command("challenge_review", {
    runId: pack.id,
    updateId: pack.proposals[0].key,
    outcome: "approved",
    rationale: "Source-scoped only",
  });
  assert.throws(() => transition(s, c, actor, at), /reviewer/);
  c.role = "reviewer";
  assert.throws(
    () => transition(s, { ...c, rationale: "" }, actor, at),
    /rationale/,
  );
  assert.throws(
    () => transition(s, { ...c, outcome: "accepted" }, actor, at),
    /Invalid/,
  );
  assert.throws(
    () => transition(s, { ...c, updateId: "quarantined" }, actor, at),
    /not found/,
  );
  s = transition(s, c, actor, at);
  assert.throws(
    () => transition(s, { ...c, id: crypto.randomUUID() }, actor, at),
    /already has/,
  );
  assert.equal(approvedChallengeClaims(s.challengeRecords).length, 1);
  assert.equal(s.knowledge.length, 0);
  assert.equal(
    JSON.parse(JSON.stringify(s)).challengeRecords[0].claims[0].decision.actor,
    actor,
  );
});
test("only approved additions enter new public snapshots, not earlier or synthetic runs", () => {
  let s = transition(emptyState(), command("challenge_import"), actor, at);
  const receipts = [
    { status: "failed" },
    { status: "failed" },
    { status: "failed" },
  ];
  s = transition(s, command("research_start"), actor, at, receipts);
  for (let i = 0; i < 2; i++)
    s = transition(
      s,
      command("challenge_review", {
        role: "reviewer",
        runId: pack.id,
        updateId: pack.proposals[i].key,
        outcome: i ? "rejected" : "approved",
        rationale: "Test review",
      }),
      actor,
      at,
    );
  s = transition(s, command("research_start"), actor, at, receipts);
  assert.equal(s.researchRuns[0].context.approvedChallengeClaims.length, 0);
  assert.equal(s.researchRuns[1].context.approvedChallengeClaims.length, 1);
  s = transition(s, command("start"), actor, at);
  assert.equal(s.runs[0].context.approvedKnowledge.length, 0);
});
