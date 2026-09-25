import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const base = process.env.WORKSPACE_TEST_URL || "http://localhost:3034";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("This fixture verifier is local-only.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    acceptDownloads: true,
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    unexpectedRequests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(base).origin ||
      (url.pathname.startsWith("/api/") &&
        url.pathname !== "/api/workspace-notebook" &&
        url.pathname !== "/api/ask")
    )
      unexpectedRequests.push(request.url());
  });
  await page.goto(`${base}/workspace`);
  await page.locator('.ws[data-ready="true"]').waitFor();
  console.log("Workspace hydrated.");
  const nav = page.getByRole("navigation", { name: "Scientific workspace" });
  await page
    .getByRole("heading", { name: "Endotype Alpha", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /Find or jump to/ }).click();
  const navigator = page.getByRole("dialog", {
    name: "Go to your next question.",
  });
  await navigator.waitFor();
  await page.screenshot({
    path: "/tmp/molecule-workspace-navigator.png",
    fullPage: true,
  });
  await navigator.getByLabel(/SEARCH THIS WORKSPACE/).fill("E02");
  await navigator
    .getByRole("button", { name: /E02.*Second-condition/ })
    .click();
  await page
    .getByRole("dialog", { name: "Second-condition replication note" })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await navigator.waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  // The page now leads with the ask box and one status line; the open
  // question, workflow, comparison and dossier sit behind "Full workspace".
  await page.getByRole("button", { name: /Full workspace/ }).click();
  await page.getByRole("button", { name: "Investigate Candidate A" }).click();
  await page.getByRole("button", { name: /Read the evidence/ }).click();
  await page
    .getByRole("dialog", { name: "Functional assay summary" })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /E02.*Second-condition/ })
    .click();
  await page
    .getByRole("dialog", { name: "Second-condition replication note" })
    .waitFor();
  await page.screenshot({
    path: "/tmp/molecule-workspace-source.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.getByRole("button", { name: /Frame the question/ }).click();
  assert.equal(
    await page
      .getByLabel("Research question")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "← Back to program" }).click();
  // Returning to the programme collapses the disclosures again, which is the
  // point of a dashboard: it does not stay opened up behind you.
  await page.getByRole("button", { name: /Full workspace/ }).click();
  await page.getByRole("button", { name: /Candidate B.*Inspect/ }).click();
  await page
    .getByRole("heading", { name: "Candidate B · evidence in context" })
    .waitFor();
  await page
    .locator(".ws-dossier")
    .getByRole("button", { name: /E03.*Binding assay/ })
    .click();
  const inspector = page.getByRole("dialog", { name: "Binding assay summary" });
  await inspector.waitFor();
  assert.match(await inspector.textContent(), /no functional assay/);
  assert.equal(
    await page
      .locator(".ws-source-drawer")
      .evaluate((e) => e.contains(document.activeElement)),
    true,
  );
  await page.getByRole("button", { name: "Close source", exact: true }).click();
  await page
    .getByRole("button", { name: "Prepare research brief →", exact: true })
    .click();
  await page.getByRole("button", { name: "Review research brief →" }).click();
  await page
    .getByText("Packet prepared · not executed", { exact: true })
    .waitFor();
  const markdownDownloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download readable brief ↓" }).click();
  const markdownDownload = await markdownDownloading;
  const markdownStream = await markdownDownload.createReadStream();
  let markdown = "";
  for await (const part of markdownStream) markdown += part.toString();
  assert.match(markdown, /SYNTHETIC DEMONSTRATION/);
  assert.match(markdown, /Binding assay summary/);
  await page.screenshot({
    path: "/tmp/molecule-workspace-brief.png",
    fullPage: true,
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download context JSON ↓" }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  let content = "";
  for await (const part of stream) content += part.toString();
  const packet = JSON.parse(content);
  assert.equal(packet.candidateId, "candidate-b");
  assert.deepEqual(
    packet.sources.map((s) => s.id),
    ["E03"],
  );
  assert.equal(packet.approvedKnowledge.length, 0);
  await page.getByLabel("Research question").fill("");
  await page.getByRole("button", { name: "Review research brief →" }).click();
  assert.match(await page.getByRole("alert").textContent(), /question/);
  await page
    .getByLabel("Candidate", { exact: true })
    .selectOption("candidate-a");
  await page.getByLabel(/E02 · Second-condition/).uncheck();
  await page.getByRole("button", { name: "Review research brief →" }).click();
  await page
    .locator(".ws-warning")
    .filter({ hasText: "Incomplete candidate context:" })
    .waitFor();
  await page.getByLabel(/E01 · Functional/).uncheck();
  await page.getByRole("button", { name: "Review research brief →" }).click();
  assert.match(await page.getByRole("alert").textContent(), /at least one/);
  await nav.getByRole("button", { name: "Evidence & knowledge" }).click();
  await page.getByLabel("Find evidence").fill("no-such-evidence");
  await page.getByText(/No matching evidence/).waitFor();
  await page.getByLabel("Find evidence").fill("E02");
  assert.equal(await page.locator(".ws-source-list .ws-source-row").count(), 1);
  await nav.getByRole("button", { name: "Scientific standards" }).click();
  await page
    .getByRole("heading", { name: "Missing evidence is unknown, not a pass." })
    .waitFor();
  await nav.getByRole("button", { name: "Review & decisions" }).click();
  await page
    .locator("summary")
    .filter({ hasText: "Illustrative claim proposals and earlier demos" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: /Approve|Accept assessment/ })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("link", { name: "Open saved demo ↗" })
      .getAttribute("href"),
    "/memory",
  );
  await nav.getByRole("button", { name: "Connections" }).click();
  await page.getByRole("button", { name: "Protein", exact: true }).click();
  assert.equal(await page.locator(".ws-connection").count(), 3);
  await page.getByRole("heading", { name: "NVIDIA BioNeMo" }).waitFor();
  await page.getByRole("button", { name: "Molecule", exact: true }).click();
  assert.equal(await page.locator(".ws-connection").count(), 2);
  assert.equal(
    await page
      .getByRole("button", { name: /Run|Connect wallet|Install/ })
      .count(),
    0,
  );
  await page
    .getByLabel("WORKSPACE", { exact: true })
    .selectOption("peptai-test");
  // PeptAI now holds a captured vault slice; switching must show that program
  // and none of VivaMed's records.
  await page
    .getByRole("heading", { level: 1, name: "KISS1R Round 1" })
    .waitFor();

  // Asking must cite real records, and must refuse a question the capture
  // cannot answer rather than assembling something plausible.
  const ask = page.locator(".ask");
  await ask.getByLabel("Ask about this programme").fill("what is kiss1r");
  await ask.getByRole("button", { name: "Ask", exact: true }).click();
  await ask.locator(".ask-record").first().waitFor();
  assert.match(
    await ask.locator(".ask-record").first().innerText(),
    /KISS1R/i,
    "an answer must quote a record about the thing asked about",
  );
  await ask.getByLabel("Ask about this programme").fill("Who won the World Cup");
  await ask.getByRole("button", { name: "Ask", exact: true }).click();
  await ask.locator(".ask-none").waitFor();
  assert.equal(
    await ask.locator(".ask-record").count(),
    0,
    "an unanswerable question must cite nothing",
  );

  assert.equal(await page.getByText("Candidate A", { exact: true }).count(), 0);
  await page.getByRole("button", { name: /Find or jump to/ }).click();
  await navigator.getByLabel(/SEARCH THIS WORKSPACE/).fill("E01");
  assert.equal(
    await navigator.getByRole("button", { name: /E01.*Functional/ }).count(),
    0,
  );
  await page.keyboard.press("Escape");
  for (const area of [
    "Evidence & knowledge",
    "Research & design",
    "Review & decisions",
  ]) {
    await nav.getByRole("button", { name: area }).click();
    await page
      .getByRole("heading", {
        level: 1,
        name: area === "Research & design" ? "Build your research brief." : area,
      })
      .waitFor();
  }
  await page
    .getByLabel("WORKSPACE", { exact: true })
    .selectOption("vivamed-demo");
  await page.screenshot({
    path: "/tmp/molecule-workspace-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of [
    "Programs",
    "Evidence & knowledge",
    "Scientific standards",
    "Research & design",
    "Review & decisions",
    "Connections",
  ]) {
    const bounds = await nav
      .getByRole("button", { name, exact: true })
      .boundingBox();
    assert(
      bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390,
      `${name}: mobile navigation clipped horizontally`,
    );
  }
  for (const area of [
    "Programs",
    "Evidence & knowledge",
    "Scientific standards",
    "Research & design",
    "Review & decisions",
    "Connections",
  ]) {
    await nav.getByRole("button", { name: area }).click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${area}: mobile overflow`,
    );
  }
  await nav.getByRole("button", { name: "Programs", exact: true }).click();
  await page.screenshot({
    path: "/tmp/molecule-workspace-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel("WORKSPACE", { exact: true })
    .selectOption("peptai-test");
  await page.reload();
  await page
    .getByRole("heading", { name: "Endotype Alpha", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log(
    "PASS: scoped search and keyboard navigation, candidate/source navigation, context download, question/selection validation, omissions, evidence search, standards, honest review/tool states, captured PeptAI scope, grounded ask with honest refusal, refresh reset, visible mobile navigation/layouts; only the same-origin notebook and ask APIs are allowed, no provider call from the browser, no browser errors.",
  );
} finally {
  await browser.close();
}
