import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { validateNotebookSnapshot } from "../integrations/mcp/notebook-snapshot.mjs";

const base = process.env.WORKSPACE_TEST_URL || "http://localhost:3034";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local demonstration only.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const question = `[Synthetic browser QA ${randomUUID()}] What conditions should be matched?`;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  const errors = [],
    unexpected = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(base).origin ||
      (url.pathname.startsWith("/api/") &&
        url.pathname !== "/api/workspace-notebook")
    )
      unexpected.push(url.href);
  });
  await page.goto(`${base}/workspace`);
  await page.locator('.ws[data-ready="true"]').waitFor();
  // The page now leads with the ask box and one status line; the open
  // question, workflow, comparison and dossier sit behind "Full workspace".
  await page.getByRole("button", { name: /Full workspace/ }).click();
  await page.getByRole("button", { name: "Investigate Candidate A" }).click();
  await page
    .getByText(/Local demonstration · saved on this computer/)
    .waitFor();
  await page.getByLabel("Research question").fill(question);
  await page.getByRole("button", { name: "Review research brief →" }).click();
  await page
    .getByRole("button", { name: "Save current brief", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Brief saved." }).waitFor();
  const record = page.locator(".nb-record");
  await record.getByRole("heading", { name: question, exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Accept brief", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByLabel("Review rationale")
    .fill(
      "Synthetic QA: the scope is suitable for review; no scientific result has been validated.",
    );
  await page.getByRole("button", { name: "Accept brief", exact: true }).click();
  await record
    .getByRole("heading", { name: "Recorded review · accepted" })
    .waitFor();
  assert.equal(
    await record
      .getByRole("button", { name: "Reject brief", exact: true })
      .count(),
    0,
  );
  await page.getByLabel("Research question").fill(`${question} Modified.`);
  assert.equal(
    await page
      .getByRole("button", { name: "Save current brief", exact: true })
      .isDisabled(),
    true,
  );

  await page.reload();
  await page.locator('.ws[data-ready="true"]').waitFor();
  await page
    .getByRole("navigation", { name: "Scientific workspace" })
    .getByRole("button", { name: "Review & decisions" })
    .click();
  await record.getByRole("heading", { name: question, exact: true }).waitFor();
  await record
    .getByRole("heading", { name: "Recorded review · accepted" })
    .waitFor();
  await page.screenshot({
    path: "/tmp/molecule-workspace-notebook-desktop.png",
    fullPage: true,
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export notebook" }).click();
  const stream = await (await downloading).createReadStream();
  let text = "";
  for await (const chunk of stream) text += chunk.toString();
  const exported = JSON.parse(text);
  assert.equal(exported.workspaceId, "vivamed-demo");
  assert.equal(exported.storageMode, "local-demo");
  assert.equal(Object.hasOwn(exported, "receipts"), false);
  // Validate the actual browser download with the same boundary used by MCP,
  // rather than rebuilding a lookalike notebook fixture in this test.
  const mcpSnapshot = validateNotebookSnapshot(exported, "vivamed-demo");
  assert.deepEqual(mcpSnapshot, exported);
  assert.equal(
    mcpSnapshot.briefs.filter((b) => b.packet.question === question).length,
    1,
  );
  const saved = exported.briefs.filter((b) => b.packet.question === question);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].status, "accepted");
  assert.deepEqual(
    saved[0].packet.sources.map((s) => s.id),
    ["E01", "E02"],
  );
  assert.deepEqual(saved[0].packet.approvedKnowledge, []);
  assert.equal(
    exported.events.filter((e) => e.briefId === saved[0].id).length,
    2,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const headingBounds = await page.locator(".nb-heading").boundingBox();
  const boundaryBounds = await page.locator(".nb-boundary").boundingBox();
  assert(
    headingBounds &&
      boundaryBounds &&
      headingBounds.y + headingBounds.height <= boundaryBounds.y + 1,
    "Notebook heading overlaps its trust boundary on mobile",
  );
  const notebookBounds = await page.locator(".nb-list").boundingBox();
  const listButtons = await page
    .getByRole("navigation", { name: "Saved research briefs" })
    .getByRole("button")
    .all();
  let previousBottom = -Infinity;
  for (const button of listButtons) {
    const bounds = await button.boundingBox();
    assert(
      bounds &&
        notebookBounds &&
        bounds.x >= notebookBounds.x - 1 &&
        bounds.x + bounds.width <= notebookBounds.x + notebookBounds.width + 1,
      "Notebook records clip horizontally on mobile",
    );
    assert(
      bounds.y >= previousBottom - 1,
      "Notebook record buttons must stack vertically on mobile",
    );
    previousBottom = bounds.y + bounds.height;
  }
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Notebook mobile overflow",
  );
  await page.screenshot({
    path: "/tmp/molecule-workspace-notebook-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel("WORKSPACE", { exact: true })
    .selectOption("peptai-test");
  assert.equal(await page.getByText(question, { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  console.log(
    `PASS: browser save, required rationale, acceptance boundary, no review overwrite, stale preview invalidation, reload persistence, actual UI export accepted by MCP snapshot validator, mobile and PeptAI isolation. Preserved synthetic QA record: ${saved[0].id}`,
  );
} finally {
  await browser.close();
}
