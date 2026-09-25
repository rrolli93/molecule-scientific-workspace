/** Explicit-file, read-only Markdown intake preview. Never scans a vault. */
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const limits = Object.freeze({ files: 30, fileBytes: 256 * 1024, totalBytes: 2 * 1024 * 1024 });
const deniedName = /(^|[-_.])(?:env|credentials?|creds|secrets?|api[-_]?keys?|private[-_]?keys?|auth|tokens?)(?=$|[-_.])/i;

export function validateRelativeMarkdown(path) {
  if (typeof path !== 'string' || !path || path.length > 512 || isAbsolute(path) || /[\\:\u0000-\u001f]/.test(path)) throw new Error('Select a relative Markdown file path.');
  const segments = path.split('/');
  if (segments.some((part) => !part || part.startsWith('.') || deniedName.test(part))) throw new Error('Hidden, credential-like or traversal paths are not permitted.');
  if (!/\.md$/i.test(segments.at(-1))) throw new Error('Only explicitly selected .md files are supported.');
  return path;
}

export function parseIntakeArgs(args) {
  if (args.length < 4 || args[0] !== '--root' || !isAbsolute(args[1])) throw new Error('Usage: node integrations/vault/preview.mjs --root /absolute/vault --file relative-note.md [--file another-note.md]');
  const files = [];
  for (let i = 2; i < args.length; i += 2) {
    if (args[i] !== '--file' || !args[i + 1]) throw new Error('Only repeated --file selections are supported.');
    files.push(validateRelativeMarkdown(args[i + 1]));
  }
  if (!files.length || files.length > limits.files || new Set(files).size !== files.length) throw new Error('Select 1–30 unique Markdown files.');
  return { root: args[1], files };
}

function extractMetadata(text) {
  const headings = [];
  const wikilinks = [];
  let fence = null;
  let headingCount = 0;
  let linkCount = 0;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = { char: marker[1][0], length: marker[1].length };
      else if (marker[1][0] === fence.char && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      headingCount++;
      if (headings.length < 200) headings.push({ level: heading[1].length, text: heading[2], line: i + 1 });
    }
    for (const match of line.matchAll(/(!?)\[\[([^\]\n]{1,512})\]\]/g)) {
      linkCount++;
      if (wikilinks.length >= 500) continue;
      const [destination, ...labels] = match[2].split('|');
      const hash = destination.indexOf('#');
      wikilinks.push({ kind: match[1] ? 'embed' : 'link', target: hash < 0 ? destination : destination.slice(0, hash), fragment: hash < 0 ? null : destination.slice(hash + 1), label: labels.length ? labels.join('|') : null, line: i + 1, resolution: 'unresolved-not-followed' });
    }
  }
  return { title: headings.find((heading) => heading.level === 1)?.text ?? null, headings, wikilinks, metadataTruncated: headingCount > headings.length || linkCount > wikilinks.length };
}

async function readSelectedFile(root, selected, remaining) {
  const path = resolve(root, selected);
  const rel = relative(root, path);
  if (rel.startsWith(`..${sep}`) || rel === '..' || isAbsolute(rel)) throw new Error('Selected file is outside the root.');
  let expected;
  let cursor = root;
  const parts = selected.split('/');
  for (let i = 0; i < parts.length; i++) {
    cursor = resolve(cursor, parts[i]);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new Error('Symlink selections or parent directories are not permitted.');
    if (i < parts.length - 1 && !stat.isDirectory()) throw new Error('Selected parent is not a directory.');
    expected = stat;
  }
  if (!expected.isFile()) throw new Error('Selected input must be a regular Markdown file.');
  if (expected.size > limits.fileBytes || expected.size > remaining) throw new Error('Selected files exceed per-file or total byte limits.');
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const actual = await file.stat();
    // Reject replacement between validation and open before reading any bytes.
    if (!actual.isFile() || actual.dev !== expected.dev || actual.ino !== expected.ino || actual.size !== expected.size || actual.mtimeMs !== expected.mtimeMs || actual.ctimeMs !== expected.ctimeMs) throw new Error('Selected file changed during validation.');
    const canonicalPath = await realpath(path);
    if (canonicalPath !== path) throw new Error('Selected path changed or contains a symlink.');
    const capacity = Math.min(limits.fileBytes, remaining);
    const buffer = Buffer.alloc(capacity + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > capacity) throw new Error('Selected files exceed per-file or total byte limits.');
    const after = await file.stat();
    if (after.size !== offset || after.mtimeMs !== actual.mtimeMs || after.ctimeMs !== actual.ctimeMs) throw new Error('Selected file changed while it was read.');
    const bytes = buffer.subarray(0, offset);
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    if (/(?<![A-Za-z0-9_-])sk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) || /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*(?:API_KEY|SECRET|ACCESS_TOKEN)\s*[:=]\s*["']?[A-Za-z0-9_-]{16,}/m.test(text)) throw new Error('Credential-like content detected; preview refused.');
    return { path: selected, bytes: offset, sha256: createHash('sha256').update(bytes).digest('hex'), content: text, classification: 'original-text-unreviewed', measuredResult: 'not-assumed', approval: 'none-inferred', ...extractMetadata(text) };
  } finally { await file.close(); }
}

export async function previewIntake(input) {
  const { root: selectedRoot, files } = parseIntakeArgs(['--root', input.root, ...input.files.flatMap((file) => ['--file', file])]);
  const rootStat = await lstat(selectedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Root must be an explicitly selected non-symlink directory.');
  const root = await realpath(selectedRoot);
  const documents = [];
  let totalBytes = 0;
  for (const selected of files) {
    const document = await readSelectedFile(root, selected, limits.totalBytes - totalBytes);
    documents.push(document);
    totalBytes += document.bytes;
  }
  return { schemaVersion: 1, operation: 'vault-intake-preview', root, generatedAt: new Date().toISOString(), scope: 'explicit-file-allowlist', imported: false, sourcesModified: false, providerCalls: false, graphCreated: false, totalBytes, limits, documents, warning: 'Preview only. Original text may include observations, hypotheses, plans or instructions; no truth, approval, execution or authority is inferred. Wikilink targets are unresolved and were not read. No database import or provider disclosure occurred. Review this manifest before sharing it.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const manifest = await previewIntake(parseIntakeArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    // No partial manifest is emitted if any selected file fails.
    process.stderr.write(`Intake preview refused: ${error instanceof Error ? error.message : 'invalid input'}\n`);
    process.exitCode = 1;
  }
}
