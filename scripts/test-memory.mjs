import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, parseCommand, transition, replay } from '../lib/memory.ts';
const actor = 'fixture@example.invalid';
const at = '2026-09-17T12:00:00Z';
const command = (id, action, extra = {}) => parseCommand({ id, action, revision: 0, role: action === 'start' ? 'scientist' : 'reviewer', ...extra });
const start = command('run-test-0001', 'start');
const started = () => transition(emptyState(), start, actor, at);
const accept = command('accept-test-0001', 'review', { runId: start.id, outcome: 'accepted', rationale: 'Accept assessment, not candidate advancement.' });
test('snapshots preserve source versions, contradictory evidence and standards', () => {
  const s = started();
  assert.equal(s.runs[0].context.sources.length, 3);
  assert.deepEqual(s.runs[0].findings[0].evidence, ['E01', 'E02']);
  assert.match(s.runs[0].findings[1].text, /no demonstrated functional/);
  assert.equal(s.runs[0].context.approvedKnowledge.length, 0);
  assert.equal(s.knowledge.length, 0);
});
test('review requires simulation role and nonempty rationale', () => {
  assert.throws(() => transition(started(), { ...accept, role: 'scientist' }, actor, at), /Demo reviewer/);
  assert.throws(() => transition(started(), { ...accept, rationale: '  ' }, actor, at), /rationale/);
});
test('run acceptance alone never promotes knowledge', () => {
  const s = transition(started(), accept, actor, at);
  assert.equal(s.runs[0].state, 'accepted');
  assert.equal(s.knowledge.length, 0);
  assert(s.runs[0].updates.every(u => u.status === 'proposed'));
});
test('approved-only memory survives serialization and enters next snapshot', () => {
  let s = transition(started(), accept, actor, at);
  s = transition(s, command('approve-test-001', 'knowledge', { runId: start.id, updateId: s.runs[0].updates[0].id, outcome: 'approved', rationale: 'Retain both observations.' }), actor, at);
  s = transition(s, command('reject-test-0001', 'knowledge', { runId: start.id, updateId: s.runs[0].updates[1].id, outcome: 'rejected', rationale: 'Demonstrate exclusion.' }), actor, at);
  s = JSON.parse(JSON.stringify(s));
  s = transition(s, command('run-test-0002', 'start'), actor, at);
  assert.equal(s.knowledge.length, 1);
  assert.equal(s.runs[1].context.approvedKnowledge.length, 1);
  assert.equal(s.runs[1].context.approvedKnowledge[0].decision.actor, actor);
  assert.equal(s.runs[0].context.approvedKnowledge.length, 0);
  assert.equal(s.runs[1].updates.length, 1);
  assert.equal(s.runs[1].context.previousOutcomes[0].state, 'accepted');
});
test('idempotency preserves state and rejects request-ID reuse with different content', () => {
  const s = started();
  assert.equal(transition(s, start, actor, at), s);
  assert(replay(s, { ...start, revision: 99 }));
  assert.throws(() => replay(s, { ...start, role: 'reviewer' }), /different action/);
});
test('invalid transitions cannot alter history', () => {
  const s = started();
  assert.throws(() => transition(s, command('run-test-0002', 'start'), actor, at), /open assessment/);
  assert.throws(() => transition(s, command('approve-test-001', 'knowledge', { runId: start.id, updateId: s.runs[0].updates[0].id, outcome: 'approved', rationale: 'Too early' }), actor, at), /Accept the assessment/);
  const accepted = transition(s, accept, actor, at);
  assert.throws(() => transition(accepted, { ...accept, id: 'accept-again-001' }, actor, at), /already has/);
  assert.equal(s.runs[0].state, 'awaiting_review');
});
test('change requests stay in history without pretending to revise fixed findings', () => {
  let s = transition(started(), { ...accept, outcome: 'changes_requested' }, actor, at);
  s = transition(s, command('run-test-0002', 'start'), actor, at);
  assert.equal(s.runs[0].state, 'changes_requested');
  assert.equal(s.runs[1].context.previousOutcomes[0].state, 'changes_requested');
  assert.deepEqual(s.runs[1].findings, s.runs[0].findings);
});
test('malformed inputs and actor/source injection are rejected or ignored', () => {
  assert.throws(() => parseCommand(null));
  assert.throws(() => parseCommand({ id: 'bad', action: 'start' }));
  assert.throws(() => parseCommand({ ...accept, rationale: 'x'.repeat(2001) }));
  const c = parseCommand({ ...start, actor: 'attacker', sources: [{ id: 'invented' }] });
  const s = transition(emptyState(), c, actor, at);
  assert.equal(s.runs[0].actor, actor);
  assert.equal(s.runs[0].context.sources[0].id, 'E01');
});
