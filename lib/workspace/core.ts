/** Public fixtures plus captured vault text. Scope checks here are domain checks, NOT authentication. */
import { capturedProgram } from "./captured/active.ts";
export type Workspace = {
  id: string;
  name: string;
  classification: "synthetic" | "empty" | "captured";
  description: string;
};
export type Scoped = { workspaceId: string; programId: string };
export type Candidate = Scoped & {
  id: string;
  name: string;
  question: string;
  /** One-line framing of the open question, shown above the atlas. */
  summary?: string;
  /** Verbatim from the candidate note, when it states one. */
  sequence?: string;
  evidenceIds: string[];
};
/**
 * Where a captured source came from. `sha256` is of the ORIGINAL bytes at
 * `capturedAt`; it identifies the captured bytes, not scientific truth. If the
 * file later changes the hash stops matching, which prompts review rather than
 * automatic promotion of the new content.
 */
export type SourceProvenance = {
  kind: "vault-markdown";
  path: string;
  sha256: string;
  capturedAt: string;
  bytes: number;
  excerpt: boolean;
};
/**
 * Who a record may be shown to.
 *
 * `internal` is the default and the safe one: a record is only ever shared
 * because the capture spec says so explicitly. Nothing infers shareability
 * from a note's content, and withholding is always SHOWN as a count rather
 * than silently filtered, so an outside view is never a lie by omission.
 */
export type Visibility = "internal" | "shared";
export type Audience = "internal" | "shared";
/** What kind of vault record this is. Taken from its folder, never inferred. */
export type RecordType = "decision" | "run" | "candidate" | "programme";
/**
 * One row of a programme's reconciled Current state. `state` and `basis` are
 * verbatim from the vault's canonical-state block. Nothing here is a claim the
 * workspace makes on its own; `confidence` only tints the row and never
 * replaces the recorded wording.
 */
export type StateRow = {
  item: string;
  state: string;
  basis: string;
  confidence: "recorded" | "unconfirmed" | "open" | "absent" | "unclassified";
};
export type CanonicalState = {
  scope: string;
  owner: string;
  reconciledOn: string;
  evidenceAsOf: string;
  verificationLevel: string;
  rows: StateRow[];
  nextActions: string;
  unresolved: string;
  sourcePath: string;
};
export type Evidence = Scoped & {
  id: string;
  /** `null` means the record belongs to the programme, not to one candidate. */
  candidateId: string | null;
  /** ISO date this record is dated to, when the vault states one. */
  recordDate?: string;
  recordType?: RecordType;
  /** Defaults to internal everywhere it is not explicitly set. */
  visibility?: Visibility;
  /** The note itself says part of it has been superseded. */
  supersessionNoted?: boolean;
  title: string;
  version: number;
  locator: string;
  text: string;
  /**
   * The whole source note as plain prose. `text` stays a short lead excerpt
   * for cards; this is what search runs over and what answers quote from, so
   * a question about anything deep in a note can still be answered in the
   * source's own words.
   */
  fullText?: string;
  origin: "synthetic" | "vault-capture";
  processing: "original";
  review: "unreviewed";
  provenance?: SourceProvenance;
};
export type Claim = Scoped & {
  id: string;
  candidateId: string;
  title: string;
  text: string;
  kind: "inference" | "gap";
  evidenceIds: string[];
  limitation: string;
  review: "proposed";
};
/**
 * A stated relationship between two captured records.
 *
 * `supersedes` relations are declared in the capture spec and the generator
 * refuses any it cannot corroborate in the captured text, so `statement` is
 * always a verbatim quote from the `from` record. `cites` relations are derived
 * from wikilinks, which are unambiguous: a link is a citation and its direction
 * is given. Neither kind asserts that the superseding record is correct, only
 * that the vault says one replaces the other.
 */
export type Relation = Scoped & {
  id: string;
  from: string;
  to: string;
  kind: "supersedes" | "partially-supersedes" | "cites";
  statement?: string;
  /** Present when the note limits what is superseded. */
  scope?: string;
};
export type Program = Scoped & {
  name: string;
  objective: string;
  standardsVersion: string;
  standards: string[];
  candidates: Candidate[];
  evidence: Evidence[];
  claims: Claim[];
  relations: Relation[];
  /**
   * Set on a cut built for sharing, where internal records were removed at
   * build time rather than hidden at runtime. Its absence means this is the
   * full internal record set.
   */
  audience?: Audience;
  /** Present when the programme note carries a canonical-state block. */
  currentState?: CanonicalState;
};
export const workspaces: readonly Workspace[] = [
  {
    id: "vivamed-demo",
    name: "VivaMed",
    classification: "synthetic",
    description: "Illustrative program · no client data",
  },
  {
    id: "peptai-test",
    name: "PeptAI",
    classification: capturedProgram ? "captured" : "empty",
    description: capturedProgram
      ? "Captured vault slice · unreviewed"
      : "No capture in this build",
  },
];
const scope = { workspaceId: "vivamed-demo", programId: "endotype-alpha" };
const demo: Program = {
  ...scope,
  name: "Endotype Alpha",
  objective:
    "Distinguish functional evidence from binding, preserve conflicting findings, and identify the next question to resolve.",
  standardsVersion: "synthetic-standards-v1",
  standards: [
    "Separate reported observation from inference.",
    "Preserve conflicting evidence and experimental conditions.",
    "Binding does not establish functional activity.",
    "Missing evidence is unknown, not a pass.",
    "Review knowledge updates explicitly; assessment acceptance alone promotes nothing.",
  ],
  candidates: [
    {
      ...scope,
      id: "candidate-a",
      name: "Candidate A",
      question:
        "Does the functional signal reproduce under comparable conditions?",
      summary: "Two conditions. One unresolved signal.",
      evidenceIds: ["E01", "E02"],
    },
    {
      ...scope,
      id: "candidate-b",
      name: "Candidate B",
      question: "Does binding produce the required functional response?",
      summary: "Binding evidence. An open functional question.",
      evidenceIds: ["E03"],
    },
  ],
  evidence: [
    {
      ...scope,
      id: "E01",
      candidateId: "candidate-a",
      title: "Functional assay summary",
      version: 1,
      locator: "Synthetic fixture / paragraph 1",
      text: "A functional response is reported in one model. Independent replication and selectivity data are absent.",
      origin: "synthetic",
      processing: "original",
      review: "unreviewed",
    },
    {
      ...scope,
      id: "E02",
      candidateId: "candidate-a",
      title: "Second-condition replication note",
      version: 1,
      locator: "Synthetic fixture / paragraph 1",
      text: "A second experimental condition did not reproduce the original signal. The difference in conditions is unresolved.",
      origin: "synthetic",
      processing: "original",
      review: "unreviewed",
    },
    {
      ...scope,
      id: "E03",
      candidateId: "candidate-b",
      title: "Binding assay summary",
      version: 1,
      locator: "Synthetic fixture / paragraph 1",
      text: "Binding is described; no functional assay is available. Binding alone does not establish functional activity.",
      origin: "synthetic",
      processing: "original",
      review: "unreviewed",
    },
  ],
  relations: [],
  claims: [
    {
      ...scope,
      id: "C01",
      candidateId: "candidate-a",
      title: "Unresolved conditions",
      text: "Functional evidence remains unresolved across two experimental conditions.",
      kind: "inference",
      evidenceIds: ["E01", "E02"],
      limitation:
        "Different conditions prevent treating this as definitive validation or refutation.",
      review: "proposed",
    },
    {
      ...scope,
      id: "C02",
      candidateId: "candidate-b",
      title: "Functional evidence gap",
      text: "This package does not establish functional activity for Candidate B.",
      kind: "gap",
      evidenceIds: ["E03"],
      limitation:
        "Missing from this package does not mean no such evidence exists elsewhere.",
      review: "proposed",
    },
  ],
};
export function workspaceById(id: string): Workspace {
  const workspace = workspaces.find((w) => w.id === id);
  if (!workspace) throw new Error("Unknown workspace.");
  return structuredClone(workspace);
}
export function programsFor(workspaceId: string): Program[] {
  workspaceById(workspaceId);
  if (workspaceId === scope.workspaceId) return [structuredClone(demo)];
  // A build can legitimately carry no capture: a shared repository ships
  // without one, because captured modules hold real vault prose.
  if (capturedProgram && workspaceId === capturedProgram.workspaceId)
    return [structuredClone(capturedProgram)];
  return [];
}
export function programById(workspaceId: string, programId: string): Program {
  const program = programsFor(workspaceId).find(
    (p) => p.programId === programId,
  );
  if (!program) throw new Error("Program is outside this workspace.");
  return program;
}
export function candidateById(
  workspaceId: string,
  programId: string,
  candidateId: string,
): Candidate {
  const candidate = programById(workspaceId, programId).candidates.find(
    (c) => c.id === candidateId,
  );
  if (!candidate) throw new Error("Candidate is outside this program.");
  return candidate;
}
export function evidenceById(
  workspaceId: string,
  programId: string,
  evidenceId: string,
): Evidence {
  const evidence = programById(workspaceId, programId).evidence.find(
    (e) => e.id === evidenceId,
  );
  if (!evidence) throw new Error("Evidence is outside this program.");
  return evidence;
}
export function buildContext(input: {
  workspaceId: string;
  programId: string;
  candidateId: string;
  question: string;
  evidenceIds: string[];
}) {
  const program = programById(input.workspaceId, input.programId);
  const candidate = candidateById(
    input.workspaceId,
    input.programId,
    input.candidateId,
  );
  const question = input.question.trim();
  if (!question || question.length > 2000)
    throw new Error("Enter a question of 1–2,000 characters.");
  const ids = [...new Set(input.evidenceIds)];
  if (!ids.length) throw new Error("Select at least one evidence record.");
  const evidence = ids.map((id) => {
    const record = evidenceById(input.workspaceId, input.programId, id);
    if (!candidate.evidenceIds.includes(id))
      throw new Error("Evidence is outside the selected candidate.");
    return record;
  });
  const omitted = candidate.evidenceIds.filter((id) => !ids.includes(id));
  return structuredClone({
    schemaVersion: 1,
    mode: "synthetic-context-preview",
    workspaceId: program.workspaceId,
    programId: program.programId,
    candidateId: candidate.id,
    question,
    selection: "User-selected candidate evidence; no automatic retrieval.",
    sources: evidence,
    standards: {
      version: program.standardsVersion,
      status: "demonstration-not-client-policy",
      rules: program.standards,
    },
    approvedKnowledge: [],
    limitations: [
      "No agent was run. No provider received this packet.",
      "No approved institutional knowledge is present.",
      "Prepared interpretations are excluded from approved knowledge.",
      "This preview is not a persisted run or authenticated team workspace.",
    ],
    omissions: omitted.map((id) => ({
      id,
      reason: "Not selected by the user; remains in the source record.",
    })),
    warnings: omitted.length
      ? [
          "Incomplete candidate context: omitted evidence may change the interpretation. Inspect all source records before drawing conclusions.",
        ]
      : [],
  });
}
export type Connection = {
  id: string;
  name: string;
  category: "Research" | "Protein" | "Small molecule" | "Context" | "Molecule";
  readiness: "Captured test" | "Local read-only" | "Requested" | "Deferred";
  purpose: string;
  gate: string;
};
export const connections: readonly Connection[] = [
  {
    id: "openscience",
    name: "OpenScience",
    category: "Research",
    readiness: "Captured test",
    purpose: "Research executor candidate",
    gate: "A local run was captured previously. Live workspace submission needs a durable, bounded worker.",
  },
  {
    id: "openresearch",
    name: "OpenResearch",
    category: "Research",
    readiness: "Captured test",
    purpose: "Computational experiment executor candidate",
    gate: "A local arithmetic fixture ran previously. Scientific execution and a secure hosted adapter remain unverified.",
  },
  {
    id: "bionemo",
    name: "NVIDIA BioNeMo",
    category: "Protein",
    readiness: "Requested",
    purpose: "Evaluate relevant protein-model workflows",
    gate: "Select the exact model/service; verify API, license, compute, outputs and data handling.",
  },
  {
    id: "subseq",
    name: "subseq.bio",
    category: "Protein",
    readiness: "Requested",
    purpose: "Evaluate a protein workflow",
    gate: "Verify selected program contract, cost and workspace authorization.",
  },
  {
    id: "bios",
    name: "BIOS",
    category: "Research",
    readiness: "Requested",
    purpose: "Evaluate scientific agent integration",
    gate: "Confirm the exact product and supported integration interface.",
  },
  {
    id: "litefold",
    name: "LiteFold",
    category: "Protein",
    readiness: "Requested",
    purpose: "Evaluate folding/design workflow fit",
    gate: "Confirm exact repository or service and supported task.",
  },
  {
    id: "rowan",
    name: "Rowan",
    category: "Small molecule",
    readiness: "Requested",
    purpose: "Evaluate small-molecule modeling workflows",
    gate: "Verify supported operations; no de novo design capability is assumed.",
  },
  {
    id: "paperclip",
    name: "Paperclip",
    category: "Research",
    readiness: "Requested",
    purpose: "Literature connector candidate",
    gate: "Authenticated retrieval, source locators and spending limits need verification.",
  },
  {
    id: "virtual-biotech",
    name: "Virtual Biotech",
    category: "Research",
    readiness: "Requested",
    purpose: "Evaluate specialist research and audit components",
    gate: "Audit components reviewed; runtime and provider compatibility have not been tested here.",
  },
  {
    id: "lobster",
    name: "Lobster / Omics-OS",
    category: "Research",
    readiness: "Requested",
    purpose: "Evaluate a task-specific omics adapter",
    gate: "Resolve licensing, scientific task fit and execution contract.",
  },
  {
    id: "mcp",
    name: "Chat & MCP access",
    category: "Context",
    readiness: "Local read-only",
    purpose: "Read-only MCP access to synthetic sources and explicitly exported notebook snapshots",
    gate: "Local stdio connector is built and tested. Client registration is separate; no ChatGPT account is connected. No provider execution, live private database access or write authority.",
  },
  {
    id: "qdrant",
    name: "Qdrant",
    category: "Context",
    readiness: "Deferred",
    purpose: "Optional derived retrieval index",
    gate: "Add only if representative retrieval evaluation justifies it; never the source of truth.",
  },
  {
    id: "hermes",
    name: "Hermes",
    category: "Research",
    readiness: "Deferred",
    purpose: "Optional team-agent harness",
    gate: "Setup remains deferred; no installation or integration performed.",
  },
  {
    id: "molecule-labs",
    name: "Molecule Labs",
    category: "Molecule",
    readiness: "Requested",
    purpose: "Scientific provenance and contribution attribution",
    gate: "Verify publication contract and disclosure permissions. No external provenance receipt exists here.",
  },
  {
    id: "treasury",
    name: "Molecule treasury",
    category: "Molecule",
    readiness: "Requested",
    purpose: "Permissioned budgets and payment approvals",
    gate: "Verify wallet/signing integration. No wallet connected, funds moved or signing rights granted.",
  },
];
export function executionEligibility(
  workspaceId: string,
  connectionId: string,
) {
  workspaceById(workspaceId);
  const connection = connections.find((c) => c.id === connectionId);
  if (!connection) throw new Error("Unknown connection.");
  return { allowed: false as const, reason: connection.gate };
}

/** Prepared qualitative fixture, not a calculated score or approved TPP. */
export function assessmentMatrix(workspaceId: string, programId: string) {
  programById(workspaceId, programId);
  return [
    {
      criterion: "Functional response",
      a: { label: "Unresolved signal", sources: ["E01", "E02"] },
      b: { label: "Not established", sources: ["E03"] },
    },
    {
      criterion: "Independent replication",
      a: { label: "Conditions differ", sources: ["E01", "E02"] },
      b: { label: "Not in package", sources: [] },
    },
    {
      criterion: "Selectivity",
      a: { label: "Missing", sources: ["E01"] },
      b: { label: "Not in package", sources: [] },
    },
    {
      criterion: "Binding",
      a: { label: "Not in package", sources: [] },
      b: { label: "Reported binding", sources: ["E03"] },
    },
  ];
}

export function briefMarkdown(packet: ReturnType<typeof buildContext>) {
  return [
    "# Scientific research brief",
    "",
    "SYNTHETIC DEMONSTRATION — not client evidence or an executed analysis.",
    "",
    `Workspace: ${packet.workspaceId} / ${packet.programId}`,
    `Candidate: ${packet.candidateId}`,
    "",
    "## Question",
    packet.question,
    "",
    "## Source records",
    ...packet.sources.flatMap((s) => [
      `### ${s.id} · ${s.title} · v${s.version}`,
      `Origin: ${s.origin}; review: ${s.review}; locator: ${s.locator}`,
      s.text,
      "",
    ]),
    "## Demonstration standards",
    `Version: ${packet.standards.version} — not approved client policy`,
    ...packet.standards.rules.map((r) => `- ${r}`),
    "",
    "## Limits and omissions",
    ...packet.limitations.map((l) => `- ${l}`),
    ...packet.warnings.map((w) => `- ${w}`),
    ...packet.omissions.map((o) => `- ${o.id}: ${o.reason}`),
    "",
    "No approved institutional claims are included. No provider has received this brief. Export is not approval or execution.",
    "",
  ].join("\n");
}
