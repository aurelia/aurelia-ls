const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const workspaceRoot = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";
// This journey proves four distinct semantic states (prepare, apply, undo, redo).
// Latency acceptance is measured separately; the reliability witness must not
// become flaky merely because its cumulative cold semantic work nears 120s.
const CODE_ACTION_RELIABILITY_TIMEOUT_MS = 180_000;
const trackedFiles = [
  "src/my-app.html",
  "src/my-app.ts",
  "src/components/product-card.html",
  "src/components/product-card.ts",
  "src/components/stock-badge.html",
  "src/components/stock-badge.ts",
  "src/attributes/display-hint.ts",
];

if (!workspaceRoot) {
  throw new Error("AURELIA_LS_EXTENSION_HOST_WORKSPACE is required.");
}

const baseline = new Map(
  trackedFiles.map((rel) => [rel, fs.readFileSync(filePath(rel), "utf8")]),
);
let changeLog = [];
let analysisReadyLog = [];

suite("extension-host IDE reliability", () => {
  let subscription;
  let analysisReadySubscription;

  suiteSetup(async () => {
    await configureAureliaForReliabilityTests();
    subscription = vscode.workspace.onDidChangeTextDocument((event) => {
      const rel = relativeWorkspacePath(event.document.uri);
      if (rel) {
        changeLog.push({
          rel,
          reason: event.reason,
          version: event.document.version,
          changeCount: event.contentChanges.length,
        });
      }
    });

    const app = await activateAureliaExtension();
    assert(app?.ctx?.lsp, "Expected extension activation to expose its live LSP facade.");
    analysisReadySubscription = app.ctx.lsp.onAnalysisReady((payload) => {
      analysisReadyLog.push({
        uri: payload.uri,
        version: payload.version,
        diags: payload.diags,
        fingerprint: payload.fingerprint,
      });
    });
  });

  suiteTeardown(() => {
    subscription?.dispose();
    analysisReadySubscription?.dispose();
  });

  setup(async () => {
    changeLog = [];
    analysisReadyLog = [];
    await resetWorkspaceToBaseline();
    changeLog = [];
    analysisReadyLog = [];
  });

  test("HTML-origin bindable rename survives one-step undo, redo, and a subsequent rename", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/components/stock-badge.html",
      "src/components/stock-badge.ts",
    ];

    const renameOne = await renameThroughProvider(origin, "<stock-badge item.bind", "item", "item2");
    await assertDocumentsContain("after first rename", {
      "src/my-app.html": ["<stock-badge item2.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${item2?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable item2", "this.item2 == null", "this.item2.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after first rename");
    assertDirty(affected, true, "after first rename");

    const renamedSnapshot = await readDocuments(affected);
    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after undo");
    await waitForDiagnosticsClean(affected, "after undo");
    await waitForDirtyState(affected, false, "after undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "undo");

    changeLog = [];
    await runEditorCommand("redo", origin);
    await waitForDocumentsEqual(affected, renamedSnapshot, "after redo");
    await waitForDiagnosticsClean(affected, "after redo");
    assertDirty(affected, true, "after redo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Redo, "redo");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after second undo");
    await waitForDiagnosticsClean(affected, "after second undo");
    await waitForDirtyState(affected, false, "after second undo");

    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "badgeItem");
    await assertDocumentsContain("after second rename", {
      "src/my-app.html": ["<stock-badge badge-item.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${badgeItem?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable badgeItem", "this.badgeItem == null", "this.badgeItem.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after second rename");
    assert(renameOne.entries().length >= 2, "rename should have produced a multi-file WorkspaceEdit");
  });

  test("sequential unsaved bindable renames step backward and forward without stale offsets", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/components/stock-badge.html",
      "src/components/stock-badge.ts",
    ];

    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "item2");
    await assertDocumentsContain("after first sequential rename", {
      "src/my-app.html": ["<stock-badge item2.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${item2?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable item2", "this.item2 == null", "this.item2.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after first sequential rename");
    const firstRenameSnapshot = await readDocuments(affected);

    await renameThroughProvider(origin, "<stock-badge item2.bind", "item2", "item23");
    await assertDocumentsContain("after second sequential rename", {
      "src/my-app.html": ["<stock-badge item23.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${item23?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable item23", "this.item23 == null", "this.item23.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after second sequential rename");
    const secondRenameSnapshot = await readDocuments(affected);

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, firstRenameSnapshot, "after undoing second sequential rename");
    await waitForDiagnosticsClean(affected, "after undoing second sequential rename");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "undo second sequential rename");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after undoing first sequential rename");
    await waitForDiagnosticsClean(affected, "after undoing first sequential rename");
    await waitForDirtyState(affected, false, "after undoing first sequential rename");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "undo first sequential rename");

    changeLog = [];
    await runEditorCommand("redo", origin);
    await waitForDocumentsEqual(affected, firstRenameSnapshot, "after redoing first sequential rename");
    await waitForDiagnosticsClean(affected, "after redoing first sequential rename");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Redo, "redo first sequential rename");

    changeLog = [];
    await runEditorCommand("redo", origin);
    await waitForDocumentsEqual(affected, secondRenameSnapshot, "after redoing second sequential rename");
    await waitForDiagnosticsClean(affected, "after redoing second sequential rename");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Redo, "redo second sequential rename");
  });

  test("undo from a dependent editor rolls back the whole rename operation", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/components/stock-badge.html",
      "src/components/stock-badge.ts",
    ];

    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "focusedItem");
    await assertDocumentsContain("after focused dependent rename", {
      "src/my-app.html": ["<stock-badge focused-item.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${focusedItem?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable focusedItem", "this.focusedItem == null", "this.focusedItem.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after focused dependent rename");

    const dependent = await showDocument("src/components/stock-badge.ts");
    changeLog = [];
    await runEditorCommand("undo", dependent);
    await waitForDocumentsEqual(affected, baseline, "after dependent-editor undo");
    await waitForDiagnosticsClean(affected, "after dependent-editor undo");
    await waitForDirtyState(affected, false, "after dependent-editor undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "dependent-editor undo");
  });

  test("rename preserves a pre-existing dirty target edit and recalculates shifted offsets", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/components/stock-badge.html",
      "src/components/stock-badge.ts",
    ];

    await insertTextBefore("src/components/stock-badge.ts", "export class StockBadge", "// unsaved tester note\n");
    const dirtyBaseline = await readDocuments(affected);
    assert((await documentFor("src/components/stock-badge.ts")).isDirty, "pre-existing target edit should make stock-badge.ts dirty");
    await waitForDiagnosticsClean(affected, "after pre-existing dirty target edit");

    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "dirtyItem");
    await assertDocumentsContain("after rename over dirty target", {
      "src/my-app.html": ["<stock-badge dirty-item.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${dirtyItem?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": [
        "// unsaved tester note",
        "export class StockBadge",
        "@bindable dirtyItem",
        "this.dirtyItem == null",
        "this.dirtyItem.quantity",
      ],
    });
    await waitForDiagnosticsClean(affected, "after rename over dirty target");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, dirtyBaseline, "after undoing rename over dirty target");
    await waitForDiagnosticsClean(affected, "after undoing rename over dirty target");
    assert((await documentFor("src/components/stock-badge.ts")).isDirty, "pre-existing dirty edit should remain after rename undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "undo rename over dirty target");
  });

  test("TS-origin bindable rename remains coherent across template propagation and rollback", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/components/product-card.ts");
    const affected = [
      "src/my-app.html",
      "src/components/product-card.html",
      "src/components/product-card.ts",
    ];

    await renameThroughProvider(origin, "@bindable item", "item", "cardItem");
    await assertDocumentsContain("after TS-origin rename", {
      "src/my-app.html": ["<product-card", "card-item.bind=\"item\""],
      "src/components/product-card.html": ["if.bind=\"cardItem\"", "${cardItem.description}", "${cardItem.sku}"],
      "src/components/product-card.ts": ["@bindable cardItem", "this.cardItem == null", "this.cardItem.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after TS-origin rename");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after TS-origin undo");
    await waitForDiagnosticsClean(affected, "after TS-origin undo");
    await waitForDirtyState(affected, false, "after TS-origin undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "TS-origin undo");

    const htmlOrigin = await showDocument("src/my-app.html");
    await renameThroughProvider(htmlOrigin, "<product-card\n          item.bind", "item", "cardItem2");
    await assertDocumentsContain("after HTML rename following TS-origin undo", {
      "src/my-app.html": ["card-item2.bind=\"item\""],
      "src/components/product-card.html": ["if.bind=\"cardItem2\"", "${cardItem2.description}", "${cardItem2.sku}"],
      "src/components/product-card.ts": ["@bindable cardItem2", "this.cardItem2 == null", "this.cardItem2.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after HTML rename following TS-origin undo");
  });

  test("saved multi-file rename can roll back, save cleanly, and rename again", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/components/stock-badge.html",
      "src/components/stock-badge.ts",
    ];

    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "savedItem");
    await assertDocumentsContain("after saved rename", {
      "src/my-app.html": ["<stock-badge saved-item.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${savedItem?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable savedItem", "this.savedItem == null", "this.savedItem.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after saved rename");
    await saveDocuments(affected, "after saved rename");
    await waitForDirtyState(affected, false, "after saved rename save");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after saved rename undo");
    await waitForDiagnosticsClean(affected, "after saved rename undo");
    assertDirty(affected, true, "after saved rename undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "saved rename undo");

    await saveDocuments(affected, "after saved rename undo");
    await waitForDirtyState(affected, false, "after saved rename undo save");
    await renameThroughProvider(origin, "<stock-badge item.bind", "item", "resavedItem");
    await assertDocumentsContain("after saved rollback second rename", {
      "src/my-app.html": ["<stock-badge resaved-item.bind=\"preview\">"],
      "src/components/stock-badge.html": ["${resavedItem?.tone ?? 'empty'}"],
      "src/components/stock-badge.ts": ["@bindable resavedItem", "this.resavedItem == null", "this.resavedItem.quantity"],
    });
    await waitForDiagnosticsClean(affected, "after saved rollback second rename");
  });

  test("custom-attribute multi-binding rename rolls back as one coherent operation", async () => {
    await openTrackedDocuments();
    const origin = await showDocument("src/my-app.html");
    const affected = [
      "src/my-app.html",
      "src/attributes/display-hint.ts",
    ];

    await renameThroughProvider(origin, "tone.bind: preview.tone", "tone", "displayTone");
    await assertDocumentsContain("after custom-attribute bindable rename", {
      "src/my-app.html": ["display-tone.bind: preview.tone"],
      "src/attributes/display-hint.ts": ["@bindable displayTone", "this.displayTone", "displayToneChanged()"],
    });
    await waitForDiagnosticsClean(affected, "after custom-attribute bindable rename");

    changeLog = [];
    await runEditorCommand("undo", origin);
    await waitForDocumentsEqual(affected, baseline, "after custom-attribute undo");
    await waitForDiagnosticsClean(affected, "after custom-attribute undo");
    await waitForDirtyState(affected, false, "after custom-attribute undo");
    assertUndoRedoReasons(affected, vscode.TextDocumentChangeReason.Undo, "custom-attribute undo");

    await renameThroughProvider(origin, "tone.bind: preview.tone", "tone", "displayToneAgain");
    await assertDocumentsContain("after custom-attribute second rename", {
      "src/my-app.html": ["display-tone-again.bind: preview.tone"],
      "src/attributes/display-hint.ts": ["@bindable displayToneAgain", "this.displayToneAgain", "displayToneAgainChanged()"],
    });
    await waitForDiagnosticsClean(affected, "after custom-attribute second rename");
  });

  test("resolved code action re-plans a dirty target and remains one undo operation", async () => {
    await openTrackedDocuments();
    const template = await showDocument("src/my-app.html");
    const affected = ["src/my-app.html", "src/my-app.ts"];

    await replaceTextInDocument("src/my-app.html", "${heading}", "${titel}", "Introduce missing template member");
    await insertTextBefore("src/my-app.ts", "export class MyApp", "// unsaved code-action offset pressure\n");
    const beforeAction = await readDocuments(affected);

    const editor = await vscode.window.showTextDocument(template, { preview: false });
    const actionPosition = positionForNeedle(template, "${titel}", "titel");
    editor.selection = new vscode.Selection(actionPosition, actionPosition);
    const actionRange = new vscode.Range(actionPosition, actionPosition);
    let unresolvedActions;
    await waitFor(async () => {
      unresolvedActions = await executeCodeActionProvider(template.uri, actionRange, 0);
      return unresolvedActions.length > 0;
    }, "registered provider should return the missing-member quick fix");
    assert(Array.isArray(unresolvedActions) && unresolvedActions.length > 0,
      "expected the registered provider to return the missing-member quick fix");
    assert.strictEqual(unresolvedActions[0].edit, undefined,
      "missing-member quick fix should defer its edit until resolution");
    const resolvedActions = await executeCodeActionProvider(template.uri, actionRange, 1);
    const resolvedEdit = resolvedActions?.[0]?.edit;
    assert(resolvedEdit instanceof vscode.WorkspaceEdit,
      "expected the registered provider to resolve the missing-member WorkspaceEdit");
    const applied = await vscode.workspace.applyEdit(resolvedEdit, { label: "Add missing Aurelia member" });
    assert.strictEqual(applied, true, "resolved missing-member WorkspaceEdit should apply");
    await waitFor(async () => (await documentFor("src/my-app.ts")).getText().includes("titel!: unknown;"),
      "missing-member code action should update my-app.ts");
    await assertDocumentsContain("after missing-member code action", {
      "src/my-app.html": ["${titel}"],
      "src/my-app.ts": ["// unsaved code-action offset pressure", "titel!: unknown;"],
    });
    await waitForDiagnosticsClean(affected, "after missing-member code action");
    const afterAction = await readDocuments(affected);

    const target = await showDocument("src/my-app.ts");
    changeLog = [];
    await runEditorCommand("undo", target);
    await waitForDocumentsEqual(affected, beforeAction, "after code-action undo");
    await waitFor(async () => (await executeCodeActionProvider(template.uri, actionRange, 0)).length > 0,
      "missing-member action should return after code-action undo");
    assertUndoRedoReasons(["src/my-app.ts"], vscode.TextDocumentChangeReason.Undo, "code-action undo");

    changeLog = [];
    await runEditorCommand("redo", target);
    await waitForDocumentsEqual(affected, afterAction, "after code-action redo");
    await waitFor(async () => (await executeCodeActionProvider(template.uri, actionRange, 0)).length === 0,
      "missing-member action should clear after code-action redo");
    assertUndoRedoReasons(["src/my-app.ts"], vscode.TextDocumentChangeReason.Redo, "code-action redo");
  }).timeout(CODE_ACTION_RELIABILITY_TIMEOUT_MS);

  test("unsaved template type errors publish at the authored token and clear on undo", async () => {
    const rel = "src/my-app.html";
    const document = await showDocument(rel);
    await waitFor(async () => {
      const hovers = await vscode.commands.executeCommand(
        "vscode.executeHoverProvider",
        document.uri,
        positionForNeedle(document, "state.searchText", "searchText"),
      );
      return Array.isArray(hovers) && hovers.length > 0;
    }, "Aurelia language features should settle after the baseline document opens");
    const original = "${preview.name}";
    const replacement = "${heading()}";
    const start = document.getText().indexOf(original);
    assert.notStrictEqual(start, -1, `Could not find ${JSON.stringify(original)} in ${rel}`);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(document.positionAt(start), document.positionAt(start + original.length)),
      replacement,
    );
    const applied = await vscode.workspace.applyEdit(edit, { label: "Introduce template type error" });
    assert.strictEqual(applied, true, "template type-error edit should apply");
    assert.strictEqual(
      document.getText().includes(replacement),
      true,
      "template type-error edit should update the live document before diagnostics",
    );
    assert.ok(
      changeLog.some((event) => event.rel === rel && event.changeCount > 0),
      `template type-error edit should emit a non-empty document change; saw ${JSON.stringify(changeLog)}`,
    );
    await waitFor(
      () => analysisReadyLog.some((event) =>
        event.uri === document.uri.toString() && event.version === document.version
      ),
      `semantic-runtime should acknowledge diagnostics for ${rel}@${document.version}`,
      60000,
    );

    let nonCallableDiagnostic;
    try {
      await waitFor(() => {
        nonCallableDiagnostic = vscode.languages.getDiagnostics(document.uri).find((diagnostic) => {
          const code = typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code;
          return diagnostic.source === "aurelia"
            && code === "TS2349"
            && document.getText(diagnostic.range) === "heading";
        });
        return nonCallableDiagnostic != null;
      }, "unsaved non-callable template expression should publish TS2349 on the authored member token");
    } catch (error) {
      const diagnostics = vscode.languages.getDiagnostics(document.uri).map((diagnostic) => ({
        source: diagnostic.source,
        code: typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code,
        text: document.getText(diagnostic.range),
        message: diagnostic.message,
      }));
      throw new Error(
        `${error.message}; document=${document.languageId}@${document.version}; `
        + `changes=${JSON.stringify(changeLog)}; analysisReady=${JSON.stringify(analysisReadyLog)}; `
        + `diagnostics=${JSON.stringify(diagnostics)}`,
      );
    }
    assert.strictEqual(nonCallableDiagnostic.severity, vscode.DiagnosticSeverity.Error);
    assert.match(nonCallableDiagnostic.message, /not callable/i);
    assertDirty([rel], true, "after introducing template type error");

    changeLog = [];
    await runEditorCommand("undo", document);
    await waitForDocumentsEqual([rel], baseline, "after undoing template type error");
    await waitForDiagnosticsClean([rel], "after undoing template type error");
    await waitForDirtyState([rel], false, "after undoing template type error");
    assertUndoRedoReasons([rel], vscode.TextDocumentChangeReason.Undo, "template type-error undo");
  });
});

function filePath(rel) {
  return path.join(workspaceRoot, ...rel.split("/"));
}

function uriFor(rel) {
  return vscode.Uri.file(filePath(rel));
}

function relativeWorkspacePath(uri) {
  if (uri.scheme !== "file") return null;
  const rel = path.relative(workspaceRoot, uri.fsPath).replace(/\\/g, "/");
  return rel && !rel.startsWith("..") ? rel : null;
}

async function activateAureliaExtension() {
  const extension = vscode.extensions.getExtension(extensionId);
  assert(extension, `Expected extension ${extensionId} to be installed in the Extension Development Host.`);
  const api = await extension.activate();
  await showDocument("src/my-app.html");
  await waitFor(async () => {
    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      uriFor("src/my-app.html"),
      positionForNeedle(await documentFor("src/my-app.html"), "state.searchText", "searchText"),
    );
    return Array.isArray(hovers) && hovers.length > 0;
  }, "Aurelia extension should answer language-feature requests");
  return api;
}

async function configureAureliaForReliabilityTests() {
  const config = vscode.workspace.getConfiguration("aurelia");
  await Promise.all([
    config.update("features.commands", false, vscode.ConfigurationTarget.Workspace),
    config.update("features.statusBar", false, vscode.ConfigurationTarget.Workspace),
    config.update("features.views", false, vscode.ConfigurationTarget.Workspace),
    config.update("features.inline", false, vscode.ConfigurationTarget.Workspace),
    config.update("features.inlayHints", false, vscode.ConfigurationTarget.Workspace),
    config.update("observability.errors.notify", false, vscode.ConfigurationTarget.Workspace),
    config.update("observability.errors.showOutput", false, vscode.ConfigurationTarget.Workspace),
  ]);
}

async function resetWorkspaceToBaseline() {
  const edit = new vscode.WorkspaceEdit();
  let hasChanges = false;
  for (const rel of trackedFiles) {
    const doc = await documentFor(rel);
    const expected = baseline.get(rel);
    if (doc.getText() === expected) {
      continue;
    }
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    edit.replace(uriFor(rel), fullRange, expected);
    hasChanges = true;
  }
  if (hasChanges) {
    const applied = await vscode.workspace.applyEdit(edit, { label: "Reset hello-world reliability fixture" });
    assert.strictEqual(applied, true, "fixture reset edit should apply");
    for (const rel of trackedFiles) {
      const doc = await documentFor(rel);
      if (doc.isDirty) {
        const saved = await doc.save();
        assert.strictEqual(saved, true, `fixture reset should save ${rel}`);
      }
    }
  }
  await waitForDocumentsEqual(trackedFiles, baseline, "fixture reset");
  await waitForDirtyState(trackedFiles, false, "fixture reset");
}

async function saveDocuments(files, label) {
  for (const rel of files) {
    const doc = await documentFor(rel);
    if (!doc.isDirty) {
      continue;
    }
    const saved = await doc.save();
    assert.strictEqual(saved, true, `${label}: expected ${rel} to save`);
  }
}

async function insertTextBefore(rel, needle, text) {
  const doc = await documentFor(rel);
  const offset = doc.getText().indexOf(needle);
  assert.notStrictEqual(offset, -1, `Could not find ${JSON.stringify(needle)} in ${rel}`);
  const edit = new vscode.WorkspaceEdit();
  edit.insert(uriFor(rel), doc.positionAt(offset), text);
  const applied = await vscode.workspace.applyEdit(edit, { label: `Insert test text in ${rel}` });
  assert.strictEqual(applied, true, `Expected insertion edit to apply in ${rel}`);
}

async function replaceTextInDocument(rel, oldText, newText, label) {
  const doc = await documentFor(rel);
  const offset = doc.getText().indexOf(oldText);
  assert.notStrictEqual(offset, -1, `Could not find ${JSON.stringify(oldText)} in ${rel}`);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    doc.uri,
    new vscode.Range(doc.positionAt(offset), doc.positionAt(offset + oldText.length)),
    newText,
  );
  const applied = await vscode.workspace.applyEdit(edit, { label });
  assert.strictEqual(applied, true, `${label}: expected edit to apply in ${rel}`);
}

async function openTrackedDocuments() {
  for (const rel of trackedFiles) {
    await documentFor(rel);
  }
}

async function documentFor(rel) {
  const uri = uriFor(rel);
  return vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString())
    ?? vscode.workspace.openTextDocument(uri);
}

async function showDocument(rel) {
  const doc = await documentFor(rel);
  await vscode.window.showTextDocument(doc, { preview: false });
  return doc;
}

function positionForNeedle(document, needle, token = needle) {
  const text = document.getText();
  const start = text.indexOf(needle);
  assert.notStrictEqual(start, -1, `Could not find ${JSON.stringify(needle)} in ${document.uri.fsPath}`);
  const tokenStart = text.indexOf(token, start);
  assert.notStrictEqual(tokenStart, -1, `Could not find ${JSON.stringify(token)} inside ${JSON.stringify(needle)}`);
  return document.positionAt(tokenStart + Math.max(0, Math.floor(token.length / 2)));
}

async function renameThroughProvider(document, needle, oldName, newName) {
  const position = positionForNeedle(document, needle, oldName);
  const prepare = await vscode.commands.executeCommand("vscode.prepareRename", document.uri, position);
  assert(prepare, `Expected prepareRename at ${document.uri.fsPath}:${position.line}:${position.character}`);
  const edit = await vscode.commands.executeCommand(
    "vscode.executeDocumentRenameProvider",
    document.uri,
    position,
    newName,
  );
  assert(edit instanceof vscode.WorkspaceEdit, `Expected WorkspaceEdit for ${needle} -> ${newName}`);
  const applied = await vscode.workspace.applyEdit(edit, { label: `Renaming ${oldName} to ${newName}` });
  assert.strictEqual(applied, true, `WorkspaceEdit should apply for ${needle} -> ${newName}`);
  return edit;
}

async function runEditorCommand(command, document) {
  await vscode.window.showTextDocument(document, { preview: false });
  await vscode.commands.executeCommand(command);
}

async function readDocuments(files) {
  const values = new Map();
  for (const rel of files) {
    values.set(rel, (await documentFor(rel)).getText());
  }
  return values;
}

async function assertDocumentsContain(label, expected) {
  for (const [rel, snippets] of Object.entries(expected)) {
    const text = (await documentFor(rel)).getText();
    for (const snippet of snippets) {
      if (!text.includes(snippet)) {
        await dumpFailureSnapshot(label);
        throw new Error(`${label}: expected ${rel} to contain ${JSON.stringify(snippet)}\n\n${text}`);
      }
    }
  }
}

async function dumpFailureSnapshot(label) {
  const safeLabel = label.replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-|-$/g, "");
  const dump = {
    label,
    changeLog,
    files: {},
  };
  for (const rel of trackedFiles) {
    const doc = await documentFor(rel);
    dump.files[rel] = {
      dirty: doc.isDirty,
      version: doc.version,
      text: doc.getText(),
    };
  }
  const dumpPath = path.join(workspaceRoot, "..", `${safeLabel || "failure"}.json`);
  fs.writeFileSync(dumpPath, JSON.stringify(dump, null, 2));
}

async function waitForDocumentsEqual(files, expected, label) {
  await waitFor(async () => {
    for (const rel of files) {
      const actual = (await documentFor(rel)).getText();
      const target = expected instanceof Map ? expected.get(rel) : expected[rel];
      if (actual !== target) {
        return false;
      }
    }
    return true;
  }, `${label}: documents should match expected text`);
}

async function waitForDiagnosticsClean(files, label) {
  await waitFor(() => {
    const diagnostics = [];
    for (const rel of files) {
      const uri = uriFor(rel);
      diagnostics.push(...vscode.languages.getDiagnostics(uri).filter(isRelevantDiagnostic));
    }
    return diagnostics.length === 0;
  }, `${label}: expected no relevant diagnostics`);
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

function isRelevantDiagnostic(diagnostic) {
  return diagnostic.source === "aurelia" || diagnostic.source === "typescript";
}

function assertDirty(files, expected, label) {
  const dirty = [];
  for (const rel of files) {
    const doc = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uriFor(rel).toString());
    if (doc?.isDirty) {
      dirty.push(rel);
    }
  }
  if (expected) {
    assert(dirty.length > 0, `${label}: expected at least one dirty document in ${files.join(", ")}`);
  } else {
    assert.deepStrictEqual(dirty, [], `${label}: expected no dirty documents`);
  }
}

async function waitForDirtyState(files, expected, label) {
  await waitFor(() => {
    const dirty = [];
    for (const rel of files) {
      const doc = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uriFor(rel).toString());
      if (doc?.isDirty) {
        dirty.push(rel);
      }
    }
    return expected ? dirty.length > 0 : dirty.length === 0;
  }, `${label}: expected dirty=${expected}`);
}

function assertUndoRedoReasons(files, expectedReason, label) {
  const touched = new Set(changeLog.filter((event) => event.reason === expectedReason).map((event) => event.rel));
  for (const rel of files) {
    assert(
      touched.has(rel),
      `${label}: expected ${rel} to receive ${reasonName(expectedReason)} change event; saw ${JSON.stringify(changeLog)}`,
    );
  }
}

function reasonName(reason) {
  return reason === vscode.TextDocumentChangeReason.Undo
    ? "Undo"
    : reason === vscode.TextDocumentChangeReason.Redo
      ? "Redo"
      : String(reason);
}

async function waitFor(predicate, message, timeoutMs = 20000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      if (await predicate()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (lastError) {
    throw lastError;
  }
  throw new Error(message);
}
