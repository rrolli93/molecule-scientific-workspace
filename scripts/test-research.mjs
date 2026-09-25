import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, parseCommand, transition } from "../lib/memory.ts";
import {
  retrieveResearch,
  selectedSources,
  approvedResearchClaims,
} from "../lib/research-demo.ts";
const actor = "test@example.invalid",
  at = "2026-09-17T16:00:00Z";
const cmd = (action, extra = {}) =>
  parseCommand({
    id: crypto.randomUUID(),
    revision: 0,
    role: "scientist",
    action,
    ...extra,
  });
const receipts = () =>
  selectedSources.map((s) => ({
    id: s.id,
    label: s.label,
    url: "https://pubmed.ncbi.nlm.nih.gov/" + s.id,
    endpoint: "fixture",
    retrievedAt: at,
    status: "verified",
    abstractSha256: s.hash,
  }));
test("public research carries only reviewed claims, with frozen snapshots and separate synthetic memory", () => {
  let s = transition(
    emptyState(),
    cmd("research_start"),
    actor,
    at,
    receipts(),
  );
  const first = s.researchRuns[0];
  assert.equal(first.context.approvedClaims.length, 0);
  assert.throws(
    () => transition(s, cmd("research_start"), actor, at, receipts()),
    /Review/,
  );
  for (const [i, c] of first.claims.entries()) {
    s = transition(
      s,
      cmd("research_review", {
        role: "reviewer",
        runId: first.id,
        updateId: c.key,
        outcome: i === 0 ? "approved" : "rejected",
        rationale: "Demo review",
      }),
      actor,
      at,
    );
  }
  s = JSON.parse(JSON.stringify(s));
  s = transition(s, cmd("research_start"), actor, at, receipts());
  assert.equal(s.researchRuns[1].context.approvedClaims.length, 1);
  assert.equal(s.researchRuns[0].context.approvedClaims.length, 0);
  assert.equal(s.knowledge.length, 0);
  assert.equal(s.runs.length, 0);
  assert.equal(approvedResearchClaims(s.researchRuns).length, 1);
});
test("failed retrieval saves trace without claims; retry possible", () => {
  const failed = receipts();
  failed[0].status = "failed";
  let s = transition(emptyState(), cmd("research_start"), actor, at, failed);
  assert.equal(s.researchRuns[0].claims.length, 0);
  assert.equal(s.researchRuns[0].status, "retrieval_incomplete");
  s = transition(s, cmd("research_start"), actor, at, receipts());
  assert.equal(s.researchRuns[1].claims.length, 3);
});
test("review gates and client retrieval injection are rejected", () => {
  const c = cmd("research_start", { retrieved: receipts() });
  assert.throws(
    () => transition(emptyState(), c, actor, at),
    /Server retrieval/,
  );
  const s = transition(emptyState(), c, actor, at, receipts());
  const review = cmd("research_review", {
    runId: c.id,
    updateId: s.researchRuns[0].claims[0].key,
    outcome: "approved",
    rationale: "Review",
  });
  assert.throws(() => transition(s, review, actor, at), /reviewer/);
  assert.throws(
    () =>
      transition(s, { ...review, role: "reviewer", rationale: "" }, actor, at),
    /rationale/,
  );
});
test("network failures, wrong identifiers and changed abstracts fail closed", async () => {
  let s = await retrieveResearch(
    async () => new Response("down", { status: 503 }),
  );
  assert(s.every((r) => r.status === "failed" && r.httpStatus === 503));
  s = await retrieveResearch(async () =>
    Response.json({ resultList: { result: [] } }),
  );
  assert(s.every((r) => r.status === "failed"));
  s = await retrieveResearch(async (url) => {
    const id = new URL(url).searchParams.get("query").match(/EXT_ID:(\d+)/)[1];
    return Response.json({
      resultList: {
        result: [
          {
            id,
            source: "MED",
            title: "Changed record",
            abstractText: "Changed abstract",
          },
        ],
      },
    });
  });
  assert(s.every((r) => r.status === "changed"));
});
