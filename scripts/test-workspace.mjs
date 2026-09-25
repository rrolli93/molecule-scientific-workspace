import { test } from "node:test";
import assert from "node:assert/strict";
import { assessmentMatrix, briefMarkdown } from "../lib/workspace/core.ts";
import {
  workspaces,
  programsFor,
  programById,
  candidateById,
  evidenceById,
  buildContext,
  connections,
  executionEligibility,
} from "../lib/workspace/core.ts";

const input = {
  workspaceId: "vivamed-demo",
  programId: "endotype-alpha",
  candidateId: "candidate-a",
  question: "Does the signal reproduce?",
  evidenceIds: ["E01", "E02"],
};

test("qualitative comparison is scoped and never invents a pass score", () => {
  assert.throws(
    () => assessmentMatrix("peptai-test", "endotype-alpha"),
    /outside/,
  );
  const matrix = assessmentMatrix("vivamed-demo", "endotype-alpha");
  assert.equal(matrix.length, 4);
  assert.deepEqual(matrix[0].a.sources, ["E01", "E02"]);
  assert.equal(matrix[0].b.label, "Not established");
  assert.equal(matrix[3].b.label, "Reported binding");
  for (const row of matrix)
    for (const cell of [row.a, row.b]) {
      assert(!("score" in cell));
      for (const id of cell.sources)
        assert(evidenceById("vivamed-demo", "endotype-alpha", id));
    }
});

test("readable brief preserves classifications, source versions and omissions", () => {
  const packet = buildContext({ ...input, evidenceIds: ["E01"] });
  const md = briefMarkdown(packet);
  assert.match(md, /SYNTHETIC DEMONSTRATION/);
  assert.match(md, /E01 · Functional assay summary · v1/);
  assert.match(md, /E02: Not selected/);
  assert.match(md, /Incomplete candidate context/);
  assert.match(md, /No provider has received this brief/);
  assert.match(md, /not approved client policy/);
  assert.equal(packet.sources.length, 1);
});
test("workspace and program scope reject cross-workspace identifiers", () => {
  assert.equal(workspaces.length, 2);
  // With a capture the PeptAI scope holds exactly it; without one it is empty.
  // Either way it must never reach into VivaMed's fixture, which is the point.
  assert.deepEqual(
    programsFor("peptai-test").map((p) => p.programId),
    programsFor("peptai-test").length ? ["kiss1r-round1"] : [],
  );
  assert.throws(() => programsFor("invented"), /Unknown workspace/);
  assert.throws(() => programById("peptai-test", "endotype-alpha"), /outside/);
  assert.throws(
    () => candidateById("vivamed-demo", "invented", "candidate-a"),
    /outside/,
  );
  assert.throws(
    () => candidateById("vivamed-demo", "endotype-alpha", "invented"),
    /outside/,
  );
  assert.throws(
    () => evidenceById("peptai-test", "endotype-alpha", "E01"),
    /outside/,
  );
});
test("fixture repository returns detached records", () => {
  const program = programById("vivamed-demo", "endotype-alpha");
  program.evidence[0].text = "tampered";
  program.claims[0].review = "approved";
  const fresh = programById("vivamed-demo", "endotype-alpha");
  assert.notEqual(fresh.evidence[0].text, "tampered");
  assert.equal(fresh.claims[0].review, "proposed");
});
test("source, interpretation and approval remain distinct", () => {
  const p = programById("vivamed-demo", "endotype-alpha");
  assert(
    p.evidence.every(
      (e) =>
        e.origin === "synthetic" &&
        e.processing === "original" &&
        e.review === "unreviewed",
    ),
  );
  assert(p.claims.every((c) => c.review === "proposed"));
  assert.deepEqual(p.claims[0].evidenceIds, ["E01", "E02"]);
  assert.equal(p.claims[1].kind, "gap");
  for (const claim of p.claims)
    for (const id of claim.evidenceIds) {
      const source = evidenceById(p.workspaceId, p.programId, id);
      assert.equal(source.candidateId, claim.candidateId);
    }
});
test("context preserves source versions and conflicting evidence without approving claims", () => {
  const packet = buildContext(input);
  assert.equal(packet.mode, "synthetic-context-preview");
  assert.deepEqual(
    packet.sources.map((s) => s.id),
    ["E01", "E02"],
  );
  assert(packet.sources.every((s) => s.version === 1));
  assert.match(packet.sources[1].text, /did not reproduce/);
  assert.deepEqual(packet.approvedKnowledge, []);
  assert.deepEqual(packet.omissions, []);
  assert.deepEqual(packet.warnings, []);
  assert.match(packet.standards.status, /not-client-policy/);
});
test("omitted evidence remains explicit and warns against selective interpretation", () => {
  const packet = buildContext({ ...input, evidenceIds: ["E01", "E01"] });
  assert.equal(packet.sources.length, 1);
  assert.equal(packet.omissions[0].id, "E02");
  assert.equal(packet.warnings.length, 1);
  assert.equal(
    programById(input.workspaceId, input.programId).evidence.length,
    3,
  );
});
test("bad scopes, cross-candidate evidence, empty selections and invalid questions fail", () => {
  assert.throws(
    () => buildContext({ ...input, workspaceId: "peptai-test" }),
    /outside/,
  );
  assert.throws(
    () => buildContext({ ...input, evidenceIds: ["E03"] }),
    /selected candidate/,
  );
  assert.throws(
    () => buildContext({ ...input, evidenceIds: ["invented"] }),
    /outside/,
  );
  assert.throws(
    () => buildContext({ ...input, evidenceIds: [] }),
    /at least one/,
  );
  assert.throws(() => buildContext({ ...input, question: "  " }), /question/);
  assert.throws(
    () => buildContext({ ...input, question: "x".repeat(2001) }),
    /question/,
  );
});
test("context packets are detached and provider independent", () => {
  const packet = buildContext(input);
  const original = JSON.stringify(packet);
  const second = buildContext({
    ...input,
    candidateId: "candidate-b",
    evidenceIds: ["E03"],
  });
  second.sources[0].text = "tampered";
  assert.equal(JSON.stringify(packet), original);
  assert.deepEqual(JSON.parse(original), packet);
  assert(!("model" in packet));
  assert(!("credentials" in packet));
});
test("catalog entries never imply enabled execution or wallet authority", () => {
  assert.equal(new Set(connections.map((c) => c.id)).size, connections.length);
  for (const workspace of workspaces)
    for (const connection of connections) {
      const eligibility = executionEligibility(workspace.id, connection.id);
      assert.equal(eligibility.allowed, false);
      assert(eligibility.reason.length > 20);
    }
  assert.throws(() => executionEligibility("unknown", "rowan"), /Unknown/);
  assert.throws(
    () => executionEligibility("vivamed-demo", "unknown"),
    /Unknown/,
  );
});

test("captured records carry provenance and only corroborated relationships", () => {
  const [program] = programsFor("peptai-test");
  // A build can ship with no capture; a shared repository does exactly that.
  if (!program) return;
  const ids = new Set(program.evidence.map((e) => e.id));
  const candidateIds = new Set(program.candidates.map((c) => c.id));

  for (const e of program.evidence) {
    assert.equal(e.origin, "vault-capture");
    assert.equal(e.review, "unreviewed", "capture must never arrive reviewed");
    assert.equal(e.processing, "original");
    assert.ok(e.provenance?.path && /^[0-9a-f]{64}$/.test(e.provenance.sha256));
    assert.ok(e.provenance.capturedAt, "every record states when it was captured");
    // Programme-level records belong to no candidate; the rest must resolve.
    if (e.candidateId !== null) assert.ok(candidateIds.has(e.candidateId));
    if (e.recordDate) assert.match(e.recordDate, /^20\d\d-\d\d-\d\d$/);
  }

  // A claim is always proposed, never approved, and cites only its own candidate.
  for (const c of program.claims) {
    assert.equal(c.review, "proposed");
    const own = new Set(
      program.evidence.filter((e) => e.candidateId === c.candidateId).map((e) => e.id),
    );
    for (const id of c.evidenceIds) assert.ok(own.has(id));
  }

  // Relationships point inside the capture; supersession keeps its verbatim
  // corroborating quote, and that quote must actually state supersession.
  const supersession = program.relations.filter((r) => r.kind !== "cites");
  assert.ok(supersession.length > 0);
  for (const r of program.relations) {
    assert.ok(ids.has(r.from) && ids.has(r.to));
    assert.notEqual(r.from, r.to);
    if (r.kind === "cites") continue;
    assert.ok(r.statement, "supersession must quote its source");
    assert.match(r.statement, /supersed/i);
  }

  // Current state is quoted from the programme note, never authored here.
  assert.ok(program.currentState?.sourcePath.endsWith(".md"));
  assert.ok(program.currentState.rows.length > 0);
  for (const row of program.currentState.rows) {
    assert.ok(row.item && row.state && row.basis);
    assert.ok(
      ["recorded", "unconfirmed", "open", "absent", "unclassified"].includes(
        row.confidence,
      ),
    );
  }
});
