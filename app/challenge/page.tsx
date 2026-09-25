"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  challengePackage as pack,
  approvedChallengeClaims,
} from "../../lib/challenge-package";
import type { MemoryState, Command } from "../../lib/memory";
import "../memory/memory.css";
type Snapshot = { state: MemoryState; revision: number; actor: string };
export default function ChallengePage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [role, setRole] = useState<"scientist" | "reviewer">("scientist");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function reload() {
    try {
      const r = await fetch("/api/memory", { cache: "no-store" });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Read failed");
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function act(action: Command["action"], extra: Partial<Command> = {}) {
    if (!snapshot || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extra,
          id: crypto.randomUUID(),
          revision: snapshot.revision,
          action,
          role,
        }),
      });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  const record = snapshot?.state.challengeRecords?.find(
    (r) => r.id === pack.id,
  );
  const approved = approvedChallengeClaims(snapshot?.state.challengeRecords);
  return (
    <div className="memory-shell">
      <header className="memory-header">
        <Link href="/memory" className="brand">
          <span className="mark">m</span>molecule
        </Link>
        <Link href="/research">Public-evidence workflow ↗</Link>
      </header>
      <div className="memory-banner">
        <b>REAL AGENT · CAPTURED RUN</b> Public literature only. Local
        execution, source checking, human review. No clinical guidance.
      </div>
      <main className="memory-main">
        <div className="memory-row memory-heading">
          <div>
            <span className="eyebrow">
              MOLECULE × VIVAMED · EVIDENCE CHALLENGE
            </span>
            <h1>
              Challenge the conclusion.
              <br />
              Keep the evidence.
            </h1>
            <p>
              What changes when an agent checks the limits of our approved
              claims?
            </p>
          </div>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() =>
              setRole(role === "scientist" ? "reviewer" : "scientist")
            }
          >
            Demo {role} ⇄
          </button>
        </div>
        <div className="memory-row memory-toolbar">
          <span>
            {snapshot
              ? `Saved revision ${snapshot.revision} · ${snapshot.actor}`
              : "Loading saved workspace…"}
          </span>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() => void reload()}
          >
            Reload saved state
          </button>
        </div>
        {error && (
          <div role="alert" className="memory-error">
            {error}
          </div>
        )}
        <div className="memory-stats">
          <span>
            <b>02</b> source-scoped proposals
          </span>
          <span>
            <b>01</b> citation error excluded
          </span>
          <span>
            <b>{approved.length}</b> approved by you
          </span>
        </div>
        <div className="memory-grid">
          <section>
            <div className="memory-card">
              <span className="eyebrow">1 · THE ACTUAL RESULT</span>
              <h2>No direct contradiction established.</h2>
              <p>{pack.summary}</p>
              <p>
                The agent generated the draft; Codex checked it against the
                returned abstracts and narrowed two proposals. The original
                claims remain unchanged.
              </p>
              {!record ? (
                <>
                  <button
                    className="primary"
                    disabled={!snapshot || busy || role !== "scientist"}
                    onClick={() => void act("challenge_import")}
                  >
                    Add package to review queue
                  </button>
                  <small className="memory-help">
                    Saves this captured result, not an approval or another paid
                    agent run. Use Demo scientist to import.
                  </small>
                </>
              ) : (
                <div className="memory-saved">
                  Package saved · {record.importedAt}
                  <small>
                    Switch to Demo reviewer and decide each proposal. Roles are
                    simulated for your single signed-in account.
                  </small>
                </div>
              )}
            </div>
            <div className="memory-card">
              <span className="eyebrow">
                2 · REVIEW THE QUALIFIED PROPOSALS
              </span>
              {pack.proposals.map((p) => {
                const saved = record?.claims.find((c) => c.key === p.key);
                return (
                  <article className="memory-claim" key={p.key}>
                    <div className="memory-row">
                      <small>{p.relationship}</small>
                      <span className="badge">
                        {saved?.status ?? "preview · not imported"}
                      </span>
                    </div>
                    <h2>{p.title}</h2>
                    <p>{p.text}</p>
                    <p>
                      <strong>Limit:</strong> {p.limitation}
                    </p>
                    <small>{p.qa}</small>
                    <p>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PMID {p.pmid} ↗
                      </a>
                    </p>
                    <details>
                      <summary>Source identity and version</summary>
                      <p>{p.sourceTitle}</p>
                      <small>
                        DOI {p.doi}
                        <br />
                        SHA-256 of the retrieved abstract text:{" "}
                        {p.abstractSHA256}
                      </small>
                    </details>
                    {saved?.status === "proposed" && (
                      <>
                        <label className="memory-note">
                          Review rationale: {p.title}
                          <textarea
                            disabled={busy || role !== "reviewer"}
                            value={notes[p.key] ?? ""}
                            onChange={(e) =>
                              setNotes({ ...notes, [p.key]: e.target.value })
                            }
                          />
                        </label>
                        <div className="memory-actions">
                          {(["approved", "rejected"] as const).map(
                            (outcome) => (
                              <button
                                key={outcome}
                                className={
                                  outcome === "approved"
                                    ? "primary"
                                    : "outline-button"
                                }
                                disabled={
                                  busy ||
                                  role !== "reviewer" ||
                                  !notes[p.key]?.trim()
                                }
                                onClick={() =>
                                  void act("challenge_review", {
                                    runId: record?.id,
                                    updateId: p.key,
                                    outcome,
                                    rationale: notes[p.key],
                                  })
                                }
                              >
                                {outcome === "approved"
                                  ? "Approve proposal"
                                  : "Reject proposal"}
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    )}
                    {saved?.decision && (
                      <div className="memory-saved">
                        {saved.decision.rationale}
                        <small>
                          {saved.decision.actor} · {saved.decision.at}
                        </small>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <div className="memory-card">
              <span className="eyebrow">3 · EXCLUDED, NOT HIDDEN</span>
              <h2>{pack.quarantined[0].title}</h2>
              <p>{pack.quarantined[0].reason}</p>
              <p>
                No approve button: this draft failed citation and source-type
                checks.
              </p>
              <details>
                <summary>Inspect the original faulty citation</summary>
                <p>
                  Agent supplied PMID {pack.quarantined[0].rawProposal.pmid},
                  DOI {pack.quarantined[0].rawProposal.doi}, and title “
                  {pack.quarantined[0].rawProposal.title}”. These do not
                  identify the same record.
                </p>
              </details>
            </div>
          </section>
          <aside>
            <div className="memory-card memory-context">
              <span className="eyebrow">EXECUTION RECEIPT</span>
              <h2>What actually ran</h2>
              <p>
                {pack.runtime} → existing OpenRouter key → {pack.model} → Europe
                PMC
              </p>
              <p>
                {pack.calls} model requests · 2 literature requests · 8 returned
                records · 6 abstracts
              </p>
              <p>
                Provider-reported model cost: ${pack.costUSD.toFixed(5)} for
                this run; ${pack.totalAttemptCostUSD.toFixed(5)} including the
                two excluded attempts. Earlier setup tests are not included.
              </p>
              <small>
                {pack.createdAt}
                <br />
                {pack.sessionId}
              </small>
              <p>{pack.mode} No key is shipped to this browser or site.</p>
              <details>
                <summary>Input context</summary>
                <p>{pack.inputContext}</p>
                <p>
                  Original studies: PMID 8405712, 8396143, 7937318. No client
                  documents were sent.
                </p>
              </details>
              {pack.searches.map((s, i) => (
                <details key={s.url}>
                  <summary>
                    Search {i + 1} · {s.returned.length} records returned
                  </summary>
                  <p>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      Inspect Europe PMC query ↗
                    </a>
                  </p>
                  <small>
                    Completed {s.at}. API reported {s.totalHits} total hits;
                    only four were retrieved.
                  </small>
                  {s.returned.map((r) => (
                    <p key={r.pmid}>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PMID {r.pmid} ↗
                      </a>{" "}
                      · {r.hasAbstract ? "abstract returned" : "no abstract"}
                    </p>
                  ))}
                </details>
              ))}
              <details>
                <summary>Failed attempts and safeguards</summary>
                {pack.priorFailures.map((f) => (
                  <p key={f.stage}>
                    <strong>{f.stage}:</strong> {f.result}
                  </p>
                ))}
                <p>
                  Europe PMC-only webfetch permissions, no shell or delegated
                  agents, capped model calls and output. Neither excluded
                  attempt enters knowledge.
                </p>
              </details>
            </div>
            <div className="memory-card">
              <span className="eyebrow">COVERAGE LIMITS</span>
              <p>{pack.coverage}</p>
            </div>
            <div className="memory-card">
              <span className="eyebrow">4 · WHAT CARRIES FORWARD</span>
              <h2>{approved.length} approved additions</h2>
              <p>
                Only proposals you approve are attached as a separate frozen
                context section to the next public-evidence run. Rejected,
                pending and quarantined text is excluded.
              </p>
              <p>
                The current public workflow still uses prepared interpretation.
                This does not make it live agent orchestration or retrain a
                model.
              </p>
              <Link href="/research">Return to public-evidence workflow →</Link>
            </div>
          </aside>
        </div>
        <footer className="memory-footer">
          Scientific-critical-thinking checks: source identity, experimental
          scope, direct versus indirect evidence. No automated approval.
          Existing knowledge is preserved.
        </footer>
      </main>
    </div>
  );
}
