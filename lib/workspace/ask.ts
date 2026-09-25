import type { Audience, CanonicalState, Evidence, Program } from "./core.ts";

/**
 * Answer a question about a captured programme, deterministically.
 *
 * There is no model call here and there must never be one: every word of an
 * answer is either verbatim from a captured record or fixed UI text. That is
 * the whole difference between this and a chatbot. It can also say "the
 * captured records do not answer this", which a generative answer cannot.
 *
 * Ranking is plain token overlap. It is a retrieval aid, not comprehension:
 * it decides which records to put in front of a person, never what is true.
 */

const STOP = new Set([
  "a","an","and","any","are","as","at","be","been","being","but","by","can","did",
  "do","does","for","from","get","had","has","have","how","i","if","in","into","is",
  "it","its","me","my","of","on","or","our","ours","so","that","the","their","them",
  "then","there","these","they","this","to","us","was","we","were","what","when",
  "where","which","who","why","will","with","would","you","your",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Distinct query tokens present in `text`, plus a weighted hit count. */
function score(query: string[], text: string, weight: number) {
  const haystack = ` ${tokens(text).join(" ")} `;
  let covered = 0;
  let hits = 0;
  for (const t of query) {
    const n = haystack.split(` ${t} `).length - 1;
    if (n > 0) {
      covered++;
      hits += n * weight;
    }
  }
  return { covered, hits };
}

export type Citation = {
  id: string;
  title: string;
  path?: string;
  date?: string;
  kind?: string;
  excerpt: string;
};

export type Answer = {
  question: string;
  /** A row of the programme's reconciled state, when one matches. */
  state?: { item: string; recorded: string; basis: string; confidence: string };
  /** Every row not recorded as done, when the question asks what is open. */
  outstanding?: {
    item: string;
    recorded: string;
    basis: string;
    confidence: string;
  }[];
  asOf?: string;
  stateSource?: string;
  records: Citation[];
  /**
   * How well the records actually answer the question.
   *   direct  - a reconciled state row matched, or several query terms did
   *   loose   - one term matched and the rest did not; probably incidental
   * A keyword matcher cannot tell "melting point of gold" from "gold standard
   * assay", so it says which it is rather than implying an answer it has not
   * got.
   */
  strength: "direct" | "loose" | "none";
  /** Records that matched but are not visible to this audience. */
  withheld: number;
  answered: boolean;
  limitation: string;
};

const NOT_ANSWERED =
  "The captured records do not answer this. That is a statement about this capture, not about the programme: the answer may exist in a vault note that was not captured, in vendor correspondence, or nowhere yet.";

const LOOSE =
  "No direct answer. These records happen to use one of your words, which may be coincidental. Read them before drawing anything from them.";

const ANSWERED =
  "Every line above is quoted from a captured record, unreviewed, and cited. Matching is word overlap, so read the source before relying on it. A recorded state is what the vault says, not an independently verified fact.";

export function visibleTo(evidence: Evidence, audience: Audience): boolean {
  return audience === "internal" || evidence.visibility === "shared";
}

/**
 * The sentence in a note that best matches the question, with a little
 * context. Verbatim: this is quoted back to the reader as the source's words,
 * so it is selected, never rewritten or summarised.
 */
function bestSentence(
  text: string,
  query: string[],
  definitional = false,
): { text: string; score: number } | undefined {
  if (!text || !query.length) return undefined;
  const parts = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 24 && p.length < 600);
  let best: { p: string; score: number } | undefined;
  for (const p of parts) {
    const { covered, hits } = score(query, p, 1);
    if (!covered) continue;
    let s = covered * 10 + hits;
    if (definitional) {
      // Plain frequency picks the sentence that says the term most often, not
      // the one that explains it: "what is KISS1R" chose a sentence about the
      // Kickstarter over "Target: KISS1R / GPR54 (UniProt Q969F8) — Class A
      // GPCR". Prefer the shapes a definition actually takes.
      const head = p.slice(0, 48).toLowerCase();
      if (query.some((t) => head.includes(t))) s += 9;
      if (/\b(is|are|was|were)\s+(a|an|the)\b/i.test(p)) s += 7;
      if (/^(target|scope|programme|program|candidate|indication)\b/i.test(p))
        s += 7;
      if (/\b(uniprot|pdb|gpcr|receptor|ortholog)\b/i.test(p)) s += 5;
      if (/[—:=]/.test(p)) s += 3;
      // A definition is usually a short statement, not a paragraph.
      s -= Math.floor(p.length / 120);
    }
    if (!best || s > best.score) best = { p, score: s };
  }
  return best ? { text: best.p, score: best.score } : undefined;
}

export function answerQuestion(
  program: Program,
  question: string,
  audience: Audience = "internal",
): Answer {
  const query = [...new Set(tokens(question))];
  if (!query.length) {
    return {
      question,
      records: [],
      strength: "none",
      withheld: 0,
      answered: false,
      limitation:
        "Ask about the programme in words, for example what it is waiting on, whether an invoice was paid, or why a vendor changed.",
    };
  }

  // 0. "What is outstanding" is the question this programme is actually asked,
  //    and it is answerable exactly: the rows the vault did NOT record as done.
  const outstanding =
    /\b(waiting|outstanding|pending|blocked|blocker|next|remaining|missing|owe|owed|due)\b/i.test(
      question,
    );
  if (outstanding && program.currentState) {
    const open = program.currentState.rows.filter((r) =>
      ["unconfirmed", "open", "absent"].includes(r.confidence),
    );
    if (open.length) {
      return {
        question,
        outstanding: open.map((r) => ({
          item: r.item,
          recorded: r.state,
          basis: r.basis,
          confidence: r.confidence,
        })),
        asOf: program.currentState.evidenceAsOf,
        stateSource: program.currentState.sourcePath,
        records: [],
        strength: "direct",
        withheld: 0,
        answered: true,
        limitation: ANSWERED,
      };
    }
  }

  // "What is X" wants a definition, not a status. Answering it from the
  //    reconciled state table produced a confidently irrelevant answer:
  //    "what is KISS1R" returned the Approved scope row, which says which
  //    assays were ordered. Definitions come from the records themselves.
  const definitional =
    /^\s*(what|who|which)\s+(is|are|was|were)\b/i.test(question) ||
    /\b(define|definition|explain|mean|means|meaning|tell me about)\b/i.test(
      question,
    );

  // 1. The reconciled state table is the authority on where things stand, so a
  //    matching row leads. Item text weighs most: it is what the row is about.
  const state: CanonicalState | undefined = program.currentState;
  let bestRow: Answer["state"];
  if (state && !definitional) {
    let best = { covered: 0, hits: 0 };
    for (const row of state.rows) {
      const a = score(query, row.item, 3);
      const b = score(query, row.state, 2);
      const c = score(query, row.basis, 1);
      const covered = new Set<string>();
      for (const [text] of [[row.item], [row.state], [row.basis]] as const)
        for (const t of query)
          if (` ${tokens(text).join(" ")} `.includes(` ${t} `)) covered.add(t);
      const total = {
        covered: covered.size,
        hits: a.hits + b.hits + c.hits,
      };
      if (
        total.covered > best.covered ||
        (total.covered === best.covered && total.hits > best.hits)
      ) {
        best = total;
        bestRow = {
          item: row.item,
          recorded: row.state,
          basis: row.basis,
          confidence: row.confidence,
        };
      }
    }
    if (!best.covered) bestRow = undefined;
  }

  // 2. Then the records themselves, most relevant first.
  //
  //    Matching the whole-note index means a common word like "point" hits
  //    nearly every record, which would let any question look answered. Only
  //    terms that actually discriminate count towards a match: a term present
  //    in most of the capture tells you nothing about which record to read.
  //    Without this, "what is the melting point of gold" returns four records.
  const corpus = program.evidence.map(
    (e) => ` ${tokens(`${e.title} ${e.fullText ?? e.text}`).join(" ")} `,
  );
  const common = Math.max(1, Math.ceil(program.evidence.length * 0.6));
  //    But never filter the query down to nothing: "kiss1r" is in all twelve
  //    records, and dropping it made the programme's own name unsearchable and
  //    returned zero records. If nothing survives, every term counts again.
  const discriminating = query.filter(
    (t) => corpus.filter((c) => c.includes(` ${t} `)).length <= common,
  );
  const distinctive = discriminating.length ? discriminating : query;

  let withheld = 0;
  const ranked = program.evidence
    .map((e) => {
      const t = score(query, e.title, 3);
      const x = score(query, e.text, 1);
      // The whole-note index catches matches past the displayed excerpt.
      const w = score(query, e.fullText ?? "", 0.5);
      const covered = new Set<string>();
      for (const text of [e.title, e.text, e.fullText ?? ""])
        for (const q of distinctive)
          if (` ${tokens(text).join(" ")} `.includes(` ${q} `)) covered.add(q);
      const sentence = bestSentence(
        e.fullText ?? e.text,
        distinctive,
        definitional,
      );
      return {
        e,
        sentence,
        covered: covered.size,
        // A definition question should rank on how well a record DEFINES the
        // term, not on how often it repeats it.
        hits: definitional
          ? (sentence?.score ?? 0) + t.hits
          : t.hits + x.hits + w.hits,
      };
    })
    .filter((r) => r.covered > 0)
    .sort((a, b) => b.covered - a.covered || b.hits - a.hits)
    .filter((r) => {
      if (visibleTo(r.e, audience)) return true;
      withheld++;
      return false;
    })
    .slice(0, 4);

  const records: Citation[] = ranked.map(({ e, sentence }) => ({
    id: e.id,
    title: e.title,
    path: e.provenance?.path,
    date: e.recordDate,
    kind: e.recordType,
    // Quote the part of the note that actually matched, not its opening.
    excerpt: sentence?.text ?? e.text,
  }));

  const topCoverage = ranked[0]?.covered ?? 0;
  const strength: Answer["strength"] = bestRow
    ? "direct"
    : !records.length
      ? "none"
      : topCoverage >= 2 || distinctive.length <= 1
        ? "direct"
        : "loose";
  const answered = strength !== "none";
  return {
    question,
    strength,
    state: bestRow,
    asOf: bestRow ? state?.evidenceAsOf : undefined,
    stateSource: bestRow ? state?.sourcePath : undefined,
    records,
    withheld,
    answered,
    limitation:
      strength === "none"
        ? NOT_ANSWERED
        : strength === "loose"
          ? LOOSE
          : ANSWERED,
  };
}

/** Questions worth offering, derived from what the capture can actually answer. */
export function suggestedQuestions(program: Program): string[] {
  const out: string[] = [];
  const pending = program.currentState?.rows.filter(
    (r) => r.confidence === "unconfirmed" || r.confidence === "absent",
  );
  if (pending?.length) out.push("What are we waiting on?");
  if (program.currentState?.rows.some((r) => /payment|paid/i.test(r.item + r.state)))
    out.push("Has the invoice been paid?");
  if (program.relations.some((r) => r.kind !== "cites"))
    out.push("Which decisions have been superseded?");
  if (program.evidence.some((e) => /ginkgo/i.test(e.text)))
    out.push("Why did the vendor change?");
  return out.slice(0, 4);
}

/**
 * The programme as a given audience may see it.
 *
 * Gating happens ONCE, here, so every surface below it (atlas, comparison,
 * dossier, briefs) inherits the same decision rather than each remembering to
 * filter. Dependent records are dropped with their source: a candidate loses
 * withheld evidence ids, and an interpretation that cites a withheld record is
 * withheld too, because a conclusion shown without its evidence is worse than
 * one not shown at all.
 *
 * `withheld` is returned so the UI can say so out loud.
 */
export function gateProgram(
  program: Program,
  audience: Audience,
): { program: Program; withheld: number } {
  if (audience === "internal") return { program, withheld: 0 };
  const allowed = new Set(
    program.evidence.filter((e) => visibleTo(e, audience)).map((e) => e.id),
  );
  const withheld = program.evidence.length - allowed.size;
  if (!withheld) return { program, withheld: 0 };
  return {
    withheld,
    program: {
      ...program,
      evidence: program.evidence.filter((e) => allowed.has(e.id)),
      candidates: program.candidates.map((c) => ({
        ...c,
        evidenceIds: c.evidenceIds.filter((id) => allowed.has(id)),
      })),
      claims: program.claims.filter((c) =>
        c.evidenceIds.every((id) => allowed.has(id)),
      ),
      relations: program.relations.filter(
        (r) => allowed.has(r.from) && allowed.has(r.to),
      ),
    },
  };
}
