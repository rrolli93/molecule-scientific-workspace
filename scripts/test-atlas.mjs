import { test } from "node:test";
import assert from "node:assert/strict";
import { programById } from "../lib/workspace/core.ts";
import { buildEvidenceAtlas } from "../lib/workspace/atlas.ts";

test("atlas derives seven records and six explicit membership/citation links", () => {
  const graph = buildEvidenceAtlas(
    programById("vivamed-demo", "endotype-alpha"),
  );
  assert.equal(graph.nodes.length, 7);
  assert.equal(graph.edges.length, 6);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, 7);
  for (const edge of graph.edges) {
    assert(graph.nodes.some((n) => n.id === edge.from));
    assert(graph.nodes.some((n) => n.id === edge.to));
    assert(["contains source", "cited by"].includes(edge.relation));
  }
});
test("interpretation links retain both unresolved sources and never imply approval", () => {
  const graph = buildEvidenceAtlas(
    programById("vivamed-demo", "endotype-alpha"),
  );
  const unresolved = graph.nodes.find((n) => n.recordId === "C01");
  assert.equal(unresolved.kind, "interpretation");
  assert.equal(unresolved.status, "inference · proposed");
  assert.deepEqual(unresolved.sourceIds, ["E01", "E02"]);
  assert.match(unresolved.limitation, /definitive/);
  assert.match(
    graph.nodes.find((n) => n.recordId === "E02").text,
    /did not reproduce/,
  );
  assert.equal(
    graph.nodes.find((n) => n.recordId === "C02").status,
    "gap · proposed",
  );
  assert(
    graph.nodes
      .filter((n) => n.kind === "source")
      .every((n) => n.status.includes("Synthetic · unreviewed")),
  );
});
test("atlas records are detached from source data and no causal/scoring values are added", () => {
  const program = programById("vivamed-demo", "endotype-alpha");
  const snapshot = JSON.stringify(program);
  const graph = buildEvidenceAtlas(program);
  graph.nodes[0].sourceIds.push("fake");
  assert.equal(JSON.stringify(program), snapshot);
  for (const n of graph.nodes) {
    assert(!("score" in n));
    assert(!("confidence" in n));
    assert(!("potency" in n));
  }
});
test("cross-candidate interpretation references fail instead of drawing a misleading edge", () => {
  const program = programById("vivamed-demo", "endotype-alpha");
  program.claims[0].evidenceIds.push("E03");
  assert.throws(() => buildEvidenceAtlas(program), /outside candidate/);
});
