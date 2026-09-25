import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
const baseURL = "http://localhost:3028";
const owner = "challenge-" + crypto.randomUUID() + "@example.invalid";
const headers = { "oai-authenticated-user-email": owner, Origin: baseURL };
const api = await request.newContext({
  baseURL,
  extraHTTPHeaders: headers,
  timeout: 60000,
});
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 750 },
    extraHTTPHeaders: headers,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL + "/challenge");
  await page.getByText("Saved revision 0", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Approve proposal", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Add package to review queue" })
    .click();
  await page.getByText("Saved revision 1", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Demo scientist" }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("textbox")
      .first()
      .fill(
        "Disposable test review: " + (i ? "reject" : "retain scoped context"),
      );
    await page
      .getByRole("button", {
        name: i ? "Reject proposal" : "Approve proposal",
        exact: true,
      })
      .first()
      .click();
    await page
      .getByText("Saved revision " + (i + 2), { exact: false })
      .waitFor();
  }
  await page.reload();
  await page.getByText("Saved revision 3", { exact: false }).waitFor();
  let d = await (await api.get("/api/memory")).json();
  assert.deepEqual(
    d.state.challengeRecords[0].claims.map((c) => c.status),
    ["approved", "rejected"],
  );
  assert.equal(d.state.knowledge.length, 0);
  // A real public retrieval uses only this test account's approved context.
  const r = await api.post("/api/memory", {
    data: {
      id: crypto.randomUUID(),
      revision: d.revision,
      action: "research_start",
      role: "scientist",
    },
  });
  assert.equal(r.status(), 200);
  d = await r.json();
  assert.equal(
    d.state.researchRuns[0].context.approvedChallengeClaims.length,
    1,
  );
  assert.equal(
    d.state.researchRuns[0].context.approvedChallengeClaims[0].status,
    "approved",
  );
  const stale = await api.post("/api/memory", {
    data: {
      id: crypto.randomUUID(),
      revision: 0,
      action: "challenge_import",
      role: "scientist",
    },
  });
  assert.equal(stale.status(), 409);
  const anon = await request.newContext({ baseURL });
  assert.equal((await anon.get("/api/memory")).status(), 401);
  await anon.dispose();
  const other = await request.newContext({
    baseURL,
    extraHTTPHeaders: { "oai-authenticated-user-email": "other-" + owner },
  });
  assert.equal(
    (
      (await (await other.get("/api/memory")).json()).state.challengeRecords ??
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
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: import, explicit approval/rejection, reload, approved-only public context, revision conflict, auth, owner isolation, responsive layout.",
  );
} finally {
  await browser.close();
  await api.dispose();
}
