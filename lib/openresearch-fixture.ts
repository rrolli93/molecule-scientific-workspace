// Captured from the isolated real OpenResearch run; no live connection.
export const openResearchFixture = {
  schema: "vivamed.proposed-external-evidence.v1",
  classification: "synthetic",
  reviewStatus: "proposed",
  approvedKnowledge: false,
  title: "OpenResearch deterministic arithmetic integration check",
  provenance: {
    tool: "OpenResearch",
    version: "0.2.4",
    projectId: "29d1da72-b2f2-48dc-b78e-fb58d9d79d01",
    experimentId: "d12fb381-13d2-47e6-b598-7e6ff7fccf89",
    runId: "cfd17cb5-bc99-45d4-a464-34a1fc9bc7b4",
    status: "done",
    commitSha: "56ea4003fcaf07c6788202151006106d54be8914",
    sourceDigest:
      "07e68731dcc5a316a19aa0c3dc2c23f9a1d1e099c9bb2c4e78633addae41a384",
    logSha256:
      "f91efadb6bbf2fbf6be9fe30654e80abaf2067508ef307a8f5c587a14bb64b4d",
    resultTransport: "GET /api/runs/{id}/log; VIVAMED_RESULT_JSON marker",
  },
  result: {
    classification: "synthetic",
    expected_mean: 0.2,
    experiment: "deterministic-mean-check",
    input: [0.1, 0.2, 0.3],
    limitations:
      "Synthetic arithmetic fixture; no candidate or biological conclusion.",
    mean: 0.2,
    passed: true,
    sample_count: 3,
    schema: "vivamed.synthetic-result.v1",
  },
  limitations:
    "Integration fixture only. Not scientific evidence. Not imported into the hosted workspace. Hashes establish byte identity, not independent authenticity.",
} as const;
