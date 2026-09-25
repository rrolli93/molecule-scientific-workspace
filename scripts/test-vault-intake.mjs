import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, stat, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { limits, parseIntakeArgs, previewIntake, validateRelativeMarkdown } from '../integrations/vault/preview.mjs';

const script = fileURLToPath(new URL('../integrations/vault/preview.mjs', import.meta.url));
async function withFixture(callback) {
  const root = await mkdtemp(join(tmpdir(), 'molecule-vault-test-'));
  try { await callback(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
test('intake CLI requires an explicit root and unique finite Markdown allowlist', () => {
  assert.equal(validateRelativeMarkdown('programs/example.md'), 'programs/example.md');
  assert.deepEqual(parseIntakeArgs(['--root', '/example', '--file', 'note.md']), { root: '/example', files: ['note.md'] });
  for (const path of ['/outside.md', '../outside.md', 'notes/../outside.md', '.env.md', '.hidden/note.md', 'credentials.md', 'config/api-key.md', 'keys/private-key.md', 'auth/note.md', 'env.md', 'notes\\outside.md', 'C:/note.md', 'note.txt', 'notes//note.md', 'note\n.md']) assert.throws(() => validateRelativeMarkdown(path));
  assert.throws(() => parseIntakeArgs(['--root', '/example']));
  assert.throws(() => parseIntakeArgs(['--root', 'relative', '--file', 'note.md']));
  assert.throws(() => parseIntakeArgs(['--root', '/example', '--scan', 'all']));
  assert.throws(() => parseIntakeArgs(['--root', '/example', '--file', 'note.md', '--file', 'note.md']));
  assert.throws(() => parseIntakeArgs(['--root', '/example', ...Array.from({ length: 31 }, (_, i) => ['--file', `${i}.md`]).flat()]));
});
test('real CLI preserves exact text/hash, extracts metadata, does not scan or modify sources', async () => {
  await withFixture(async (root) => {
    const text = '# Test program\r\nAn unreviewed observation. [[Candidate A#Results|A]] and ![[plot.png]].\r\n## Next question\r\n~~~\r\n# Not a heading\r\n[[not-a-link]]\r\n~~~\r\n';
    const path = join(root, 'program.md');
    await writeFile(path, text);
    await writeFile(join(root, 'unselected.md'), 'This must not appear in a manifest.');
    const before = await stat(path);
    const manifest = JSON.parse(execFileSync(process.execPath, [script, '--root', root, '--file', 'program.md'], { encoding: 'utf8' }));
    const after = await stat(path);
    assert.equal(manifest.documents.length, 1);
    const document = manifest.documents[0];
    assert.equal(document.content, text);
    assert.equal(document.sha256, createHash('sha256').update(text).digest('hex'));
    assert.equal(document.bytes, Buffer.byteLength(text));
    assert.equal(document.title, 'Test program');
    assert.deepEqual(document.headings.map((heading) => heading.text), ['Test program', 'Next question']);
    assert.deepEqual(document.wikilinks.map((link) => link.target), ['Candidate A', 'plot.png']);
    assert.equal(document.wikilinks[0].fragment, 'Results');
    assert.equal(document.wikilinks[0].label, 'A');
    assert.ok(document.wikilinks.every((link) => link.resolution === 'unresolved-not-followed'));
    assert.equal(document.classification, 'original-text-unreviewed');
    for (const key of ['imported', 'sourcesModified', 'providerCalls', 'graphCreated']) assert.equal(manifest[key], false);
    assert.equal(after.mtimeMs, before.mtimeMs);
    assert.equal(await readFile(path, 'utf8'), text);
    assert.doesNotMatch(JSON.stringify(manifest), /This must not appear/);
  });
});
test('rejects symlinks, parent symlinks, nonregular files and named pipes without blocking', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'note.md'), '# Selected');
    await symlink(join(root, 'note.md'), join(root, 'link.md'));
    await mkdir(join(root, 'notes'));
    await writeFile(join(root, 'notes', 'nested.md'), '# Nested');
    await symlink(join(root, 'notes'), join(root, 'linked-notes'));
    await assert.rejects(previewIntake({ root, files: ['link.md'] }), /Symlink/);
    await assert.rejects(previewIntake({ root, files: ['linked-notes/nested.md'] }), /Symlink/);
    await mkdir(join(root, 'directory.md'));
    await assert.rejects(previewIntake({ root, files: ['directory.md'] }), /regular/);
    await symlink(root, join(root, 'root-link'));
    await assert.rejects(previewIntake({ root: join(root, 'root-link'), files: ['note.md'] }), /non-symlink/);
    if (process.platform !== 'win32') {
      const fifo = join(root, 'pipe.md');
      execFileSync('mkfifo', [fifo]);
      const processResult = spawnSync(process.execPath, [script, '--root', root, '--file', 'pipe.md'], { encoding: 'utf8', timeout: 2000 });
      assert.equal(processResult.error, undefined);
      assert.equal(processResult.status, 1);
      assert.match(processResult.stderr, /regular Markdown/);
      assert.equal(processResult.stdout, '');
    }
  });
});
test('enforces per-file and total limits; invalid selection produces no partial manifest', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'large.md'), 'x'.repeat(limits.fileBytes + 1));
    await assert.rejects(previewIntake({ root, files: ['large.md'] }), /byte limits/);
    const files = Array.from({ length: 9 }, (_, i) => `note-${i}.md`);
    await Promise.all(files.map((file) => writeFile(join(root, file), 'x'.repeat(limits.fileBytes))));
    await assert.rejects(previewIntake({ root, files }), /byte limits/);
    const processResult = spawnSync(process.execPath, [script, '--root', root, '--file', files[0], '--file', 'missing.md'], { encoding: 'utf8' });
    assert.equal(processResult.status, 1);
    assert.equal(processResult.stdout, '');
  });
});
test('refuses invalid UTF-8 and credential-like content without echoing it', async () => {
  await withFixture(async (root) => {
    await writeFile(join(root, 'invalid.md'), Buffer.from([0xff, 0xfe, 0xff]));
    await assert.rejects(previewIntake({ root, files: ['invalid.md'] }));
    const syntheticToken = `sk-proj-${'x'.repeat(30)}`;
    await writeFile(join(root, 'accidental.md'), `# Note\n${syntheticToken}`);
    const processResult = spawnSync(process.execPath, [script, '--root', root, '--file', 'accidental.md'], { encoding: 'utf8' });
    assert.equal(processResult.status, 1);
    assert.equal(processResult.stdout, '');
    assert.match(processResult.stderr, /Credential-like/);
    assert.ok(!processResult.stderr.includes(syntheticToken));
  });
});
test('credential detection requires a token boundary and still catches real keys', async () => {
  await withFixture(async (root) => {
    // Regression: `sk-` inside an ordinary hyphenated word is not a credential.
    // Real vault notes contain run directories and drug names that embed it.
    const innocuous = [
      'boltz/brisk-cluster-shifts-ac3d97',
      'sub-01_task-rest_space-MNI152NLin2Asym',
      'novo-nordisk-a-s-evoke-phase-3-trial',
    ].join('\n');
    await writeFile(join(root, 'innocuous.md'), `# Run record\n${innocuous}`);
    const { documents: [document] } = await previewIntake({ root, files: ['innocuous.md'] });
    assert.ok(document.content.includes('brisk-cluster-shifts-ac3d97'));

    for (const shape of [
      `sk-proj-${'x'.repeat(30)}`,
      `sk-or-v1-${'y'.repeat(30)}`,
      `  sk-${'z'.repeat(30)}`,
      `OPENAI_API_KEY=sk-proj-${'q'.repeat(30)}`,
      'key: "sk-' + 'w'.repeat(30) + '"',
      '-----BEGIN OPENSSH PRIVATE KEY-----',
    ]) {
      await writeFile(join(root, 'leak.md'), `# Note\n${shape}`);
      await assert.rejects(previewIntake({ root, files: ['leak.md'] }), /Credential-like/);
    }
  });
});
test('metadata is bounded and BOM and original text are retained', async () => {
  await withFixture(async (root) => {
    const text = '\ufeff# Original\n' + Array.from({ length: 600 }, (_, i) => `## Heading ${i}\n[[note-${i}]]`).join('\n');
    await writeFile(join(root, 'bounded.md'), text);
    const { documents: [document] } = await previewIntake({ root, files: ['bounded.md'] });
    assert.equal(document.content, text);
    assert.equal(document.metadataTruncated, true);
    assert.equal(document.headings.length, 200);
    assert.equal(document.wikilinks.length, 500);
  });
});
