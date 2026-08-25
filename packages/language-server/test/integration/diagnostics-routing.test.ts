import { test, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  collectEdits,
  createAureliaAppFixture,
  createDiagnosticsRecorder,
  decodeHover,
  fileUri,
  initialize,
  normalizedUriPath,
  openDocument,
  positionAt,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";
import type { Location, LocationLink, MessageConnection } from "vscode-languageserver/node";
import type { LspDiagnostic } from "../helpers/test-factories.js";

function createComponentFixture(classMembers: readonly string[], template: string): string {
  return createAureliaAppFixture({
    "src/app.ts": [
      "import { customElement } from 'aurelia';",
      "import template from './app.html';",
      "@customElement({ name: 'app-root', template })",
      "export class AppRoot {",
      ...classMembers.map((member) => `  ${member}`),
      "}",
    ].join("\n"),
    "src/app.html": template,
  });
}

function definitionTarget(
  definitions: unknown,
  targetUri: string,
): Location | LocationLink | null {
  if (!Array.isArray(definitions)) {
    return null;
  }
  return definitions.find((definition: Location | LocationLink) =>
    normalizedUriPath("targetUri" in definition ? definition.targetUri : definition.uri)
      === normalizedUriPath(targetUri)
  ) ?? null;
}

async function expectDefinitionTarget(options: {
  readonly connection: MessageConnection;
  readonly htmlUri: string;
  readonly htmlText: string;
  readonly appUri: string;
  readonly appText: string;
  readonly cursorMarker: string;
  readonly cursorNeedle: string;
  readonly targetMarker: string;
  readonly targetNeedle: string;
}): Promise<void> {
  const cursorMarkerOffset = options.htmlText.indexOf(options.cursorMarker);
  const cursorOffset = options.htmlText.indexOf(options.cursorNeedle, cursorMarkerOffset) + 1;
  const definitions = await options.connection.sendRequest("textDocument/definition", {
    textDocument: { uri: options.htmlUri },
    position: positionAt(options.htmlText, cursorOffset),
  });
  const target = definitionTarget(definitions, options.appUri);
  expect(
    target,
    `definition should target app.ts: ${JSON.stringify(definitions)}`,
  ).toBeTruthy();
  const selectionRange = target == null
    ? null
    : "targetSelectionRange" in target
      ? target.targetSelectionRange
      : target.range;
  const targetMarkerOffset = options.appText.indexOf(options.targetMarker);
  const targetStart = options.appText.indexOf(options.targetNeedle, targetMarkerOffset);
  expect(selectionRange).toEqual({
    start: positionAt(options.appText, targetStart),
    end: positionAt(options.appText, targetStart + options.targetNeedle.length),
  });
}

test("maps template diagnostics to exact authored member spans", async () => {
  const fixture = createComponentFixture(
    ["existing: number = 1;"],
    "<template>${missing}</template>",
  );

  const diagUri = fileUri(fixture, "src/app.html");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnosticsRecorder = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, diagUri, "html", fs.readFileSync(path.join(fixture, "src/app.html"), "utf8"));

    const diagnostics = (await diagnosticsRecorder.wait(diagUri, 5000)) as LspDiagnostic[];
    const missingMember = diagnostics.find((diagnostic) => diagnostic.message.includes("missing"));
    expect(missingMember, "should publish the missing-member diagnostic").toBeTruthy();
    expect(missingMember?.range).toEqual({
      start: { line: 0, character: 12 },
      end: { line: 0, character: 19 },
    });
  } finally {
    diagnosticsRecorder.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("routes definitions to the view-model via provenance", async () => {
  const fixture = createComponentFixture(
    ["existing: number = 1;"],
    "<template>${existing}</template>",
  );

  const defsUri = fileUri(fixture, "src/app.html");
  const vmUri = fileUri(fixture, "src/app.ts");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnosticsRecorder = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
    await openDocument(connection, defsUri, "html", htmlText);
    await diagnosticsRecorder.wait(defsUri, 5000);

    const definitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: defsUri },
      position: positionAt(htmlText, htmlText.indexOf("existing")),
    });

    const vmDefinition = definitionTarget(definitions, vmUri);
    expect(
      vmDefinition,
      `definition should target the backing TypeScript member: ${JSON.stringify(definitions)}`,
    ).toBeTruthy();
    const targetRange = vmDefinition == null
      ? null
      : "targetSelectionRange" in vmDefinition
        ? vmDefinition.targetSelectionRange
        : vmDefinition.range;
    expect(targetRange?.start).toEqual({ line: 4, character: 2 });
  } finally {
    diagnosticsRecorder.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("routes template navigation definitions to exact path and id declarations", async () => {
  const fixture = createAureliaAppFixture({
    "src/main.ts": [
      "import Aurelia from 'aurelia';",
      "import { RouterConfiguration } from '@aurelia/router';",
      "import { AppRoot } from './app';",
      "Aurelia.register(RouterConfiguration).app(AppRoot).start();",
    ].join("\n"),
    "src/app.ts": [
      "import { customElement } from 'aurelia';",
      "import { route } from '@aurelia/router';",
      "import { ItemDetailRoute, ItemListRoute } from './routes';",
      "import template from './app.html';",
      "@route({ routes: [",
      "  { id: 'items', path: 'items', component: ItemListRoute },",
      "  { id: 'item-detail', path: 'items/:itemId', component: ItemDetailRoute },",
      "] })",
      "@customElement({ name: 'app-root', template, dependencies: [ItemListRoute, ItemDetailRoute] })",
      "export class AppRoot {}",
    ].join("\n"),
    "src/app.html": [
      "<template>",
      "  <a load=\"items\">Items</a>",
      "  <a load=\"./items\">Relative items</a>",
      "  <a load=\"items/item-1?ref=featured#details\">Detail path</a>",
      "  <a load=\"route: item-detail; params.bind: { itemId: 'item-1' }\">Detail id</a>",
      "  <au-viewport></au-viewport>",
      "</template>",
    ].join("\n"),
    "src/routes.ts": [
      "import { customElement } from 'aurelia';",
      "@customElement({ name: 'item-list-route', template: '<template>Items</template>' })",
      "export class ItemListRoute {}",
      "@customElement({ name: 'item-detail-route', template: '<template>Detail</template>' })",
      "export class ItemDetailRoute {}",
    ].join("\n"),
  }, {
    "@aurelia/router": "^2.0.0-rc.2",
  });

  const htmlUri = fileUri(fixture, "src/app.html");
  const appUri = fileUri(fixture, "src/app.ts");
  const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
  const appText = fs.readFileSync(path.join(fixture, "src/app.ts"), "utf8");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnosticsRecorder = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    await openDocument(connection, htmlUri, "html", htmlText);
    await diagnosticsRecorder.wait(htmlUri, 5000);

    await expectDefinitionTarget({
      connection,
      htmlUri,
      htmlText,
      appUri,
      appText,
      cursorMarker: 'load="items"',
      cursorNeedle: "items",
      targetMarker: "path: 'items'",
      targetNeedle: "'items'",
    });
    await expectDefinitionTarget({
      connection,
      htmlUri,
      htmlText,
      appUri,
      appText,
      cursorMarker: 'load="./items"',
      cursorNeedle: "items",
      targetMarker: "path: 'items'",
      targetNeedle: "'items'",
    });
    await expectDefinitionTarget({
      connection,
      htmlUri,
      htmlText,
      appUri,
      appText,
      cursorMarker: "items/item-1?ref=featured#details",
      cursorNeedle: "item-1",
      targetMarker: "path: 'items/:itemId'",
      targetNeedle: "'items/:itemId'",
    });
    await expectDefinitionTarget({
      connection,
      htmlUri,
      htmlText,
      appUri,
      appText,
      cursorMarker: "route: item-detail; params.bind",
      cursorNeedle: "item-detail",
      targetMarker: "id: 'item-detail'",
      targetNeedle: "'item-detail'",
    });

    const queryDefinitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, htmlText.indexOf("ref=featured") + 1),
    });
    expect(queryDefinitions).toBeNull();
    const relativePrefixDefinitions = await connection.sendRequest("textDocument/definition", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, htmlText.indexOf('./items') + 1),
    });
    expect(relativePrefixDefinitions).toBeNull();
  } finally {
    diagnosticsRecorder.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});

test("hover/definition map through semantic-runtime provenance and rename succeeds for expression members", async () => {
  const fixture = createComponentFixture(
    ['message: string = "Hello";'],
    "<template><div>${message}</div></template>",
  );

  const htmlUri = fileUri(fixture, "src/app.html");
  const tsUri = fileUri(fixture, "src/app.ts");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnosticsRecorder = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    const htmlText = fs.readFileSync(path.join(fixture, "src/app.html"), "utf8");
    await openDocument(connection, htmlUri, "html", htmlText);
    await diagnosticsRecorder.wait(htmlUri, 5000);

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
    expect(
      definitionTarget(definitions, tsUri),
      `definition should target app.ts: ${JSON.stringify(definitions)}`,
    ).toBeTruthy();

    const renameResult = await connection.sendRequest("textDocument/rename", {
      textDocument: { uri: htmlUri },
      position: pos,
      newName: "title",
    });
    // Expression-member rename is a working feature: policy allows it,
    // tryExpressionMemberRename produces cross-domain edits.
    expect(renameResult, "rename should return a workspace edit").toBeTruthy();
    const changedPaths = new Set(collectEdits(renameResult as never).map((edit) => normalizedUriPath(edit.uri)));
    expect(changedPaths).toEqual(new Set([normalizedUriPath(htmlUri), normalizedUriPath(tsUri)]));
  } finally {
    diagnosticsRecorder.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
