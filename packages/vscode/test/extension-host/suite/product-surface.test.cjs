const assert = require("assert");
const { createHash } = require("crypto");
const {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const vscode = require("vscode");
const {
  parseDiagnosticProviderSettlement,
} = require("../diagnostic-provider-settlement.cjs");
const { admittedAuthoredRoot, authenticatedFixtureFilePaths } = require("../authored-resource-path.cjs");
const {
  applyWorkspaceFolderUpdate: applyWorkspaceFolderUpdateContract,
} = require("../workspace-folder-update.cjs");
const {
  assertSingleBackgroundLanguageTransition,
  exactOpenDocument,
  observeExactDocumentLifecycle,
  waitForExactDocumentLanguage,
} = require("../template-language-host-driver.cjs");
const {
  acceptNativeQuickPickOrdinal,
  driveNativeQuickPickOrdinal,
} = require("../native-quick-pick-driver.cjs");
const {
  assertExactFactKeys,
  assertFinalRecoveredWorkspaceFingerprints,
  assertScopedPublicationFingerprintCoherence,
  assertScopedStablePendingEvidence,
  baselineTreeFactKeys,
  closeTextDocumentWithNativeEditor,
  predecessorRaceFactKeys,
  publicationContainsProjectIssue,
  publicationHasExactProjectIssueNodeIds,
  publicationNodeDurableShape,
} = require("../resource-discovery-host-driver.cjs");

const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const secondaryAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_SECONDARY_WORKSPACE;
const excludedAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE;
const plainTypeScriptWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE;
const routedAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_ROUTED_WORKSPACE;
const expectedTransport = process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT;
const extensionId = "AureliaEffect.aurelia-2";
const extensionHostObservationEvent = "aurelia-ls:extension-host-observation";
const resourceDiscoveryHostControlEvent = "aurelia-ls:resource-discovery-host-control";
const resourceDiscoveryHostControlSchema = "aurelia-resource-discovery-host-control/1";
const extensionHostObservations = [];
const memberHoverMarkdown = [
  "```ts",
  "searchText: string",
  "```",
].join("\n");
const letLocalHoverMarkdown = [
  "```ts",
  "preview: CatalogItem",
  "```",
  "",
  "Let local.",
].join("\n");
const repeatLocalHoverMarkdown = [
  "```ts",
  "item: CatalogItem",
  "```",
  "",
  "Repeat local.",
].join("\n");
const productCardHoverMarkdown = [
  "```html",
  "<product-card>",
  "```",
  "",
  "Aurelia custom element. Implementation: `ProductCard`.",
].join("\n");
const productItemBindableHoverMarkdown = [
  "```ts",
  "(bindable) item: CatalogItem | null",
  "```",
  "",
  "Default mode: to view.",
].join("\n");
const catalogCardAliasHoverMarkdown = [
  "```html",
  "<catalog-card>",
  "```",
  "",
  "Aurelia custom element. Alias for: `product-card`. Implementation: `ProductCard`.",
].join("\n");
const missingMemberDiagnosticHoverMarkdown = [
  "Warning `missing-expression-member`: Member \"label\" is not projected on the owner type, so semantic tooling cannot validate or navigate it.",
].join("\n");
const weakOwnerIdentityHoverMarkdown = [
  "```ts",
  "source: unknown",
  "```",
].join("\n");
const staticRoutePathHoverMarkdown = [
  "```text",
  '(route path) "items"',
  "```",
].join("\n");
const parameterizedRoutePathHoverMarkdown = [
  "```text",
  '(route path) "items/item-1"',
  "```",
  "",
  "Configured route id: `item-detail`.",
].join("\n");
const quotedRouteIdHoverMarkdown = [
  "```text",
  "(route id) 'item-detail'",
  "```",
].join("\n");
const dynamicRouteHoverMarkdown = "Dynamic route target.";
const nativeTitleAliasHoverMarkdown = [
  "```text",
  "(custom attribute) title",
  "```",
  "",
  "Aurelia custom attribute. Alias for: `display-hint`. Implementation: `DisplayHint`.",
].join("\n");
const currentContextHoverMarkdown = [
  "```ts",
  "$this: MyApp",
  "```",
  "",
  "Current Aurelia binding context.",
].join("\n");
const parentContextHoverMarkdown = [
  "```ts",
  "$parent: MyApp",
  "```",
  "",
  "Parent Aurelia binding context.",
].join("\n");
const missingParentContextHoverMarkdown = [
  "```ts",
  "$parent",
  "```",
  "",
  "Parent Aurelia binding context.",
  "",
  "No parent Aurelia binding context is reachable.",
].join("\n");
const parentNamedMemberHoverMarkdown = [
  "```ts",
  "readonly $parent: 17",
  "```",
].join("\n");
const legacyDocumentedMemberHoverMarkdown = [
  "```ts",
  "protected readonly legacyCatalogStatus: string",
  "```",
  "",
  "Deprecated: Use catalogStatus instead.",
  "Legacy catalog status shown at https\\://example.test/status.",
].join("\n");
const currentDocumentedMemberHoverMarkdown = [
  "```ts",
  "private readonly legacyCatalogStatus: number",
  "```",
  "",
  "Current catalog status after migration.",
].join("\n");
const recordExtensionHostObservation = (event) => {
  if (event != null && typeof event === "object") extensionHostObservations.push(event);
};
let selectedTransport;
let resourceDiscoveryAcceptance;
const resourceDiscoveryEvidence = {
  facts: {
    tree: {},
    quickPick: {},
    recovery: {},
    output: {},
    navigation: {},
    cancellation: {},
  },
};

if (
  !aureliaWorkspace
  || !secondaryAureliaWorkspace
  || !excludedAureliaWorkspace
  || !plainTypeScriptWorkspace
  || !routedAureliaWorkspace
) {
  throw new Error("All extension-host workspace paths are required.");
}
if (expectedTransport !== "worker" && expectedTransport !== "ipc") {
  throw new Error("Expected extension-host transport must be worker or ipc.");
}
if (process.env.AURELIA_LS_EXTENSION_HOST_TAIL_OBSERVATION !== "1") {
  throw new Error("Product-support requires provider-tail observation before extension activation.");
}

suite("extension-host product surface", () => {
  suiteSetup(async () => {
    process.on(extensionHostObservationEvent, recordExtensionHostObservation);
    const extension = vscode.extensions.getExtension(extensionId);
    assert(extension, `Expected extension ${extensionId} in the Extension Development Host.`);
    resourceDiscoveryAcceptance = await authenticateResourceDiscoveryAcceptanceInputs(extension);
    const transportModuleUrl = pathToFileURL(path.join(extension.extensionPath, "out", "worker-transport.js"));
    const { shouldUseWorkerTransport } = await import(transportModuleUrl.href);
    selectedTransport = shouldUseWorkerTransport() ? "worker" : "ipc";
    await extension.activate();
    const document = await showAureliaDocument("src/my-app.html");
    await waitFor(
      async () => (await hoverMarkdown(document, "state.searchText")).includes("searchText"),
      "the admitted Aurelia workspace should answer template hover",
      60_000,
    );
  });

  suiteTeardown(() => {
    process.off(extensionHostObservationEvent, recordExtensionHostObservation);
  });

  test("selects the requested language-server transport", () => {
    assert.strictEqual(selectedTransport, expectedTransport);
  });

  test("ships only the retained command and Explorer surface", async () => {
    const commands = new Set(await vscode.commands.getCommands(true));
    for (const command of [
      "aurelia.goToResource",
      "aurelia.goToAvailableResource",
      "aurelia.openRelatedFile",
      "aurelia.refreshResourceExplorer",
    ]) {
      assert(commands.has(command), `Expected ${command} to be registered.`);
    }
    assert(!commands.has("aurelia.diagnosticsReport"), "Withheld Diagnostics Report command must not be registered.");
    assert(!commands.has("aurelia.inspectAtCursor"), "Removed Inspect at Cursor command must not be registered.");

    await vscode.commands.executeCommand("workbench.view.explorer");
    await vscode.commands.executeCommand("aureliaResourceExplorer.focus");
    await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
  });

  test("suppresses native template diagnostics only through the scoped opt-in", async function() {
    this.timeout(600_000);
    const ownedUri = vscode.Uri.file(path.join(
      aureliaWorkspace,
      "src",
      "components",
      "product-card.html",
    ));
    assert.strictEqual(
      vscode.workspace.textDocuments.some((document) => document.uri.toString() === ownedUri.toString()),
      false,
      "the background ownership journey requires an exact template not previously known to the editor",
    );
    const settingsSnapshot = snapshotWorkspaceFolderSettings(aureliaWorkspace);
    const suppression = vscode.workspace.getConfiguration("aurelia.templateDiagnostics", ownedUri);
    const originalWorkspaceFolderValue = suppression.inspect("suppressNative")?.workspaceFolderValue;
    assert.strictEqual(
      templateDiagnosticsSuppressNative(ownedUri),
      false,
      "native template-diagnostic suppression must default to false",
    );
    const lifecycle = observeExactDocumentLifecycle(
      vscode.workspace,
      ownedUri,
      "the opt-in native-diagnostic suppression journey",
    );
    let owned;
    let ownedBaseline;
    let ordinary;
    let ordinaryBaseline;
    try {
      owned = await vscode.workspace.openTextDocument(ownedUri);
      assert.strictEqual(
        owned.languageId,
        "html",
        "a proved Aurelia template must retain native HTML mode while suppression is disabled",
      );
      assert.strictEqual(
        vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === ownedUri.toString()),
        false,
        "the default-mode template should begin in the background",
      );
      assert.strictEqual(
        vscode.workspace.getConfiguration("html", owned.uri).get("validate.styles"),
        true,
        "the opt-in must not mutate the user's URI-scoped native HTML validation setting",
      );
      await vscode.window.showTextDocument(owned, { preview: false });
      await waitFor(
        () => hasExactNativeInterpolationDiagnostics(owned.uri),
        () => `default native HTML mode should retain its interpolation diagnostic; observed ${diagnosticSummary(vscode.languages.getDiagnostics(owned.uri))}`,
        60_000,
      );

      await suppression.update("suppressNative", true, vscode.ConfigurationTarget.WorkspaceFolder);
      await waitFor(
        () => templateDiagnosticsSuppressNative(ownedUri),
        "the workspace-folder suppression opt-in should become effective",
        60_000,
      );
      owned = await waitForExactDocumentLanguage(
        vscode.workspace,
        ownedUri,
        "aurelia-html",
        "the opted-in proved Aurelia template",
        waitFor,
      );
      await vscode.window.showTextDocument(owned, { preview: false });
      await waitFor(
        () => nativeCssDiagnostics(owned.uri).length === 0,
        () => `enabled suppression should clear native CSS diagnostics; observed ${diagnosticSummary(vscode.languages.getDiagnostics(owned.uri))}`,
        60_000,
      );
      const articleStart = owned.getText().indexOf("<article");
      assert.notStrictEqual(articleStart, -1, "Expected the native article-element completion anchor.");
      const nativeCompletions = await vscode.commands.executeCommand(
        "vscode.executeCompletionItemProvider",
        owned.uri,
        owned.positionAt(articleStart + "<art".length),
      );
      const nativeCompletionItems = Array.isArray(nativeCompletions)
        ? nativeCompletions
        : Array.isArray(nativeCompletions?.items) ? nativeCompletions.items : [];
      assert(
        nativeCompletionItems.some((item) => completionLabel(item) === "article"),
        "Aurelia HTML mode should retain the native article-element completion",
      );
      const aureliaCompletions = await completionsAt(owned, "labelText", "labelText");
      assert(
        aureliaCompletions.some((item) => completionLabel(item) === "labelText"),
        "Aurelia HTML mode should retain Aurelia expression completions",
      );

      ownedBaseline = owned.getText();
      const diagnosticProbe = "missingContainmentMember";
      const diagnosticChanged = ownedBaseline.replace(
        "  <h3>${labelText}</h3>",
        `  <h3>\${${diagnosticProbe}}</h3>`,
      );
      assert.notStrictEqual(diagnosticChanged, ownedBaseline, "Expected the Aurelia diagnostic probe edit to apply.");
      try {
        await replaceDocumentText(owned, diagnosticChanged);
        await waitFor(
          () => vscode.languages.getDiagnostics(owned.uri).some((diagnostic) =>
            diagnostic.source === "aurelia"
              && diagnosticCode(diagnostic) === "missing-expression-member"
              && owned.getText(diagnostic.range) === diagnosticProbe
          ),
          () => `Aurelia diagnostics should remain active during native suppression; observed ${diagnosticSummary(vscode.languages.getDiagnostics(owned.uri))}`,
          120_000,
        );
        assert.deepStrictEqual(
          nativeCssDiagnostics(owned.uri),
          [],
          "an Aurelia diagnostic publication must not resurrect suppressed native diagnostics",
        );
      } finally {
        if (!owned.isClosed && owned.getText() !== ownedBaseline) {
          await replaceDocumentText(owned, ownedBaseline);
          await waitFor(
            () => !vscode.languages.getDiagnostics(owned.uri).some((diagnostic) =>
              diagnostic.source === "aurelia" && diagnosticCode(diagnostic) === "missing-expression-member"
            ) && nativeCssDiagnostics(owned.uri).length === 0,
            "the Aurelia diagnostic probe should cleanly restore the suppressed template",
            120_000,
          );
        }
      }

      const componentSourceUri = vscode.Uri.file(path.join(
        aureliaWorkspace,
        "src",
        "components",
        "product-card.ts",
      ));
      const componentSource = await vscode.workspace.openTextDocument(componentSourceUri);
      const componentSourceBaseline = componentSource.getText();
      const inlineTemplateSource = componentSourceBaseline.replace(
        "  template,",
        "  template: '<div>temporarily inline</div>',",
      );
      assert.notStrictEqual(inlineTemplateSource, componentSourceBaseline);
      try {
        await replaceDocumentText(componentSource, inlineTemplateSource);
        owned = await waitForExactDocumentLanguage(
          vscode.workspace,
          ownedUri,
          "html",
          "the opted-in template after its external association is withdrawn",
          waitFor,
        );
        await waitFor(
          () => hasExactNativeInterpolationDiagnostics(owned.uri),
          () => `withdrawn ownership should restore native diagnostics; observed ${diagnosticSummary(vscode.languages.getDiagnostics(owned.uri))}`,
          120_000,
        );
      } finally {
        if (!componentSource.isClosed && componentSource.getText() !== componentSourceBaseline) {
          await replaceDocumentText(componentSource, componentSourceBaseline);
        }
        owned = await waitForExactDocumentLanguage(
          vscode.workspace,
          ownedUri,
          "aurelia-html",
          "the opted-in template after its external association is restored",
          waitFor,
        );
        await waitFor(
          () => nativeCssDiagnostics(owned.uri).length === 0,
          "restored exact ownership should resume enabled native suppression",
          120_000,
        );
      }

      const ordinaryUri = vscode.Uri.file(path.join(aureliaWorkspace, "src", "unrelated.html"));
      ordinary = await vscode.workspace.openTextDocument(ordinaryUri);
      ordinaryBaseline = ordinary.getText();
      await replaceDocumentText(ordinary, '<p style="width: ${excludedMessage}%">${excludedMessage}</p>\n');
      assert.strictEqual(
        ordinary.languageId,
        "html",
        "unowned HTML must remain native while its workspace folder enables suppression",
      );
      await vscode.window.showTextDocument(ordinary, { preview: false });
      await waitFor(
        () => hasExactNativeInterpolationDiagnostics(ordinary.uri),
        () => `unowned HTML should retain native diagnostics during opt-in suppression; observed ${diagnosticSummary(vscode.languages.getDiagnostics(ordinary.uri))}`,
        60_000,
      );
      assert.strictEqual(
        vscode.languages.getDiagnostics(ordinary.uri).some((diagnostic) => diagnostic.source === "aurelia"),
        false,
        "unowned HTML must not receive Aurelia template diagnostics",
      );

      await suppression.update("suppressNative", false, vscode.ConfigurationTarget.WorkspaceFolder);
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ownedUri),
        "the workspace-folder suppression opt-out should become effective",
        60_000,
      );
      owned = await waitForExactDocumentLanguage(
        vscode.workspace,
        ownedUri,
        "html",
        "the proved Aurelia template after suppression is disabled",
        waitFor,
      );
      await vscode.window.showTextDocument(owned, { preview: false });
      await waitFor(
        () => hasExactNativeInterpolationDiagnostics(owned.uri),
        () => `disabling suppression should restore native CSS diagnostics; observed ${diagnosticSummary(vscode.languages.getDiagnostics(owned.uri))}`,
        60_000,
      );
      assert.strictEqual(ordinary.languageId, "html");
      assert.deepStrictEqual(
        lifecycle.snapshot().map(({ phase, languageId }) => ({ phase, languageId })),
        [
          { phase: "open", languageId: "html" },
          { phase: "close", languageId: "html" },
          { phase: "open", languageId: "aurelia-html" },
          { phase: "close", languageId: "aurelia-html" },
          { phase: "open", languageId: "html" },
          { phase: "close", languageId: "html" },
          { phase: "open", languageId: "aurelia-html" },
          { phase: "close", languageId: "aurelia-html" },
          { phase: "open", languageId: "html" },
        ],
        "the scoped opt-in, ownership withdrawal/restore, and disable should produce exact reversible transitions",
      );
    } finally {
      if (ordinary != null && ordinaryBaseline != null && ordinary.getText() !== ordinaryBaseline) {
        await replaceDocumentText(ordinary, ordinaryBaseline);
        await waitFor(
          () => nativeCssDiagnostics(ordinary.uri).length === 0,
          "unowned HTML cleanup should clear its deliberate native diagnostics",
          60_000,
        );
      }
      await suppression.update(
        "suppressNative",
        originalWorkspaceFolderValue,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ownedUri),
        "suppression cleanup should restore the default effective value",
        60_000,
      );
      if (vscode.workspace.textDocuments.some((document) => document.uri.toString() === ownedUri.toString())) {
        owned = await waitForExactDocumentLanguage(
          vscode.workspace,
          ownedUri,
          "html",
          "suppression cleanup should restore the proved template to native HTML mode",
          waitFor,
        );
      }
      restoreWorkspaceFolderSettings(settingsSnapshot, "suppression cleanup");
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ownedUri),
        "settings-byte cleanup must leave the effective suppression value current",
        60_000,
      );
      lifecycle.dispose();
    }
  });

  test("navigates through both native resource discovery journeys", async () => {
    const origin = await showAureliaDocument("src/my-app.html");
    await executeAndAcceptQuickPick("aurelia.goToResource");
    assertAuthoredResourceDocument(
      vscode.window.activeTextEditor?.document,
      origin.uri,
      [aureliaWorkspace, routedAureliaWorkspace],
    );

    const availableOrigin = await showAureliaDocument("src/my-app.html");
    await waitFor(
      async () => (await hoverMarkdown(availableOrigin, "<product-card", "product-card"))
        .includes("<product-card>"),
      "the active template should be re-admitted before cursor-scoped resource navigation",
      60_000,
    );
    const availableCursor = positionIn(availableOrigin, "<product-card", "product-card");
    const activeEditor = vscode.window.activeTextEditor;
    assert(activeEditor && activeEditor.document.uri.toString() === availableOrigin.uri.toString());
    activeEditor.selection = new vscode.Selection(availableCursor, availableCursor);
    await executeAndAcceptQuickPick("aurelia.goToAvailableResource");
    assertAuthoredResourceDocument(
      vscode.window.activeTextEditor?.document,
      origin.uri,
      [aureliaWorkspace],
    );
  });

  test("shows typed members at an empty compound-interpolation frontier", async function() {
    this.timeout(180_000);
    const relativePath = "src/components/product-card.html";
    let document = await showAureliaDocument(relativePath);
    if (document.isDirty) {
      await vscode.commands.executeCommand("workbench.action.files.revert");
      await waitFor(
        () => !exactOpenDocument(vscode.workspace, document.uri, "the completion probe template").isDirty,
        "the completion probe template should begin from a clean editor buffer",
        60_000,
      );
      document = exactOpenDocument(vscode.workspace, document.uri, "the clean completion probe template");
    }
    const baseline = document.getText();
    const changed = baseline
      .replace(
        '  <p if.bind="item">${item.description}</p>',
        '  <p if.bind="item">${item.description} ${item.}</p>',
      )
      .replace('  <span>${stockText}</span>', '  <span>${stockText.}</span>');
    assert.notStrictEqual(changed, baseline, "Expected the compound-interpolation completion probe to apply.");

    try {
      await replaceDocumentText(document, changed);
      const marker = '${item.description} ${item.}</p>';
      const markerStart = document.getText().indexOf(marker);
      assert.notStrictEqual(markerStart, -1, "Expected the compound interpolation in the open editor buffer.");
      const cursorOffset = markerStart + marker.lastIndexOf('${item.') + '${item.'.length;
      const cursor = document.positionAt(cursorOffset);
      const expectedLabels = ["description", "name", "quantity", "sku", "tags", "tone"];
      let completions = [];
      await waitFor(async () => {
        const response = await vscode.commands.executeCommand(
          "vscode.executeCompletionItemProvider",
          document.uri,
          cursor,
        );
        completions = Array.isArray(response)
          ? response
          : Array.isArray(response?.items) ? response.items : [];
        const labels = new Set(completions.map(completionLabel));
        return expectedLabels.every((label) => labels.has(label));
      }, "the native completion provider should expose every CatalogItem member", 120_000);

      const description = completions.find((item) => completionLabel(item) === "description");
      assert(description, "Expected the description member through the native completion provider.");
      assert.strictEqual(completionInsertText(description), "description");
      const replacementRange = completionReplacementRange(description);
      assert(replacementRange instanceof vscode.Range, "Expected an authored completion replacement range.");
      assert.strictEqual(
        replacementRange.isEqual(new vscode.Range(cursor, cursor)),
        true,
        "The empty member frontier must produce a zero-width edit exactly at the cursor.",
      );
      assert.strictEqual(document.getText(replacementRange), "");

      const primitiveMarker = '${stockText.}</span>';
      const primitiveMarkerStart = document.getText().indexOf(primitiveMarker);
      assert.notStrictEqual(primitiveMarkerStart, -1, "Expected the stockText completion probe in the open buffer.");
      const primitiveCursor = document.positionAt(primitiveMarkerStart + '${stockText.'.length);
      let primitiveCompletions = [];
      await waitFor(async () => {
        const response = await vscode.commands.executeCommand(
          "vscode.executeCompletionItemProvider",
          document.uri,
          primitiveCursor,
        );
        primitiveCompletions = Array.isArray(response)
          ? response
          : Array.isArray(response?.items) ? response.items : [];
        const primitiveLabels = new Set(primitiveCompletions.map(completionLabel));
        return primitiveLabels.has("length")
          && primitiveLabels.has("toUpperCase")
          && primitiveLabels.has("anchor");
      }, "the native completion provider should expose the stockText string surface", 120_000);

      const primitiveLabels = primitiveCompletions.map(completionLabel);
      assert.strictEqual(
        primitiveLabels.some((label) => typeof label === "string" && label.startsWith("__@")),
        false,
        "the native completion provider must not expose TypeScript's escaped symbol names",
      );
      const length = primitiveCompletions.find((item) => completionLabel(item) === "length");
      const anchor = primitiveCompletions.find((item) => completionLabel(item) === "anchor");
      assert(length, "Expected the ordinary string length member through the native completion provider.");
      assert(anchor, "Expected the deprecated string anchor member through the native completion provider.");
      assert.deepStrictEqual(
        [...(anchor.tags ?? [])],
        [vscode.CompletionItemTag.Deprecated],
        "the native completion provider must mark deprecated checker members",
      );
      assert.strictEqual(typeof length.sortText, "string");
      assert.strictEqual(typeof anchor.sortText, "string");
      assert(length.sortText < anchor.sortText, "deprecated members must sort after ordinary members");
      assert(
        primitiveCompletions.indexOf(length) < primitiveCompletions.indexOf(anchor),
        "the native completion result must present deprecated members after ordinary members",
      );
    } finally {
      if (!document.isClosed) {
        await vscode.window.showTextDocument(document, { preview: false });
        await vscode.commands.executeCommand("workbench.action.files.revert");
        await waitFor(
          () => document.getText() === baseline && !document.isDirty,
          "the compound-interpolation completion probe should revert to a clean baseline",
          60_000,
        );
        await closeTextDocumentWithNativeEditor(
          document,
          "the compound-interpolation completion probe",
          { workspace: vscode.workspace, window: vscode.window, wait: waitFor },
        );
      }
    }
  });

  test("projects bounded hover cards and related facts through live editor providers", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    const resourceHoverResult = await exactHoverAt(
      document,
      "<product-card",
      "product-card",
      productCardHoverMarkdown,
    );
    const bindableHoverResult = await exactHoverAt(
      document,
      "<product-card",
      "item",
      productItemBindableHoverMarkdown,
    );
    const resourceHover = hoverMarkdownText(resourceHoverResult);
    const bindableHover = hoverMarkdownText(bindableHoverResult);

    const memberHover = await exactHoverAt(
      document,
      "state.searchText",
      "searchText",
      memberHoverMarkdown,
    );
    const letLocalHover = await exactHoverAt(
      document,
      '<let preview.bind="selectedItem">',
      "preview",
      letLocalHoverMarkdown,
    );
    const repeatLocalUseHover = await exactHoverAt(
      document,
      'display-label.bind="item.name"',
      "item",
      repeatLocalHoverMarkdown,
    );
    const repeatLocalDeclarationHover = await exactHoverAt(
      document,
      '<li repeat.for="item of visibleItems">',
      "item",
      repeatLocalHoverMarkdown,
    );
    assertBoundedHoverCard(resourceHover, "custom-element resource");
    assertBoundedHoverCard(bindableHover, "typed bindable");
    assertBoundedHoverCard(hoverMarkdownText(memberHover), "member");
    assertBoundedHoverCard(hoverMarkdownText(letLocalHover), "let local");
    assertBoundedHoverCard(hoverMarkdownText(repeatLocalUseHover), "repeat-local use");
    assertBoundedHoverCard(hoverMarkdownText(repeatLocalDeclarationHover), "repeat-local declaration");
    assert(!hoverMarkdownText(letLocalHover).includes("Aurelia custom attribute"));
    assert(!hoverMarkdownText(letLocalHover).includes("(bindable)"));
    assert(!hoverMarkdownText(repeatLocalUseHover).includes("Aurelia template controller"));
    assert(!hoverMarkdownText(repeatLocalUseHover).includes("(bindable)"));
    assert(!hoverMarkdownText(repeatLocalDeclarationHover).includes("Aurelia template controller"));
    assert(!hoverMarkdownText(repeatLocalDeclarationHover).includes("(bindable)"));

    const definitions = await definitionsAt(document, "<product-card", "product-card");
    assert(definitions.some((uri) =>
      normalize(uri.fsPath) === normalize(path.join(aureliaWorkspace, "src", "components", "product-card.ts"))
    ), "Expected product-card to resolve to its authored definition.");

    const completions = await completionsAt(document, "state.searchText", "searchText");
    const searchTextCompletion = completions.find((item) => completionLabel(item) === "searchText");
    assert(searchTextCompletion, "Expected state member completion through the native completion provider.");
    assert.strictEqual(searchTextCompletion.kind, vscode.CompletionItemKind.Property);
    assert.match(searchTextCompletion.detail ?? "", /type-member/);
    assert.strictEqual(completionInsertText(searchTextCompletion), "searchText");
    const completionRange = completionReplacementRange(searchTextCompletion);
    assert.strictEqual(
      completionRange == null ? null : document.getText(completionRange),
      "searchText",
      "Expected completion to preserve its authored replacement range.",
    );

    const references = await referencesAt(document, "<product-card", "item.bind");
    const referencePaths = new Set(references.map((location) => normalize(location.uri.fsPath)));
    for (const expectedPath of [
      path.join(aureliaWorkspace, "src", "my-app.html"),
      path.join(aureliaWorkspace, "src", "components", "product-card.html"),
      path.join(aureliaWorkspace, "src", "components", "product-card.ts"),
    ]) {
      assert(
        referencePaths.has(normalize(expectedPath)),
        `Expected native references to include ${expectedPath}.`,
      );
    }

    const productDocument = await showAureliaDocument("src/components/product-card.ts");
    const templateBaseline = document.getText();
    const productBaseline = productDocument.getText();
    const aliasedProduct = productBaseline.replace(
      "  name: 'product-card',",
      "  name: 'product-card',\n  aliases: ['catalog-card'],",
    );
    const aliasMarkup = '    <catalog-card item.bind="preview"></catalog-card>\n';
    const aliasedTemplate = templateBaseline.replace("  </main>", `${aliasMarkup}  </main>`);
    assert.notStrictEqual(aliasedProduct, productBaseline, "Expected the alias decorator edit to apply.");
    assert.notStrictEqual(aliasedTemplate, templateBaseline, "Expected the alias usage edit to apply.");

    try {
      await replaceDocumentTexts([
        [productDocument, aliasedProduct],
        [document, aliasedTemplate],
      ]);
      await waitFor(
        async () => (await hoverMarkdown(document, "<catalog-card", "catalog-card"))
          .includes("Alias for: `product-card`."),
        "the in-memory resource alias should reach the native hover provider",
        60_000,
      );
      const aliasHover = await exactHoverAt(
        document,
        "<catalog-card",
        "catalog-card",
        catalogCardAliasHoverMarkdown,
      );
      assertBoundedHoverCard(hoverMarkdownText(aliasHover), "source-backed resource alias");
    } finally {
      if (productDocument.getText() !== productBaseline || document.getText() !== templateBaseline) {
        await replaceDocumentTexts([
          [productDocument, productBaseline],
          [document, templateBaseline],
        ]);
      }
      await waitFor(
        async () => (await hoverMarkdown(document, "<product-card", "product-card"))
          === productCardHoverMarkdown,
        "resource-alias cleanup should restore the canonical resource hover",
        60_000,
      );
    }
  });

  test("preserves authored mixed-case hover identity over browser-normalized resources", async function() {
    this.timeout(600_000);
    const document = await showAureliaDocument("src/my-app.html");
    const diskBaseline = readFileSync(document.uri.fsPath, "utf8");
    if (document.isDirty) {
      await vscode.window.showTextDocument(document, { preview: false });
      await vscode.commands.executeCommand("workbench.action.files.revert");
      await waitFor(
        () => document.getText() === diskBaseline && !document.isDirty,
        "the mixed-case hover journey should start from a clean disk-equal template",
        60_000,
      );
    }
    const baseline = document.getText();
    assert.strictEqual(document.isDirty, false, "the mixed-case hover journey requires a clean template baseline");
    assert.strictEqual(baseline, diskBaseline, "the mixed-case hover journey requires a disk-equal template baseline");
    const mixedCaseTemplate = baseline
      .replace(
        "        <product-card\n          item.bind=",
        "        <PrOdUcT-CaRd\n          item.BiNd=",
      )
      .replace("        </product-card>", "        </pRoDuCt-CaRd>")
      .replace("      display-hint=", "      DiSpLaY-HiNt=")
      .replace("preview.quantity | stockLabel", "preview.quantity | StockLabel");
    assert.notStrictEqual(mixedCaseTemplate, baseline, "Expected the mixed-case hover witnesses to be inserted.");
    for (const witness of ["<PrOdUcT-CaRd", "item.BiNd", "DiSpLaY-HiNt", "StockLabel", "</pRoDuCt-CaRd>"]) {
      assert(mixedCaseTemplate.includes(witness), `Expected mixed-case hover witness ${witness}.`);
    }

    try {
      await replaceDocumentText(document, mixedCaseTemplate);
      await waitFor(
        async () => (await hoverMarkdown(document, "<PrOdUcT-CaRd", "PrOdUcT-CaRd"))
          .includes("<PrOdUcT-CaRd>"),
        "the authored mixed-case resource should reach the native hover provider",
        120_000,
      );

      const opening = await exactHoverMatchingAt(
        document,
        "<PrOdUcT-CaRd",
        "PrOdUcT-CaRd",
        (markdown) => markdown.includes("<PrOdUcT-CaRd>") && markdown.includes("Aurelia custom element."),
        "mixed-case custom-element opening",
      );
      const closing = await exactHoverMatchingAt(
        document,
        "</pRoDuCt-CaRd>",
        "pRoDuCt-CaRd",
        (markdown) => markdown.includes("<pRoDuCt-CaRd>") && markdown.includes("Aurelia custom element."),
        "mixed-case custom-element closing",
      );
      const customAttribute = await exactHoverMatchingAt(
        document,
        "DiSpLaY-HiNt=",
        "DiSpLaY-HiNt",
        (markdown) => markdown.includes("(custom attribute) DiSpLaY-HiNt")
          && markdown.includes("Implementation: `DisplayHint`."),
        "mixed-case custom attribute",
      );
      const command = await exactHoverMatchingAt(
        document,
        "item.BiNd=",
        "BiNd",
        (markdown) => markdown.includes("(binding command) BiNd")
          && markdown.includes("Aurelia binding command."),
        "mixed-case binding command",
      );
      for (const [hover, label] of [
        [opening, "mixed-case custom-element opening"],
        [closing, "mixed-case custom-element closing"],
        [customAttribute, "mixed-case custom attribute"],
        [command, "mixed-case binding command"],
      ]) {
        assertBoundedHoverCard(hoverMarkdownText(hover), label);
      }

      let wrongCaseConverterHovers = [];
      await waitFor(
        async () => {
          wrongCaseConverterHovers = await hoversAt(
            document,
            "preview.quantity | StockLabel",
            "StockLabel",
          );
          return wrongCaseConverterHovers.every((hover) => {
            const markdown = hoverMarkdownText(hover);
            return !markdown.includes("(value converter) stockLabel")
              && !markdown.includes("(value converter) StockLabel")
              && !markdown.includes("Aurelia value converter.");
          });
        },
        "wrong-case expression resources must not reuse browser-normalized identity",
        120_000,
      );
      assert(
        wrongCaseConverterHovers.every((hover) => !hoverMarkdownText(hover).includes("Aurelia value converter")),
        `Wrong-case converter produced a resource hover: ${JSON.stringify(wrongCaseConverterHovers.map(hoverMarkdownText))}.`,
      );
      assert.strictEqual(
        readFileSync(document.uri.fsPath, "utf8"),
        diskBaseline,
        "the in-memory mixed-case journey must not mutate the fixture on disk",
      );
    } finally {
      if (!document.isClosed) {
        await vscode.window.showTextDocument(document, { preview: false });
        await vscode.commands.executeCommand("workbench.action.files.revert");
      }
      await waitFor(
        async () => !document.isClosed
          && document.getText() === baseline
          && !document.isDirty
          && (await hoverMarkdown(document, "<product-card", "product-card")) === productCardHoverMarkdown,
        "mixed-case hover cleanup should restore the canonical resource answer",
        120_000,
      );
      assert.strictEqual(document.getText(), baseline);
      assert.strictEqual(readFileSync(document.uri.fsPath, "utf8"), diskBaseline);
    }
  });

  test("projects bare parent scope without confusing a component $parent member", async function() {
    this.timeout(600_000);
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const componentDocument = await showAureliaDocument("src/my-app.ts");
    const templateDiskBaseline = readFileSync(templateDocument.uri.fsPath, "utf8");
    const componentDiskBaseline = readFileSync(componentDocument.uri.fsPath, "utf8");
    const templateBaseline = templateDocument.getText();
    const componentBaseline = componentDocument.getText();
    assert.strictEqual(templateBaseline, templateDiskBaseline, "the parent-hover journey requires a disk-equal template");
    assert.strictEqual(componentBaseline, componentDiskBaseline, "the parent-hover journey requires a disk-equal component");
    assert.strictEqual(templateDocument.isDirty, false, "the parent-hover journey requires a clean template");
    assert.strictEqual(componentDocument.isDirty, false, "the parent-hover journey requires a clean component");
    assert(
      templateBaseline.includes('<li repeat.for="item of visibleItems">'),
      "the parent-hover journey requires the causal outer repeat scope",
    );

    const parentMarkup = "        <span data-hover-parent>${$parent}</span>\n";
    const rootMarkup = [
      "    <p data-hover-missing-parent>${$parent}</p>",
      "    <p data-hover-parent-member>${$this.$parent}</p>",
      "",
    ].join("\n");
    const editedTemplate = templateBaseline
      .replace("        <product-card\n", `${parentMarkup}        <product-card\n`)
      .replace("  </main>", `${rootMarkup}  </main>`);
    const editedComponent = componentBaseline.replace(
      "  readonly heading = 'Aurelia IDE playground';",
      "  readonly heading = 'Aurelia IDE playground';\n  readonly $parent = 17;",
    );
    assert.notStrictEqual(editedTemplate, templateBaseline, "Expected the parent hover witnesses to be inserted.");
    assert.notStrictEqual(editedComponent, componentBaseline, "Expected the $parent member witness to be inserted.");

    try {
      await replaceDocumentTexts([
        [componentDocument, editedComponent],
        [templateDocument, editedTemplate],
      ]);
      await waitFor(
        async () => (await hoverMarkdown(templateDocument, "data-hover-parent>", "$parent"))
          === parentContextHoverMarkdown,
        "the repeat parent binding context should reach the native hover provider",
        120_000,
      );
      await waitFor(
        async () => (await hoverMarkdown(templateDocument, "data-hover-parent-member>", "$parent"))
          === parentNamedMemberHoverMarkdown,
        "the in-memory component member named $parent should reach the native hover provider",
        120_000,
      );

      for (const [anchor, expectedMarkdown, label] of [
        ["data-hover-parent>", parentContextHoverMarkdown, "repeat parent binding context"],
        ["data-hover-missing-parent>", missingParentContextHoverMarkdown, "unreachable root parent context"],
        ["data-hover-parent-member>", parentNamedMemberHoverMarkdown, "component member named $parent"],
      ]) {
        const hovers = await hoversAt(templateDocument, anchor, "$parent");
        assert.strictEqual(
          hovers.length,
          1,
          `Expected exactly one ${label} hover with no native duplication; observed ${JSON.stringify(hovers.map(hoverMarkdownText))}.`,
        );
        await exactHoverAt(templateDocument, anchor, "$parent", expectedMarkdown);
      }
      assert(!parentNamedMemberHoverMarkdown.includes("binding context"));
      assert.strictEqual(readFileSync(templateDocument.uri.fsPath, "utf8"), templateDiskBaseline);
      assert.strictEqual(readFileSync(componentDocument.uri.fsPath, "utf8"), componentDiskBaseline);
    } finally {
      for (const [document, diskBaseline, label] of [
        [componentDocument, componentDiskBaseline, "component"],
        [templateDocument, templateDiskBaseline, "template"],
      ]) {
        if (document.getText() !== diskBaseline || document.isDirty) {
          await vscode.window.showTextDocument(document, { preview: false });
          await vscode.commands.executeCommand("workbench.action.files.revert");
          await waitFor(
            () => document.getText() === diskBaseline && !document.isDirty,
            `the parent-hover ${label} should revert to its clean disk baseline`,
            60_000,
          );
        }
      }
      await waitFor(
        async () => !templateDocument.isClosed
          && !componentDocument.isClosed
          && templateDocument.getText() === templateBaseline
          && componentDocument.getText() === componentBaseline
          && !templateDocument.isDirty
          && !componentDocument.isDirty
          && (await hoverMarkdown(templateDocument, "state.searchText", "searchText")) === memberHoverMarkdown,
        "the parent-hover cleanup should restore the checked-in component and template",
        120_000,
      );
      assert.strictEqual(readFileSync(templateDocument.uri.fsPath, "utf8"), templateDiskBaseline);
      assert.strictEqual(readFileSync(componentDocument.uri.fsPath, "utf8"), componentDiskBaseline);
    }
  });

  test("projects current member documentation and deprecation from the dirty buffer", async function() {
    this.timeout(600_000);
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const componentDocument = await showAureliaDocument("src/my-app.ts");
    const templateDiskBaseline = readFileSync(templateDocument.uri.fsPath, "utf8");
    const componentDiskBaseline = readFileSync(componentDocument.uri.fsPath, "utf8");
    const templateBaseline = templateDocument.getText();
    const componentBaseline = componentDocument.getText();
    assert.strictEqual(templateBaseline, templateDiskBaseline, "the documented-member journey requires a disk-equal template");
    assert.strictEqual(componentBaseline, componentDiskBaseline, "the documented-member journey requires a disk-equal component");
    assert.strictEqual(templateDocument.isDirty, false, "the documented-member journey requires a clean template");
    assert.strictEqual(componentDocument.isDirty, false, "the documented-member journey requires a clean component");

    const editedTemplate = templateBaseline.replace(
      "  </main>",
      "    <p data-hover-member-docs>${legacyCatalogStatus}</p>\n  </main>",
    );
    const legacyDeclaration = [
      "  /**",
      "   * Legacy catalog status shown at https://example.test/status.",
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
    const legacyComponent = componentBaseline.replace(
      "  readonly heading = 'Aurelia IDE playground';",
      `  readonly heading = 'Aurelia IDE playground';\n${legacyDeclaration}`,
    );
    const currentComponent = componentBaseline.replace(
      "  readonly heading = 'Aurelia IDE playground';",
      `  readonly heading = 'Aurelia IDE playground';\n${currentDeclaration}`,
    );
    assert.notStrictEqual(editedTemplate, templateBaseline, "Expected the documented member usage to be inserted.");
    assert.notStrictEqual(legacyComponent, componentBaseline, "Expected the deprecated documented member to be inserted.");
    assert.notStrictEqual(currentComponent, legacyComponent, "Expected the dirty-buffer member documentation mutation.");

    try {
      await replaceDocumentTexts([
        [componentDocument, legacyComponent],
        [templateDocument, editedTemplate],
      ]);
      await waitFor(
        async () => (await hoverMarkdown(templateDocument, "data-hover-member-docs>", "legacyCatalogStatus"))
          === legacyDocumentedMemberHoverMarkdown,
        "the deprecated documented member should reach the native hover provider",
        120_000,
      );
      assert.strictEqual(componentDocument.isDirty, true, "the legacy documented member must remain unsaved");
      assert.strictEqual(templateDocument.isDirty, true, "the documented member usage must remain unsaved");
      let hovers = await hoversAt(templateDocument, "data-hover-member-docs>", "legacyCatalogStatus");
      assert.strictEqual(
        hovers.length,
        1,
        `Expected one documented member hover with no native duplication; observed ${JSON.stringify(hovers.map(hoverMarkdownText))}.`,
      );
      await exactHoverAt(
        templateDocument,
        "data-hover-member-docs>",
        "legacyCatalogStatus",
        legacyDocumentedMemberHoverMarkdown,
      );
      assert(legacyDocumentedMemberHoverMarkdown.includes("https\\://example.test/status"));
      assert(!legacyDocumentedMemberHoverMarkdown.includes("https://example.test/status"));

      await replaceDocumentText(componentDocument, currentComponent);
      await waitFor(
        async () => (await hoverMarkdown(templateDocument, "data-hover-member-docs>", "legacyCatalogStatus"))
          === currentDocumentedMemberHoverMarkdown,
        "the unsaved member documentation mutation should replace the stale hover",
        120_000,
      );
      assert.strictEqual(componentDocument.isDirty, true, "the current documented member must remain unsaved");
      hovers = await hoversAt(templateDocument, "data-hover-member-docs>", "legacyCatalogStatus");
      assert.strictEqual(
        hovers.length,
        1,
        `Expected one current documented member hover with no native duplication; observed ${JSON.stringify(hovers.map(hoverMarkdownText))}.`,
      );
      await exactHoverAt(
        templateDocument,
        "data-hover-member-docs>",
        "legacyCatalogStatus",
        currentDocumentedMemberHoverMarkdown,
      );
      assert(!currentDocumentedMemberHoverMarkdown.includes("Deprecated"));
      assert(!currentDocumentedMemberHoverMarkdown.includes("Legacy catalog status"));
      assert.strictEqual(readFileSync(templateDocument.uri.fsPath, "utf8"), templateDiskBaseline);
      assert.strictEqual(readFileSync(componentDocument.uri.fsPath, "utf8"), componentDiskBaseline);
    } finally {
      for (const [document, diskBaseline, label] of [
        [componentDocument, componentDiskBaseline, "component"],
        [templateDocument, templateDiskBaseline, "template"],
      ]) {
        if (document.getText() !== diskBaseline || document.isDirty) {
          await vscode.window.showTextDocument(document, { preview: false });
          await vscode.commands.executeCommand("workbench.action.files.revert");
          await waitFor(
            () => document.getText() === diskBaseline && !document.isDirty,
            `the documented-member ${label} should revert to its clean disk baseline`,
            60_000,
          );
        }
      }
      await waitFor(
        async () => templateDocument.getText() === templateBaseline
          && componentDocument.getText() === componentBaseline
          && !templateDocument.isDirty
          && !componentDocument.isDirty
          && (await hoverMarkdown(templateDocument, "state.searchText", "searchText")) === memberHoverMarkdown,
        "the documented-member cleanup should restore the checked-in hover surface",
        120_000,
      );
      assert.strictEqual(readFileSync(templateDocument.uri.fsPath, "utf8"), templateDiskBaseline);
      assert.strictEqual(readFileSync(componentDocument.uri.fsPath, "utf8"), componentDiskBaseline);
    }
  });

  test("clips a long member signature and projects the bare current context", async () => {
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const componentDocument = await showAureliaDocument("src/my-app.ts");
    const templateBaseline = templateDocument.getText();
    const componentBaseline = componentDocument.getText();
    const longTypeDeclaration = [
      "  readonly hoverBudgetValue:",
      "    | 'catalogalphaselectionwithaverylongdescriptivename'",
      "    | 'catalogbetaselectionwithaverylongdescriptivename'",
      "    | 'cataloggammaselectionwithaverylongdescriptivename'",
      "    | 'catalogdeltaselectionwithaverylongdescriptivename'",
      "    | 'catalogepsilonselectionwithaverylongdescriptivename'",
      "    = 'catalogalphaselectionwithaverylongdescriptivename';",
      "",
    ].join("\n");
    const hoverMarkup = [
      "    <p>${hoverBudgetValue}</p>",
      "    <p>${$this}</p>",
      "",
    ].join("\n");
    const editedComponent = componentBaseline.replace(
      "  readonly heading = 'Aurelia IDE playground';",
      `  readonly heading = 'Aurelia IDE playground';\n${longTypeDeclaration}`,
    );
    const editedTemplate = templateBaseline.replace("  </main>", `${hoverMarkup}  </main>`);
    assert.notStrictEqual(editedComponent, componentBaseline, "Expected the long union member to be inserted.");
    assert.notStrictEqual(editedTemplate, templateBaseline, "Expected the hover budget witnesses to be inserted.");

    try {
      await replaceDocumentTexts([
        [componentDocument, editedComponent],
        [templateDocument, editedTemplate],
      ]);
      await waitFor(
        async () => (await hoverMarkdown(
          templateDocument,
          "${hoverBudgetValue}",
          "hoverBudgetValue",
        )).includes("hoverBudgetValue:"),
        "the in-memory long union member should reach the hover provider",
        60_000,
      );
      const longHovers = await hoversAt(
        templateDocument,
        "${hoverBudgetValue}",
        "hoverBudgetValue",
      );
      assert.strictEqual(
        longHovers.length,
        1,
        `Expected one long member hover; observed ${JSON.stringify(longHovers.map(hoverMarkdownText))}.`,
      );
      const longHover = longHovers[0];
      assert(longHover.range instanceof vscode.Range, "Expected the long member hover to retain its range.");
      assert.strictEqual(templateDocument.getText(longHover.range), "hoverBudgetValue");
      const longMarkdown = hoverMarkdownText(longHover);
      const longIdentity = hoverIdentityLine(longMarkdown);
      assert(
        longIdentity.startsWith("readonly hoverBudgetValue: "),
        `Expected the proved readonly signature, received ${longIdentity}.`,
      );
      assert(longIdentity.endsWith("…"), `Expected clipped long union identity, received ${longIdentity}.`);
      assert(Array.from("hoverBudgetValue").length <= 80);
      assert(Array.from(longIdentity).length <= 160);
      assert(!longIdentity.includes("catalogepsilonselectionwithaverylongdescriptivename"));
      assertBoundedHoverCard(longMarkdown, "long union member");

      await exactHoverAt(
        templateDocument,
        "${$this}",
        "$this",
        currentContextHoverMarkdown,
      );
    } finally {
      if (
        componentDocument.getText() !== componentBaseline
        || templateDocument.getText() !== templateBaseline
      ) {
        await replaceDocumentTexts([
          [componentDocument, componentBaseline],
          [templateDocument, templateBaseline],
        ]);
      }
      await waitFor(
        async () => (await hoverMarkdown(templateDocument, "state.searchText", "searchText"))
          === memberHoverMarkdown,
        "hover budget witness cleanup should restore the checked-in component and template",
        60_000,
      );
    }
  });

  test("projects exact, open, and refused route hovers through the admitted router root", async () => {
    const document = await showAureliaDocument("src/app.html", routedAureliaWorkspace);
    await waitFor(
      async () => (await hoverMarkdown(document, 'load="items"', "items"))
        === staticRoutePathHoverMarkdown,
      "the routed workspace should answer its exact static path hover",
      60_000,
    );
    await exactHoverAt(
      document,
      'load="items"',
      "items",
      staticRoutePathHoverMarkdown,
    );
    await exactHoverAt(
      document,
      'load="items/item-1?ref=featured#details"',
      "item-1",
      parameterizedRoutePathHoverMarkdown,
      "items/item-1",
    );
    await noHoverAt(document, 'load="items/item-1?ref=featured#details"', "ref");
    await noHoverAt(document, 'load="items/item-1?ref=featured#details"', "details");

    const appDocument = await showAureliaDocument("src/app.ts", routedAureliaWorkspace);
    const templateBaseline = document.getText();
    const appBaseline = appDocument.getText();
    const routeMarkup = [
      '      <a load="route.bind: \'item-detail\'; params.bind: { itemId: \'item-1\' }">Detail by id</a>',
      '      <a load="route: item-detail; context.bind: alternateContext; params.bind: { itemId: \'item-1\' }">Open detail</a>',
      "",
    ].join("\n");
    const editedTemplate = templateBaseline.replace("    </nav>", `${routeMarkup}    </nav>`);
    const editedApp = appBaseline.replace(
      "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');",
      "  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');\n  alternateContext!: unknown;",
    );
    assert.notStrictEqual(editedTemplate, templateBaseline, "Expected route witnesses to be inserted.");
    assert.notStrictEqual(editedApp, appBaseline, "Expected the open route context to be inserted.");

    try {
      await replaceDocumentTexts([
        [appDocument, editedApp],
        [document, editedTemplate],
      ]);
      await waitFor(
        async () => (await hoverMarkdown(
          document,
          "route.bind: 'item-detail'; params.bind:",
          "item-detail",
        )) === quotedRouteIdHoverMarkdown,
        "the in-memory literal route id should reach the native hover provider",
        60_000,
      );
      await exactHoverAt(
        document,
        "route.bind: 'item-detail'; params.bind:",
        "item-detail",
        quotedRouteIdHoverMarkdown,
        "'item-detail'",
      );
      await exactHoverAt(
        document,
        "route: item-detail; context.bind: alternateContext",
        "item-detail",
        dynamicRouteHoverMarkdown,
      );
    } finally {
      if (appDocument.getText() !== appBaseline || document.getText() !== templateBaseline) {
        await replaceDocumentTexts([
          [appDocument, appBaseline],
          [document, templateBaseline],
        ]);
      }
      await waitFor(
        async () => (await hoverMarkdown(document, 'load="items"', "items"))
          === staticRoutePathHoverMarkdown,
        "route witness cleanup should restore the checked-in routed template",
        60_000,
      );
    }
  });

  test("coexists with native HTML hover and leaves TypeScript hover to the native provider", async () => {
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const attributeDocument = await showAureliaDocument("src/attributes/display-hint.ts");
    const templateBaseline = templateDocument.getText();
    const attributeBaseline = attributeDocument.getText();
    const editedAttribute = attributeBaseline.replace(
      "  name: 'display-hint',",
      "  name: 'display-hint',\n  aliases: ['title'],",
    );
    const nativeAliasMarkup = '    <div title="Native and Aurelia">Provider coexistence</div>\n';
    const editedTemplate = templateBaseline.replace("  </main>", `${nativeAliasMarkup}  </main>`);
    assert.notStrictEqual(editedAttribute, attributeBaseline, "Expected the native-title alias to be inserted.");
    assert.notStrictEqual(editedTemplate, templateBaseline, "Expected the native-title usage to be inserted.");

    try {
      await replaceDocumentTexts([
        [attributeDocument, editedAttribute],
        [templateDocument, editedTemplate],
      ]);
      await waitFor(
        async () => (await hoversAt(
          templateDocument,
          '<div title="Native and Aurelia">',
          "title",
        )).some((hover) => hoverMarkdownText(hover) === nativeTitleAliasHoverMarkdown),
        "the source-backed title alias should join the native HTML hover result",
        60_000,
      );
      const mergedHovers = await hoversAt(
        templateDocument,
        '<div title="Native and Aurelia">',
        "title",
      );
      const aureliaHovers = mergedHovers.filter(
        (hover) => hoverMarkdownText(hover) === nativeTitleAliasHoverMarkdown,
      );
      const nativeHovers = mergedHovers.filter(
        (hover) => hoverMarkdownText(hover) !== nativeTitleAliasHoverMarkdown
          && hoverMarkdownText(hover).length > 0,
      );
      assert.strictEqual(aureliaHovers.length, 1, "Expected one Aurelia contribution at the native title locus.");
      assert(nativeHovers.length > 0, "Expected the native HTML provider to contribute at the same title locus.");
      const aureliaHover = aureliaHovers[0];
      assert(aureliaHover.range instanceof vscode.Range, "Expected the Aurelia title alias to retain its range.");
      assert.strictEqual(templateDocument.getText(aureliaHover.range), "title");
      assertBoundedHoverCard(nativeTitleAliasHoverMarkdown, "native-title resource alias");
    } finally {
      if (
        attributeDocument.getText() !== attributeBaseline
        || templateDocument.getText() !== templateBaseline
      ) {
        await replaceDocumentTexts([
          [attributeDocument, attributeBaseline],
          [templateDocument, templateBaseline],
        ]);
      }
      await waitFor(
        async () => (await hoverMarkdown(
          templateDocument,
          'display-hint="display-label.bind: preview.name',
          "display-hint",
        )).includes("(custom attribute) display-hint"),
        "native-title alias cleanup should restore the canonical custom attribute",
        60_000,
      );
    }

    const typeScriptDocument = await showAureliaDocument("src/my-app.ts");
    let nativeTypeScriptHovers = [];
    await waitFor(async () => {
      nativeTypeScriptHovers = await hoversAt(typeScriptDocument, "readonly heading", "heading");
      return nativeTypeScriptHovers.length > 0;
    }, "the native TypeScript provider should answer outside Aurelia template hover", 60_000);
    assert.strictEqual(
      nativeTypeScriptHovers.length,
      1,
      `Expected only the native TypeScript hover; observed ${JSON.stringify(nativeTypeScriptHovers.map(hoverMarkdownText))}.`,
    );
    const nativeTypeScriptMarkdown = hoverMarkdownText(nativeTypeScriptHovers[0]);
    assert.match(nativeTypeScriptMarkdown, /MyApp\.heading/u);
    assert(!nativeTypeScriptMarkdown.includes("Aurelia custom"));
    assert(!nativeTypeScriptMarkdown.includes("Repeat local."));
    assert(!nativeTypeScriptMarkdown.includes("Let local."));
    assert.notStrictEqual(nativeTypeScriptMarkdown, "```ts\nheading: string\n```");
  });

  test("preserves hover ranges and resource symbols through native editor commands", async () => {
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const memberHovers = await hoversAt(templateDocument, "state.searchText", "searchText");
    const memberHover = memberHovers.find((hover) => hoverMarkdownText(hover) === memberHoverMarkdown);
    assert(memberHover, "Expected an Aurelia member hover through the native hover provider.");
    assert(memberHover.range instanceof vscode.Range, "Expected the native hover to retain its authored range.");
    assert.strictEqual(templateDocument.getText(memberHover.range), "searchText");

    const resourceDocument = await showAureliaDocument("src/components/product-card.ts");
    let resourceDocumentSymbols = [];
    let productCardSymbol;
    await waitFor(async () => {
      resourceDocumentSymbols = await documentSymbols(resourceDocument.uri);
      productCardSymbol = resourceDocumentSymbols.find((symbol) =>
        symbol?.name === "ProductCard" && symbol?.detail === "custom-element: product-card"
      );
      return productCardSymbol != null;
    }, "the native document-symbol provider should expose the authored ProductCard resource", 60_000);
    assert.strictEqual(productCardSymbol.kind, vscode.SymbolKind.Class);
    assert(productCardSymbol.selectionRange instanceof vscode.Range);
    assert.strictEqual(resourceDocument.getText(productCardSymbol.selectionRange), "ProductCard");
    const itemSymbol = productCardSymbol.children?.find((symbol) => symbol.name === "item");
    assert(itemSymbol, "Expected the resource document symbol to retain its bindable child.");
    assert.strictEqual(itemSymbol.kind, vscode.SymbolKind.Field);
    assert(itemSymbol.selectionRange instanceof vscode.Range);
    assert.strictEqual(resourceDocument.getText(itemSymbol.selectionRange), "item");

    let productCardWorkspaceSymbol;
    await waitFor(async () => {
      const symbols = await workspaceSymbols("ProductCard");
      productCardWorkspaceSymbol = symbols.find((symbol) =>
        symbol?.name === "ProductCard"
        && symbol?.containerName === "custom-element: product-card"
        && normalize(symbol?.location?.uri?.fsPath ?? "")
          === normalize(path.join(aureliaWorkspace, "src", "components", "product-card.ts"))
      );
      return productCardWorkspaceSymbol != null;
    }, "the native workspace-symbol provider should expose the authored ProductCard resource", 60_000);
    assert.strictEqual(productCardWorkspaceSymbol.kind, vscode.SymbolKind.Class);
    assert(productCardWorkspaceSymbol.location.range instanceof vscode.Range);
    assert.strictEqual(resourceDocument.getText(productCardWorkspaceSymbol.location.range), "ProductCard");
  });

  test("opens related files through the retained topology command", async () => {
    await showAureliaDocument("src/components/product-card.html");
    await vscode.commands.executeCommand("aurelia.openRelatedFile");
    await waitFor(
      () => normalize(vscode.window.activeTextEditor?.document.uri.fsPath ?? "")
        === normalize(path.join(aureliaWorkspace, "src", "components", "product-card.ts")),
      "Open Related File should navigate from the template to its component",
    );
  });

  test("keeps binding-mode hints quiet by default and responds to the resource-scoped setting", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    const configuration = vscode.workspace.getConfiguration("aurelia.inlayHints", document.uri);
    assert.strictEqual(configuration.get("bindingMode"), false);
    assert.deepStrictEqual(await inlayHints(document.uri, range), []);

    try {
      await configuration.update("bindingMode", true, vscode.ConfigurationTarget.WorkspaceFolder);
      let enabledHints = [];
      await waitFor(async () => {
        enabledHints = await inlayHints(document.uri, range);
        return enabledHints.length > 0;
      }, "binding-mode hints should appear after enabling the workspace setting", 60_000);
      assert(enabledHints.some((hint) => String(hint.label).includes("twoWay") || String(hint.label).includes("toView")));
    } finally {
      await configuration.update("bindingMode", false, vscode.ConfigurationTarget.WorkspaceFolder);
    }
    await waitFor(
      async () => (await inlayHints(document.uri, range)).length === 0,
      "binding-mode hints should disappear after restoring the quiet default",
    );
  });

  test("splits project-config JSONC parsing from Aurelia semantic diagnostics", async () => {
    const uri = vscode.Uri.file(path.join(aureliaWorkspace, "aurelia.project.json"));
    const document = await vscode.workspace.openTextDocument(uri);
    const baseline = document.getText();
    assert.strictEqual(document.languageId, "jsonc", "The exact native config filename should use JSONC syntax.");

    try {
      await replaceDocumentText(document, '{"version":1,"unknown":true,}\n');
      let unknownPropertyDiagnostic;
      await waitFor(() => {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        unknownPropertyDiagnostic = diagnostics.length === 1 ? diagnostics[0] : undefined;
        return unknownPropertyDiagnostic?.source === "aurelia"
          && diagnosticCode(unknownPropertyDiagnostic) === "aurelia-project-config-unknown-property";
      }, "valid JSONC with an unknown config property should have one Aurelia semantic diagnostic", 60_000);
      assert.strictEqual(unknownPropertyDiagnostic.severity, vscode.DiagnosticSeverity.Error);
      assert.strictEqual(
        unknownPropertyDiagnostic.message,
        "Unknown Aurelia project configuration property 'unknown'.",
      );
      assert.strictEqual(document.getText(unknownPropertyDiagnostic.range), '"unknown"');
      assert.deepStrictEqual(unknownPropertyDiagnostic.relatedInformation ?? [], []);

      let observedProjectConfigurationDiagnostics = [];
      await replaceDocumentText(document, '{"version":1,"version":1}\n');
      await waitFor(() => {
        observedProjectConfigurationDiagnostics = vscode.languages.getDiagnostics(uri);
        return observedProjectConfigurationDiagnostics.length > 0
          && observedProjectConfigurationDiagnostics.every((diagnostic) => diagnostic.source === "jsonc");
      }, () => `duplicate JSONC properties should remain owned only by VS Code's JSONC parser; observed ${diagnosticSummary(observedProjectConfigurationDiagnostics)}`, 60_000);

      await replaceDocumentText(document, '{"version":1,,}\n');
      await waitFor(() => {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        return diagnostics.length > 0
          && diagnostics.every((diagnostic) => diagnostic.source === "jsonc");
      }, "malformed JSONC should remain owned only by VS Code's JSONC parser", 60_000);

      await replaceDocumentText(document, baseline);
      await waitFor(
        () => vscode.languages.getDiagnostics(uri).length === 0,
        "comments and trailing commas should be accepted by both config diagnostic owners",
        60_000,
      );
    } finally {
      if (document.getText() !== baseline) {
        await replaceDocumentText(document, baseline);
      }
      await waitFor(
        () => vscode.languages.getDiagnostics(uri).length === 0,
        "project-config cleanup should restore the accepted JSONC baseline",
        60_000,
      );
    }
  });

  test("publishes the default Problems policy through native diagnostics and code actions", async () => {
    const typeScriptDocument = await showAureliaDocument("src/my-app.ts");
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const typeScriptBaseline = typeScriptDocument.getText();
    const templateBaseline = templateDocument.getText();
    const headingDeclaration = "  readonly heading = 'Aurelia IDE playground';";
    const headingMarkup = "      <h1>${heading}</h1>";
    assert(typeScriptBaseline.includes(headingDeclaration));
    assert(templateBaseline.includes(headingMarkup));
    const changedTypeScript = typeScriptBaseline.replace(
      headingDeclaration,
      `${headingDeclaration}\n  readonly shellTone = 'ticket-shell';\n  readonly weakMetadata: Record<string, unknown> = {};`,
    );
    const changedTemplate = templateBaseline.replace(
      headingMarkup,
      "      <h1>${titel}</h1>\n      <p>${shellTone.label}</p>\n      <p>${weakMetadata.source}</p>",
    );

    try {
      const observationStart = extensionHostObservations.length;
      await replaceDocumentTexts([
        [typeScriptDocument, changedTypeScript],
        [templateDocument, changedTemplate],
      ]);
      const receipt = await waitForCurrentDiagnosticProviderSettlement(
        observationStart,
        templateDocument,
        "the edited template should finish one current full Aurelia diagnostic pull",
      );
      assert.strictEqual(receipt.itemCount, 2, `Expected two Aurelia primaries; receipt ${JSON.stringify(receipt)}`);

      let diagnostics = [];
      await waitFor(() => {
        diagnostics = vscode.languages.getDiagnostics(templateDocument.uri)
          .filter((diagnostic) => diagnostic.source === "aurelia");
        return diagnostics.length === 2;
      }, () => `the Problems policy journey should publish two Aurelia primaries; observed ${diagnosticSummary(vscode.languages.getDiagnostics(templateDocument.uri))}`, 120_000);

      const missingRoot = diagnosticForAuthoredText(templateDocument, diagnostics, "titel");
      assert(missingRoot, `Expected the missing root diagnostic; observed ${diagnosticSummary(diagnostics)}`);
      assert.strictEqual(diagnosticCode(missingRoot), "missing-expression-member");
      assert.strictEqual(missingRoot.severity, vscode.DiagnosticSeverity.Error);
      assert.strictEqual(
        missingRoot.message,
        'Template expression root "titel" is not available on the current binding scope.',
      );
      assert.deepStrictEqual(missingRoot.relatedInformation ?? [], []);

      const primitiveMember = diagnosticForAuthoredText(templateDocument, diagnostics, "label");
      assert(primitiveMember, `Expected the primitive-owner diagnostic; observed ${diagnosticSummary(diagnostics)}`);
      assert.strictEqual(diagnosticCode(primitiveMember), "missing-expression-member");
      assert.strictEqual(primitiveMember.severity, vscode.DiagnosticSeverity.Warning);
      assert.strictEqual(
        primitiveMember.message,
        'Member "label" is not projected on the owner type, so semantic tooling cannot validate or navigate it.',
      );
      assert.strictEqual(primitiveMember.relatedInformation?.length, 1);
      const checkerEvidence = primitiveMember.relatedInformation[0];
      assert.strictEqual(
        checkerEvidence.message,
        "TS2339: Property 'label' does not exist on type 'string'.",
      );
      assert.strictEqual(checkerEvidence.location.uri.toString(), templateDocument.uri.toString());
      assert.strictEqual(templateDocument.getText(checkerEvidence.location.range), "label");

      assert.strictEqual(
        diagnostics.some((diagnostic) => templateDocument.getText(diagnostic.range) === "source"),
        false,
        "The weak index-signature owner must remain withheld as a standalone Problem.",
      );
      assert.strictEqual(
        diagnostics.some((diagnostic) => diagnostic.severity === vscode.DiagnosticSeverity.Information),
        false,
        "The withheld weak-owner fact must not leak as Information.",
      );

      const primaryStatusHover = await exactHoverAt(
        templateDocument,
        "shellTone.label",
        "label",
        missingMemberDiagnosticHoverMarkdown,
      );
      assert(!hoverMarkdownText(primaryStatusHover).includes("shellTone"));
      assert(!hoverMarkdownText(primaryStatusHover).includes("Type information is incomplete"));
      const withheldWeakOwnerHover = await exactHoverAt(
        templateDocument,
        "weakMetadata.source",
        "source",
        weakOwnerIdentityHoverMarkdown,
      );
      assert(!hoverMarkdownText(withheldWeakOwnerHover).includes("Warning"));
      assert(!hoverMarkdownText(withheldWeakOwnerHover).includes("Information"));

      const missingRootRange = missingRoot.range;
      let unresolvedActions = [];
      await waitFor(async () => {
        unresolvedActions = await executeCodeActionProvider(templateDocument.uri, missingRootRange, 0);
        return unresolvedActions.some((action) => action.title === "Declare member 'titel' on MyApp");
      }, "the definite missing root should offer its conservative quick fix", 120_000);
      const unresolved = unresolvedActions.find((action) => action.title === "Declare member 'titel' on MyApp");
      assert(unresolved);
      assert.strictEqual(unresolved.kind?.value ?? unresolved.kind, vscode.CodeActionKind.QuickFix.value);
      assert.strictEqual(unresolved.isPreferred, true);
      assert.strictEqual(unresolved.edit, undefined, "The action should remain lazy until VS Code resolves it.");

      const resolvedActions = await executeCodeActionProvider(templateDocument.uri, missingRootRange, 1);
      const resolved = resolvedActions.find((action) => action.title === "Declare member 'titel' on MyApp");
      assert(resolved?.edit instanceof vscode.WorkspaceEdit, "The selected missing-root action should resolve to an edit.");
      const resolvedEntries = resolved.edit.entries();
      assert.strictEqual(resolvedEntries.length, 1);
      assert.strictEqual(resolvedEntries[0][0].toString(), typeScriptDocument.uri.toString());
      const targetNewline = typeScriptDocument.eol === vscode.EndOfLine.CRLF ? "\r\n" : "\n";
      assert.deepStrictEqual(
        resolvedEntries[0][1].map((edit) => ({ oldText: typeScriptDocument.getText(edit.range), newText: edit.newText })),
        [{ oldText: "", newText: `${targetNewline}  titel!: unknown;` }],
      );

      for (const [anchor, token] of [["shellTone.label", "label"], ["weakMetadata.source", "source"]]) {
        const position = positionIn(templateDocument, anchor, token);
        const actions = await executeCodeActionProvider(
          templateDocument.uri,
          new vscode.Range(position, position),
          1,
        );
        assert.strictEqual(
          actions.some((action) => action.edit instanceof vscode.WorkspaceEdit),
          false,
          `${token} should not offer an unproved edit-backed repair; observed ${actionSummary(actions)}.`,
        );
        assert.strictEqual(
          actions.some((action) => action.title === `Declare member '${token}' on MyApp`),
          false,
          `${token} should not offer a view-model member declaration; observed ${actionSummary(actions)}.`,
        );
      }
    } finally {
      const observationStart = extensionHostObservations.length;
      if (
        typeScriptDocument.getText() !== typeScriptBaseline
        || templateDocument.getText() !== templateBaseline
      ) {
        await replaceDocumentTexts([
          [typeScriptDocument, typeScriptBaseline],
          [templateDocument, templateBaseline],
        ]);
        const receipt = await waitForCurrentDiagnosticProviderSettlement(
          observationStart,
          templateDocument,
          "Problems policy cleanup should finish one current full Aurelia diagnostic pull",
        );
        assert.strictEqual(receipt.itemCount, 0, `Expected clean Aurelia receipt; observed ${JSON.stringify(receipt)}`);
      }
      await waitFor(
        () => !vscode.languages.getDiagnostics(templateDocument.uri)
          .some((diagnostic) => diagnostic.source === "aurelia"),
        "Problems policy cleanup should clear all Aurelia template diagnostics",
        120_000,
      );
    }
  });

  test("does not duplicate TypeScript-owned Problems through the Aurelia diagnostic provider", async () => {
    const document = await showAureliaDocument("src/my-app.ts");
    const baseline = document.getText();
    const marker = "a3RelatedInfoContract";
    const changed = `${baseline}\ninterface A3RequiredContract {\n  requiredName: string;\n}\n\nconst ${marker}: A3RequiredContract = {};\n`;

    try {
      const observationStart = extensionHostObservations.length;
      await replaceDocumentText(document, changed);
      const receipt = await waitForCurrentDiagnosticProviderSettlement(
        observationStart,
        document,
        "the TypeScript ownership canary should finish one current full Aurelia diagnostic pull",
      );
      assert.strictEqual(receipt.itemCount, 0, `Aurelia must delegate this Program diagnostic; receipt ${JSON.stringify(receipt)}`);
      let matchingDiagnostics = [];
      await waitFor(() => {
        matchingDiagnostics = vscode.languages.getDiagnostics(document.uri).filter((diagnostic) =>
          (diagnosticCode(diagnostic) === 2741 || diagnosticCode(diagnostic) === "TS2741")
          && document.getText(diagnostic.range) === marker
        );
        return matchingDiagnostics.length === 1;
      }, () => `the TS2741 ownership canary should settle through VS Code's native provider; observed ${diagnosticSummary(vscode.languages.getDiagnostics(document.uri))}`, 120_000);

      const diagnostic = matchingDiagnostics[0];
      assert.strictEqual(diagnostic.source, "ts");
      assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Error);
      assert.strictEqual(
        diagnostic.message,
        "Property 'requiredName' is missing in type '{}' but required in type 'A3RequiredContract'.",
      );
      const relatedDeclaration = diagnostic.relatedInformation?.find((information) =>
        information.location.uri.toString() === document.uri.toString()
        && document.getText(information.location.range) === "requiredName"
      );
      assert(relatedDeclaration, "Native TS2741 should retain the related required property declaration location.");
      assert.strictEqual(relatedDeclaration.message, "'requiredName' is declared here.");
    } finally {
      const observationStart = extensionHostObservations.length;
      if (document.getText() !== baseline) {
        await replaceDocumentText(document, baseline);
        const receipt = await waitForCurrentDiagnosticProviderSettlement(
          observationStart,
          document,
          "TypeScript ownership canary cleanup should finish one current full Aurelia diagnostic pull",
        );
        assert.strictEqual(receipt.itemCount, 0, `Expected clean Aurelia receipt; observed ${JSON.stringify(receipt)}`);
      }
      await waitFor(
        () => !vscode.languages.getDiagnostics(document.uri).some((diagnostic) =>
          diagnosticCode(diagnostic) === 2741 || diagnosticCode(diagnostic) === "TS2741"
        ),
        "TypeScript ownership canary cleanup should clear TS2741",
        120_000,
      );
    }
  });

  test("leaves TypeScript rename outside owned roots to VS Code's native provider", async () => {
    const uri = vscode.Uri.file(path.join(plainTypeScriptWorkspace, "src", "plain.ts"));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false });
    const offset = document.getText().indexOf("standaloneName");
    assert.notStrictEqual(offset, -1);
    const position = document.positionAt(offset + 3);

    let prepare;
    await waitFor(async () => {
      prepare = await vscode.commands.executeCommand("vscode.prepareRename", uri, position);
      return prepare != null;
    }, "the native TypeScript provider should prepare rename outside Aurelia ownership", 60_000);
    const edit = await vscode.commands.executeCommand(
      "vscode.executeDocumentRenameProvider",
      uri,
      position,
      "standaloneValue",
    );
    assert(edit instanceof vscode.WorkspaceEdit, "Expected the native TypeScript rename WorkspaceEdit.");
    const entries = edit.entries();
    assert(entries.length > 0);
    assert(entries.every(([entryUri]) => normalize(entryUri.fsPath).startsWith(normalize(plainTypeScriptWorkspace))));
    assert(entries.flatMap(([, edits]) => edits).every((entry) => entry.newText === "standaloneValue"));
  });

  test("hard-excludes a nested workspace folder configured off", async () => {
    const uri = vscode.Uri.file(path.join(excludedAureliaWorkspace, "src", "excluded-view.html"));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: false });
    const position = positionIn(document, "excludedMessage");

    const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", uri, position);
    const definitions = await vscode.commands.executeCommand("vscode.executeDefinitionProvider", uri, position);
    assert.deepStrictEqual(hovers ?? [], []);
    assert.deepStrictEqual(definitions ?? [], []);
  });

  test("retires and re-admits the primary Aurelia root without disturbing the secondary root", async function() {
    this.timeout(600_000);
    let document = await showAureliaDocument("src/my-app.html");
    const documentUri = document.uri;
    document = await waitForExactDocumentLanguage(
      vscode.workspace,
      documentUri,
      "html",
      "the primary template should start in default native HTML mode",
      waitFor,
    );
    const originalFolders = [...(vscode.workspace.workspaceFolders ?? [])]
      .map((folder) => ({ uri: folder.uri, name: folder.name }));
    let secondaryDocument;

    try {
      assert(!findWorkspaceFolder(secondaryAureliaWorkspace), "Expected the secondary root to start outside the workspace.");
      const secondaryInsertAt = vscode.workspace.workspaceFolders?.length ?? 0;
      await applyWorkspaceFolderUpdate(
        secondaryInsertAt,
        0,
        [{ uri: vscode.Uri.file(secondaryAureliaWorkspace), name: "hello-world-secondary" }],
        "adding the secondary Aurelia root",
      );
      await waitFor(
        () => findWorkspaceFolder(secondaryAureliaWorkspace) != null,
        "adding the secondary Aurelia root should update the workspace",
      );

      secondaryDocument = await showAureliaDocument("src/my-app.html", secondaryAureliaWorkspace);
      secondaryDocument = await waitForExactDocumentLanguage(
        vscode.workspace,
        secondaryDocument.uri,
        "html",
        "the secondary template in default native HTML mode",
        waitFor,
      );
      await waitForWorkspaceAnswer(
        document,
        aureliaWorkspace,
        "the primary Aurelia root should keep answering after admitting the secondary root",
      );
      await waitForWorkspaceAnswer(
        secondaryDocument,
        secondaryAureliaWorkspace,
        "the admitted secondary Aurelia root should answer independently",
      );

      const primaryFolder = findWorkspaceFolder(aureliaWorkspace);
      assert(primaryFolder, "Expected the primary Aurelia workspace folder before retirement.");
      await applyWorkspaceFolderUpdate(
        primaryFolder.index,
        1,
        [],
        "removing the primary Aurelia root",
      );
      await waitFor(
        () => findWorkspaceFolder(aureliaWorkspace) == null,
        "removing the primary Aurelia root should update the workspace",
      );
      document = await waitForExactDocumentLanguage(
        vscode.workspace,
        documentUri,
        "html",
        "retiring the owning session should retain default native HTML mode",
        waitFor,
      );
      await waitFor(
        async () => !(await hoverMarkdown(document, "<product-card", "product-card"))
          .includes("<product-card>"),
        "removing the primary Aurelia root should retire its editor providers",
        60_000,
      );
      await waitFor(
        () => hasExactNativeInterpolationDiagnostics(document.uri),
        () => `retired ordinary HTML should retain its native CSS diagnostic; observed ${diagnosticSummary(vscode.languages.getDiagnostics(document.uri))}`,
        60_000,
      );
      await waitForWorkspaceAnswer(
        secondaryDocument,
        secondaryAureliaWorkspace,
        "retiring the primary root should not disturb the secondary root",
      );

      const primaryInsertAt = originalFolders.findIndex((folder) =>
        normalize(folder.uri.fsPath) === normalize(aureliaWorkspace)
      );
      assert(primaryInsertAt >= 0, "Expected the primary root in the authenticated initial topology.");
      await applyWorkspaceFolderUpdate(
        primaryInsertAt,
        0,
        [{ uri: vscode.Uri.file(aureliaWorkspace), name: "hello-world" }],
        "restoring the primary Aurelia root at its authenticated ordinal",
      );
      await waitFor(
        () => findWorkspaceFolder(aureliaWorkspace) != null,
        "restoring the primary Aurelia root should update the workspace",
      );
      assert.deepStrictEqual(
        (vscode.workspace.workspaceFolders ?? []).map((folder) => normalize(folder.uri.fsPath)),
        [...originalFolders.map((folder) => normalize(folder.uri.fsPath)), normalize(secondaryAureliaWorkspace)],
        "Primary re-admission must restore its exact ordinal while retaining the secondary root.",
      );
      document = await waitForExactDocumentLanguage(
        vscode.workspace,
        documentUri,
        "html",
        "re-admitted primary template in default native HTML mode",
        waitFor,
      );
      await waitForWorkspaceAnswer(
        document,
        aureliaWorkspace,
        "restoring the primary Aurelia root should re-admit its editor providers",
      );
      await waitFor(
        () => hasExactNativeInterpolationDiagnostics(document.uri),
        () => `re-admitted ownership should retain default native CSS diagnostics; language=${document.languageId}; diagnostics=${diagnosticSummary(vscode.languages.getDiagnostics(document.uri))}`,
        60_000,
      );
      await waitForWorkspaceAnswer(
        secondaryDocument,
        secondaryAureliaWorkspace,
        "re-admitting the primary root should not disturb the secondary root",
      );
      await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
    } finally {
      const currentFolders = [...(vscode.workspace.workspaceFolders ?? [])];
      if (
        currentFolders.length !== originalFolders.length
        || currentFolders.some((folder, index) =>
          normalize(folder.uri.fsPath) !== normalize(originalFolders[index].uri.fsPath)
            || folder.name !== originalFolders[index].name
        )
      ) {
        await applyWorkspaceFolderUpdate(
          0,
          currentFolders.length,
          originalFolders,
          "atomically restoring the exact initial workspace-folder topology",
        );
        await waitFor(
          () => (vscode.workspace.workspaceFolders ?? []).length === originalFolders.length
            && (vscode.workspace.workspaceFolders ?? []).every((folder, index) =>
              normalize(folder.uri.fsPath) === normalize(originalFolders[index].uri.fsPath)
                && folder.name === originalFolders[index].name
            )
            && findWorkspaceFolder(secondaryAureliaWorkspace) == null,
          "cleanup should restore exact workspace-folder membership and order",
        );
      }
      if (secondaryDocument != null) {
        secondaryDocument = await waitForExactDocumentLanguage(
          vscode.workspace,
          secondaryDocument.uri,
          "html",
          "retired secondary template cleanup",
          waitFor,
        );
        await waitFor(
          async () => !(await hoverMarkdown(secondaryDocument, "<product-card", "product-card"))
            .includes("<product-card>"),
          "removing the secondary root should retire its editor providers",
          60_000,
        );
      }
    }
  });

  test("authenticates the Resource Discovery corpus and publishes its exact product hierarchy", async function() {
    this.timeout(300_000);
    const fixture = resourceDiscoveryAcceptance.fixture;
    const originalFolders = [...(vscode.workspace.workspaceFolders ?? [])]
      .map((folder) => ({ uri: folder.uri, name: folder.name }));
    assert.deepStrictEqual(
      originalFolders.map((folder) => normalize(folder.uri.fsPath)),
      [aureliaWorkspace, routedAureliaWorkspace, excludedAureliaWorkspace, plainTypeScriptWorkspace].map(normalize),
      "Resource Discovery acceptance requires the authenticated initial workspace-folder order.",
    );

    try {
      const lifecycleBefore = await refreshResourceExplorer(
        "the authenticated composite corpus should publish before routed-workspace retirement",
        (_complete, nodes) => fixture.witnesses.headerOnlyMetadata.rows.every((row) =>
          nodes.some((node) => node.navigationResourceIdentity === row.identityKey)
        ),
      );
      await applyWorkspaceFolderUpdate(
        1,
        originalFolders.length - 1,
        [],
        "retiring every non-primary workspace folder for the sole-project hierarchy",
      );
      await waitFor(
        () => vscode.workspace.workspaceFolders?.length === 1
          && normalize(vscode.workspace.workspaceFolders[0].uri.fsPath) === normalize(aureliaWorkspace),
        "the sole-project hierarchy should retire every non-primary workspace folder",
      );
      const solePrimaryDocument = await showAureliaDocument("src/my-app.html");
      await waitForWorkspaceAnswer(
        solePrimaryDocument,
        aureliaWorkspace,
        "the retained primary session should settle after non-primary workspace retirement",
      );
      const solePublication = await refreshResourceExplorer(
        "the sole admitted project should publish without a redundant project root",
        (_complete, nodes) =>
          nodes.some(
            (node) => node.nodeKind === "kind" && node.parentId == null,
          ) && !nodes.some((node) => node.nodeKind === "project"),
      );
      const soleNodes = observationsForPublication(solePublication);
      assert(
        soleNodes.some(
          (node) => node.nodeKind === "kind" && node.parentId == null,
        ),
        `The sole-project publication must expose a root-level kind; observed ${JSON.stringify(
          soleNodes,
        )}.`,
      );
      assert(
        !soleNodes.some((node) => node.nodeKind === "project"),
        `The sole-project publication must omit redundant project roots; observed ${JSON.stringify(
          soleNodes,
        )}.`,
      );

      const quietStart = await emitResourceDiscoveryControlReset("c2-quiet-window-start");
      const quietStartIndex = extensionHostObservations.indexOf(quietStart) + 1;
      await applyWorkspaceFolderUpdate(
        1,
        0,
        [
          { uri: vscode.Uri.file(excludedAureliaWorkspace), name: "excluded-project" },
          { uri: vscode.Uri.file(plainTypeScriptWorkspace), name: "plain-typescript" },
        ],
        "adding the excluded and plain lifecycle roots",
      );
      await waitFor(
        () => (vscode.workspace.workspaceFolders ?? []).length === 3
          && (vscode.workspace.workspaceFolders ?? []).every((folder, index) =>
            normalize(folder.uri.fsPath) === normalize([
              aureliaWorkspace,
              excludedAureliaWorkspace,
              plainTypeScriptWorkspace,
            ][index])
        ),
        "excluded and plain roots should be added without admitting Aurelia sessions",
      );
      await waitFor(
        () => extensionHostObservations.slice(quietStartIndex).filter((event) =>
          event.source === "resource-explorer-view" && event.phase === "invalidation"
        ).length >= 2,
        "the nested off boundary should retire and re-admit its owning session",
        120_000,
      );
      const lifecycleEnd = await emitResourceDiscoveryControlReset("c2-lifecycle-window-end");
      const excludedDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(
        path.join(excludedAureliaWorkspace, "src", "excluded-view.html"),
      ));
      const plainDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(
        path.join(plainTypeScriptWorkspace, "src", "plain.ts"),
      ));
      await vscode.window.showTextDocument(excludedDocument, { preview: false });
      const excludedDiagnosticSettlement = await waitForCurrentDiagnosticProviderSettlement(
        quietStartIndex,
        excludedDocument,
        "the explicitly shown excluded document should settle without diagnostics",
      );
      const retainedPrimary = await showAureliaDocument("src/my-app.html");
      await waitForWorkspaceAnswer(
        retainedPrimary,
        aureliaWorkspace,
        "unadmitted additions should leave the retained primary session current",
      );
      assert.strictEqual(
        excludedDiagnosticSettlement.reportKind,
        "full",
        `The excluded document must settle through a current full diagnostic response; observed ${JSON.stringify(excludedDiagnosticSettlement)}.`,
      );
      assert.strictEqual(
        excludedDiagnosticSettlement.itemCount,
        0,
        `The excluded document must not publish Aurelia diagnostics; observed ${JSON.stringify(excludedDiagnosticSettlement)}.`,
      );
      assert.strictEqual(
        excludedDiagnosticSettlement.resultIdPresent,
        true,
        `The excluded document's empty full response must retain a result id; observed ${JSON.stringify(excludedDiagnosticSettlement)}.`,
      );
      assert.deepStrictEqual(
        await vscode.commands.executeCommand(
          "vscode.executeDefinitionProvider",
          excludedDocument.uri,
          positionIn(excludedDocument, "excludedMessage"),
        ) ?? [],
        [],
      );
      await waitFor(
        () => !vscode.languages.getDiagnostics(excludedDocument.uri)
          .some((diagnostic) => diagnostic.source === "aurelia"),
        () => `the excluded document should retain no Aurelia diagnostics; observed ${diagnosticSummary(vscode.languages.getDiagnostics(excludedDocument.uri))}`,
        60_000,
      );
      const quietEnd = await emitResourceDiscoveryControlReset("c2-quiet-window-end");
      const quietEvents = extensionHostObservations.slice(
        quietStartIndex,
        extensionHostObservations.indexOf(quietEnd),
      );
      const lifecycleEvents = extensionHostObservations.slice(
        quietStartIndex,
        extensionHostObservations.indexOf(lifecycleEnd),
      );
      const lifecycleInvalidations = lifecycleEvents.filter((event) =>
        event.source === "resource-explorer-view" && event.phase === "invalidation"
      );
      assert.strictEqual(
        lifecycleInvalidations.length,
        2,
        `The nested off boundary must retire and re-admit its owning session exactly once; `
          + `observed ${lifecycleInvalidations.length} invalidations ${JSON.stringify(lifecycleInvalidations)} `
          + `across ${lifecycleEvents.length} lifecycle-window events.`,
      );
      const lifecycleObservationId = lifecycleInvalidations[0].observationId;
      assert.match(lifecycleObservationId, /^resource-explorer-view:\d+$/u);
      assert.deepStrictEqual(
        lifecycleInvalidations.map((event) => ({
          source: event.source,
          observationId: event.observationId,
          phase: event.phase,
          scope: event.scope,
          force: event.force,
          workspaceKey: event.workspaceKey ?? null,
        })),
        [0, 1].map(() => ({
          source: "resource-explorer-view",
          observationId: lifecycleObservationId,
          phase: "invalidation",
          scope: "all",
          force: false,
          workspaceKey: null,
        })),
        "The exclusion-boundary replacement may only schedule its safe, non-forced aggregate lifecycle refreshes.",
      );
      const unadmittedWorkspaceKeys = new Set([
        vscode.Uri.file(excludedAureliaWorkspace).toString(),
        vscode.Uri.file(plainTypeScriptWorkspace).toString(),
      ]);
      const unadmittedWorkspaceIdentities = new Set(
        [...unadmittedWorkspaceKeys].map(observedWorkspaceIdentity),
      );
      const unadmittedWorkspaceEvents = quietEvents.filter((event) =>
        typeof event.workspaceKey === "string" && unadmittedWorkspaceKeys.has(event.workspaceKey)
      );
      const unadmittedIdentityEvents = quietEvents.filter((event) => [
        event.workspaceIdentity,
        event.navigationWorkspaceIdentity,
        event.implementationWorkspaceIdentity,
      ].some((identity) => typeof identity === "string" && unadmittedWorkspaceIdentities.has(identity)));
      const plainProviderEvents = quietEvents.filter((event) =>
        event.source === "language-client-provider"
          && typeof event.uri === "string"
          && event.uri === plainDocument.uri.toString()
      );
      const excludedProviderEvents = quietEvents.filter((event) =>
        event.source === "language-client-provider"
          && typeof event.uri === "string"
          && event.uri === excludedDocument.uri.toString()
      );
      const excludedNonDiagnosticProviderEvents = excludedProviderEvents.filter((event) =>
        event.operation !== "diagnostics"
      );
      const excludedProviderSettlement = parseDiagnosticProviderSettlement(
        extensionHostObservations,
        excludedDocument.uri.toString(),
        excludedDocument.version,
        quietStartIndex,
      );
      assert.strictEqual(
        excludedProviderSettlement.error,
        null,
        `The excluded document provider tail must remain serialized and cancellation-authenticated; trace ${JSON.stringify(excludedProviderSettlement.trace)}.`,
      );
      assert(excludedProviderSettlement.settlement, "The excluded document provider tail must end in a current full response.");
      assert.strictEqual(excludedProviderSettlement.settlement.reportKind, "full");
      assert.strictEqual(excludedProviderSettlement.settlement.itemCount, 0);
      assert.strictEqual(excludedProviderSettlement.settlement.resultIdPresent, true);
      const pickerEffects = quietEvents.filter((event) => event.source === "resource-quick-pick");
      const outputEffects = quietEvents.filter((event) => event.phase === "output-requested");
      const navigationEffects = quietEvents.filter((event) => event.source === "resource-navigation");
      for (const [label, effects] of [
        ["workspace session", unadmittedWorkspaceEvents],
        ["workspace identity", unadmittedIdentityEvents],
        ["plain-root language-client provider", plainProviderEvents],
        ["excluded non-diagnostic language-client provider", excludedNonDiagnosticProviderEvents],
        ["picker", pickerEffects],
        ["output", outputEffects],
        ["navigation", navigationEffects],
      ]) {
        assert.deepStrictEqual(
          effects,
          [],
          `Unadmitted roots must cause no ${label} effects; observed ${JSON.stringify(effects)}.`,
        );
      }
      assert.strictEqual(plainDocument.languageId, "typescript");

      await applyWorkspaceFolderUpdate(
        1,
        0,
        [{ uri: vscode.Uri.file(routedAureliaWorkspace), name: "routed-catalog-storefront" }],
        "restoring the authenticated Resource Discovery root",
      );
      await waitFor(
        () => (vscode.workspace.workspaceFolders ?? []).length === originalFolders.length
          && (vscode.workspace.workspaceFolders ?? []).every((folder, index) =>
            normalize(folder.uri.fsPath) === normalize(originalFolders[index].uri.fsPath)
          ),
        "the authenticated Resource Discovery root should be restored",
      );
      await awaitRoutedSemanticReadinessAndExplorerPublication(
        "the restored Resource Discovery root should regain routed semantic and Explorer readiness",
      );
      const publication = await refreshResourceExplorer(
        "the authenticated composite corpus should publish a coherent current tree",
        (_complete, nodes) => fixture.witnesses.headerOnlyMetadata.rows.every((row) =>
          nodes.some((node) => node.navigationResourceIdentity === row.identityKey)
        ),
      );
      const nodes = observationsForPublication(publication);
      assert.strictEqual(nodes.length, publication.nodeCount);
      assert.strictEqual(nodes.filter((node) => node.parentId == null).length, publication.rootCount);
      const observedNodeIds = new Set();
      for (const [ordinal, node] of nodes.entries()) {
        assert.strictEqual(node.ordinal, ordinal, `Tree node ordinal ${ordinal} must be contiguous.`);
        assert.match(node.nodeId, /^tree-node:[a-f0-9]{64}$/u);
        assert(!observedNodeIds.has(node.nodeId), `Tree node ID ${node.nodeId} must be unique.`);
        if (node.parentId != null) {
          assert(observedNodeIds.has(node.parentId), `Tree parent ${node.parentId} must precede its child.`);
        }
        observedNodeIds.add(node.nodeId);
      }
      resourceDiscoveryEvidence.baselinePublication = publication;
      resourceDiscoveryEvidence.baselineNodes = nodes;
      resourceDiscoveryEvidence.solePublication = solePublication;
      resourceDiscoveryEvidence.facts.tree.baseline = {
        published: publication,
        generation: publication.generation,
        fingerprint: publication.fingerprint,
        nodeCount: publication.nodeCount,
        rootCount: publication.rootCount,
      };
      resourceDiscoveryEvidence.facts.tree.lifecycle = {
        quietWindow: {
          start: quietStart,
          end: quietEnd,
          plainWorkspaceEventCount: quietEvents.filter((event) =>
            typeof event.workspaceKey === "string"
              && normalizeFileWorkspaceKey(event.workspaceKey) === normalize(plainTypeScriptWorkspace)
          ).length,
          excludedWorkspaceEventCount: quietEvents.filter((event) =>
            typeof event.workspaceKey === "string"
              && normalizeFileWorkspaceKey(event.workspaceKey) === normalize(excludedAureliaWorkspace)
          ).length,
          pickerEventCount: quietEvents.filter((event) => event.source === "resource-quick-pick").length,
          outputRequestCount: quietEvents.filter((event) => event.phase === "output-requested").length,
          navigationOpenCount: quietEvents.filter((event) =>
            event.source === "resource-navigation" && event.phase === "opened"
          ).length,
        },
        retirement: {
          before: lifecycleBefore,
          after: solePublication,
          retiredResourcePublishCount: soleNodes.filter((node) =>
            executableFixtureResourceIdentities(fixture).has(node.navigationResourceIdentity)
          ).length,
          retainedResourceCount: soleNodes.filter((node) => node.nodeKind === "resource").length,
        },
      };
      for (const field of [
        "plainWorkspaceEventCount",
        "excludedWorkspaceEventCount",
        "pickerEventCount",
        "outputRequestCount",
        "navigationOpenCount",
      ]) {
        assert.strictEqual(
          resourceDiscoveryEvidence.facts.tree.lifecycle.quietWindow[field],
          0,
          `Quiet lifecycle field ${field} must remain zero.`,
        );
      }
      assert.strictEqual(
        resourceDiscoveryEvidence.facts.tree.lifecycle.retirement.retiredResourcePublishCount,
        0,
      );
      assert(resourceDiscoveryEvidence.facts.tree.lifecycle.retirement.retainedResourceCount > 0);

      const projectNodes = nodes.filter((node) => node.nodeKind === "project");
      assert(projectNodes.length >= fixture.projects.length);
      const descendantsOf = (ancestorId) => {
        const admitted = new Set([ancestorId]);
        return nodes.filter((node) => {
          if (!admitted.has(node.parentId)) return false;
          admitted.add(node.nodeId);
          return true;
        });
      };
      for (const project of fixture.projects) {
        const matches = projectNodes.filter((node) => node.label.split(" · ").includes(project.projectKey));
        assert.strictEqual(matches.length, 1, `Expected one project root for ${project.projectKey}.`);
        const projectNode = matches[0];
        const witness = project.projectKey === fixture.witnesses.guardrail.projectKey
          ? fixture.witnesses.guardrail
          : project.projectKey === fixture.witnesses.openCoverage.projectKey
            ? fixture.witnesses.openCoverage
            : null;
        assert.strictEqual(projectNode.answerResult, "answered");
        assert.strictEqual(projectNode.answerCoverage, witness?.coverage ?? "complete");
        assert(Number.isInteger(projectNode.answerRowCount) && projectNode.answerRowCount > 0);
        if (witness != null) assert.strictEqual(projectNode.answerRowCount, witness.rowCount);
        if (project.projectKey === "host-alpha" && resourceDiscoveryAcceptance.versionLane === "current-stable") {
          assert.strictEqual(projectNode.answerRowCount, fixture.witnesses.pageDrain.rowCount);
        }
        const resources = descendantsOf(projectNode.nodeId).filter((node) => node.nodeKind === "resource");
        assert.strictEqual(resources.length, projectNode.answerRowCount);
        for (const resource of resources) {
          assert.strictEqual(resource.answerResult, projectNode.answerResult);
          assert.strictEqual(resource.answerCoverage, projectNode.answerCoverage);
          assert.strictEqual(resource.answerRowCount, projectNode.answerRowCount);
        }
      }
      const alphaProject = projectNodes.find((node) => node.label.includes("host-alpha"));
      assert(alphaProject, "Expected the host-alpha project root.");
      const kindNodes = nodes.filter((node) => node.nodeKind === "kind" && node.parentId === alphaProject.nodeId);
      assert.deepStrictEqual(
        kindNodes.map((node) => node.label.replace(/ \(\d+\)$/u, "")),
        ["Elements", "Template Controllers", "Attributes", "Value Converters", "Binding Behaviors"],
      );
      assert(kindNodes.every((node) => /\([1-9]\d*\)$/u.test(node.label)), "Kind groups must be nonempty.");

      const exactResourceNode = (identityKey, projectKey = null) => {
        const matches = nodes.filter((node) =>
          node.nodeKind === "resource"
            && node.navigationResourceIdentity === identityKey
            && (projectKey == null || node.navigationProjectKey === projectKey)
        );
        assert.strictEqual(
          matches.length,
          1,
          `Expected one tree resource ${projectKey == null ? "" : `${projectKey}/`}${identityKey}.`,
        );
        return matches[0];
      };
      const headerOnlyPublished = fixture.witnesses.headerOnlyMetadata.rows.map((row) => ({
        identityKey: row.identityKey,
        published: exactResourceNode(row.identityKey, "host-alpha"),
      }));
      for (const receipt of headerOnlyPublished) {
        assert(receipt.published.rowStates.split("|").includes("metadata-incomplete"));
      }
      const openApp = exactResourceNode(
        fixture.witnesses.openCoverage.appRow.identityKey,
        fixture.witnesses.openCoverage.projectKey,
      );
      const guardrailApp = exactResourceNode(
        fixture.witnesses.guardrail.appRow.identityKey,
        fixture.witnesses.guardrail.projectKey,
      );
      assert(openApp.rowStates.split("|").includes("discovery-incomplete"));
      assert(guardrailApp.rowStates.split("|").includes("discovery-incomplete"));
      const pathlessWitness = fixture.witnesses.pathlessFramework;
      const expectedPathlessNodeId = resourceTreeNodeId(
        resourceDiscoveryAcceptance.workspaceKey,
        pathlessWitness.projectKey,
        pathlessWitness.identityKey,
      );
      const pathlessCandidates = nodes.filter((node) =>
        node.nodeKind === "resource"
          && node.label === pathlessWitness.name
          && node.command == null
          && node.navigationResourceIdentity == null
          && node.implementationAvailable === false
      );
      assert(
        pathlessCandidates.length > 1,
        "The composite baseline must retain the cross-workspace pathless repeat collision regression.",
      );
      const pathlessMatches = pathlessCandidates.filter((node) => node.nodeId === expectedPathlessNodeId);
      assert.strictEqual(pathlessMatches.length, 1, "Expected one exact host-alpha pathless framework node.");
      const [pathless] = pathlessMatches;
      assert(pathless, "Expected the exact nonnavigable framework row.");
      assert(pathless.rowStates.split("|").includes("non-navigable"));
      assert(pathless.accessibilityLabel.includes("framework"));
      assert(pathless.accessibilityLabel.includes(pathlessWitness.packageName));
      assert.strictEqual(
        pathless.nodeId,
        `tree-node:${sha256Bytes(Buffer.from(
          `workspace:${resourceDiscoveryAcceptance.workspaceKey}:project:${pathlessWitness.projectKey}:${pathlessWitness.identityKey}`,
          "utf8",
        ))}`,
      );

      for (const row of fixture.witnesses.localTemplateAndBindables.rows) {
        const resource = exactResourceNode(row.identityKey, "host-alpha");
        for (const bindable of row.bindables) {
          assert(nodes.some((node) =>
            node.nodeKind === "bindable"
              && node.parentId === resource.nodeId
              && node.navigationChildIdentity === bindable.identityKey
              && node.navigationRole === "bindable"
          ), `Expected bindable ${bindable.identityKey}.`);
        }
      }
      for (const alias of fixture.witnesses.aliasAndCrossKindCollisions.aliases) {
        const owner = exactResourceNode(
          alias.resourceIdentityKey,
          fixture.witnesses.aliasAndCrossKindCollisions.projectKey,
        );
        const aliasNodes = nodes.filter((node) =>
          node.nodeKind === "alias"
            && node.parentId === owner.nodeId
            && node.navigationChildIdentity === alias.aliasIdentityKey
            && node.navigationRole === "alias"
        );
        assert.strictEqual(aliasNodes.length, 1, `Expected alias ${alias.aliasIdentityKey}.`);
        assert.strictEqual(aliasNodes[0].label, alias.aliasName);
      }
      for (const collection of ["sameKindRows", "crossKindRows"]) {
        for (const row of fixture.witnesses.aliasAndCrossKindCollisions[collection]) {
          exactResourceNode(row.identityKey, fixture.witnesses.aliasAndCrossKindCollisions.projectKey);
        }
      }

      const duplicateNodes = fixture.witnesses.longSuffixDuplicates.rows.map((row) =>
        exactResourceNode(row.identityKey, fixture.witnesses.longSuffixDuplicates.projectKey)
      );
      assert(duplicateNodes.every((node) => node.label === fixture.witnesses.longSuffixDuplicates.name));
      assert.notStrictEqual(duplicateNodes[0].description, duplicateNodes[1].description);
      assert.notStrictEqual(duplicateNodes[0].accessibilityLabel, duplicateNodes[1].accessibilityLabel);
      for (const [index, node] of duplicateNodes.entries()) {
        const scent = fixture.witnesses.longSuffixDuplicates.rows[index].shortestUniqueSuffix;
        assert(node.description.includes(scent));
        assert(node.accessibilityLabel.includes(scent));
      }
      for (const [rows, projectKey] of [
        [fixture.witnesses.localTemplateAndBindables.rows.filter((row) => row.name === "local-chip"), "host-alpha"],
        [
          fixture.witnesses.aliasAndCrossKindCollisions.sameKindRows,
          fixture.witnesses.aliasAndCrossKindCollisions.projectKey,
        ],
        [
          fixture.witnesses.aliasAndCrossKindCollisions.crossKindRows,
          fixture.witnesses.aliasAndCrossKindCollisions.projectKey,
        ],
      ]) {
        const groups = new Map();
        for (const row of rows) groups.set(row.name, [...(groups.get(row.name) ?? []), row]);
        for (const group of groups.values()) {
          if (group.length < 2) continue;
          const groupNodes = group.map((row) => exactResourceNode(row.identityKey, projectKey));
          assert.strictEqual(new Set(groupNodes.map((node) => node.description)).size, groupNodes.length);
          assert.strictEqual(new Set(groupNodes.map((node) => node.accessibilityLabel)).size, groupNodes.length);
        }
      }
      if (resourceDiscoveryAcceptance.versionLane === "current-stable") {
        for (const row of fixture.witnesses.packageOrigins.rows) {
          const node = exactResourceNode(row.identityKey, "host-alpha");
          for (const token of [row.originKind, row.packageName].filter((value) => value != null)) {
            assert(node.accessibilityLabel.includes(token));
          }
        }
      }

      resourceDiscoveryEvidence.duplicateNodes = duplicateNodes;
      resourceDiscoveryEvidence.facts.tree.headerOnlyPublished = headerOnlyPublished;
      resourceDiscoveryEvidence.facts.tree.openCoverage = {
        projectKey: fixture.witnesses.openCoverage.projectKey,
        inventoryCoverage: fixture.witnesses.openCoverage.coverage,
        inventoryRowCount: fixture.witnesses.openCoverage.rowCount,
        unresolvedModules: fixture.witnesses.openCoverage.completeness.unresolvedModules,
        availabilityCoverage: fixture.witnesses.openCoverage.availability.coverage,
        availabilityRowCount: fixture.witnesses.openCoverage.availability.rowCount,
        appPublished: openApp,
      };
      resourceDiscoveryEvidence.facts.tree.guardrail = {
        projectKey: fixture.witnesses.guardrail.projectKey,
        coverage: fixture.witnesses.guardrail.coverage,
        rowCount: fixture.witnesses.guardrail.rowCount,
        appPublished: guardrailApp,
        excludedDefinitionPublishCount: nodes.filter((node) =>
          node.label === fixture.witnesses.guardrail.excludedDefinitionName
        ).length,
      };
      assert.strictEqual(
        resourceDiscoveryEvidence.facts.tree.guardrail.excludedDefinitionPublishCount,
        0,
        "The exact over-limit custom element must not be published.",
      );
      resourceDiscoveryEvidence.facts.navigation.pathless = {
        identityKey: fixture.witnesses.pathlessFramework.identityKey,
        originKind: fixture.witnesses.pathlessFramework.originKind,
        packageName: fixture.witnesses.pathlessFramework.packageName,
        published: pathless,
      };
      if (resourceDiscoveryAcceptance.versionLane === "current-stable") {
        const page = fixture.witnesses.pageDrain;
        const first = exactResourceNode(page.first.identityKey, page.projectKey);
        const last = exactResourceNode(page.last.identityKey, page.projectKey);
        resourceDiscoveryEvidence.facts.tree.pageDrain = {
          projectKey: page.projectKey,
          rowCount: page.rowCount,
          pageSize: page.pageSize,
          pageRequestCount: page.pageRequestCount,
          firstIdentityKey: page.first.identityKey,
          lastIdentityKey: page.last.identityKey,
          firstPublished: first,
          lastPublished: last,
        };
      }
    } finally {
      const current = [...(vscode.workspace.workspaceFolders ?? [])];
      if (
        current.length !== originalFolders.length
        || current.some((folder, index) => normalize(folder.uri.fsPath) !== normalize(originalFolders[index].uri.fsPath))
      ) {
        await applyWorkspaceFolderUpdate(
          0,
          current.length,
          originalFolders,
          "restoring the Resource Discovery hierarchy workspace topology",
        );
        await waitFor(
          () => (vscode.workspace.workspaceFolders ?? []).length === originalFolders.length
            && (vscode.workspace.workspaceFolders ?? []).every((folder, index) =>
              normalize(folder.uri.fsPath) === normalize(originalFolders[index].uri.fsPath)
            ),
          "Resource Discovery hierarchy cleanup should restore workspace folders",
        );
      }
      await awaitRoutedSemanticReadinessAndExplorerPublication(
        "Resource Discovery hierarchy cleanup should restore routed semantic and Explorer readiness",
      );
    }
  });

  test("navigates the exact Resource Discovery declaration witnesses", async function() {
    this.timeout(420_000);
    const fixture = resourceDiscoveryAcceptance.fixture;
    const baselineNodes = authenticatedBaselineNodes("exact witness navigation");
    const resourceNode = (identityKey, projectKey) => {
      const matches = baselineNodes.filter((node) =>
        node.nodeKind === "resource"
          && node.navigationResourceIdentity === identityKey
          && node.navigationProjectKey === projectKey
      );
      assert.strictEqual(matches.length, 1, `Expected one baseline node for ${projectKey}/${identityKey}.`);
      return matches[0];
    };

    const longDuplicateFacts = [];
    for (const [index, row] of fixture.witnesses.longSuffixDuplicates.rows.entries()) {
      const opened = await invokeObservedTreeAction(
        "aurelia.openResourceDeclaration",
        resourceDiscoveryEvidence.duplicateNodes[index],
        "opened",
        (event) => event.resourceIdentity === row.identityKey,
      );
      assert.strictEqual(opened.role, "resource");
      longDuplicateFacts.push({
        identityKey: row.identityKey,
        relativePath: row.relativePath,
        start: row.publicName.start,
        end: row.publicName.end,
        opened,
      });
    }
    resourceDiscoveryEvidence.facts.navigation.longDuplicates = longDuplicateFacts;

    const headerRows = fixture.witnesses.headerOnlyMetadata.rows;
    const fallbackRow = headerRows[0];
    const fallbackOpened = await invokeObservedTreeAction(
      "aurelia.openResourceDeclaration",
      resourceNode(fallbackRow.identityKey, "host-alpha"),
      "opened",
      (event) => event.resourceIdentity === fallbackRow.identityKey,
    );
    assert.strictEqual(fallbackOpened.role, "resource");
    resourceDiscoveryEvidence.facts.navigation.headerOnly = {
      publishedIdentityKeys: headerRows.map((row) => row.identityKey),
      implementationSourceFallback: {
        identityKey: fallbackRow.identityKey,
        relativePath: fallbackRow.relativePath,
        start: fallbackRow.implementation.start,
        end: fallbackRow.implementation.end,
        opened: fallbackOpened,
      },
    };

    const localRow = fixture.witnesses.localTemplateAndBindables.rows[0];
    const localNode = resourceNode(localRow.identityKey, "host-alpha");
    const localOpened = await invokeObservedTreeAction(
      "aurelia.openResourceDeclaration",
      localNode,
      "opened",
      (event) => event.resourceIdentity === localRow.identityKey && event.role === "resource",
    );
    assert.strictEqual(localOpened.role, "resource");
    const bindableRow = localRow.bindables[0];
    const bindableNode = baselineNodes.find((node) =>
      node.nodeKind === "bindable"
        && node.parentId === localNode.nodeId
        && node.navigationChildIdentity === bindableRow.identityKey
    );
    assert(bindableNode, `Expected bindable node ${bindableRow.identityKey}.`);
    const bindableOpened = await invokeObservedTreeAction(
      "aurelia.openResourceDeclaration",
      bindableNode,
      "opened",
      (event) => event.childIdentity === bindableRow.identityKey,
    );
    assert.strictEqual(bindableOpened.role, "bindable");

    const aliasRow = fixture.witnesses.aliasAndCrossKindCollisions.aliases[0];
    const aliasOwner = resourceNode(
      aliasRow.resourceIdentityKey,
      fixture.witnesses.aliasAndCrossKindCollisions.projectKey,
    );
    const aliasNode = baselineNodes.find((node) =>
      node.nodeKind === "alias"
        && node.parentId === aliasOwner.nodeId
        && node.navigationChildIdentity === aliasRow.aliasIdentityKey
    );
    assert(aliasNode, `Expected alias node ${aliasRow.aliasIdentityKey}.`);
    const aliasOpened = await invokeObservedTreeAction(
      "aurelia.openResourceDeclaration",
      aliasNode,
      "opened",
      (event) => event.childIdentity === aliasRow.aliasIdentityKey,
    );
    assert.strictEqual(aliasOpened.role, "alias");

    const implementationRow = fixture.witnesses.longSuffixDuplicates.rows[0];
    const implementationOpened = await invokeObservedTreeAction(
      "aurelia.openResourceImplementation",
      resourceNode(implementationRow.identityKey, fixture.witnesses.longSuffixDuplicates.projectKey),
      "opened",
      (event) => event.resourceIdentity === implementationRow.identityKey,
    );
    assert.strictEqual(implementationOpened.role, "implementation");

    const besideRow = fixture.witnesses.longSuffixDuplicates.rows[1];
    const besideOpened = await invokeObservedTreeAction(
      "aurelia.openResourceToSide",
      resourceNode(besideRow.identityKey, fixture.witnesses.longSuffixDuplicates.projectKey),
      "opened",
      (event) => event.resourceIdentity === besideRow.identityKey,
    );
    assert.strictEqual(besideOpened.placement, "beside");
    resourceDiscoveryEvidence.facts.navigation.actions = {
      local: {
        identityKey: localRow.identityKey,
        opened: localOpened,
      },
      alias: {
        resourceIdentityKey: aliasRow.resourceIdentityKey,
        childIdentityKey: aliasRow.aliasIdentityKey,
        opened: aliasOpened,
      },
      bindable: {
        resourceIdentityKey: localRow.identityKey,
        childIdentityKey: bindableRow.identityKey,
        opened: bindableOpened,
      },
      implementation: {
        identityKey: implementationRow.identityKey,
        opened: implementationOpened,
      },
      openToSide: {
        identityKey: besideRow.identityKey,
        opened: besideOpened,
      },
    };

    if (resourceDiscoveryAcceptance.versionLane === "current-stable") {
      resourceDiscoveryEvidence.facts.navigation.packageOrigins = [];
      for (const row of fixture.witnesses.packageOrigins.rows) {
        const opened = await invokeObservedTreeAction(
          "aurelia.openResourceDeclaration",
          resourceNode(row.identityKey, "host-alpha"),
          "opened",
          (event) => event.resourceIdentity === row.identityKey,
        );
        resourceDiscoveryEvidence.facts.navigation.packageOrigins.push({
          identityKey: row.identityKey,
          relativePath: row.relativePath,
          originKind: row.originKind,
          packageName: row.packageName,
          start: row.publicName.start,
          end: row.publicName.end,
          opened,
        });
      }
    }

  });

  test("adjudicates both native Resource Discovery ambiguities and open coverage", async function() {
    this.timeout(420_000);
    const fixture = resourceDiscoveryAcceptance.fixture;
    const ambiguity = fixture.witnesses.projectTemplateAmbiguity;
    for (const project of ambiguity.projects) {
      for (const scope of project.scopes) assertAmbiguityScopeModelPartition(scope);
    }
    const ambiguityUri = vscode.Uri.file(path.join(
      routedAureliaWorkspace,
      ...ambiguity.relativePath.split("/"),
    ));
    const ambiguitySettingsSnapshot = snapshotWorkspaceFolderSettings(routedAureliaWorkspace);
    const ambiguitySuppression = vscode.workspace.getConfiguration(
      "aurelia.templateDiagnostics",
      ambiguityUri,
    );
    const originalAmbiguitySuppression = ambiguitySuppression.inspect("suppressNative")?.workspaceFolderValue;
    assert.strictEqual(templateDiagnosticsSuppressNative(ambiguityUri), false);
    const ambiguityLifecycle = observeExactDocumentLifecycle(
      vscode.workspace,
      ambiguityUri,
      "the ambiguity template ownership journey",
    );
    const churnControlUri = vscode.Uri.file(path.join(
      routedAureliaWorkspace,
      "host-corpus",
      "overlap",
      "src",
      "unadmitted-plugin-app.html",
    ));
    let churnControl = await vscode.workspace.openTextDocument(churnControlUri);
    assert.strictEqual(
      churnControl.languageId,
      "html",
      "the clean unrelated churn control should begin in native HTML mode",
    );
    const churnControlBaseline = churnControl.getText();
    const churnControlChanged = `${churnControlBaseline}\n<!-- unrelated ownership retry wave -->\n`;
    const churnLifecycle = observeExactDocumentLifecycle(
      vscode.workspace,
      churnControlUri,
      "the unrelated clean HTML churn control",
    );
    let ambiguityDocument;
    try {
      await ambiguitySuppression.update("suppressNative", true, vscode.ConfigurationTarget.WorkspaceFolder);
      await waitFor(
        () => templateDiagnosticsSuppressNative(ambiguityUri),
        "the ambiguity ownership suppression opt-in should become effective",
        60_000,
      );
      const initialAmbiguityDocument = await vscode.workspace.openTextDocument(ambiguityUri);
      assert.strictEqual(
        initialAmbiguityDocument.languageId,
        "html",
        "the fresh ambiguity template should enter the host in native HTML mode",
      );
      await vscode.window.showTextDocument(initialAmbiguityDocument, { preview: false });
      const ambiguitySettlement = waitForExactDocumentLanguage(
        vscode.workspace,
        ambiguityUri,
        "aurelia-html",
        "the admitted ambiguity template during unrelated clean HTML lifecycle churn",
        waitFor,
      );

      churnControl = await vscode.languages.setTextDocumentLanguage(churnControl, "plaintext");
      churnControl = await vscode.languages.setTextDocumentLanguage(churnControl, "html");
      await replaceDocumentText(churnControl, churnControlChanged);
      assert.strictEqual(
        exactOpenDocument(vscode.workspace, churnControlUri, "the dirty unrelated HTML churn control").getText(),
        churnControlChanged,
        "the target ownership pull must overlap one genuine unrelated HTML source-text wave",
      );
      ambiguityDocument = await ambiguitySettlement;

      assert.deepStrictEqual(
        churnLifecycle.snapshot().slice(0, 4).map(({ phase, languageId }) => ({ phase, languageId })),
        [
          { phase: "close", languageId: "html" },
          { phase: "open", languageId: "plaintext" },
          { phase: "close", languageId: "plaintext" },
          { phase: "open", languageId: "html" },
        ],
        "the control must force one genuine clean HTML authority close/open cycle while ownership settles",
      );
      assertSingleBackgroundLanguageTransition(
        ambiguityLifecycle.snapshot(),
        "the ambiguity template ownership journey under unrelated clean HTML churn",
      );
    } finally {
      churnLifecycle.dispose();
      ambiguityLifecycle.dispose();
      const currentControl = vscode.workspace.textDocuments.find((document) =>
        document.uri.toString() === churnControlUri.toString()
      );
      if (currentControl != null && currentControl.getText() !== churnControlBaseline) {
        await vscode.window.showTextDocument(currentControl, { preview: false });
        await vscode.commands.executeCommand("workbench.action.files.revert");
        await waitFor(
          () => {
            const current = vscode.workspace.textDocuments.find((document) =>
              document.uri.toString() === churnControlUri.toString()
            );
            return current != null && current.getText() === churnControlBaseline && !current.isDirty;
          },
          "the unrelated HTML ownership retry control should revert to its clean baseline",
          60_000,
        );
      }
      await ambiguitySuppression.update("suppressNative", false, vscode.ConfigurationTarget.WorkspaceFolder);
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ambiguityUri),
        "the ambiguity ownership suppression opt-out should become effective",
        60_000,
      );
      if (vscode.workspace.textDocuments.some((document) =>
        document.uri.toString() === ambiguityUri.toString()
      )) {
        ambiguityDocument = await waitForExactDocumentLanguage(
          vscode.workspace,
          ambiguityUri,
          "html",
          "the ambiguity template after bounded suppression cleanup",
          waitFor,
        );
      }
      await ambiguitySuppression.update(
        "suppressNative",
        originalAmbiguitySuppression,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ambiguityUri),
        "ambiguity suppression cleanup should restore the default effective value",
        60_000,
      );
      restoreWorkspaceFolderSettings(ambiguitySettingsSnapshot, "ambiguity suppression cleanup");
      await waitFor(
        () => !templateDiagnosticsSuppressNative(ambiguityUri),
        "ambiguity settings-byte cleanup must leave effective suppression current",
        60_000,
      );
    }
    await vscode.window.showTextDocument(ambiguityDocument, { preview: false });
    const ambiguityPosition = new vscode.Position(
      ambiguity.source.cursor.line,
      ambiguity.source.cursor.character,
    );
    assert.strictEqual(ambiguityDocument.getText().indexOf(ambiguity.source.anchor), ambiguity.source.anchorOffset);
    assert.strictEqual(sha256Bytes(Buffer.from(ambiguityDocument.getText(), "utf8")), ambiguity.source.sha256);
    vscode.window.activeTextEditor.selection = new vscode.Selection(ambiguityPosition, ambiguityPosition);

    const flow = startObservedCommand("aurelia.goToAvailableResource");
    const firstProjectModel = await waitForQuickPickModel(flow, 1);
    const selectedProject = ambiguity.projects.find((project) => project.projectKey === "host-alpha");
    assert(selectedProject, "Expected the manifest-pinned host-alpha ambiguity candidate.");
    const firstProjectOrdinal = exactQuickPickOrdinal(
      firstProjectModel,
      (item) => item.label === selectedProject.projectKey,
      "host-alpha project",
    );
    const firstProjectAccept = await acceptQuickPickOrdinal(flow, firstProjectModel, firstProjectOrdinal);
    await waitForAvailabilitySelection(
      flow,
      "project",
      1,
      (event) => event.projectKey === selectedProject.projectKey,
      extensionHostObservations.indexOf(firstProjectAccept) + 1,
    );

    const firstTemplateModel = await waitForQuickPickModel(flow, 2);
    const backStart = extensionHostObservations.length;
    void vscode.commands.executeCommand("workbench.action.quickInputBack").then(undefined, () => undefined);
    const back = await waitForExtensionHostObservation(
      backStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === firstTemplateModel.ready.observationId
        && event.phase === "back"
        && event.modelOrdinal === 2,
      "the native template model should return to project selection",
      flow.settled,
    );

    const projectModel = await waitForQuickPickModel(flow, 3);
    const projectOrdinal = exactQuickPickOrdinal(
      projectModel,
      (item) => item.label === selectedProject.projectKey,
      "host-alpha project after Back",
    );
    const projectAccept = await acceptQuickPickOrdinal(flow, projectModel, projectOrdinal);
    const projectSelection = await waitForAvailabilitySelection(
      flow,
      "project",
      3,
      (event) => event.projectKey === selectedProject.projectKey,
      extensionHostObservations.indexOf(projectAccept) + 1,
    );

    const templateModel = await waitForQuickPickModel(flow, 4);
    const qualifyingScopes = selectedProject.scopes.filter((scope) =>
      scope.mustExcludeResourceIdentityKeys.length > 0
    );
    assert.strictEqual(
      qualifyingScopes.length,
      1,
      "Expected one exact host-alpha ambiguity scope with a nonempty exclusion boundary.",
    );
    const [selectedScope] = qualifyingScopes;
    for (const excludedIdentity of selectedScope.mustExcludeResourceIdentityKeys) {
      assert(
        !selectedScope.resourceIdentityKeys.includes(excludedIdentity),
        `Selected ambiguity scope must exclude ${excludedIdentity}.`,
      );
    }
    const selectableResourceIdentities = assertAmbiguityScopeModelPartition(selectedScope);
    assert.deepStrictEqual(
      selectableResourceIdentities,
      [],
      "The selected exclusion-bearing scope must not union in a resource from another compiler context.",
    );
    assert.strictEqual(
      ambiguity.excludedAppRootIdentityKey,
      "typescript-resource:v1:5EsohJa8ZPz7ZfvI5o74H5",
      "The ambiguity witness must pin the Stage 6D app-root exclusion.",
    );
    assert(
      !selectedScope.resourceIdentityKeys.includes(ambiguity.excludedAppRootIdentityKey),
      "The selected exact scope must exclude the contextual app-root resource.",
    );
    const templateOrdinal = selectedProject.scopes.indexOf(selectedScope);
    assert(templateOrdinal >= 0, "The selected exclusion-bearing scope must retain its manifest model ordinal.");
    const templateAccept = await acceptQuickPickOrdinal(flow, templateModel, templateOrdinal);
    const templateSelection = await waitForAvailabilitySelection(
      flow,
      "template",
      4,
      (event) => event.templateScopeIdentity === selectedScope.scopeIdentityKey,
      extensionHostObservations.indexOf(templateAccept) + 1,
    );

    const resourceModel = await waitForQuickPickModel(flow, 5);
    const resourceResponse = extensionHostObservations.slice(
      extensionHostObservations.indexOf(templateSelection) + 1,
    ).find((event) => event.source === "go-to-available-resource"
      && event.observationId === resourceModel.ready.observationId
      && event.phase === "initial-request-response"
      && event.selectedTemplateScopeIdentity === selectedScope.scopeIdentityKey);
    assert(resourceResponse, "Expected the exact selected-scope semantic availability response.");
    assert(
      extensionHostObservations.indexOf(resourceResponse) < extensionHostObservations.indexOf(resourceModel.ready),
      "The all-row semantic response must precede its filtered native resource model.",
    );
    assertAvailabilityResponseObservation(resourceResponse, {
      answerCoverage: "complete",
      answerResult: "answered",
      answerSelection: "exact",
      templateCandidateCount: 1,
      count: selectedScope.selectableRowCount,
      resourceIdentitySetSha256: resourceIdentityKeysSha256(selectedScope.resourceIdentityKeys),
      selectedProjectKey: selectedProject.projectKey,
      selectedTemplateScopeIdentity: selectedScope.scopeIdentityKey,
      soleTemplateCandidateScopeIdentity: selectedScope.scopeIdentityKey,
    });
    assert.strictEqual(resourceResponse.projectSelection, "exact");
    assert.strictEqual(resourceResponse.templateSelection, "exact");
    assert.strictEqual(resourceResponse.resourceCount, selectedScope.rowCount);
    assert.strictEqual(resourceModel.ready.itemCount, selectedScope.selectableRowCount);
    assert.deepStrictEqual(resourceModel.items, [], "The exact final scope must publish a complete empty model.");
    assert.strictEqual(
      resourceModel.ready.placeholder,
      `No navigable supported resources are available to ${selectedScope.definitionName}`,
    );
    assert(resourceModel.ready.title.startsWith(`Resources available to ${selectedScope.definitionName} — `));
    assert.strictEqual(resourceModel.ready.step, 3);
    assert.strictEqual(resourceModel.ready.totalSteps, 3);
    assert.strictEqual(resourceModel.ready.buttonCount, 1, "Only Back may remain actionable in the empty exact scope.");

    const resourceCancelStart = extensionHostObservations.length;
    void vscode.commands.executeCommand("workbench.action.closeQuickOpen").then(undefined, () => undefined);
    const resourceCancelled = await waitForExtensionHostObservation(
      resourceCancelStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === resourceModel.ready.observationId
        && event.phase === "cancelled"
        && event.modelOrdinal === 5,
      "the complete empty resource model should cancel quietly",
      flow.settled,
    );
    const resourceDisposed = await waitForExtensionHostObservation(
      resourceCancelStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === resourceModel.ready.observationId
        && event.phase === "disposed"
        && event.modelOrdinal === 5,
      "the cancelled empty resource model should dispose",
      flow.settled,
    );
    await settleObservedCommand(flow, "the exact empty-scope ambiguity flow should settle after cancellation");
    const resourceCommandCancelled = extensionHostObservations.slice(resourceCancelStart).find((event) =>
      event.source === "go-to-available-resource"
        && event.observationId === resourceModel.ready.observationId
        && event.phase === "cancelled"
        && event.stage === "selection"
    );
    assert(resourceCommandCancelled, "The empty exact scope must terminate as a selection-stage cancellation.");
    const resourceTrace = extensionHostObservations.filter((event) =>
      event.observationId === resourceModel.ready.observationId
    );
    assert.strictEqual(resourceTrace.filter((event) =>
      event.source === "resource-quick-pick"
        && event.phase === "accept"
        && event.modelOrdinal === 5
    ).length, 0, "The empty exact scope must not accept a resource row.");
    assert.strictEqual(resourceTrace.filter((event) =>
      event.source === "go-to-available-resource"
        && event.phase === "availability-selection"
        && event.selectionKind === "resource"
    ).length, 0, "The empty exact scope must not select a resource.");
    const emptyModelNavigationWindow = extensionHostObservations.slice(
      extensionHostObservations.indexOf(resourceModel.ready) + 1,
      extensionHostObservations.indexOf(resourceCommandCancelled),
    );
    assert.strictEqual(emptyModelNavigationWindow.filter((event) =>
      event.source === "resource-navigation"
        && (event.phase === "start" || event.phase === "opened")
    ).length, 0, "The empty exact scope must not start or open resource navigation.");
    assert.strictEqual(resourceTrace.filter((event) =>
      event.source === "go-to-available-resource" && event.phase === "navigation-complete"
    ).length, 0, "The empty exact scope must not complete resource navigation.");
    assert(
      extensionHostObservations.indexOf(resourceResponse) < extensionHostObservations.indexOf(resourceModel.ready)
        && extensionHostObservations.indexOf(resourceModel.ready) < extensionHostObservations.indexOf(resourceCancelled)
        && extensionHostObservations.indexOf(resourceCancelled) < extensionHostObservations.indexOf(resourceDisposed)
        && extensionHostObservations.indexOf(resourceDisposed) < extensionHostObservations.indexOf(resourceCommandCancelled),
      "The exact response, empty model, picker cancellation/disposal, and command cancellation must remain ordered.",
    );

    resourceDiscoveryEvidence.facts.quickPick.projectModel = {
      ready: projectModel.ready,
      selection: projectSelection,
      modelOrdinal: 3,
      itemCount: projectModel.ready.itemCount,
      selectedProjectKey: selectedProject.projectKey,
    };
    resourceDiscoveryEvidence.facts.quickPick.templateModel = {
      ready: templateModel.ready,
      selection: templateSelection,
      modelOrdinal: 4,
      itemCount: templateModel.ready.itemCount,
      selectedTemplateScopeIdentity: selectedScope.scopeIdentityKey,
    };
    resourceDiscoveryEvidence.facts.quickPick.resourceModel = {
      ready: resourceModel.ready,
      response: resourceResponse,
      cancelled: resourceCancelled,
      disposed: resourceDisposed,
      commandCancelled: resourceCommandCancelled,
      modelOrdinal: 5,
      itemCount: resourceModel.ready.itemCount,
      excludedAppRootIdentityKey: ambiguity.excludedAppRootIdentityKey,
    };
    resourceDiscoveryEvidence.facts.quickPick.back = { event: back };

    const openDocument = await showAureliaDocument(
      fixture.witnesses.openCoverage.appRow.relativePath,
      routedAureliaWorkspace,
    );
    const openPosition = positionIn(openDocument, "<template>open</template>", "open");
    vscode.window.activeTextEditor.selection = new vscode.Selection(openPosition, openPosition);
    const openFlow = startObservedCommand("aurelia.goToAvailableResource");
    const openModel = await waitForQuickPickModel(openFlow, 1);
    const openAvailability = extensionHostObservations.slice(openFlow.start).find((event) =>
      event.source === "go-to-available-resource"
        && event.observationId === openModel.ready.observationId
        && event.phase === "initial-request-response"
    );
    assert(openAvailability, "Expected the genuine open-coverage availability response.");
    assert.strictEqual(openAvailability.projectSelection, "exact");
    assert.strictEqual(openAvailability.templateSelection, "exact");
    assert.strictEqual(openAvailability.resourceCount, fixture.witnesses.openCoverage.availability.rowCount);
    const openCancelStart = extensionHostObservations.length;
    void vscode.commands.executeCommand("workbench.action.closeQuickOpen").then(undefined, () => undefined);
    const quickPickCancel = await waitForExtensionHostObservation(
      openCancelStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === openModel.ready.observationId
        && event.phase === "cancelled",
      "the open-coverage inspection should cancel without choosing a resource",
      openFlow.settled,
    );
    await settleObservedCommand(openFlow, "the open-coverage inspection should settle after cancellation");
    resourceDiscoveryEvidence.facts.tree.openCoverage.availabilityObserved = openAvailability;
    resourceDiscoveryEvidence.facts.quickPick.cancel = { event: quickPickCancel };
  });

  test("discards a blocked predecessor tree and opens only the coherent shifted successor", async function() {
    this.timeout(420_000);
    const witness = resourceDiscoveryAcceptance.fixture.witnesses.shiftedAndRemovedNavigation;
    const shifted = witness.shifted;
    const sourcePath = resolveFixturePath(routedAureliaWorkspace, shifted.relativePath);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(sourcePath));
    const baselinePublication = await awaitRoutedSemanticReadinessAndExplorerPublication(
      "blocked predecessor navigation",
    );
    const baseline = document.getText();
    assert(!baseline.startsWith(shifted.prefix), "The shifted-navigation source must begin at its authenticated baseline.");

    const baselineNodes = observationsForPublication(baselinePublication);
    const unrelatedBefore = baselineNodes.find((node) =>
      node.nodeKind === "resource"
        && node.label === "product-card"
        && typeof node.navigationFingerprint === "string"
        && !["host-alpha", "host-beta", "host-guardrail", "host-open"].includes(node.navigationProjectKey)
    );
    assert(unrelatedBefore, "Expected an unrelated primary-workspace resource node.");

    const controlId = "c2-tree-predecessor";
    await armResourceDiscoveryControl({
      controlId,
      operation: "inventory",
      stage: "after-response",
      effect: "barrier",
      includeTypeSurfaces: true,
    });
    const predecessorText = `// predecessor resource\n${baseline}`;
    try {
      const predecessorStart = extensionHostObservations.length;
      await replaceAndSaveDocumentText(document, predecessorText);
      const invalidated = await waitForResourceDiscoveryObservation(
        predecessorStart,
        (event) => event.source === "resource-explorer-view"
          && event.phase === "invalidation"
          && event.scope === "workspace"
          && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey,
        "E1 should invalidate the exact routed workspace before publishing its retained tree",
      );
      const routedInvalidationStart = extensionHostObservations.indexOf(invalidated) + 1;
      assert(routedInvalidationStart > 0, "The exact routed E1 invalidation must belong to the observed trace.");
      const blocked = await waitForResourceDiscoveryObservation(
        routedInvalidationStart,
        (event) => event.source === "resource-discovery-host-control"
          && event.observationId === controlId
          && event.phase === "blocked",
        "the real E1 inventory response should block after response",
      );
      assert.strictEqual(blocked.operation, "inventory");
      assert.strictEqual(blocked.stage, "after-response");
      assert.strictEqual(blocked.includeTypeSurfaces, true);
      assert.strictEqual(blocked.workspaceKey, resourceDiscoveryAcceptance.workspaceKey);
      assert(typeof blocked.responseFingerprint === "string" && blocked.responseFingerprint.length > 0);
      const pendingEvidence = assertScopedStablePendingEvidence({
        observations: extensionHostObservations,
        invalidated,
        blocked,
        barrierControlId: controlId,
        blockedWorkspaceKey: resourceDiscoveryAcceptance.workspaceKey,
        label: "E1 stable pending tree",
      });

      const secondEditStart = extensionHostObservations.length;
      await replaceAndSaveDocumentText(document, `${shifted.prefix}${baseline}`);
      const successorInvalidated = await waitForResourceDiscoveryObservation(
        secondEditStart,
        (event) => event.source === "resource-explorer-view"
          && event.phase === "invalidation"
          && event.scope === "workspace"
          && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey,
        "E2 should synchronously invalidate the blocked target generation",
      );
      await waitForResourceDiscoveryObservation(
        secondEditStart,
        (event) => event.source === "resource-explorer-view"
          && event.phase === "superseded"
          && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey,
        "E2 should supersede the active E1 generation",
      );

      const released = await releaseResourceDiscoveryControl(controlId);
      const discarded = await waitForResourceDiscoveryObservation(
        secondEditStart,
        (event) => event.source === "resource-explorer"
          && event.phase === "discarded"
          && event.reason === "superseded"
          && event.fingerprint === blocked.responseFingerprint,
        "the released E1 response should be discarded rather than published",
      );
      const successor = await waitForResourceDiscoveryObservation(
        secondEditStart,
        (event) => event.source === "resource-explorer"
          && event.phase === "publish-complete"
          && event.publicationKind === "current"
          && event.generation > discarded.generation
          && typeof event.fingerprint === "string"
          && event.fingerprint !== blocked.responseFingerprint,
        "the serial drain should publish one coherent E2 successor",
      );
      const successorNodes = observationsForPublication(successor);
      const unrelatedAfter = successorNodes.find((node) => node.nodeId === unrelatedBefore.nodeId);
      assert(unrelatedAfter, "The unrelated primary resource should survive the target-only race.");
      const stableFields = [
        "parentId", "nodeId", "nodeKind", "label", "description", "accessibilityLabel",
        "contextValue", "command", "navigationWorkspaceIdentity", "navigationProjectKey",
        "navigationFingerprint", "navigationResourceIdentity", "navigationChildIdentity",
        "navigationRole", "navigationPlacement", "implementationAvailable",
        "implementationWorkspaceIdentity", "implementationProjectKey", "implementationFingerprint",
        "implementationResourceIdentity", "implementationRole", "implementationPlacement",
        "collapsible", "defaultExpanded", "rowStates",
      ];
      assert.deepStrictEqual(
        Object.fromEntries(stableFields.map((field) => [field, unrelatedAfter[field]])),
        Object.fromEntries(stableFields.map((field) => [field, unrelatedBefore[field]])),
      );

      const shiftedNode = successorNodes.find((node) =>
        node.nodeKind === "resource" && node.navigationResourceIdentity === shifted.identityKey
      );
      assert(shiftedNode, "The coherent successor should retain the shifted identity.");
      const shiftedOpened = await invokeObservedTreeAction(
        "aurelia.openResourceDeclaration",
        shiftedNode,
        "opened",
        (event) => event.resourceIdentity === shifted.identityKey,
      );
      assert.strictEqual(shiftedOpened.role, "resource");
      const latePredecessorPublishCount = extensionHostObservations.filter((event, index) =>
        index > extensionHostObservations.indexOf(successorInvalidated)
          && event.source === "resource-explorer"
          && event.phase === "publish-complete"
          && event.fingerprint === blocked.responseFingerprint
      ).length;
      assert.strictEqual(latePredecessorPublishCount, 0);

      resourceDiscoveryEvidence.facts.tree.predecessorRace = {
        pendingInvalidated: invalidated,
        blocked,
        ...pendingEvidence,
        invalidated: successorInvalidated,
        released,
        discarded,
        successorPublished: successor,
        predecessorGeneration: discarded.generation,
        successorGeneration: successor.generation,
        predecessorFingerprint: blocked.responseFingerprint,
        successorFingerprint: successor.fingerprint,
        latePredecessorPublishCount,
      };
      resourceDiscoveryEvidence.facts.tree.unrelatedStability = {
        before: unrelatedBefore,
        after: unrelatedAfter,
        nodeId: unrelatedBefore.nodeId,
        navigationFingerprint: unrelatedBefore.navigationFingerprint,
        changedFieldCount: 0,
      };
      resourceDiscoveryEvidence.facts.navigation.shifted = {
        identityKey: shifted.identityKey,
        relativePath: shifted.relativePath,
        start: shifted.shiftedPublicName.start,
        end: shifted.shiftedPublicName.end,
        opened: shiftedOpened,
      };
    } finally {
      if (document.getText() !== baseline) await replaceAndSaveDocumentText(document, baseline);
      process.emit(resourceDiscoveryHostControlEvent, {
        schemaVersion: resourceDiscoveryHostControlSchema,
        action: "reset",
        controlId,
      });
      await refreshResourceExplorer(
        "tree-race cleanup should republish the authenticated baseline",
        (_complete, nodes) => nodes.some((node) =>
          node.navigationResourceIdentity === shifted.identityKey
            && node.navigationFingerprint !== resourceDiscoveryEvidence.facts.tree.predecessorRace?.successorFingerprint
        ),
      );
    }
  });

  test("restarts active-template availability across both stale-scope F1-to-F2 mutations", async function() {
    this.timeout(600_000);
    const witness = resourceDiscoveryAcceptance.fixture.witnesses.shiftedAndRemovedNavigation;
    const race = witness.availabilityRace;
    const templatePath = resolveFixturePath(routedAureliaWorkspace, race.template.relativePath);
    const leftPath = resolveFixturePath(
      routedAureliaWorkspace,
      resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows[0].relativePath,
    );
    const rightPath = resolveFixturePath(routedAureliaWorkspace, witness.removed.relativePath);
    const templateDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(templatePath));
    const leftDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(leftPath));
    const rightDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(rightPath));
    await vscode.window.showTextDocument(leftDocument, { preview: false });
    await vscode.window.showTextDocument(rightDocument, { preview: false });
    await vscode.window.showTextDocument(templateDocument, { preview: false });
    const templateBaseline = templateDocument.getText();
    const rightBaseline = rightDocument.getText();
    try {
      assert.strictEqual(Buffer.byteLength(templateBaseline, "utf8"), race.template.size);
      assert.strictEqual(sha256Bytes(Buffer.from(templateBaseline, "utf8")), race.template.sha256);
      assert.strictEqual(templateBaseline.indexOf(race.template.anchor), race.template.anchorOffset);
      const editedTemplate = templateBaseline.replace(race.scopeEdit.before, race.scopeEdit.after);
      assert.notStrictEqual(editedTemplate, templateBaseline, "The exact scope mutation must apply once.");
      assert(editedTemplate.includes(race.scopeEdit.keptGlobalRegistration));
      assert.strictEqual(Buffer.byteLength(editedTemplate, "utf8"), race.scopeEdit.editedSize);
      assert.strictEqual(sha256Bytes(Buffer.from(editedTemplate, "utf8")), race.scopeEdit.editedSha256);
      assert.deepStrictEqual(
        race.scopeEdit.inventoryIdentityKeysStillPresent,
        resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows.map((row) => row.identityKey),
      );
      assert.strictEqual(race.afterRemoval.inventory.removedIdentityKey, witness.removed.identityKey);
      assert.strictEqual(race.afterRemoval.inventory.removedIdentityPresent, false);
      assert.notStrictEqual(rightBaseline, witness.removed.replacement);

      await awaitRoutedSemanticReadinessAndExplorerPublication(
        "availability restart races should begin from a current routed semantic and Explorer publication",
      );

      const leftRow = resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows[0];
      const rightRow = resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows[1];
      resourceDiscoveryEvidence.facts.navigation.scopeRestart = await runAvailabilityRestartRace({
        baselineResponse: {
          projectKey: race.baseline.projectKey,
          result: race.baseline.result,
          selection: race.baseline.selection,
          coverage: race.baseline.coverage,
          rowCount: race.baseline.rowCount,
          selectableRowCount: race.baseline.selectableRowCount,
          navigationUnavailableIdentityKeys: race.baseline.navigationUnavailableIdentityKeys,
          selectedTemplate: {
            scopeIdentityKey: race.baseline.scopeIdentityKey,
            definitionName: race.baseline.definitionName,
          },
          candidates: [{ scopeIdentityKey: race.baseline.scopeIdentityKey }],
          rows: race.baseline.rows,
        },
        excludedAppRootIdentityKey: race.excludedAppRootIdentityKey,
        controlId: "c2-availability-scope",
        expectedInventoryPresence: "present",
        includedCurrentRow: rightRow,
        mutate: async () => await replaceUniqueDocumentSubstringAndSave(
          templateDocument,
          race.scopeEdit.before,
          race.scopeEdit.after,
          race.template.cursor,
        ),
        projectKey: race.baseline.projectKey,
        restartResponse: race.scopeEdit.restartWithoutSelection.response,
        retiredScopeReproof: race.scopeEdit.retiredBaselineScopeReproof.response,
        resourceIdentity: leftRow.identityKey,
        resourceScent: leftRow.shortestUniqueSuffix,
        excludedCurrentRow: leftRow,
        templateDocument,
        templatePosition: race.template.cursor,
      });

      assert.strictEqual(templateDocument.getText(), editedTemplate);
      resourceDiscoveryEvidence.facts.navigation.declarationRestart = await runAvailabilityRestartRace({
        baselineResponse: race.scopeEdit.restartWithoutSelection.response,
        excludedAppRootIdentityKey: race.excludedAppRootIdentityKey,
        controlId: "c2-availability-removed",
        expectedInventoryPresence: "absent",
        includedCurrentRow: leftRow,
        mutate: async () => await replaceAndSaveDocumentText(rightDocument, witness.removed.replacement),
        projectKey: race.baseline.projectKey,
        restartResponse: race.afterRemoval.restartWithoutSelection.response,
        retiredScopeReproof: race.afterRemoval.retiredRightOnlyScopeReproof.response,
        resourceIdentity: rightRow.identityKey,
        resourceScent: rightRow.shortestUniqueSuffix,
        excludedCurrentRow: rightRow,
        templateDocument,
        templatePosition: race.template.cursor,
      });
      assert.strictEqual(rightDocument.getText(), witness.removed.replacement);
    } finally {
      if (rightDocument.getText() !== rightBaseline) await replaceAndSaveDocumentText(rightDocument, rightBaseline);
      if (templateDocument.getText() !== templateBaseline) {
        await replaceAndSaveDocumentText(templateDocument, templateBaseline);
      }
      for (const controlId of ["c2-availability-scope", "c2-availability-removed"]) {
        process.emit(resourceDiscoveryHostControlEvent, {
          schemaVersion: resourceDiscoveryHostControlSchema,
          action: "reset",
          controlId,
        });
      }
      const restoredPublication = await refreshResourceExplorer(
        "availability-race cleanup should restore both duplicate declarations",
        (_complete, nodes) => resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows.every((row) =>
          nodes.some((node) => node.navigationResourceIdentity === row.identityKey)
        ),
      );
      const restoredDurableNodes = observationsForPublication(restoredPublication)
        .map(publicationNodeDurableShape);
      for (const [side, document] of [["left", leftDocument], ["right", rightDocument]]) {
        const closeStart = extensionHostObservations.length;
        await closeTextDocumentWithNativeEditor(
          document,
          `availability-race ${side} declaration cleanup`,
          {
            workspace: vscode.workspace,
            window: vscode.window,
            wait: waitFor,
          },
        );
        const disposed = !vscode.workspace.textDocuments.some(
          (candidate) => candidate.uri.toString() === document.uri.toString(),
        );
        if (disposed) {
          // Both declarations are restored and saved above. Closing a disk-equal
          // editor transfers no source-text authority, so it must not invalidate
          // or republish the retained semantic tree.
          await new Promise((resolve) => setTimeout(resolve, 500));
          const closeTrace = resourceDiscoveryObservations(closeStart);
          const routedInvalidations = closeTrace.filter((event) =>
            event.source === "resource-explorer-view"
              && event.phase === "invalidation"
              && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey
          );
          const treePublications = closeTrace.filter((event) =>
            event.source === "resource-explorer"
              && ["publish-start", "publish-node", "publish-complete", "view-state"].includes(event.phase)
          );
          assert.deepStrictEqual(
            routedInvalidations,
            [],
            `disposing the clean ${side} duplicate declaration must not invalidate routed semantics; `
              + `trace ${JSON.stringify(closeTrace)}`,
          );
          assert.deepStrictEqual(
            treePublications,
            [],
            `disposing the clean ${side} duplicate declaration must not republish retained rows; `
              + `trace ${JSON.stringify(closeTrace)}`,
          );
        }
      }
      const afterCleanClosePublication = await refreshResourceExplorer(
        "clean declaration disposal should preserve both duplicate rows",
        (_complete, nodes) => resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows.every((row) =>
          nodes.some((node) => node.navigationResourceIdentity === row.identityKey)
        ),
      );
      assert.deepStrictEqual(
        observationsForPublication(afterCleanClosePublication).map(publicationNodeDurableShape),
        restoredDurableNodes,
        "explicit refresh after clean declaration disposal must retain the exact durable semantic rows",
      );
    }
  });

  test("keeps recovery actionable across partial, stale, and admitted total failures", async function() {
    this.timeout(300_000);
    const partial = await publishControlledTreeFault({
      controlId: "c2-partial-host-beta",
      effect: "project-error-once",
      projectKey: "host-beta",
      stableCode: "AURELIA_RD_C2_PARTIAL",
    });
    const partialNodes = observationsForPublication(partial.publication);
    const partialTarget = partialNodes.find((node) =>
      node.nodeKind === "project"
        && node.label.includes("host-beta")
        && node.contextValue === "resourceProjectIssue"
    );
    assert(partialTarget, "Partial failure should retain an actionable host-beta project row.");
    const retainedProject = exactPublishedProjectNode(partialNodes, "host-alpha");
    const retainedSiblingNodes = publishedDescendants(partialNodes, retainedProject.nodeId)
      .filter((node) => node.nodeKind === "resource");
    const retainedSiblingCount = retainedSiblingNodes.length;
    assert(retainedSiblingCount > 0, "Partial failure must retain host-alpha resources.");
    const navigationAttributedSiblingCount = retainedSiblingNodes.filter((node) =>
      node.navigationProjectKey === "host-alpha"
    ).length;
    assert(
      retainedSiblingCount > navigationAttributedSiblingCount,
      "The host-alpha ancestry count must retain external-catalog rows without navigation project metadata.",
    );
    assert(retainedSiblingNodes.some((node) =>
      node.navigationProjectKey == null && node.rowStates.split("|").includes("non-navigable")
    ), "The retained host-alpha subtree must include its exact nonnavigable external-catalog row population.");
    const partialOutput = await invokeTreeOutputAction(partialTarget);
    const partialRetry = await retryTreeTarget(partialTarget, "partial host-beta recovery");
    assertScopedPublicationFingerprintCoherence(
      partialRetry.recoveredPublication,
      observationsForPublication(partialRetry.recoveredPublication),
      "partial host-beta recovery",
    );
    resourceDiscoveryEvidence.facts.recovery.partial = {
      projectKey: "host-beta",
      faultApplied: partial.faultApplied,
      failedPublication: partial.publication,
      retry: partialRetry.retry,
      recoveredPublication: partialRetry.recoveredPublication,
      retainedSiblingCount,
      stableCodeVisibleCount: visibleStableCodeCount("AURELIA_RD_C2_PARTIAL"),
    };
    resourceDiscoveryEvidence.facts.output.partial = {
      targetNodeId: partialTarget.nodeId,
      requested: partialOutput,
    };

    const newest = await publishControlledTreeFault({
      controlId: "c2-newest-workspace",
      effect: "newest-error-once",
      stableCode: "AURELIA_RD_C2_NEWEST",
    });
    assert.strictEqual(newest.publication.publicationKind, "current");
    const newestNodes = observationsForPublication(newest.publication);
    assert(
      newestNodes.some((node) => node.rowStates.split("|").includes("out-of-date")),
      "The resolved newest workspace error must publish retained out-of-date rows in a current publication.",
    );
    const newestTarget = newestNodes.find((node) =>
      node.nodeKind === "project"
        && node.label.includes("host-alpha")
        && node.contextValue === "resourceProjectIssue"
    );
    const newestResource = newestNodes.find((node) =>
      node.nodeKind === "resource"
        && node.navigationProjectKey === "host-alpha"
        && node.navigationResourceIdentity === resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates.rows[0].identityKey
    );
    assert(newestTarget && newestResource, "Newest failure should retain stale actionable rows.");
    const newestOutput = await invokeTreeOutputAction(newestTarget);
    const newestRecovery = await recoverTreeNavigationWithPrimaryRetry({
      controlId: "c2-newest-navigation-recovery",
      node: newestResource,
      stableCode: "AURELIA_RD_C2_NEWEST_NAV",
    });
    const retainedRowCount = newestNodes.filter((node) => node.nodeKind === "resource").length;
    assert(retainedRowCount > 0);
    const newestRecoveredNodes = observationsForPublication(newestRecovery.recoveredPublication);
    assertScopedPublicationFingerprintCoherence(
      newestRecovery.recoveredPublication,
      newestRecoveredNodes,
      "newest host-alpha recovery",
    );
    const newestBaselineNodes = authenticatedBaselineNodes("newest recovery conservation");
    const baselineIssueNodes = newestBaselineNodes
      .filter((node) => node.contextValue === "resourceProjectIssue");
    const recoveredIssueNodes = newestRecoveredNodes
      .filter((node) => node.contextValue === "resourceProjectIssue");
    assert.deepStrictEqual(
      recoveredIssueNodes.map((node) => node.nodeId),
      baselineIssueNodes.map((node) => node.nodeId),
      "Newest recovery must conserve the exact intentional baseline issue-node population.",
    );
    assert.deepStrictEqual(
      recoveredIssueNodes.map(publicationNodeDurableShape),
      baselineIssueNodes.map(publicationNodeDurableShape),
      "Newest recovery must conserve the exact public shape of intentional baseline issue rows.",
    );
    const recoveredHostAlpha = exactPublishedProjectNode(newestRecoveredNodes, "host-alpha");
    const recoveredHostAlphaNodes = [
      recoveredHostAlpha,
      ...publishedDescendants(newestRecoveredNodes, recoveredHostAlpha.nodeId),
    ];
    const baselineHostAlpha = exactPublishedProjectNode(newestBaselineNodes, "host-alpha");
    const baselineHostAlphaNodes = [
      baselineHostAlpha,
      ...publishedDescendants(newestBaselineNodes, baselineHostAlpha.nodeId),
    ];
    assert.deepStrictEqual(
      recoveredHostAlphaNodes.map(publicationNodeDurableShape),
      baselineHostAlphaNodes.map(publicationNodeDurableShape),
      "Newest recovery must restore the exact public host-alpha subtree.",
    );
    assert(
      recoveredHostAlphaNodes.every((node) => node.contextValue !== "resourceProjectIssue"),
      "Newest recovery must clear the targeted host-alpha project failure.",
    );
    assert(!newestRecoveredNodes.some((node) => node.rowStates.split("|").includes("out-of-date")));
    assert(!newestRecoveredNodes.some((node) => node.rowStates.split("|").includes("updating")));
    resourceDiscoveryEvidence.facts.recovery.newest = {
      faultApplied: newest.faultApplied,
      outOfDatePublication: newest.publication,
      recoveryPresented: newestRecovery.presented,
      recoveryChoice: newestRecovery.choice,
      retryInvalidated: newestRecovery.retryInvalidated,
      recoveredPublication: newestRecovery.recoveredPublication,
      retainedRowCount,
      stableCodeVisibleCount: visibleStableCodeCount("AURELIA_RD_C2_NEWEST"),
    };
    resourceDiscoveryEvidence.facts.output.newest = {
      targetNodeId: newestTarget.nodeId,
      requested: newestOutput,
    };

    if (resourceDiscoveryAcceptance.versionLane === "current-stable") {
      const baselineNodes = authenticatedBaselineNodes("total recovery conservation");
      const baselineProjectNodes = baselineNodes.filter((node) => node.nodeKind === "project");
      const total = await publishControlledTreeFault({
        controlId: "c2-total-workspaces",
        effect: "all-error-once",
        expectedIssueProjectNodeIds: baselineProjectNodes.map((node) => node.nodeId),
        stableCode: "AURELIA_RD_C2_TOTAL",
      });
      const totalNodes = observationsForPublication(total.publication);
      const baselineIssueNodes = baselineNodes.filter((node) => node.contextValue === "resourceProjectIssue");
      const baselineIssueProjectNodeIds = new Set(baselineIssueNodes
        .filter((node) => node.nodeKind === "project")
        .map((node) => node.nodeId));
      const failedProjectNodes = totalNodes.filter((node) =>
        node.nodeKind === "project" && node.contextValue === "resourceProjectIssue"
      );
      assert.deepStrictEqual(
        codeUnitSorted(failedProjectNodes.map((node) => node.nodeId)),
        codeUnitSorted(baselineProjectNodes.map((node) => node.nodeId)),
        "The all-workspace fault must publish one issue row for every admitted baseline project.",
      );
      for (const node of failedProjectNodes) {
        assert.strictEqual(node.rowStates, "", `Failed project ${node.nodeId} must remain an issue row, not stale data.`);
        assert.strictEqual(node.answerResult, null);
        assert.strictEqual(node.answerCoverage, null);
        assert.strictEqual(node.answerRowCount, null);
      }
      const baselineProjectsByNodeId = new Map(baselineProjectNodes.map((node) => [
        node.nodeId,
        { node, ...publishedProjectBoundary(baselineNodes, node) },
      ]));
      const affectedWorkspaceGroups = [];
      const affectedWorkspaceGroupsByIdentity = new Map();
      for (const failedProject of failedProjectNodes) {
        const baselineProject = baselineProjectsByNodeId.get(failedProject.nodeId);
        assert(baselineProject, `Failed project ${failedProject.nodeId} must retain exact baseline ancestry.`);
        let group = affectedWorkspaceGroupsByIdentity.get(baselineProject.workspaceIdentity);
        if (group == null) {
          group = {
            workspaceIdentity: baselineProject.workspaceIdentity,
            representative: { failedProject, baselineProject },
            projects: [],
          };
          affectedWorkspaceGroupsByIdentity.set(group.workspaceIdentity, group);
          affectedWorkspaceGroups.push(group);
        }
        group.projects.push({ failedProject, baselineProject });
      }
      assert.strictEqual(
        affectedWorkspaceGroups.length,
        2,
        "The aggregate all-workspace fault must retain both admitted workspace boundaries.",
      );
      const affectedProjects = affectedWorkspaceGroups.map((group) => ({
        workspaceIdentity: group.workspaceIdentity,
        projectKey: group.representative.baselineProject.projectKey,
        nodeId: group.representative.failedProject.nodeId,
        published: group.representative.failedProject,
      }));
      const totalTarget = failedProjectNodes.find((node) =>
        node.nodeKind === "project"
          && node.label.includes("host-alpha")
      );
      assert(totalTarget, "Total failure should publish an actionable failed project row.");
      const totalRecovery = await recoverAvailableNavigationWithPrimaryRetry({
        controlId: "c2-total-navigation-recovery",
        stableCode: "AURELIA_RD_C2_TOTAL_NAV",
      });
      const totalOutput = await invokeTreeOutputAction(totalTarget);
      const recoveries = [];
      const recoveredWorkspaceFingerprints = [];
      let currentNodes = totalNodes;
      for (const [index, group] of affectedWorkspaceGroups.entries()) {
        const currentTarget = currentNodes.find((node) =>
          node.nodeId === group.representative.failedProject.nodeId
            && node.nodeKind === "project"
            && node.contextValue === "resourceProjectIssue"
        );
        assert(currentTarget, `Total recovery ${index + 1} must re-resolve its live project issue target.`);
        const recovered = await retryTreeTarget(
          currentTarget,
          `total workspace recovery ${index + 1}`,
          group.workspaceIdentity,
        );
        assert.strictEqual(
          observedWorkspaceIdentity(recovered.retry.workspaceKey),
          group.workspaceIdentity,
          `Total recovery ${index + 1} must retry the authenticated workspace boundary.`,
        );
        const expectedWorkspaceRoot = index === 0 ? aureliaWorkspace : routedAureliaWorkspace;
        assert.strictEqual(
          normalizeFileWorkspaceKey(recovered.retry.workspaceKey),
          normalize(expectedWorkspaceRoot),
          `Total recovery ${index + 1} must follow the frozen primary-then-routed order.`,
        );
        currentNodes = observationsForPublication(recovered.recoveredPublication);
        assertScopedPublicationFingerprintCoherence(
          recovered.recoveredPublication,
          currentNodes,
          `total workspace recovery ${index + 1}`,
        );
        recoveredWorkspaceFingerprints.push({
          workspaceIdentity: group.workspaceIdentity,
          fingerprint: recovered.recoveredPublication.fingerprint,
        });
        const expectedRemainingIssueIds = codeUnitSorted(new Set([
          ...baselineIssueProjectNodeIds,
          ...affectedWorkspaceGroups.slice(index + 1)
            .flatMap((remaining) => remaining.projects.map(({ failedProject }) => failedProject.nodeId)),
        ]));
        assert.deepStrictEqual(
          codeUnitSorted(currentNodes
            .filter((node) => node.nodeKind === "project" && node.contextValue === "resourceProjectIssue")
            .map((node) => node.nodeId)),
          expectedRemainingIssueIds,
          `Total recovery ${index + 1} must conserve intentional baseline issues plus not-yet-retried workspace failures.`,
        );
        recoveries.push({
          workspaceIdentity: group.workspaceIdentity,
          targetNodeId: currentTarget.nodeId,
          retry: recovered.retry,
          recoveredPublication: recovered.recoveredPublication,
        });
      }
      assert.deepStrictEqual(
        codeUnitSorted(currentNodes.map((node) => node.nodeId)),
        codeUnitSorted(baselineNodes.map((node) => node.nodeId)),
        "Serial total recovery must restore the exact baseline tree node-ID set.",
      );
      for (const nodeKind of ["project", "resource"]) {
        assert.deepStrictEqual(
          codeUnitSorted(currentNodes.filter((node) => node.nodeKind === nodeKind).map((node) => node.nodeId)),
          codeUnitSorted(baselineNodes.filter((node) => node.nodeKind === nodeKind).map((node) => node.nodeId)),
          `Serial total recovery must restore the exact baseline ${nodeKind} node-ID set.`,
        );
      }
      assert.deepStrictEqual(
        currentNodes.map(publicationNodeDurableShape),
        baselineNodes.map(publicationNodeDurableShape),
        "Serial total recovery must restore the exact baseline public tree shape.",
      );
      assertFinalRecoveredWorkspaceFingerprints(
        currentNodes,
        recoveredWorkspaceFingerprints,
        "serial total recovery",
      );
      const finalIssueNodes = currentNodes.filter((node) => node.contextValue === "resourceProjectIssue");
      assert.deepStrictEqual(
        finalIssueNodes.map((node) => node.nodeId),
        baselineIssueNodes.map((node) => node.nodeId),
        "Serial total recovery must conserve the exact intentional baseline issue-node population.",
      );
      assert.deepStrictEqual(
        finalIssueNodes.map(publicationNodeDurableShape),
        baselineIssueNodes.map(publicationNodeDurableShape),
        "Serial total recovery must conserve the exact public baseline issue-row shape.",
      );
      const finalHostAlpha = exactPublishedProjectNode(currentNodes, "host-alpha");
      assert(
        [finalHostAlpha, ...publishedDescendants(currentNodes, finalHostAlpha.nodeId)]
          .every((node) => node.contextValue !== "resourceProjectIssue"),
        "Serial total recovery must clear the targeted host-alpha project failure.",
      );
      const finalState = {
        nodeCount: currentNodes.length,
        rootCount: currentNodes.filter((node) => node.parentId == null).length,
        projectCount: currentNodes.filter((node) => node.nodeKind === "project").length,
        resourceCount: currentNodes.filter((node) => node.nodeKind === "resource").length,
        issueRowCount: currentNodes.filter((node) => node.contextValue === "resourceProjectIssue").length,
        outOfDateRowCount: currentNodes.filter((node) =>
          node.rowStates.split("|").includes("out-of-date")
        ).length,
      };
      assert.strictEqual(
        finalState.issueRowCount,
        baselineIssueNodes.length,
        "Serial total recovery must restore the exact baseline issue-row count.",
      );
      assert.strictEqual(finalState.outOfDateRowCount, 0);
      assert.strictEqual(
        currentNodes.filter((node) => node.rowStates.split("|").includes("updating")).length,
        0,
        "The fully recovered tree must not retain an updating row.",
      );
      resourceDiscoveryEvidence.facts.recovery.totalFailure = {
        faultApplied: total.faultApplied,
        failedPublication: total.publication,
        affectedProjects,
        recoveryPresented: totalRecovery.presented,
        recoveryChoice: totalRecovery.choice,
        recoveries,
        finalState,
        stableCodeVisibleCount: visibleStableCodeCount("AURELIA_RD_C2_TOTAL"),
      };
      resourceDiscoveryEvidence.facts.output.totalFailure = {
        targetNodeId: totalTarget.nodeId,
        requested: totalOutput,
      };
    }
    resourceDiscoveryEvidence.facts.output.treeActionRequestCount =
      resourceDiscoveryAcceptance.versionLane === "current-stable" ? 3 : 2;
  });

  test("cancels a blocked availability request and keeps admitted absence states distinct", async function() {
    this.timeout(300_000);
    const race = resourceDiscoveryAcceptance.fixture.witnesses.shiftedAndRemovedNavigation.availabilityRace;
    const document = await showAureliaDocument(race.template.relativePath, routedAureliaWorkspace);
    const position = new vscode.Position(race.template.cursor.line, race.template.cursor.character);
    vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
    const controlId = "c2-availability-cancellation";
    await armResourceDiscoveryControl({
      controlId,
      operation: "availability",
      stage: "after-response",
      effect: "barrier",
    });
    const flow = startObservedCommand("aurelia.goToAvailableResource");
    const pickerStart = await waitForExtensionHostObservation(
      flow.start,
      (event) => event.source === "resource-quick-pick" && event.phase === "model-start",
      "cancellation should begin inside the real native Quick Pick",
      flow.settled,
    );
    const blocked = await waitForExtensionHostObservation(
      flow.start,
      (event) => event.source === "resource-discovery-host-control"
        && event.observationId === controlId
        && event.phase === "blocked",
      "the real availability response should block while its picker remains open",
      flow.settled,
      120_000,
    );
    const closeStart = extensionHostObservations.length;
    void vscode.commands.executeCommand("workbench.action.closeQuickOpen").then(undefined, () => undefined);
    const controlCancelled = await waitForExtensionHostObservation(
      closeStart,
      (event) => event.source === "resource-discovery-host-control"
        && event.observationId === controlId
        && event.phase === "cancelled",
      "closing the picker should cancel the blocked controller request",
      flow.settled,
    );
    const pickerCancelled = await waitForExtensionHostObservation(
      closeStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === pickerStart.observationId
        && event.phase === "cancelled",
      "the native picker should publish quiet cancellation",
      flow.settled,
    );
    const pickerDisposed = await waitForExtensionHostObservation(
      closeStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === pickerStart.observationId
        && event.phase === "disposed",
      "the cancelled native picker should dispose",
      flow.settled,
    );
    const commandCancelled = await waitForExtensionHostObservation(
      closeStart,
      (event) => event.source === "go-to-available-resource"
        && event.observationId === pickerStart.observationId
        && event.phase === "cancelled",
      "the public command should terminate as cancellation",
      flow.settled,
    );
    await settleObservedCommand(flow, "the cancelled availability command should settle");
    const commandTrace = extensionHostObservations.slice(flow.start).filter((event) =>
      event.observationId === pickerStart.observationId
    );
    assert.strictEqual(commandTrace.filter((event) => event.phase === "recovery-presented").length, 0);
    assert.strictEqual(commandTrace.filter((event) => event.phase === "output-requested").length, 0);
    resourceDiscoveryEvidence.facts.cancellation = {
      blocked,
      controlCancelled,
      pickerCancelled,
      pickerDisposed,
      commandCancelled,
      recoveryPresentedCount: 0,
      outputRequestedCount: 0,
    };

    const unownedDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(
      path.join(plainTypeScriptWorkspace, "src", "plain.ts"),
    ));
    await vscode.window.showTextDocument(unownedDocument, { preview: false });
    const unownedPosition = unownedDocument.positionAt(0);
    vscode.window.activeTextEditor.selection = new vscode.Selection(unownedPosition, unownedPosition);
    const unowned = await inspectEmptyAvailabilityModel("unowned resource boundary");
    assert.strictEqual(unowned.response.projectSelection, "null");
    assert.strictEqual(unowned.response.templateSelection, "unavailable");
    assert.strictEqual(unowned.response.status, "empty");
    assert.strictEqual(unowned.response.count, 0);
    assert.strictEqual(unowned.response.resourceCount, 0);
    assert.strictEqual(unowned.response.templateCandidateCount, null);
    assert.strictEqual(unowned.response.soleTemplateCandidateScopeIdentity, null);
    assert.strictEqual(unowned.modelReady.title, "Go to Resource Available to Active Template");
    assert.strictEqual(
      unowned.modelReady.placeholder,
      "Open an analyzed Aurelia template to see its available resources",
    );

    await vscode.window.showTextDocument(document, { preview: false });
    const noCursorPosition = new vscode.Position(0, 1);
    vscode.window.activeTextEditor.selection = new vscode.Selection(noCursorPosition, noCursorPosition);
    const noCursor = await inspectEmptyAvailabilityModel("admitted no-cursor boundary");
    assert.strictEqual(noCursor.response.projectSelection, "exact");
    assert.strictEqual(noCursor.response.templateSelection, "absent");
    assert.strictEqual(noCursor.response.status, "empty");
    assert.strictEqual(noCursor.response.count, 0);
    assert.strictEqual(noCursor.response.resourceCount, 0);
    assert.strictEqual(noCursor.response.templateCandidateCount, 0);
    assert.strictEqual(noCursor.response.soleTemplateCandidateScopeIdentity, null);
    assert.strictEqual(noCursor.modelReady.title, "No Aurelia template at the cursor");
    assert.strictEqual(
      noCursor.modelReady.placeholder,
      "Move the cursor into an analyzed Aurelia template and try again",
    );
    assert.notDeepStrictEqual(
      {
        projectSelection: unowned.response.projectSelection,
        templateSelection: unowned.response.templateSelection,
      },
      {
        projectSelection: noCursor.response.projectSelection,
        templateSelection: noCursor.response.templateSelection,
      },
    );
    resourceDiscoveryEvidence.facts.quickPick.unownedCursor = {
      ready: unowned.modelReady,
      response: unowned.response,
    };
    resourceDiscoveryEvidence.facts.quickPick.noCursor = {
      ready: noCursor.modelReady,
      response: noCursor.response,
    };
  });

  test("atomically seals the authenticated Resource Discovery ledger and report", async function() {
    this.timeout(120_000);
    assertNoLiveResourceDiscoveryControls();
    assert.deepStrictEqual(
      (vscode.workspace.workspaceFolders ?? []).map((folder) => normalize(folder.uri.fsPath)),
      [aureliaWorkspace, routedAureliaWorkspace, excludedAureliaWorkspace, plainTypeScriptWorkspace].map(normalize),
      "Evidence may only seal after the exact workspace-folder topology is restored.",
    );
    await reauthenticateResourceDiscoveryAcceptanceCorpus();
    assertResourceDiscoveryFactsReady(resourceDiscoveryEvidence.facts);
    sealResourceDiscoveryAcceptanceEvidence(resourceDiscoveryEvidence.facts);
  });

  test("requests the native modal API for an exact invoked attribute explanation", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    const position = positionIn(document, 'value.bind="state.searchText"', "value.bind");
    const range = new vscode.Range(position, position);
    let actions = [];
    await waitFor(async () => {
      actions = await executeCodeActionProvider(document.uri, range, 1);
      return actions.some((action) => action.title === "Explain how Aurelia uses this attribute");
    }, "the exact authored attribute name should offer its invoked explanation action", 120_000);

    const action = actions.find((candidate) => candidate.title === "Explain how Aurelia uses this attribute");
    assert(action);
    assert.strictEqual(action.kind?.value ?? action.kind, vscode.CodeActionKind.QuickFix.value);
    assert.strictEqual(action.isPreferred, false);
    assert.strictEqual(action.edit, undefined);
    assert.strictEqual(action.command?.command, "aurelia.explainAttributeInterpretation");
    assert.strictEqual(action.command.arguments?.length, 1);

    const observationStart = extensionHostObservations.length;
    let commandOutcome;
    const command = vscode.commands.executeCommand(
      action.command.command,
      ...action.command.arguments,
    ).then(
      (value) => {
        commandOutcome = { status: "fulfilled", value };
        return value;
      },
      (error) => {
        commandOutcome = { status: "rejected", error: String(error) };
        return undefined;
      },
    );
    let requested;
    const modalDeadline = Date.now() + 120_000;
    while (Date.now() < modalDeadline && requested == null && commandOutcome == null) {
      requested = extensionHostObservations.slice(observationStart).find((event) =>
        event.source === "native-explanation" && event.phase === "modal-requested"
      );
      if (requested == null) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(
      requested,
      commandOutcome == null
        ? "The explanation command did not request its native modal before the deadline."
        : `Explanation command settled before requesting its modal: ${JSON.stringify(commandOutcome)}.`,
    );
    assert.strictEqual(requested.title, "Aurelia gives value.bind one runtime effect.");
    assert.strictEqual(requested.uncertaintyState, "closed");
    assert.strictEqual(requested.modal, true);
    assert(Number.isInteger(requested.buttonCount));
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.strictEqual(
      commandOutcome,
      undefined,
      "VS Code Extension Host tests keep a refused modal API request pending until host teardown.",
    );
    void command;
  });
});

async function authenticateResourceDiscoveryAcceptanceInputs(extension) {
  assert.strictEqual(
    requiredHostEnvironment("AURELIA_LS_RESOURCE_DISCOVERY_HOST_ACCEPTANCE"),
    "1",
    "Resource Discovery host acceptance must be explicitly enabled.",
  );
  const descriptorPath = requiredAbsoluteHostPath("AURELIA_LS_RESOURCE_DISCOVERY_HOST_DESCRIPTOR");
  const renderedManifestPath = requiredAbsoluteHostPath(
    "AURELIA_LS_RESOURCE_DISCOVERY_HOST_FIXTURE_MANIFEST",
  );
  const ledgerPath = requiredAbsoluteHostPath("AURELIA_LS_RESOURCE_DISCOVERY_HOST_LEDGER");
  const reportPath = requiredAbsoluteHostPath("AURELIA_LS_RESOURCE_DISCOVERY_HOST_REPORT");
  const sourceManifestPath = path.join(
    extension.extensionPath,
    "test",
    "fixtures",
    "resource-discovery-host.json",
  );
  const sourceManifestBytes = readRegularHostFile(sourceManifestPath, "committed fixture manifest");
  const renderedManifestBytes = readRegularHostFile(renderedManifestPath, "rendered fixture manifest");
  const descriptorBytes = readRegularHostFile(descriptorPath, "semantic workspace descriptor");
  const sourceManifest = parseHostJson(sourceManifestBytes, "committed fixture manifest");
  const fixture = parseHostJson(renderedManifestBytes, "rendered fixture manifest");
  const descriptor = parseHostJson(descriptorBytes, "semantic workspace descriptor");

  assert.strictEqual(sourceManifest.schemaVersion, "aurelia-resource-discovery-host-fixture/1");
  assert.strictEqual(fixture.schemaVersion, "aurelia-resource-discovery-host-fixture-rendered/1");
  assert.strictEqual(descriptor.schemaVersion, "semantic-workspace/1");
  assert.strictEqual(fixture.sourceManifestSha256, sha256Bytes(sourceManifestBytes));
  assert.strictEqual(fixture.descriptorSha256, sha256Bytes(descriptorBytes));
  for (const key of ["copyInputs", "generatedInputs", "projects", "witnesses", "lanePolicy"]) {
    assert.strictEqual(
      JSON.stringify(fixture[key]),
      JSON.stringify(sourceManifest[key]),
      `Rendered fixture must preserve committed field ${key}.`,
    );
  }
  assert(fixture.lane === "current-stable" || fixture.lane === "minimum");
  assert.strictEqual(fixture.transport, expectedTransport);
  assert.strictEqual(normalize(fixture.workspaceRoot), normalize(routedAureliaWorkspace));
  assert.strictEqual(normalize(descriptor.workspaceRoot), normalize(routedAureliaWorkspace));
  assert.strictEqual(path.basename(descriptorPath), "semantic-workspace.json");
  assert.strictEqual(path.basename(renderedManifestPath), "fixture-manifest.json");
  assert.strictEqual(fixture.descriptorRelativePath, path.basename(descriptorPath));
  assertInsideHostPath(routedAureliaWorkspace, descriptorPath, "descriptor");
  assertInsideHostPath(routedAureliaWorkspace, renderedManifestPath, "rendered fixture manifest");
  assertInsideHostPath(routedAureliaWorkspace, ledgerPath, "observation ledger");
  assertInsideHostPath(routedAureliaWorkspace, reportPath, "acceptance report");
  assert.strictEqual(path.basename(ledgerPath), "resource-discovery.observations.jsonl");
  assert.strictEqual(path.basename(reportPath), "resource-discovery.acceptance.json");
  assert(!existsSync(ledgerPath), "The observation ledger must not exist before the host launch.");
  assert(!existsSync(reportPath), "The acceptance report must not exist before the host launch.");
  assert(!Object.hasOwn(fixture.witnesses, "empty"));
  assert(!Object.hasOwn(fixture.witnesses, "nonFileUri"));
  assert(!fixture.projects.some((project) => project.projectKey === "host-empty"));

  const requestedVersion = requiredHostEnvironment("AURELIA_LS_EXTENSION_HOST_EXPECTED_VERSION");
  const actualVersion = requiredHostEnvironment("AURELIA_LS_EXTENSION_HOST_EXPECTED_ACTUAL_VERSION");
  assert.strictEqual(vscode.version, actualVersion);
  if (fixture.lane === "minimum") {
    assert.strictEqual(requestedVersion, "1.91.0");
    assert.strictEqual(actualVersion, "1.91.0");
  } else {
    assert.strictEqual(requestedVersion, "stable");
  }
  assert.strictEqual(
    fixture.lane,
    requestedVersion === "stable" ? "current-stable" : "minimum",
  );

  authenticateHostFixtureCorpus(fixture, routedAureliaWorkspace, extension.extensionPath);

  const staticContractModuleUrl = pathToFileURL(path.join(
    extension.extensionPath,
    "scripts",
    "extension-host-static-contract.mjs",
  ));
  const { extensionHostStaticContractSha256 } = await import(staticContractModuleUrl.href);
  const staticContractSha256 = extensionHostStaticContractSha256(extension.extensionPath);
  assert.match(staticContractSha256, /^[a-f0-9]{64}$/u);

  return Object.freeze({
    actualVersion,
    authoritative: expectedTransport === "worker",
    descriptor,
    descriptorPath,
    descriptorSha256: sha256Bytes(descriptorBytes),
    extensionPath: extension.extensionPath,
    fixture,
    fixturePath: renderedManifestPath,
    fixtureSha256: sha256Bytes(renderedManifestBytes),
    ledgerPath,
    reportPath,
    requestedVersion,
    sourceManifest,
    sourceManifestPath,
    staticContractSha256,
    versionLane: fixture.lane,
    workspaceKey: vscode.Uri.file(routedAureliaWorkspace).toString(),
  });
}

function assertNoLiveResourceDiscoveryControls() {
  const start = extensionHostObservations.length;
  process.emit(resourceDiscoveryHostControlEvent, {
    schemaVersion: resourceDiscoveryHostControlSchema,
    action: "reset",
  });
  assert.deepStrictEqual(
    resourceDiscoveryObservations(start).map((event) => ({
      source: event.source,
      observationId: event.observationId,
      phase: event.phase,
      pending: event.pending,
    })),
    [{
      source: "resource-discovery-host-control",
      observationId: "host-control",
      phase: "reset",
      pending: false,
    }],
    "Every gated host control must settle before evidence sealing.",
  );
}

async function reauthenticateResourceDiscoveryAcceptanceCorpus() {
  const acceptance = resourceDiscoveryAcceptance;
  assert.strictEqual(
    sha256Bytes(readRegularHostFile(acceptance.sourceManifestPath, "restored committed fixture manifest")),
    acceptance.fixture.sourceManifestSha256,
  );
  assert.strictEqual(
    sha256Bytes(readRegularHostFile(acceptance.fixturePath, "restored rendered fixture manifest")),
    acceptance.fixtureSha256,
  );
  assert.strictEqual(
    sha256Bytes(readRegularHostFile(acceptance.descriptorPath, "restored semantic workspace descriptor")),
    acceptance.descriptorSha256,
  );
  authenticateHostFixtureCorpus(acceptance.fixture, routedAureliaWorkspace, acceptance.extensionPath);
  const staticContractModuleUrl = pathToFileURL(path.join(
    acceptance.extensionPath,
    "scripts",
    "extension-host-static-contract.mjs",
  ));
  const { extensionHostStaticContractSha256 } = await import(staticContractModuleUrl.href);
  assert.strictEqual(
    extensionHostStaticContractSha256(acceptance.extensionPath),
    acceptance.staticContractSha256,
    "The independently computed launched static contract changed during acceptance.",
  );
}

function assertResourceDiscoveryFactsReady(facts) {
  assertExactHostKeys(facts, ["tree", "quickPick", "recovery", "output", "navigation", "cancellation"]);
  assertExactHostKeys(facts.tree, [
    "baseline",
    "lifecycle",
    "predecessorRace",
    "unrelatedStability",
    "headerOnlyPublished",
    "openCoverage",
    "guardrail",
    ...(resourceDiscoveryAcceptance.versionLane === "current-stable" ? ["pageDrain"] : []),
  ]);
  assertExactFactKeys(facts.tree.baseline, baselineTreeFactKeys, "facts.tree.baseline");
  assertExactFactKeys(facts.tree.predecessorRace, predecessorRaceFactKeys, "facts.tree.predecessorRace");
  assertExactHostKeys(facts.quickPick, [
    "projectModel",
    "templateModel",
    "resourceModel",
    "back",
    "cancel",
    "unownedCursor",
    "noCursor",
  ]);
  assertExactHostKeys(facts.quickPick.projectModel, [
    "ready", "selection", "modelOrdinal", "itemCount", "selectedProjectKey",
  ]);
  assertExactHostKeys(facts.quickPick.templateModel, [
    "ready", "selection", "modelOrdinal", "itemCount", "selectedTemplateScopeIdentity",
  ]);
  assertExactHostKeys(facts.quickPick.resourceModel, [
    "ready",
    "response",
    "cancelled",
    "disposed",
    "commandCancelled",
    "modelOrdinal",
    "itemCount",
    "excludedAppRootIdentityKey",
  ]);
  assertExactHostKeys(facts.quickPick.unownedCursor, ["ready", "response"]);
  assertExactHostKeys(facts.quickPick.noCursor, ["ready", "response"]);
  assertExactHostKeys(facts.recovery, [
    "partial",
    "newest",
    ...(resourceDiscoveryAcceptance.versionLane === "current-stable" ? ["totalFailure"] : []),
  ]);
  assertExactHostKeys(facts.recovery.partial, [
    "projectKey",
    "faultApplied",
    "failedPublication",
    "retry",
    "recoveredPublication",
    "retainedSiblingCount",
    "stableCodeVisibleCount",
  ]);
  assertExactHostKeys(facts.recovery.newest, [
    "faultApplied",
    "outOfDatePublication",
    "recoveryPresented",
    "recoveryChoice",
    "retryInvalidated",
    "recoveredPublication",
    "retainedRowCount",
    "stableCodeVisibleCount",
  ]);
  if (resourceDiscoveryAcceptance.versionLane === "current-stable") {
    assertExactHostKeys(facts.recovery.totalFailure, [
      "faultApplied",
      "failedPublication",
      "affectedProjects",
      "recoveryPresented",
      "recoveryChoice",
      "recoveries",
      "finalState",
      "stableCodeVisibleCount",
    ]);
    assert(Array.isArray(facts.recovery.totalFailure.affectedProjects));
    for (const affected of facts.recovery.totalFailure.affectedProjects) {
      assertExactHostKeys(affected, ["workspaceIdentity", "projectKey", "nodeId", "published"]);
    }
    assert(Array.isArray(facts.recovery.totalFailure.recoveries));
    for (const recovery of facts.recovery.totalFailure.recoveries) {
      assertExactHostKeys(recovery, ["workspaceIdentity", "targetNodeId", "retry", "recoveredPublication"]);
    }
    assertExactHostKeys(facts.recovery.totalFailure.finalState, [
      "nodeCount",
      "rootCount",
      "projectCount",
      "resourceCount",
      "issueRowCount",
      "outOfDateRowCount",
    ]);
  }
  assertExactHostKeys(facts.output, [
    "partial",
    "newest",
    "treeActionRequestCount",
    ...(resourceDiscoveryAcceptance.versionLane === "current-stable" ? ["totalFailure"] : []),
  ]);
  assertExactHostKeys(facts.navigation, [
    "actions",
    "longDuplicates",
    "headerOnly",
    "shifted",
    "scopeRestart",
    "declarationRestart",
    "pathless",
    ...(resourceDiscoveryAcceptance.versionLane === "current-stable" ? ["packageOrigins"] : []),
  ]);
  assertExactHostKeys(facts.cancellation, [
    "blocked",
    "controlCancelled",
    "pickerCancelled",
    "pickerDisposed",
    "commandCancelled",
    "recoveryPresentedCount",
    "outputRequestedCount",
  ]);
}

function assertExactHostKeys(value, expectedKeys) {
  assert(value != null && typeof value === "object" && !Array.isArray(value));
  assert.deepStrictEqual(Object.keys(value).sort(), [...expectedKeys].sort());
}

function sealResourceDiscoveryAcceptanceEvidence(facts) {
  const acceptance = resourceDiscoveryAcceptance;
  const ledgerEvents = [...extensionHostObservations];
  for (const [index, event] of ledgerEvents.entries()) {
    assertExactPrimitiveObservation(event, index + 1);
  }
  const ledgerBytes = Buffer.from(`${ledgerEvents.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");
  assert(ledgerEvents.length > 0);
  const reportFacts = ledgerReferencedFacts(facts, ledgerEvents);
  const journeys = resourceDiscoveryJourneyIds(acceptance.versionLane).map((id) => ({ id, status: "passed" }));
  const report = {
    schemaVersion: "aurelia-resource-discovery-host-acceptance/1",
    requestedVersion: acceptance.requestedVersion,
    versionLane: acceptance.versionLane,
    resolvedVersion: acceptance.actualVersion,
    actualVersion: acceptance.actualVersion,
    transport: expectedTransport,
    authoritative: expectedTransport === "worker",
    platform: process.platform,
    arch: process.arch,
    staticContractSha256: acceptance.staticContractSha256,
    fixture: {
      path: acceptance.fixturePath,
      sha256: acceptance.fixtureSha256,
      descriptorSha256: acceptance.descriptorSha256,
    },
    ledger: {
      path: acceptance.ledgerPath,
      sha256: sha256Bytes(ledgerBytes),
      eventCount: ledgerEvents.length,
    },
    journeys,
    facts: reportFacts,
    result: "passed",
  };
  const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, "utf8");
  atomicWriteNewHostEvidence(acceptance.ledgerPath, ledgerBytes, "observation ledger");
  atomicWriteNewHostEvidence(acceptance.reportPath, reportBytes, "acceptance report");
}

function assertExactPrimitiveObservation(event, eventOrdinal) {
  assert(event != null && typeof event === "object" && !Array.isArray(event));
  for (const field of ["source", "observationId", "phase"]) {
    assert(typeof event[field] === "string" && event[field].length > 0, `Ledger event ${eventOrdinal} ${field}.`);
  }
  for (const [field, value] of Object.entries(event)) {
    assert(
      value === null || ["string", "number", "boolean"].includes(typeof value),
      `Ledger event ${eventOrdinal} field ${field} must be primitive.`,
    );
    if (typeof value === "number") assert(Number.isFinite(value), `Ledger event ${eventOrdinal} field ${field}.`);
  }
}

function ledgerReferencedFacts(facts, ledgerEvents) {
  const eventOrdinals = new Map(ledgerEvents.map((event, index) => [event, index + 1]));
  const referencedOrdinals = new Set();
  const visit = (value, label) => {
    const eventOrdinal = eventOrdinals.get(value);
    if (eventOrdinal != null) {
      assert(!referencedOrdinals.has(eventOrdinal), `${label} reuses ledger event ${eventOrdinal}.`);
      referencedOrdinals.add(eventOrdinal);
      return {
        eventOrdinal,
        observationId: value.observationId,
        phase: value.phase,
      };
    }
    if (Array.isArray(value)) return value.map((item, index) => visit(item, `${label}[${index}]`));
    if (value != null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, `${label}.${key}`)]));
    }
    assert(
      value === null || ["string", "number", "boolean"].includes(typeof value),
      `${label} must be a primitive report scalar or an exact ledger event.`,
    );
    if (typeof value === "number") assert(Number.isFinite(value), `${label} must be finite.`);
    return value;
  };
  return visit(facts, "facts");
}

function resourceDiscoveryJourneyIds(versionLane) {
  const common = [
    "authentication",
    "quiet-admitted-lifecycle",
    "hierarchy",
    "resource-breadth",
    "long-scent-duplicates",
    "ambiguity",
    "partial-failure",
    "recovery-currentness",
    "navigation",
    "cancellation",
    "distinct-states",
  ];
  return versionLane === "current-stable"
    ? [...common, "provenance", "page-drain", "guardrail", "total-failure"]
    : common;
}

function atomicWriteNewHostEvidence(targetPath, bytes, label) {
  assert(Buffer.isBuffer(bytes) && bytes.length > 0, `${label} bytes must be nonempty.`);
  assert(!existsSync(targetPath), `${label} target already exists.`);
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.tmp-${process.pid}`,
  );
  assertInsideHostPath(routedAureliaWorkspace, temporaryPath, `${label} temporary sibling`);
  assert(!existsSync(temporaryPath), `${label} temporary sibling already exists.`);
  writeFileSync(temporaryPath, bytes, { flag: "wx" });
  renameSync(temporaryPath, targetPath);
  assert.strictEqual(
    sha256Bytes(readRegularHostFile(targetPath, `sealed ${label}`)),
    sha256Bytes(bytes),
    `${label} changed while sealing.`,
  );
}

function requiredHostEnvironment(name) {
  const value = process.env[name];
  assert(typeof value === "string" && value.length > 0, `${name} is required.`);
  return value;
}

function requiredAbsoluteHostPath(name) {
  const value = requiredHostEnvironment(name);
  assert(path.isAbsolute(value), `${name} must be an absolute path.`);
  return path.resolve(value);
}

function readRegularHostFile(filePath, label) {
  const status = lstatSync(filePath);
  assert(status.isFile() && !status.isSymbolicLink(), `${label} must be a regular non-symbolic file.`);
  return readFileSync(filePath);
}

function authenticateHostFixtureCorpus(fixture, workspaceRoot, extensionPath) {
  assert(Array.isArray(fixture.files) && fixture.files.length > 0);
  assert(Array.isArray(fixture.links));
  for (const receipt of fixture.files) {
    const absolutePath = resolveFixturePath(workspaceRoot, receipt.relativePath);
    const bytes = readRegularHostFile(absolutePath, `fixture file ${receipt.relativePath}`);
    assert.strictEqual(bytes.length, receipt.size, `Fixture size changed for ${receipt.relativePath}.`);
    assert.strictEqual(sha256Bytes(bytes), receipt.sha256, `Fixture hash changed for ${receipt.relativePath}.`);
  }
  for (const receipt of fixture.links) {
    const linkPath = resolveFixturePath(workspaceRoot, receipt.relativePath);
    const linkStatus = lstatSync(linkPath);
    assert(linkStatus.isSymbolicLink(), `Fixture link ${receipt.relativePath} must remain symbolic.`);
    assert.strictEqual(
      receipt.kind,
      process.platform === "win32" ? "junction" : "directory-symbolic-link",
      `Fixture link kind changed for ${receipt.relativePath}.`,
    );
    assert(path.isAbsolute(receipt.target), `Fixture link target must be absolute for ${receipt.relativePath}.`);
    assert(path.isAbsolute(receipt.realPath), `Fixture link realPath must be absolute for ${receipt.relativePath}.`);
    const observedRealPath = realpathSync(linkPath);
    assert.strictEqual(
      normalize(observedRealPath),
      normalize(receipt.realPath),
      `Fixture link realPath changed for ${receipt.relativePath}.`,
    );
    assert.strictEqual(
      normalize(observedRealPath),
      normalize(realpathSync(receipt.target)),
      `Fixture link target changed for ${receipt.relativePath}.`,
    );
    const packageManifestBytes = readRegularHostFile(
      path.join(observedRealPath, "package.json"),
      `fixture link package manifest ${receipt.relativePath}`,
    );
    assert.strictEqual(
      sha256Bytes(packageManifestBytes),
      receipt.packageManifestSha256,
      `Fixture link package manifest changed for ${receipt.relativePath}.`,
    );
  }
  const rootDependencyLink = path.join(workspaceRoot, "node_modules");
  assert(lstatSync(rootDependencyLink).isSymbolicLink(), "The approved root node_modules path must remain symbolic.");
  assert.strictEqual(
    normalize(realpathSync(rootDependencyLink)),
    normalize(realpathSync(path.resolve(extensionPath, "..", "semantic-runtime", "node_modules"))),
    "The approved root node_modules target changed.",
  );
}

function parseHostJson(bytes, label) {
  const text = bytes.toString("utf8");
  assert(!text.startsWith("\ufeff"), `${label} must not contain a byte-order mark.`);
  const value = JSON.parse(text);
  assert(value != null && typeof value === "object" && !Array.isArray(value), `${label} must be an object.`);
  return value;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function resourceTreeNodeId(workspaceKey, projectKey, resourceIdentity) {
  return `tree-node:${sha256Bytes(Buffer.from(
    `workspace:${workspaceKey}:project:${projectKey}:${resourceIdentity}`,
    "utf8",
  ))}`;
}

function assertInsideHostPath(root, candidate, label) {
  const relativePath = path.relative(path.resolve(root), path.resolve(candidate));
  assert(
    relativePath.length > 0
      && relativePath !== ".."
      && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath),
    `${label} must remain inside the disposable Resource Discovery root.`,
  );
}

function resolveFixturePath(root, relativePath) {
  assert(
    typeof relativePath === "string"
      && relativePath.length > 0
      && !relativePath.includes("\\")
      && !path.posix.isAbsolute(relativePath),
    `Invalid fixture-relative path ${String(relativePath)}.`,
  );
  const absolutePath = path.resolve(root, ...relativePath.split("/"));
  assertInsideHostPath(root, absolutePath, `fixture path ${relativePath}`);
  return absolutePath;
}

function resourceDiscoveryObservations(start = 0) {
  return extensionHostObservations.slice(start).filter((event) =>
    event != null
      && typeof event === "object"
      && typeof event.source === "string"
      && typeof event.observationId === "string"
      && typeof event.phase === "string"
  );
}

async function waitForResourceDiscoveryObservation(
  start,
  predicate,
  message,
  timeoutMs = 120_000,
) {
  let match;
  await waitFor(() => {
    match = resourceDiscoveryObservations(start).find(predicate);
    return match != null;
  }, () => `${message}; trace ${JSON.stringify(resourceDiscoveryObservations(start).slice(-40))}`, timeoutMs);
  return match;
}

function observationsForPublication(publication) {
  assert.strictEqual(publication.source, "resource-explorer");
  assert.strictEqual(publication.phase, "publish-complete");
  return extensionHostObservations.filter((event) =>
    event.source === "resource-explorer"
      && event.phase === "publish-node"
      && event.observationId === publication.observationId
      && event.generation === publication.generation
      && event.publicationKind === publication.publicationKind
  );
}

function authenticatedBaselineNodes(consumer) {
  const nodes = resourceDiscoveryEvidence.baselineNodes;
  assert(
    Array.isArray(nodes) && nodes.length > 0,
    `The authenticated baseline publication must exist before ${consumer}.`,
  );
  return nodes;
}

function exactPublishedProjectNode(nodes, projectKey) {
  const matches = nodes.filter((node) =>
    node.nodeKind === "project" && node.label.split(" · ").includes(projectKey)
  );
  assert.strictEqual(matches.length, 1, `Expected one published project node for ${projectKey}.`);
  return matches[0];
}

function publishedDescendants(nodes, ancestorId) {
  const admitted = new Set([ancestorId]);
  return nodes.filter((node) => {
    if (!admitted.has(node.parentId)) return false;
    admitted.add(node.nodeId);
    return true;
  });
}

function publishedProjectBoundary(nodes, projectNode) {
  assert.strictEqual(projectNode.nodeKind, "project");
  const descendants = publishedDescendants(nodes, projectNode.nodeId);
  const workspaceIdentities = new Set();
  const projectKeys = new Set();
  for (const descendant of descendants) {
    for (const workspaceIdentity of [
      descendant.navigationWorkspaceIdentity,
      descendant.implementationWorkspaceIdentity,
    ]) {
      if (workspaceIdentity != null) workspaceIdentities.add(workspaceIdentity);
    }
    for (const projectKey of [
      descendant.navigationProjectKey,
      descendant.implementationProjectKey,
    ]) {
      if (projectKey != null) projectKeys.add(projectKey);
    }
  }
  assert.strictEqual(
    workspaceIdentities.size,
    1,
    `Project ${projectNode.nodeId} must resolve one workspace identity through its baseline descendants.`,
  );
  assert.strictEqual(
    projectKeys.size,
    1,
    `Project ${projectNode.nodeId} must resolve one project key through its baseline descendants.`,
  );
  return {
    workspaceIdentity: [...workspaceIdentities][0],
    projectKey: [...projectKeys][0],
  };
}

function observedWorkspaceIdentity(workspaceKey) {
  assert(typeof workspaceKey === "string" && workspaceKey.length > 0);
  return `workspace:${sha256Bytes(Buffer.from(workspaceKey, "utf8"))}`;
}

function codeUnitSorted(values) {
  return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

async function refreshResourceExplorer(message, predicate = () => true) {
  const start = extensionHostObservations.length;
  await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
  return await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-explorer"
      && event.phase === "publish-complete"
      && event.publicationKind === "current"
      && predicate(event, observationsForPublication(event)),
    message,
  );
}

async function awaitRoutedSemanticReadinessAndExplorerPublication(message) {
  const document = await showAureliaDocument("src/app.html", routedAureliaWorkspace);
  await waitFor(
    async () => (await hoverMarkdown(document, 'load="items"', "items")) === staticRoutePathHoverMarkdown,
    `${message}: the routed static route should answer through the native hover provider`,
    120_000,
  );
  const witness = resourceDiscoveryAcceptance.fixture.witnesses.longSuffixDuplicates;
  const workspaceIdentity = observedWorkspaceIdentity(resourceDiscoveryAcceptance.workspaceKey);
  return await refreshResourceExplorer(
    `${message}: the current Explorer publication should contain both routed duplicate declarations`,
    (_complete, nodes) => witness.rows.every((row) => nodes.some((node) =>
        node.navigationWorkspaceIdentity === workspaceIdentity
          && node.navigationProjectKey === witness.projectKey
          && node.navigationResourceIdentity === row.identityKey
      )),
  );
}

async function armResourceDiscoveryControl({
  controlId,
  operation,
  stage,
  effect,
  includeTypeSurfaces,
  projectKey,
  stableCode,
}) {
  const start = extensionHostObservations.length;
  const match = {
    workspaceKey: resourceDiscoveryAcceptance.workspaceKey,
    ...(includeTypeSurfaces == null ? {} : { includeTypeSurfaces }),
    ...(projectKey == null ? {} : { projectKey }),
  };
  process.emit(resourceDiscoveryHostControlEvent, {
    schemaVersion: resourceDiscoveryHostControlSchema,
    action: "arm",
    controlId,
    operation,
    stage,
    match,
    effect,
    ...(stableCode == null ? {} : { stableCode }),
  });
  return await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && (event.phase === "armed" || event.phase === "rejected"),
    `control ${controlId} should be armed`,
  ).then((event) => {
    assert.strictEqual(event.phase, "armed", `Control ${controlId} was rejected: ${event.reason}.`);
    return event;
  });
}

async function emitResourceDiscoveryControlReset(controlId) {
  const start = extensionHostObservations.length;
  process.emit(resourceDiscoveryHostControlEvent, {
    schemaVersion: resourceDiscoveryHostControlSchema,
    action: "reset",
    controlId,
  });
  const reset = await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && event.phase === "reset",
    `control reset boundary ${controlId} should be observed`,
  );
  assert.strictEqual(reset.pending, false, `Control reset boundary ${controlId} must be quiet.`);
  return reset;
}

async function releaseResourceDiscoveryControl(controlId) {
  const start = extensionHostObservations.length;
  process.emit(resourceDiscoveryHostControlEvent, {
    schemaVersion: resourceDiscoveryHostControlSchema,
    action: "release",
    controlId,
  });
  const released = await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && (event.phase === "released" || event.phase === "rejected"),
    `control ${controlId} should be released`,
  );
  assert.strictEqual(released.phase, "released", `Control ${controlId} was not blocked.`);
  return released;
}

function startObservedCommand(command) {
  const start = extensionHostObservations.length;
  let settled = false;
  const execution = Promise.resolve(vscode.commands.executeCommand(command)).then(
    (value) => {
      settled = true;
      return { status: "fulfilled", value };
    },
    (error) => {
      settled = true;
      return { status: "rejected", error };
    },
  );
  return { command, execution, start, settled: () => settled };
}

async function waitForQuickPickModel(flow, modelOrdinal) {
  const ready = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "resource-quick-pick"
      && event.phase === "model-ready"
      && event.modelOrdinal === modelOrdinal,
    `${flow.command} should publish Quick Pick model ${modelOrdinal}`,
    flow.settled,
    120_000,
  );
  const items = extensionHostObservations.filter((event) =>
    event.source === "resource-quick-pick"
      && event.observationId === ready.observationId
      && event.phase === "model-item"
      && event.modelOrdinal === modelOrdinal
  ).sort((left, right) => left.itemOrdinal - right.itemOrdinal);
  assert.strictEqual(items.length, ready.itemCount);
  return { ready, items };
}

async function activateQuickPickOrdinal(flow, model, targetOrdinal) {
  return await driveNativeQuickPickOrdinal({
    command: flow.command,
    flowStart: flow.start,
    model,
    targetOrdinal,
    observations: () => extensionHostObservations,
    dispatchSelectNext: async () => {
      await vscode.commands.executeCommand("workbench.action.quickOpenSelectNext");
    },
    waitForActive: async (start, predicate, message) => await waitForExtensionHostObservation(
      start,
      predicate,
      message,
      flow.settled,
    ),
  });
}

async function acceptQuickPickOrdinal(flow, model, targetOrdinal) {
  await activateQuickPickOrdinal(flow, model, targetOrdinal);
  return await acceptNativeQuickPickOrdinal({
    command: flow.command,
    flowStart: flow.start,
    model,
    targetOrdinal,
    observations: () => extensionHostObservations,
    dispatchAccept: async () => {
      await vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem");
    },
    waitForAccept: async (start, predicate, message) => await waitForExtensionHostObservation(
      start,
      predicate,
      message,
      flow.settled,
    ),
    closeQuickPick: async () => {
      await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
    },
    waitForSettlement: async (timeoutMs) => await waitFor(
      flow.settled,
      `${flow.command} should settle after failed Quick Pick acceptance cleanup`,
      timeoutMs,
    ),
  });
}

async function waitForAvailabilitySelection(
  flow,
  selectionKind,
  modelOrdinal,
  predicate = () => true,
  start = flow.start,
) {
  return await waitForExtensionHostObservation(
    start,
    (event) => event.source === "go-to-available-resource"
      && event.phase === "availability-selection"
      && event.selectionKind === selectionKind
      && predicate(event),
    `${flow.command} should publish its ${selectionKind} selection for model ${modelOrdinal}`,
    flow.settled,
  );
}

function exactQuickPickOrdinal(model, predicate, label) {
  const matches = model.items.filter((item) => item.itemKind === "item" && predicate(item));
  assert.strictEqual(matches.length, 1, `Expected one ${label} Quick Pick item, observed ${JSON.stringify(matches)}.`);
  return matches[0].itemOrdinal;
}

async function settleObservedCommand(flow, message) {
  await waitFor(flow.settled, message, 120_000);
  const result = await flow.execution;
  if (result.status === "rejected") throw result.error;
  return result.value;
}

async function invokeObservedTreeAction(command, node, expectedPhase = "opened", predicate = () => true) {
  assert.strictEqual(node.source, "resource-explorer");
  assert.strictEqual(node.phase, "publish-node");
  assert.match(node.nodeId, /^tree-node:[a-f0-9]{64}$/u);
  const start = extensionHostObservations.length;
  const execution = Promise.resolve(vscode.commands.executeCommand(command, { id: node.nodeId }));
  const terminal = await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-navigation"
      && event.phase === expectedPhase
      && predicate(event),
    `${command} should publish resource-navigation/${expectedPhase}`,
  );
  await execution;
  return terminal;
}

function publicEditorFact() {
  const editor = vscode.window.activeTextEditor;
  return editor == null
    ? { uri: null, line: null, character: null }
    : {
        uri: editor.document.uri.toString(),
        line: editor.selection.active.line,
        character: editor.selection.active.character,
      };
}

async function replaceAndSaveDocumentText(document, text) {
  await replaceDocumentText(document, text);
  assert.strictEqual(await document.save(), true, `Expected ${document.uri.toString()} to save.`);
}

async function replaceUniqueDocumentSubstringAndSave(document, before, after, cursor) {
  const text = document.getText();
  const replacementOffset = text.indexOf(before);
  assert(replacementOffset >= 0, "The exact scope dependency substring must exist.");
  assert.strictEqual(
    text.indexOf(before, replacementOffset + before.length),
    -1,
    "The exact scope dependency substring must be unique.",
  );
  const cursorPosition = new vscode.Position(cursor.line, cursor.character);
  const cursorOffset = document.offsetAt(cursorPosition);
  assert(replacementOffset > cursorOffset, "The scope dependency edit must remain after the active cursor.");
  const editor = vscode.window.activeTextEditor;
  assert(editor && editor.document.uri.toString() === document.uri.toString());
  assert.strictEqual(editor.selection.active.line, cursorPosition.line);
  assert.strictEqual(editor.selection.active.character, cursorPosition.character);
  const editorBefore = publicEditorFact();
  const probeStart = Math.max(0, cursorOffset - 16);
  const probeEnd = Math.min(replacementOffset, cursorOffset + 16);
  assert(probeEnd > cursorOffset, "The active cursor must retain a nonempty source-text probe.");
  const cursorText = text.slice(probeStart, probeEnd);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(
      document.positionAt(replacementOffset),
      document.positionAt(replacementOffset + before.length),
    ),
    after,
  );
  assert.strictEqual(await vscode.workspace.applyEdit(edit), true, "The exact scope dependency edit must apply.");
  assert.strictEqual(await document.save(), true, `Expected ${document.uri.toString()} to save.`);
  assert.deepStrictEqual(publicEditorFact(), editorBefore, "The exact post-cursor edit must not remap the editor cursor.");
  assert.strictEqual(
    document.getText().slice(probeStart, probeEnd),
    cursorText,
    "The exact post-cursor edit must preserve the active cursor's source text.",
  );
}

async function runAvailabilityRestartRace({
  baselineResponse,
  controlId,
  excludedAppRootIdentityKey,
  expectedInventoryPresence,
  includedCurrentRow,
  mutate,
  projectKey,
  restartResponse,
  retiredScopeReproof,
  resourceIdentity,
  resourceScent,
  excludedCurrentRow,
  templateDocument,
  templatePosition,
}) {
  const retiredScopeIdentity = baselineResponse.selectedTemplate.scopeIdentityKey;
  const currentScopeIdentity = restartResponse.selectedTemplate.scopeIdentityKey;
  assert.strictEqual(baselineResponse.projectKey, projectKey);
  assert.strictEqual(baselineResponse.result, "answered");
  assert.strictEqual(baselineResponse.selection, "exact");
  assert.strictEqual(baselineResponse.coverage, "complete");
  const baselineSelectableRows = assertAvailabilityModelPartition(baselineResponse);
  assert.strictEqual(retiredScopeReproof.projectKey, projectKey);
  assert.strictEqual(retiredScopeReproof.result, "answered");
  assert.strictEqual(retiredScopeReproof.selection, "absent");
  assert.strictEqual(retiredScopeReproof.coverage, "complete");
  assert.strictEqual(retiredScopeReproof.selectedTemplate, null);
  assert.strictEqual(retiredScopeReproof.rows.length, 0);
  assert.deepStrictEqual(
    retiredScopeReproof.candidates.map((candidate) => candidate.scopeIdentityKey),
    [currentScopeIdentity],
  );
  assert.strictEqual(restartResponse.projectKey, projectKey);
  assert.strictEqual(restartResponse.result, "answered");
  assert.strictEqual(restartResponse.selection, "exact");
  assert.strictEqual(restartResponse.coverage, "complete");
  const currentSelectableRows = assertAvailabilityModelPartition(restartResponse);
  assert(
    !baselineResponse.rows.some((row) => row.identityKey === excludedAppRootIdentityKey),
    "The Stage 6D contextual app root must not appear as a selectable resource in its own baseline scope.",
  );
  assert(
    !restartResponse.rows.some((row) => row.identityKey === excludedAppRootIdentityKey),
    "The Stage 6D contextual app root must not appear as a selectable resource after restart.",
  );
  assert.deepStrictEqual(
    restartResponse.navigationUnavailableIdentityKeys,
    baselineResponse.navigationUnavailableIdentityKeys,
    "The mutation must preserve the exact 27-row external-catalog navigation boundary.",
  );
  assert.strictEqual(restartResponse.candidates.length, 1);
  assert.strictEqual(restartResponse.candidates[0].scopeIdentityKey, currentScopeIdentity);
  assert(baselineSelectableRows.some((row) => row.identityKey === resourceIdentity));
  assert(restartResponse.rows.some((row) => row.identityKey === includedCurrentRow.identityKey));
  assert(!restartResponse.rows.some((row) => row.identityKey === excludedCurrentRow.identityKey));
  assert(currentSelectableRows.some((row) => row.identityKey === includedCurrentRow.identityKey));
  assert(!currentSelectableRows.some((row) => row.identityKey === excludedCurrentRow.identityKey));

  const templateEditor = await vscode.window.showTextDocument(templateDocument, { preview: false });
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  assert.strictEqual(
    vscode.window.activeTextEditor?.document.uri.toString(),
    templateEditor.document.uri.toString(),
    "The availability command must target the exact requested template editor.",
  );
  const position = new vscode.Position(templatePosition.line, templatePosition.character);
  templateEditor.selection = new vscode.Selection(position, position);
  const editorBefore = publicEditorFact();
  const flow = startObservedCommand("aurelia.goToAvailableResource");
  const model = await waitForQuickPickModel(flow, 1);
  const baselineObserved = extensionHostObservations.slice(flow.start).find((event) =>
    event.source === "go-to-available-resource"
      && event.observationId === model.ready.observationId
      && event.phase === "initial-request-response"
  );
  assert(
    baselineObserved,
    `${resourceIdentity} should authenticate its baseline availability model; ${availabilityRaceMismatchDetails(
      flow.start,
      model.ready.observationId,
      baselineObserved,
      model,
    )}`,
  );
  assertAvailabilityResponseObservation(baselineObserved, {
    answerCoverage: baselineResponse.coverage,
    answerResult: baselineResponse.result,
    answerSelection: baselineResponse.selection,
    templateCandidateCount: baselineResponse.candidates.length,
    count: baselineResponse.selectableRowCount,
    projectSelection: "exact",
    resourceCount: baselineResponse.rowCount,
    resourceIdentitySetSha256: resourceIdentitySetSha256(baselineResponse.rows),
    selectedProjectKey: baselineResponse.projectKey,
    selectedTemplateScopeIdentity: retiredScopeIdentity,
    soleTemplateCandidateScopeIdentity: retiredScopeIdentity,
    templateSelection: "exact",
  }, availabilityRaceMismatchDetails(flow.start, model.ready.observationId, baselineObserved, model));
  assert.strictEqual(
    model.ready.itemCount,
    baselineResponse.selectableRowCount,
    `${resourceIdentity} baseline model count changed; ${availabilityRaceMismatchDetails(
      flow.start,
      model.ready.observationId,
      baselineObserved,
      model,
    )}`,
  );
  assert.strictEqual(
    model.items.filter((item) =>
      item.itemKind === "item" && item.label === baselineResponse.selectedTemplate.definitionName
    ).length,
    0,
    "The contextual app root must remain absent from its own exact one-item baseline model.",
  );
  const targetOrdinal = exactQuickPickOrdinal(
    model,
    (item) => item.label === "duplicate-card"
      && typeof item.detail === "string"
      && item.detail.includes(resourceScent),
    `${resourceIdentity} availability row`,
  );
  await armResourceDiscoveryControl({
    controlId,
    operation: "inventory",
    stage: "before-dispatch",
    effect: "barrier",
    includeTypeSurfaces: false,
  });
  const accepted = await acceptQuickPickOrdinal(flow, model, targetOrdinal);
  const selected = await waitForAvailabilitySelection(
    flow,
    "resource",
    1,
    (event) => event.resourceIdentity === resourceIdentity
      && event.projectKey === projectKey
      && event.templateScopeIdentity === retiredScopeIdentity,
    extensionHostObservations.indexOf(accepted) + 1,
  );
  const freshAvailable = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === selected.observationId
      && event.phase === "fresh-request-response"
      && event.status === "available",
    `${resourceIdentity} should be freshly available at F1`,
    flow.settled,
    120_000,
  );
  assertAvailabilityResponseObservation(freshAvailable, {
    answerCoverage: baselineResponse.coverage,
    answerResult: baselineResponse.result,
    answerSelection: baselineResponse.selection,
    templateCandidateCount: baselineResponse.candidates.length,
    count: baselineResponse.rows.length,
    resourceIdentitySetSha256: resourceIdentitySetSha256(baselineResponse.rows),
    selectedProjectKey: baselineResponse.projectKey,
    selectedTemplateScopeIdentity: retiredScopeIdentity,
    soleTemplateCandidateScopeIdentity: retiredScopeIdentity,
  });
  const blocked = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && event.phase === "blocked",
    `${resourceIdentity} should block its navigation inventory F2`,
    flow.settled,
    120_000,
  );
  assert.strictEqual(blocked.operation, "inventory");
  assert.strictEqual(blocked.stage, "before-dispatch");
  assert.strictEqual(blocked.includeTypeSurfaces, false);
  assert.strictEqual(blocked.responseFingerprint, null);

  const mutationStart = extensionHostObservations.length;
  await mutate();
  const invalidated = await waitForResourceDiscoveryObservation(
    mutationStart,
    (event) => event.source === "resource-explorer-view"
      && event.phase === "invalidation"
      && event.scope === "workspace"
      && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey,
    `${resourceIdentity} mutation should invalidate the exact workspace before F2 release`,
  );
  const released = await releaseResourceDiscoveryControl(controlId);
  const snapshotRefused = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "resource-navigation"
      && event.phase === "refused"
      && event.resourceIdentity === resourceIdentity
      && event.category === "snapshot-changed",
    `${resourceIdentity} navigation should reject its stale F1 snapshot`,
    flow.settled,
    120_000,
  );
  assert.strictEqual(snapshotRefused.editorUnchanged, true);
  const staleRetry = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === selected.observationId
      && event.phase === "navigation-stale-retry"
      && event.resourcePresence === expectedInventoryPresence,
    `${resourceIdentity} should carry authenticated F2 presence into fresh reproof`,
    flow.settled,
    120_000,
  );
  const retiredScopeResponse = await waitForExtensionHostObservation(
    extensionHostObservations.indexOf(staleRetry) + 1,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === selected.observationId
      && event.phase === "fresh-request-response"
      && event.status === "restart",
    `${resourceIdentity} should restart after the selected scope retires`,
    flow.settled,
    120_000,
  );
  assertAvailabilityResponseObservation(retiredScopeResponse, {
    answerCoverage: retiredScopeReproof.coverage,
    answerResult: retiredScopeReproof.result,
    answerSelection: retiredScopeReproof.selection,
    templateCandidateCount: retiredScopeReproof.candidates.length,
    count: retiredScopeReproof.rows.length,
    resourceIdentitySetSha256: resourceIdentitySetSha256(retiredScopeReproof.rows),
    selectedProjectKey: retiredScopeReproof.projectKey,
    selectedTemplateScopeIdentity: null,
    soleTemplateCandidateScopeIdentity: currentScopeIdentity,
  }, availabilityRaceMismatchDetails(flow.start, selected.observationId, retiredScopeResponse));
  const revalidated = await waitForExtensionHostObservation(
    extensionHostObservations.indexOf(retiredScopeResponse) + 1,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === selected.observationId
      && event.phase === "revalidation"
      && event.outcome === "restart",
    `${resourceIdentity} should revalidate as a quiet chooser restart`,
    flow.settled,
    120_000,
  );
  assert.strictEqual(revalidated.rowCount, 0);
  assert.strictEqual(revalidated.editorUnchanged, true);
  const currentModel = await waitForQuickPickModel(flow, 2);
  const currentResponse = extensionHostObservations.slice(
    extensionHostObservations.indexOf(revalidated) + 1,
  ).find((event) => event.source === "go-to-available-resource"
    && event.observationId === selected.observationId
    && event.phase === "initial-request-response");
  assert(
    currentResponse,
    `${resourceIdentity} should query the sole current scope after restarting; ${availabilityRaceMismatchDetails(
      flow.start,
      selected.observationId,
      currentResponse,
      currentModel,
    )}`,
  );
  assert(
    extensionHostObservations.indexOf(currentResponse) < extensionHostObservations.indexOf(currentModel.ready),
    "The current availability response must precede its native Quick Pick model.",
  );
  assertAvailabilityResponseObservation(currentResponse, {
    answerCoverage: restartResponse.coverage,
    answerResult: restartResponse.result,
    answerSelection: restartResponse.selection,
    templateCandidateCount: restartResponse.candidates.length,
    count: restartResponse.selectableRowCount,
    projectSelection: "exact",
    resourceCount: restartResponse.rows.length,
    resourceIdentitySetSha256: resourceIdentitySetSha256(restartResponse.rows),
    selectedProjectKey: restartResponse.projectKey,
    selectedTemplateScopeIdentity: currentScopeIdentity,
    soleTemplateCandidateScopeIdentity: currentScopeIdentity,
    templateSelection: "exact",
  }, availabilityRaceMismatchDetails(flow.start, selected.observationId, currentResponse, currentModel));
  assert.strictEqual(currentModel.ready.observationId, selected.observationId);
  assert.strictEqual(
    currentModel.ready.itemCount,
    restartResponse.selectableRowCount,
    `${resourceIdentity} restarted model count changed; ${availabilityRaceMismatchDetails(
      flow.start,
      selected.observationId,
      currentResponse,
      currentModel,
    )}`,
  );
  const includedRows = currentModel.items.filter((item) =>
    item.itemKind === "item"
      && item.label === "duplicate-card"
      && typeof item.detail === "string"
      && item.detail.includes(includedCurrentRow.shortestUniqueSuffix)
  );
  const excludedRows = currentModel.items.filter((item) =>
    item.itemKind === "item"
      && item.label === "duplicate-card"
      && typeof item.detail === "string"
      && item.detail.includes(excludedCurrentRow.shortestUniqueSuffix)
  );
  assert.strictEqual(includedRows.length, 1, "The exact current duplicate must remain visibly selectable.");
  assert.strictEqual(excludedRows.length, 0, "The retired duplicate must not survive the restarted model.");
  assert.strictEqual(
    currentModel.items.filter((item) =>
      item.itemKind === "item" && item.label === restartResponse.selectedTemplate.definitionName
    ).length,
    0,
    "The contextual app root must remain absent from its own exact one-item restarted model.",
  );

  const cancelStart = extensionHostObservations.length;
  void vscode.commands.executeCommand("workbench.action.closeQuickOpen").then(undefined, () => undefined);
  const modelCancelled = await waitForExtensionHostObservation(
    cancelStart,
    (event) => event.source === "resource-quick-pick"
      && event.observationId === selected.observationId
      && event.modelOrdinal === currentModel.ready.modelOrdinal
      && event.phase === "cancelled",
    `${resourceIdentity} current model should cancel without selection`,
    flow.settled,
  );
  const modelDisposed = await waitForExtensionHostObservation(
    cancelStart,
    (event) => event.source === "resource-quick-pick"
      && event.observationId === selected.observationId
      && event.modelOrdinal === currentModel.ready.modelOrdinal
      && event.phase === "disposed",
    `${resourceIdentity} current model should dispose after cancellation`,
    flow.settled,
  );
  const commandCancelled = await waitForExtensionHostObservation(
    cancelStart,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === selected.observationId
      && event.phase === "cancelled",
    `${resourceIdentity} restarted command should cancel quietly`,
    flow.settled,
  );
  await settleObservedCommand(flow, `${resourceIdentity} restarted command should settle quietly`);
  assert.deepStrictEqual(publicEditorFact(), editorBefore);
  const commandEvents = extensionHostObservations.slice(flow.start).filter((event) =>
    event.observationId === selected.observationId
  );
  const terminalRefusedCount = commandEvents.filter((event) =>
    event.source === "go-to-available-resource" && event.phase === "refused"
  ).length;
  const openedCount = extensionHostObservations.slice(flow.start).filter((event) =>
    (event.source === "resource-navigation" && event.phase === "opened")
      || (event.source === "go-to-available-resource"
        && event.phase === "navigation-complete" && event.status === "opened")
  ).length;
  assert.strictEqual(
    extensionHostObservations.slice(flow.start).filter((event) =>
      event.source === "resource-navigation"
        && event.phase === "refused"
        && event.category === "snapshot-changed"
        && event.resourceIdentity === resourceIdentity
    ).length,
    1,
  );
  assert.strictEqual(invalidated.workspaceKey, resourceDiscoveryAcceptance.workspaceKey);
  assert.strictEqual(terminalRefusedCount, 0);
  assert.strictEqual(openedCount, 0);

  return {
    projectKey,
    identityKey: resourceIdentity,
    retiredScopeIdentity,
    currentScopeIdentity,
    selected,
    freshAvailable,
    blocked,
    invalidated,
    released,
    snapshotRefused,
    staleRetry,
    retiredScopeResponse,
    revalidated,
    currentResponse,
    currentModel: currentModel.ready,
    modelCancelled,
    modelDisposed,
    commandCancelled,
    terminalRefusedCount,
    openedCount,
  };
}

function assertAvailabilityResponseObservation(event, expected, mismatchDetails = "") {
  for (const [field, value] of Object.entries(expected)) {
    assert.strictEqual(
      event[field],
      value,
      `Availability response field ${field} changed.${mismatchDetails.length > 0 ? ` ${mismatchDetails}` : ""}`,
    );
  }
}

function availabilityRaceMismatchDetails(flowStart, observationId, response, model = null) {
  const correlatedTrace = extensionHostObservations.slice(flowStart).filter((event) =>
    event.observationId === observationId
  );
  return `response=${JSON.stringify(response)}; model=${JSON.stringify(model)}; `
    + `correlatedTrace=${JSON.stringify(correlatedTrace)}`;
}

function resourceIdentitySetSha256(rows) {
  return resourceIdentityKeysSha256(rows.map((row) => row.identityKey));
}

function resourceIdentityKeysSha256(identityKeys) {
  const sortedIdentityKeys = [...identityKeys].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  return sha256Bytes(Buffer.from(
    `aurelia-resource-identity-set/1\n${JSON.stringify(sortedIdentityKeys)}`,
    "utf8",
  ));
}

function assertAmbiguityScopeModelPartition(scope) {
  assert.strictEqual(scope.rowCount, scope.resourceIdentityKeys.length);
  assert.strictEqual(scope.selectableRowCount, 0);
  assert(Array.isArray(scope.navigationUnavailableIdentityKeys));
  assert.strictEqual(
    scope.rowCount,
    scope.selectableRowCount + scope.navigationUnavailableIdentityKeys.length,
  );
  assert.strictEqual(
    new Set(scope.navigationUnavailableIdentityKeys).size,
    scope.navigationUnavailableIdentityKeys.length,
  );
  const externalCatalogIdentityKeys = scope.resourceIdentityKeys.filter((identityKey) =>
    identityKey.startsWith("framework-resource:v1:")
  );
  assert.deepStrictEqual(
    scope.navigationUnavailableIdentityKeys,
    externalCatalogIdentityKeys,
    "The ambiguity scope's exact external-catalog population must be navigation-unavailable.",
  );
  const unavailable = new Set(scope.navigationUnavailableIdentityKeys);
  const selectableIdentityKeys = scope.resourceIdentityKeys.filter((identityKey) => !unavailable.has(identityKey));
  assert.strictEqual(selectableIdentityKeys.length, scope.selectableRowCount);
  return selectableIdentityKeys;
}

function assertAvailabilityModelPartition(response) {
  assert.strictEqual(response.rowCount, 28);
  assert.strictEqual(response.rows.length, response.rowCount);
  assert.strictEqual(response.selectableRowCount, 1);
  assert(Array.isArray(response.navigationUnavailableIdentityKeys));
  assert.strictEqual(response.navigationUnavailableIdentityKeys.length, 27);
  assert.strictEqual(
    new Set(response.navigationUnavailableIdentityKeys).size,
    response.navigationUnavailableIdentityKeys.length,
  );
  const rowIdentityKeys = response.rows.map((row) => row.identityKey);
  assert.strictEqual(new Set(rowIdentityKeys).size, rowIdentityKeys.length);
  const externalCatalogIdentityKeys = response.rows
    .filter((row) => row.identityKey.startsWith("framework-resource:v1:"))
    .map((row) => row.identityKey);
  assert.deepStrictEqual(
    response.navigationUnavailableIdentityKeys,
    externalCatalogIdentityKeys,
    "Only the exact external-catalog rows may be navigation-unavailable.",
  );
  assert.strictEqual(
    response.rowCount,
    response.selectableRowCount + response.navigationUnavailableIdentityKeys.length,
  );
  const unavailable = new Set(response.navigationUnavailableIdentityKeys);
  const selectableRows = response.rows.filter((row) => !unavailable.has(row.identityKey));
  assert.strictEqual(selectableRows.length, response.selectableRowCount);
  return selectableRows;
}

async function publishControlledTreeFault({
  controlId,
  effect,
  expectedIssueProjectNodeIds,
  projectKey,
  stableCode,
}) {
  await armResourceDiscoveryControl({
    controlId,
    operation: "inventory",
    stage: "after-response",
    effect,
    includeTypeSurfaces: true,
    projectKey,
    stableCode,
  });
  const start = extensionHostObservations.length;
  await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
  const faultApplied = await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && event.phase === "fault-applied",
    `${controlId} should alter one genuine inventory response`,
  );
  const expectedKind = "current";
  const publication = await waitForResourceDiscoveryObservation(
    extensionHostObservations.indexOf(faultApplied) + 1,
    (event) => event.source === "resource-explorer"
      && event.phase === "publish-complete"
      && event.publicationKind === expectedKind
      && (effect !== "project-error-once"
        || publicationContainsProjectIssue(extensionHostObservations, event, projectKey))
      && (effect !== "all-error-once"
        || publicationHasExactProjectIssueNodeIds(
          extensionHostObservations,
          event,
          expectedIssueProjectNodeIds,
        )),
    `${controlId} should publish the corresponding ${expectedKind} product state`,
  );
  return { faultApplied, publication };
}

async function invokeTreeOutputAction(target) {
  const start = extensionHostObservations.length;
  await vscode.commands.executeCommand("aurelia.openAureliaOutput", { id: target.nodeId });
  return await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-explorer-view"
      && event.phase === "output-requested"
      && event.origin === "tree-action",
    "the real tree Output action should request Aurelia Output",
  );
}

async function retryTreeTarget(target, message, expectedWorkspaceIdentity = null) {
  const start = extensionHostObservations.length;
  const execution = Promise.resolve(vscode.commands.executeCommand(
    "aurelia.retryResourceProject",
    { id: target.nodeId },
  ));
  const retry = await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-explorer-view"
      && event.phase === "retry"
      && event.admitted === true,
    `${message} should invoke the hashed Retry target`,
  );
  const recoveredPublication = await waitForResourceDiscoveryObservation(
    extensionHostObservations.indexOf(retry) + 1,
    (event) => event.source === "resource-explorer"
      && event.phase === "publish-complete"
      && event.publicationKind === "current"
      && (expectedWorkspaceIdentity == null || event.workspaceIdentity === expectedWorkspaceIdentity),
    `${message} should return the tree to a current publication`,
  );
  await execution;
  return { retry, recoveredPublication };
}

async function recoverTreeNavigationWithPrimaryRetry({ controlId, node, stableCode }) {
  await armResourceDiscoveryControl({
    controlId,
    operation: "inventory",
    stage: "after-response",
    effect: "project-error-once",
    includeTypeSurfaces: false,
    projectKey: "host-alpha",
    stableCode,
  });
  const start = extensionHostObservations.length;
  let settled = false;
  const execution = Promise.resolve(vscode.commands.executeCommand(
    "aurelia.openResourceDeclaration",
    { id: node.nodeId },
  )).finally(() => { settled = true; });
  await waitForResourceDiscoveryObservation(
    start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && event.phase === "fault-applied",
    `${controlId} should fault the first navigation requery`,
  );
  const presented = await waitForExtensionHostObservation(
    start,
    (event) => event.source === "resource-explorer-view"
      && event.phase === "recovery-presented",
    "stale tree navigation should present the shipping recovery actions",
    () => settled,
    120_000,
  );
  assertShippingRecoveryPresentation(presented);
  const choiceStart = extensionHostObservations.length;
  void vscode.commands.executeCommand("notification.acceptPrimaryAction").then(undefined, () => undefined);
  const choice = await waitForExtensionHostObservation(
    choiceStart,
    (event) => event.source === "resource-explorer-view"
      && event.observationId === presented.observationId
      && event.phase === "recovery-choice",
    "the public notification command should choose Retry",
    () => settled,
  );
  assert.strictEqual(choice.choice, "Retry");
  const retryInvalidated = await waitForResourceDiscoveryObservation(
    extensionHostObservations.indexOf(choice) + 1,
    (event) => event.source === "resource-explorer-view"
      && event.phase === "invalidation"
      && event.scope === "workspace"
      && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey,
    "the notification Retry should invalidate the exact stale workspace",
  );
  const recoveredPublication = await waitForResourceDiscoveryObservation(
    extensionHostObservations.indexOf(retryInvalidated) + 1,
    (event) => event.source === "resource-explorer"
      && event.phase === "publish-complete"
      && event.publicationKind === "current"
      && event.workspaceIdentity === node.navigationWorkspaceIdentity,
    "the notification Retry should publish the recovered workspace before reopening",
  );
  const semanticStart = extensionHostObservations.length;
  await execution;
  // Retry reopens the restored declaration from disk without changing its
  // effective source text. That clean open must leave the recovered tree intact;
  // the explicit readiness/refresh below is the only ensuing publication.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const reopenTrace = resourceDiscoveryObservations(semanticStart);
  const reopenInvalidations = reopenTrace.filter((event) =>
    event.source === "resource-explorer-view"
      && event.phase === "invalidation"
      && event.workspaceKey === resourceDiscoveryAcceptance.workspaceKey
  );
  const reopenPublications = reopenTrace.filter((event) =>
    event.source === "resource-explorer"
      && ["publish-start", "publish-node", "publish-complete", "view-state"].includes(event.phase)
  );
  assert.deepStrictEqual(
    reopenInvalidations,
    [],
    `the clean reopened declaration must not invalidate routed semantics; trace ${JSON.stringify(reopenTrace)}`,
  );
  assert.deepStrictEqual(
    reopenPublications,
    [],
    `the clean reopened declaration must not republish the recovered tree; trace ${JSON.stringify(reopenTrace)}`,
  );
  await awaitRoutedSemanticReadinessAndExplorerPublication(
    "newest navigation clean reopen explicit recovery refresh",
  );
  return { presented, choice, retryInvalidated, recoveredPublication };
}

async function recoverAvailableNavigationWithPrimaryRetry({ controlId, stableCode }) {
  const fixture = resourceDiscoveryAcceptance.fixture;
  const race = fixture.witnesses.shiftedAndRemovedNavigation.availabilityRace;
  const left = fixture.witnesses.longSuffixDuplicates.rows[0];
  const document = await showAureliaDocument(race.template.relativePath, routedAureliaWorkspace);
  assert.strictEqual(sha256Bytes(Buffer.from(document.getText(), "utf8")), race.template.sha256);
  const position = new vscode.Position(race.template.cursor.line, race.template.cursor.character);
  vscode.window.activeTextEditor.selection = new vscode.Selection(position, position);
  const flow = startObservedCommand("aurelia.goToAvailableResource");
  const model = await waitForQuickPickModel(flow, 1);
  const ordinal = exactQuickPickOrdinal(
    model,
    (item) => item.label === "duplicate-card"
      && typeof item.detail === "string"
      && item.detail.includes(left.shortestUniqueSuffix),
    "total-recovery resource",
  );
  await armResourceDiscoveryControl({
    controlId,
    operation: "inventory",
    stage: "after-response",
    effect: "project-error-once",
    includeTypeSurfaces: false,
    projectKey: "host-alpha",
    stableCode,
  });
  const accepted = await acceptQuickPickOrdinal(flow, model, ordinal);
  await waitForAvailabilitySelection(
    flow,
    "resource",
    1,
    (event) => event.resourceIdentity === left.identityKey,
    extensionHostObservations.indexOf(accepted) + 1,
  );
  await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "resource-discovery-host-control"
      && event.observationId === controlId
      && event.phase === "fault-applied",
    "the total-recovery navigation should fault one real inventory requery",
    flow.settled,
    120_000,
  );
  const presented = await waitForExtensionHostObservation(
    flow.start,
    (event) => event.source === "go-to-available-resource"
      && event.phase === "recovery-presented",
    "the active-template command should present shipping recovery after the navigation fault",
    flow.settled,
    120_000,
  );
  assertShippingRecoveryPresentation(presented);
  const choiceStart = extensionHostObservations.length;
  void vscode.commands.executeCommand("notification.acceptPrimaryAction").then(undefined, () => undefined);
  const choice = await waitForExtensionHostObservation(
    choiceStart,
    (event) => event.source === "go-to-available-resource"
      && event.observationId === presented.observationId
      && event.phase === "recovery-choice",
    "the active-template notification should choose Retry",
    flow.settled,
  );
  assert.strictEqual(choice.choice, "Retry");
  await settleObservedCommand(flow, "the active-template navigation should succeed on its genuine Retry");
  return { presented, choice };
}

function assertShippingRecoveryPresentation(event) {
  assert.strictEqual(event.actionCount, 2);
  assert.strictEqual(event.retryActionLabel, "Retry");
  assert.strictEqual(event.outputActionLabel, "Open Aurelia Output");
  assert(typeof event.message === "string" && !event.message.includes("AURELIA_RD_C2_"));
}

function visibleStableCodeCount(stableCode) {
  const visibleFields = ["label", "description", "accessibilityLabel", "message", "title", "placeholder"];
  return extensionHostObservations.filter((event) =>
    event.source !== "resource-discovery-host-control"
      && visibleFields.some((field) => typeof event[field] === "string" && event[field].includes(stableCode))
  ).length;
}

async function inspectEmptyAvailabilityModel(label) {
  const flow = startObservedCommand("aurelia.goToAvailableResource");
  const model = await waitForQuickPickModel(flow, 1);
  assert.strictEqual(model.ready.itemCount, 0, `${label} should not publish selectable resource rows.`);
  const response = extensionHostObservations.slice(flow.start).find((event) =>
    event.source === "go-to-available-resource"
      && event.observationId === model.ready.observationId
      && event.phase === "initial-request-response"
  );
  assert(response, `${label} should publish a bounded availability response receipt.`);
  const closeStart = extensionHostObservations.length;
  void vscode.commands.executeCommand("workbench.action.closeQuickOpen").then(undefined, () => undefined);
  const pickerCancelled = await waitForExtensionHostObservation(
    closeStart,
    (event) => event.source === "resource-quick-pick"
      && event.observationId === model.ready.observationId
      && event.phase === "cancelled",
    `${label} should cancel its empty native picker`,
    flow.settled,
  );
  await settleObservedCommand(flow, `${label} should settle after quiet cancellation`);
  const trace = extensionHostObservations.slice(flow.start).filter((event) =>
    event.observationId === model.ready.observationId
  );
  assert.strictEqual(trace.filter((event) =>
    event.source === "go-to-available-resource"
      && event.phase === "cancelled"
      && event.stage === "selection"
  ).length, 1, `${label} should terminate as one selection cancellation.`);
  assert.strictEqual(trace.filter((event) =>
    event.phase === "recovery-presented" || event.phase === "output-requested"
  ).length, 0, `${label} should not present recovery or request Output.`);
  assert.strictEqual(pickerCancelled.modelOrdinal, model.ready.modelOrdinal);
  return { modelReady: model.ready, response };
}

async function showAureliaDocument(relativePath, workspaceRoot = aureliaWorkspace) {
  const uri = vscode.Uri.file(path.join(workspaceRoot, ...relativePath.split("/")));
  let document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString())
    ?? await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
  if (relativePath.endsWith(".html")) {
    const suppressNative = templateDiagnosticsSuppressNative(uri);
    const expectedLanguageId = suppressNative ? "aurelia-html" : "html";
    document = await waitForExactDocumentLanguage(
      vscode.workspace,
      uri,
      expectedLanguageId,
      `the admitted Aurelia template ${relativePath} with suppressNative=${suppressNative}`,
      waitFor,
    );
    await vscode.window.showTextDocument(document, { preview: false });
  }
  return document;
}

function templateDiagnosticsSuppressNative(uri) {
  return vscode.workspace
    .getConfiguration("aurelia", uri)
    .get("templateDiagnostics.suppressNative", false) === true;
}

function snapshotWorkspaceFolderSettings(workspaceRoot) {
  const directoryPath = path.join(workspaceRoot, ".vscode");
  const settingsPath = path.join(directoryPath, "settings.json");
  const directoryExisted = existsSync(directoryPath);
  const settingsBytes = existsSync(settingsPath) ? readFileSync(settingsPath) : null;
  assert(directoryExisted || settingsBytes == null, "settings.json cannot exist without its .vscode directory");
  return Object.freeze({ directoryExisted, directoryPath, settingsBytes, settingsPath });
}

function restoreWorkspaceFolderSettings(snapshot, label) {
  if (snapshot.settingsBytes == null) {
    if (existsSync(snapshot.settingsPath)) unlinkSync(snapshot.settingsPath);
    assert.strictEqual(existsSync(snapshot.settingsPath), false, `${label} must restore absent settings bytes`);
  } else {
    if (!existsSync(snapshot.settingsPath) || !readFileSync(snapshot.settingsPath).equals(snapshot.settingsBytes)) {
      writeFileSync(snapshot.settingsPath, snapshot.settingsBytes);
    }
    assert.deepStrictEqual(readFileSync(snapshot.settingsPath), snapshot.settingsBytes);
  }

  if (!snapshot.directoryExisted && existsSync(snapshot.directoryPath)) {
    const stats = lstatSync(snapshot.directoryPath);
    assert(stats.isDirectory() && !stats.isSymbolicLink(), `${label} may remove only an exact ordinary .vscode directory`);
    assert.deepStrictEqual(
      readdirSync(snapshot.directoryPath),
      [],
      `${label} must not remove a non-empty .vscode directory`,
    );
    rmdirSync(snapshot.directoryPath);
  }
  assert.strictEqual(
    existsSync(snapshot.directoryPath),
    snapshot.directoryExisted,
    `${label} must restore .vscode directory existence`,
  );
}

async function inlayHints(uri, range) {
  const hints = await vscode.commands.executeCommand("vscode.executeInlayHintProvider", uri, range);
  return Array.isArray(hints) ? hints : [];
}

async function replaceDocumentText(document, text) {
  await replaceDocumentTexts([[document, text]]);
}

async function replaceDocumentTexts(changes) {
  const edit = new vscode.WorkspaceEdit();
  for (const [document, text] of changes) {
    edit.replace(
      document.uri,
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)),
      text,
    );
  }
  assert.strictEqual(await vscode.workspace.applyEdit(edit), true, "Expected workspace edit to apply.");
}

async function executeCodeActionProvider(uri, range, itemResolveCount) {
  const actions = await vscode.commands.executeCommand(
    "vscode.executeCodeActionProvider",
    uri,
    range,
    "quickfix",
    itemResolveCount,
  );
  return Array.isArray(actions) ? actions : [];
}

async function hoverMarkdown(document, anchor, token = anchor) {
  return (await hoversAt(document, anchor, token)).map(hoverMarkdownText).join("\n");
}

async function hoversAt(document, anchor, token = anchor) {
  const position = positionIn(document, anchor, token);
  const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, position);
  return Array.isArray(hovers) ? hovers : [];
}

async function exactHoverAt(document, anchor, token, expectedMarkdown, expectedRangeText = token) {
  const hovers = await hoversAt(document, anchor, token);
  const matches = hovers.filter((hover) => hoverMarkdownText(hover) === expectedMarkdown);
  assert.strictEqual(
    matches.length,
    1,
    `Expected one exact hover for ${token}; observed ${JSON.stringify(hovers.map(hoverMarkdownText))}.`,
  );
  const hover = matches[0];
  assert(hover.range instanceof vscode.Range, `Expected ${token} hover to retain an authored range.`);
  assert.strictEqual(document.getText(hover.range), expectedRangeText);
  assertBoundedHoverCard(expectedMarkdown, token);
  return hover;
}

async function exactHoverMatchingAt(document, anchor, token, predicate, label) {
  const hovers = await hoversAt(document, anchor, token);
  const matches = hovers.filter((hover) => predicate(hoverMarkdownText(hover)));
  assert.strictEqual(
    matches.length,
    1,
    `Expected one exact ${label} hover; observed ${JSON.stringify(hovers.map(hoverMarkdownText))}.`,
  );
  const hover = matches[0];
  assert(hover.range instanceof vscode.Range, `Expected ${label} hover to retain an authored range.`);
  assert.strictEqual(document.getText(hover.range), token);
  return hover;
}

async function noHoverAt(document, anchor, token) {
  const hovers = await hoversAt(document, anchor, token);
  assert.deepStrictEqual(
    hovers.map(hoverMarkdownText),
    [],
    `Expected no hover for ${token}.`,
  );
}

function assertBoundedHoverCard(markdown, label) {
  const codePoints = Array.from(markdown).length;
  assert(codePoints > 0, `Expected a nonempty ${label} hover card.`);
  assert(codePoints <= 640, `${label} hover emitted ${codePoints} Markdown code points.`);
  const sections = markdown.split("\n\n");
  assert(sections.length <= 3, `${label} hover emitted ${sections.length} sections.`);
  const logicalLines = sections.reduce(
    (count, section) => count + (section.startsWith("```") ? 1 : section.split("\n").length),
    0,
  );
  assert(logicalLines <= 6, `${label} hover emitted ${logicalLines} logical lines.`);
  assertHoverLeafBudgets(markdown, label);
  assertNoImplementationVocabulary(markdown, label);
}

function assertHoverLeafBudgets(markdown, label) {
  const sections = markdown.split("\n\n");
  const firstSection = sections[0] ?? "";
  const identity = firstSection.startsWith("`") ? hoverIdentityLine(markdown) : null;
  if (identity != null) {
    const identityCodePoints = Array.from(identity).length;
    assert(identityCodePoints <= 300, `${label} identity exceeded the 300-code-point hard limit.`);
    assert(identityCodePoints <= 160, `${label} ordinary identity exceeded the 160-code-point soft limit.`);
  }
  const proseSections = identity == null ? sections : sections.slice(1);
  for (const line of proseSections.flatMap((section) => section.split("\n"))) {
    const lineCodePoints = Array.from(line).length;
    if (/^(Error|Information|Warning)\s+`/u.test(line)) {
      assert(lineCodePoints <= 240, `${label} diagnostic status exceeded 240 code points.`);
    } else {
      assert(lineCodePoints <= 160, `${label} context or uncertainty line exceeded 160 code points.`);
    }
  }
}

function hoverIdentityLine(markdown) {
  const section = markdown.split("\n\n", 1)[0] ?? "";
  const lines = section.split("\n");
  assert(lines.length === 3, `Expected one well-formed fenced identity line, received ${section}.`);
  const opening = lines[0].match(/^(`{3,})(?:html|text|ts)$/u);
  assert(opening, `Expected a supported fenced identity opening, received ${lines[0]}.`);
  assert.strictEqual(lines[2], opening[1], "Expected the identity fence to close with the same delimiter.");
  return lines[1];
}

function assertNoImplementationVocabulary(markdown, label) {
  const normalized = markdown.toLowerCase();
  for (const forbidden of [
    "binding-observation",
    "binding-source-context:",
    "checker origin",
    "expression-member-owner-type:",
    "generated path",
    "missing-input",
    "missinginputs",
    "openkind",
    "openreason",
    "owner origin:",
    "producthandle",
    "router-navigation-target-",
    "scope-slot:",
    "selected-expression-type:",
    "semantic-authoring-policy",
    "shapekind",
    "sourceaddresshandle",
    "type origin:",
    "type shape:",
    "type-projection",
    "value-site",
  ]) {
    assert(!normalized.includes(forbidden), `${label} hover leaked implementation vocabulary ${forbidden}.`);
  }
}

function hoverMarkdownText(hover) {
  return (hover?.contents ?? []).map((content) =>
    typeof content === "string" ? content : content?.value ?? ""
  ).join("\n");
}

async function definitionsAt(document, anchor, token = anchor) {
  const position = positionIn(document, anchor, token);
  const definitions = await vscode.commands.executeCommand(
    "vscode.executeDefinitionProvider",
    document.uri,
    position,
  );
  if (!Array.isArray(definitions)) return [];
  return definitions.flatMap((definition) => {
    const uri = definition?.targetUri ?? definition?.uri;
    return uri == null ? [] : [uri];
  });
}

async function completionsAt(document, anchor, token = anchor) {
  const position = positionIn(document, anchor, token);
  const completions = await vscode.commands.executeCommand(
    "vscode.executeCompletionItemProvider",
    document.uri,
    position,
  );
  if (Array.isArray(completions)) return completions;
  return Array.isArray(completions?.items) ? completions.items : [];
}

function completionLabel(item) {
  return typeof item?.label === "string" ? item.label : item?.label?.label ?? null;
}

function completionInsertText(item) {
  return typeof item?.insertText === "string" ? item.insertText : item?.insertText?.value ?? null;
}

function completionReplacementRange(item) {
  if (item?.range instanceof vscode.Range) return item.range;
  return item?.range?.replacing ?? item?.range?.inserting ?? null;
}

async function referencesAt(document, anchor, token = anchor) {
  const position = positionIn(document, anchor, token);
  const references = await vscode.commands.executeCommand(
    "vscode.executeReferenceProvider",
    document.uri,
    position,
  );
  return Array.isArray(references) ? references : [];
}

async function documentSymbols(uri) {
  const symbols = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", uri);
  return Array.isArray(symbols) ? symbols : [];
}

async function workspaceSymbols(query) {
  const symbols = await vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query);
  return Array.isArray(symbols) ? symbols : [];
}

async function assertWorkspaceAnswer(document, workspaceRoot) {
  const resourceHover = await hoverMarkdown(document, "<product-card", "product-card");
  assert.strictEqual(resourceHover, productCardHoverMarkdown);
  assertBoundedHoverCard(resourceHover, "workspace resource");
  const definitions = await definitionsAt(document, "<product-card", "product-card");
  assert(definitions.some((uri) =>
    normalize(uri.fsPath) === normalize(path.join(workspaceRoot, "src", "components", "product-card.ts"))
  ), `Expected product-card to resolve inside ${workspaceRoot}.`);
}

async function waitForWorkspaceAnswer(document, workspaceRoot, message) {
  await waitFor(async () => {
    await assertWorkspaceAnswer(document, workspaceRoot);
    return true;
  }, message, 60_000);
}

function findWorkspaceFolder(workspaceRoot) {
  return vscode.workspace.workspaceFolders?.find((candidate) =>
    normalize(candidate.uri.fsPath) === normalize(workspaceRoot)
  );
}

async function applyWorkspaceFolderUpdate(
  start,
  deleteCount,
  additions,
  message,
) {
  return await applyWorkspaceFolderUpdateContract(start, deleteCount, additions, message, {
    workspace: vscode.workspace,
    wait: waitFor,
  });
}

async function executeAndAcceptQuickPick(command) {
  const observationStart = extensionHostObservations.length;
  let executionSettled = false;
  const execution = Promise.resolve(vscode.commands.executeCommand(command)).then(
    (value) => {
      executionSettled = true;
      return { status: "fulfilled", value };
    },
    (error) => {
      executionSettled = true;
      return { status: "rejected", error };
    },
  );
  let observationId;

  try {
    const ready = await waitForExtensionHostObservation(
      observationStart,
      (event) => event.source === "resource-quick-pick"
        && event.phase === "model-ready",
      `${command} should publish a Quick Pick model`,
      () => executionSettled,
    );
    observationId = ready.observationId;
    assert(ready.itemCount > 0, `${command} published an empty Quick Pick model.`);

    // Programmatic Quick Picks do not expose their active row to the Extension Host test API. Accept an activation
    // already observed while the model was published; otherwise move once and wait for the correlated receipt.
    const isActiveReceipt = (event) => event.source === "resource-quick-pick"
      && event.observationId === observationId
      && event.phase === "active-changed"
      && typeof event.activeLabel === "string"
      && event.activeLabel.length > 0;
    let active = extensionHostObservations.slice(observationStart).find(isActiveReceipt);
    if (active == null) {
      const activeStart = extensionHostObservations.length;
      void vscode.commands.executeCommand("workbench.action.quickOpenSelectNext").then(undefined, () => {});
      active = await waitForExtensionHostObservation(
        activeStart,
        isActiveReceipt,
        `${command} should activate one Quick Pick item`,
        () => executionSettled,
      );
    }
    assert(active.activeLabel, `${command} activated an empty Quick Pick selection.`);
    // The workbench command may remain pending until the contributed command completes. Its event is the receipt.
    const accept = Promise.resolve(
      vscode.commands.executeCommand("workbench.action.acceptSelectedQuickOpenItem"),
    ).then(undefined, () => undefined);
    const accepted = await waitForExtensionHostObservation(
      observationStart,
      (event) => event.source === "resource-quick-pick"
        && event.observationId === observationId
        && event.phase === "accept"
        && typeof event.selectedLabel === "string"
        && event.selectedLabel.length > 0,
      `${command} should accept one selected Quick Pick item`,
      () => executionSettled,
    );
    assert(accepted.selectedLabel, `${command} accepted an empty Quick Pick selection.`);

    await waitFor(
      () => executionSettled,
      `${command} should settle after the selected Quick Pick item is accepted`,
      60_000,
    );
    const result = await execution;
    void accept;
    if (result.status === "rejected") throw result.error;

    if (command === "aurelia.goToAvailableResource") {
      const trace = extensionHostObservations.slice(observationStart)
        .filter((event) => event.observationId === observationId);
      assert(trace.some((event) => event.source === "go-to-available-resource"
        && event.phase === "fresh-request-response"
        && event.status === "available"), "Expected fresh resource availability before navigation.");
      assert(trace.some((event) => event.source === "go-to-available-resource"
        && event.phase === "navigation-complete"
        && event.status === "opened"), "Expected active-template resource navigation to complete.");
    }
  } catch (error) {
    await Promise.resolve(vscode.commands.executeCommand("workbench.action.closeQuickOpen")).catch(() => undefined);
    await Promise.race([execution, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    const trace = extensionHostObservations.slice(observationStart)
      .filter((event) => observationId == null || event.observationId === observationId);
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n`
      + `Extension Host Quick Pick trace: ${JSON.stringify(trace)}`
      + (executionSettled ? "" : "\nThe contributed command remained in flight after closing the Quick Pick."));
  }
}

async function waitForExtensionHostObservation(
  start,
  predicate,
  message,
  executionSettled,
  timeoutMs = 60_000,
) {
  let matched;
  await waitFor(() => {
    matched = extensionHostObservations.slice(start).find(predicate);
    if (matched != null) return true;
    if (executionSettled()) throw new Error(`${message}; the command settled before that phase.`);
    return false;
  }, message, timeoutMs);
  return matched;
}

function assertAuthoredResourceDocument(document, originUri, admittedRoots) {
  assert(document, "Expected resource navigation to leave an active editor.");
  assert.notStrictEqual(document.uri.toString(), originUri.toString(), "Expected navigation away from the template.");
  const authoredRoot = admittedAuthoredRoot(
    document.uri.fsPath,
    admittedRoots,
    new Map([[
      routedAureliaWorkspace,
      authenticatedFixtureFilePaths(resourceDiscoveryAcceptance.fixture),
    ]]),
    realpathSync,
  );
  assert(
    authoredRoot != null,
    `Expected a resource authored in ${admittedRoots.join(", ")}, received ${document.uri.toString()}.`,
  );
}

function positionIn(document, anchor, token = anchor) {
  const text = document.getText();
  const anchorOffset = text.indexOf(anchor);
  assert.notStrictEqual(anchorOffset, -1, `Expected anchor ${anchor}.`);
  const tokenOffset = text.indexOf(token, anchorOffset);
  assert.notStrictEqual(tokenOffset, -1, `Expected token ${token} after ${anchor}.`);
  return document.positionAt(tokenOffset + Math.max(0, Math.floor(token.length / 2)));
}

function normalizeFileWorkspaceKey(workspaceKey) {
  const uri = vscode.Uri.parse(workspaceKey, true);
  return uri.scheme === "file" ? normalize(uri.fsPath) : null;
}

function executableFixtureResourceIdentities(fixture) {
  const identities = new Set();
  const visit = (value) => {
    if (typeof value === "string") {
      if (/^(?:typescript|framework|local-template)-resource:v1:/u.test(value)) identities.add(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value != null && typeof value === "object") {
      for (const item of Object.values(value)) visit(item);
    }
  };
  visit(fixture.witnesses);
  return identities;
}

function normalize(value) {
  return path.normalize(value).toLowerCase();
}

async function waitFor(predicate, message, timeoutMs = 20_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      if (await predicate()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (lastError) throw lastError;
  throw new Error(typeof message === "function" ? message() : message);
}

function diagnosticSummary(diagnostics) {
  return JSON.stringify(diagnostics.map((diagnostic) => ({
    source: diagnostic.source ?? null,
    code: diagnosticCode(diagnostic),
    severity: diagnostic.severity,
    message: diagnostic.message,
    range: [
      diagnostic.range.start.line,
      diagnostic.range.start.character,
      diagnostic.range.end.line,
      diagnostic.range.end.character,
    ],
  })));
}

function nativeCssDiagnostics(uri) {
  return vscode.languages.getDiagnostics(uri).filter((diagnostic) => diagnostic.source === "css");
}

function hasExactNativeInterpolationDiagnostics(uri) {
  const codes = new Set(nativeCssDiagnostics(uri).map(diagnosticCode));
  return codes.has("css-propertyvalueexpected") && codes.has("css-ruleorselectorexpected");
}

function diagnosticCode(diagnostic) {
  return typeof diagnostic.code === "object" ? diagnostic.code?.value ?? null : diagnostic.code ?? null;
}

function actionSummary(actions) {
  return JSON.stringify(actions.map((action) => ({
    title: action.title,
    kind: action.kind?.value ?? action.kind ?? null,
    hasEdit: action.edit instanceof vscode.WorkspaceEdit,
    command: action.command?.command ?? null,
  })));
}

function diagnosticForAuthoredText(document, diagnostics, text) {
  return diagnostics.find((diagnostic) => document.getText(diagnostic.range) === text);
}

async function waitForCurrentDiagnosticProviderSettlement(observationStart, document, message) {
  const uri = document.uri.toString();
  const documentVersion = document.version;
  let settlement;
  await waitFor(() => {
    const parsed = parseDiagnosticProviderSettlement(
      extensionHostObservations,
      uri,
      documentVersion,
      observationStart,
    );
    if (parsed.error != null) {
      throw new Error(`${parsed.error}\nDiagnostic provider trace: ${JSON.stringify(parsed.trace)}`);
    }
    settlement = parsed.settlement;
    return settlement != null;
  }, () => `${message}; diagnostic provider trace ${JSON.stringify(
    extensionHostObservations.slice(observationStart).filter((event) =>
      event.source === "language-client-provider"
      && event.operation === "diagnostics"
      && event.uri === uri
    ),
  )}`, 120_000);
  return settlement;
}
