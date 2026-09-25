"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  program,
  sources,
  standards,
  procedure,
  openResearchFixture,
  type MemoryState,
  type Command,
  type Claim,
} from "../../lib/memory";
import "./memory.css";

type Snapshot = { state: MemoryState; revision: number; actor: string };
type Tab = "Assessment" | "Knowledge" | "Integrations" | "History";
const label = (s: string) => s.replaceAll("_", " ");
export default function MemoryWorkspace() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<Tab>("Assessment");
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<"scientist" | "reviewer">("scientist");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function reload() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/memory", { cache: "no-store" });
      const data = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read saved state.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    fetch("/api/memory", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as Snapshot & { error?: string };
        if (!response.ok) throw new Error(data.error);
        if (active) setSnapshot(data);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to load saved state.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  async function act(action: Command["action"], extra: Partial<Command> = {}) {
    if (!snapshot || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const command = {
        ...extra,
        action,
        id: crypto.randomUUID(),
        revision: snapshot.revision,
        role,
      };
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const data = (await response.json()) as Snapshot & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setSnapshot(data);
      if (action === "start") {
        setSelected(command.id);
        setTab("Assessment");
      }
      setNotice(
        action === "start"
          ? "Synthetic run saved. No model or external tool was called."
          : action === "import_external" || action === "review_external"
            ? "Integration record saved. Scientific knowledge is unchanged."
            : action === "review"
              ? "Assessment decision saved. Knowledge still requires separate approval."
              : "Knowledge decision saved. Future runs use only approved updates.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save failed. Reload to check the saved record.",
      );
    } finally {
      setBusy(false);
    }
  }
  const state = snapshot?.state;
  const run = state?.runs.find((r) => r.id === selected) ?? state?.runs.at(-1);
  const context = run?.context ?? {
    program,
    sources,
    standards,
    procedure,
    approvedKnowledge: state?.knowledge ?? [],
    previousOutcomes: [],
    omissions: [
      "Public/synthetic fixtures only. No external tools or models connected.",
    ],
  };
  const canStart =
    !!snapshot &&
    !state?.runs.some((r) => r.state === "awaiting_review") &&
    role === "scientist" &&
    !busy;
  const rationale = (key: string, title: string) => (
    <label className="memory-note">
      {title}
      <textarea
        maxLength={2000}
        value={notes[key] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [key]: e.target.value }))}
        placeholder="Explain what you accept, reject, or need clarified. Synthetic content only."
      />
    </label>
  );
  const claimCard = (claim: Claim) => (
    <div className="memory-claim" key={claim.id}>
      <div className="memory-row">
        <span className="eyebrow">{claim.kind}</span>
        <span className="outline-tag">{claim.status}</span>
      </div>
      <p>{claim.text}</p>
      <small>{claim.limitation}</small>
      <p className="memory-links">
        {claim.evidence.map((id) => (
          <a key={id} href={"#source-" + id}>
            {id} ↗
          </a>
        ))}
      </p>
      {claim.decision && (
        <div className="memory-saved">
          <b>{label(claim.decision.outcome)}</b> · {claim.decision.rationale}
          <small>
            {claim.decision.actor} · simulated reviewer ·{" "}
            {new Date(claim.decision.at).toLocaleString()}
          </small>
        </div>
      )}
    </div>
  );
  return (
    <div className="memory-shell">
      <header className="memory-header">
        <Link href="/" className="brand">
          <span className="mark">m</span>molecule
        </Link>
        <Link href="/">Original concept ↗</Link>
      </header>
      <div className="memory-banner">
        <b>PERSISTENT SYNTHETIC PILOT</b> Server-saved records. Fixed example
        assessment—not AI research. Single signed-in owner; reviewer roles are
        simulated. Do not enter confidential material.
      </div>
      <main className="memory-main">
        <div className="memory-saved">
          <Link href="/research">
            NEW · Run the public-evidence demo: exendin-4 versus exendin-(9–39)
            →
          </Link>
        </div>
        <div className="memory-row memory-heading">
          <div>
            <span className="eyebrow">
              MOLECULE × VIVAMED · FOUNDATION V0.3
            </span>
            <h1>Science that carries forward.</h1>
            <p>
              Inspect the context. Review the assessment. Decide what the next
              run should remember.
            </p>
          </div>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() =>
              setRole((r) => (r === "scientist" ? "reviewer" : "scientist"))
            }
          >
            Demo {role} ⇄
          </button>
        </div>
        <div className="memory-row memory-toolbar">
          <span>
            {snapshot
              ? "Saved revision " + snapshot.revision + " · " + snapshot.actor
              : "Connecting to saved workspace…"}
          </span>
          <button
            className="text-button"
            onClick={() => void reload()}
            disabled={busy}
          >
            Reload saved state
          </button>
        </div>
        {error && (
          <div role="alert" className="memory-error">
            {error} Your unsaved rationale is still here.
          </div>
        )}
        {notice && (
          <div role="status" className="memory-saved">
            {notice}
          </div>
        )}
        <div className="memory-stats">
          <div>
            <b>{state?.runs.length ?? "—"}</b> saved runs
          </div>
          <div>
            <b>{state?.knowledge.length ?? "—"}</b> approved claims
          </div>
          <div>
            <b>03</b> synthetic evidence records
          </div>
        </div>
        <nav className="memory-tabs" aria-label="Memory workspace">
          {(
            ["Assessment", "Knowledge", "Integrations", "History"] as Tab[]
          ).map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="memory-grid">
          <section>
            {tab === "Integrations" && (
              <div className="memory-card">
                <span className="eyebrow">
                  OPENRESEARCH · SYNTHETIC INTEGRATION TEST
                </span>
                <h2>A real run. A separate review.</h2>
                <p>
                  Import the captured result of the verified OpenResearch 0.2.4
                  test. This is a saved result package—not a live connection or
                  a new execution.
                </p>
                <p>
                  Three synthetic numbers produced a mean of 0.2. This tests
                  execution and provenance, not biology. Accepting it does not
                  add scientific claims or change assessment context.
                </p>
                {!state?.externalEvidence?.length && (
                  <button
                    className="primary"
                    disabled={!snapshot || busy || role !== "scientist"}
                    onClick={() => void act("import_external")}
                  >
                    Import verified test result
                  </button>
                )}
                {state?.externalEvidence?.map((record) => (
                  <div className="memory-claim" key={record.id}>
                    <span className="outline-tag">{record.status}</span>
                    <p>
                      Imported by {record.importedBy} ·{" "}
                      {new Date(record.importedAt).toLocaleString()}
                    </p>
                    {record.decision ? (
                      <div className="memory-saved">
                        {record.decision.rationale}
                        <small>
                          {record.decision.actor} · simulated reviewer ·{" "}
                          {new Date(record.decision.at).toLocaleString()}
                        </small>
                      </div>
                    ) : (
                      <>
                        {rationale(record.id, "Integration review rationale")}
                        <div className="memory-actions">
                          <button
                            className="primary"
                            disabled={busy || role !== "reviewer"}
                            onClick={() =>
                              void act("review_external", {
                                runId: record.id,
                                outcome: "accepted",
                                rationale: notes[record.id],
                              })
                            }
                          >
                            Accept integration test
                          </button>
                          <button
                            className="outline-button"
                            disabled={busy || role !== "reviewer"}
                            onClick={() =>
                              void act("review_external", {
                                runId: record.id,
                                outcome: "rejected",
                                rationale: notes[record.id],
                              })
                            }
                          >
                            Reject integration test
                          </button>
                        </div>
                        <small>
                          Switch to Demo reviewer to decide. This is a simulated
                          role, not independent second-person approval.
                        </small>
                      </>
                    )}
                  </div>
                ))}
                <details open>
                  <summary>Captured result and provenance</summary>
                  <p>Run: {openResearchFixture.provenance.runId}</p>
                  <p>
                    Source commit: {openResearchFixture.provenance.commitSha}
                  </p>
                  <small>
                    Hashes identify captured bytes; they do not independently
                    authenticate the service.
                  </small>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(openResearchFixture, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            {tab === "Assessment" && (
              <>
                <div className="memory-card">
                  <div className="memory-row">
                    <span className="eyebrow">
                      {program.id} · {program.name}
                    </span>
                    {run && (
                      <span className="outline-tag">{label(run.state)}</span>
                    )}
                  </div>
                  <h2>What do we actually know about these candidates?</h2>
                  <p>
                    The same fixed synthetic findings are used on every run. The
                    changing part is the saved context and explicitly approved
                    knowledge—not model learning.
                  </p>
                  {state && state.runs.length > 0 && (
                    <label className="memory-select">
                      Inspect saved run
                      <select
                        value={run?.id ?? ""}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {state.runs.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            Run {i + 1} · {label(r.state)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="primary"
                    disabled={!canStart}
                    onClick={() => void act("start")}
                  >
                    {busy
                      ? "Saving / loading…"
                      : "Prepare synthetic assessment"}
                  </button>
                  {!canStart && snapshot && (
                    <small className="memory-help">
                      {role !== "scientist"
                        ? "Switch to Demo scientist to start a new run."
                        : "Complete the open assessment review before starting another run."}
                    </small>
                  )}
                  {run && (
                    <small className="memory-help">
                      Run ID: {run.id} · created{" "}
                      {new Date(run.createdAt).toLocaleString()}
                    </small>
                  )}
                </div>
                {run && (
                  <div className="memory-card">
                    <h2>Assessment findings</h2>
                    {run.findings.map((f) => (
                      <div className="memory-claim" key={f.key}>
                        <span className="eyebrow">{f.kind}</span>
                        <p>{f.text}</p>
                        <small>{f.limitation}</small>
                        <p className="memory-links">
                          {f.evidence.map((id) => (
                            <a key={id} href={"#source-" + id}>
                              {id} ↗
                            </a>
                          ))}
                        </p>
                      </div>
                    ))}
                    {run.state === "awaiting_review" ? (
                      <>
                        {rationale("run-" + run.id, "Assessment rationale")}
                        <div className="memory-actions">
                          <button
                            className="primary"
                            disabled={busy}
                            onClick={() =>
                              void act("review", {
                                runId: run.id,
                                outcome: "accepted",
                                rationale: notes["run-" + run.id],
                              })
                            }
                          >
                            Accept assessment
                          </button>
                          <button
                            className="outline-button"
                            disabled={busy}
                            onClick={() =>
                              void act("review", {
                                runId: run.id,
                                outcome: "changes_requested",
                                rationale: notes["run-" + run.id],
                              })
                            }
                          >
                            Request changes
                          </button>
                        </div>
                        <small>
                          Requires Demo reviewer and a rationale. Acceptance
                          does not approve knowledge or advance a candidate.
                        </small>
                      </>
                    ) : (
                      <div className="memory-saved">
                        <b>{label(run.state)}</b>
                        <p>{run.decision?.rationale}</p>
                        <small>
                          {run.decision?.actor} · simulated reviewer
                        </small>
                        {run.state === "changes_requested" && (
                          <p>
                            No findings have been revised automatically. A new
                            synthetic run repeats the fixture and includes this
                            review outcome.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {run && (
                  <div className="memory-card">
                    <h2>Proposed knowledge updates</h2>
                    <p>
                      Each decision is separate. Only approved updates enter the
                      next run’s knowledge context.
                    </p>
                    {run.updates.length === 0 && (
                      <p>
                        No new proposals: both fixture claims are already
                        approved.
                      </p>
                    )}
                    {run.updates.map((u) => (
                      <div key={u.id}>
                        {claimCard(u)}
                        {u.status === "proposed" &&
                          run.state === "accepted" && (
                            <>
                              {rationale(
                                u.id,
                                "Rationale for " + u.kind + " update",
                              )}
                              <div className="memory-actions">
                                <button
                                  className="primary"
                                  disabled={busy}
                                  onClick={() =>
                                    void act("knowledge", {
                                      runId: run.id,
                                      updateId: u.id,
                                      outcome: "approved",
                                      rationale: notes[u.id],
                                    })
                                  }
                                >
                                  Approve {u.kind} update
                                </button>
                                <button
                                  className="outline-button"
                                  disabled={busy}
                                  onClick={() =>
                                    void act("knowledge", {
                                      runId: run.id,
                                      updateId: u.id,
                                      outcome: "rejected",
                                      rationale: notes[u.id],
                                    })
                                  }
                                >
                                  Reject {u.kind} update
                                </button>
                              </div>
                            </>
                          )}
                      </div>
                    ))}
                    {run.state !== "accepted" && (
                      <small>
                        Updates cannot be promoted unless this assessment is
                        accepted.
                      </small>
                    )}
                  </div>
                )}
              </>
            )}
            {tab === "Knowledge" && (
              <div className="memory-card">
                <span className="eyebrow">
                  APPROVED FOR THIS SYNTHETIC WORKSPACE
                </span>
                <h2>What the next run can use.</h2>
                <p>
                  These are reviewed, evidence-linked claims—not unquestionable
                  facts. Conflicting observations and missing evidence remain
                  visible.
                </p>
                {!state?.knowledge.length && (
                  <p>
                    No approved knowledge yet. Accept an assessment, then
                    approve individual updates.
                  </p>
                )}
                {state?.knowledge.map(claimCard)}
              </div>
            )}
            {tab === "History" && (
              <div className="memory-card">
                <h2>Saved decision trail</h2>
                <p>
                  Server-persisted events for this signed-in owner. Not an
                  immutable or externally notarized audit ledger.
                </p>
                {!state?.events.length && <p>No saved events yet.</p>}
                {state?.events
                  .slice()
                  .reverse()
                  .map((e) => (
                    <div className="memory-event" key={e.id}>
                      <b>{e.action}</b>
                      <p>{e.rationale}</p>
                      <small>
                        {new Date(e.at).toLocaleString()} · {e.actor}
                      </small>
                      <button
                        className="text-button"
                        onClick={() => {
                          if (e.action.startsWith("challenge_")) {
                            window.location.assign("/challenge");
                            return;
                          }
                          if (e.action.startsWith("research_")) {
                            window.location.assign(
                              "/research?run=" + encodeURIComponent(e.runId),
                            );
                            return;
                          }
                          setSelected(e.runId);
                          setTab(
                            e.action.startsWith("import_external") ||
                              e.action.startsWith("review_external")
                              ? "Integrations"
                              : "Assessment",
                          );
                        }}
                      >
                        Inspect run ↗
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </section>
          <aside className="memory-context">
            <div className="memory-card">
              <span className="eyebrow">
                {run ? "FROZEN AT RUN CREATION" : "PREVIEW FOR FIRST RUN"}
              </span>
              <h2>Context used</h2>
              <p>
                {run
                  ? "Later approvals do not rewrite this snapshot."
                  : "The first run starts without approved knowledge."}
              </p>
              <details open>
                <summary>
                  Approved knowledge included (
                  {context.approvedKnowledge.length})
                </summary>
                {context.approvedKnowledge.length ? (
                  context.approvedKnowledge.map((k) => (
                    <div className="memory-claim" key={k.id}>
                      <p>{k.text}</p>
                      <small>
                        Approved by {k.decision?.actor} ·{" "}
                        {k.decision?.rationale}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>No approved claims in this snapshot.</p>
                )}
              </details>
              <details>
                <summary>Standards and procedure</summary>
                <p>{context.standards.id}</p>
                <small>{context.standards.status}</small>
                <ul>
                  {context.standards.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p>{context.procedure.id}</p>
                <ol>
                  {context.procedure.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </details>
              <details open>
                <summary>Exact evidence versions</summary>
                {context.sources.map((s) => (
                  <article
                    className="memory-source"
                    id={"source-" + s.id}
                    key={s.id}
                  >
                    <b>
                      {s.id} · {s.title}
                    </b>
                    <small>
                      Version {s.version} · {s.locator}
                    </small>
                    <p>{s.text}</p>
                  </article>
                ))}
              </details>
              <details>
                <summary>
                  Previous outcomes ({context.previousOutcomes.length})
                </summary>
                {context.previousOutcomes.map((o) => (
                  <p key={o.id}>
                    {label(o.state)} · {o.rationale || "No review rationale."}
                  </p>
                ))}
              </details>
              <details>
                <summary>Excluded from context</summary>
                <ul>
                  {context.omissions.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </details>
            </div>
          </aside>
        </div>
        <footer className="memory-footer">
          Durable memory demonstration · no external AI calls · no confidential
          evidence · no real multi-user review yet
        </footer>
      </main>
    </div>
  );
}
