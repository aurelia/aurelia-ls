import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

interface HostUri {
  toString(): string;
}

interface HostDocument {
  readonly uri: HostUri;
  readonly languageId: string;
  readonly version: number;
  readonly isClosed?: boolean;
}

interface HostWorkspace {
  textDocuments: HostDocument[];
  onDidOpenTextDocument(listener: (document: HostDocument) => void): { dispose(): void };
  onDidCloseTextDocument(listener: (document: HostDocument) => void): { dispose(): void };
}

interface LifecycleEvent {
  readonly phase: "open" | "close";
  readonly languageId: string;
  readonly version: number;
}

const localRequire = createRequire(import.meta.url);
const {
  assertSingleBackgroundLanguageTransition,
  exactOpenDocument,
  observeExactDocumentLifecycle,
  waitForExactDocumentLanguage,
} = localRequire("./extension-host/template-language-host-driver.cjs") as {
  assertSingleBackgroundLanguageTransition(
    this: void,
    events: readonly LifecycleEvent[],
    label: string,
  ): void;
  exactOpenDocument(
    this: void,
    workspace: HostWorkspace,
    uri: HostUri,
    label: string,
  ): HostDocument;
  observeExactDocumentLifecycle(
    this: void,
    workspace: HostWorkspace,
    uri: HostUri,
    label: string,
  ): {
    snapshot(): LifecycleEvent[];
    dispose(): void;
  };
  waitForExactDocumentLanguage(
    this: void,
    workspace: HostWorkspace,
    uri: HostUri,
    languageId: string,
    label: string,
    wait: (
      predicate: () => boolean,
      message: string | (() => string),
      timeoutMs: number,
    ) => Promise<void>,
  ): Promise<HostDocument>;
};

describe("owned-template Extension Host contract", () => {
  test("settles reused and replacement TextDocument identities by exact URI and fails closed on ambiguity", async () => {
    const uri = hostUri("file:///workspace/src/app.html");
    const reused = { uri, languageId: "html", version: 1 };
    const replacement = hostDocument(uri, "aurelia-html", 1);
    const workspace = hostWorkspace([reused]);

    reused.languageId = "aurelia-html";
    const reusedSettlement = await settleExactLanguage(workspace, uri, "reused identity");
    expect(reusedSettlement).toBe(reused);

    workspace.textDocuments = [replacement];
    const replacementSettlement = await settleExactLanguage(workspace, uri, "replacement identity");
    expect(replacementSettlement).toBe(replacement);
    expect(() => exactOpenDocument(
      { ...workspace, textDocuments: [replacement, hostDocument(uri, "aurelia-html", 1)] },
      uri,
      "ambiguous replacement",
    )).toThrow(/exactly one open document/u);
  });

  test("snapshots one scoped background transition across a reused identity and rejects a language loop", () => {
    const uri = hostUri("file:///workspace/src/app.html");
    const otherUri = hostUri("file:///workspace/src/other.html");
    const workspace = hostWorkspace([]);
    const lifecycle = observeExactDocumentLifecycle(workspace, uri, "background transition");
    const reused = { uri, languageId: "html", version: 1 };

    workspace.emitOpen(hostDocument(otherUri, "html", 1));
    workspace.emitOpen(reused);
    workspace.emitClose(reused);
    reused.languageId = "aurelia-html";
    workspace.emitOpen(reused);
    const settled = lifecycle.snapshot();
    assertSingleBackgroundLanguageTransition(settled, "background transition");
    expect(settled).toEqual([
      { phase: "open", languageId: "html", version: 1 },
      { phase: "close", languageId: "html", version: 1 },
      { phase: "open", languageId: "aurelia-html", version: 1 },
    ]);

    workspace.emitClose(hostDocument(uri, "aurelia-html", 1, true));
    workspace.emitOpen(hostDocument(uri, "html", 1));
    expect(() => assertSingleBackgroundLanguageTransition(
      lifecycle.snapshot(),
      "looping transition",
    )).toThrow(/without a language loop/u);
    lifecycle.dispose();
    workspace.emitClose(hostDocument(uri, "html", 1, true));
    expect(lifecycle.snapshot()).toHaveLength(5);
  });

  test("pins the style-interpolation journey to the product-support shard used by both Worker lanes", () => {
    const productSurface = readFileSync(
      new URL("./extension-host/suite/product-surface.test.cjs", import.meta.url),
      "utf8",
    );
    const suiteIndex = readFileSync(
      new URL("./extension-host/suite/index.cjs", import.meta.url),
      "utf8",
    );
    const fixtureHtml = readFileSync(
      new URL("../../../fixtures/hello-world/src/my-app.html", import.meta.url),
      "utf8",
    );
    const componentFixtureHtml = readFileSync(
      new URL("../../../fixtures/hello-world/src/components/product-card.html", import.meta.url),
      "utf8",
    );
    const componentFixtureTypeScript = readFileSync(
      new URL("../../../fixtures/hello-world/src/components/product-card.ts", import.meta.url),
      "utf8",
    );
    const unrelatedFixtureHtml = readFileSync(
      new URL("../../../fixtures/hello-world/src/unrelated.html", import.meta.url),
      "utf8",
    );
    const extensionManifest = JSON.parse(readFileSync(
      new URL("../package.json", import.meta.url),
      "utf8",
    )) as { readonly scripts?: Readonly<Record<string, string>> };

    expect(fixtureHtml).toContain('style="width: ${state.selectionProgressPercent}%"');
    expect(componentFixtureHtml).toContain('style="width: ${selectionProgressPercent}%"');
    expect(componentFixtureHtml).toContain('style="stroke-width: ${selectionProgressPercent}px"');
    expect(componentFixtureHtml).toContain("<foreignObject>");
    expect(componentFixtureTypeScript).toContain("readonly selectionProgressPercent = 40;");
    expect(componentFixtureTypeScript).toContain("import template from './product-card.html';");
    expect(unrelatedFixtureHtml).toContain("no Aurelia template association");
    const containmentTitle = "contains native embedded diagnostics to exact owned Aurelia templates";
    const containmentStart = productSurface.indexOf(`test("${containmentTitle}"`);
    const containmentEnd = productSurface.indexOf("\n  test(", containmentStart + 1);
    expect(containmentStart).toBeGreaterThanOrEqual(0);
    expect(containmentEnd).toBeGreaterThan(containmentStart);
    const containmentJourney = productSurface.slice(containmentStart, containmentEnd);
    expect(containmentJourney).toContain("this.timeout(600_000)");
    expect(containmentJourney).toContain("assertSingleBackgroundLanguageTransition");
    expect(containmentJourney).toContain('"components",\n      "product-card.html"');
    expect(containmentJourney).toContain("not previously known to the editor");
    expect(containmentJourney).not.toContain("closeTextDocumentWithNativeEditor");
    expect(containmentJourney).not.toContain("leave the open-document set");
    expect(containmentJourney).not.toContain("setTextDocumentLanguage must be observed through the replacement TextDocument");
    expect(containmentJourney).not.toContain("initialHtmlDocument.isClosed");
    expect(containmentJourney).toContain('getConfiguration("html", owned.uri).get("validate.styles")');
    expect(containmentJourney).toContain('aureliaWorkspace, "src", "unrelated.html"');
    expect(containmentJourney).toContain("without an authored template association must retain native HTML mode");
    expect(containmentJourney).toContain("same-project unrelated HTML must not receive Aurelia template diagnostics");
    expect(containmentJourney).toContain("the template after its live external association is withdrawn");
    expect(containmentJourney).toContain("withdrawn template ownership should restore native CSS validation");
    expect(containmentJourney).toContain("the template after its live external association is restored");
    expect(containmentJourney).toContain("restored template ownership should recontain native CSS diagnostics");
    expect(containmentJourney).toContain("template: '<div>temporarily inline</div>'");
    expect(containmentJourney).not.toContain('excludedAureliaWorkspace, "src", "excluded-view.html"');
    expect(productSurface).toContain('"css-propertyvalueexpected"');
    expect(productSurface).toContain('"css-ruleorselectorexpected"');
    expect(containmentJourney).toContain("the custom mode must retain Aurelia expression completions");
    expect(containmentJourney).toContain("custom mode should retain an exact Aurelia diagnostic");
    expect(productSurface).toContain("retiring the owning session should restore native HTML mode");
    expect(productSurface).toContain("re-admitted ownership should clear the retained native CSS diagnostics");
    expect(productSurface).toContain([
      'test("retires and re-admits the primary Aurelia root without disturbing the secondary root", async function() {',
      "    this.timeout(600_000);",
    ].join("\n"));
    expect(suiteIndex).toContain('"product-support": "product-surface.test.cjs"');
    expect(extensionManifest.scripts?.["test:extension-host:current-stable"])
      .toContain("test:extension-host");
    expect(extensionManifest.scripts?.["test:extension-host:minimum"])
      .toContain("--worker --minimum");
  });
});

async function settleExactLanguage(
  workspace: HostWorkspace,
  uri: HostUri,
  label: string,
): Promise<HostDocument> {
  return await waitForExactDocumentLanguage(
    workspace,
    uri,
    "aurelia-html",
    label,
    (predicate, message) => {
      if (!predicate()) throw new Error(typeof message === "function" ? message() : message);
      return Promise.resolve();
    },
  );
}

function hostUri(value: string): HostUri {
  return { toString: () => value };
}

function hostDocument(
  uri: HostUri,
  languageId: string,
  version: number,
  isClosed = false,
): HostDocument {
  return { uri, languageId, version, isClosed };
}

function hostWorkspace(initialDocuments: HostDocument[]): HostWorkspace & {
  emitOpen(document: HostDocument): void;
  emitClose(document: HostDocument): void;
} {
  const openListeners = new Set<(document: HostDocument) => void>();
  const closeListeners = new Set<(document: HostDocument) => void>();
  return {
    textDocuments: [...initialDocuments],
    onDidOpenTextDocument(listener) {
      openListeners.add(listener);
      return { dispose: () => openListeners.delete(listener) };
    },
    onDidCloseTextDocument(listener) {
      closeListeners.add(listener);
      return { dispose: () => closeListeners.delete(listener) };
    },
    emitOpen(document) {
      for (const listener of openListeners) listener(document);
    },
    emitClose(document) {
      for (const listener of closeListeners) listener(document);
    },
  };
}
