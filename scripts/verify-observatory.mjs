import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const base = process.env.WORKSPACE_TEST_URL || "http://localhost:3034";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Observatory verification is local-only.");

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const unexpectedRequests = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== new URL(base).origin ||
      (url.pathname.startsWith("/api/") &&
        (url.pathname !== "/api/workspace-notebook" ||
          request.method() !== "GET"))
    ) {
      unexpectedRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.goto(`${base}/workspace`);
  await page.locator('.ws[data-ready="true"]').waitFor();
  assert(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  );
  const nav = page.getByRole("navigation", { name: "Scientific workspace" });

  // Keyboard-only entry and source navigation; no saved state is modified.
  await page.keyboard.press("Control+k");
  const navigator = page.getByRole("dialog", {
    name: "Go to your next question.",
  });
  await navigator.waitFor();
  assert(
    await navigator.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Navigator must contain keyboard focus",
  );
  await navigator.getByLabel(/SEARCH THIS WORKSPACE/).fill("E02");
  const sourceResult = navigator.getByRole("button", {
    name: /E02.*Second-condition/,
  });
  await sourceResult.focus();
  await page.keyboard.press("Enter");
  const source = page.getByRole("dialog", {
    name: "Second-condition replication note",
  });
  await source.waitFor();
  assert(
    await source.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Source drawer must contain keyboard focus",
  );
  await page.keyboard.press("Tab");
  assert(
    await source.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Tab must stay in source controls",
  );
  await page.keyboard.press("Shift+Tab");
  assert(
    await source.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Reverse tab must return to source controls",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);

  await nav.getByRole("button", { name: "Programs", exact: true }).click();
  // The page leads with the ask box and one status line. The map is one click
  // away behind "Evidence map", and collapses again on navigating back.
  const openMap = async () => {
    const head = page.getByRole("button", { name: /Evidence map/ });
    if ((await head.getAttribute("aria-expanded")) !== "true")
      await head.click();
  };
  await openMap();
  const atlas = page.locator(".atlas").first();
  const map = atlas.getByRole("group", { name: "Interactive evidence map" });
  const inspector = atlas.locator(".atlas-inspector");
  const filter = atlas.getByRole("group", { name: "Filter evidence atlas" });
  await map
    .getByRole("button", {
      name: "Inspect candidate-b: Candidate B",
      exact: true,
    })
    .click();
  await inspector
    .getByRole("heading", { name: "Candidate B", exact: true })
    .waitFor();
  assert.match(await inspector.innerText(), /Synthetic demonstration/);
  await map
    .getByRole("button", {
      name: "Inspect E03: Binding assay summary",
      exact: true,
    })
    .click();
  await inspector.getByRole("button", { name: /E03.*Binding assay/ }).click();
  await page.getByRole("dialog", { name: "Binding assay summary" }).waitFor();
  await page.keyboard.press("Escape");
  await map
    .getByRole("button", {
      name: "Inspect C01: Unresolved conditions",
      exact: true,
    })
    .click();
  assert.match(await inspector.innerText(), /Proposed|proposed/);
  assert.equal(
    await inspector.locator(".atlas-source-trace button").count(),
    2,
  );
  await map
    .getByRole("button", {
      name: "Inspect C01: Unresolved conditions",
      exact: true,
    })
    .focus();
  await page.keyboard.press("ArrowRight");
  assert(
    await map.evaluate((element) => element.contains(document.activeElement)),
    "Arrow navigation must focus another map record",
  );
  assert.equal(
    await map.locator("button:focus").getAttribute("aria-pressed"),
    "true",
  );
  await filter
    .getByRole("button", { name: "Candidate B", exact: true })
    .click();
  assert.equal(
    await map.getByRole("button").count(),
    3,
    "Candidate B includes one entity, source and interpretation",
  );
  assert.match(
    await atlas.locator(".atlas-readout").innerText(),
    /03\s*RECORDS/,
  );
  assert.equal(
    await map.getByRole("button", { name: /Inspect E01:/ }).count(),
    0,
  );
  await map
    .getByRole("button", {
      name: "Inspect E03: Binding assay summary",
      exact: true,
    })
    .click();
  await atlas.getByRole("button", { name: "Focus atlas", exact: true }).click();
  const focusMode = page.getByRole("dialog", {
    name: "Evidence atlas focus mode",
    exact: true,
  });
  await focusMode.waitFor();
  assert(
    await focusMode.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Focus mode must own keyboard focus",
  );
  assert.equal(
    await focusMode
      .getByRole("group", { name: "Filter evidence atlas" })
      .getByRole("button", { name: "Candidate B", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await focusMode
    .locator(".atlas-inspector")
    .getByRole("heading", { name: "Binding assay summary", exact: true })
    .waitFor();
  await page.screenshot({
    path: "/tmp/molecule-observatory-focus.png",
    fullPage: false,
  });
  const filteredMap = focusMode.getByRole("group", {
    name: "Interactive evidence map",
  });
  const centeredNode = filteredMap.getByRole("button", {
    name: "Inspect E03: Binding assay summary",
    exact: true,
  });
  const mapBox = await filteredMap.boundingBox();
  const nodeBox = await centeredNode.boundingBox();
  assert(
    mapBox &&
      nodeBox &&
      Math.abs(
        nodeBox.y + nodeBox.height / 2 - (mapBox.y + mapBox.height / 2),
      ) <
        mapBox.height * 0.15,
    "Filtered single lane should recenter vertically",
  );
  await focusMode
    .getByRole("group", { name: "Filter evidence atlas" })
    .getByRole("button", { name: "Whole program", exact: true })
    .click();
  assert.equal(await filteredMap.getByRole("button").count(), 7);
  await page.screenshot({
    path: "/tmp/molecule-observatory-focus-whole.png",
    fullPage: false,
  });
  await focusMode
    .locator(".atlas-inspector")
    .getByRole("button", { name: /E03.*Binding assay/ })
    .click();
  await page
    .getByRole("dialog", { name: "Binding assay summary", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await focusMode.waitFor();
  assert(
    await focusMode.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    "Closing nested source returns focus to atlas modal",
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert(
    await atlas
      .getByRole("button", { name: "Focus atlas", exact: true })
      .evaluate((element) => element === document.activeElement),
  );
  await map
    .getByRole("button", {
      name: "Inspect candidate-b: Candidate B",
      exact: true,
    })
    .click();
  await inspector
    .getByRole("button", { name: "Build a brief for Candidate B", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Candidate", { exact: true }).inputValue(),
    "candidate-b",
  );
  assert.equal(await page.getByLabel(/E03 · Binding assay/).isChecked(), true);
  await nav.getByRole("button", { name: "Programs", exact: true }).click();
  await openMap();
  await atlas
    .getByRole("group", { name: "Evidence atlas view" })
    .getByRole("button", { name: "List", exact: true })
    .click();
  assert.equal(
    await atlas
      .getByRole("group", { name: "Evidence atlas records" })
      .getByRole("button")
      .count(),
    7,
  );
  await atlas
    .getByRole("group", { name: "Evidence atlas view" })
    .getByRole("button", { name: "Map", exact: true })
    .click();
  await page.screenshot({
    path: "/tmp/molecule-observatory-desktop.png",
    fullPage: true,
  });
  const movingElements = await page.locator(".ws").evaluate((root) =>
    [...root.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          style.animationName !== "none" &&
          style.animationDuration
            .split(",")
            .some((duration) => parseFloat(duration) > 0.001)
        );
      })
      .map((element) => `${element.tagName}.${String(element.className)}`)
      .slice(0, 20),
  );
  assert.deepEqual(
    movingElements,
    [],
    "Nontrivial CSS animation remains under reduced motion",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  const recordList = atlas.getByRole("group", {
    name: "Evidence atlas records",
  });
  assert.equal(
    await map.isVisible(),
    false,
    "Mobile should show accessible list rather than cramped map",
  );
  await recordList
    .getByRole("button", {
      name: "Inspect E03: Binding assay summary",
      exact: true,
    })
    .click();
  await inspector
    .getByRole("heading", { name: "Binding assay summary", exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("atlas-inspector"),
  );
  assert(
    await inspector.evaluate((element) => element === document.activeElement),
    "Mobile selection should focus inspector",
  );
  await inspector.getByRole("button", { name: /E03.*Binding assay/ }).click();
  await page
    .getByRole("dialog", { name: "Binding assay summary", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  const areaNames = [
    "Programs",
    "Evidence & knowledge",
    "Scientific standards",
    "Research & design",
    "Review & decisions",
    "Connections",
  ];
  for (const area of areaNames) {
    const button = nav.getByRole("button", { name: area, exact: true });
    const box = await button.boundingBox();
    assert(
      box && box.x >= 0 && box.x + box.width <= 390,
      `${area}: mobile navigation clipped`,
    );
    await button.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await button.getAttribute("aria-current"),
      "page",
      `${area}: keyboard navigation did not activate`,
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${area}: horizontal page overflow`,
    );
  }
  await nav.getByRole("button", { name: "Programs", exact: true }).click();
  await page.screenshot({
    path: "/tmp/molecule-observatory-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Find or jump to/ }).click();
  await navigator.waitFor();
  const bounds = await navigator.boundingBox();
  assert(
    bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390,
    "Mobile command dialog overflows",
  );
  await page.screenshot({
    path: "/tmp/molecule-observatory-navigator-mobile.png",
  });
  await page.keyboard.press("Escape");

  // Changing the workspace must not retain an atlas or source from VivaMed.
  await page
    .getByLabel("WORKSPACE", { exact: true })
    .selectOption("peptai-test");
  await page
    .getByRole("heading", { level: 1, name: "KISS1R Round 1" })
    .waitFor();
  assert.equal(await page.getByText("Candidate A", { exact: true }).count(), 0);
  assert.equal(await page.getByText("Candidate B", { exact: true }).count(), 0);
  await page.keyboard.press("Control+k");
  await navigator.getByLabel(/SEARCH THIS WORKSPACE/).fill("E01");
  assert.equal(
    await navigator.getByRole("button", { name: /E01.*Functional/ }).count(),
    0,
  );
  await page.keyboard.press("Escape");
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log(
    "PASS: evidence atlas selection/filter/view/counts, keyboard arrows, nested focus mode/source dialogs, Candidate B brief scope, mobile inspector focus, desktop/mobile layout, reduced CSS motion, workspace scoping, no mutations/provider calls or page errors.",
  );
} finally {
  await browser.close();
}
