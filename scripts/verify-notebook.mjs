import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";

// Appends three explicitly synthetic QA briefs; never deletes existing records.
// Run only against the disposable/local demo, never a hosted customer workspace.
const base = process.env.WORKSPACE_TEST_URL || "http://localhost:3034";
const origin = new URL(base).origin;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname))
  throw new Error(
    "Notebook verification is restricted to a local demonstration.",
  );
const endpoint = `${origin}/api/workspace-notebook`;
const run = `qa_${randomUUID().replaceAll("-", "")}`;
async function get(workspaceId = "vivamed-demo") {
  const response = await fetch(`${endpoint}?workspaceId=${workspaceId}`);
  return { response, body: await response.json() };
}
async function post(body, headers = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", origin, ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    value = { error: text };
  }
  return { response, body: value };
}
function save(revision, suffix, overrides = {}) {
  return {
    action: "save",
    workspaceId: "vivamed-demo",
    revision,
    commandId: `${run}_${suffix}`,
    programId: "endotype-alpha",
    candidateId: "candidate-a",
    question: `[Synthetic QA ${suffix}] Does the signal reproduce under matched conditions?`,
    evidenceIds: ["E01", "E02"],
    ...overrides,
  };
}

const initial = await get();
assert.equal(initial.response.status, 200, JSON.stringify(initial.body));
assert.equal(
  initial.body.mode,
  "local-demo",
  "Refusing to mutate a non-demo identity.",
);
assert.equal(initial.body.actor, "local-demo");
assert.equal(initial.response.headers.get("cache-control"), "no-store");
const peptaiBefore = (await get("peptai-test")).body;
const command = save(initial.body.revision, "draft");
assert.equal(
  (await post(command, { origin: "https://attacker.example" })).response.status,
  403,
);
assert.equal((await post(command, { origin: "" })).response.status, 403);
assert.equal(
  (await post(command, { "content-type": "text/plain" })).response.status,
  415,
);
assert.equal(
  (
    await post(
      save(initial.body.revision, "cross_candidate", { evidenceIds: ["E03"] }),
    )
  ).response.status,
  400,
);
assert.equal(
  (
    await post(
      save(initial.body.revision, "cross_workspace", {
        workspaceId: "peptai-test",
      }),
    )
  ).response.status,
  400,
);
assert.equal(
  (await post({ ...command, question: "x".repeat(13000) })).response.status,
  413,
);

const created = await post(
  {
    ...command,
    packet: { sources: [{ text: "DO NOT TRUST CLIENT SOURCES" }] },
  },
  { "oai-authenticated-user-email": "spoofed@example.com" },
);
assert.equal(created.response.status, 200, JSON.stringify(created.body));
assert.equal(created.body.actor, "local-demo");
assert.equal(created.body.revision, initial.body.revision + 1);
const brief = created.body.state.briefs.find((b) => b.id === command.commandId);
assert.equal(brief.status, "draft");
assert.equal(brief.createdBy, "local-demo");
assert.equal(
  JSON.stringify(brief).includes("DO NOT TRUST CLIENT SOURCES"),
  false,
);
assert.equal(
  brief.digest,
  createHash("sha256").update(JSON.stringify(brief.packet)).digest("hex"),
);
assert.equal(
  created.body.state.events.length,
  initial.body.state.events.length + 1,
);

const replay = await post(command);
assert.equal(replay.response.status, 200);
assert.equal(replay.body.revision, created.body.revision);
assert.equal(replay.body.state.events.length, created.body.state.events.length);
assert.equal(
  (await post({ ...command, question: "Changed content with reused ID" }))
    .response.status,
  409,
);
assert.equal(
  (await post(save(initial.body.revision, "stale"))).response.status,
  409,
);

const review = {
  workspaceId: "vivamed-demo",
  revision: created.body.revision,
  commandId: `${run}_review`,
  action: "review",
  briefId: brief.id,
  decision: "accepted",
  rationale:
    "Synthetic QA: accept the brief framing only. No scientific approval or execution.",
};
assert.equal((await post({ ...review, rationale: " " })).response.status, 400);
const accepted = await post(review);
assert.equal(accepted.response.status, 200, JSON.stringify(accepted.body));
const acceptedBrief = accepted.body.state.briefs.find((b) => b.id === brief.id);
assert.equal(acceptedBrief.status, "accepted");
assert.deepEqual(acceptedBrief.packet, brief.packet);
assert.equal(acceptedBrief.digest, brief.digest);
assert.deepEqual(acceptedBrief.packet.approvedKnowledge, []);
assert.equal(
  (
    await post({
      ...review,
      revision: accepted.body.revision,
      commandId: `${run}_review_again`,
      decision: "rejected",
    })
  ).response.status,
  409,
);

// Optimistic concurrency must admit exactly one different command per revision.
const concurrent = await Promise.all([
  post(save(accepted.body.revision, "race_a")),
  post(save(accepted.body.revision, "race_b")),
]);
assert.deepEqual(concurrent.map((r) => r.response.status).sort(), [200, 409]);
const afterRace = (await get()).body;
const rejectedDraft = await post(save(afterRace.revision, "reject_draft"));
assert.equal(rejectedDraft.response.status, 200);
const rejected = await post({
  ...review,
  revision: rejectedDraft.body.revision,
  commandId: `${run}_reject`,
  briefId: `${run}_reject_draft`,
  decision: "rejected",
  rationale:
    "Synthetic QA: insufficient brief framing; keep a trace without knowledge promotion.",
});
assert.equal(rejected.response.status, 200);
assert.equal(
  rejected.body.state.briefs.find((b) => b.id === `${run}_reject_draft`).status,
  "rejected",
);

const refreshed = await get();
assert.deepEqual(refreshed.body.state, rejected.body.state);
assert.deepEqual((await get("peptai-test")).body, peptaiBefore);
for (const existing of initial.body.state.briefs)
  assert.deepEqual(
    refreshed.body.state.briefs.find((b) => b.id === existing.id),
    existing,
  );
console.log(
  `PASS: local identity, source integrity, cross-scope rejection, Origin/JSON/size guards, replay, CAS race, frozen accepted/rejected review, reload persistence and PeptAI isolation. Appended synthetic QA records under ${run}; preserved existing records.`,
);
