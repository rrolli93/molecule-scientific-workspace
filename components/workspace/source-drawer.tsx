import { useEffect, useRef } from "react";
import type { Evidence } from "../../lib/workspace/core";

export default function SourceDrawer({
  source,
  workspaceName,
  programName,
  related,
  inspect,
  close,
}: {
  source: Evidence;
  workspaceName: string;
  programName: string;
  related: Evidence[];
  inspect: (e: Evidence) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    dialog.current
      ?.querySelector<HTMLButtonElement>(".ws-drawer-close")
      ?.focus();
  }, [source.id]);
  function dismiss() {
    dialog.current?.close();
    close();
  }
  return (
    <dialog
      ref={dialog}
      className="ws-source-drawer"
      aria-labelledby="source-drawer-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="ws-drawer-content">
        <div className="ws-row">
          <span className="ws-kicker">SOURCE RECORD / {source.id}</span>
          <button
            className="ws-drawer-close"
            onClick={dismiss}
            aria-label="Close source"
          >
            ×
          </button>
        </div>
        <div className="ws-drawer-location">
          {workspaceName} / {programName}
        </div>
        <h2 id="source-drawer-title">{source.title}</h2>
        <div className="ws-chips">
          <span className="ws-tag">Synthetic</span>
          <span className="ws-tag">Original fixture</span>
          <span className="ws-tag ws-tag-warm">Unreviewed</span>
        </div>
        <dl className="ws-source-receipt">
          <div>
            <dt>Record identity</dt>
            <dd>
              {source.id} / version {source.version}
            </dd>
          </div>
          <div>
            <dt>Candidate scope</dt>
            <dd>
              {source.candidateId === "candidate-a"
                ? "Candidate A"
                : "Candidate B"}
            </dd>
          </div>
          <div>
            <dt>Evidence origin</dt>
            <dd>Synthetic demonstration fixture</dd>
          </div>
        </dl>
        <div className="ws-drawer-source">
          <span className="ws-kicker">EXACT SOURCE TEXT</span>
          <blockquote>{source.text}</blockquote>
          <p>
            Version {source.version} · {source.locator}
          </p>
        </div>
        <div className="ws-callout">
          <strong>Source text ≠ scientific conclusion</strong>
          <p>
            No real assay or publication is represented. Opening this record
            does not approve it or resolve the evidence gap.
          </p>
        </div>
        {related.length > 0 && (
          <div className="ws-related">
            <span className="ws-kicker">READ ALONGSIDE THIS SOURCE</span>
            {related.map((e) => (
              <button
                className="ws-source-row"
                key={e.id}
                onClick={() => inspect(e)}
              >
                <span className="ws-source-id">{e.id}</span>
                <span>
                  <strong>{e.title}</strong>
                  <small>Same candidate · inspect the other condition</small>
                </span>
                <span>↗</span>
              </button>
            ))}
          </div>
        )}
        <button className="ws-button secondary" onClick={dismiss}>
          Return to investigation →
        </button>
      </div>
    </dialog>
  );
}
