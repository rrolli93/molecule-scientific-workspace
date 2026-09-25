import { openResearchFixture } from "./openresearch-fixture.ts";
import {
  challengePackage,
  approvedChallengeClaims,
  type ChallengeRecord,
} from "./challenge-package.ts";
import {
  approvedResearchClaims,
  proposals,
  question,
  recipe,
  type ResearchRun,
  type SourceReceipt,
} from "./research-demo.ts";
export { openResearchFixture };
export type ExternalRecord = {
  id: string;
  envelope: typeof openResearchFixture;
  status: "proposed" | "accepted" | "rejected";
  importedBy: string;
  importedAt: string;
  decision?: Decision;
};
export const program = {
  id: "PRG-DEMO-01",
  name: "Endotype Alpha",
  classification: "synthetic",
};
export const sources = [
  {
    id: "E01",
    version: "1",
    locator: "Synthetic fixture / paragraph 1",
    title: "Candidate A · assay summary",
    text: "A functional response is reported in one model. Independent replication and selectivity data are absent.",
  },
  {
    id: "E02",
    version: "1",
    locator: "Synthetic fixture / paragraph 1",
    title: "Candidate A · replication note",
    text: "A second experimental condition did not reproduce the original signal. The difference in conditions is unresolved.",
  },
  {
    id: "E03",
    version: "1",
    locator: "Synthetic fixture / paragraph 1",
    title: "Candidate B · binding summary",
    text: "Binding is described; no functional assay is available. Binding alone does not establish functional activity.",
  },
];
export const standards = {
  id: "synthetic-standards-v1",
  status: "Demonstration baseline — not approved VivaMed policy",
  rules: [
    "Separate observation from inference.",
    "Preserve contradictory evidence and experimental conditions.",
    "Binding does not establish function.",
    "Review each knowledge update explicitly.",
  ],
};
export const procedure = {
  id: "fixture-assessment-v1",
  steps: [
    "Read E01–E03.",
    "Identify conflicts and missing functional evidence.",
    "Propose evidence-linked updates.",
    "Pause for human review.",
  ],
};
const findings = [
  {
    key: "candidate-a-conflict-v1",
    kind: "inference",
    text: "Candidate A has unresolved functional evidence: the reported signal and non-reproduction under a second condition must both remain visible.",
    evidence: ["E01", "E02"],
    limitation:
      "Conditions differ; this is not a definitive refutation or validation.",
  },
  {
    key: "candidate-b-gap-v1",
    kind: "gap",
    text: "Candidate B has binding evidence but no demonstrated functional activity in this evidence package.",
    evidence: ["E03"],
    limitation:
      "Absence in this package is not proof that no functional evidence exists elsewhere.",
  },
];
export type Decision = {
  outcome: "accepted" | "changes_requested" | "approved" | "rejected";
  rationale: string;
  actor: string;
  at: string;
  simulatedRole: "reviewer";
};
export type Claim = (typeof findings)[number] & {
  id: string;
  runId: string;
  status: "proposed" | "approved" | "rejected";
  decision?: Decision;
};
export type Run = {
  id: string;
  createdAt: string;
  actor: string;
  question: string;
  state: "awaiting_review" | "accepted" | "changes_requested";
  context: {
    program: typeof program;
    sources: typeof sources;
    standards: typeof standards;
    procedure: typeof procedure;
    approvedKnowledge: Claim[];
    previousOutcomes: { id: string; state: string; rationale: string }[];
    omissions: string[];
  };
  findings: typeof findings;
  updates: Claim[];
  decision?: Decision;
};
export type MemoryState = {
  challengeRecords?: ChallengeRecord[];
  researchRuns?: ResearchRun[];
  externalEvidence?: ExternalRecord[];
  schema: 1;
  runs: Run[];
  knowledge: Claim[];
  events: {
    id: string;
    action: string;
    actor: string;
    at: string;
    runId: string;
    rationale?: string;
  }[];
  receipts: { id: string; fingerprint: string }[];
};
export type Command = {
  id: string;
  revision: number;
  action:
    | "start"
    | "review"
    | "knowledge"
    | "import_external"
    | "review_external"
    | "research_start"
    | "research_review"
    | "challenge_import"
    | "challenge_review";
  role: "scientist" | "reviewer";
  runId?: string;
  updateId?: string;
  outcome?: string;
  rationale?: string;
};
export class DomainError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function emptyState(): MemoryState {
  return { schema: 1, runs: [], knowledge: [], events: [], receipts: [] };
}
export function parseCommand(input: unknown): Command {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new DomainError("Invalid command.");
  const c = input as Record<string, unknown>;
  if (typeof c.id !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(c.id))
    throw new DomainError("A valid request ID is required.");
  if (!Number.isSafeInteger(c.revision) || (c.revision as number) < 0)
    throw new DomainError("A revision is required.");
  if (
    ![
      "start",
      "review",
      "knowledge",
      "import_external",
      "review_external",
      "research_start",
      "research_review",
      "challenge_import",
      "challenge_review",
    ].includes(String(c.action)) ||
    !["scientist", "reviewer"].includes(String(c.role))
  )
    throw new DomainError("Invalid action or simulation role.");
  for (const key of ["runId", "updateId", "outcome", "rationale"]) {
    if (
      c[key] !== undefined &&
      (typeof c[key] !== "string" ||
        (c[key] as string).length > (key === "rationale" ? 2000 : 100))
    )
      throw new DomainError("Invalid " + key + ".");
  }
  return {
    id: c.id,
    revision: c.revision as number,
    action: c.action as Command["action"],
    role: c.role as Command["role"],
    runId: c.runId as string | undefined,
    updateId: c.updateId as string | undefined,
    outcome: c.outcome as string | undefined,
    rationale: c.rationale as string | undefined,
  };
}
export function fingerprint(c: Command) {
  return JSON.stringify([
    c.action,
    c.role,
    c.runId ?? null,
    c.updateId ?? null,
    c.outcome ?? null,
    c.rationale ?? null,
  ]);
}
export function replay(state: MemoryState, c: Command) {
  const receipt = state.receipts.find((r) => r.id === c.id);
  if (!receipt) return false;
  if (receipt.fingerprint !== fingerprint(c))
    throw new DomainError(
      "Request ID was already used for a different action.",
      409,
    );
  return true;
}
export function transition(
  current: MemoryState,
  c: Command,
  actor: string,
  at: string,
  retrieved?: SourceReceipt[],
): MemoryState {
  if (replay(current, c)) return current;
  const state = structuredClone(current);
  let runId = c.runId ?? c.id;
  if (c.action === "challenge_import") {
    if (c.role !== "scientist")
      throw new DomainError("Switch to Demo scientist.", 403);
    const records = (state.challengeRecords ??= []);
    if (records.some((r) => r.id === challengePackage.id))
      throw new DomainError("This package was already imported.", 409);
    runId = challengePackage.id;
    records.push({
      id: runId,
      importedBy: actor,
      importedAt: at,
      claims: challengePackage.proposals.map((p) => ({
        ...structuredClone(p),
        status: "proposed",
      })),
    });
  } else if (c.action === "challenge_review") {
    if (c.role !== "reviewer")
      throw new DomainError("Switch to Demo reviewer.", 403);
    if (!c.rationale?.trim())
      throw new DomainError("A written rationale is required.");
    if (!["approved", "rejected"].includes(c.outcome ?? ""))
      throw new DomainError("Invalid challenge decision.");
    const claim = state.challengeRecords
      ?.find((r) => r.id === c.runId)
      ?.claims.find((p) => p.key === c.updateId);
    if (!claim) throw new DomainError("Challenge claim not found.", 404);
    if (claim.status !== "proposed")
      throw new DomainError("This claim already has a decision.", 409);
    claim.status = c.outcome as "approved" | "rejected";
    claim.decision = { actor, at, rationale: c.rationale.trim() };
  } else if (c.action === "research_start") {
    if (c.role !== "scientist")
      throw new DomainError("Switch to Demo scientist.", 403);
    const runs = (state.researchRuns ??= []);
    if (runs.length >= 20)
      throw new DomainError("Public demo is limited to 20 runs.", 409);
    if (runs.some((r) => r.claims.some((p) => p.status === "proposed")))
      throw new DomainError(
        "Review each open public-evidence claim before rerunning.",
        409,
      );
    if (!retrieved || retrieved.length !== 3)
      throw new DomainError("Server retrieval is required.");
    const ready = retrieved.every((s) => s.status === "verified");
    runs.push({
      id: c.id,
      actor,
      createdAt: at,
      completedAt: new Date().toISOString(),
      question,
      recipe,
      status: ready ? "ready_for_review" : "retrieval_incomplete",
      sources: structuredClone(retrieved),
      claims: ready
        ? proposals.map((p) => ({ ...structuredClone(p), status: "proposed" }))
        : [],
      context: {
        approvedClaims: approvedResearchClaims(runs),
        approvedChallengeClaims: approvedChallengeClaims(
          state.challengeRecords,
        ),
        priorRunIds: runs.map((r) => r.id),
      },
    });
  } else if (c.action === "research_review") {
    if (c.role !== "reviewer")
      throw new DomainError("Switch to Demo reviewer.", 403);
    if (!c.rationale?.trim())
      throw new DomainError("A written rationale is required.");
    if (!["approved", "rejected"].includes(c.outcome ?? ""))
      throw new DomainError("Invalid research decision.");
    const run = state.researchRuns?.find((r) => r.id === c.runId);
    const claim = run?.claims.find((p) => p.key === c.updateId);
    if (!claim) throw new DomainError("Public-evidence claim not found.", 404);
    if (claim.status !== "proposed")
      throw new DomainError("This claim already has a decision.", 409);
    claim.status = c.outcome as "approved" | "rejected";
    claim.decision = { actor, at, rationale: c.rationale.trim() };
  } else if (c.action === "import_external") {
    if (c.role !== "scientist")
      throw new DomainError("Switch to Demo scientist to import.", 403);
    const records = (state.externalEvidence ??= []);
    const externalId = openResearchFixture.provenance.runId;
    if (records.some((r) => r.id === externalId))
      throw new DomainError("This external run was already imported.", 409);
    runId = externalId;
    records.push({
      id: externalId,
      envelope: structuredClone(openResearchFixture),
      status: "proposed",
      importedBy: actor,
      importedAt: at,
    });
  } else if (c.action === "review_external") {
    if (c.role !== "reviewer")
      throw new DomainError("Switch to Demo reviewer.", 403);
    const record = state.externalEvidence?.find((r) => r.id === c.runId);
    if (!record) throw new DomainError("External record not found.", 404);
    if (record.status !== "proposed")
      throw new DomainError("This record already has a decision.", 409);
    if (!["accepted", "rejected"].includes(c.outcome ?? ""))
      throw new DomainError("Invalid integration decision.");
    const rationale = c.rationale?.trim();
    if (!rationale) throw new DomainError("A written rationale is required.");
    record.status = c.outcome as ExternalRecord["status"];
    record.decision = {
      outcome: c.outcome as Decision["outcome"],
      rationale,
      actor,
      at,
      simulatedRole: "reviewer",
    };
    // Integration acceptance never adds claims or changes assessment context.
  } else if (c.action === "start") {
    if (c.role !== "scientist")
      throw new DomainError("Switch to Demo scientist to prepare a run.", 403);
    if (state.runs.some((r) => r.state === "awaiting_review"))
      throw new DomainError(
        "Review the open assessment before starting another.",
        409,
      );
    if (state.runs.length >= 100)
      throw new DomainError(
        "This pilot is limited to 100 saved runs. Existing records remain available.",
        409,
      );
    runId = c.id;
    const run: Run = {
      id: runId,
      createdAt: at,
      actor,
      question:
        "What does this evidence package establish about candidates A and B?",
      state: "awaiting_review",
      context: {
        program,
        sources,
        standards,
        procedure,
        approvedKnowledge: structuredClone(state.knowledge),
        previousOutcomes: state.runs.slice(-3).map((r) => ({
          id: r.id,
          state: r.state,
          rationale: r.decision?.rationale ?? "",
        })),
        omissions: [
          "No external literature or confidential material.",
          "Rejected and unreviewed proposals excluded from approved knowledge.",
          "At most three previous run outcomes; full history remains available.",
        ],
      },
      findings: structuredClone(findings),
      updates: findings
        .filter((f) => !state.knowledge.some((k) => k.key === f.key))
        .map((f, i) => ({
          ...structuredClone(f),
          id: runId + "-update-" + (i + 1),
          runId,
          status: "proposed",
        })),
    };
    state.runs.push(run);
  } else {
    if (c.role !== "reviewer")
      throw new DomainError(
        "Switch to Demo reviewer. This is a simulated role, not a second identity.",
        403,
      );
    const rationale = c.rationale?.trim();
    if (!rationale) throw new DomainError("A written rationale is required.");
    const run = state.runs.find((r) => r.id === c.runId);
    if (!run) throw new DomainError("Run not found.", 404);
    if (c.action === "review") {
      if (run.state !== "awaiting_review")
        throw new DomainError("This assessment already has a decision.", 409);
      if (!["accepted", "changes_requested"].includes(c.outcome ?? ""))
        throw new DomainError("Invalid assessment decision.");
      run.state = c.outcome as Run["state"];
      run.decision = {
        outcome: c.outcome as Decision["outcome"],
        rationale,
        actor,
        at,
        simulatedRole: "reviewer",
      };
    } else {
      if (run.state !== "accepted")
        throw new DomainError(
          "Accept the assessment before reviewing its knowledge updates.",
          409,
        );
      const update = run.updates.find((u) => u.id === c.updateId);
      if (!update) throw new DomainError("Knowledge update not found.", 404);
      if (update.status !== "proposed")
        throw new DomainError("This update already has a decision.", 409);
      if (!["approved", "rejected"].includes(c.outcome ?? ""))
        throw new DomainError("Invalid knowledge decision.");
      update.status = c.outcome as Claim["status"];
      update.decision = {
        outcome: c.outcome as Decision["outcome"],
        rationale,
        actor,
        at,
        simulatedRole: "reviewer",
      };
      if (update.status === "approved") {
        if (state.knowledge.some((k) => k.key === update.key))
          throw new DomainError(
            "Equivalent knowledge was already approved. Reload and review again.",
            409,
          );
        state.knowledge.push(structuredClone(update));
      }
    }
  }
  state.events.push({
    id: c.id,
    action:
      c.action === "start"
        ? "Synthetic assessment prepared"
        : c.action === "research_start"
          ? "research_start: public source retrieval"
          : c.action === "import_external"
            ? "import_external: captured synthetic result"
            : c.action + ": " + c.outcome,
    actor,
    at,
    runId,
    rationale: c.rationale?.trim(),
  });
  state.receipts.push({ id: c.id, fingerprint: fingerprint(c) });
  return state;
}
