import { test } from "node:test";
import assert from "node:assert/strict";
import { programsFor } from "../lib/workspace/core.ts";
import { answerQuestion, gateProgram, suggestedQuestions } from "../lib/workspace/ask.ts";

const [program] = programsFor("peptai-test");
// A build with no captured programme (a shared repository ships that way)
// has nothing for these to assert against.
const noCapture = { skip: program ? false : "no captured programme in this build" };

test("answers come only from captured records, never invented", noCapture, () => {
  const a = answerQuestion(program, "Have we paid Eurofins?");
  assert.equal(a.strength, "direct");
  // The recorded state must be verbatim from the programme's own state table.
  const row = program.currentState.rows.find((r) => r.item === a.state.item);
  assert.equal(a.state.recorded, row.state);
  assert.equal(a.state.basis, row.basis);
  // Every cited record exists, and every quote is VERBATIM from that record.
  // Answers quote the sentence that matched rather than the note's opening, so
  // the check is substring identity, not equality with the lead excerpt.
  for (const c of a.records) {
    const e = program.evidence.find((x) => x.id === c.id);
    assert.ok(e, `cited ${c.id} must exist`);
    assert.ok(
      (e.fullText ?? e.text).includes(c.excerpt),
      `quote attributed to ${c.id} must appear in it verbatim`,
    );
    assert.equal(c.path, e.provenance?.path);
  }
});

test("a question the capture cannot answer says so", noCapture, () => {
  const a = answerQuestion(program, "Who won the World Cup?");
  assert.equal(a.strength, "none");
  assert.equal(a.answered, false);
  assert.equal(a.records.length, 0);
  assert.ok(!a.state);
  assert.match(a.limitation, /do not answer this/i);
});

test("what is outstanding returns only items not recorded as done", noCapture, () => {
  const a = answerQuestion(program, "What are we waiting on?");
  assert.ok(a.outstanding?.length);
  for (const row of a.outstanding)
    assert.ok(["unconfirmed", "open", "absent"].includes(row.confidence));
  // Anything already recorded must not be presented as outstanding.
  const recorded = program.currentState.rows
    .filter((r) => r.confidence === "recorded")
    .map((r) => r.item);
  for (const row of a.outstanding) assert.ok(!recorded.includes(row.item));
});

test("every suggested question is actually answerable", noCapture, () => {
  const suggestions = suggestedQuestions(program);
  assert.ok(suggestions.length > 0);
  for (const q of suggestions)
    assert.notEqual(answerQuestion(program, q).strength, "none", q);
});

test("the outside view withholds internal records and says how many", noCapture, () => {
  const { program: gated, withheld } = gateProgram(program, "shared");
  assert.ok(withheld > 0, "this capture has internal records");
  assert.equal(gated.evidence.length + withheld, program.evidence.length);
  for (const e of gated.evidence) assert.equal(e.visibility, "shared");

  const shown = new Set(gated.evidence.map((e) => e.id));
  // Nothing may dangle: no candidate, claim or relation may point at a
  // withheld record, and no conclusion may outlive its evidence.
  for (const c of gated.candidates)
    for (const id of c.evidenceIds) assert.ok(shown.has(id));
  for (const c of gated.claims)
    for (const id of c.evidenceIds) assert.ok(shown.has(id));
  for (const r of gated.relations)
    assert.ok(shown.has(r.from) && shown.has(r.to));

  // Withholding is reported, not silent.
  const a = answerQuestion(program, "Have we paid Eurofins?", "shared");
  assert.ok(a.withheld > 0);
  for (const c of a.records) assert.ok(shown.has(c.id));
});

test("internal view is never gated", noCapture, () => {
  const { program: same, withheld } = gateProgram(program, "internal");
  assert.equal(withheld, 0);
  assert.equal(same.evidence.length, program.evidence.length);
});

test("definition questions are answered with a definition, not a status row", noCapture, () => {
  const a = answerQuestion(program, "What is KISS1R?");
  assert.equal(a.strength, "direct");
  // A definitional question must not be answered from the reconciled state
  // table: "Approved scope" says which assays were ordered, not what the
  // target is, and presenting it as the answer was confidently irrelevant.
  assert.ok(!a.state, "definitions do not come from the status table");
  assert.ok(a.records.length > 0);
  // The quote must be a real substring of the record it is attributed to.
  const first = program.evidence.find((e) => e.id === a.records[0].id);
  assert.ok((first.fullText ?? first.text).includes(a.records[0].excerpt));
  assert.match(a.records[0].excerpt, /GPR54|Class A GPCR|UniProt/i);
});

test("a term used by every record is still searchable", noCapture, () => {
  // "kiss1r" appears in all twelve records. Filtering it out as
  // non-discriminating made the programme's own name return nothing.
  const a = answerQuestion(program, "KISS1R");
  assert.ok(a.records.length > 0, "the programme name must find records");
});
