"use client";

import { useEffect, useRef, useState } from "react";
import ProgramDesk from "./program-desk";
import SourceDrawer from "./source-drawer";
import { ResearchNotebook } from "./notebook";
import Link from "next/link";
import {
  workspaces,
  programsFor,
  buildContext,
  type Audience,
  briefMarkdown,
  connections,
  executionEligibility,
  type Evidence,
  type Connection,
} from "../../lib/workspace/core";

const areas = [
  "Programs",
  "Evidence & knowledge",
  "Scientific standards",
  "Research & design",
  "Review & decisions",
  "Connections",
] as const;
type Area = (typeof areas)[number];
type Packet = ReturnType<typeof buildContext>;
const symbols = ["◫", "▤", "◎", "⌘", "✓", "↗"];

const areaDescriptions: Record<Area, string> = {
  Programs: "Find the next scientific question",
  "Evidence & knowledge": "Inspect sources and their relationships",
  "Scientific standards": "Read the rules behind an assessment",
  "Research & design": "Frame, save and export a research brief",
  "Review & decisions": "Inspect proposed claims and saved briefs",
  Connections: "Understand tool readiness and missing setup",
};

function WorkspaceNavigator({
  workspaceName,
  evidence,
  navigate,
  inspect,
  close,
}: {
  workspaceName: string;
  evidence: Evidence[];
  navigate: (area: Area) => void;
  inspect: (source: Evidence) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const matchingAreas = areas.filter((area) =>
    `${area} ${areaDescriptions[area]}`.toLowerCase().includes(term),
  );
  const matchingSources = evidence.filter((source) =>
    `${source.id} ${source.title} ${source.text}`.toLowerCase().includes(term),
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  function dismiss() {
    dialog.current?.close();
    close();
  }
  function pick(action: () => void) {
    dismiss();
    action();
  }
  return (
    <dialog
      ref={dialog}
      className="ws-navigator"
      aria-labelledby="navigator-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClose={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="ws-navigator-inner">
        <div className="ws-row">
          <h2 id="navigator-title">Go to your next question.</h2>
          <button
            className="ws-drawer-close"
            aria-label="Close workspace search"
            onClick={dismiss}
          >
            ×
          </button>
        </div>
        <label className="ws-navigator-search">
          <span className="ws-kicker">
            SEARCH THIS WORKSPACE / {workspaceName}
          </span>
          <input
            type="search"
            autoFocus
            value={search}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                dismiss();
              }
            }}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find evidence or jump to a workspace area…"
          />
        </label>
        <div className="ws-navigator-results">
          {matchingSources.length > 0 && (
            <div className="ws-navigator-group">
              <span className="ws-kicker">SOURCE RECORDS · SYNTHETIC</span>
              {matchingSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => pick(() => inspect(source))}
                >
                  <span className="ws-source-id">{source.id}</span>
                  <span>
                    <strong>{source.title}</strong>
                    <small>Version {source.version} · open exact source</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          )}
          {matchingAreas.length > 0 && (
            <div className="ws-navigator-group">
              <span className="ws-kicker">WORKSPACE AREAS</span>
              {matchingAreas.map((area) => (
                <button key={area} onClick={() => pick(() => navigate(area))}>
                  <span className="ws-nav-result-icon" aria-hidden="true">
                    {symbols[areas.indexOf(area)]}
                  </span>
                  <span>
                    <strong>{area}</strong>
                    <small>{areaDescriptions[area]}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          )}
          {!matchingSources.length && !matchingAreas.length && (
            <p className="ws-no-results">
              No matches in this workspace. Try a source ID, “binding”, or
              “research”.
            </p>
          )}
        </div>
        <p className="ws-navigator-footnote">
          Local navigation only · not a literature search or an AI answer
        </p>
      </div>
    </dialog>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warm" | "green";
}) {
  return <span className={`ws-tag ws-tag-${tone}`}>{children}</span>;
}

export default function Workspace() {
  const [workspaceId, setWorkspaceId] = useState("vivamed-demo");
  const [area, setArea] = useState<Area>("Programs");
  const [candidateId, setCandidateId] = useState("candidate-a");
  const [source, setSource] = useState<Evidence | null>(null);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(["E01", "E02"]);
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [inspected, setInspected] = useState<string[]>([]);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  // Who the page is being read as. Internal is the default for the operator;
  // switching to shared previews exactly what an outside reader would see.
  const [audience, setAudience] = useState<Audience>("internal");
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        setNavigatorOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const briefResult = useRef<HTMLElement>(null);
  const inspect = (evidence: Evidence) => {
    setSource(evidence);
    setInspected((ids) =>
      ids.includes(evidence.id) ? ids : [...ids, evidence.id],
    );
  };
  const workspace = workspaces.find((w) => w.id === workspaceId)!;
  const program = programsFor(workspaceId)[0];
  const candidate = program?.candidates.find((c) => c.id === candidateId);
  const navigate = (next: Area) => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setArea(next);
    setSource(null);
    setError("");
  };
  const chooseCandidate = (id: string) => {
    const next = program?.candidates.find((c) => c.id === id);
    if (!next) return;
    setCandidateId(id);
    setSelected(next.evidenceIds);
    setQuestion(null);
    setPacket(null);
    setSource(null);
    setError("");
  };
  const switchWorkspace = (id: string) => {
    // Each workspace has its own candidate and evidence ids; never carry the
    // previous workspace's selection across the boundary.
    const first = programsFor(id)[0]?.candidates[0];
    window.scrollTo({ top: 0, behavior: "instant" });
    setInspected([]);
    setWorkspaceId(id);
    setNavigatorOpen(false);
    setArea("Programs");
    setCandidateId(first?.id ?? "");
    setSource(null);
    setSelected(first ? [...first.evidenceIds] : []);
    setQuestion(null);
    setPacket(null);
    setQuery("");
    setError("");
    setFilter("All");
  };
  const investigate = (id: string) => {
    chooseCandidate(id);
    navigate("Research & design");
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  function preview() {
    if (!program || !candidate) return;
    try {
      setPacket(
        buildContext({
          workspaceId,
          programId: program.programId,
          candidateId,
          question: question ?? candidate.question,
          evidenceIds: selected,
        }),
      );
      setError("");
      requestAnimationFrame(() => briefResult.current?.focus());
    } catch (e) {
      setPacket(null);
      setError(e instanceof Error ? e.message : "Could not prepare context.");
    }
  }
  function download(format: "json" | "md" = "json") {
    if (!packet) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          format === "md"
            ? briefMarkdown(packet)
            : JSON.stringify(packet, null, 2),
        ],
        { type: format === "md" ? "text/markdown" : "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `molecule-${workspaceId}-${candidateId}-brief.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const SourceButton = ({ evidence }: { evidence: Evidence }) => (
    <button className="ws-source-row" onClick={() => inspect(evidence)}>
      <span className="ws-source-id">{evidence.id}</span>
      <span>
        <strong>{evidence.title}</strong>
        <small>
          {program?.candidates.find((c) => c.id === evidence.candidateId)
            ?.name ?? "Programme record"}{" "}
          · version {evidence.version} ·{" "}
          {evidence.origin === "vault-capture"
            ? "captured source"
            : "synthetic source"}
        </small>
      </span>
      <span aria-hidden="true">↗</span>
    </button>
  );
  const ConnectionCard = ({ connection }: { connection: Connection }) => (
    <article className="ws-card ws-connection">
      <div className="ws-row">
        <span className="ws-kicker">{connection.category}</span>
        <Tag
          tone={
            connection.readiness === "Captured test" ||
            connection.readiness === "Local read-only"
              ? "green"
              : "neutral"
          }
        >
          {connection.readiness}
        </Tag>
      </div>
      <h3>{connection.name}</h3>
      <p>{connection.purpose}</p>
      <p className="ws-small">
        {executionEligibility(workspaceId, connection.id).reason}
      </p>
      {connection.id === "mcp" && (
        <details className="ws-mcp-guide">
          <summary>Use with an AI client</summary>
          <ol>
            <li>
              Save a research brief, then choose{" "}
              <strong>Export notebook</strong>.
            </li>
            <li>
              Register the local read-only connector with a compatible AI
              client, selecting only the export you want to share.
            </li>
            <li>
              Ask about those sources and saved questions. This reads a
              snapshot; export again and restart the connector to update it.
            </li>
          </ol>
          <p>
            ChatGPT web needs separate account and tunnel setup, or an
            authenticated hosted service. No client is connected automatically.
          </p>
          <p className="ws-small">
            Local setup instructions: <code>MCP-CONNECTION.md</code> in this
            app’s project.
          </p>
        </details>
      )}
      <div className="ws-connection-state">
        <span className="ws-dot" />{" "}
        {connection.id === "mcp"
          ? "Connector built · AI client not registered"
          : "Not enabled in this workspace"}
      </div>
    </article>
  );

  return (
    <div
      className="ws"
      ref={(node) => {
        if (node) node.dataset.ready = "true";
      }}
    >
      <aside className="ws-sidebar">
        <Link className="ws-brand" href="/">
          <span>m</span> molecule<sup>®</sup>
        </Link>
        <div className="ws-observatory-mark">
          <span className="ws-observatory-cross" aria-hidden="true">
            +
          </span>
          <span>
            OBSERVATORY<small>SCIENTIFIC OPERATING SPACE</small>
          </span>
        </div>
        <label className="ws-kicker" htmlFor="workspace-picker">
          WORKSPACE
        </label>
        <select
          id="workspace-picker"
          value={workspaceId}
          onChange={(e) => switchWorkspace(e.target.value)}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
              {w.classification === "synthetic"
                ? " · demo"
                : w.classification === "captured"
                  ? " · captured"
                  : " · test"}
            </option>
          ))}
        </select>
        <p className="ws-small ws-workspace-note">{workspace.description}</p>
        <button
          className="ws-quick-find"
          onClick={() => setNavigatorOpen(true)}
        >
          <span aria-hidden="true">⌕</span> Find or jump to…{" "}
          <kbd>⌘ / Ctrl K</kbd>
        </button>
        <nav aria-label="Scientific workspace">
          {areas.map((item, index) => (
            <button
              key={item}
              aria-current={area === item ? "page" : undefined}
              onClick={() => navigate(item)}
            >
              <span aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              {item}
            </button>
          ))}
        </nav>
        <div className="ws-sidebar-bottom">
          <span className="ws-kicker">CONTEXT IS THE CONSTANT</span>
          <p>
            One scientific record.
            <br />
            Your choice of intelligence.
          </p>
          <Link href="/memory">Existing saved demo ↗</Link>
          <small>
            Separate owner-private pilot; not synchronized with this fixture.
          </small>
        </div>
      </aside>
      <div className="ws-body">
        <div className="ws-topbar">
          <span>
            {workspace.name} <span className="ws-slash">/</span> {area}
          </span>
          <span className="ws-top-status">
            <span aria-hidden="true">⊕</span> MOLECULE OBSERVATORY
          </span>
        </div>
        <div className="ws-banner">
          <strong>
            {workspace.classification === "synthetic"
              ? "SYNTHETIC WORKSPACE"
              : workspace.classification === "captured"
                ? "CAPTURED VAULT TEXT · UNREVIEWED"
                : "EMPTY TEST WORKSPACE"}
          </strong>
          <span>
            No client data, live agents or team permissions. Save briefs
            explicitly in the notebook; unsaved selections reset on refresh.
          </span>
        </div>
        <div className="ws-main" role="main">
          <div
            className={`ws-page-title${
              area === "Programs" && program ? " ws-page-title-compact" : ""
            }`}
          >
            <div>
              <p className="ws-kicker">
                {String(areas.indexOf(area) + 1).padStart(2, "0")} / SCIENTIFIC
                WORKSPACE
              </p>
              <h1>
                {area === "Programs"
                  ? (program?.name ?? "Your scientific workspace")
                  : area === "Research & design"
                    ? "Build your research brief."
                    : area}
              </h1>
              {area === "Programs" && program ? null : (
                <p>
                  {area === "Programs"
                    ? "Start with one program. Keep its evidence and decisions together."
                    : program
                      ? `${program.name} · inspect the evidence before taking the next step.`
                      : "An independent workspace, ready for a deliberately scoped first program."}
                </p>
              )}
            </div>
            <div className="ws-title-aside">
              {/* A shared build has no internal records to reveal, so offering
                  the toggle would imply there is something behind it. */}
              {workspace.classification === "captured" &&
                program?.audience !== "shared" && (
                <div
                  className="ws-audience"
                  role="group"
                  aria-label="Read this page as"
                >
                  <span>Viewing as</span>
                  {(["internal", "shared"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={audience === a}
                      onClick={() => setAudience(a)}
                    >
                      {a === "internal" ? "Internal" : "Outside reader"}
                    </button>
                  ))}
                </div>
              )}
              <Tag>
                {workspace.classification === "synthetic"
                  ? "Illustrative data"
                  : workspace.classification === "captured"
                    ? "Captured · unreviewed"
                    : "No data imported"}
              </Tag>
            </div>
          </div>

          {area === "Connections" ? (
            <>
              <div className="ws-callout">
                <strong>
                  Tools are replaceable. Your scientific record stays.
                </strong>
                <p>
                  Most entries are an integration roadmap, not connected
                  services. The local read-only MCP connector is built;
                  AI-client registration is separate. No credentials, remote
                  jobs or wallet actions are available here.
                </p>
              </div>
              <div
                className="ws-filters"
                role="group"
                aria-label="Filter connections"
              >
                {[
                  "All",
                  "Research",
                  "Protein",
                  "Small molecule",
                  "Context",
                  "Molecule",
                ].map((f) => (
                  <button
                    key={f}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="ws-connection-grid">
                {connections
                  .filter((c) => filter === "All" || c.category === filter)
                  .map((c) => (
                    <ConnectionCard key={c.id} connection={c} />
                  ))}
              </div>
            </>
          ) : !program ? (
            <section className="ws-empty ws-card">
              <span className="ws-empty-icon" aria-hidden="true">
                ▤
              </span>
              <p className="ws-kicker">PEPTAI / A CLEAN START</p>
              <h2>Your vault stays yours.</h2>
              <p>
                No files have been read into this workspace. We will start with
                a read-only, allowlisted copy of one program—not your entire
                vault.
              </p>
              <div className="ws-import-steps">
                <span>01 · Choose program scope</span>
                <span>02 · Preview sources & exclusions</span>
                <span>03 · Confirm local intake</span>
              </div>
              <p className="ws-small">
                Vault intake and persistent program records are not implemented;
                the synthetic research notebook is separate. The planned intake
                preview does not require sending data to a model.
              </p>
              <button
                className="ws-button secondary"
                onClick={() => navigate("Connections")}
              >
                Explore planned connections →
              </button>
            </section>
          ) : (
            <>
              {area === "Programs" && (
                <ProgramDesk
                  program={program}
                  audience={audience}
                  candidateId={candidateId}
                  chooseCandidate={chooseCandidate}
                  inspect={inspect}
                  investigate={investigate}
                  standards={() => navigate("Scientific standards")}
                  inspected={inspected}
                  evidence={() => navigate("Evidence & knowledge")}
                  review={() => navigate("Review & decisions")}
                />
              )}

              {area === "Evidence & knowledge" && (
                <>
                  <div className="ws-toolbar">
                    <h2>Source register</h2>
                    <label>
                      Find evidence
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Title, ID or source text"
                      />
                    </label>
                  </div>
                  <div className="ws-card ws-source-list">
                    {program.evidence
                      .filter((e) =>
                        `${e.id} ${e.title} ${e.text}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((e) => (
                        <SourceButton key={e.id} evidence={e} />
                      ))}
                    {!program.evidence.some((e) =>
                      `${e.id} ${e.title} ${e.text}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ) && (
                      <p className="ws-no-results">
                        No matching evidence. Try another term.
                      </p>
                    )}
                  </div>
                  <div className="ws-section-heading">
                    <h2>Evidence relationships</h2>
                    <Tag>Prepared interpretations, not approved facts</Tag>
                  </div>
                  <div className="ws-two-col">
                    {program.claims.map((c) => (
                      <article key={c.id} className="ws-card">
                        <span className="ws-kicker">
                          {c.kind} / {c.review}
                        </span>
                        <h3>{c.text}</h3>
                        <p>{c.limitation}</p>
                        <div className="ws-chips">
                          {c.evidenceIds.map((id) => (
                            <button
                              key={id}
                              onClick={() =>
                                inspect(
                                  program.evidence.find((e) => e.id === id)!,
                                )
                              }
                            >
                              {id} ↗
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="ws-callout">
                    <strong>No approved institutional knowledge yet.</strong>
                    <p>
                      Original sources, inferred relationships and approved
                      claims are separate records. A relationship here is not a
                      measured correlation.
                    </p>
                  </div>
                </>
              )}

              {area === "Scientific standards" && (
                <>
                  <div className="ws-callout">
                    <strong>{program.standardsVersion}</strong>
                    <p>
                      Demonstration rules, not approved VivaMed policy. Agents
                      cannot edit or approve these rules.
                    </p>
                  </div>
                  <div className="ws-card ws-rules">
                    {program.standards.map((rule, i) => (
                      <div key={rule}>
                        <span>0{i + 1}</span>
                        <h3>{rule}</h3>
                      </div>
                    ))}
                  </div>
                  <div className="ws-section-heading">
                    <h2>What this means in practice</h2>
                  </div>
                  <div className="ws-two-col">
                    <article className="ws-card">
                      <h3>Unknown is a valid result.</h3>
                      <p>
                        Candidate B has no functional measurement in this
                        package. There is no invented potency, pass score or
                        ranking to fill that gap.
                      </p>
                    </article>
                    <article className="ws-card">
                      <h3>Review changes status, not evidence.</h3>
                      <p>
                        Approving a prediction would not make it a measurement.
                        Accepting an assessment does not automatically approve
                        its claims.
                      </p>
                    </article>
                  </div>
                </>
              )}

              {area === "Research & design" && candidate && (
                <>
                  <div className="ws-investigation-strip">
                    <span className="ws-kicker">
                      INVESTIGATION / {candidate.name.toUpperCase()}
                    </span>
                    <span>
                      Sources {candidate.evidenceIds.join(" + ")} · no agent
                      execution
                    </span>
                    <button
                      className="ws-text-button"
                      onClick={() => navigate("Programs")}
                    >
                      ← Back to program
                    </button>
                  </div>
                  <ol className="ws-journey" aria-label="Research brief steps">
                    <li>
                      <button
                        onClick={() =>
                          inspect(
                            program.evidence.find(
                              (e) => e.id === candidate.evidenceIds[0],
                            )!,
                          )
                        }
                      >
                        <span>01</span>
                        <strong>Read the evidence</strong>
                        <small>
                          {
                            candidate.evidenceIds.filter((id) =>
                              inspected.includes(id),
                            ).length
                          }{" "}
                          / {candidate.evidenceIds.length} sources opened
                        </small>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() =>
                          document.getElementById("research-question")?.focus()
                        }
                      >
                        <span>02</span>
                        <strong>Frame the question</strong>
                        <small>Suggested starting question included</small>
                      </button>
                    </li>
                    <li>
                      <button onClick={preview}>
                        <span>03</span>
                        <strong>Review & export</strong>
                        <small>
                          {packet
                            ? "Brief ready · not executed"
                            : "Create a portable research brief"}
                        </small>
                      </button>
                    </li>
                  </ol>
                  <div className="ws-two-col ws-research-grid">
                    <section className="ws-card">
                      <p className="ws-kicker">01 / SCOPE THE QUESTION</p>
                      <h2>What do you want to find out?</h2>
                      <p>
                        Start with a suggested question or write your own. Your
                        brief will carry its sources, standards and limitations
                        with it.
                      </p>
                      <label className="ws-field">
                        Candidate
                        <select
                          aria-label="Candidate"
                          value={candidateId}
                          onChange={(e) => chooseCandidate(e.target.value)}
                        >
                          {program.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="ws-field">
                        Research question
                        <textarea
                          id="research-question"
                          rows={4}
                          maxLength={2000}
                          value={question ?? candidate.question}
                          onChange={(e) => {
                            setQuestion(e.target.value);
                            setPacket(null);
                          }}
                        />
                      </label>
                      <div className="ws-inline-sources">
                        <span className="ws-kicker">READ BEFORE YOU ASK</span>
                        {program.evidence
                          .filter((e) => candidate.evidenceIds.includes(e.id))
                          .map((e) => (
                            <SourceButton key={e.id} evidence={e} />
                          ))}
                      </div>
                      <fieldset>
                        <legend>Evidence to include</legend>
                        {program.evidence
                          .filter((e) => candidate.evidenceIds.includes(e.id))
                          .map((e) => (
                            <label className="ws-check" key={e.id}>
                              <input
                                type="checkbox"
                                checked={selected.includes(e.id)}
                                onChange={(event) => {
                                  setSelected((prev) =>
                                    event.target.checked
                                      ? [...prev, e.id]
                                      : prev.filter((id) => id !== e.id),
                                  );
                                  setPacket(null);
                                }}
                              />
                              <span>
                                <strong>
                                  {e.id} · {e.title}
                                </strong>
                                <small>
                                  Version {e.version} · synthetic / unreviewed
                                </small>
                              </span>
                            </label>
                          ))}
                      </fieldset>
                      {error && (
                        <p role="alert" className="ws-error">
                          {error}
                        </p>
                      )}
                      <button className="ws-button" onClick={preview}>
                        Review research brief →
                      </button>
                      <p className="ws-small ws-top-gap">
                        Preview only. Nothing is saved to a run or sent to a
                        provider.
                      </p>
                    </section>
                    <section
                      className="ws-card ws-context"
                      aria-live="polite"
                      ref={briefResult}
                      tabIndex={-1}
                    >
                      <p className="ws-kicker">02 / INSPECT BEFORE EXECUTION</p>
                      <h2>
                        {packet
                          ? "Your brief is ready."
                          : "Your brief will appear here."}
                      </h2>
                      {packet ? (
                        <>
                          <Tag tone="green">Packet prepared · not executed</Tag>
                          <p className="ws-top-gap">{packet.question}</p>
                          <dl>
                            <div>
                              <dt>Sources</dt>
                              <dd>
                                {packet.sources.length} exact fixture versions
                              </dd>
                            </div>
                            <div>
                              <dt>Standards</dt>
                              <dd>{packet.standards.version}</dd>
                            </div>
                            <div>
                              <dt>Approved knowledge</dt>
                              <dd>0 claims</dd>
                            </div>
                            <div>
                              <dt>Model / runtime</dt>
                              <dd>None selected or called</dd>
                            </div>
                          </dl>
                          {packet.warnings.map((w) => (
                            <p className="ws-warning" key={w}>
                              {w}
                            </p>
                          ))}
                          {packet.omissions.map((o) => (
                            <p className="ws-small" key={o.id}>
                              {o.id} excluded: {o.reason}
                            </p>
                          ))}
                          <details>
                            <summary>Inspect the exact JSON packet</summary>
                            <pre>{JSON.stringify(packet, null, 2)}</pre>
                          </details>
                          <div className="ws-export-actions">
                            <button
                              className="ws-button"
                              onClick={() => download("md")}
                            >
                              Download readable brief ↓
                            </button>
                            <button
                              className="ws-button secondary"
                              onClick={() => download("json")}
                            >
                              Download context JSON ↓
                            </button>
                          </div>
                          <p className="ws-small ws-top-gap">
                            Markdown for people and chat tools; JSON for future
                            adapters. Downloading does not send data or run an
                            analysis.
                          </p>
                        </>
                      ) : (
                        <div className="ws-context-empty">
                          <span aria-hidden="true">◎</span>
                          <p>
                            Select evidence and preview the question, source
                            versions, standards and omissions together.
                          </p>
                        </div>
                      )}
                      <div className="ws-divider" />
                      <p className="ws-kicker">WHAT HAPPENS NEXT?</p>
                      <p>
                        Save a frozen copy in your research notebook below, then
                        record why the brief is suitable—or what should change.
                        Export it for another tool when you are ready. Live
                        agent execution is not connected here.
                      </p>
                      <div className="ws-link-stack">
                        {packet && (
                          <button
                            className="ws-button secondary"
                            onClick={() => {
                              const notebook =
                                document.getElementById("saved-notebook");
                              notebook?.focus({ preventScroll: true });
                              notebook?.scrollIntoView({
                                behavior: window.matchMedia(
                                  "(prefers-reduced-motion: reduce)",
                                ).matches
                                  ? "instant"
                                  : "smooth",
                                block: "start",
                              });
                            }}
                          >
                            Save or review in notebook ↓
                          </button>
                        )}
                        <Link href="/challenge">
                          Inspect captured research example ↗
                        </Link>
                        <button
                          className="ws-text-button"
                          onClick={() => navigate("Connections")}
                        >
                          View tool connection requirements →
                        </button>
                      </div>
                    </section>
                  </div>
                </>
              )}

              {area === "Research & design" && (
                <div
                  id="saved-notebook"
                  className="ws-notebook-anchor"
                  tabIndex={-1}
                >
                  <ResearchNotebook
                    key={`research-${workspaceId}`}
                    workspaceId={workspaceId}
                    packet={packet}
                  />
                </div>
              )}

              {area === "Review & decisions" && (
                <>
                  <div className="ws-callout">
                    <strong>
                      Review the scope. Preserve the scientific record.
                    </strong>
                    <p>
                      Scientific claims below are still unapproved fixture
                      proposals. The notebook records review of research briefs
                      separately; accepting a brief does not approve a
                      scientific claim.
                    </p>
                  </div>
                  <ResearchNotebook
                    key={`review-${workspaceId}`}
                    workspaceId={workspaceId}
                    packet={null}
                  />
                  <details className="ws-earlier-demos">
                    <summary>
                      Illustrative claim proposals and earlier demos{" "}
                      <span>2 fixture proposals · separate saved pilot</span>
                    </summary>
                    {program.claims.map((c) => (
                      <article className="ws-card ws-review-card" key={c.id}>
                        <div className="ws-row">
                          <span className="ws-kicker">
                            {c.id} · {c.kind}
                          </span>
                          <Tag tone="warm">Proposed · fixture</Tag>
                        </div>
                        <h3>{c.text}</h3>
                        <p>{c.limitation}</p>
                        <div className="ws-chips">
                          {c.evidenceIds.map((id) => (
                            <button
                              key={id}
                              onClick={() =>
                                inspect(
                                  program.evidence.find((e) => e.id === id)!,
                                )
                              }
                            >
                              {id} ↗
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                    <div className="ws-two-col">
                      <article className="ws-card">
                        <h3>Continue the saved walkthrough</h3>
                        <p>
                          The original owner-private pilot supports persisted
                          reviews with simulated scientist/reviewer roles.
                        </p>
                        <Link className="ws-button secondary" href="/memory">
                          Open saved demo ↗
                        </Link>
                      </article>
                      <article className="ws-card">
                        <h3>Inspect the real research example</h3>
                        <p>
                          Public-source retrieval and captured agent results
                          remain explicitly labeled in the existing
                          demonstrations.
                        </p>
                        <div className="ws-link-stack">
                          <Link href="/research">Public-evidence demo ↗</Link>
                          <Link href="/challenge">
                            Captured OpenScience challenge ↗
                          </Link>
                        </div>
                      </article>
                    </div>
                  </details>
                </>
              )}
            </>
          )}

          {navigatorOpen && (
            <WorkspaceNavigator
              workspaceName={workspace.name}
              evidence={program?.evidence ?? []}
              navigate={navigate}
              inspect={inspect}
              close={() => setNavigatorOpen(false)}
            />
          )}
          {source && (
            <SourceDrawer
              source={source}
              workspaceName={workspace.name}
              programName={program?.name ?? ""}
              related={
                program?.evidence.filter(
                  (e) =>
                    e.candidateId === source.candidateId && e.id !== source.id,
                ) ?? []
              }
              inspect={inspect}
              close={() => setSource(null)}
            />
          )}
          <div className="ws-footer">
            <span>MOLECULE · CONTEXT BEFORE COMPUTE</span>
            <span>
              No provider calls · no vault import · no wallet connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
