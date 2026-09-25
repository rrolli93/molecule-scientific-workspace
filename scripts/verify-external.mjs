import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
const baseURL = "http://localhost:3026";
const owner = "external-" + crypto.randomUUID() + "@example.invalid";
const headers = { "oai-authenticated-user-email": owner, Origin: baseURL };
const api = await request.newContext({ baseURL, extraHTTPHeaders: headers });
const browser = await chromium.launch({ channel: "chrome" });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    extraHTTPHeaders: headers,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL + "/memory");
  await page.getByText("Saved revision 0", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Integrations", exact: true }).click();
  await page
    .getByRole("button", { name: "Import verified test result" })
    .click();
  await page.getByText("Saved revision 1", { exact: false }).waitFor();
  await page.reload();
  await page.getByText("Saved revision 1", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Integrations", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Import verified test result" })
      .count(),
    0,
  );
  let data = await (await api.get("/api/memory")).json();
  assert.equal(data.state.externalEvidence[0].status, "proposed");
  const duplicate = await api.post("/api/memory", {
    data: {
      id: crypto.randomUUID(),
      revision: 1,
      role: "scientist",
      action: "import_external",
    },
  });
  assert.equal(duplicate.status(), 409);
  await page.getByRole("button", { name: "Demo scientist" }).click();
  await page
    .getByLabel("Integration review rationale")
    .fill("Verified synthetic arithmetic and provenance; no biological claim.");
  await page.getByRole("button", { name: "Accept integration test" }).click();
  await page.getByText("Saved revision 2", { exact: false }).waitFor();
  await page.reload();
  await page.getByText("Saved revision 2", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Integrations", exact: true }).click();
  data = await (await api.get("/api/memory")).json();
  assert.equal(data.state.externalEvidence[0].status, "accepted");
  assert.equal(data.state.knowledge.length, 0);
  const other = await request.newContext({
    baseURL,
    extraHTTPHeaders: { "oai-authenticated-user-email": "other-" + owner },
  });
  assert.equal(
    (
      (await (await other.get("/api/memory")).json()).state.externalEvidence ??
      []
    ).length,
    0,
  );
  await other.dispose();
  await page.screenshot({
    path: "public/screenshot.jpeg",
    type: "jpeg",
    quality: 88,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "No mobile horizontal overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser import/review, refresh persistence, duplicate rejection, owner isolation, no scientific promotion, mobile layout.",
  );
} finally {
  await browser.close();
  await api.dispose();
}
