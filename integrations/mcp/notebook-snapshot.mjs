import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { buildContext } from '../../lib/workspace/core.ts';

const MAX_BYTES = 2 * 1024 * 1024;
const id = z.string().min(8).max(120).regex(/^[A-Za-z0-9_-]+$/);
const actor = z.string().trim().min(1).max(254);
const timestamp = z.string().datetime({ offset: true });
const review = z.object({ at: timestamp, actor, rationale: z.string().trim().min(1).max(2000), decision: z.enum(['accepted', 'rejected']) }).strict();
const schema = z.object({
  schemaVersion: z.literal(1), workspaceId: z.enum(['vivamed-demo', 'peptai-test']),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), storageMode: z.enum(['local-demo', 'owner-private']),
  warning: z.string().min(1).max(1000),
  briefs: z.array(z.object({ id, createdAt: timestamp, createdBy: actor, digest: z.string().regex(/^[a-f0-9]{64}$/), packet: z.unknown(), status: z.enum(['draft', 'accepted', 'rejected']), review: review.optional() }).strict()).max(100),
  events: z.array(z.object({ id, briefId: id, at: timestamp, actor, action: z.enum(['saved', 'accepted', 'rejected']) }).strict()).max(200),
}).strict();

export function validateNotebookSnapshot(value, workspaceId) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Error('Notebook export has an unsupported or malformed schema.');
  const snapshot = parsed.data;
  if (snapshot.workspaceId !== workspaceId) throw new Error('Notebook workspace does not match configured scope.');
  const briefIds = new Set();
  for (const brief of snapshot.briefs) {
    if (briefIds.has(brief.id)) throw new Error('Duplicate notebook brief ID.');
    briefIds.add(brief.id);
    if (!brief.packet || typeof brief.packet !== 'object' || Array.isArray(brief.packet)) throw new Error('Malformed context packet.');
    const packet = brief.packet;
    if (packet.workspaceId !== workspaceId || !Array.isArray(packet.sources)) throw new Error('Context packet is outside configured scope.');
    const digest = createHash('sha256').update(JSON.stringify(packet)).digest('hex');
    if (digest !== brief.digest) throw new Error('Notebook context digest mismatch.');
    // Currently this bridge supports the exact synthetic fixture schema, not arbitrary
    // imports. A matching hash alone is not trust or scientific verification.
    const expected = buildContext({ workspaceId, programId: packet.programId, candidateId: packet.candidateId, question: packet.question, evidenceIds: packet.sources.map((source) => source?.id) });
    if (!isDeepStrictEqual(expected, packet)) throw new Error('Unsupported or altered synthetic context packet.');
    if (brief.status === 'draft' ? brief.review !== undefined : brief.review?.decision !== brief.status) throw new Error('Notebook review state is inconsistent.');
    const events = snapshot.events.filter((event) => event.briefId === brief.id);
    const expectedEvents = brief.status === 'draft' ? 1 : 2;
    if (events.length !== expectedEvents || events[0].action !== 'saved' || events[0].id !== brief.id || events[0].actor !== brief.createdBy || events[0].at !== brief.createdAt) throw new Error('Notebook event history is inconsistent.');
    if (brief.review && (events[1].action !== brief.review.decision || events[1].actor !== brief.review.actor || events[1].at !== brief.review.at)) throw new Error('Notebook review event is inconsistent.');
  }
  const eventIds = new Set();
  for (const event of snapshot.events) {
    if (!briefIds.has(event.briefId) || eventIds.has(event.id)) throw new Error('Notebook event scope or uniqueness check failed.');
    eventIds.add(event.id);
  }
  return structuredClone(snapshot);
}

export async function readNotebookSnapshot(path, workspaceId) {
  if (!isAbsolute(path)) throw new Error('Notebook path must be absolute and explicitly selected at launch.');
  // Final-component symlinks are refused; only this one regular file is opened.
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_BYTES) throw new Error('Notebook must be a regular JSON file of at most 2 MiB.');
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > MAX_BYTES) throw new Error('Notebook exceeds the 2 MiB limit.');
    return validateNotebookSnapshot(JSON.parse(buffer.subarray(0, offset).toString('utf8')), workspaceId);
  } finally { await file.close(); }
}
