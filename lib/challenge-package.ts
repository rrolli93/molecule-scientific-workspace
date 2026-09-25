// Captured real local run, with source-scoped Codex QA. No human approval implied.
export type ChallengeClaim = {
  key: string;
  title: string;
  text: string;
  relationship: string;
  pmid: string;
  doi: string;
  sourceTitle: string;
  abstractSHA256: string;
  limitation: string;
  qa: string;
  status: "proposed" | "approved" | "rejected";
  decision?: { actor: string; at: string; rationale: string };
};
export type ChallengeRecord = {
  id: string;
  importedBy: string;
  importedAt: string;
  claims: ChallengeClaim[];
};
export function approvedChallengeClaims(records: ChallengeRecord[] = []) {
  return structuredClone(
    records.flatMap((r) => r.claims).filter((c) => c.status === "approved"),
  );
}
export const challengePackage = {
  id: "openscience-exendin-challenge-v1",
  sessionId: "ses_f4f7cf2cbffeMy7OKTsImwL5Bd",
  runtime: "OpenScience 2.0.118",
  model: "openai/gpt-4.1-mini",
  createdAt: "2026-09-17T17:56:26.806Z",
  question:
    "What primary evidence limits generalization of the three approved exendin claims?",
  mode: "Captured local agent run; this page does not launch OpenScience.",
  calls: 3,
  costUSD: 0.012076,
  totalAttemptCostUSD: 0.0193708,
  inputContext:
    "The three previously approved public-evidence claims were supplied in the agent prompt from the user's shared run. This was not a live read of the hosted workspace.",
  searches: [
    {
      url: "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=exendin%20AND%20inverse%20agonist&format=json&resultType=core&pageSize=4",
      at: "2026-09-17T17:56:16.000Z",
      status: "completed",
      totalHits: 519,
      returned: [
        {
          pmid: "41766452",
          title:
            "Sex Differences in [ &lt;sup&gt;68&lt;/sup&gt;Ga]Ga-NODAGA-Exendin-4 Uptake in the Pituitary of Individuals With Type 2 Diabetes.",
          hasAbstract: false,
        },
        {
          pmid: "41563358",
          title:
            "Comparative Effectiveness of SGLT2 Inhibitor and GLP-1 Receptor Agonist on Kidney and Cardiovascular Outcomes by Kidney Failure Risk.",
          hasAbstract: true,
        },
        {
          pmid: "42390942",
          title:
            "Personalizing Cardio-Kidney-Metabolic Therapy: Closer but Not There Yet.",
          hasAbstract: false,
        },
        {
          pmid: "41637494",
          title:
            "In vivo functional profiling and structural characterization of the human &lt;i&gt;GLP1R&lt;/i&gt; A316T variant.",
          hasAbstract: true,
        },
      ],
    },
    {
      url: "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=exendin%20AND%20(partial%20agonist%20OR%20biased%20signaling)&format=json&resultType=core&pageSize=4",
      at: "2026-09-17T17:56:16.167Z",
      status: "completed",
      totalHits: 1117,
      returned: [
        {
          pmid: "42157826",
          title:
            "In Vitro Characterization of Agonist and Antagonist Peptide Binding Interaction Kinetics to GLP-1R in HEK293T Cells Using Surface Plasmon Resonance Microscopy.",
          hasAbstract: true,
        },
        {
          pmid: "42592034",
          title:
            "Rationale of renewed efforts in developing MC4R modulators to treat metabolic disorders.",
          hasAbstract: true,
        },
        {
          pmid: "42666495",
          title:
            "GLP-1 and GIP class drugs have neuroprotective properties in Alzheimer's and Parkinson's disease.",
          hasAbstract: true,
        },
        {
          pmid: "42602523",
          title:
            "Glucagon-like peptide-1 and peptide YY multi-agonism with GEP44 to optimize weight loss and glycemic control while reducing gastrointestinal side effects: the future of anti-obesity pharmacotherapy?",
          hasAbstract: true,
        },
      ],
    },
  ],
  coverage:
    "Two broad searches, four records each, default ordering; only six of eight records contain abstracts. Search terms were not phrase-scoped and produced substantial irrelevant material. Not an exhaustive challenge or a demonstration that counterevidence is absent. Full text was not reviewed.",
  proposals: [
    {
      key: "challenge-binding-kinetics-v1",
      title: "Binding kinetics: a follow-up, not a refutation",
      text: "A 2026 SPRM study in GLP-1R-overexpressing HEK293T cells reports two-mode binding for tested agonists including exendin-4, versus single-mode binding for an antagonist named “exendin-9”. This motivates checking binding kinetics alongside equilibrium affinity.",
      relationship: "Indirect contextual limitation",
      pmid: "42157826",
      doi: "10.1021/acsmedchemlett.6c00091",
      sourceTitle:
        "In Vitro Characterization of Agonist and Antagonist Peptide Binding Interaction Kinetics to GLP-1R in HEK293T Cells Using Surface Plasmon Resonance Microscopy.",
      abstractSHA256:
        "eb91992b50a454c2f1d16f60000654c9328939ccc72602f06265083db3f11961",
      limitation:
        "Abstract only. It does not establish that the antagonist is the exact exendin-(9–39) preparation used in the original studies. Receptor species is not specified in this abstract. Binding-mode interpretation is not an independent functional validation; full-text methods and matched functional measurements are needed.",
      qa: "Narrowed by Codex: removed unsupported human-receptor specificity and the proposed rewrite of the 1993 observation. No original claim is superseded.",
    },
    {
      key: "challenge-receptor-variant-v1",
      title: "Receptor variant: preserve the experimental context",
      text: "A human GLP1R A316T study reports constitutive-activation characteristics and dampened agonist responses in β-cell models, with blunted pharmacological responses in a humanized mouse model. Receptor genotype therefore belongs in the context of a functional comparison.",
      relationship: "Indirect contextual limitation",
      pmid: "41637494",
      doi: "10.1126/sciadv.adw0899",
      sourceTitle:
        "In vivo functional profiling and structural characterization of the human GLP1R A316T variant.",
      abstractSHA256:
        "d767ce92680e31e74cc81701d9ea0f16697ef6a45556b8e641bbf4200fff1b3e",
      limitation:
        "Abstract only; this is a specific human receptor variant, not evidence of a general rodent-versus-human difference. The abstract does not establish effects for the exact exendin pair or refute the original wild-type-system observations.",
      qa: "Narrowed by Codex: retained the variant-specific observation; removed a broad species-translation conclusion. This does not demonstrate exendin-(9–39) partial agonism.",
    },
  ],
  quarantined: [
    {
      title: "Third agent proposal excluded",
      reason:
        "The agent paired PMID 42592034 (an MC4R review) with the title and DOI of PMID 42602523 (a GEP44 review). The citation does not match, neither is the requested primary evidence, and the proposed ‘limitation’ does not refute binding-versus-activation reasoning.",
      rawProposal: {
        claim: "(3) binding alone does not establish activation",
        relationship: "limitation",
        pmid: "42592034",
        doi: "10.3389/fendo.2026.1925534",
        title:
          "Glucagon-like peptide-1 and peptide YY multi-agonism with GEP44 to optimize weight loss and glycemic control while reducing gastrointestinal side effects: the future of anti-obesity pharmacotherapy?",
        year: 2026,
        experimental_context:
          "Review of multi-agonist peptides including GLP-1R agonists and their metabolic effects in rodent models and clinical contexts.",
        abstract_support:
          "Multi-agonists targeting GLP-1R and other receptors show complex pharmacology with synergistic effects on weight loss and glycemic control, indicating that receptor activation involves more than simple binding.",
        limitation:
          "This supports the claim that binding alone does not establish activation and further shows that multi-receptor and biased signaling contribute to functional outcomes, limiting simple interpretations of binding data.",
        suggested_update:
          "Update claim (3) to emphasize that activation involves complex signaling and multi-receptor interactions beyond binding, including biased agonism and multi-agonism.",
      },
    },
  ],
  priorFailures: [
    {
      stage: "DNS failure",
      result: "No abstracts retrieved; no findings accepted.",
    },
    {
      stage: "Download-only run",
      result:
        "Agent saw receipts, not source text, but claimed abstract review. Entire output excluded.",
    },
  ],
  summary:
    "Two source-scoped proposals prepared for review; one citation error excluded. No direct contradiction established. Codex QA is not human approval.",
};
