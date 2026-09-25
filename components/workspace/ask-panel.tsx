"use client";

import { useState } from "react";
import type { Audience, Program } from "../../lib/workspace/core";
import {
  answerQuestion,
  suggestedQuestions,
  type Answer,
} from "../../lib/workspace/ask";
import "./ask-panel.css";

/**
 * Ask a programme a question and get an answer assembled only from captured
 * records. No model call, no network: every line of an answer is either
 * verbatim source text or fixed UI copy, and an unanswerable question says so.
 */
type Written = {
  configured: boolean;
  written?: string | null;
  model?: string;
  reason?: string;
  skipped?: string;
  usage?: { input: number; output: number };
  answer: Answer;
};

export default function AskPanel({
  program,
  audience,
  inspect,
}: {
  program: Program;
  audience: Audience;
  inspect: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [written, setWritten] = useState<Written | null>(null);
  const [pending, setPending] = useState(false);
  // Retrieval runs locally so the sources appear immediately; the written
  // answer, if a key is configured, arrives after and sits above them.
  const answer = asked ? answerQuestion(program, asked, audience) : null;
  const suggestions = suggestedQuestions(program);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setDraft(q);
    setAsked(q);
    setWritten(null);
    setPending(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: program.workspaceId,
          programId: program.programId,
          question: q,
          audience,
        }),
      });
      setWritten(response.ok ? ((await response.json()) as Written) : null);
    } catch {
      // The records are still a correct answer on their own.
      setWritten(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="ask" aria-labelledby="ask-title">
      <h2 id="ask-title" className="ask-title">
        Ask this programme
      </h2>
      <form
        className="ask-form"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What are we waiting on?"
          aria-label="Ask about this programme"
          maxLength={300}
        />
        <button type="submit">Ask</button>
      </form>

      {!answer && suggestions.length > 0 && (
        <ul className="ask-suggestions">
          {suggestions.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => ask(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {answer && (
        <div className="ask-answer" role="status">
          {pending && <p className="ask-pending">Writing an answer…</p>}
          {written?.written && (
            <div className="ask-written">
              <span className="ask-label">
                Written answer · not verbatim · check the sources
              </span>
              <p>{written.written}</p>
              <p className="ask-written-foot">
                Written by {written.model} from only the records below. It can
                still be wrong: every claim is cited, so open the record.
              </p>
            </div>
          )}
          {written && !written.configured && (
            <p className="ask-unconfigured">
              {written.reason} Set ANTHROPIC_API_KEY in .dev.vars to have a
              model write the answer.
            </p>
          )}
          {answer.outstanding && (
            <div className="ask-outstanding">
              <span className="ask-label">
                Not recorded as done · {answer.outstanding.length} of the
                reconciled items
              </span>
              {answer.outstanding.map((row) => (
                <div
                  key={row.item}
                  className={`ask-state ask-state-${row.confidence}`}
                >
                  <p className="ask-recorded">{row.item}</p>
                  <p className="ask-basis">{row.recorded}</p>
                  <p className="ask-meta">{row.basis}</p>
                </div>
              ))}
              <p className="ask-meta">
                Evidence as of {answer.asOf} · quoted from{" "}
                <code>{answer.stateSource}</code>
              </p>
            </div>
          )}
          {answer.state && (
            <div className={`ask-state ask-state-${answer.state.confidence}`}>
              <span className="ask-label">
                Recorded state · {answer.state.item}
              </span>
              <p className="ask-recorded">{answer.state.recorded}</p>
              <p className="ask-basis">
                <strong>Basis and limits:</strong> {answer.state.basis}
              </p>
              <p className="ask-meta">
                Evidence as of {answer.asOf} · quoted from{" "}
                <code>{answer.stateSource}</code>
              </p>
            </div>
          )}

          {answer.records.length > 0 && (
            <div className="ask-records">
              <span className="ask-label">
                {answer.strength === "loose"
                  ? `No direct answer · ${answer.records.length} record${answer.records.length === 1 ? "" : "s"} mention your terms`
                  : `${answer.records.length} record${answer.records.length === 1 ? "" : "s"} cited`}
              </span>
              {answer.records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="ask-record"
                  onClick={() => inspect(r.id)}
                >
                  <span className="ask-record-head">
                    <em>{r.id}</em>
                    {r.title}
                  </span>
                  <span className="ask-record-meta">
                    {[r.date ?? "undated", r.kind, r.path]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="ask-record-excerpt">
                    {r.excerpt.slice(0, 230)}
                    {r.excerpt.length > 230 ? "…" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          {answer.withheld > 0 && (
            <p className="ask-withheld">
              {answer.withheld} matching record
              {answer.withheld === 1 ? " is" : "s are"} internal and withheld
              from this view. Withholding is shown, never silent.
            </p>
          )}

          {!answer.answered && <p className="ask-none">No match.</p>}
          <p className="ask-limitation">{answer.limitation}</p>
        </div>
      )}
    </section>
  );
}
