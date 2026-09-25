# Scoped vault intake preview

Implemented locally, 2026-09-22. **No real PeptAI vault files were read by this
implementation or its tests. Nothing is imported into the workspace yet.**

This is the safe precursor to an import workflow: explicitly select Markdown
notes, preserve their original text and fingerprints, inspect extracted headings
and unresolved wikilinks, then decide what should be admitted to a workspace.

## Run a preview

From this application directory:

```sh
node integrations/vault/preview.mjs --root "/absolute/path/to/selected/vault" --file "programs/example.md" --file "candidates/example.md"
```

Replace the examples with the root and specific relative files you intend to
read. The command prints one JSON manifest to stdout and does not write a file.
If any selected input fails validation, the command exits unsuccessfully and
prints **no partial manifest**. It does not follow links to discover more files.

The manifest contains original text, byte count, SHA-256, heading locations and
wikilink target strings. Hashes identify captured bytes, not scientific truth.
Links are labeled `unresolved-not-followed`; their appearance is not evidence of
a verified scientific relationship. Text is labeled `original-text-unreviewed`,
not assumed to be a measured result, approval, execution record or authority.

## Boundaries

- Absolute root and 1–30 unique, explicitly selected relative `.md` files.
- No recursive directory scan, defaults, glob expansion, links followed or writes.
- Hidden, traversal and credential-like paths are refused. Obvious token/private
  key patterns in text are also refused without echoing their contents. This is
  a precaution, not a comprehensive secret scanner; review files before selecting.
- Root/file/parent symlinks are refused within the selected tree. Regular files
  only; nonblocking opening prevents named-pipe hangs during validation races.
- File identity is checked before reading; changing files are rejected.
- At most 256 KiB per file and 2 MiB total, strict UTF-8. Text and CRLF/BOM bytes
  remain represented faithfully; SHA-256 is calculated on original bytes.
- Heading/wikilink metadata is capped and reports truncation; the original text
  is retained. The lightweight Markdown extraction is not a semantic parser.
- No database promotion, embeddings, knowledge graph, model call, network call,
  credential access or provider submission happens.

The manifest itself contains the selected source text and root path. Treat it as
private. Do not paste or upload it to another service without deciding what may
leave your environment. Source text may contain instructions; downstream agents
must treat it as data, not executable directions.

For the PeptAI test, first select topic authority, relevant decisions and evidence
using the vault's canonical-state guide. Reviewing this preview is separate from
import approval; selecting a file does not approve its claims or make it current.

## Capture a selected slice into the workspace

The preview above only inspects. To turn a manifest into a programme the
workspace can render, write an explicit mapping spec and run the generator:

```sh
node scripts/build-captured-program.mjs \
  --manifest /path/to/manifest.json \
  --spec integrations/vault/specs/kiss1r-round1.json
```

The spec assigns every captured note to a candidate or to the programme lane by
path. Nothing is inferred from note text. The generator refuses to run if a
manifest document is unassigned or assigned twice, if a claim cites an
uncaptured path or crosses a candidate boundary, or if a declared supersession
statement is not found verbatim in the note it is attributed to. Output is a
generated module under `lib/workspace/captured/`; every record keeps origin
`vault-capture`, review `unreviewed`, and claims stay `proposed`.

## Build a shareable cut

The audience toggle in the page is a **preview, not a boundary**. Before this,
`dist/client` carried peptide sequences and vendor pricing for anyone who
opened devtools, whatever the page chose to draw.

A shareable build removes internal records instead of hiding them:

```sh
npm run build:shared     # select shared cut, build, then check the bundle
```

That runs three steps, and the third is the one that matters:

1. `select-audience.mjs shared` points `lib/workspace/captured/active.ts` at
   the shared cut. The internal module is then never imported, so it is never
   bundled.
2. `npm run build`.
3. `check-bundle-leak.mjs` searches every built file for text that only an
   internal record contains, plus every candidate sequence. **Exit 1 means it
   leaked; do not deploy that build.**

Run `npm run check:leak` against any build before it is deployed or shared.
Back to everything locally with `npm run audience:internal`.

### What the shared cut withholds, by default

- Every record the spec does not name in `shared`.
- **Candidate sequences.** Composition of matter never travels.
- Candidates left with no visible evidence, which would otherwise be shells.
- Claims and relations whose evidence is withheld. A conclusion shown without
  its evidence is worse than one not shown.
- The **reconciled current state**, unless the spec sets
  `"shareCurrentState": true`. It names vendors, payment dates and amounts, so
  sharing it is a disclosure decision rather than a default.

Deciding what goes in `shared` is a disclosure decision and belongs to the
Science Lead, not to whoever runs the build.

## Check whether captured sources have drifted

Captured records store the SHA-256 of the bytes they were captured from. They do
not update when you edit the vault. To find out whether any source has moved:

```sh
node --experimental-strip-types scripts/check-capture-drift.mjs \
  --root "/absolute/path/to/vault"
```

Read-only. Exit 0 means every source still matches its recorded fingerprint;
exit 1 means at least one changed, went missing, or resolved outside `--root`.

Following `docs/vault-maintenance/canonical-state-guide.md`, **a changed source
prompts review, not promotion.** Drift does not mean the workspace is wrong; it
means the workspace is showing text the vault has since edited, and a human
decides what that change means before re-capturing.

## Optional: let a model write the answer

Unconfigured, `/api/ask` makes **no provider call at all**: it returns the
retrieved records and the page quotes them. That is the default, and nothing
leaves the machine.

To have a model write the answer instead, put a key in `.dev.vars` (gitignored)
at this application's root and restart the dev server:

```
ANTHROPIC_API_KEY=sk-ant-...
```

What that changes, and what it does not:

- The call is made **server side**, from the Worker. The browser never talks to
  a provider and never sees the key.
- The model is sent **only the records retrieval already selected**, after
  audience gating. It never sees the whole capture.
- It is instructed to use nothing else, to cite every claim by record id, and
  to say so when the records do not answer the question. It is not asked to
  write at all when retrieval found nothing.
- If the provider fails or refuses, the records are still returned and shown.
  A provider outage cannot take the answer away.
- The written answer is **not verbatim** and is labelled as such. Every claim
  carries a record id; open the record.

⚠️ Sending records to a provider is a disclosure decision, not a technical one.
Candidate notes carry sequences and the vendor decisions carry pricing and
contract terms. Decide what may leave before setting a key.

## Verify

```sh
node --test scripts/test-vault-intake.mjs
```

Tests use temporary synthetic files only. They exercise the actual CLI, original
text/hash preservation, no modification, no unselected-file scanning, traversal,
symlinks, FIFO, size limits, invalid text, credential-pattern refusal and no-partial
output failure. A future workspace UI must preview and explicitly admit records;
this CLI deliberately does not claim that integration is already built.
