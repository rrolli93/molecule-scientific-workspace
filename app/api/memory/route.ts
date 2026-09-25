import { env } from "cloudflare:workers";
import { retrieveResearch } from "../../../lib/research-demo";
import {
  DomainError,
  emptyState,
  parseCommand,
  replay,
  transition,
  type MemoryState,
} from "../../../lib/memory";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  Vary: "Cookie, oai-authenticated-user-email",
};
function identity(request: Request) {
  // Trust boundary: Sites authenticated dispatcher; do not expose this worker directly.
  const actor = request.headers
    .get("oai-authenticated-user-email")
    ?.trim()
    .toLowerCase();
  if (!actor || actor.length > 254 || !actor.includes("@"))
    throw new DomainError(
      "Sign in through the private Sites workspace to use saved memory.",
      401,
    );
  return actor;
}
function database() {
  if (!env.DB)
    throw new DomainError(
      "Persistent storage is unavailable. No change has been saved.",
      503,
    );
  return env.DB;
}
async function read(owner: string) {
  const row = await database()
    .prepare("SELECT revision, document FROM memory_workspaces WHERE owner = ?")
    .bind(owner)
    .first<{ revision: number; document: string }>();
  return row
    ? { revision: row.revision, state: JSON.parse(row.document) as MemoryState }
    : { revision: 0, state: emptyState() };
}
function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof DomainError
          ? error.message
          : "Storage request failed. No success is assumed; reload to check the saved record.",
    },
    { status: error instanceof DomainError ? error.status : 503, headers },
  );
}
export async function GET(request: Request) {
  try {
    const actor = identity(request);
    return Response.json({ ...(await read(actor)), actor }, { headers });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = identity(request);
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      throw new DomainError("Same-origin requests only.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new DomainError("JSON is required.", 415);
    const raw = await request.text();
    if (raw.length > 8000) throw new DomainError("Request is too large.", 413);
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      throw new DomainError("Invalid JSON.");
    }
    const command = parseCommand(input);
    const current = await read(actor);
    if (replay(current.state, command))
      return Response.json({ ...current, actor }, { headers });
    if (command.revision !== current.revision)
      throw new DomainError(
        "Another tab changed this workspace. Reload before reviewing again.",
        409,
      );
    const at = new Date().toISOString();
    if (command.action === "research_start") {
      if (command.role !== "scientist")
        throw new DomainError("Switch to Demo scientist.", 403);
      const runs = current.state.researchRuns ?? [];
      if (
        runs.length >= 20 ||
        runs.some((r) => r.claims.some((c) => c.status === "proposed"))
      )
        throw new DomainError(
          "Review open claims first; maximum 20 public demo runs.",
          409,
        );
    }
    const retrieved =
      command.action === "research_start"
        ? await retrieveResearch()
        : undefined;
    const state = transition(current.state, command, actor, at, retrieved);
    const document = JSON.stringify(state);
    if (document.length > 1500000)
      throw new DomainError(
        "Pilot storage limit reached. Existing records remain available.",
        409,
      );
    const result =
      current.revision === 0
        ? await database()
            .prepare(
              "INSERT OR IGNORE INTO memory_workspaces (owner, revision, document, updated_at) VALUES (?, 1, ?, ?)",
            )
            .bind(actor, document, at)
            .run()
        : await database()
            .prepare(
              "UPDATE memory_workspaces SET revision = revision + 1, document = ?, updated_at = ? WHERE owner = ? AND revision = ?",
            )
            .bind(document, at, actor, current.revision)
            .run();
    if (result.meta.changes !== 1) {
      const latest = await read(actor);
      if (replay(latest.state, command))
        return Response.json({ ...latest, actor }, { headers });
      throw new DomainError(
        "Another tab saved first. Reload before reviewing again.",
        409,
      );
    }
    return Response.json(
      { state, revision: current.revision + 1, actor },
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
