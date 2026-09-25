"use client";
import { useState } from "react";
import Link from "next/link";
type Area =
  | "Programs"
  | "Knowledge"
  | "Scientific standards"
  | "Research workspace"
  | "Review & decisions";
type Stage = "ready" | "review" | "changes" | "approved";
const areas: Area[] = [
  "Programs",
  "Knowledge",
  "Scientific standards",
  "Research workspace",
  "Review & decisions",
];
const evidence = [
  {
    id: "E01",
    title: "Candidate A · assay summary",
    kind: "Internal evidence",
    finding: "Preliminary functional signal",
    status: "Supporting",
    text: "Synthetic assay summary: a functional response is reported in one model. Independent replication and a full selectivity panel are absent.",
  },
  {
    id: "E02",
    title: "Candidate A · replication note",
    kind: "Internal evidence",
    finding: "Conflicting result needs investigation",
    status: "Conflicting",
    text: "Synthetic replication note: a second experimental condition did not reproduce the original signal. The difference in conditions is unresolved.",
  },
  {
    id: "E03",
    title: "Candidate B · binding summary",
    kind: "Internal evidence",
    finding: "Functional evidence missing",
    status: "Incomplete",
    text: "Synthetic binding summary: binding is described, but no functional assay is available. Binding alone does not establish functional activity.",
  },
  {
    id: "E04",
    title: "Mechanism background · example excerpt",
    kind: "External evidence example",
    finding: "Background only; no candidate validation",
    status: "Context",
    text: "An invented placeholder for a future literature connector. No actual publication, citation, or Paperclip response is represented here.",
  },
];
const rules = [
  [
    "Separate observation from inference",
    "Distinguish reported measurements, interpretations, and missing evidence.",
  ],
  [
    "Keep contradictory evidence visible",
    "Conflicting results stay attached to the claim. An agent cannot silently discard them.",
  ],
  [
    "Binding does not establish function",
    "A binding result cannot substitute for evidence of the required functional response.",
  ],
  [
    "A recommendation requires review",
    "Agent findings remain proposed until a designated scientist reviews and accepts them.",
  ],
];
export default function Home() {
  const [area, setArea] = useState<Area>("Programs");
  const [stage, setStage] = useState<Stage>("ready");
  const [source, setSource] = useState<(typeof evidence)[number] | null>(null);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState("");
  const [reviewer, setReviewer] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [context, setContext] = useState(false);
  const nav = (a: Area) => {
    setArea(a);
    setError("");
  };
  const assess = () => {
    setStage("review");
    setHistory((h) => [
      ...h,
      "Example assessment prepared using evidence E01–E04 and demonstration standards v0.1.",
    ]);
  };
  const reset = () => {
    setArea("Programs");
    setStage("ready");
    setNote("");
    setSaved("");
    setHistory([]);
    setError("");
    setReviewer(false);
  };
  const decide = (accept: boolean) => {
    if (!reviewer) {
      setError("Switch to the demo reviewer role to record a review.");
      return;
    }
    if (!note.trim()) {
      setError(
        "Add your reasoning so the next scientist can understand this decision.",
      );
      return;
    }
    setStage(accept ? "approved" : "changes");
    setSaved(note.trim());
    setHistory((h) => [
      ...h,
      `${accept ? "Assessment accepted" : "Changes requested"} by Demo reviewer: ${note.trim()}`,
    ]);
    setNote("");
    setError("");
  };
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="mark">m</span>molecule<sup>®</sup>
        </Link>
        <div className="workspace-label">CLIENT WORKSPACE</div>
        <div className="client">
          <span className="client-icon">V</span>
          <div>
            VivaMed<small>Scientific command center</small>
          </div>
        </div>
        <nav aria-label="Workspace">
          {areas.map((a, i) => (
            <button
              key={a}
              className={`nav ${area === a ? "active" : ""}`}
              onClick={() => nav(a)}
            >
              <span>{["◫", "▤", "◎", "⌘", "✓"][i]}</span>
              {a}
              {a === "Review & decisions" && stage === "review" && (
                <b className="count">1</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="connection">● Local concept prototype</span>
          <p>
            Fictional programs and evidence.
            <br />
            No connected research services.
          </p>
          <button onClick={reset} className="text-button">
            ↺ Reset walkthrough
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header>
          <span className="breadcrumb">
            VivaMed <i>/</i> {area}
          </span>
          <button
            className="role"
            onClick={() => {
              setReviewer(!reviewer);
              setError("");
            }}
          >
            <span className="avatar">{reviewer ? "RV" : "SC"}</span>
            <span>
              Demo {reviewer ? "reviewer" : "scientist"}
              <small>Switch role ⇄</small>
            </span>
          </button>
        </header>
        <div className="demo-banner">
          <b>INTERACTIVE CONCEPT</b>All findings are illustrative. Actions are
          simulated and reset on refresh.
        </div>
        <main ref={(node) => { if (node) node.dataset.ready = "true"; }}>
          <div className="demo-banner" style={{ marginBottom: 12, borderRadius: 8 }}>
            <b>NEW · CONNECTED WORKSPACE</b>
            <Link href="/workspace">Explore programs, evidence and planned tools →</Link>
          </div>
          <div className="demo-banner" style={{ marginBottom: 24, borderRadius: 8 }}>
            <b>NEW · SAVED MEMORY</b>
            <Link href="/memory">Open the persistent synthetic workspace →</Link>
          </div>
          <div className="page-top">
            <div>
              <span className="eyebrow">MOLECULE × VIVAMED</span>
              <h1>
                {area === "Programs"
                  ? "From evidence to a shared decision."
                  : area}
              </h1>
              <p className="intro">
                {area === "Programs"
                  ? "One place for your programs, the science behind them, and what happens next."
                  : area === "Knowledge"
                    ? "Inspect the material behind each claim. Keep uncertainty and provenance in view."
                    : area === "Scientific standards"
                      ? "The scientific principles that guide every assessment in this demonstration."
                      : area === "Research workspace"
                        ? "A bounded question, explicit evidence, and a result ready for scientific review."
                        : "Make the reasoning part of the record—not just the conversation."}
              </p>
            </div>
            <span className="outline-tag">FOUNDATION · V0.1</span>
          </div>
          {area === "Programs" && (
            <>
              <section className="journey">
                <span className="eyebrow">YOUR FIRST WORKFLOW</span>
                <div>
                  {[
                    "Open a program",
                    "Assess evidence",
                    "Review findings",
                    "Record decision",
                  ].map((s, i) => (
                    <span
                      key={s}
                      className={
                        i ===
                        (stage === "ready" ? 0 : stage === "approved" ? 3 : 2)
                          ? "current"
                          : ""
                      }
                    >
                      <b>{i + 1}</b>
                      {s}
                      {i < 3 && <em>→</em>}
                    </span>
                  ))}
                </div>
              </section>
              <div className="section-heading">
                <h2>Program workspace</h2>
                <span>1 illustrative program · 2 candidates</span>
              </div>
              <section className="program-card">
                <div className="program-main">
                  <div className="program-meta">
                    <span className="pill">ILLUSTRATIVE PROGRAM</span>
                    <span>PRG-DEMO-01</span>
                  </div>
                  <h2>Endotype Alpha</h2>
                  <p>
                    A demonstration program for comparing candidate evidence and
                    identifying the next question to resolve.
                  </p>
                  <div className="program-facts">
                    {[
                      ["02", "Candidates"],
                      ["04", "Evidence records"],
                      ["01", "Unresolved conflict"],
                    ].map(([n, t]) => (
                      <div key={t}>
                        <strong>{n}</strong>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card-footer">
                    <span className="status">
                      ●{" "}
                      {stage === "ready"
                        ? "Ready for evidence review"
                        : stage === "approved"
                          ? "Assessment accepted · gaps remain"
                          : stage === "changes"
                            ? "Changes requested"
                            : "Awaiting scientific review"}
                    </span>
                    <button
                      className="primary"
                      onClick={() => nav("Research workspace")}
                    >
                      {stage === "ready" ? "Open program" : "Continue review"} ↗
                    </button>
                  </div>
                </div>
                <div className="next-question">
                  <span className="eyebrow">THE NEXT SCIENTIFIC QUESTION</span>
                  <h3>What do we actually know about these candidates?</h3>
                  <p>
                    Distinguish functional evidence from binding evidence,
                    surface contradictory findings, and identify what is still
                    missing.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => nav("Scientific standards")}
                  >
                    View assessment standards →
                  </button>
                </div>
              </section>
              <div className="lower-grid">
                <section className="panel">
                  <span className="eyebrow">SHARED SCIENTIFIC MEMORY</span>
                  <h3>Work that carries forward.</h3>
                  <p>
                    Evidence, proposed findings, and reviewed decisions stay
                    connected to the program. A new conversation should not mean
                    starting again.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => nav("Knowledge")}
                  >
                    Explore example evidence →
                  </button>
                </section>
                <section className="panel tint">
                  <span className="eyebrow">WHAT THIS PROTOTYPE TESTS</span>
                  <h3>Can a colleague pick up where you left off?</h3>
                  <p>
                    Prepare an assessment as the demo scientist, then switch to
                    the demo reviewer and record a reasoned decision.
                  </p>
                </section>
              </div>
            </>
          )}
          {area === "Knowledge" && (
            <>
              <div className="toolbar">
                <h2>Program evidence</h2>
                <input
                  aria-label="Search evidence"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles or findings…"
                />
              </div>
              <div className="evidence-list">
                {evidence
                  .filter((s) =>
                    `${s.title} ${s.finding}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      className="evidence-row"
                      onClick={() => setSource(s)}
                    >
                      <span className="file-icon">▤</span>
                      <span className="evidence-title">
                        <strong>{s.title}</strong>
                        <small>
                          {s.id} · {s.kind}
                        </small>
                      </span>
                      <span className="finding">{s.finding}</span>
                      <span className={`badge ${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                      <span>↗</span>
                    </button>
                  ))}
                {!evidence.some((s) =>
                  `${s.title} ${s.finding}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                ) && (
                  <p className="empty">
                    No matching evidence. Try “binding” or “candidate”.
                  </p>
                )}
              </div>
              <p className="notice">
                These are invented source records. No document has been uploaded
                and no external research connector is active.
              </p>
            </>
          )}
          {area === "Scientific standards" && (
            <>
              <div className="standards-title">
                <div>
                  <h2>Evidence assessment principles</h2>
                  <p>Demonstration draft · v0.1 · not approved by VivaMed</p>
                </div>
                <span className="badge incomplete">Draft for discussion</span>
              </div>
              <div className="rules">
                {rules.map(([title, body], i) => (
                  <article className="rule" key={title}>
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="notice">
                In the working product, changes would have a named author,
                reviewer, effective version, and explicit history. Agent memory
                would not silently change approved standards.
              </p>
              <button
                className="secondary"
                onClick={() => nav("Research workspace")}
              >
                See these principles applied →
              </button>
            </>
          )}
          {area === "Research workspace" && (
            <>
              <div className="program-strip">
                <span className="client-icon">α</span>
                <div>
                  <strong>Endotype Alpha</strong>
                  <small>PRG-DEMO-01 · Candidate evidence assessment</small>
                </div>
                <button
                  className="text-button"
                  onClick={() => nav("Knowledge")}
                >
                  4 evidence records ↗
                </button>
              </div>
              <div className="research-grid">
                <section className="panel">
                  <span className="eyebrow">ASSESSMENT BRIEF</span>
                  <h2>Evaluate the strength of the evidence.</h2>
                  <p>
                    Compare Candidates A and B. Identify observed findings,
                    conflicting results, and evidence gaps. Do not infer
                    functional activity from binding alone.
                  </p>
                  <div className="brief-item">
                    <span>Scope</span>
                    <strong>2 candidates · 4 example records</strong>
                  </div>
                  <div className="brief-item">
                    <span>Standards</span>
                    <button
                      className="text-button"
                      onClick={() => nav("Scientific standards")}
                    >
                      Demonstration v0.1 ↗
                    </button>
                  </div>
                  <div className="brief-item">
                    <span>Output</span>
                    <strong>Evidence table + proposed next step</strong>
                  </div>
                  <div className="brief-item">
                    <span>Execution</span>
                    <strong>Simulation · no model calls or spend</strong>
                  </div>
                  <button
                    className="primary full"
                    onClick={assess}
                    disabled={stage !== "ready"}
                  >
                    {stage === "ready"
                      ? "Generate example assessment →"
                      : "Example assessment generated ✓"}
                  </button>
                  <button
                    className="text-button disclosure"
                    aria-expanded={context}
                    onClick={() => setContext(!context)}
                  >
                    {context ? "−" : "+"} What context does this task receive?
                  </button>
                  {context && (
                    <p className="context-detail">
                      The program brief, source records E01–E04, standards v0.1,
                      and this assessment procedure. A real implementation would
                      also enforce user permissions and select the correct
                      source versions before execution.
                    </p>
                  )}
                </section>
                <section className="panel results">
                  <div className="section-heading">
                    <span className="eyebrow">ASSESSMENT OUTPUT</span>
                    <span className="badge context">
                      {stage === "ready"
                        ? "Not started"
                        : "Illustrative output"}
                    </span>
                  </div>
                  {stage === "ready" ? (
                    <div className="empty-result">
                      <span>◎</span>
                      <h3>A question before a conclusion.</h3>
                      <p>
                        Generate the example assessment to see how findings,
                        uncertainty, and sources come together.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3>
                        Resolve the functional uncertainty before prioritizing.
                      </h3>
                      <p>
                        Candidate A has a preliminary functional signal with an
                        unresolved conflicting result. Candidate B has binding
                        evidence only. This evidence does not support a
                        definitive program ranking.
                      </p>
                      <div className="finding-card">
                        <span className="badge conflicting">
                          Candidate A · conflicting
                        </span>
                        <p>
                          Investigate whether experimental conditions explain
                          the inconsistent functional response.
                        </p>
                        <button
                          className="source-chip"
                          onClick={() => setSource(evidence[0])}
                        >
                          E01 ↗
                        </button>{" "}
                        <button
                          className="source-chip"
                          onClick={() => setSource(evidence[1])}
                        >
                          E02 ↗
                        </button>
                      </div>
                      <div className="finding-card">
                        <span className="badge incomplete">
                          Candidate B · incomplete
                        </span>
                        <p>
                          Obtain functional evidence before making claims about
                          the desired activity.
                        </p>
                        <button
                          className="source-chip"
                          onClick={() => setSource(evidence[2])}
                        >
                          E03 ↗
                        </button>
                      </div>
                      <div className="recommendation">
                        <strong>Proposed next step</strong>
                        <p>
                          Have a scientist scope the discriminating functional
                          experiments. Keep portfolio priority provisional.
                        </p>
                      </div>
                      <button
                        className="primary full"
                        onClick={() => nav("Review & decisions")}
                      >
                        Open scientific review →
                      </button>
                    </>
                  )}
                </section>
              </div>
            </>
          )}
          {area === "Review & decisions" &&
            (stage === "ready" ? (
              <section className="panel empty">
                <h2>No assessment awaiting review.</h2>
                <p>Start with the evidence assessment for Endotype Alpha.</p>
                <button
                  className="primary"
                  onClick={() => nav("Research workspace")}
                >
                  Open research workspace →
                </button>
              </section>
            ) : (
              <div className="review-grid">
                <section className="panel">
                  <span className="eyebrow">
                    SCIENTIFIC REVIEW · ENDOTYPE ALPHA
                  </span>
                  <h2>
                    {stage === "approved"
                      ? "Assessment accepted for the demo record."
                      : stage === "changes"
                        ? "Assessment returned for changes."
                        : "Does the conclusion follow from the evidence?"}
                  </h2>
                  <p className="review-summary">
                    Proposed conclusion: current evidence is insufficient for
                    definitive prioritization. Resolve Candidate A’s conflicting
                    functional results and Candidate B’s missing functional
                    evidence.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => nav("Research workspace")}
                  >
                    Inspect findings and source records ↗
                  </button>
                  {stage === "approved" || stage === "changes" ? (
                    <>
                      <div className="saved-note">
                        <span className="eyebrow">
                          DEMO REVIEWER’S REASONING
                        </span>
                        <p>{saved}</p>
                      </div>
                      <p className="notice">
                        Recorded only in this demonstration session. This is not
                        a real scientific approval or a Molecule Protocol
                        record.
                      </p>
                      {stage === "changes" && (
                        <button
                          className="secondary"
                          onClick={() => {
                            setStage("review");
                            setHistory((h) => [
                              ...h,
                              "Demo review reopened; underlying illustrative findings are unchanged.",
                            ]);
                          }}
                        >
                          Reopen review
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="note-label" htmlFor="review-note">
                        Your reasoning
                      </label>
                      <textarea
                        id="review-note"
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="What do you accept, challenge, or need clarified?"
                      />
                      <p className="role-hint">
                        {reviewer
                          ? "Reviewing as Demo reviewer."
                          : "Switch to the Demo reviewer using the top-right control to record a decision."}
                      </p>
                      {error && (
                        <p role="alert" className="error">
                          {error}
                        </p>
                      )}
                      <div className="actions">
                        <button
                          className="secondary"
                          onClick={() => decide(false)}
                        >
                          Request changes
                        </button>
                        <button
                          className="primary"
                          onClick={() => decide(true)}
                        >
                          Accept assessment ✓
                        </button>
                      </div>
                    </>
                  )}
                </section>
                <section className="panel">
                  <span className="eyebrow">DECISION TRAIL</span>
                  <h3>The reasoning travels with the work.</h3>
                  <ol className="timeline">
                    <li>
                      <strong>Evidence package prepared</strong>
                      <p>
                        Four synthetic records, including a conflicting result.
                      </p>
                    </li>
                    {history.map((h, i) => (
                      <li key={i}>
                        <strong>Step {i + 2}</strong>
                        <p>{h}</p>
                      </li>
                    ))}
                  </ol>
                  <button
                    className="text-button"
                    onClick={() => nav("Programs")}
                  >
                    Back to program overview →
                  </button>
                </section>
              </div>
            ))}
        </main>
        <footer>
          <span>molecule / scientific infrastructure</span>
          <span>Concept walkthrough · no live integrations</span>
        </footer>
      </div>
      {source && (
        <div className="modal-backdrop" onClick={() => setSource(null)}>
          <section
            className="source-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Evidence record"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSource(null);
            }}
          >
            <button
              autoFocus
              className="close"
              onClick={() => setSource(null)}
              aria-label="Close evidence"
            >
              ×
            </button>
            <span className="eyebrow">
              {source.id} · SYNTHETIC SOURCE RECORD
            </span>
            <h2>{source.title}</h2>
            <span className={`badge ${source.status.toLowerCase()}`}>
              {source.status}
            </span>
            <p>{source.text}</p>
            <p className="notice">
              Example only. This is not a real study, VivaMed document, or
              scientific result.
            </p>
            <button className="secondary" onClick={() => setSource(null)}>
              Back to workspace
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
