export const question =
  "Does GLP-1 receptor binding establish activation? Compare exendin-4 with exendin-(9–39).";
export const recipe = "exendin-primary-abstracts-v1";
export const selectedSources = [
  {
    id: "8405712",
    label: "Thorens et al. · 1993 · human GLP-1R",
    hash: "90344f920caad5e55e000143fb1eeecdbd76ad10fea581b2889a5a259f6b69bc",
  },
  {
    id: "8396143",
    label: "Göke et al. · 1993 · insulinoma cells and rat islets",
    hash: "09847947b2c2508932fd2b56c6b9fdaac89b6386eb982d79838757ede296a775",
  },
  {
    id: "7937318",
    label: "Fehmann et al. · 1994 · rat GLP-1R in CHO cells",
    hash: "d60e2f74581dd22f22193125bf2b48ae5b71985471296af117fe5f3ebf8175af",
  },
];
export const proposals = [
  {
    key: "exendin-human-v1",
    kind: "reported observation",
    text: "In fibroblasts expressing human GLP-1R, the two peptides had similar reported binding affinities, but exendin-4 increased cAMP whereas exendin-(9–39) inhibited GLP-1-driven cAMP.",
    evidence: ["8405712"],
    limitation:
      "Abstract-level assessment of an engineered cell system. The abstract's Kd 0.5 nM and EC50 93 pM describe GLP-1, not exendin-4.",
  },
  {
    key: "exendin-functional-v1",
    kind: "reported observation",
    text: "The 1993 rodent-cell/islet study reports exendin-4-driven cAMP and glucose-dependent insulin secretion, with inhibition by exendin-(9–39)-amide. The 1994 rat-receptor CHO study also reports exendin-4 agonism and exendin-(9–39) antagonism.",
    evidence: ["8396143", "7937318"],
    limitation:
      "Models, receptor species and peptide forms differ. Author overlap means these are not wholly independent research teams; do not pool potency values across assays.",
  },
  {
    key: "binding-not-activation-v1",
    kind: "inference",
    text: "Binding alone is insufficient to classify a peptide as an agonist. For this pair, functional cAMP measurements distinguish activation from blockade under the reported conditions.",
    evidence: ["8405712", "8396143", "7937318"],
    limitation:
      "This is a bounded teaching example, not a systematic review, universal pathway classification, or a recommendation about a VivaMed candidate.",
  },
];
export const nextExperiment =
  "Proposed, not executed: compare both peptides in the same human GLP-1R cell system using concentration-response cAMP measurements, peptide alone and with a reference agonist. Include vehicle, reference agonist, receptor-negative cells and viability controls; predefine analysis and independent replication. Pair functional measurements with binding data. Determine replication and power from pilot variance rather than inventing a sample size.";
export type ResearchClaim = (typeof proposals)[number] & {
  status: "proposed" | "approved" | "rejected";
  decision?: { actor: string; at: string; rationale: string };
};
export type SourceReceipt = {
  id: string;
  label: string;
  url: string;
  endpoint: string;
  retrievedAt: string;
  status: "verified" | "changed" | "failed";
  httpStatus?: number;
  title?: string;
  doi?: string;
  year?: string;
  abstractSha256?: string;
  error?: string;
};
export type ResearchRun = {
  id: string;
  actor: string;
  createdAt: string;
  completedAt: string;
  recipe: string;
  question: string;
  status: "ready_for_review" | "retrieval_incomplete";
  sources: SourceReceipt[];
  claims: ResearchClaim[];
  context: {
    approvedClaims: ResearchClaim[];
    priorRunIds: string[];
    approvedChallengeClaims?: import("./challenge-package.ts").ChallengeClaim[];
  };
};
export function approvedResearchClaims(runs: ResearchRun[]) {
  const latest = new Map<string, ResearchClaim>();
  for (const run of runs)
    for (const claim of run.claims) {
      if (claim.status !== "proposed") latest.set(claim.key, claim);
    }
  return [...latest.values()]
    .filter((c) => c.status === "approved")
    .map((c) => structuredClone(c));
}
export async function retrieveResearch(
  fetcher: typeof fetch = fetch,
): Promise<SourceReceipt[]> {
  return Promise.all(
    selectedSources.map(async (source) => {
      const endpoint =
        "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=" +
        encodeURIComponent("EXT_ID:" + source.id + " AND SRC:MED") +
        "&format=json&resultType=core";
      const receipt: SourceReceipt = {
        id: source.id,
        label: source.label,
        url: "https://pubmed.ncbi.nlm.nih.gov/" + source.id + "/",
        endpoint,
        retrievedAt: new Date().toISOString(),
        status: "failed",
      };
      try {
        const response = await fetcher(endpoint, {
          redirect: "manual",
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        receipt.httpStatus = response.status;
        if (!response.ok) throw new Error("HTTP " + response.status);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Missing response body");
        let size = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 200000) throw new Error("Response exceeds limit");
            chunks.push(value);
          }
        } finally {
          await reader.cancel();
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        const json = JSON.parse(new TextDecoder().decode(bytes));
        const record = json.resultList?.result?.find(
          (r: { id: string; source: string }) =>
            r.id === source.id && r.source === "MED",
        );
        if (
          !record ||
          typeof record.abstractText !== "string" ||
          typeof record.title !== "string"
        )
          throw new Error("Expected primary abstract missing");
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(record.abstractText),
        );
        receipt.abstractSha256 = Array.from(new Uint8Array(digest))
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        receipt.title = record.title.slice(0, 500);
        receipt.doi = String(record.doi ?? "").slice(0, 150);
        receipt.year = String(record.pubYear ?? "").slice(0, 10);
        receipt.status =
          receipt.abstractSha256 === source.hash ? "verified" : "changed";
        if (receipt.status === "changed")
          receipt.error =
            "Abstract changed since preparation. Prepared claims withheld; fresh source review required.";
      } catch (e) {
        receipt.error =
          e instanceof Error ? e.message.slice(0, 200) : "Retrieval failed";
      }
      receipt.retrievedAt = new Date().toISOString();
      return receipt;
    }),
  );
}
