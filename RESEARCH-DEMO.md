# Public-evidence demo

Question: Does binding establish activation? Compare exendin-4 and exendin-(9–39) at GLP-1R.

## Executed versus prepared

- Preparation: bounded Parallel academic/general searches and primary-abstract checking by Codex.
- Each app run: three live, fixed-identifier Europe PMC requests from the authenticated server; PMID/source checks, abstract SHA-256 comparison, source receipts, immutable context snapshot.
- Interpretation: pre-authored from those exact abstract versions. Not live model synthesis. All three must verify before claims are offered.
- Review: signed-in owner uses simulated scientist/reviewer roles. Claim decisions and rationale persist in D1. Only the latest reviewed decision per claim determines eligibility for future context; a rejection supersedes an earlier approval. Earlier run snapshots never change.
- No OpenScience/Ace, Paperclip, Hermes, or Qdrant call. OpenResearch's earlier arithmetic test is unrelated to biological validity. No raw dose-response data obtained; no potency calculation or wet-lab work executed.

## Scientific scope

Thorens et al. (1993), PMID 8405712, DOI 10.2337/diab.42.11.1678: the abstract reports similar binding affinity for the pair at human GLP-1R expressed in fibroblasts, with exendin-4 stimulating cAMP and exendin-(9–39) inhibiting GLP-1-driven cAMP. The abstract's Kd and EC50 values describe GLP-1, not exendin-4.

Göke et al. (1993), PMID 8396143, DOI 10.1016/S0021-9258(19)36565-2: the abstract describes binding and functional assays in rodent systems, supporting exendin-4 agonism and antagonism by the amidated truncated peptide.

Fehmann et al. (1994), PMID 7937318, DOI 10.1016/0196-9781(94)90204-6: rat GLP-1R expressed in CHO cells supplies another binding/function comparison. Author overlap limits claims of fully independent replication.

Inference: binding alone does not classify agonism; functional measurements are required. Species, constructs, peptide forms and assays must remain attached to each conclusion. This selected historical example is not an exhaustive review, clinical guidance or evaluation of a VivaMed candidate. Full texts, raw curves, effect-size uncertainty and replication quality have not been audited.

Proposed next experiment is a matched binding/functional comparison in human GLP-1R cells, with reference agonist, vehicle, receptor-negative and viability controls and planned replication. It is a proposal only.

## Verification

Run Node domain tests with:

    node --experimental-strip-types --test scripts/test-memory.mjs scripts/test-external.mjs scripts/test-research.mjs

Run the dev server on port 3027, then:

    node scripts/verify-research.mjs

The latter contacts Europe PMC twice and writes only randomized local test-owner records. It verifies claim review, refresh persistence, approved-only context, owner isolation and mobile layout. It does not approve records for the real user. Initial Worker test exposed unsupported redirect:error; fixed to redirect:manual, with non-2xx treated as failures. No redirects are followed. Sources are fixed server-side, with time/response-size limits. No schema migration or auth relaxation.

Primary source links:

- https://pubmed.ncbi.nlm.nih.gov/8405712/
- https://pubmed.ncbi.nlm.nih.gov/8396143/
- https://pubmed.ncbi.nlm.nih.gov/7937318/
