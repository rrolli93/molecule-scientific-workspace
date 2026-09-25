# Molecule scientific workspace

A workspace where a scientific programme's real record becomes askable and
auditable: you ask a question in plain words, and the answer comes back quoted
from a dated source record, with its evidential standing attached and a
citation you can open.

The point is the standing. The record says whether something is *recorded*,
*not confirmed*, *open*, or has *no result*, and the workspace never collapses
those into each other. A model can write the prose, but it may only use records
retrieval selected, and it must say so when they do not answer the question.

Built by Molecule. `/workspace` is the current surface.

## Running it

Node >= 22.13, npm.

```sh
npm ci
npm run dev -- --port 3034
```

Open `http://localhost:3034/workspace` (use `localhost`, not an IPv4 literal:
this may bind IPv6). The local demo identity is **not** authentication and the
dev server must not be exposed to a network.

Two workspaces ship: **VivaMed**, synthetic fixtures that demonstrate the whole
surface, and **PeptAI**, which is empty here (see below).

## What is deliberately not in this repository

**No captured programme.** `lib/workspace/captured/` is empty apart from the
selector. Captured modules are generated from a private vault and hold its real
prose, so they are gitignored along with the mapping specs under
`integrations/vault/specs/`.

That is not over-caution. Marking a record "shareable" is not enough: a record
cleared for sharing can still discuss sequences, vendors and prices in its own
body, which is exactly what happened the first time. The safe default for
anything that leaves a machine is to carry no capture at all.

To capture a programme from a vault you control, see
[VAULT-INTAKE.md](VAULT-INTAKE.md). In short:

```sh
node integrations/vault/preview.mjs --root <vault> --file <note.md> ... > manifest.json
node scripts/build-captured-program.mjs --manifest manifest.json --spec <spec.json>
node scripts/select-audience.mjs internal
```

`scripts/check-bundle-leak.mjs` inspects a build for record text that should not
be in it. Run it before anything is deployed.

## Asking

The ask box works with no provider configured: it retrieves records and quotes
them verbatim, and says plainly when the capture does not answer a question.

Set `ANTHROPIC_API_KEY` in `.dev.vars` (gitignored) and restart, and a model
writes the answer instead — server-side, from only the retrieved records, with
every claim cited. The browser never contacts a provider and never sees the key.
Fonts are self-hosted for the same reason.

## Verifying

```sh
node --experimental-strip-types --test scripts/test-*.mjs
npm run build
node scripts/verify-workspace.mjs      # needs the dev server and Chrome
node scripts/verify-observatory.mjs
```

The browser verifiers assert that the page only ever talks to this origin.

## Further reading

- [VAULT-INTAKE.md](VAULT-INTAKE.md) — capture, audiences, drift
- [LOCAL-WORKBENCH.md](LOCAL-WORKBENCH.md) — running the increment
- [MCP-CONNECTION.md](MCP-CONNECTION.md) — read-only MCP adapter
- [EVOLUTION-PLAN.md](EVOLUTION-PLAN.md), [IMPLEMENTATION-SPEC.md](IMPLEMENTATION-SPEC.md) — roadmap
- [HANDOFF.md](HANDOFF.md) — engineering handoff

---

Built on [vinext](https://github.com/cloudflare/vinext) with Cloudflare Workers,
D1 and Drizzle.
