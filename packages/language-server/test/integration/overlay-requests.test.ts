import { test, expect } from "vitest";
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
} from "./helpers/lsp-harness.js";

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
    expect(overlayResult, "overlay response should not be null").toBeTruthy();
    expect(typeof overlayResult.fingerprint, "overlay fingerprint should be reported").toBe("string");
    const artifact = overlayResult.artifact ?? overlayResult;
    expect(artifact?.overlay?.path, "overlay path should be present").toBeTruthy();
    expect((artifact?.mapping?.entries?.length ?? 0) > 0, "overlay mapping should contain entries").toBe(true);
    expect((artifact?.calls?.length ?? 0) > 0, "overlay should contain compiled call sites").toBe(true);
    expect((artifact?.overlay?.text?.length ?? 0) > 0, "overlay text should not be empty").toBe(true);
    expect(
      artifact?.overlay?.path.endsWith(".overlay.ts") || artifact?.overlay?.path.endsWith(".overlay.js"),
      "overlay path should use overlay naming convention",
    ).toBe(true);

    const state = await connection.sendRequest("aurelia/dumpState");
    const overlays = Array.isArray(state?.overlays) ? state.overlays : [];
    const normalized = overlays.map((o) => normalizePath(o));
    expect(normalized.includes(normalizePath(artifact.overlay.path)), "overlay FS should contain the materialized overlay path").toBe(true);
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
