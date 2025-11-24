import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  createFixture,
  fileUri,
  initialize,
  openDocument,
  startServer,
  waitForDiagnostics,
  waitForExit,
} from "./helpers/lsp-harness.mjs";

test("aurelia/getOverlay returns build artifacts and hydrates overlay FS", async () => {
  const fixture = createFixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        types: [],
      },
      files: ["component.ts"],
    }),
    "component.ts": [
      "export class Component {",
      '  message: string = "Hello";',
      "}",
    ].join("\n"),
    "component.html": "<template>${message}</template>",
  });

  const htmlUri = fileUri(fixture, "component.html");
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openTemplate(connection, fixture, htmlUri, "component.html");
    await waitForDiagnostics(connection, child, getStderr, htmlUri, 5000);

    const overlayResult = await connection.sendRequest("aurelia/getOverlay", { uri: htmlUri });
    assert.ok(overlayResult, "overlay response should not be null");
    assert.equal(typeof overlayResult.fingerprint, "string", "overlay fingerprint should be reported");
    const artifact = overlayResult.artifact ?? overlayResult;
    assert.ok(artifact?.overlay?.path, "overlay path should be present");
    assert.ok((artifact?.mapping?.entries?.length ?? 0) > 0, "overlay mapping should contain entries");
    assert.ok((artifact?.calls?.length ?? 0) > 0, "overlay should contain compiled call sites");
    assert.ok((artifact?.overlay?.text?.length ?? 0) > 0, "overlay text should not be empty");
    assert.ok(
      artifact?.overlay?.path.endsWith(".overlay.ts") || artifact?.overlay?.path.endsWith(".overlay.js"),
      "overlay path should use overlay naming convention",
    );

    const state = await connection.sendRequest("aurelia/dumpState");
    const overlays = Array.isArray(state?.overlays) ? state.overlays : [];
    const normalized = overlays.map((o) => normalizePath(o));
    assert.ok(normalized.includes(normalizePath(artifact.overlay.path)), "overlay FS should contain the materialized overlay path");
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("aurelia/getSsr returns SSR HTML and manifest artifacts", async () => {
  const fixture = createFixture({
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        types: [],
      },
      files: ["component.ts"],
    }),
    "component.ts": [
      "export class Component {",
      '  title: string = "SSR";',
      "}",
    ].join("\n"),
    "component.html": "<template><h1>${title}</h1></template>",
  });

  const htmlUri = fileUri(fixture, "component.html");
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openTemplate(connection, fixture, htmlUri, "component.html");
    await waitForDiagnostics(connection, child, getStderr, htmlUri, 5000);

    const ssrResult = await connection.sendRequest("aurelia/getSsr", { uri: htmlUri });
    assert.ok(ssrResult, "SSR response should not be null");
    assert.equal(typeof ssrResult.fingerprint, "string", "SSR fingerprint should be reported");
    const artifact = ssrResult.artifact ?? ssrResult;
    assert.ok(artifact?.html?.path.endsWith(".ssr.html"), "SSR HTML path should use naming convention");
    assert.ok(artifact?.manifest?.path.endsWith(".ssr.json"), "SSR manifest path should use naming convention");
    assert.ok((artifact?.html?.text?.length ?? 0) > 0, "SSR HTML should not be empty");
    const manifest = JSON.parse(artifact?.manifest?.text ?? "{}");
    assert.equal(manifest?.version, "aurelia-ssr-manifest@0");
    assert.ok(Array.isArray(manifest?.templates) && manifest.templates.length > 0, "SSR manifest should contain templates");
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

async function openTemplate(connection, fixtureRoot, uri, relativePath) {
  const htmlText = fs.readFileSync(path.join(fixtureRoot, relativePath), "utf8");
  await openDocument(connection, uri, "html", htmlText);
}

function normalizePath(p) {
  return path.normalize(p).toLowerCase();
}
