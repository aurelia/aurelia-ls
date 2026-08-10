const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const vscode = require("vscode");

const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const secondaryAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_SECONDARY_WORKSPACE;
const excludedAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE;
const plainTypeScriptWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE;
const routedAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_ROUTED_WORKSPACE;
const expectedTransport = process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT;
const extensionId = "AureliaEffect.aurelia-2";
const extensionHostObservationEvent = "aurelia-ls:extension-host-observation";
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
const recordExtensionHostObservation = (event) => {
  if (event != null && typeof event === "object") extensionHostObservations.push(event);
};
let selectedTransport;

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

  test("navigates through both native resource discovery journeys", async () => {
    const origin = await showAureliaDocument("src/my-app.html");
    await executeAndAcceptQuickPick("aurelia.goToResource");
    assertAuthoredResourceDocument(vscode.window.activeTextEditor?.document, origin.uri);

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
    assertAuthoredResourceDocument(vscode.window.activeTextEditor?.document, origin.uri);
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
      assert.deepStrictEqual(
        resolvedEntries[0][1].map((edit) => ({ oldText: typeScriptDocument.getText(edit.range), newText: edit.newText })),
        [{ oldText: "", newText: "\n  titel!: unknown;" }],
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

  test("retires and re-admits the primary Aurelia root without disturbing the secondary root", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    let secondaryDocument;

    try {
      assert(!findWorkspaceFolder(secondaryAureliaWorkspace), "Expected the secondary root to start outside the workspace.");
      const secondaryInsertAt = vscode.workspace.workspaceFolders?.length ?? 0;
      assert.strictEqual(vscode.workspace.updateWorkspaceFolders(secondaryInsertAt, 0, {
        uri: vscode.Uri.file(secondaryAureliaWorkspace),
        name: "hello-world-secondary",
      }), true);
      await waitFor(
        () => findWorkspaceFolder(secondaryAureliaWorkspace) != null,
        "adding the secondary Aurelia root should update the workspace",
      );

      secondaryDocument = await showAureliaDocument("src/my-app.html", secondaryAureliaWorkspace);
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
      assert.strictEqual(vscode.workspace.updateWorkspaceFolders(primaryFolder.index, 1), true);
      await waitFor(
        () => findWorkspaceFolder(aureliaWorkspace) == null,
        "removing the primary Aurelia root should update the workspace",
      );
      await waitFor(
        async () => !(await hoverMarkdown(document, "<product-card", "product-card"))
          .includes("<product-card>"),
        "removing the primary Aurelia root should retire its editor providers",
        60_000,
      );
      await waitForWorkspaceAnswer(
        secondaryDocument,
        secondaryAureliaWorkspace,
        "retiring the primary root should not disturb the secondary root",
      );

      const primaryInsertAt = vscode.workspace.workspaceFolders?.length ?? 0;
      assert.strictEqual(vscode.workspace.updateWorkspaceFolders(primaryInsertAt, 0, {
        uri: vscode.Uri.file(aureliaWorkspace),
        name: "hello-world",
      }), true);
      await waitFor(
        () => findWorkspaceFolder(aureliaWorkspace) != null,
        "restoring the primary Aurelia root should update the workspace",
      );
      await waitForWorkspaceAnswer(
        document,
        aureliaWorkspace,
        "restoring the primary Aurelia root should re-admit its editor providers",
      );
      await waitForWorkspaceAnswer(
        secondaryDocument,
        secondaryAureliaWorkspace,
        "re-admitting the primary root should not disturb the secondary root",
      );
      await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
    } finally {
      if (findWorkspaceFolder(aureliaWorkspace) == null) {
        const primaryInsertAt = vscode.workspace.workspaceFolders?.length ?? 0;
        assert.strictEqual(vscode.workspace.updateWorkspaceFolders(primaryInsertAt, 0, {
          uri: vscode.Uri.file(aureliaWorkspace),
          name: "hello-world",
        }), true);
        await waitFor(
          () => findWorkspaceFolder(aureliaWorkspace) != null,
          "cleanup should restore the primary Aurelia root",
        );
      }

      const secondaryFolder = findWorkspaceFolder(secondaryAureliaWorkspace);
      if (secondaryFolder != null) {
        assert.strictEqual(vscode.workspace.updateWorkspaceFolders(secondaryFolder.index, 1), true);
        await waitFor(
          () => findWorkspaceFolder(secondaryAureliaWorkspace) == null,
          "cleanup should remove the secondary Aurelia root",
        );
      }
      if (secondaryDocument != null) {
        await waitFor(
          async () => !(await hoverMarkdown(secondaryDocument, "<product-card", "product-card"))
            .includes("<product-card>"),
          "removing the secondary root should retire its editor providers",
          60_000,
        );
      }
    }
  });
});

async function showAureliaDocument(relativePath, workspaceRoot = aureliaWorkspace) {
  const uri = vscode.Uri.file(path.join(workspaceRoot, ...relativePath.split("/")));
  const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString())
    ?? await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
  return document;
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

function assertAuthoredResourceDocument(document, originUri) {
  assert(document, "Expected resource navigation to leave an active editor.");
  assert.notStrictEqual(document.uri.toString(), originUri.toString(), "Expected navigation away from the template.");
  assert(
    normalize(document.uri.fsPath).startsWith(normalize(path.join(aureliaWorkspace, "src"))),
    `Expected an authored workspace resource, received ${document.uri.toString()}.`,
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

function parseDiagnosticProviderSettlement(events, uri, documentVersion, observationStart) {
  const trace = events.map((event, index) => ({ event, index })).filter(({ event }) =>
    event.source === "language-client-provider"
    && event.operation === "diagnostics"
    && event.uri === uri
  );
  const attempts = [];
  const byId = new Map();
  let active;

  for (const entry of trace) {
    const event = entry.event;
    if (event.phase === "request") {
      if (active != null) {
        return {
          error: `Diagnostic provider attempt ${event.observationId} overlapped ${active.request.observationId}.`,
          settlement: null,
          trace: trace.map((candidate) => candidate.event),
        };
      }
      if (byId.has(event.observationId)) {
        return {
          error: `Diagnostic provider attempt ${event.observationId} reused an observation id.`,
          settlement: null,
          trace: trace.map((candidate) => candidate.event),
        };
      }
      const attempt = { request: event, requestIndex: entry.index, terminal: null };
      attempts.push(attempt);
      byId.set(event.observationId, attempt);
      active = attempt;
      continue;
    }
    if (event.phase !== "response" && event.phase !== "failed") continue;
    const attempt = byId.get(event.observationId);
    if (attempt == null) {
      return {
        error: `Diagnostic provider attempt ${event.observationId} published a terminal without an observed request.`,
        settlement: null,
        trace: trace.map((candidate) => candidate.event),
      };
    }
    if (attempt.terminal != null) {
      return {
        error: `Diagnostic provider attempt ${event.observationId} published more than one terminal.`,
        settlement: null,
        trace: trace.map((candidate) => candidate.event),
      };
    }
    if (active !== attempt) {
      return {
        error: `Diagnostic provider attempt ${event.observationId} terminated out of request order.`,
        settlement: null,
        trace: trace.map((candidate) => candidate.event),
      };
    }
    attempt.terminal = event;
    active = undefined;
    if (
      event.phase === "failed"
      && (
        event.errorName !== "Canceled"
        || (event.cancellationRequested !== true && event.serverRetriggerRequested !== true)
      )
    ) {
      return {
        error: `Diagnostic provider attempt ${event.observationId} failed without authenticated cancellation.`,
        settlement: null,
        trace: trace.map((candidate) => candidate.event),
      };
    }
    if (event.phase === "response" && event.cancellationRequested === true) {
      return {
        error: `Diagnostic provider attempt ${event.observationId} responded after client cancellation.`,
        settlement: null,
        trace: trace.map((candidate) => candidate.event),
      };
    }
  }

  if (attempts.length === 0 || active != null) {
    return { error: null, settlement: null, trace: trace.map((candidate) => candidate.event) };
  }
  const last = attempts[attempts.length - 1];
  if (last.requestIndex < observationStart || last.request.documentVersion !== documentVersion) {
    return { error: null, settlement: null, trace: trace.map((candidate) => candidate.event) };
  }
  if (last.terminal?.phase !== "response") {
    return { error: null, settlement: null, trace: trace.map((candidate) => candidate.event) };
  }
  if (last.terminal.reportKind !== "full" || last.terminal.resultIdPresent !== true) {
    return {
      error: `Current diagnostic provider attempt ${last.request.observationId} did not return a full resultId-bearing report.`,
      settlement: null,
      trace: trace.map((candidate) => candidate.event),
    };
  }
  return {
    error: null,
    settlement: {
      ...last.terminal,
      observedAttemptCount: attempts.length,
      observedCanceledAttemptCount: attempts.filter((attempt) => attempt.terminal?.phase === "failed").length,
    },
    trace: trace.map((candidate) => candidate.event),
  };
}
