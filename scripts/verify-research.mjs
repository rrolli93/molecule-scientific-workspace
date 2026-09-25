import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
const baseURL = "http://localhost:3027";
const owner = "research-" + crypto.randomUUID() + "@example.invalid";
const headers = { "oai-authenticated-user-email": owner, Origin: baseURL };
const api = await request.newContext({
  baseURL,
  extraHTTPHeaders: headers,
  timeout: 60000,
});
const browser = await chromium.launch({ channel: "chrome" });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    extraHTTPHeaders: headers,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL + "/research");
  await page.getByText("Saved revision 0", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Run public-evidence demo", exact: true })
    .click();
  await page
    .getByText("Saved revision 1", { exact: false })
    .waitFor({ timeout: 60000 });
  let d = await (await api.get("/api/memory")).json();
  assert.equal(
    d.state.researchRuns[0].status,
    "ready_for_review",
    JSON.stringify(d.state.researchRuns[0].sources),
  );
  assert.equal(d.state.researchRuns[0].sources.length, 3);
  console.log(
    "LIVE SOURCE RECEIPTS",
    JSON.stringify(d.state.researchRuns[0].sources),
  );
  await page.getByRole("button", { name: "Demo scientist" }).click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("textbox")
      .first()
      .fill(
        "Test identity review: " +
          (i === 0
            ? "retain source-scoped observation"
            : "exclude to demonstrate selective context"),
      );
    await page
      .getByRole("button", {
        name: i === 0 ? "Approve claim" : "Reject claim",
        exact: true,
      })
      .first()
      .click();
    await page
      .getByText("Saved revision " + (i + 2), { exact: false })
      .waitFor();
  }
  await page.reload();
  await page.getByText("Saved revision 4", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Rerun with approved context" })
    .click();
  await page
    .getByText("Saved revision 5", { exact: false })
    .waitFor({ timeout: 60000 });
  d = await (await api.get("/api/memory")).json();
  assert.equal(d.state.researchRuns[1].status, "ready_for_review");
  assert.equal(d.state.researchRuns[1].context.approvedClaims.length, 1);
  assert.equal(d.state.researchRuns[0].context.approvedClaims.length, 0);
  assert.equal(d.state.knowledge.length, 0);
  const other = await request.newContext({
    baseURL,
    extraHTTPHeaders: { "oai-authenticated-user-email": "other-" + owner },
  });
  assert.equal(
    ((await (await other.get("/api/memory")).json()).state.researchRuns ?? [])
      .length,
    0,
  );
  await other.dispose();
  await page.screenshot({
    path: "public/screenshot.jpeg",
    type: "jpeg",
    quality: 88,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: live retrieval twice; review; persistence; approved-only frozen context; owner isolation; mobile layout.",
  );
} finally {
  await browser.close();
  await api.dispose();
}
