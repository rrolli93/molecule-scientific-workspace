import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// A shared repository ships no captured modules, so there is nothing to cut.
// fileURLToPath, not URL.pathname: this vault's path contains spaces and ~,
// which stay percent-encoded in pathname and make every file look absent.
const dir = fileURLToPath(new URL("../lib/workspace/captured/", import.meta.url));
const present =
  existsSync(join(dir, "kiss1r-round1.ts")) &&
  existsSync(join(dir, "kiss1r-round1.shared.ts"));
const guard = { skip: present ? false : "no captured modules in this build" };
const { capturedProgram: full } = present
  ? await import("../lib/workspace/captured/kiss1r-round1.ts")
  : { capturedProgram: undefined };
const { capturedProgram: shared } = present
  ? await import("../lib/workspace/captured/kiss1r-round1.shared.ts")
  : { capturedProgram: undefined };

/**
 * The shareable cut is built by REMOVING records, not hiding them. These
 * assertions are about absence, because absence is the only thing a bundle
 * cannot betray: runtime gating filtered what was drawn while every sequence
 * and vendor price still sat in the JavaScript the browser downloads.
 */

test("the shared cut contains only records the spec marked shared", guard, () => {
  assert.equal(shared.audience, "shared");
  assert.ok(full.evidence.length > shared.evidence.length, "something is withheld");
  for (const e of shared.evidence) assert.equal(e.visibility, "shared");

  const internal = full.evidence.filter((e) => e.visibility !== "shared");
  assert.ok(internal.length > 0);
  const blob = JSON.stringify(shared);
  for (const record of internal) {
    assert.ok(!blob.includes(record.id + '"'), `${record.id} id leaked`);
    // No sentence of an internal record may survive anywhere in the cut.
    const sentence = (record.fullText ?? record.text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .find((s) => s.length > 50 && s.length < 200);
    if (sentence) assert.ok(!blob.includes(sentence), `${record.id} text leaked`);
  }
});

test("composition of matter never travels", guard, () => {
  const blob = JSON.stringify(shared);
  for (const c of full.candidates) {
    if (!c.sequence) continue;
    assert.ok(!blob.includes(c.sequence), `${c.name} sequence leaked`);
  }
  for (const c of shared.candidates) assert.equal(c.sequence, undefined);
});

test("nothing in the shared cut dangles or outlives its evidence", guard, () => {
  const ids = new Set(shared.evidence.map((e) => e.id));
  const candidates = new Set(shared.candidates.map((c) => c.id));
  for (const c of shared.candidates) {
    assert.ok(c.evidenceIds.length > 0, "an empty candidate is a shell, drop it");
    for (const id of c.evidenceIds) assert.ok(ids.has(id));
  }
  for (const c of shared.claims) {
    assert.ok(candidates.has(c.candidateId));
    for (const id of c.evidenceIds) assert.ok(ids.has(id));
  }
  for (const r of shared.relations)
    assert.ok(ids.has(r.from) && ids.has(r.to));
});

test("reconciled state is withheld unless the spec shares it", guard, () => {
  // It names vendors, payment dates and amounts, so it is a disclosure
  // decision rather than a default.
  assert.ok(full.currentState, "the internal cut has it");
  assert.equal(shared.currentState, undefined);
});
