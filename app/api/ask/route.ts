import { env } from "cloudflare:workers";
import Anthropic from "@anthropic-ai/sdk";
import { programsFor, type Audience } from "../../../lib/workspace/core";
import { answerQuestion, gateProgram } from "../../../lib/workspace/ask";

/**
 * Write an answer from captured records.
 *
 * Retrieval runs HERE, on the server, from the workspace's own records. The
 * client sends a question and a scope, never the records themselves: a client
 * that could choose the evidence could put words in the sources' mouths, the
 * same reason buildContext reconstructs its packet server side.
 *
 * The model only ever sees the handful of records retrieval selected, after
 * audience gating. It never sees the whole capture.
 *
 * With no API key configured this route returns `configured: false` and the
 * page falls back to quoting sources directly. That is the honest default: an
 * unconfigured install makes no provider call at all.
 */

// Opus 5.5 at max effort, asked for by name. On 5.5 thinking cannot be
// disabled and the effort default is medium, so effort is set explicitly.
const MODEL = "claude-opus-5-5";
const EFFORT = "max" as const;

const SYSTEM = `You answer questions about a scientific programme using ONLY the records supplied in the user message.

Rules, in order of importance:
1. Use nothing but the supplied records. No outside knowledge, not even widely known facts about the targets, vendors or techniques involved.
2. If the records do not answer the question, say so plainly and stop. Do not assemble a plausible answer from fragments.
3. Cite the record id (E01, E02, ...) for every factual statement, inline, like [E07].
4. Preserve the distinction the records make between what is recorded, what is expected, and what is unconfirmed. If a record says something is "not confirmed" or "an expectation", never restate it as done.
5. Never state a measured result, an approval, or a payment unless a record says it in those terms.
6. Be brief: at most four sentences unless the question genuinely needs more.
7. Write plainly, no preamble, no restating the question, no markdown headings.

You are describing a captured snapshot of unreviewed notes, not verified truth.`;

type AskBody = {
  workspaceId?: unknown;
  programId?: unknown;
  question?: unknown;
  audience?: unknown;
};

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: AskBody;
  try {
    body = (await request.json()) as AskBody;
  } catch {
    return bad("Body must be JSON.");
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 300)
    return bad("Ask a question of 1 to 300 characters.");
  if (typeof body.workspaceId !== "string" || typeof body.programId !== "string")
    return bad("workspaceId and programId are required.");
  const audience: Audience = body.audience === "shared" ? "shared" : "internal";

  let program;
  try {
    program = programsFor(body.workspaceId).find(
      (p) => p.programId === body.programId,
    );
  } catch {
    return bad("Unknown workspace.");
  }
  if (!program) return bad("Program is outside this workspace.", 404);

  // Gate first, then retrieve, so a withheld record can never reach the model.
  const { program: visible } = gateProgram(program, audience);
  const answer = answerQuestion(visible, question, audience);

  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json({
      configured: false,
      reason:
        "No provider key is configured, so no request left this machine. Showing the sources instead.",
      answer,
    });
  }
  if (!answer.records.length && !answer.state && !answer.outstanding) {
    // Nothing retrieved means nothing to ground an answer in. Do not ask the
    // model to write from an empty context; that is where invention starts.
    return Response.json({ configured: true, skipped: "no-records", answer });
  }

  const context = [
    answer.outstanding?.length
      ? `RECONCILED ITEMS NOT RECORDED AS DONE:\n${answer.outstanding
          .map((r) => `- ${r.item}: ${r.recorded} (basis: ${r.basis})`)
          .join("\n")}`
      : "",
    answer.state
      ? `RECONCILED STATE ROW "${answer.state.item}": ${answer.state.recorded}\n(basis and limits: ${answer.state.basis})`
      : "",
    ...answer.records.map(
      (r) =>
        `RECORD ${r.id} — ${r.title}${r.date ? ` (${r.date})` : ""}\n${r.excerpt}`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const client = new Anthropic({ apiKey: key });
    // Max effort thinks for a while and is billed for it, so stream: a
    // non-streaming request at this ceiling risks an HTTP timeout.
    const message = await client.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        output_config: { effort: EFFORT },
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Question: ${question}\n\nRecords:\n\n${context}`,
          },
        ],
      })
      .finalMessage();

    if (message.stop_reason === "refusal")
      return Response.json({
        configured: true,
        skipped: "refused",
        answer,
      });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return Response.json({
      configured: true,
      written: text || null,
      model: MODEL,
      effort: EFFORT,
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      },
      answer,
    });
  } catch (error) {
    // A provider failure must never lose the answer: the retrieved records are
    // still a correct, citable response on their own.
    return Response.json({
      configured: true,
      skipped: "error",
      reason: error instanceof Error ? error.message : "Provider call failed.",
      answer,
    });
  }
}
