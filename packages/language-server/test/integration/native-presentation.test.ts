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
