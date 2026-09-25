"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  question,
  nextExperiment,
  selectedSources,
  approvedResearchClaims,
} from "../../lib/research-demo";
import type { MemoryState, Command } from "../../lib/memory";
import "../memory/memory.css";
type Snapshot = { state: MemoryState; revision: number; actor: string };
export default function ResearchDemo() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [role, setRole] = useState<"scientist" | "reviewer">("scientist");
  const [selected, setSelected] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function reload() {
    try {
      const r = await fetch("/api/memory", { cache: "no-store" });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Read failed");
    }
  }
  useEffect(() => {
    setSelected(new URLSearchParams(window.location.search).get("run") ?? "");
    void reload();
  }, []);
  async function act(action: Command["action"], extra: Partial<Command> = {}) {
    if (!snapshot || busy) return;
    setBusy(true);
    setError("");
    setNotice(
      action === "research_start"
        ? "Fetching three primary records from Europe PMC. No model or laboratory job is running."
        : "Saving your decision…",
    );
    try {
      const id = crypto.randomUUID();
      const r = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extra,
          id,
          revision: snapshot.revision,
          action,
          role,
        }),
      });
      const d = (await r.json()) as Snapshot & { error?: string };
      if (!r.ok) throw Error(d.error);
      setSnapshot(d);
      if (action === "research_start") setSelected(id);
      setNotice(
        action === "research_start"
          ? "Retrieval attempt saved. Inspect the actual statuses below."
          : "Decision saved. Only approved claims enter a later run’s context.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setNotice("");
    } finally {
      setBusy(false);
    }
  }
  const runs = snapshot?.state.researchRuns ?? [];
  const run = runs.find((r) => r.id === selected) ?? runs.at(-1);
  const pending = runs.some((r) =>
    r.claims.some((c) => c.status === "proposed"),
  );
  const approved = approvedResearchClaims(runs);
  return (
    <div className="memory-shell">
      <header className="memory-header">
        <Link href="/memory" className="brand">
          <span className="mark">m</span>molecule
        </Link>
        <Link href="/memory">Saved workspace ↗</Link>
      </header>
      <div className="memory-banner">
        <b>PUBLIC-EVIDENCE DEMO</b> Live record retrieval · prepared
        interpretation · human review. No client data. Not clinical guidance.
      </div>
      <main className="memory-main">
        <div className="memory-saved">
          <Link href="/challenge">
            New · inspect the real OpenScience evidence challenge →
          </Link>
          <small>
            Two source-scoped proposals, one excluded citation error. Captured
            run; human approval required.
          </small>
        </div>
        <div className="memory-row memory-heading">
          <div>
            <span className="eyebrow">MOLECULE × VIVAMED · WORKFLOW DEMO</span>
            <h1>Binding is not the whole story.</h1>
            <p>Exendin-4 and exendin-(9–39) · GLP-1 receptor</p>
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
              ? "Saved revision " + snapshot.revision + " · " + snapshot.actor
              : "Connecting…"}
          </span>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void reload()}
          >
            Reload saved state
          </button>
        </div>
        {error && (
          <div className="memory-error" role="alert">
            {error} No success is assumed. Reload to check saved state.
          </div>
        )}
        {notice && (
          <div className="memory-saved" role="status">
            {notice}
          </div>
        )}
        <div className="memory-grid">
          <section>
            <div className="memory-card">
              <span className="eyebrow">1 · QUESTION AND SCOPE</span>
              <h2>{question}</h2>
              <p>
                Retrieve three selected primary-study abstracts, distinguish
                binding from functional measurements, then review three proposed
                claims. This is a targeted teaching example, not an exhaustive
                literature search.
              </p>
              <p>
                <b>What actually runs:</b> three server-side Europe PMC
                requests, identifier and abstract-fingerprint checks, saved
                source receipts, review and context snapshots. No new
                model-generated synthesis.
              </p>
              <button
                className="primary"
                disabled={
                  !snapshot ||
                  busy ||
                  role !== "scientist" ||
                  pending ||
                  runs.length >= 20
                }
                onClick={() => void act("research_start")}
              >
                {busy
                  ? "Request in progress…"
                  : runs.length
                    ? "Rerun with approved context"
                    : "Run public-evidence demo"}
              </button>
              {pending && (
                <p>
                  Approve or reject all proposed claims, then switch to Demo
                  scientist to rerun.
                </p>
              )}
              {runs.length > 0 && (
                <label className="memory-select">
                  Inspect research run
                  <select
                    value={run?.id}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {runs.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        Run {i + 1} · {r.status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="memory-card">
              <span className="eyebrow">2 · ACTUAL RETRIEVAL TRACE</span>
              <h2>
                {run
                  ? run.status === "ready_for_review"
                    ? "Three source versions verified."
                    : "Retrieval needs attention."
                  : "Ready to retrieve primary records."}
              </h2>
              <p>
                Each new run contacts Europe PMC. No cached success is
                substituted if retrieval fails. Changed abstracts withhold the
                prepared claims until the source is reviewed again.
              </p>
              {!run &&
                selectedSources.map((s) => (
                  <p key={s.id}>
                    <a
                      href={"https://pubmed.ncbi.nlm.nih.gov/" + s.id + "/"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.label} ↗
                    </a>{" "}
                    · not yet fetched in this workspace
                  </p>
                ))}
              {run?.sources.map((s) => (
                <article
                  className="memory-claim"
                  id={"source-" + s.id}
                  key={s.id}
                >
                  <div className="memory-row">
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label} ↗
                    </a>
                    <span className="outline-tag">{s.status}</span>
                  </div>
                  <p>{s.title}</p>
                  <small>
                    {s.retrievedAt} · HTTP {s.httpStatus ?? "unavailable"} ·
                    PMID {s.id}
                  </small>
                  {s.error && <p role="alert">{s.error}</p>}
                  <details>
                    <summary>Provenance receipt</summary>
                    <p>DOI: {s.doi ?? "unavailable"}</p>
                    <p style={{ overflowWrap: "anywhere" }}>
                      Abstract SHA-256: {s.abstractSha256 ?? "unavailable"}
                    </p>
                    <a href={s.endpoint} target="_blank" rel="noreferrer">
                      Inspect public API record ↗
                    </a>
                    <p>
                      Abstract only; full text and raw experimental measurements
                      were not retrieved. A hash identifies bytes, not
                      scientific validity.
                    </p>
                  </details>
                </article>
              ))}
            </div>
            {run && (
              <div className="memory-card">
                <span className="eyebrow">3 · INTERPRETATION AND REVIEW</span>
                <h2>What does the evidence support?</h2>
                <p>
                  Prepared by Codex from the selected abstracts; displayed only
                  when all three retrieved versions match. Review against the
                  linked sources. Roles are simulated for your single signed-in
                  account.
                </p>
                {!run.claims.length && (
                  <p>
                    No claims proposed: source retrieval or version verification
                    failed.
                  </p>
                )}
                {run.claims.map((c) => (
                  <article className="memory-claim" key={c.key}>
                    <div className="memory-row">
                      <span className="eyebrow">{c.kind}</span>
                      <span className="outline-tag">{c.status}</span>
                    </div>
                    <p>{c.text}</p>
                    <small>{c.limitation}</small>
                    <p className="memory-links">
                      {c.evidence.map((id) => (
                        <a href={"#source-" + id} key={id}>
                          PMID {id} ↗
                        </a>
                      ))}
                    </p>
                    {c.decision ? (
                      <div className="memory-saved">
                        {c.decision.rationale}
                        <small>
                          {c.decision.actor} · {c.decision.at}
                        </small>
                      </div>
                    ) : (
                      <>
                        <label className="memory-note">
                          Review rationale: {c.key}
                          <textarea
                            maxLength={2000}
                            value={notes[c.key] ?? ""}
                            onChange={(e) =>
                              setNotes({ ...notes, [c.key]: e.target.value })
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
                                  !notes[c.key]?.trim()
                                }
                                onClick={() =>
                                  void act("research_review", {
                                    runId: run.id,
                                    updateId: c.key,
                                    outcome,
                                    rationale: notes[c.key],
                                  })
                                }
                              >
                                {outcome === "approved"
                                  ? "Approve claim"
                                  : "Reject claim"}
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="memory-card">
              <span className="eyebrow">NEXT EXPERIMENT · PROPOSAL ONLY</span>
              <p>{nextExperiment}</p>
              <p>
                No potency calculation was run: these retrieved abstracts do not
                supply matched raw dose-response data. The earlier OpenResearch
                arithmetic test is not biological validation.
              </p>
            </div>
          </section>
          <aside className="memory-context">
            <div className="memory-card">
              <span className="eyebrow">4 · MEMORY YOU CAN INSPECT</span>
              <h2>Context carried forward</h2>
              <p>
                {run
                  ? "Frozen when this run started. Later decisions do not rewrite it."
                  : "The first run starts without approved public-evidence claims."}
              </p>
              <p>
                <b>{run?.context.approvedClaims.length ?? 0}</b> approved claims
                in this run’s context
              </p>
              {run?.context.approvedClaims.map((c) => (
                <div className="memory-claim" key={c.key}>
                  <p>{c.text}</p>
                  <small>{c.decision?.rationale}</small>
                </div>
              ))}
              <p>
                <b>{approved.length}</b> approved claims currently available for
                the next run
              </p>
              <details>
                <summary>
                  Approved challenge additions in this snapshot (
                  {run?.context.approvedChallengeClaims?.length ?? 0})
                </summary>
                {(run?.context.approvedChallengeClaims ?? []).map((c) => (
                  <div className="memory-claim" key={c.key}>
                    <p>{c.text}</p>
                    <small>{c.limitation}</small>
                    <p>
                      <a href={`https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}>
                        PMID {c.pmid} ↗
                      </a>
                    </p>
                  </div>
                ))}
                <small>
                  Captured-source context only. These additional abstracts are
                  not re-fetched by this button; the original run receipt
                  remains on the challenge page.
                </small>
              </details>
              <p>
                Rerunning retrieves the same selected sources afresh and
                attaches approved context. It does not retrain a model or invent
                a changed answer. Public-evidence memory stays separate from the
                fictional candidate demo.
              </p>
            </div>
            <div className="memory-card">
              <h2>Connection status</h2>
              <p>
                <b>Europe PMC:</b> live public record retrieval.
              </p>
              <p>
                <b>Parallel search:</b> used during preparation; not connected
                to this button.
              </p>
              <p>
                <b>OpenResearch:</b> captured arithmetic test only; no
                scientific job in this workflow.
              </p>
              <p>
                <b>OpenScience / Ace:</b> local agent run completed using the
                existing OpenRouter key.{" "}
                <Link href="/challenge">Inspect captured results →</Link> Not a
                live hosted agent connection.
              </p>
              <p>
                <b>Paperclip:</b> no configured credential.
              </p>
              <p>
                <b>Hermes / Qdrant:</b> not used.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
