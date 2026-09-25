import { useState } from "react";
import {
  assessmentMatrix,
  type Program,
  type Evidence,
} from "../../lib/workspace/core";
import EvidenceAtlas from "./evidence-atlas";
import AskPanel from "./ask-panel";
import Disclosure from "./disclosure";
import StatusLedger from "./status-ledger";
import { gateProgram } from "../../lib/workspace/ask";
import type { Audience } from "../../lib/workspace/core";

export default function ProgramDesk({
  program: fullProgram,
  candidateId,
  chooseCandidate,
  inspect,
  investigate,
  standards,
  inspected,
  evidence,
  review,
  audience,
}: {
  program: Program;
  candidateId: string;
  chooseCandidate: (id: string) => void;
  inspect: (evidence: Evidence) => void;
  investigate: (id: string) => void;
  standards: () => void;
  inspected: string[];
  evidence: () => void;
  review: () => void;
  audience: Audience;
}) {
  // One gate for every surface below. The ask panel gates its own search so it
  // can report matches it is withholding; everything else reads the gated view.
  const { program: gated, withheld } = gateProgram(fullProgram, audience);
  const program = gated;
  const candidate =
    program.candidates.find((c) => c.id === candidateId) ??
    program.candidates[0];
  const claim = program.claims.find((c) => c.candidateId === candidate?.id);
  // A collapsed section has to be worth not opening, so its header carries the
  // fact you would have opened it for.
  const open4 =
    program.currentState?.rows.filter((r) =>
      ["unconfirmed", "open", "absent"].includes(r.confidence),
    ).length ?? 0;
  const supersessions = program.relations.filter(
    (r) => r.kind !== "cites",
  ).length;
  // The ledger shows the standing; "read the basis" opens the full table.
  const [openState, setOpenState] = useState(false);
  // A shared cut can legitimately have no candidates: everything about them
  // may be internal. Say that plainly instead of rendering an empty page,
  // which reads as broken rather than as deliberately sparse.
  if (!candidate)
    return (
      <section className="ws-sparse">
        <p className="ws-kicker">Shared view</p>
        <h2>Nothing about the candidates is shared yet.</h2>
        <p>
          This build contains {program.evidence.length} record
          {program.evidence.length === 1 ? "" : "s"} marked shareable. Candidate
          records, sequences and the reconciled state are internal and were not
          built into it, so they are absent rather than hidden.
        </p>
        {program.evidence.length > 0 && (
          <ul className="ws-sparse-list">
            {program.evidence.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => inspect(e)}>
                  <em>{e.id}</em>
                  {e.title}
                </button>
                <small>
                  {[e.recordDate ?? "undated", e.recordType, e.provenance?.path]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  return (
    <>
      <div className="ws-program-ledger" aria-label="Program record summary">
        <span>
          <i aria-hidden="true">◫</i> PROGRAM RECORD{" "}
          <strong>{program.programId}</strong>
        </span>
        <span>
          <strong>
            {program.candidates.length.toString().padStart(2, "0")}
          </strong>{" "}
          candidates
        </span>
        <span>
          <strong>{program.evidence.length.toString().padStart(2, "0")}</strong>{" "}
          source records
        </span>
        <span className="ws-ledger-boundary">
          {program.evidence.some((e) => e.origin === "vault-capture")
            ? "CAPTURED TEXT / NOT AN ASSAY RESULT"
            : "SYNTHETIC / NOT AN ASSAY RESULT"}
        </span>
      </div>
      {program.candidates.some((c) => c.sequence) && (
        <ul className="rec-sequences" aria-label="Candidate sequences">
          {program.candidates
            .filter((c) => c.sequence)
            .map((c) => (
              <li key={c.id} className="rec-sequence">
                <b>{c.name}</b>
                {/* Bracketed residues are the designed modifications; they are
                    the whole point of the molecule, so they are marked. */}
                {c.sequence!.split(/(\{[^}]*\})/).map((part, i) =>
                  part.startsWith("{") ? (
                    <i key={i}>{part}</i>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </li>
            ))}
        </ul>
      )}
      {program.currentState && (
        <StatusLedger
          state={program.currentState}
          onOpen={() => setOpenState(true)}
        />
      )}
      <AskPanel
        program={fullProgram}
        audience={audience}
        inspect={(id) => {
          const record = program.evidence.find((e) => e.id === id);
          if (record) inspect(record);
        }}
      />
      {withheld > 0 && (
        <div className="ws-gated-note">
          <p>
            <strong>Previewing the outside view.</strong> {withheld} of{" "}
            {fullProgram.evidence.length} records are internal and are not
            shown, along with anything that depends on them. Switch to Internal
            above to see everything.
          </p>
          <p className="ws-gated-warning">
            This is a preview of what would be shared, not an access control.
            Every record is still loaded into the page, so anyone who can open
            this page can read the withheld ones from the browser. Real
            withholding needs the data filtered before it is sent, which is not
            built. Do not rely on this to protect anything.
          </p>
        </div>
      )}
      <div className="disclosure-stack">
      {/* Only offered when a reconciled state was actually captured: a section
          whose summary says "nothing here" is worse than no section. */}
      {program.currentState && (
        <Disclosure
          title="The basis for each"
          defaultOpen={openState}
          key={`state-${openState}`}
          summary={`${open4} of ${program.currentState.rows.length} items not recorded as done · evidence as of ${program.currentState.evidenceAsOf.split(";")[0].trim()}`}
        >
      {program.currentState && (
        <section className="ws-state" aria-labelledby="state-title">
          <div className="ws-state-head">
            <div>
              <span className="ws-kicker">
                RECONCILED CURRENT STATE / VERBATIM FROM THE PROGRAMME RECORD
              </span>
              <h2 id="state-title">Where Round 1 actually stands</h2>
            </div>
            <dl className="ws-state-meta">
              <div>
                <dt>Reconciled</dt>
                <dd>{program.currentState.reconciledOn}</dd>
              </div>
              <div>
                <dt>Evidence as of</dt>
                <dd>{program.currentState.evidenceAsOf}</dd>
              </div>
            </dl>
          </div>
          <ol className="ws-state-rows">
            {program.currentState.rows.map((row) => (
              <li key={row.item} className={`ws-state-${row.confidence}`}>
                <span className="ws-state-item">
                  {row.item}
                  <span className="ws-state-chip">
                    {
                      {
                        recorded: "recorded",
                        unconfirmed: "not confirmed",
                        open: "open",
                        absent: "no result",
                        unclassified: "see state",
                      }[row.confidence]
                    }
                  </span>
                </span>
                <span className="ws-state-value">{row.state}</span>
                <span className="ws-state-basis">{row.basis}</span>
              </li>
            ))}
          </ol>
          <p className="ws-state-foot">
            {program.currentState.verificationLevel} Recorded state and basis
            are quoted from <code>{program.currentState.sourcePath}</code>; the
            colour is presentational only and never replaces the wording.
          </p>
        </section>
      )}
        </Disclosure>
      )}
      <Disclosure
        title="Evidence map"
        summary={`${program.evidence.length} records · ${supersessions} supersessions · ${program.claims.length} proposed interpretations`}
      >
      <EvidenceAtlas
        key={`${program.workspaceId}:${program.programId}`}
        program={program}
        initialSelection={
          candidateId === "candidate-a"
            ? "source:E02"
            : `candidate:${candidateId}`
        }
        inspect={inspect}
        investigate={investigate}
        chooseCandidate={chooseCandidate}
      />
      </Disclosure>
      <Disclosure
        title="Full workspace"
        summary="Open question, workflow, attention list, candidate comparison and dossier"
      >
      <section className="atlas-launch" aria-labelledby="mission-title">
        <div>
          <span className="ws-kicker">
            START HERE / YOUR NEXT INVESTIGATION
          </span>
          <h2 id="mission-title">{candidate.question}</h2>
        </div>
        <div className="atlas-launch-action">
          <p>
            {/* The authored summary describes the full record set. Once
                anything is withheld it stops being true, so the gated view
                falls back to what this reader can actually see. */}
            {withheld > 0 || !candidate.summary
              ? `${candidate.evidenceIds.length} source record${candidate.evidenceIds.length === 1 ? "" : "s"} visible to you.`
              : candidate.summary}
            <br />
            Trace the evidence, then decide what to ask next.
          </p>
          <button
            className="ws-button"
            onClick={() => investigate(candidateId)}
          >
            Investigate {candidate.name} <span aria-hidden="true">↗</span>
          </button>
          <span className="ws-action-caption">
            Opens a guided brief · no agent call
          </span>
        </div>
      </section>
      <nav className="ws-workflow-rail" aria-label="Program workflow">
        <button onClick={evidence}>
          <span className="ws-rail-number">01</span>
          <span>
            <strong>Trace the evidence</strong>
            <small>Open source records and relationships</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
        <button onClick={() => investigate(candidateId)}>
          <span className="ws-rail-number">02</span>
          <span>
            <strong>Build a research brief</strong>
            <small>Carry the question and context forward</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
        <button onClick={review}>
          <span className="ws-rail-number">03</span>
          <span>
            <strong>Review what to carry forward</strong>
            <small>Separate proposals from decisions</small>
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </nav>
      <section className="ws-attention" aria-labelledby="attention-title">
        <div className="ws-section-heading">
          <h2 id="attention-title">
            Needs attention <span className="ws-count">02</span>
          </h2>
          <span>
            {program.evidence.some((e) => e.origin === "vault-capture")
              ? "Prepared from the captured source set"
              : "Prepared from this demonstration package"}
          </span>
        </div>
        <div className="ws-attention-list">
          {program.claims.map((c) => {
            const owner = program.candidates.find(
              (x) => x.id === c.candidateId,
            );
            const gap = c.kind === "gap";
            return (
              <button
                key={c.id}
                onClick={() => investigate(c.candidateId)}
              >
                <span
                  className={`ws-attention-marker ${gap ? "gap" : "conflict"}`}
                >
                  {gap ? "?" : "!"}
                </span>
                <span>
                  <strong>{c.title}</strong>
                  <small>
                    {owner?.name ?? c.candidateId} ·{" "}
                    {gap ? "Missing evidence" : "Unresolved evidence"} ·{" "}
                    {c.evidenceIds.join(" + ")}
                  </small>
                </span>
                <span className="ws-attention-action">
                  {gap ? "Explore gap" : "Investigate"} →
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="ws-comparison" aria-labelledby="comparison-title">
        <div className="ws-section-heading">
          <div>
            <span className="ws-kicker">
              COMPARE THE EVIDENCE, NOT AN OPAQUE SCORE
            </span>
            <h2 id="comparison-title">Candidate comparison</h2>
          </div>
          <button className="ws-text-button" onClick={standards}>
            View assessment rules ↗
          </button>
        </div>
        <p className="ws-table-hint">
          Scroll the table sideways to compare candidates →
        </p>
        <div
          className="ws-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable candidate comparison"
        >
          <table>
            <caption>
              Qualitative fixture assessment. No numeric thresholds, ranking or
              approved target product profile.
            </caption>
            <thead>
              <tr>
                <th scope="col">Evidence criterion</th>
                {program.candidates.map((c) => (
                  <th scope="col" key={c.id}>
                    <button
                      aria-pressed={candidateId === c.id}
                      onClick={() => {
                        chooseCandidate(c.id);
                        requestAnimationFrame(() =>
                          document.getElementById("dossier-title")?.focus(),
                        );
                      }}
                    >
                      {c.name}
                      <span>
                        {candidateId === c.id ? "Selected ↓" : "Inspect ↓"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessmentMatrix(program.workspaceId, program.programId).map(
                (row) => (
                  <tr key={row.criterion}>
                    <th scope="row">{row.criterion}</th>
                    {[row.a, row.b].map((cell, index) => (
                      <td key={index}>
                        <span
                          className={
                            cell.label === "Not in package" ||
                            cell.label === "Missing"
                              ? "ws-cell-missing"
                              : "ws-cell-caution"
                          }
                        >
                          {cell.label}
                        </span>
                        <div>
                          {cell.sources.map((id) => (
                            <button
                              className="ws-citation"
                              key={id}
                              aria-label={`Inspect ${id} for ${row.criterion}, Candidate ${index === 0 ? "A" : "B"}`}
                              onClick={() =>
                                inspect(
                                  program.evidence.find((e) => e.id === id)!,
                                )
                              }
                            >
                              {id} ↗
                            </button>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="ws-dossier" aria-labelledby="dossier-title">
        <div className="ws-dossier-heading">
          <div>
            <span className="ws-kicker">CANDIDATE DOSSIER / SYNTHETIC</span>
            <h2 id="dossier-title" tabIndex={-1}>
              {candidate.name} · evidence in context
            </h2>
          </div>
          <span className="ws-tag ws-tag-warm">No advancement decision</span>
        </div>
        <div className="ws-dossier-content">
          <div>
            <h3>The question to resolve</h3>
            <p>{candidate.question}</p>
            <div className="ws-dossier-sources">
              {program.evidence
                .filter((e) => candidate.evidenceIds.includes(e.id))
                .map((e) => (
                  <button
                    key={e.id}
                    className="ws-source-row"
                    onClick={() => inspect(e)}
                  >
                    <span className="ws-source-id">{e.id}</span>
                    <span>
                      <strong>{e.title}</strong>
                      <small>
                        Version {e.version} ·{" "}
                        {inspected.includes(e.id)
                          ? "Opened this session"
                          : "Open source to inspect"}
                      </small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
            </div>
          </div>
          <div className="ws-dossier-next">
            <span className="ws-kicker">
              {claim
                ? "PREPARED INTERPRETATION / NOT APPROVED"
                : "NO PREPARED INTERPRETATION"}
            </span>
            <p>
              {claim?.text ??
                "No interpretation has been prepared for this candidate."}
            </p>
            <p className="ws-small">
              {claim?.limitation ??
                "Absence of a prepared interpretation is not a finding."}
            </p>
            <button
              className="ws-button secondary"
              onClick={() => investigate(candidate.id)}
            >
              Prepare research brief →
            </button>
          </div>
        </div>
      </section>
      </Disclosure>
      </div>
    </>
  );
}
