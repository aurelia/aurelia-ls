import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import {
  SymbolKind,
  type DocumentSymbol,
  type Hover,
  type MessageConnection,
  type Range,
  type SymbolInformation,
} from "vscode-languageserver/node";
import {
  changeDocument,
  createDiagnosticsRecorder,
  fileUri,
  initialize,
  normalizedUriPath,
  offsetAt,
  openDocument,
  positionAt,
  startServer,
  waitForExit,
} from "./helpers/lsp-harness.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixture = path.join(
  repoRoot,
  "packages",
  "semantic-runtime",
  "fixtures",
  "pressure",
  "resource-registration-effective-definitions",
);
const scopeFixture = path.join(repoRoot, "fixtures", "hello-world");

const sharedResourceSymbols = [
  ["SharedCustomElement", "custom-element: shared"],
  ["SharedCustomAttribute", "custom-attribute: shared"],
  ["SharedValueConverter", "value-converter: shared"],
  ["SharedBindingBehavior", "binding-behavior: shared"],
  ["SharedBindingCommand", "binding-command: shared"],
] as const;

test("native hover and symbol responses preserve exact authored meaning", async () => {
  const htmlPath = path.join(fixture, "src/effective-definitions-app.html");
  const resourcesPath = path.join(fixture, "src/resources.ts");
  const htmlUri = fileUri(fixture, "src/effective-definitions-app.html");
  const resourcesUri = fileUri(fixture, "src/resources.ts");
  const htmlText = fs.readFileSync(htmlPath, "utf8")
    .replace(
      "<decorator-effective></decorator-effective>",
      "<DECORATOR-EFFECTIVE></DeCoRaToR-EfFeCtIvE>",
    )
    .replace("decorator-attribute-effective", "DECORATOR-ATTRIBUTE-EFFECTIVE")
    .replace('value.static-cmd="message"', 'VALUE.STATIC-CMD="message"')
    .replace(
      "</template>",
      '  <section PROMISE.RESOLVE="Promise.resolve(message)"></section>\n</template>',
    );
  const resourcesText = fs.readFileSync(resourcesPath, "utf8");
  const { connection, child, dispose, getStderr } = startServer(fixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);

  try {
    await initialize(connection, child, getStderr, fixture);
    openDocument(connection, htmlUri, "html", htmlText);
    openDocument(connection, resourcesUri, "typescript", resourcesText);
    await diagnostics.wait(htmlUri, 20_000);

    const messageStart = htmlText.indexOf("message");
    expect(messageStart).toBeGreaterThanOrEqual(0);
    const hover = await connection.sendRequest<Hover | null>("textDocument/hover", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, messageStart + 2),
    });
    expect(hover, "expected an Aurelia member hover").not.toBeNull();
    expect(hover?.range).toEqual({
      start: positionAt(htmlText, messageStart),
      end: positionAt(htmlText, messageStart + "message".length),
    });
    expect(hover?.range == null ? null : textForRange(htmlText, hover.range)).toBe("message");

    for (const [token, expectedIdentity] of [
      ["DECORATOR-EFFECTIVE", "<DECORATOR-EFFECTIVE>"],
      ["DeCoRaToR-EfFeCtIvE", "<DeCoRaToR-EfFeCtIvE>"],
      ["DECORATOR-ATTRIBUTE-EFFECTIVE", "(custom attribute) DECORATOR-ATTRIBUTE-EFFECTIVE"],
      ["STATIC-CMD", "(binding command) STATIC-CMD"],
    ] as const) {
      const tokenStart = htmlText.indexOf(token);
      expect(tokenStart, `expected authored token ${token}`).toBeGreaterThanOrEqual(0);
      const resourceHover = await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, tokenStart + 1),
      });
      expect(resourceHover, `expected resource hover for ${token}`).not.toBeNull();
      expect((resourceHover?.contents as { value?: string } | undefined)?.value ?? "")
        .toContain(expectedIdentity);
      expect(resourceHover?.range == null ? null : textForRange(htmlText, resourceHover.range))
        .toBe(token);
    }

    const nestedCommandMarker = "message.bind: message";
    const nestedCommandMarkerStart = htmlText.indexOf(nestedCommandMarker);
    expect(nestedCommandMarkerStart).toBeGreaterThanOrEqual(0);
    const nestedCommandStart = htmlText.indexOf("bind", nestedCommandMarkerStart);
    expect(nestedCommandStart).toBeGreaterThanOrEqual(0);
    expect(nestedCommandStart).toBeLessThan(nestedCommandMarkerStart + nestedCommandMarker.length);
    const nestedCommandHover = await connection.sendRequest<Hover | null>("textDocument/hover", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, nestedCommandStart + 1),
    });
    expect((nestedCommandHover?.contents as { value?: string } | undefined)?.value ?? "")
      .toContain("(binding command) bind");
    expect(nestedCommandHover?.range == null ? null : textForRange(htmlText, nestedCommandHover.range))
      .toBe("bind");

    const patternLiteralStart = htmlText.indexOf("PROMISE.RESOLVE");
    expect(patternLiteralStart).toBeGreaterThanOrEqual(0);
    expect(await connection.sendRequest<Hover | null>("textDocument/hover", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, patternLiteralStart + 1),
    })).toBeNull();

    const documentSymbols = await connection.sendRequest<DocumentSymbol[] | null>(
      "textDocument/documentSymbol",
      { textDocument: { uri: resourcesUri } },
    );
    expect(documentSymbols).not.toBeNull();
    const sharedContainers = new Set<string>(sharedResourceSymbols.map(([, detail]) => detail));
    const sharedDocumentSymbols = (documentSymbols ?? []).filter((symbol) =>
      symbol.detail != null && sharedContainers.has(symbol.detail)
    );
    expect(sharedDocumentSymbols.map((symbol) => [symbol.name, symbol.detail])).toEqual(
      sharedResourceSymbols,
    );
    for (const [index, symbol] of sharedDocumentSymbols.entries()) {
      expect(symbol.kind).toBe(SymbolKind.Class);
      expect(textForRange(resourcesText, symbol.selectionRange)).toBe(sharedResourceSymbols[index]![0]);
    }

    for (const [name, detail] of [
      ["StaticBindingCommand", "binding-command: static-command"],
      ["DataAttributePattern", "attribute-pattern: PART.data"],
    ] as const) {
      const symbol = requireDocumentSymbol(documentSymbols ?? [], name, detail);
      expect(symbol.kind).toBe(SymbolKind.Class);
      expect(textForRange(resourcesText, symbol.selectionRange)).toBe(name);
    }

    const aliasSymbols = localWorkspaceSymbols(
      await requestWorkspaceSymbols(connection, "static-cmd"),
      resourcesUri,
    );
    expect(aliasSymbols).toHaveLength(1);
    expectWorkspaceSymbol(
      aliasSymbols[0]!,
      resourcesText,
      "StaticBindingCommand",
      "binding-command: static-command",
    );

    const patternSymbols = localWorkspaceSymbols(
      await requestWorkspaceSymbols(connection, "PART.data"),
      resourcesUri,
    );
    expect(patternSymbols).toHaveLength(1);
    expectWorkspaceSymbol(
      patternSymbols[0]!,
      resourcesText,
      "DataAttributePattern",
      "attribute-pattern: PART.data",
    );

    const sharedWorkspaceSymbols = localWorkspaceSymbols(
      await requestWorkspaceSymbols(connection, "shared"),
      resourcesUri,
    ).filter((symbol) => symbol.containerName != null && sharedContainers.has(symbol.containerName));
    expect(sharedWorkspaceSymbols.map((symbol) => [symbol.name, symbol.containerName])).toEqual(
      sharedResourceSymbols,
    );
    for (const [index, symbol] of sharedWorkspaceSymbols.entries()) {
      const [name, detail] = sharedResourceSymbols[index]!;
      expectWorkspaceSymbol(symbol, resourcesText, name, detail);
    }
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 30_000);

test("native SVG foreignObject tags cannot inherit a colliding component declaration hover", async () => {
  const templatePath = path.join(scopeFixture, "src/components/product-card.html");
  const componentPath = path.join(scopeFixture, "src/components/product-card.ts");
  const templateUri = fileUri(scopeFixture, "src/components/product-card.html");
  const componentUri = fileUri(scopeFixture, "src/components/product-card.ts");
  const templateText = fs.readFileSync(templatePath, "utf8");
  const componentText = fs.readFileSync(componentPath, "utf8");
  const nativeMarkup = '<div style="width: ${selectionProgressPercent}%"></div>';
  const nativeMarkupStart = templateText.indexOf(nativeMarkup);
  expect(nativeMarkupStart).toBeGreaterThanOrEqual(0);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, componentUri, "typescript", componentText);
    openDocument(connection, templateUri, "html", templateText);
    await diagnostics.wait(templateUri, 20_000);

    const hoverAtOffset = async (offset: number): Promise<Hover | null> =>
      await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: templateUri },
        position: positionAt(templateText, offset),
      });

    const openingDivStart = nativeMarkupStart + nativeMarkup.indexOf("div");
    const closingDivStart = nativeMarkupStart + nativeMarkup.lastIndexOf("div");
    expect(await hoverAtOffset(openingDivStart + 1)).toBeNull();
    expect(await hoverAtOffset(closingDivStart + 1)).toBeNull();

    const memberStart = nativeMarkupStart + nativeMarkup.indexOf("selectionProgressPercent");
    const memberHover = await hoverAtOffset(memberStart + 2);
    expect((memberHover?.contents as { value?: string } | undefined)?.value ?? "")
      .toBe("```ts\nreadonly selectionProgressPercent: 40\n```");
    expect(memberHover?.range == null ? null : textForRange(templateText, memberHover.range))
      .toBe("selectionProgressPercent");

    expect(fs.readFileSync(templatePath, "utf8")).toBe(templateText);
    expect(fs.readFileSync(componentPath, "utf8")).toBe(componentText);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 60_000);

test("native hover preserves exact bare parent ancestry without confusing a $parent member", async () => {
  const htmlPath = path.join(scopeFixture, "src/my-app.html");
  const componentPath = path.join(scopeFixture, "src/my-app.ts");
  const htmlUri = fileUri(scopeFixture, "src/my-app.html");
  const componentUri = fileUri(scopeFixture, "src/my-app.ts");
  const htmlBaseline = fs.readFileSync(htmlPath, "utf8");
  const componentBaseline = fs.readFileSync(componentPath, "utf8");
  const parentMarkup = [
    "        <span data-hover-parent>${$parent}</span>",
    "        <span data-hover-grandparent repeat.for=\"tag of item.tags\">${$parent.$parent}</span>",
  ].join("\n");
  const rootMarkup = [
    "    <p data-hover-missing-parent>${$parent}</p>",
    "    <p data-hover-parent-member>${$this.$parent}</p>",
  ].join("\n");
  const htmlText = htmlBaseline
    .replace(
      "        <product-card\n",
      `${parentMarkup}\n        <product-card\n`,
    )
    .replace("  </main>", `${rootMarkup}\n  </main>`);
  const componentText = componentBaseline.replace(
    "  readonly heading = 'Aurelia IDE playground';",
    "  readonly heading = 'Aurelia IDE playground';\n  readonly $parent = 17;",
  );
  expect(htmlText).not.toBe(htmlBaseline);
  expect(componentText).not.toBe(componentBaseline);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, componentUri, "typescript", componentText);
    openDocument(connection, htmlUri, "html", htmlText);
    await diagnostics.wait(htmlUri, 20_000);

    const hoverAt = async (marker: string, occurrence = 0): Promise<Hover | null> => {
      const markerStart = htmlText.indexOf(marker);
      expect(markerStart, `expected parent marker ${marker}`).toBeGreaterThanOrEqual(0);
      let tokenStart = markerStart;
      for (let index = 0; index <= occurrence; index += 1) {
        tokenStart = htmlText.indexOf("$parent", index === 0 ? markerStart : tokenStart + "$parent".length);
      }
      expect(tokenStart).toBeGreaterThanOrEqual(markerStart);
      return await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, tokenStart + 2),
      });
    };

    const repeatParent = await hoverAt("data-hover-parent>");
    expect((repeatParent?.contents as { value?: string } | undefined)?.value ?? "").toBe([
      "```ts",
      "$parent: MyApp",
      "```",
      "",
      "Parent Aurelia binding context.",
    ].join("\n"));
    expect(repeatParent?.range == null ? null : textForRange(htmlText, repeatParent.range)).toBe("$parent");

    const grandparent = await hoverAt("data-hover-grandparent", 1);
    expect((grandparent?.contents as { value?: string } | undefined)?.value ?? "").toBe([
      "```ts",
      "$parent: MyApp",
      "```",
      "",
      "Aurelia binding context 2 parent scopes up.",
    ].join("\n"));
    expect(grandparent?.range == null ? null : textForRange(htmlText, grandparent.range)).toBe("$parent");

    const missingParent = await hoverAt("data-hover-missing-parent>");
    expect((missingParent?.contents as { value?: string } | undefined)?.value ?? "").toBe([
      "```ts",
      "$parent",
      "```",
      "",
      "Parent Aurelia binding context.",
      "",
      "No parent Aurelia binding context is reachable.",
    ].join("\n"));
    expect(missingParent?.range == null ? null : textForRange(htmlText, missingParent.range)).toBe("$parent");

    const member = await hoverAt("data-hover-parent-member>");
    const memberMarkdown = (member?.contents as { value?: string } | undefined)?.value ?? "";
    expect(memberMarkdown).toBe("```ts\nreadonly $parent: 17\n```");
    expect(memberMarkdown).not.toContain("binding context");
    expect(member?.range == null ? null : textForRange(htmlText, member.range)).toBe("$parent");

    expect(fs.readFileSync(htmlPath, "utf8")).toBe(htmlBaseline);
    expect(fs.readFileSync(componentPath, "utf8")).toBe(componentBaseline);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 60_000);

test("native hover follows unsaved member documentation and deprecation changes", async () => {
  const htmlPath = path.join(scopeFixture, "src/my-app.html");
  const componentPath = path.join(scopeFixture, "src/my-app.ts");
  const htmlUri = fileUri(scopeFixture, "src/my-app.html");
  const componentUri = fileUri(scopeFixture, "src/my-app.ts");
  const htmlBaseline = fs.readFileSync(htmlPath, "utf8");
  const componentBaseline = fs.readFileSync(componentPath, "utf8");
  const htmlText = htmlBaseline.replace(
    "  </main>",
    "    <p data-hover-member-docs>${legacyCatalogStatus}</p>\n  </main>",
  );
  const legacyDeclaration = [
    "  /**",
    "   * Legacy catalog status shown while inventory refreshes.",
    "   * @deprecated Use catalogStatus instead.",
    "   */",
    "  protected readonly legacyCatalogStatus: string = 'legacy';",
    "",
  ].join("\n");
  const currentDeclaration = [
    "  /** Current catalog status after migration. */",
    "  private readonly legacyCatalogStatus: number = 17;",
    "",
  ].join("\n");
  const legacyComponentText = componentBaseline.replace(
    "  readonly heading = 'Aurelia IDE playground';",
    `  readonly heading = 'Aurelia IDE playground';\n${legacyDeclaration}`,
  );
  const currentComponentText = componentBaseline.replace(
    "  readonly heading = 'Aurelia IDE playground';",
    `  readonly heading = 'Aurelia IDE playground';\n${currentDeclaration}`,
  );
  expect(htmlText).not.toBe(htmlBaseline);
  expect(legacyComponentText).not.toBe(componentBaseline);
  expect(currentComponentText).not.toBe(legacyComponentText);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, componentUri, "typescript", legacyComponentText);
    openDocument(connection, htmlUri, "html", htmlText);
    await diagnostics.wait(htmlUri, 20_000);

    const tokenStart = htmlText.indexOf("legacyCatalogStatus");
    expect(tokenStart).toBeGreaterThanOrEqual(0);
    const requestHover = async (): Promise<Hover | null> => await connection.sendRequest<Hover | null>(
      "textDocument/hover",
      {
        textDocument: { uri: htmlUri },
        position: positionAt(htmlText, tokenStart + 2),
      },
    );
    const legacyMarkdown = [
      "```ts",
      "protected readonly legacyCatalogStatus: string",
      "```",
      "",
      "Deprecated: Use catalogStatus instead.",
      "Legacy catalog status shown while inventory refreshes.",
    ].join("\n");
    const legacyHover = await requestHover();
    expect((legacyHover?.contents as { value?: string } | undefined)?.value ?? "").toBe(legacyMarkdown);
    expect(legacyHover?.range == null ? null : textForRange(htmlText, legacyHover.range))
      .toBe("legacyCatalogStatus");

    changeDocument(connection, componentUri, currentComponentText, 2);
    await diagnostics.wait(htmlUri, 20_000);
    const currentMarkdown = [
      "```ts",
      "private readonly legacyCatalogStatus: number",
      "```",
      "",
      "Current catalog status after migration.",
    ].join("\n");
    const deadline = Date.now() + 20_000;
    let currentHover: Hover | null = null;
    while (Date.now() < deadline) {
      currentHover = await requestHover();
      const markdown = (currentHover?.contents as { value?: string } | undefined)?.value ?? "";
      if (markdown === currentMarkdown) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    const currentHoverMarkdown = (currentHover?.contents as { value?: string } | undefined)?.value ?? "";
    expect(currentHoverMarkdown).toBe(currentMarkdown);
    expect(currentHoverMarkdown).not.toContain("Legacy catalog status");
    expect(currentHoverMarkdown).not.toContain("Deprecated");
    expect(currentHover?.range == null ? null : textForRange(htmlText, currentHover.range))
      .toBe("legacyCatalogStatus");

    expect(fs.readFileSync(htmlPath, "utf8")).toBe(htmlBaseline);
    expect(fs.readFileSync(componentPath, "utf8")).toBe(componentBaseline);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 60_000);

test("native hover follows unsaved top-level and inline effective binding modes", async () => {
  const htmlPath = path.join(scopeFixture, "src/my-app.html");
  const mainPath = path.join(scopeFixture, "src/main.ts");
  const productPath = path.join(scopeFixture, "src/components/product-card.ts");
  const displayHintPath = path.join(scopeFixture, "src/attributes/display-hint.ts");
  const htmlUri = fileUri(scopeFixture, "src/my-app.html");
  const mainUri = fileUri(scopeFixture, "src/main.ts");
  const productUri = fileUri(scopeFixture, "src/components/product-card.ts");
  const displayHintUri = fileUri(scopeFixture, "src/attributes/display-hint.ts");
  const htmlBaseline = fs.readFileSync(htmlPath, "utf8");
  const mainBaseline = fs.readFileSync(mainPath, "utf8");
  const productBaseline = fs.readFileSync(productPath, "utf8");
  const displayHintBaseline = fs.readFileSync(displayHintPath, "utf8");
  const shorthandMain = mainBaseline
    .replace(
      "import Aurelia from 'aurelia';",
      "import Aurelia, { ShortHandBindingSyntax } from 'aurelia';",
    )
    .replace("void Aurelia\n  .app({", "void Aurelia\n  .register(...ShortHandBindingSyntax)\n  .app({");
  expect(shorthandMain).not.toBe(mainBaseline);
  const twoWayProduct = productBaseline
    .replace(
      "import { bindable, customElement } from 'aurelia';",
      "import { bindable, BindingMode, customElement } from 'aurelia';",
    )
    .replace(
      "@bindable({ attribute: 'display-label' }) labelText = '';",
      "@bindable({ attribute: 'display-label', mode: BindingMode.twoWay }) labelText = '';",
    );
  expect(twoWayProduct).not.toBe(productBaseline);
  const primaryDisplayHint = displayHintBaseline.replace(
    "export class DisplayHint {",
    "export class DisplayHint {\n  @bindable value = '';",
  );
  expect(primaryDisplayHint).not.toBe(displayHintBaseline);
  const changedText = htmlBaseline
    .replace(
      "display-hint=\"display-label.bind: preview.name",
      "display-hint=\"display-label.two-way: preview.name",
    )
    .replace('display-label.bind="item.name"', 'display-label.two-way="item.name"');
  expect(changedText).not.toBe(htmlBaseline);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  let currentText = htmlBaseline;
  let htmlVersion = 1;
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, mainUri, "typescript", mainBaseline);
    openDocument(connection, productUri, "typescript", productBaseline);
    openDocument(connection, displayHintUri, "typescript", displayHintBaseline);
    openDocument(connection, htmlUri, "html", currentText);
    await diagnostics.wait(htmlUri, 20_000);

    const requestHover = async (marker: string, token = "display-label"): Promise<Hover | null> => {
      const markerStart = currentText.indexOf(marker);
      expect(markerStart, `expected binding-mode marker ${marker}`).toBeGreaterThanOrEqual(0);
      const tokenStart = currentText.indexOf(token, markerStart);
      expect(tokenStart).toBeGreaterThanOrEqual(markerStart);
      return await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: positionAt(currentText, tokenStart + 2),
      });
    };
    const topLevelDefault = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: to view (framework fallback).",
      "Maps to: `ProductCard.labelText`.",
    ].join("\n");
    const inlineDefault = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: to view (framework fallback).",
      "Maps to: `DisplayHint.labelText`.",
    ].join("\n");
    for (const [marker, expected] of [
      ['display-label.bind="item.name"', topLevelDefault],
      ['display-hint="display-label.bind:', inlineDefault],
    ] as const) {
      const hover = await requestHover(marker);
      expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(expected);
      expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-label");
    }
    const canonicalAttributeHover = await requestHover(
      'display-hint="display-label.bind: preview.name',
      "display-hint",
    );
    expect((canonicalAttributeHover?.contents as { value?: string } | undefined)?.value ?? "").toBe([
      "```text",
      "(custom attribute) display-hint",
      "```",
      "",
      "Aurelia custom attribute. Implementation: `DisplayHint`.",
    ].join("\n"));
    expect(canonicalAttributeHover?.range == null
      ? null
      : textForRange(currentText, canonicalAttributeHover.range)).toBe("display-hint");

    changeDocument(connection, productUri, twoWayProduct, 2);
    await diagnostics.wait(htmlUri, 20_000);
    const topLevelBindableDefault = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: two way (bindable default).",
      "Maps to: `ProductCard.labelText`.",
    ].join("\n");
    let crossFileHover: Hover | null = null;
    const crossFileDeadline = Date.now() + 20_000;
    do {
      crossFileHover = await requestHover('display-label.bind="item.name"');
      if (((crossFileHover?.contents as { value?: string } | undefined)?.value ?? "") === topLevelBindableDefault) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < crossFileDeadline);
    expect((crossFileHover?.contents as { value?: string } | undefined)?.value ?? "")
      .toBe(topLevelBindableDefault);

    currentText = htmlBaseline.replace(
      'display-label.bind="item.name"',
      'display-label.one-time="item.name"',
    );
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const topLevelExplicitOneTime = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: one time (explicit command). Default mode: two way.",
      "Maps to: `ProductCard.labelText`.",
    ].join("\n");
    const oneTimeDeadline = Date.now() + 20_000;
    do {
      crossFileHover = await requestHover('display-label.one-time="item.name"');
      if (((crossFileHover?.contents as { value?: string } | undefined)?.value ?? "") === topLevelExplicitOneTime) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < oneTimeDeadline);
    expect((crossFileHover?.contents as { value?: string } | undefined)?.value ?? "")
      .toBe(topLevelExplicitOneTime);

    changeDocument(connection, productUri, productBaseline, 3);
    currentText = htmlBaseline;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);

    currentText = changedText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const topLevelExplicit = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: two way (explicit command). Default mode: to view.",
      "Maps to: `ProductCard.labelText`.",
    ].join("\n");
    const inlineExplicit = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: two way (explicit command). Default mode: to view.",
      "Maps to: `DisplayHint.labelText`.",
    ].join("\n");
    for (const [marker, expected] of [
      ['display-label.two-way="item.name"', topLevelExplicit],
      ['display-hint="display-label.two-way:', inlineExplicit],
    ] as const) {
      const deadline = Date.now() + 20_000;
      let hover: Hover | null = null;
      while (Date.now() < deadline) {
        hover = await requestHover(marker);
        if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === expected) break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(expected);
      expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-label");
    }

    const inlinePlainText = changedText.replace(
      "display-label.two-way: preview.name",
      "display-label: Static label",
    );
    currentText = inlinePlainText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const inlinePlain = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Static value; no binding mode.",
      "Maps to: `DisplayHint.labelText`.",
    ].join("\n");
    const plainDeadline = Date.now() + 20_000;
    let hover: Hover | null = null;
    do {
      hover = await requestHover('display-hint="display-label: Static label');
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === inlinePlain) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < plainDeadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(inlinePlain);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-label");

    const inlineInterpolationText = changedText.replace(
      "display-label.two-way: preview.name",
      "display-label: Hello ${preview.name}",
    );
    currentText = inlineInterpolationText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const inlineInterpolation = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: to view (interpolation).",
      "Maps to: `DisplayHint.labelText`.",
    ].join("\n");
    const deadline = Date.now() + 20_000;
    do {
      hover = await requestHover('display-hint="display-label: Hello ${preview.name}');
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === inlineInterpolation) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < deadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(inlineInterpolation);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-label");

    const valuelessText = htmlBaseline.replace(
      'selected.bind="item.sku === state.selectedSku"',
      "selected",
    );
    currentText = valuelessText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const productCardStart = currentText.indexOf("<product-card");
    const selectedStart = currentText.indexOf("selected", productCardStart);
    expect(productCardStart).toBeGreaterThanOrEqual(0);
    expect(selectedStart).toBeGreaterThan(productCardStart);
    const valuelessExpected = [
      "```ts",
      "(bindable) selected: boolean",
      "```",
      "",
      "Static value; no binding mode.",
    ].join("\n");
    const valuelessDeadline = Date.now() + 20_000;
    do {
      hover = await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: positionAt(currentText, selectedStart + 2),
      });
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === valuelessExpected) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < valuelessDeadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(valuelessExpected);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("selected");

    changeDocument(connection, displayHintUri, primaryDisplayHint, 2);
    const resourceBindText = htmlBaseline.replace(
      "  </main>",
      '    <section display-hint.bind="state.searchText"></section>\n  </main>',
    );
    currentText = resourceBindText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const resourceModeExpected = [
      "```text",
      "(custom attribute) display-hint",
      "```",
      "",
      "Effective mode: to view (framework fallback).",
      "Aurelia custom attribute. Implementation: `DisplayHint`.",
    ].join("\n");
    const resourceDeadline = Date.now() + 20_000;
    do {
      hover = await requestHover('display-hint.bind="state.searchText"', "display-hint");
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === resourceModeExpected) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < resourceDeadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(resourceModeExpected);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-hint");

    const shorthandText = resourceBindText
      .replace('display-label.bind="item.name"', ':display-label="item.name"')
      .replace('display-hint.bind="state.searchText"', ':display-hint="state.searchText"');
    changeDocument(connection, mainUri, shorthandMain, 2);
    currentText = shorthandText;
    changeDocument(connection, htmlUri, currentText, ++htmlVersion);
    await diagnostics.wait(htmlUri, 20_000);
    const shorthandExpected = [
      "```ts",
      "(bindable) display-label: string",
      "```",
      "",
      "Effective mode: to view (framework fallback).",
      "Maps to: `ProductCard.labelText`.",
    ].join("\n");
    const shorthandDeadline = Date.now() + 20_000;
    do {
      hover = await requestHover(':display-label="item.name"');
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === shorthandExpected) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < shorthandDeadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(shorthandExpected);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-label");
    const resourceShorthandDeadline = Date.now() + 20_000;
    do {
      hover = await requestHover(':display-hint="state.searchText"', "display-hint");
      if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === resourceModeExpected) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    } while (Date.now() < resourceShorthandDeadline);
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(resourceModeExpected);
    expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe("display-hint");
    expect(fs.readFileSync(htmlPath, "utf8")).toBe(htmlBaseline);
    expect(fs.readFileSync(mainPath, "utf8")).toBe(mainBaseline);
    expect(fs.readFileSync(productPath, "utf8")).toBe(productBaseline);
    expect(fs.readFileSync(displayHintPath, "utf8")).toBe(displayHintBaseline);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 300_000);

test("native hover keeps a dirty static custom-attribute alias as a resource card", async () => {
  const htmlPath = path.join(scopeFixture, "src/my-app.html");
  const attributePath = path.join(scopeFixture, "src/attributes/display-hint.ts");
  const htmlUri = fileUri(scopeFixture, "src/my-app.html");
  const attributeUri = fileUri(scopeFixture, "src/attributes/display-hint.ts");
  const htmlBaseline = fs.readFileSync(htmlPath, "utf8");
  const attributeBaseline = fs.readFileSync(attributePath, "utf8");
  const htmlText = htmlBaseline.replace(
    "  </main>",
    '    <div title="Native and Aurelia">Provider coexistence</div>\n  </main>',
  );
  const attributeText = attributeBaseline.replace(
    "  name: 'display-hint',",
    "  name: 'display-hint',\n  aliases: ['title'],",
  );
  expect(htmlText).not.toBe(htmlBaseline);
  expect(attributeText).not.toBe(attributeBaseline);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, attributeUri, "typescript", attributeText);
    openDocument(connection, htmlUri, "html", htmlText);
    await diagnostics.wait(htmlUri, 20_000);
    const titleStart = htmlText.indexOf('title="Native and Aurelia"');
    expect(titleStart).toBeGreaterThanOrEqual(0);
    const hover = await connection.sendRequest<Hover | null>("textDocument/hover", {
      textDocument: { uri: htmlUri },
      position: positionAt(htmlText, titleStart + 2),
    });
    expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe([
      "```text",
      "(custom attribute) title",
      "```",
      "",
      "Static value; no binding mode.",
      "Aurelia custom attribute. Alias for: `display-hint`. Implementation: `DisplayHint`.",
    ].join("\n"));
    expect(hover?.range == null ? null : textForRange(htmlText, hover.range)).toBe("title");
    expect(fs.readFileSync(htmlPath, "utf8")).toBe(htmlBaseline);
    expect(fs.readFileSync(attributePath, "utf8")).toBe(attributeBaseline);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 60_000);

test("native hover follows selected overloads and instantiated generics in dirty buffers", async () => {
  const htmlPath = path.join(scopeFixture, "src/my-app.html");
  const componentPath = path.join(scopeFixture, "src/my-app.ts");
  const htmlUri = fileUri(scopeFixture, "src/my-app.html");
  const componentUri = fileUri(scopeFixture, "src/my-app.ts");
  const htmlBaseline = fs.readFileSync(htmlPath, "utf8");
  const componentBaseline = fs.readFileSync(componentPath, "utf8");
  const callDeclarations = [
    "  /** Formats a text selection. */",
    "  formatSelection(value: string): string;",
    "  /** Formats a numeric selection.",
    "   * @deprecated Use formatNumericSelection.",
    "   */",
    "  formatSelection(value: number): number;",
    "  formatSelection(value: string | number): string | number { return value; }",
    "",
    "  /** Preserves the exact input type. */",
    "  identity<T>(value: T): T { return value; }",
    "",
  ].join("\n");
  const componentText = componentBaseline.replace(
    "  readonly heading = 'Aurelia IDE playground';",
    `  readonly heading = 'Aurelia IDE playground';\n${callDeclarations}`,
  );
  const htmlText = htmlBaseline.replace(
    "  </main>",
    [
      "    <p data-hover-overload>${formatSelection(heading)}</p>",
      "    <p data-hover-generic>${identity(state.searchText)}</p>",
      "  </main>",
    ].join("\n"),
  );
  const numberText = htmlText
    .replace("formatSelection(heading)", "formatSelection(state.selectionProgressPercent)")
    .replace("identity(state.searchText)", "identity(state.selectionProgressPercent)");
  expect(componentText).not.toBe(componentBaseline);
  expect(htmlText).not.toBe(htmlBaseline);
  expect(numberText).not.toBe(htmlText);

  const { connection, child, dispose, getStderr } = startServer(scopeFixture);
  const diagnostics = createDiagnosticsRecorder(connection, child, getStderr);
  let currentText = htmlText;
  try {
    await initialize(connection, child, getStderr, scopeFixture);
    openDocument(connection, componentUri, "typescript", componentText);
    openDocument(connection, htmlUri, "html", currentText);
    await diagnostics.wait(htmlUri, 20_000);

    const requestHover = async (marker: string, token: string): Promise<Hover | null> => {
      const markerStart = currentText.indexOf(marker);
      expect(markerStart).toBeGreaterThanOrEqual(0);
      const tokenStart = currentText.indexOf(token, markerStart);
      expect(tokenStart).toBeGreaterThanOrEqual(markerStart);
      return await connection.sendRequest<Hover | null>("textDocument/hover", {
        textDocument: { uri: htmlUri },
        position: positionAt(currentText, tokenStart + 2),
      });
    };
    const stringOverload = [
      "```ts",
      "formatSelection(value: string): string (+1 overload)",
      "```",
      "",
      "Formats a text selection.",
    ].join("\n");
    const stringGeneric = [
      "```ts",
      "identity<string>(value: string): string",
      "```",
      "",
      "Preserves the exact input type.",
    ].join("\n");
    for (const [marker, token, expected] of [
      ["data-hover-overload", "formatSelection", stringOverload],
      ["data-hover-generic", "identity", stringGeneric],
    ] as const) {
      const hover = await requestHover(marker, token);
      expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(expected);
      expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe(token);
    }

    currentText = numberText;
    changeDocument(connection, htmlUri, currentText, 2);
    await diagnostics.wait(htmlUri, 20_000);
    const numberOverload = [
      "```ts",
      "formatSelection(value: number): number (+1 overload)",
      "```",
      "",
      "Deprecated: Use formatNumericSelection.",
      "Formats a numeric selection.",
    ].join("\n");
    const numberGeneric = [
      "```ts",
      "identity<number>(value: number): number",
      "```",
      "",
      "Preserves the exact input type.",
    ].join("\n");
    for (const [marker, token, expected] of [
      ["data-hover-overload", "formatSelection", numberOverload],
      ["data-hover-generic", "identity", numberGeneric],
    ] as const) {
      const deadline = Date.now() + 20_000;
      let hover: Hover | null = null;
      do {
        hover = await requestHover(marker, token);
        if (((hover?.contents as { value?: string } | undefined)?.value ?? "") === expected) break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      } while (Date.now() < deadline);
      expect((hover?.contents as { value?: string } | undefined)?.value ?? "").toBe(expected);
      expect(hover?.range == null ? null : textForRange(currentText, hover.range)).toBe(token);
    }
    expect(fs.readFileSync(htmlPath, "utf8")).toBe(htmlBaseline);
    expect(fs.readFileSync(componentPath, "utf8")).toBe(componentBaseline);
  } finally {
    diagnostics.dispose();
    dispose();
    child.kill("SIGKILL");
    await waitForExit(child);
  }
}, 120_000);

function requireDocumentSymbol(
  symbols: readonly DocumentSymbol[],
  name: string,
  detail: string,
): DocumentSymbol {
  const symbol = symbols.find((candidate) => candidate.name === name && candidate.detail === detail);
  expect(symbol, `expected document symbol ${name} (${detail})`).toBeDefined();
  return symbol!;
}

async function requestWorkspaceSymbols(
  connection: MessageConnection,
  query: string,
): Promise<SymbolInformation[]> {
  return await connection.sendRequest<SymbolInformation[] | null>("workspace/symbol", { query }) ?? [];
}

function localWorkspaceSymbols(
  symbols: readonly SymbolInformation[],
  uri: string,
): SymbolInformation[] {
  return symbols.filter((symbol) => normalizedUriPath(symbol.location.uri) === normalizedUriPath(uri));
}

function expectWorkspaceSymbol(
  symbol: SymbolInformation,
  text: string,
  name: string,
  containerName: string,
): void {
  expect(symbol).toMatchObject({
    name,
    kind: SymbolKind.Class,
    containerName,
  });
  expect(textForRange(text, symbol.location.range)).toBe(name);
}

function textForRange(text: string, range: Range): string {
  return text.slice(offsetAt(text, range.start), offsetAt(text, range.end));
}
