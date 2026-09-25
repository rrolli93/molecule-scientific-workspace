import type { Program } from "./core.ts";

export type AtlasNode = {
  id: string;
  recordId: string;
  kind: "candidate" | "source" | "interpretation";
  candidateId: string;
  title: string;
  text: string;
  status: string;
  sourceIds: string[];
  version?: number;
  limitation?: string;
  /** Short badge, e.g. that the note records part of itself as superseded. */
  flag?: string;
  x: number;
  y: number;
};
export type AtlasEdge = {
  id: string;
  from: string;
  to: string;
  relation:
    | "contains source"
    | "cited by"
    | "supersedes"
    | "partially supersedes"
    | "cites";
  /** Verbatim statement and scope, for supersession edges. */
  statement?: string;
  scope?: string;
};

/** A schematic of explicit record membership/citations, not an inferred knowledge graph. */
/** Programme-level records belong to no candidate; this id keeps them out of
 *  candidate filters while still appearing in the whole-programme view. */
export const PROGRAMME_LANE = "__program__";

function sourceStatus(source: Program["evidence"][number]): string {
  if (source.origin !== "vault-capture") return `Synthetic · ${source.review}`;
  // Date and kind first: the programme lane reads as a timeline.
  const lead = [source.recordDate ?? "undated", source.recordType]
    .filter(Boolean)
    .join(" · ");
  return `${lead} · ${source.review}`;
}

export function buildEvidenceAtlas(program: Program): {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
} {
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const programmeSources = program.evidence.filter((e) => !e.candidateId);
  // Programme records stack downward from the top of the canvas. Centring them
  // on a lane pushes the first card above y=0 as soon as there are more than a
  // few, which clips it out of the panel.
  const ROW = 150;
  const TOP = 120;
  const programmeSpan = programmeSources.length
    ? TOP + (programmeSources.length - 1) * ROW
    : 0;
  if (programmeSources.length) {
    nodes.push({
      id: `candidate:${PROGRAMME_LANE}`,
      recordId: PROGRAMME_LANE,
      kind: "candidate",
      candidateId: PROGRAMME_LANE,
      title: "Programme record",
      text: program.objective,
      status: "Applies to every candidate",
      sourceIds: programmeSources.map((s) => s.id),
      x: 145,
      y: (TOP + programmeSpan) / 2,
    });
    programmeSources.forEach((source, i) => {
      const id = `source:${source.id}`;
      nodes.push({
        id,
        recordId: source.id,
        kind: "source",
        candidateId: PROGRAMME_LANE,
        title: source.title,
        text: source.text,
        status: sourceStatus(source),
        version: source.version,
        flag: source.supersessionNoted ? "supersession noted" : undefined,
        sourceIds: [source.id],
        x: 485,
        y: TOP + i * ROW,
      });
      edges.push({
        id: `${PROGRAMME_LANE}:${source.id}`,
        from: `candidate:${PROGRAMME_LANE}`,
        to: id,
        relation: "contains source",
      });
    });
  }
  const laneBase = programmeSources.length ? programmeSpan + 260 : 170;
  program.candidates.forEach((candidate, index) => {
    const lane = laneBase + index * 260;
    nodes.push({
      id: `candidate:${candidate.id}`,
      recordId: candidate.id,
      kind: "candidate",
      candidateId: candidate.id,
      title: candidate.name,
      text: candidate.question,
      status: "Research question",
      sourceIds: [...candidate.evidenceIds],
      x: 145,
      y: lane,
    });
    const sources = program.evidence.filter(
      (e) =>
        candidate.evidenceIds.includes(e.id) && e.candidateId === candidate.id,
    );
    sources.forEach((source, sourceIndex) => {
      const id = `source:${source.id}`;
      nodes.push({
        id,
        recordId: source.id,
        kind: "source",
        candidateId: candidate.id,
        title: source.title,
        text: source.text,
        status: sourceStatus(source),
        version: source.version,
        flag: source.supersessionNoted ? "supersession noted" : undefined,
        sourceIds: [source.id],
        x: 485,
        y: lane + (sourceIndex - (sources.length - 1) / 2) * 130,
      });
      edges.push({
        id: `${candidate.id}:${source.id}`,
        from: `candidate:${candidate.id}`,
        to: id,
        relation: "contains source",
      });
    });
    const claims = program.claims.filter((c) => c.candidateId === candidate.id);
    claims.forEach((claim, claimIndex) => {
      const id = `interpretation:${claim.id}`;
      nodes.push({
        id,
        recordId: claim.id,
        kind: "interpretation",
        candidateId: candidate.id,
        title: claim.title,
        text: claim.text,
        status: `${claim.kind} · proposed`,
        sourceIds: [...claim.evidenceIds],
        limitation: claim.limitation,
        x: 825,
        y: lane + (claimIndex - (claims.length - 1) / 2) * 130,
      });
      claim.evidenceIds.forEach((sourceId) => {
        if (!sources.some((s) => s.id === sourceId))
          throw new Error("Atlas citation is outside candidate scope.");
        edges.push({
          id: `${sourceId}:${claim.id}`,
          from: `source:${sourceId}`,
          to: id,
          relation: "cited by",
        });
      });
    });
  });
  // Stated relationships between source records. Supersession is sparse and
  // load-bearing so it is always drawn; citations are near-complete across a
  // programme (42 edges over 12 notes here), so the component reveals those
  // only for the selected record rather than drawing a hairball.
  const sourceNodes = new Set(
    nodes.filter((n) => n.kind === "source").map((n) => n.recordId),
  );
  for (const relation of program.relations) {
    if (!sourceNodes.has(relation.from) || !sourceNodes.has(relation.to))
      continue;
    edges.push({
      id: `${relation.id}:${relation.from}:${relation.to}`,
      from: `source:${relation.from}`,
      to: `source:${relation.to}`,
      relation:
        relation.kind === "partially-supersedes"
          ? "partially supersedes"
          : relation.kind,
      statement: relation.statement,
      scope: relation.scope,
    });
  }
  return { nodes, edges };
}
