import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseLaunchArgs } from '../integrations/mcp/server.mjs';
import { readNotebookSnapshot, validateNotebookSnapshot } from '../integrations/mcp/notebook-snapshot.mjs';
import { emptyNotebook, applyNotebookCommand } from '../lib/workspace/notebook.ts';

const path = fileURLToPath(new URL('../integrations/mcp/server.mjs', import.meta.url));
async function withClient(workspaceId, callback, notebookPath) {
  const client = new Client({ name: 'molecule-protocol-test', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--experimental-strip-types', path, '--workspace', workspaceId, ...(notebookPath ? ['--notebook', notebookPath] : [])], stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', (chunk) => { stderr += String(chunk); });
  try {
    await client.connect(transport);
    await callback(client);
    assert.match(stderr, /synthetic read-only scope/);
  } finally { await client.close(); }
}
function payload(response) {
  assert.notEqual(response.isError, true, JSON.stringify(response));
  const text = JSON.parse(response.content[0].text);
  assert.deepEqual(response.structuredContent, text);
  return text;
}
test('MCP launch config requires one known workspace and no extra options', () => {
  assert.deepEqual(parseLaunchArgs(['--workspace', 'vivamed-demo']), { workspaceId: 'vivamed-demo', notebookPath: undefined });
  for (const args of [[], ['--workspace', 'unknown'], ['--workspace', 'vivamed-demo', '--file', '/etc/passwd']]) assert.throws(() => parseLaunchArgs(args));
});

async function exportedNotebook() {
  let state = await applyNotebookCommand(emptyNotebook('vivamed-demo'), { workspaceId: 'vivamed-demo', revision: 0, action: 'save', commandId: 'test-brief-0001', programId: 'endotype-alpha', candidateId: 'candidate-a', question: 'Does the saved signal reproduce?', evidenceIds: ['E01', 'E02'] }, 'local-demo', '2026-09-22T10:00:00.000Z');
  state = await applyNotebookCommand(state, { workspaceId: 'vivamed-demo', revision: 1, action: 'review', commandId: 'test-review-0001', briefId: 'test-brief-0001', decision: 'accepted', rationale: 'Both conflicting records are retained.' }, 'local-demo', '2026-09-22T10:01:00.000Z');
  const { receipts: _receipts, ...data } = state;
  void _receipts;
  return { ...data, revision: 2, storageMode: 'local-demo', warning: 'Synthetic demonstration. Brief acceptance is not scientific validation, execution, or approved knowledge.' };
}
test('exported notebook is actually available over stdio and frozen at startup', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'molecule-mcp-test-'));
  const file = join(directory, 'notebook.json');
  const exported = await exportedNotebook();
  try {
    await writeFile(file, JSON.stringify(exported));
    await withClient('vivamed-demo', async (client) => {
      assert.equal((await client.listTools()).tools.length, 6);
      const search = payload(await client.callTool({ name: 'search', arguments: { query: 'saved' } }));
      const found = search.results.find((item) => item.id.includes('/briefs/'));
      assert.ok(found);
      const fetched = payload(await client.callTool({ name: 'fetch', arguments: { id: found.id } }));
      assert.equal(fetched.metadata.status, 'accepted');
      assert.match(fetched.metadata.warning, /does not approve knowledge/);
      assert.deepEqual(JSON.parse(fetched.text), exported.briefs[0].packet);
      await writeFile(file, '{"changed":"after startup"}');
      const frozen = payload(await client.callTool({ name: 'get_saved_brief_context', arguments: { briefId: 'test-brief-0001' } }));
      assert.deepEqual(frozen.packet, exported.briefs[0].packet);
      assert.deepEqual(frozen.packet.approvedKnowledge, []);
      assert.equal((await client.callTool({ name: 'get_saved_brief_context', arguments: { briefId: 'not-in-snapshot' } })).isError, true);
      assert.equal((await client.callTool({ name: 'get_saved_brief_context', arguments: { briefId: 'test-brief-0001', path: '/etc/passwd' } })).isError, true);
    }, file);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('snapshot rejects malformed schema, scope, content/digest tampering and fake review history', async () => {
  const original = await exportedNotebook();
  assert.deepEqual(validateNotebookSnapshot(original, 'vivamed-demo'), original);
  assert.throws(() => validateNotebookSnapshot(original, 'peptai-test'), /scope/);
  for (const mutate of [
    (value) => { value.extra = 'unknown schema'; },
    (value) => { value.briefs[0].digest = '0'.repeat(64); },
    (value) => { value.briefs[0].packet.sources[0].text = 'Invented result'; },
    (value) => {
      value.briefs[0].packet.sources[0].text = 'Invented result';
      value.briefs[0].digest = createHash('sha256').update(JSON.stringify(value.briefs[0].packet)).digest('hex');
    },
    (value) => { value.briefs[0].packet.workspaceId = 'peptai-test'; },
    (value) => { value.briefs[0].status = 'draft'; },
    (value) => { value.events[1].actor = 'someone-else'; },
    (value) => { value.events.push(value.events[0]); },
  ]) {
    const copy = structuredClone(original);
    mutate(copy);
    assert.throws(() => validateNotebookSnapshot(copy, 'vivamed-demo'));
  }
});
test('explicit file adapter rejects relative path, symlink, oversize and bad startup snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'molecule-mcp-test-'));
  const file = join(directory, 'notebook.json');
  try {
    await assert.rejects(readNotebookSnapshot('relative.json', 'vivamed-demo'), /absolute/);
    await writeFile(file, JSON.stringify(await exportedNotebook()));
    const link = join(directory, 'linked.json');
    await symlink(file, link);
    await assert.rejects(readNotebookSnapshot(link, 'vivamed-demo'));
    if (process.platform !== 'win32') {
      const fifo = join(directory, 'not-a-file.fifo');
      execFileSync('mkfifo', [fifo]);
      await assert.rejects(readNotebookSnapshot(fifo, 'vivamed-demo'), /regular JSON file/);
    }
    await assert.rejects(withClient('peptai-test', () => assert.fail('Scope mismatch must prevent startup.'), file));
    const tampered = await exportedNotebook();
    tampered.briefs[0].digest = '0'.repeat(64);
    await writeFile(file, JSON.stringify(tampered));
    await assert.rejects(withClient('vivamed-demo', () => assert.fail('Digest mismatch must prevent startup.'), file));
    await writeFile(file, ' '.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(readNotebookSnapshot(file, 'vivamed-demo'), /2 MiB/);
    await writeFile(file, 'not json');
    await assert.rejects(readNotebookSnapshot(file, 'vivamed-demo'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('real stdio initialize, discovery, search/fetch, context, resources and no writes', async () => {
  await withClient('vivamed-demo', async (client) => {
    assert.equal(client.getServerVersion().name, 'molecule-workspace');
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), ['build_context', 'compare_candidates', 'fetch', 'list_programs', 'search']);
    for (const tool of tools) {
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.openWorldHint, false);
      assert.equal(tool.inputSchema.additionalProperties, false);
    }
    const list = payload(await client.callTool({ name: 'list_programs', arguments: {} }));
    assert.equal(list.workspace.id, 'vivamed-demo');
    const found = payload(await client.callTool({ name: 'search', arguments: { query: 'binding' } }));
    assert.equal(found.results[0].id, 'vivamed-demo/endotype-alpha/E03');
    const byId = payload(await client.callTool({ name: 'search', arguments: { query: 'E01' } }));
    assert.deepEqual(byId.results.map((item) => item.id), ['vivamed-demo/endotype-alpha/E01']);
    const source = payload(await client.callTool({ name: 'fetch', arguments: { id: found.results[0].id } }));
    assert.equal(source.metadata.origin, 'synthetic');
    assert.equal(source.metadata.review, 'unreviewed');
    assert.match(source.text, /Binding alone/);
    const packet = payload(await client.callTool({ name: 'build_context', arguments: { programId: 'endotype-alpha', candidateId: 'candidate-a', question: 'Does the signal reproduce?', evidenceIds: ['E01'] } }));
    assert.equal(packet.sources.length, 1);
    assert.match(JSON.stringify(packet), /E02/);
    assert.deepEqual(packet.approvedKnowledge, []);
    const comparison = payload(await client.callTool({ name: 'compare_candidates', arguments: { programId: 'endotype-alpha' } }));
    assert.equal(comparison.rows.length, 4);
    const resources = await client.listResources();
    assert.equal(resources.resources.length, 3);
    const read = await client.readResource({ uri: resources.resources[0].uri });
    assert.equal(JSON.parse(read.contents[0].text).origin, 'synthetic');
  });
});
test('MCP rejects scope escape, paths, unknown tools, invalid inputs and cross-candidate context', async () => {
  await withClient('vivamed-demo', async (client) => {
    for (const call of [
      { name: 'fetch', arguments: { id: '/etc/passwd' } },
      { name: 'fetch', arguments: { id: 'https://example.com' } },
      { name: 'fetch', arguments: { id: 'peptai-test/endotype-alpha/E01' } },
      { name: 'list_programs', arguments: { workspaceId: 'peptai-test' } },
      { name: 'search', arguments: { query: '' } },
      { name: 'search', arguments: { query: 'a'.repeat(501) } },
      { name: 'build_context', arguments: { programId: 'endotype-alpha', candidateId: 'candidate-b', question: 'Test', evidenceIds: ['E01'] } },
      { name: 'build_context', arguments: { programId: 'other', candidateId: 'candidate-a', question: 'Test', evidenceIds: ['E01'] } },
      { name: 'execute_tool', arguments: {} },
    ]) {
      const response = await client.callTool(call);
      assert.equal(response.isError, true, JSON.stringify(call));
      assert.equal(response.structuredContent, undefined);
    }
    await assert.rejects(client.readResource({ uri: 'file:///etc/passwd' }));
  });
});
test('PeptAI scope exposes only its captured programme and cannot read VivaMed fixture', async () => {
  await withClient('peptai-test', async (client) => {
    const { programs } = payload(await client.callTool({ name: 'list_programs', arguments: {} }));
    // Empty when this build carries no capture; never VivaMed's fixture.
    assert.deepEqual(programs.map((p) => p.programId), programs.length ? ['kiss1r-round1'] : []);
    const { results } = payload(await client.callTool({ name: 'search', arguments: { query: 'binding' } }));
    assert.ok(results.every((r) => !String(r.id ?? '').startsWith('vivamed-demo/')));
    // A non-empty scope now advertises resources; none of them may be VivaMed's.
    if (programs.length) {
      assert.ok(client.getServerCapabilities().resources);
      const { resources } = await client.listResources();
      assert.ok(resources.length > 0);
      assert.ok(resources.every((r) => !String(r.uri).includes('vivamed-demo')));
    }
    assert.equal((await client.callTool({ name: 'fetch', arguments: { id: 'vivamed-demo/endotype-alpha/E01' } })).isError, true);
  });
});
