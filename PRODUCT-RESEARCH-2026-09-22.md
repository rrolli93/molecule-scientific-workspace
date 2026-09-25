# Patterns to build into the Molecule workbench

Research date: 2026-09-22. Primary product materials and inspected source code; not an independent assessment of customers, security or scientific performance. These are independently implemented product patterns, not permission to copy another project's code.

## 1. Make incoming evidence an actionable queue

BiotechOS describes CRO data intake as extraction → QC → approval → database. Its DataQC component exposes vendor-reported versus re-derived values, proposed measurement rows, QC steps and a separate registration gate for new compounds. This is more useful inspiration than another overview dashboard. Its demo explicitly uses synthetic records and deterministic/precomputed fallbacks when credentials are absent. [BiotechOS repository](https://github.com/souravUCSF/BiotechOS), [DataQC source](https://github.com/souravUCSF/BiotechOS/blob/main/frontend/src/components/DataQC.tsx).

**Our adaptation:** a future intake item should carry the original artifact, exact version/hash, proposed extracted fields, unresolved warnings and a clear next action. Accepting extracted fields must not approve the scientific conclusion or authorize provider execution. The current notebook increment should establish the same review boundary for frozen research briefs before adding extraction.

Acceptance conditions:

- Every extracted value points to the original artifact and location.
- Unknown units, candidate identity or assay conditions block silent deposition.
- Corrections retain the original extraction and the human rationale.
- A button describes the action: “Accept this extraction”, not ambiguous “Approve”.

## 2. Treat criteria and decision context as versioned scientific records

BiotechOS's target-product-profile interface shows criteria, rationale and prior versions; updating a criterion creates a new version. The UI is an instructive pattern, not evidence that its scoring is scientifically appropriate for VivaMed. [TPP interface source](https://github.com/souravUCSF/BiotechOS/blob/main/frontend/src/app/tpp-builder/page.tsx).

**Our adaptation:** retain the current qualitative candidate matrix, with explicit “not established” and conflict states. Save each research brief's exact evidence and standards snapshot. Subsequent acceptance must not rewrite the snapshot or turn its contents into verified biology. Later, criteria can become editable only with explicit applicability, units, rationale, author and version.

Acceptance conditions:

- Old briefs remain inspectable after standards or sources change.
- A changed source marks dependent interpretations for re-review; it does not silently replace them.
- Missing evidence never counts as a passing score.
- Review acceptance, scientific claim approval and execution approval are different records.

## 3. One governed data contract, multiple interfaces

Omics-OS publicly positions its UI and programmatic agent access as interfaces to one API, with connectors, provenance and runtime dispatch behind the same boundary. Those are vendor capability claims, not security properties independently verified in this review. [Omics-OS](https://www.omics-os.com).

**Our adaptation:** UI, local MCP and eventual authenticated remote clients should read the same scoped records and preserve their provenance. A model can change without migrating the laboratory's authoritative context into a new conversation. Start with read-only MCP; enabling a connector must not implicitly authorize data export, compute spending or wallet signing.

Acceptance conditions:

- Every read is scoped to an authorized workspace and program; the caller cannot choose another owner.
- Export includes classifications, source versions, omissions and review status.
- No credentials are exposed through model context or browser bundles.
- UI and MCP do not maintain competing copies of approval or execution state.

## Deliberate non-goals of this increment

No new automatic scientific scores, invented measurements, unverified compliance claims, autonomous procurement, wallet actions, or fabricated live provider integrations. Distinctive scientific design should make evidence, uncertainty and the next action easier to inspect—not merely add decorative molecules or charts.

## Sources and inspection notes

Product/code sources (no biomedical research claims were evaluated):

- [BiotechOS repository](https://github.com/souravUCSF/BiotechOS)
- [DataQC source](https://github.com/souravUCSF/BiotechOS/blob/main/frontend/src/components/DataQC.tsx)
- [TPP interface source](https://github.com/souravUCSF/BiotechOS/blob/main/frontend/src/app/tpp-builder/page.tsx)
- [Omics-OS](https://www.omics-os.com)

The BiotechOS code inspection used the existing local research checkout at revision `2e77a8ee08c85c0e8ddba19b12753aa88e6f761a`. Fresh public-page extraction: `/tmp/molecule-workspace-product-review.json`. No BiotechOS source was copied into the workbench.
