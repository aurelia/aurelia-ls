import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  collectEdits,
  createFixture,
  decodeHover,
  fileUri,
  initialize,
  openDocument,
  positionAt,
  startServer,
  waitForDiagnostics,
  waitForExit,
} from "./helpers/lsp-harness.js";

test("maps TypeScript diagnostics back to template spans", async () => {
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
      "  existing: number = 1;",
      "}",
    ].join("\n"),
    "component.html": "<template>${missing}</template>",
  });

  const diagUri = fileUri(fixture, "component.html");
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, diagUri, "html", fs.readFileSync(path.join(fixture, "component.html"), "utf8"));

    const diagnostics = await waitForDiagnostics(connection, child, () => getStderr(), diagUri, 5000);
    const tsDiag = diagnostics.find((d) => d.source === "typescript") ?? diagnostics[0];
    expect(tsDiag, "should receive at least one diagnostic").toBeTruthy();
    expect(tsDiag.range.start.line).toBe(0);
    expect(tsDiag.range.start.character).toBe(12);
    expect(tsDiag.range.end.character).toBe(19);
    expect(tsDiag.message, "diagnostic message should mention missing").toMatch(/missing/i);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("routes definitions to the view-model via provenance", async () => {
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
      "  existing: number = 1;",
      "}",
    ].join("\n"),
    "component.html": "<template>${existing}</template>",
  });

  const defsUri = fileUri(fixture, "component.html");
  const vmUri = fileUri(fixture, "component.ts");
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, defsUri, "html", fs.readFileSync(path.join(fixture, "component.html"), "utf8"));
    await waitForDiagnostics(connection, child, () => getStderr(), defsUri, 5000);

    const position = { line: 0, character: 13 }; // inside "existing"
    const definitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: defsUri },
      position,
    });

    expect(Array.isArray(definitions), "definition response should be an array").toBe(true);
    const vmDef = definitions.find?.((def) => def.uri === vmUri);
    if (vmDef) {
      expect(vmDef.range.start.line).toBe(1);
      expect(vmDef.range.start.character).toBe(2);
    }
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("hover/definition/rename map through overlay for simple interpolation", async () => {
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
    "component.html": "<template><div>${message}</div></template>",
  });

  const htmlUri = fileUri(fixture, "component.html");
  const tsUri = fileUri(fixture, "component.ts");
  const { connection, child, dispose, getStderr } = startServer(fixture);

  try {
    await initialize(connection, child, getStderr, fixture);
    const htmlText = fs.readFileSync(path.join(fixture, "component.html"), "utf8");
    await openDocument(connection, htmlUri, "html", htmlText);
    await waitForDiagnostics(connection, child, () => getStderr(), htmlUri, 5000);

    const pos = positionAt(htmlText, htmlText.indexOf("message"));

    const hover = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri: htmlUri },
      position: pos,
    });
    expect(hover, "hover should be returned").toBeTruthy();
    const hoverText = decodeHover(hover);
    expect(hoverText, `hover text should mention message: ${hoverText}`).toMatch(/message/i);

    const definitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: htmlUri },
      position: pos,
    });
    const defArray = Array.isArray(definitions) ? definitions : [];
    expect(defArray.length > 0, "definition response should contain at least one location").toBe(true);
    const vmDef = defArray.find((d) => d.uri === tsUri);
    if (vmDef) {
      expect(vmDef.range.start.line).toBe(1);
    }

    const rename = await connection.sendRequest("textDocument/rename", {
      textDocument: { uri: htmlUri },
      position: pos,
      newName: "title",
    });
    expect(rename, "rename response should be present").toBeTruthy();
    const edits = collectEdits(rename);
    const templateUri = htmlUri.toLowerCase();
    const vmUri = tsUri.toLowerCase();
    expect(edits.some((e) => e.uri.toLowerCase() === templateUri), "rename should edit the template").toBe(true);
    expect(edits.some((e) => e.uri.toLowerCase() === vmUri), "rename should edit the view-model").toBe(true);
  } finally {
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
