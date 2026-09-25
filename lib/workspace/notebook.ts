import { buildContext, workspaceById } from "./core.ts";

export class NotebookError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export type ContextPacket = ReturnType<typeof buildContext>;
export type Brief = {
  id: string;
  createdAt: string;
  createdBy: string;
  digest: string;
  packet: ContextPacket;
  status: "draft" | "accepted" | "rejected";
  review?: {
    at: string;
    actor: string;
    rationale: string;
    decision: "accepted" | "rejected";
  };
};
export type Notebook = {
  schemaVersion: 1;
  workspaceId: string;
  briefs: Brief[];
  events: {
    id: string;
    briefId: string;
    at: string;
    actor: string;
    action: "saved" | "accepted" | "rejected";
  }[];
  receipts: { id: string; command: string }[];
};
type Base = { commandId: string; workspaceId: string; revision: number };
export type NotebookCommand = Base &
  (
    | {
        action: "save";
        programId: string;
        candidateId: string;
        question: string;
        evidenceIds: string[];
      }
    | {
        action: "review";
        briefId: string;
        decision: "accepted" | "rejected";
        rationale: string;
      }
  );
export function emptyNotebook(workspaceId: string): Notebook {
  workspaceById(workspaceId);
  return {
    schemaVersion: 1,
    workspaceId,
    briefs: [],
    events: [],
    receipts: [],
  };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new NotebookError("Expected an object.");
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new NotebookError(`Invalid ${name}.`);
  return value.trim();
}
export function parseNotebookCommand(value: unknown): NotebookCommand {
  const v = record(value);
  const commandId = string(v.commandId, "command ID");
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(commandId))
    throw new NotebookError("Invalid command ID.");
  const workspaceId = string(v.workspaceId, "workspace");
  workspaceById(workspaceId);
  if (!Number.isSafeInteger(v.revision) || (v.revision as number) < 0)
    throw new NotebookError("Invalid revision.");
  const base = { commandId, workspaceId, revision: v.revision as number };
  if (v.action === "save") {
    if (
      !Array.isArray(v.evidenceIds) ||
      v.evidenceIds.length > 20 ||
      !v.evidenceIds.every((id) => typeof id === "string")
    )
      throw new NotebookError("Invalid evidence selection.");
    const command: NotebookCommand = {
      ...base,
      action: "save",
      programId: string(v.programId, "program"),
      candidateId: string(v.candidateId, "candidate"),
      question: string(v.question, "question", 2000),
      evidenceIds: [...new Set(v.evidenceIds as string[])],
    };
    // Reconstruct from authoritative fixtures; never trust client-supplied source text.
    buildContext(command);
    return command;
  }
  if (
    v.action === "review" &&
    (v.decision === "accepted" || v.decision === "rejected")
  )
    return {
      ...base,
      action: "review",
      briefId: string(v.briefId, "brief"),
      decision: v.decision,
      rationale: string(v.rationale, "review rationale", 2000),
    };
  throw new NotebookError("Unknown notebook action.");
}
export function notebookReplay(state: Notebook, command: NotebookCommand) {
  const receipt = state.receipts.find((r) => r.id === command.commandId);
  if (!receipt) return false;
  if (receipt.command !== JSON.stringify(command))
    throw new NotebookError(
      "Command ID already used for different content.",
      409,
    );
  return true;
}
export async function applyNotebookCommand(
  state: Notebook,
  command: NotebookCommand,
  actor: string,
  at: string,
): Promise<Notebook> {
  if (state.workspaceId !== command.workspaceId)
    throw new NotebookError("Workspace mismatch.", 403);
  if (notebookReplay(state, command)) return structuredClone(state);
  const next = structuredClone(state);
  if (command.action === "save") {
    if (next.briefs.length >= 100)
      throw new NotebookError(
        "This pilot supports 100 saved briefs per workspace. Export existing records before expanding storage.",
        409,
      );
    const packet = buildContext(command);
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(packet)),
    );
    const digest = Array.from(new Uint8Array(hash), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    next.briefs.push({
      id: command.commandId,
      createdAt: at,
      createdBy: actor,
      digest,
      packet,
      status: "draft",
    });
    next.events.push({
      id: command.commandId,
      briefId: command.commandId,
      at,
      actor,
      action: "saved",
    });
  } else {
    const brief = next.briefs.find((b) => b.id === command.briefId);
    if (!brief) throw new NotebookError("Brief is outside this notebook.", 404);
    if (brief.status !== "draft")
      throw new NotebookError(
        "This brief is already reviewed. Save a new brief to record another decision.",
        409,
      );
    brief.status = command.decision;
    brief.review = {
      at,
      actor,
      rationale: command.rationale,
      decision: command.decision,
    };
    next.events.push({
      id: command.commandId,
      briefId: brief.id,
      at,
      actor,
      action: command.decision,
    });
  }
  next.receipts.push({
    id: command.commandId,
    command: JSON.stringify(command),
  });
  return next;
}

export function notebookIdentity(
  request: Request,
  config: { localDemo?: string; trustSitesIdentity?: string },
) {
  const hostname = new URL(request.url).hostname;
  if (
    config.localDemo === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
  ) {
    return { actor: "local-demo", mode: "local-demo" as const };
  }
  // This opt-in is only safe behind a dispatcher that strips and injects this header.
  if (config.trustSitesIdentity === "true") {
    const actor = request.headers
      .get("oai-authenticated-user-email")
      ?.trim()
      .toLowerCase();
    if (
      actor &&
      actor.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(actor)
    )
      return { actor, mode: "owner-private" as const };
  }
  throw new NotebookError(
    "Saved notebook access is not configured for this deployment. Use the local demonstration or an authenticated private deployment.",
    401,
  );
}
