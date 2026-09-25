import { env } from "cloudflare:workers";
import {
  NotebookError,
  emptyNotebook,
  parseNotebookCommand,
  notebookIdentity,
  notebookReplay,
  applyNotebookCommand,
  type Notebook,
} from "../../../lib/workspace/notebook";
import { workspaceById } from "../../../lib/workspace/core";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  Vary: "Cookie, oai-authenticated-user-email",
  "X-Content-Type-Options": "nosniff",
};
function identity(request: Request) {
  return notebookIdentity(request, {
    localDemo: env.WORKSPACE_LOCAL_DEMO,
    trustSitesIdentity: env.WORKSPACE_TRUST_SITES_IDENTITY,
  });
}
function database() {
  if (!env.DB)
    throw new NotebookError(
      "Notebook storage is unavailable. Nothing was saved.",
      503,
    );
  return env.DB;
}
async function read(owner: string, workspaceId: string) {
  try {
    workspaceById(workspaceId);
  } catch {
    throw new NotebookError("Unknown workspace.", 404);
  }
  const row = await database()
    .prepare(
      "SELECT revision, document FROM research_notebooks WHERE owner = ? AND workspace_id = ?",
    )
    .bind(owner, workspaceId)
    .first<{ revision: number; document: string }>();
  return row
    ? { revision: row.revision, state: JSON.parse(row.document) as Notebook }
    : { revision: 0, state: emptyNotebook(workspaceId) };
}
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof NotebookError
          ? error.message
          : "Notebook request failed. Reload to check saved state; no success is assumed.",
    },
    { status: error instanceof NotebookError ? error.status : 503, headers },
  );
}
export async function GET(request: Request) {
  try {
    const user = identity(request);
    const workspaceId =
      new URL(request.url).searchParams.get("workspaceId") ?? "";
    return Response.json(
      { ...(await read(user.actor, workspaceId)), ...user },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = identity(request);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new NotebookError("Same-origin requests only.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new NotebookError("JSON is required.", 415);
    const raw = await request.text();
    if (raw.length > 12000)
      throw new NotebookError("Request is too large.", 413);
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new NotebookError("Invalid JSON.");
    }
    let command;
    try {
      command = parseNotebookCommand(value);
    } catch (error) {
      throw error instanceof NotebookError
        ? error
        : new NotebookError(
            error instanceof Error ? error.message : "Invalid command.",
          );
    }
    const current = await read(user.actor, command.workspaceId);
    if (notebookReplay(current.state, command))
      return Response.json({ ...current, ...user }, { headers });
    if (command.revision !== current.revision)
      throw new NotebookError(
        "Another tab changed this notebook. Reload saved briefs and retry.",
        409,
      );
    const at = new Date().toISOString();
    const state = await applyNotebookCommand(
      current.state,
      command,
      user.actor,
      at,
    );
    const document = JSON.stringify(state);
    if (document.length > 1500000)
      throw new NotebookError(
        "Notebook storage limit reached. Existing records remain available.",
        409,
      );
    const result =
      current.revision === 0
        ? await database()
            .prepare(
              "INSERT OR IGNORE INTO research_notebooks (owner, workspace_id, revision, document, updated_at) VALUES (?, ?, 1, ?, ?)",
            )
            .bind(user.actor, command.workspaceId, document, at)
            .run()
        : await database()
            .prepare(
              "UPDATE research_notebooks SET revision = revision + 1, document = ?, updated_at = ? WHERE owner = ? AND workspace_id = ? AND revision = ?",
            )
            .bind(
              document,
              at,
              user.actor,
              command.workspaceId,
              current.revision,
            )
            .run();
    if (result.meta.changes !== 1) {
      const latest = await read(user.actor, command.workspaceId);
      if (notebookReplay(latest.state, command))
        return Response.json({ ...latest, ...user }, { headers });
      throw new NotebookError(
        "Another tab saved first. Reload saved briefs and retry.",
        409,
      );
    }
    return Response.json(
      { state, revision: current.revision + 1, ...user },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
