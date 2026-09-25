#!/usr/bin/env node
/**
 * Has any captured source changed since it was captured?
 *
 * Re-hashes each vault file named in a captured program's provenance and
 * compares it to the SHA-256 recorded at capture time. Read-only: it opens the
 * vault files, writes nothing anywhere, and makes no network or model call.
 *
 * Following the vault's own convention in
 * docs/vault-maintenance/canonical-state-guide.md, a changed source prompts
 * REVIEW. It does not promote the new content, and it does not tell you the
 * workspace is wrong: it tells you the workspace is showing text that the
 * vault has since edited, and that a human should decide what that means.
 *
 *   node scripts/check-capture-drift.mjs --root "/abs/path/to/vault" \
 *     [--program lib/workspace/captured/kiss1r-round1.ts]
 *
 * Exit 0 = every source matches. Exit 1 = drift, or a source is unreadable.
 */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing --${name}`);
}

const root = arg("root");
if (!isAbsolute(root)) throw new Error("--root must be an absolute path.");
const programPath = resolve(
  arg("program", "lib/workspace/captured/kiss1r-round1.ts"),
);

const { capturedProgram } = await import(pathToFileURL(programPath).href);
const records = capturedProgram.evidence.filter((e) => e.provenance);
if (!records.length) {
  console.error("No captured records with provenance; nothing to check.");
  process.exit(1);
}

const rootReal = resolve(root);
let changed = 0;
let unreadable = 0;
const rows = [];

for (const record of records) {
  const { path, sha256, bytes, capturedAt } = record.provenance;
  const full = resolve(join(rootReal, path));
  // Refuse to read outside the named root even if provenance were tampered with.
  if (full !== rootReal && !full.startsWith(rootReal + sep)) {
    rows.push(["REFUSED", record.id, path, "resolves outside --root"]);
    unreadable++;
    continue;
  }
  let current;
  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error("not a regular file");
    current = await readFile(full);
  } catch (error) {
    rows.push(["MISSING", record.id, path, error.message]);
    unreadable++;
    continue;
  }
  const digest = createHash("sha256").update(current).digest("hex");
  if (digest === sha256) {
    rows.push(["ok", record.id, path, `captured ${capturedAt.slice(0, 10)}`]);
    continue;
  }
  changed++;
  const delta = current.byteLength - bytes;
  rows.push([
    "CHANGED",
    record.id,
    path,
    `${bytes} -> ${current.byteLength} bytes (${delta > 0 ? "+" : ""}${delta})`,
  ]);
}

const width = Math.max(...rows.map((r) => r[2].length));
for (const [state, id, path, note] of rows) {
  const line = `${state.padEnd(8)} ${id.padEnd(4)} ${path.padEnd(width)}  ${note}`;
  if (state === "ok") console.log(line);
  else console.error(line);
}

console.log(
  `\n${records.length} captured sources · ${records.length - changed - unreadable} unchanged · ${changed} changed · ${unreadable} unreadable`,
);

if (changed || unreadable) {
  console.error(
    "\nDrift is a prompt to review, not a result. The workspace is showing the\n" +
      "text captured at the recorded time; the vault has since been edited. Decide\n" +
      "what changed and whether it alters the programme, then re-run the intake\n" +
      "preview and scripts/build-captured-program.mjs to re-capture deliberately.",
  );
  process.exit(1);
}
console.log("Every captured source still matches its recorded fingerprint.");
