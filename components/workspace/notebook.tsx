"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ContextPacket,
  Notebook,
  Brief,
} from "../../lib/workspace/notebook";
import "./notebook.css";

type Saved = {
  revision: number;
  state: Notebook;
  actor: string;
  mode: "local-demo" | "owner-private";
};
async function savedResponse(
  response: Response,
  workspaceId: string,
): Promise<Saved> {
  const value = (await response.json()) as Partial<Saved> & { error?: string };
  if (!response.ok)
    throw new Error(
      value.error || "Notebook request failed. Reload to verify saved state.",
    );
  if (
    !Number.isSafeInteger(value.revision) ||
    !value.state ||
    value.state.workspaceId !== workspaceId ||
    !Array.isArray(value.state.briefs) ||
    !Array.isArray(value.state.events) ||
    typeof value.actor !== "string" ||
    !["local-demo", "owner-private"].includes(value.mode ?? "")
  )
    throw new Error("Invalid notebook response. No success is assumed.");
  return value as Saved;
}
export function ResearchNotebook({
  workspaceId,
  packet,
}: {
  workspaceId: string;
  packet: ContextPacket | null;
}) {
  // Keyed child prevents a late response from crossing workspace boundaries.
  return (
    <NotebookPanel
      key={workspaceId}
      workspaceId={workspaceId}
      packet={packet?.workspaceId === workspaceId ? packet : null}
    />
  );
}
function NotebookPanel({
  workspaceId,
  packet,
}: {
  workspaceId: string;
  packet: ContextPacket | null;
}) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [rationale, setRationale] = useState("");
  const [retryPending, setRetryPending] = useState(false);
  const alive = useRef(true);
  const locked = useRef(false);
  const pending = useRef<{ body: object; label: string } | null>(null);
  const load = useCallback(async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/workspace-notebook?workspaceId=${encodeURIComponent(workspaceId)}`,
        { cache: "no-store" },
      );
      const value = await savedResponse(response, workspaceId);
      if (alive.current) {
        setSaved(value);
        pending.current = null;
        setRetryPending(false);
      }
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error ? e.message : "Could not load saved briefs.",
        );
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }, [workspaceId]);
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [load]);
  async function send(body: object, label: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    pending.current = { body, label };
    setRetryPending(true);
    try {
      const response = await fetch("/api/workspace-notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok && response.status < 500) {
        pending.current = null;
        if (alive.current) setRetryPending(false);
      }
      const value = await savedResponse(response, workspaceId);
      if (alive.current) {
        setSaved(value);
        setMessage(label);
        setRationale("");
      }
      pending.current = null;
      if (alive.current) setRetryPending(false);
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Save not confirmed. Reload or retry safely.",
        );
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function save() {
    if (!saved || !packet) return;
    const commandId = crypto.randomUUID();
    setSelectedId(commandId);
    void send(
      {
        action: "save",
        commandId,
        revision: saved.revision,
        workspaceId,
        programId: packet.programId,
        candidateId: packet.candidateId,
        question: packet.question,
        evidenceIds: packet.sources.map((s) => s.id),
      },
      "Brief saved. Its source snapshot is frozen; no agent has run.",
    );
  }
  const briefs = saved?.state.briefs ?? [];
  const selected = briefs.find((b) => b.id === selectedId) ?? briefs.at(-1);
  function review(decision: "accepted" | "rejected") {
    if (!saved || !selected) return;
    void send(
      {
        action: "review",
        commandId: crypto.randomUUID(),
        revision: saved.revision,
        workspaceId,
        briefId: selected.id,
        decision,
        rationale,
      },
      `Brief ${decision}. Scientific claims were not promoted to approved knowledge.`,
    );
  }
  function download() {
    if (!saved) return;
    const { receipts: _receipts, ...state } = saved.state;
    void _receipts;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              ...state,
              revision: saved.revision,
              storageMode: saved.mode,
              warning:
                "Synthetic demonstration. Brief acceptance is not scientific validation, execution, or approved knowledge.",
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workspaceId}-research-notebook.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="nb" aria-labelledby="nb-title" aria-busy={busy}>
      <header className="nb-heading">
        <div>
          <span className="ws-kicker">LAB RECORD / PERSISTENT</span>
          <h2 id="nb-title">Research notebook</h2>
          <p>
            Save the question and exact evidence. Record your review without
            rewriting history.
          </p>
        </div>
        <span className="nb-revision">
          {saved
            ? `REV ${String(saved.revision).padStart(3, "0")}`
            : "NOT LOADED"}
        </span>
      </header>
      <p className="nb-boundary">
        {saved?.mode === "local-demo"
          ? "Local demonstration · saved on this computer · single local user, not team authentication. Use synthetic questions only."
          : saved?.mode === "owner-private"
            ? "Owner-private notebook · not a multi-user approval system."
            : "Loading saved records requires configured storage and access."}{" "}
        No provider receives these records.
      </p>
      <div className="nb-actions">
        <button
          className="ws-button"
          onClick={save}
          disabled={busy || !saved || !packet || retryPending}
        >
          Save current brief
        </button>
        <button
          className="ws-button secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          Reload saved briefs
        </button>
        <button
          className="ws-button secondary"
          onClick={download}
          disabled={!briefs.length || busy}
        >
          Export notebook
        </button>
      </div>
      {!packet && (
        <p className="nb-hint">
          Prepare a preview in Research &amp; design to save a new brief.
          Existing records remain available below.
        </p>
      )}
      {error && (
        <div role="alert" className="nb-error">
          {error}
          {retryPending && (
            <button
              className="ws-button secondary"
              disabled={busy}
              onClick={() => {
                const retry = pending.current;
                if (retry) void send(retry.body, retry.label);
              }}
            >
              Retry same save safely
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="nb-message">
          {message}
        </p>
      )}
      {!briefs.length ? (
        <div className="nb-empty">
          <span>01</span>
          <div>
            <h3>Your first durable research record</h3>
            <p>
              Prepare a brief → save its snapshot → record a reasoned review.
              Refreshing will not erase saved work.
            </p>
          </div>
        </div>
      ) : (
        <div className="nb-layout">
          <nav className="nb-list" aria-label="Saved research briefs">
            {[...briefs].reverse().map((brief, index) => (
              <button
                key={brief.id}
                aria-current={selected?.id === brief.id ? "true" : undefined}
                onClick={() => {
                  setSelectedId(brief.id);
                  setRationale("");
                }}
              >
                <span className="nb-list-meta">
                  RECORD {String(briefs.length - index).padStart(3, "0")}{" "}
                  <span>{brief.status}</span>
                </span>
                <strong>{brief.packet.question}</strong>
                <small>
                  {brief.packet.candidateId} · {brief.packet.sources.length}{" "}
                  sources
                </small>
              </button>
            ))}
          </nav>
          {selected && (
            <article className="nb-record">
              <div className="nb-record-top">
                <span
                  className={`ws-tag ws-tag-${selected.status === "accepted" ? "green" : "neutral"}`}
                >
                  {selected.status}
                </span>
                <time dateTime={selected.createdAt}>
                  {new Date(selected.createdAt).toLocaleString()}
                </time>
              </div>
              <h3>{selected.packet.question}</h3>
              <p className="nb-hint">
                {selected.packet.candidateId} · {selected.packet.programId} ·
                saved by {selected.createdBy}
              </p>
              <FrozenBrief brief={selected} />
              {selected.status === "draft" ? (
                <div className="nb-review">
                  <h4>Review the brief</h4>
                  <p>
                    Accept the scope and evidence package, or reject it. This
                    does not validate findings, approve claims, or authorize
                    execution.
                  </p>
                  <label htmlFor="nb-rationale">Review rationale</label>
                  <textarea
                    id="nb-rationale"
                    value={rationale}
                    maxLength={2000}
                    rows={3}
                    placeholder="What makes this brief suitable—or what needs to change?"
                    onChange={(e) => setRationale(e.target.value)}
                  />
                  <div className="nb-actions">
                    <button
                      className="ws-button"
                      onClick={() => review("accepted")}
                      disabled={busy || !rationale.trim() || retryPending}
                    >
                      Accept brief
                    </button>
                    <button
                      className="ws-button secondary"
                      onClick={() => review("rejected")}
                      disabled={busy || !rationale.trim() || retryPending}
                    >
                      Reject brief
                    </button>
                  </div>
                </div>
              ) : (
                <div className="nb-review">
                  <h4>Recorded review · {selected.review?.decision}</h4>
                  <p>{selected.review?.rationale}</p>
                  <small>
                    {selected.review?.actor} ·{" "}
                    {selected.review &&
                      new Date(selected.review.at).toLocaleString()}
                  </small>
                  <p className="nb-hint">
                    This decision is preserved. Save a new brief for a different
                    scope or decision.
                  </p>
                </div>
              )}
              <details className="nb-audit">
                <summary>Record history and integrity</summary>
                <code>SHA-256 {selected.digest}</code>
                <p>
                  Fingerprint of the frozen context JSON; not independent
                  scientific verification.
                </p>
                <ol>
                  {saved?.state.events
                    .filter((e) => e.briefId === selected.id)
                    .map((e) => (
                      <li key={e.id}>
                        {e.action} · {e.actor} ·{" "}
                        {new Date(e.at).toLocaleString()}
                      </li>
                    ))}
                </ol>
              </details>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
function FrozenBrief({ brief }: { brief: Brief }) {
  return (
    <div className="nb-snapshot">
      <p className="ws-kicker">FROZEN SOURCE SNAPSHOT</p>
      {brief.packet.sources.map((source) => (
        <details key={source.id}>
          <summary>
            {source.id} · {source.title} <span>v{source.version}</span>
          </summary>
          <p>{source.text}</p>
          <small>
            {source.origin} · {source.locator}
          </small>
        </details>
      ))}
      {brief.packet.warnings.map((w) => (
        <p className="nb-warning" key={w}>
          {w}
        </p>
      ))}
      {brief.packet.omissions.length > 0 && (
        <p>Omitted: {brief.packet.omissions.map((o) => o.id).join(", ")}</p>
      )}
      <small>
        Standards: {brief.packet.standards.version} · demonstration, not client
        policy. No approved knowledge included.
      </small>
    </div>
  );
}
