const assert = require("assert");
const path = require("path");
const vscode = require("vscode");

const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const plainTypeScriptWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_PLAIN_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";

if (!aureliaWorkspace || !plainTypeScriptWorkspace) {
  throw new Error("Both extension-host workspace paths are required.");
}

suite("extension-host product surface", () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert(extension, `Expected extension ${extensionId} in the Extension Development Host.`);
    await extension.activate();
    const document = await showAureliaDocument("src/my-app.html");
    await waitFor(
      async () => (await hoverMarkdown(document, "state.searchText")).includes("searchText"),
      "the admitted Aurelia workspace should answer template hover",
      60_000,
    );
  });

  test("ships only the retained command and Explorer surface", async () => {
    const commands = new Set(await vscode.commands.getCommands(true));
    for (const command of [
      "aurelia.diagnosticsReport",
      "aurelia.findResource",
      "aurelia.showAvailableResources",
      "aurelia.openRelatedFile",
      "aurelia.refreshResourceExplorer",
    ]) {
      assert(commands.has(command), `Expected ${command} to be registered.`);
    }
    assert(!commands.has("aurelia.inspectAtCursor"), "Removed Inspect at Cursor command must not be registered.");

    await vscode.commands.executeCommand("workbench.view.explorer");
    await vscode.commands.executeCommand("aureliaResourceExplorer.focus");
    await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
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
  });

  test("renders diagnostics evidence and opens related files through retained commands", async () => {
    await showAureliaDocument("src/my-app.html");
    await vscode.commands.executeCommand("aurelia.diagnosticsReport");
    const report = vscode.window.activeTextEditor?.document;
    assert(report, "Diagnostics Report should open a document.");
    assert.strictEqual(report.languageId, "markdown");
    assert(report.getText().includes("# Aurelia Diagnostics Report"));
    assert(report.getText().includes("## Raw Evidence"));

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

  test("retires and re-admits the Aurelia root without leaking a session", async () => {
    const document = await showAureliaDocument("src/my-app.html");
    const folder = vscode.workspace.workspaceFolders?.find((candidate) =>
      normalize(candidate.uri.fsPath) === normalize(aureliaWorkspace)
    );
    assert(folder, "Expected the Aurelia workspace folder before retirement.");
    assert.strictEqual(vscode.workspace.updateWorkspaceFolders(folder.index, 1), true);
    await waitFor(
      async () => !(await hoverMarkdown(document, "<product-card", "product-card"))
        .includes("**Resource** `product-card`"),
      "removing the Aurelia root should retire its editor providers",
      60_000,
    );

    const insertAt = vscode.workspace.workspaceFolders?.length ?? 0;
    assert.strictEqual(vscode.workspace.updateWorkspaceFolders(insertAt, 0, {
      uri: vscode.Uri.file(aureliaWorkspace),
      name: "hello-world",
    }), true);
    await waitFor(
      async () => (await hoverMarkdown(document, "<product-card", "product-card"))
        .includes("**Resource** `product-card`"),
      "restoring the Aurelia root should re-admit its editor providers",
      60_000,
    );
    await vscode.commands.executeCommand("aurelia.refreshResourceExplorer");
  });
});

async function showAureliaDocument(relativePath) {
  const uri = vscode.Uri.file(path.join(aureliaWorkspace, ...relativePath.split("/")));
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
  const position = positionIn(document, anchor, token);
  const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, position);
  if (!Array.isArray(hovers)) return "";
  return hovers.flatMap((hover) => hover.contents ?? []).map((content) =>
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

function positionIn(document, anchor, token) {
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
