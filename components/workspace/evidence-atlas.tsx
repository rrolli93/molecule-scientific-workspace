"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Evidence, Program } from "../../lib/workspace/core";
import { buildEvidenceAtlas, type AtlasNode } from "../../lib/workspace/atlas";
import "./evidence-atlas.css";

type AtlasProps = {
  program: Program;
  inspect: (evidence: Evidence) => void;
  investigate: (id: string) => void;
  chooseCandidate: (id: string) => void;
  immersive?: boolean;
  initialSelection?: string;
  initialFilter?: string;
  initialView?: "map" | "list";
};
export default function EvidenceAtlas({
  program,
  inspect,
  investigate,
  chooseCandidate,
  immersive = false,
  initialSelection = "source:E02",
  initialFilter = "all",
  initialView = "map",
}: AtlasProps) {
  const uid = useId();
  const [focused, setFocused] = useState(false);
  const graph = buildEvidenceAtlas(program);
  const [selectedId, setSelectedId] = useState(initialSelection);
  const [filter, setFilter] = useState(initialFilter);
  const [view, setView] = useState<"map" | "list">(initialView);
  const inspector = useRef<HTMLDivElement>(null);
  const selected =
    graph.nodes.find((n) => n.id === selectedId) ?? graph.nodes[0];
  const laneCenter =
    graph.nodes.find((n) => n.kind === "candidate" && n.candidateId === filter)
      ?.y ?? 295;
  const visible = graph.nodes
    .filter((n) => filter === "all" || n.candidateId === filter)
    .map((n) => (filter === "all" ? n : { ...n, y: n.y + 295 - laneCenter }));
  const visibleIds = new Set(visible.map((n) => n.id));
  // The canvas used to be a fixed 590-unit box, which silently clipped any
  // programme with more rows than the demo fixture. Grow it with the content.
  const canvasHeight = Math.max(
    590,
    ...visible.map((n) => n.y + 120),
  );
  const visibleEdges = graph.edges.filter(
    (e) => visibleIds.has(e.from) && visibleIds.has(e.to),
  );
  const neighbors = new Set(
    graph.edges
      .filter((e) => e.from === selected.id || e.to === selected.id)
      .flatMap((e) => [e.from, e.to]),
  );
  function select(node: AtlasNode, focus = false) {
    setSelectedId(node.id);
    if (node.kind === "candidate") chooseCandidate(node.candidateId);
    if (focus)
      requestAnimationFrame(() => {
        inspector.current?.focus({ preventScroll: true });
        inspector.current?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
      });
  }
  function filterTo(id: string) {
    setFilter(id);
    const first = graph.nodes.find((n) => id === "all" || n.candidateId === id);
    if (first && id !== "all") select(first);
  }
  function openSource(id: string) {
    const evidence = program.evidence.find((e) => e.id === id);
    if (evidence) inspect(evidence);
  }
  const nodeButton = (node: AtlasNode, schematic: boolean) => (
    <button
      key={node.id}
      className={`atlas-node atlas-node-${node.kind}${selected.id === node.id ? " is-selected" : ""}${neighbors.has(node.id) ? " is-related" : ""}`}
      style={
        schematic
          ? {
              left: `${node.x / 10}%`,
              top: `${(node.y / canvasHeight) * 100}%`,
            }
          : undefined
      }
      aria-label={`Inspect ${node.recordId}: ${node.title}`}
      aria-pressed={selected.id === node.id}
      onClick={() =>
        select(node, window.matchMedia("(max-width: 620px)").matches)
      }
      onKeyDown={(event) => {
        if (
          ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(
            event.key,
          )
        ) {
          event.preventDefault();
          const index = visible.findIndex((n) => n.id === node.id);
          const delta = ["ArrowRight", "ArrowDown"].includes(event.key)
            ? 1
            : -1;
          const next =
            visible[(index + delta + visible.length) % visible.length];
          const sibling =
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
              `[data-atlas-id="${next.id}"]`,
            );
          sibling?.focus();
          select(next);
        }
      }}
      data-atlas-id={node.id}
    >
      <span className="atlas-node-meta">
        <span>{node.kind === "candidate" ? "ENTITY" : node.recordId}</span>
        <i aria-hidden="true" />
      </span>
      <strong>{node.title}</strong>
      <small>
        {node.kind === "candidate"
          ? `${node.sourceIds.length} linked sources`
          : node.kind === "source"
            ? node.status
            : "Proposed · not approved"}
      </small>
      {node.flag && <em className="atlas-node-flag">{node.flag}</em>}
      <span className="atlas-node-cross" aria-hidden="true">
        +
      </span>
    </button>
  );

  return (
    <section
      className={`atlas${immersive ? " atlas-immersive" : ""}`}
      aria-labelledby={`atlas-title-${uid}`}
    >
      <div className="atlas-topline">
        <h2 id={`atlas-title-${uid}`} className="atlas-topline-title">
          01 / EVIDENCE TOPOLOGY
        </h2>
        <div className="atlas-readout">
          <span>
            <b>{String(visible.length).padStart(2, "0")}</b> RECORDS
          </span>
          <span>
            <b>{String(visibleEdges.length).padStart(2, "0")}</b> LINKS
          </span>
        </div>
        {!immersive && (
          <button
            className="atlas-focus-button"
            onClick={() => setFocused(true)}
          >
            Focus atlas <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
      <div className="atlas-toolbar">
        <div
          className="atlas-filter"
          role="group"
          aria-label="Filter evidence atlas"
        >
          <button
            aria-pressed={filter === "all"}
            onClick={() => filterTo("all")}
          >
            Whole program
          </button>
          {program.candidates.map((c) => (
            <button
              key={c.id}
              aria-pressed={filter === c.id}
              onClick={() => filterTo(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div
          className="atlas-views"
          role="group"
          aria-label="Evidence atlas view"
        >
          <button aria-pressed={view === "map"} onClick={() => setView("map")}>
            Map
          </button>
          <button
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>
      <div className="atlas-body">
        <div className="atlas-field">
          <div
            className={`atlas-schematic${view === "list" ? " atlas-hidden" : ""}`}
            role="group"
            aria-label="Interactive evidence map"
            /* The panel is width-driven with a fixed aspect-ratio in CSS.
               Setting a height would inflate the width; restate the ratio. */
            style={{ aspectRatio: `1000 / ${canvasHeight}` }}
          >
            <div className="atlas-column-label atlas-column-entity">
              CANDIDATE
            </div>
            <div className="atlas-column-label atlas-column-source">SOURCE</div>
            <div className="atlas-column-label atlas-column-claim">
              INTERPRETATION
            </div>
            <svg
              className="atlas-wires"
              viewBox={`0 0 1000 ${canvasHeight}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id={`atlas-grid-${uid}`}
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect
                width="1000"
                height={canvasHeight}
                fill={`url(#atlas-grid-${uid})`}
              />
              {graph.edges
                .filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
                // Citations are near-complete across a programme, so they only
                // appear for the record you have selected. Supersession is
                // sparse and load-bearing, so it is always drawn.
                .filter(
                  (e) =>
                    e.relation !== "cites" ||
                    e.from === selected.id ||
                    e.to === selected.id,
                )
                .map((edge) => {
                  const from = visible.find((n) => n.id === edge.from)!;
                  const to = visible.find((n) => n.id === edge.to)!;
                  const active =
                    edge.from === selected.id || edge.to === selected.id;
                  const sameColumn = from.x === to.x;
                  const bulge = Math.min(
                    150,
                    60 + Math.abs(from.y - to.y) * 0.22,
                  );
                  return (
                    <path
                      key={edge.id}
                      className={`atlas-wire${active ? " is-active" : ""} atlas-wire-${edge.relation.replace(/ /g, "-")}`}
                      d={
                        sameColumn
                          ? // Same column: arc out to the right of the cards
                            // rather than looping backwards through them.
                            `M ${from.x + 104} ${from.y} C ${from.x + 104 + bulge} ${from.y}, ${to.x + 104 + bulge} ${to.y}, ${to.x + 104} ${to.y}`
                          : `M ${from.x + 104} ${from.y} C ${from.x + 165} ${from.y}, ${to.x - 165} ${to.y}, ${to.x - 104} ${to.y}`
                      }
                    />
                  );
                })}
              <text
                x="30"
                y={canvasHeight - 23}
                className="atlas-coordinate"
              >
                SCHEMATIC / NOT A BIOLOGICAL INTERACTION NETWORK
              </text>
            </svg>
            {visible.map((n) => nodeButton(n, true))}
          </div>
          <div
            className={`atlas-record-list${view === "map" ? " atlas-mobile-only" : ""}`}
            role="group"
            aria-label="Evidence atlas records"
          >
            {visible.map((n) => nodeButton(n, false))}
          </div>
          <div className="atlas-legend">
            <span>
              <i className="atlas-key-entity" />
              Candidate
            </span>
            <span>
              <i className="atlas-key-source" />
              Original source
            </span>
            <span>
              <i className="atlas-key-claim" />
              Proposed interpretation
            </span>
            <small>Select a record to trace its context.</small>
          </div>
        </div>
        <div
          className="atlas-inspector"
          ref={inspector}
          tabIndex={-1}
          aria-label="Selected atlas record"
        >
          <div className="atlas-inspector-index">
            <span>RECORD INSPECTOR</span>
            <b>{selected.recordId}</b>
          </div>
          <span className={`atlas-status atlas-status-${selected.kind}`}>
            {selected.status}
          </span>
          <h3>{selected.title}</h3>
          <p>{selected.text}</p>
          {selected.limitation && (
            <p className="atlas-limitation">
              <strong>Boundary</strong>
              {selected.limitation}
            </p>
          )}
          {selected.kind === "source" &&
            (() => {
              const rel = program.relations.filter(
                (r) => r.from === selected.recordId || r.to === selected.recordId,
              );
              const sup = rel.filter((r) => r.kind !== "cites");
              const cites = rel.filter(
                (r) => r.kind === "cites" && r.from === selected.recordId,
              );
              const citedBy = rel.filter(
                (r) => r.kind === "cites" && r.to === selected.recordId,
              );
              const title = (id: string) =>
                program.evidence.find((e) => e.id === id)?.title ?? id;
              if (!rel.length) return null;
              return (
                <div className="atlas-relations">
                  <span className="atlas-overline">STATED RELATIONSHIPS</span>
                  {sup.map((r) => {
                    const outgoing = r.from === selected.recordId;
                    const other = outgoing ? r.to : r.from;
                    const partial = r.kind === "partially-supersedes";
                    return (
                      <div key={r.id} className="atlas-relation">
                        <span className="atlas-relation-kind">
                          {outgoing
                            ? partial
                              ? "partially supersedes"
                              : "supersedes"
                            : partial
                              ? "is partially superseded by"
                              : "is superseded by"}
                        </span>
                        <button onClick={() => openSource(other)}>
                          <span>{other}</span>
                          {title(other)}
                        </button>
                        {r.scope && (
                          <p className="atlas-relation-scope">
                            Scope: {r.scope}
                          </p>
                        )}
                        {r.statement && (
                          <p className="atlas-relation-quote">{r.statement}</p>
                        )}
                      </div>
                    );
                  })}
                  {(cites.length > 0 || citedBy.length > 0) && (
                    <p className="atlas-relation-counts">
                      Cites {cites.length} captured record
                      {cites.length === 1 ? "" : "s"} · cited by{" "}
                      {citedBy.length}. Citation links are drawn on the map only
                      while this record is selected.
                    </p>
                  )}
                </div>
              );
            })()}
          <div className="atlas-source-trace">
            <span className="atlas-overline">TRACE TO SOURCE</span>
            {selected.sourceIds.map((id) => (
              <button key={id} onClick={() => openSource(id)}>
                <span>{id}</span>
                {program.evidence.find((e) => e.id === id)?.title}
                <b aria-hidden="true">↗</b>
              </button>
            ))}
          </div>
          {selected.kind !== "source" && (
            <button
              className="atlas-investigate"
              onClick={() => investigate(selected.candidateId)}
            >
              Build a brief for{" "}
              {
                program.candidates.find((c) => c.id === selected.candidateId)
                  ?.name
              }
              <span aria-hidden="true">→</span>
            </button>
          )}
          <p className="atlas-inspector-note">
            {program.evidence.some((e) => e.origin === "vault-capture")
              ? "Captured source text, unreviewed. A link records membership or a citation, not causality or scientific approval."
              : "Synthetic demonstration. A link records membership or a citation, not causality or scientific approval."}
          </p>
        </div>
      </div>
      {focused && (
        <AtlasFocusDialog
          program={program}
          inspect={inspect}
          investigate={investigate}
          chooseCandidate={chooseCandidate}
          initialSelection={selectedId}
          initialFilter={filter}
          initialView={view}
          close={() => setFocused(false)}
        />
      )}
    </section>
  );
}

function AtlasFocusDialog({
  close,
  ...props
}: AtlasProps & { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function dismiss() {
    dialog.current?.close();
    close();
  }
  return (
    <dialog
      ref={dialog}
      className="atlas-focus-dialog"
      aria-label="Evidence atlas focus mode"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={close}
    >
      <div className="atlas-focus-bar">
        <span>
          MOLECULE / OBSERVATORY <b>FOCUS MODE</b>
        </span>
        <button onClick={dismiss} aria-label="Close atlas focus mode">
          Return to program <span aria-hidden="true">×</span>
        </button>
      </div>
      <EvidenceAtlas {...props} immersive />
    </dialog>
  );
}
