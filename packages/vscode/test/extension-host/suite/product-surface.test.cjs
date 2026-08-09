const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");
const vscode = require("vscode");

const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const secondaryAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_SECONDARY_WORKSPACE;
const excludedAureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_EXCLUDED_WORKSPACE;
const plainTypeScriptWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE;
const expectedTransport = process.env.AURELIA_LS_EXTENSION_HOST_EXPECTED_TRANSPORT;
const extensionId = "AureliaEffect.aurelia-2";
const extensionHostObservationEvent = "aurelia-ls:extension-host-observation";
const extensionHostObservations = [];
const recordExtensionHostObservation = (event) => {
  if (event != null && typeof event === "object") extensionHostObservations.push(event);
};
let selectedTransport;

if (!aureliaWorkspace || !secondaryAureliaWorkspace || !excludedAureliaWorkspace || !plainTypeScriptWorkspace) {
  throw new Error("All extension-host workspace paths are required.");
}
if (expectedTransport !== "worker" && expectedTransport !== "ipc") {
  throw new Error("Expected extension-host transport must be worker or ipc.");
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
        .includes("**Resource** `product-card`"),
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

  test("projects resource and bindable facts through live editor providers", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    const resourceHover = await hoverMarkdown(document, "<product-card", "product-card");
    assert(resourceHover.includes("**Resource** `product-card`"));
    assert(resourceHover.includes("kind: `custom-element`"));

    const bindableHover = await hoverMarkdown(document, "<product-card", "item.bind");
    assert(bindableHover.includes("**Bindable** `item`"));
    assert(bindableHover.includes("**Resource** `product-card`"));

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
  });

  test("preserves hover ranges and resource symbols through native editor commands", async () => {
    const templateDocument = await showAureliaDocument("src/my-app.html");
    const memberHovers = await hoversAt(templateDocument, "state.searchText", "searchText");
    const memberHover = memberHovers.find((hover) => hoverMarkdownText(hover).includes("searchText"));
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
          .includes("**Resource** `product-card`"),
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
            .includes("**Resource** `product-card`"),
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

async function hoverMarkdown(document, anchor, token = anchor) {
  return (await hoversAt(document, anchor, token)).map(hoverMarkdownText).join("\n");
}

async function hoversAt(document, anchor, token = anchor) {
  const position = positionIn(document, anchor, token);
  const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, position);
  return Array.isArray(hovers) ? hovers : [];
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
  assert(resourceHover.includes("**Resource** `product-card`"));
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
  throw new Error(message);
}
