import test from "node:test";
import assert from "node:assert/strict";
import {
  applyNotebookCommand,
  emptyNotebook,
  notebookIdentity,
  notebookReplay,
  parseNotebookCommand,
} from "../lib/workspace/notebook.ts";

const save = (overrides = {}) =>
  parseNotebookCommand({
    action: "save",
    workspaceId: "vivamed-demo",
    revision: 0,
    commandId: "quality_save_001",
    programId: "endotype-alpha",
    candidateId: "candidate-a",
    question: "Does the signal reproduce?",
    evidenceIds: ["E01", "E02"],
    ...overrides,
  });
const at = "2026-09-22T00:00:00.000Z";

test("notebook authentication fails closed even with an untrusted identity header", () => {
  const request = new Request(
    "https://workspace.example/api/workspace-notebook",
    { headers: { "oai-authenticated-user-email": "other@example.com" } },
  );
  assert.throws(() => notebookIdentity(request, {}), { status: 401 });
  assert.throws(() => notebookIdentity(request, { localDemo: "true" }), {
    status: 401,
  });
  assert.deepEqual(notebookIdentity(request, { trustSitesIdentity: "true" }), {
    actor: "other@example.com",
    mode: "owner-private",
  });
});

test("local demonstration identity is enabled only explicitly on loopback", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const request = new Request(`http://${host}:3034/api/workspace-notebook`);
    assert.throws(() => notebookIdentity(request, {}), { status: 401 });
    assert.equal(
      notebookIdentity(request, { localDemo: "true" }).actor,
      "local-demo",
    );
  }
  assert.throws(
    () =>
      notebookIdentity(new Request("http://localhost.attacker.example/"), {
        localDemo: "true",
      }),
    { status: 401 },
  );
});

test("scoped context cannot use another candidate's evidence or the empty PeptAI program", () => {
  assert.throws(() => save({ evidenceIds: ["E03"] }));
  assert.throws(() => save({ workspaceId: "peptai-test" }));
  assert.throws(() => save({ evidenceIds: [] }));
  assert.throws(() => save({ revision: -1 }));
  assert.throws(() => save({ question: " " }));
});

test("saved source text is reconstructed, frozen and hashed; the input state remains unchanged", async () => {
  const input = emptyNotebook("vivamed-demo");
  const command = save({
    packet: { sources: [{ text: "FAKE APPROVED RESULT" }] },
  });
  const result = await applyNotebookCommand(
    input,
    command,
    "scientist@example.com",
    at,
  );
  assert.equal(input.briefs.length, 0);
  assert.equal(result.briefs[0].packet.sources.length, 2);
  assert.equal(JSON.stringify(result).includes("FAKE APPROVED RESULT"), false);
  const expected = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(result.briefs[0].packet)),
  );
  assert.equal(result.briefs[0].digest, Buffer.from(expected).toString("hex"));
  command.evidenceIds.pop();
  assert.equal(result.briefs[0].packet.sources.length, 2);
  assert.deepEqual(result.briefs[0].packet.approvedKnowledge, []);
});

test("acceptance requires rationale and does not promote knowledge or rewrite the packet", async () => {
  const initial = await applyNotebookCommand(
    emptyNotebook("vivamed-demo"),
    save(),
    "scientist",
    at,
  );
  const body = {
    action: "review",
    workspaceId: "vivamed-demo",
    revision: 1,
    commandId: "quality_review_001",
    briefId: initial.briefs[0].id,
    decision: "accepted",
    rationale: "Suitable question framing; not validation of biology.",
  };
  assert.throws(() => parseNotebookCommand({ ...body, rationale: " " }));
  const reviewed = await applyNotebookCommand(
    initial,
    parseNotebookCommand(body),
    "reviewer",
    at,
  );
  assert.deepEqual(reviewed.briefs[0].packet, initial.briefs[0].packet);
  assert.equal(reviewed.briefs[0].digest, initial.briefs[0].digest);
  assert.equal(initial.briefs[0].status, "draft");
  assert.equal(reviewed.briefs[0].status, "accepted");
  assert.deepEqual(reviewed.briefs[0].packet.approvedKnowledge, []);
  await assert.rejects(
    applyNotebookCommand(
      reviewed,
      parseNotebookCommand({
        ...body,
        commandId: "quality_review_002",
        decision: "rejected",
      }),
      "reviewer",
      at,
    ),
    { status: 409 },
  );
});

test("idempotent replay does not add events; ID reuse for different content fails", async () => {
  const command = save();
  const saved = await applyNotebookCommand(
    emptyNotebook("vivamed-demo"),
    command,
    "scientist",
    at,
  );
  assert.equal(notebookReplay(saved, command), true);
  const replayed = await applyNotebookCommand(saved, command, "scientist", at);
  assert.equal(replayed.briefs.length, 1);
  assert.equal(replayed.events.length, 1);
  assert.throws(
    () => notebookReplay(saved, save({ question: "A different question" })),
    { status: 409 },
  );
});

test("cross-workspace state mutations and absent brief review fail", async () => {
  await assert.rejects(
    applyNotebookCommand(emptyNotebook("peptai-test"), save(), "scientist", at),
    { status: 403 },
  );
  const command = parseNotebookCommand({
    action: "review",
    workspaceId: "vivamed-demo",
    revision: 0,
    commandId: "quality_review_001",
    briefId: "not_in_notebook",
    decision: "rejected",
    rationale: "Unknown brief",
  });
  await assert.rejects(
    applyNotebookCommand(
      emptyNotebook("vivamed-demo"),
      command,
      "scientist",
      at,
    ),
    { status: 404 },
  );
});
