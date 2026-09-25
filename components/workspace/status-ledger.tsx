"use client";

import type { CanonicalState } from "../../lib/workspace/core";
import "./status-ledger.css";

/**
 * The reconciled state as a bound-notebook ledger.
 *
 * Every line carries its own evidential standing in the left margin, because
 * the single discipline this programme runs on is not collapsing "quoted" into
 * "paid" into "received" into "measured". The margin word is the point; the
 * item is secondary. Read as a column, it answers "where does this stand"
 * without opening anything.
 */

const LABEL: Record<string, string> = {
  recorded: "recorded",
  unconfirmed: "not confirmed",
  open: "open",
  absent: "no result",
  unclassified: "stated",
};

export default function StatusLedger({
  state,
  onOpen,
}: {
  state: CanonicalState;
  onOpen?: () => void;
}) {
  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title" className="ledger-title">
        Where it stands
      </h2>
      <ol className="ledger-rows">
        {state.rows.map((row) => (
          <li key={row.item} className={`ledger-row is-${row.confidence}`}>
            <span className="ledger-mark" aria-hidden="true" />
            <span className="ledger-status">{LABEL[row.confidence]}</span>
            <span className="ledger-item">{row.item}</span>
            <span className="ledger-said">{row.state}</span>
          </li>
        ))}
      </ol>
      <p className="ledger-foot">
        <span>
          Reconciled {state.reconciledOn.replace(/\.$/, "")} from{" "}
          <code>{state.sourcePath}</code>
        </span>
        {onOpen && (
          <button type="button" onClick={onOpen}>
            Read the basis for each
          </button>
        )}
      </p>
    </section>
  );
}
