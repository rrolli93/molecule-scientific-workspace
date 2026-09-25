#!/usr/bin/env node
/**
 * Does the built bundle contain records it should not?
 *
 * Reads the internal captured cut, works out which records are NOT shared,
 * and searches every built file for text that only those records contain. It
 * checks the artifact, not the intent: a page can gate, filter and label all
 * it likes, and none of that matters if the strings are in the JavaScript.
 *
 *   node scripts/select-audience.mjs shared && npm run build
 *   node scripts/check-bundle-leak.mjs
 *
 * Exit 0 = nothing internal is in the bundle. Exit 1 = it leaked.
 * Run this before anything is deployed or shared.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const capturedDir = join(root, "lib/workspace/captured");
const internalFile = readdirSync(capturedDir).find(
  (f) => f.endsWith(".ts") && !f.endsWith(".shared.ts") && f !== "active.ts",
);
if (!internalFile) throw new Error("No captured module to check against.");

const { capturedProgram } = await import(
  join(capturedDir, internalFile).replace(/^/, "file://")
);

const internalRecords = capturedProgram.evidence.filter(
  (e) => e.visibility !== "shared",
);
if (!internalRecords.length) {
  console.log("Every captured record is shared; nothing to withhold.");
  process.exit(0);
}

/**
 * Phrases that appear in an internal record and in no shared one. Short or
 * common strings would false-positive on ordinary prose, so require length
 * and uniqueness: a hit then means that record's own text is present.
 */
const sharedText = capturedProgram.evidence
  .filter((e) => e.visibility === "shared")
  .map((e) => `${e.title} ${e.text} ${e.fullText ?? ""}`)
  .join(" ");

const needles = [];
for (const record of internalRecords) {
  const source = record.fullText ?? record.text;
  for (const raw of source.split(/(?<=[.!?])\s+|\n+/)) {
    const phrase = raw.trim().replace(/\s+/g, " ");
    if (phrase.length < 45 || phrase.length > 220) continue;
    if (sharedText.includes(phrase)) continue;
    needles.push({ id: record.id, path: record.provenance?.path, phrase });
    break;
  }
  // The candidate sequence is the single most sensitive string in a record.
  const candidate = capturedProgram.candidates.find(
    (c) => c.id === record.candidateId && c.sequence,
  );
  if (candidate?.sequence)
    needles.push({
      id: record.id,
      path: record.provenance?.path,
      phrase: candidate.sequence,
    });
}

const files = [];
(function walk(d) {
  for (const entry of readdirSync(d)) {
    const full = join(d, entry);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
})(dist);

const leaks = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue; // binary asset
  }
  for (const needle of needles)
    if (text.includes(needle.phrase))
      leaks.push({ ...needle, file: relative(root, file) });
}

console.log(
  `${internalRecords.length} internal records · ${needles.length} distinctive phrases · ${files.length} built files`,
);

if (!leaks.length) {
  console.log("No internal record text found in the bundle.");
  process.exit(0);
}

const byFile = new Map();
for (const leak of leaks)
  byFile.set(leak.file, (byFile.get(leak.file) ?? new Set()).add(leak.id));
console.error("\nINTERNAL RECORDS ARE IN THE BUILD:");
for (const [file, ids] of byFile)
  console.error(`  ${file}  ${[...ids].sort().join(", ")}`);
console.error(
  "\nDo not deploy or share this build. Run:\n" +
    "  node scripts/select-audience.mjs shared && npm run build\n" +
    "then check again. Hiding these in the UI is not enough: they are in the\n" +
    "JavaScript the browser downloads.",
);
process.exit(1);
