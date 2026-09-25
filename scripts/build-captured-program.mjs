#!/usr/bin/env node
/**
 * Turn a vault intake manifest into a captured Program module.
 *
 * Input  : a manifest produced by integrations/vault/preview.mjs
 * Output : lib/workspace/captured/<id>.ts, a generated TypeScript module
 *
 * This writes NOTHING to the vault and reads no file the manifest did not
 * already capture. It performs no network call, no model call and no database
 * write. Every emitted record keeps origin "vault-capture", review
 * "unreviewed" and claim review "proposed"; nothing here can mark a source
 * measured or approved. Assignment of a source to a candidate or to the
 * programme lane comes from an explicit map below, never from inference over
 * the text.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Excerpt budget per record. The full bytes and hash stay in provenance. */
const EXCERPT_CHARS = 700;

function arg(name, required = true) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    if (required) throw new Error(`Missing --${name}`);
    return undefined;
  }
  return process.argv[i + 1];
}

/**
 * First substantive prose of a note: skips the H1, frontmatter, blockquote
 * banners and table rows, then stops on a budget. Marked as an excerpt in
 * provenance so the UI never implies it is the whole record.
 */
function excerpt(text) {
  const body = text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .split(/\r?\n/)
    .filter((l) => {
      const t = l.trim();
      if (!t) return false;
      if (t.startsWith("#")) return false;
      if (t.startsWith("|") || /^[-:|\s]+$/.test(t)) return false;
      if (t.startsWith("![") || t.startsWith("<!--")) return false;
      return true;
    })
    .join(" ")
    // Strip Markdown emphasis, links and wikilinks: the excerpt is displayed
    // as prose, and raw ** and [[ ]] syntax reads as noise.
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, alt) => alt || t.replace(/^.*\//, ""))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(?<![A-Za-z0-9])[*_](?=\S)(.+?)(?<=\S)[*_](?![A-Za-z0-9])/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (body.length <= EXCERPT_CHARS) return { text: body, truncated: false };
  const cut = body.slice(0, EXCERPT_CHARS);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return {
    text: (stop > EXCERPT_CHARS * 0.5 ? cut.slice(0, stop + 1) : cut).trim(),
    truncated: true,
  };
}

/** Record type from the note's folder. Never guessed from its text. */
function recordType(path) {
  const top = path.split("/")[0];
  if (top === "decisions") return "decision";
  if (top === "runs") return "run";
  if (top === "candidates") return "candidate";
  if (top === "programs") return "programme";
  return undefined;
}

/**
 * The date a record is dated to: the date in its filename, else a date the
 * note states for itself (Reconciled on / Last updated). Never the file
 * mtime, which the canonical-state guide explicitly rejects as authority.
 */
function recordDate(path, text) {
  const fromName = path.match(/(20\d\d-\d\d-\d\d)/);
  if (fromName) return fromName[1];
  const stated = text.match(
    /\*\*(?:Reconciled on|Last updated|Updated|Date)[^*]*\*\*[:\s]*\(?(20\d\d-\d\d-\d\d)/i,
  );
  return stated ? stated[1] : undefined;
}

/**
 * Parse the vault's machine-delimited canonical-state block. Values are kept
 * verbatim. `confidence` is presentational only: it tints a row and never
 * replaces or summarises the recorded wording, and anything whose phrasing is
 * not an exact match stays "unclassified" rather than being guessed at.
 */
function canonicalState(doc) {
  const block = doc.content.match(
    /<!--\s*canonical-state:start\s*-->([\s\S]*?)<!--\s*canonical-state:end\s*-->/,
  );
  if (!block) return undefined;
  const body = block[1];
  const field = (label) => {
    const m = body.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\n]+)`));
    return m ? m[1].trim() : "";
  };
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    const cells = line.trim();
    if (!cells.startsWith("|") || /^\|[-:\s|]+\|$/.test(cells)) continue;
    const parts = cells.split("|").slice(1, -1).map((c) => c.trim());
    if (parts.length !== 3) continue;
    if (/^item$/i.test(parts[0])) continue;
    rows.push({
      item: parts[0],
      state: parts[1],
      basis: parts[2],
      confidence: classify(parts[1]),
    });
  }
  return rows.length
    ? {
        scope: field("Scope"),
        owner: field("Owner"),
        reconciledOn: field("Reconciled on"),
        evidenceAsOf: field("Evidence as of"),
        verificationLevel: field("Verification level"),
        rows,
        nextActions: field("Next actions \\(existing execution follow-ups\\)"),
        unresolved: field("Unresolved"),
        sourcePath: doc.path,
      }
    : undefined;
}

/** Presentational tint only. Unmatched wording stays unclassified. */
function classify(state) {
  const t = state.toLowerCase();
  if (/\bnot (confirmed|established)\b/.test(t)) return "unconfirmed";
  if (/\bno .*(result|data)\b|\bnone\b/.test(t)) return "absent";
  if (/\bopen\b/.test(t)) return "open";
  if (/\bpaid\b|\bsent\b|\bsigned\b|\backnowledged\b/.test(t))
    return "recorded";
  return "unclassified";
}

const linkBase = (t) => t.split("#")[0].split("|")[0].trim().replace(/^.*\//, "").replace(/\.md$/, "");

/**
 * Citation edges, derived from wikilinks that resolve inside the capture.
 * A wikilink is unambiguous: it is a citation and its direction is given by
 * which note contains it. Links leaving the capture are ignored rather than
 * guessed at.
 */
function citationRelations(manifest, idByPath) {
  const byBase = new Map(
    manifest.documents.map((d) => [linkBase(d.path), d.path]),
  );
  const out = [];
  for (const doc of manifest.documents) {
    const seen = new Set();
    for (const raw of doc.wikilinks) {
      const target = typeof raw === "string" ? raw : (raw.target ?? raw.value ?? "");
      const hit = byBase.get(linkBase(String(target)));
      if (!hit || hit === doc.path || seen.has(hit)) continue;
      seen.add(hit);
      out.push({ from: idByPath.get(doc.path), to: idByPath.get(hit), kind: "cites" });
    }
  }
  return out;
}

/**
 * Supersession edges. These are DECLARED in the spec, never parsed out of
 * prose, because natural-language supersession is directional and getting the
 * direction backwards would invert a fact. The generator's job is to refuse
 * any declaration it cannot corroborate: the `from` note must contain the
 * quoted statement verbatim, and that statement must mention supersession.
 */
function supersessionRelations(spec, byPath, idByPath) {
  return (spec.supersedes ?? []).map((rel, i) => {
    const doc = byPath.get(rel.from);
    if (!doc) throw new Error(`Supersession names an uncaptured note: ${rel.from}`);
    if (!idByPath.get(rel.to))
      throw new Error(`Supersession targets an uncaptured note: ${rel.to}`);
    const flat = doc.content.replace(/\s+/g, " ");
    if (!flat.includes(rel.statement.replace(/\s+/g, " ")))
      throw new Error(
        `Supersession statement not found verbatim in ${rel.from}:\n  ${rel.statement}`,
      );
    if (!/supersed/i.test(rel.statement))
      throw new Error(`Supersession statement does not state supersession: ${rel.statement}`);
    return {
      id: `R${String(i + 1).padStart(2, "0")}`,
      from: idByPath.get(rel.from),
      to: idByPath.get(rel.to),
      kind: rel.partial ? "partially-supersedes" : "supersedes",
      statement: rel.statement,
      scope: rel.scope,
    };
  });
}

/**
 * The whole note as plain prose, for searching and for quoting back.
 *
 * A token bag was not enough: it could tell you a record mentions a word but
 * never show you the sentence, so "what is KISS1R" found records it could not
 * quote from. Answers are supposed to be the source's own words, which means
 * keeping the words.
 */
function fullText(text) {
  return text
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, alt) => alt || t.replace(/^.*\//, ""))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[>\s]*[-*+]\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * The peptide sequence a candidate note states for itself. The most
 * characteristic artifact in this programme's world, and the one string that
 * identifies a candidate at a glance, so the page shows it rather than
 * hiding it inside a record.
 */
function statedSequence(text) {
  const m = text.match(/\*\*Full sequence:\*\*\s*([^\n]+)/i);
  return m ? m[1].trim() : undefined;
}

const manifest = JSON.parse(readFileSync(arg("manifest"), "utf8"));
if (manifest.operation !== "vault-intake-preview")
  throw new Error("Not a vault intake manifest.");
if (manifest.imported !== false || manifest.graphCreated !== false)
  throw new Error("Manifest claims an import already happened; refusing.");

const spec = JSON.parse(readFileSync(arg("spec"), "utf8"));
const capturedAt = manifest.generatedAt;
const byPath = new Map(manifest.documents.map((d) => [d.path, d]));

const assigned = new Set();
const evidence = [];
let n = 0;
for (const [candidateId, paths] of Object.entries(spec.assign)) {
  for (const path of paths) {
    const doc = byPath.get(path);
    if (!doc) throw new Error(`Spec names a path absent from manifest: ${path}`);
    if (assigned.has(path)) throw new Error(`Path assigned twice: ${path}`);
    assigned.add(path);
    const { text, truncated } = excerpt(doc.content);
    evidence.push({
      workspaceId: spec.workspaceId,
      programId: spec.programId,
      id: `E${String(++n).padStart(2, "0")}`,
      candidateId: candidateId === "__program__" ? null : candidateId,
      title: doc.title,
      version: 1,
      locator: `${doc.path} · captured ${capturedAt.slice(0, 10)}`,
      text,
      fullText: fullText(doc.content),
      origin: "vault-capture",
      processing: "original",
      review: "unreviewed",
      // Internal unless the spec names this path as shareable. Default-deny:
      // a new capture is never externally visible by accident.
      visibility: (spec.shared ?? []).includes(doc.path) ? "shared" : "internal",
      recordDate: recordDate(doc.path, doc.content),
      recordType: recordType(doc.path),
      supersessionNoted: /supersed/i.test(doc.content),
      provenance: {
        kind: "vault-markdown",
        path: doc.path,
        sha256: doc.sha256,
        capturedAt,
        bytes: doc.bytes,
        excerpt: truncated,
      },
    });
  }
}
for (const p of spec.shared ?? [])
  if (!byPath.has(p))
    throw new Error(`Spec shares a path absent from the manifest: ${p}`);
const missed = manifest.documents.filter((d) => !assigned.has(d.path));
if (missed.length)
  throw new Error(
    `Manifest documents not assigned by the spec:\n  ${missed.map((d) => d.path).join("\n  ")}`,
  );

// Programme records read as a timeline. Undated living notes (programme and
// candidate pages) sort last rather than being given a date they do not state.
evidence.sort((a, b) => {
  if (!a.candidateId !== !b.candidateId) return a.candidateId ? 1 : -1;
  if (a.candidateId !== b.candidateId) return 0;
  if (a.recordDate && b.recordDate) return a.recordDate.localeCompare(b.recordDate);
  if (a.recordDate) return -1;
  if (b.recordDate) return 1;
  return 0;
});
evidence.forEach((e, i) => {
  e.id = `E${String(i + 1).padStart(2, "0")}`;
});
const idByPath = new Map(evidence.map((e) => [e.provenance.path, e.id]));
const candidates = spec.candidates.map((c) => ({
  workspaceId: spec.workspaceId,
  programId: spec.programId,
  id: c.id,
  name: c.name,
  question: c.question,
  summary: c.summary,
  sequence: (() => {
    const own = (spec.assign[c.id] ?? [])
      .map((path) => byPath.get(path))
      .filter(Boolean)
      .map((d) => statedSequence(d.content))
      .filter(Boolean);
    return own[0];
  })(),
  evidenceIds: evidence
    .filter((e) => e.candidateId === c.id)
    .map((e) => e.id),
}));
const claims = spec.claims.map((c, i) => {
  const ids = c.sources.map((p) => {
    const id = idByPath.get(p);
    if (!id) throw new Error(`Claim cites an uncaptured path: ${p}`);
    return id;
  });
  const owner = candidates.find((x) => x.id === c.candidateId);
  if (!owner) throw new Error(`Claim names an unknown candidate: ${c.candidateId}`);
  for (const id of ids)
    if (!owner.evidenceIds.includes(id))
      throw new Error(`Claim ${c.title} cites evidence outside ${c.candidateId}.`);
  return {
    workspaceId: spec.workspaceId,
    programId: spec.programId,
    id: `C${String(i + 1).padStart(2, "0")}`,
    candidateId: c.candidateId,
    title: c.title,
    text: c.text,
    kind: c.kind,
    evidenceIds: ids,
    limitation: c.limitation,
    review: "proposed",
  };
});

const stateDocs = manifest.documents.map(canonicalState).filter(Boolean);
if (stateDocs.length > 1)
  throw new Error(
    `More than one canonical-state block captured: ${stateDocs.map((s) => s.sourcePath).join(", ")}`,
  );

const scoped = (r, i) => ({
  workspaceId: spec.workspaceId,
  programId: spec.programId,
  id: r.id ?? `X${String(i + 1).padStart(3, "0")}`,
  ...r,
});
const relations = [
  ...supersessionRelations(spec, byPath, idByPath),
  ...citationRelations(manifest, idByPath),
].map(scoped);

const program = {
  currentState: stateDocs[0],
  workspaceId: spec.workspaceId,
  programId: spec.programId,
  name: spec.name,
  objective: spec.objective,
  standardsVersion: spec.standardsVersion,
  standards: spec.standards,
  candidates,
  evidence,
  claims,
  relations,
};

/**
 * The shared cut, built by REMOVING records rather than hiding them.
 *
 * Runtime gating is not a boundary: the audience toggle filtered what was
 * drawn while every record still sat in the JavaScript the browser downloads,
 * sequences and vendor pricing included. A record that is not compiled in
 * cannot leak, so the shareable build is made from this file and the internal
 * one never reaches it.
 *
 * Dependents go with their source: a candidate loses withheld evidence ids, a
 * claim that cites a withheld record is dropped, and so is any relation whose
 * other end is gone. A conclusion without its evidence is worse than silence.
 */
function sharedCut(program) {
  const allowed = new Set(
    program.evidence.filter((e) => e.visibility === "shared").map((e) => e.id),
  );
  // A candidate carries its sequence, which is composition of matter and the
  // most sensitive string in the capture. It is stripped here, and a candidate
  // left with no visible evidence is dropped rather than shown as an empty
  // shell. check-bundle-leak.mjs caught both of these still shipping.
  const candidates = program.candidates
    .map(({ sequence, ...c }) => ({
      ...c,
      evidenceIds: c.evidenceIds.filter((id) => allowed.has(id)),
    }))
    .filter((c) => c.evidenceIds.length > 0);
  const liveCandidates = new Set(candidates.map((c) => c.id));
  return {
    ...program,
    audience: "shared",
    // The reconciled state names vendors, payments and dates. Sharing it is a
    // disclosure decision, so the spec must say so explicitly.
    currentState: spec.shareCurrentState ? program.currentState : undefined,
    evidence: program.evidence.filter((e) => allowed.has(e.id)),
    candidates,
    claims: program.claims.filter(
      (c) =>
        liveCandidates.has(c.candidateId) &&
        c.evidenceIds.every((id) => allowed.has(id)),
    ),
    relations: program.relations.filter(
      (r) => allowed.has(r.from) && allowed.has(r.to),
    ),
  };
}

const outDir = join(root, "lib/workspace/captured");
mkdirSync(outDir, { recursive: true });

const shared = sharedCut(program);
writeFileSync(
  join(outDir, `${spec.programId}.shared.ts`),
  `// GENERATED by scripts/build-captured-program.mjs. Do not edit by hand.
// The SHAREABLE cut: ${shared.evidence.length} of ${program.evidence.length} records.
// Records marked internal are absent from this file, not hidden by it, so a
// build made from it cannot disclose them however the page behaves.
import type { Program } from "../core.ts";

export const capturedProgram: Program = ${JSON.stringify(shared, null, 2)} as const;
`,
  "utf8",
);

const out = join(outDir, `${spec.programId}.ts`);
writeFileSync(
  out,
  `// GENERATED by scripts/build-captured-program.mjs. Do not edit by hand.
// Source: bounded vault intake capture of ${evidence.length} explicitly selected notes.
// Captured ${capturedAt}. Every record is unreviewed captured text: no claim here
// is approved, measured or executed, and no hash asserts scientific truth.
import type { Program } from "../core.ts";

export const capturedProgram: Program = ${JSON.stringify(program, null, 2)} as const;
`,
  "utf8",
);
const dated = evidence.filter((e) => e.recordDate).length;
console.log(
  `wrote ${out}
  ${evidence.length} sources (${evidence.filter((e) => !e.candidateId).length} programme-level), ${dated} dated
  ${candidates.length} candidates, ${claims.length} proposed claims
  canonical state: ${program.currentState ? `${program.currentState.rows.length} rows from ${program.currentState.sourcePath}` : "none captured"}
  relations: ${relations.filter((r) => r.kind !== "cites").length} supersession (declared + corroborated), ${relations.filter((r) => r.kind === "cites").length} citation (derived)
  visibility: ${evidence.filter((e) => e.visibility === "shared").length} shared, ${evidence.filter((e) => e.visibility !== "shared").length} internal
  shared cut: ${shared.evidence.length} records, ${shared.candidates.length} candidates, ${shared.claims.length} claims, current state ${shared.currentState ? "INCLUDED" : "withheld"}`,
);
