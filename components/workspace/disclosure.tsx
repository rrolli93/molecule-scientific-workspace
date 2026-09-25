"use client";

import { useId, useState, type ReactNode } from "react";
import "./disclosure.css";

/**
 * A closed section that still tells you something.
 *
 * The page leads with one question and one status line; everything else lives
 * behind one of these. The `summary` is the point: a collapsed section has to
 * be worth not opening, so it carries the fact you would have opened it for.
 */
export default function Disclosure({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const uid = useId();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`disclosure${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="disclosure-head"
        aria-expanded={open}
        aria-controls={`disclosure-${uid}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="disclosure-title">{title}</span>
        <span className="disclosure-summary">{summary}</span>
        <span className="disclosure-chevron" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div className="disclosure-body" id={`disclosure-${uid}`}>
          {children}
        </div>
      )}
    </section>
  );
}
