const assert = require("assert");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const vscode = require("vscode");

const workspaceRoot = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";
// This journey proves four distinct semantic states (prepare, apply, undo, redo).
// Latency acceptance is measured separately; the reliability witness must not
// become flaky merely because its cumulative cold semantic work nears 120s.
const CODE_ACTION_RELIABILITY_TIMEOUT_MS = 180_000;
// Reliability owns eventual IDE state. Product latency has a separate acceptance
// gate, so a slow semantic rebuild should produce timing evidence rather than a
// false state-machine failure in this suite.
const DIAGNOSTIC_RELIABILITY_TIMEOUT_MS = 120_000;
const REAL_F2_RELIABILITY_TIMEOUT_MS = 180_000;
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
const workspaceBaseline = new Map(
  authoredWorkspaceFiles().map((rel) => [rel, fs.readFileSync(filePath(rel), "utf8")]),
);
let changeLog = [];
let diagnosticsChangeLog = [];

suite("extension-host IDE reliability", () => {
  let subscription;
  let diagnosticsSubscription;
  let renameUiPage;

  suiteSetup(async () => {
    subscription = vscode.workspace.onDidChangeTextDocument((event) => {
      const rel = relativeWorkspacePath(event.document.uri);
      if (rel) {
        changeLog.push({
          rel,
          reason: event.reason,
          version: event.document.version,
          changeCount: event.contentChanges.length,
          contentChanges: event.contentChanges.map((change) => ({
            range: {
              start: change.range.start,
              end: change.range.end,
            },
            text: change.text,
          })),
        });
      }
    });

    diagnosticsSubscription = vscode.languages.onDidChangeDiagnostics((event) => {
      for (const uri of event.uris) {
        const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
        diagnosticsChangeLog.push({
          uri: uri.toString(),
          version: document?.version ?? null,
          diagnostics: vscode.languages.getDiagnostics(uri).map((diagnostic) => ({
            source: diagnostic.source,
            code: typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code,
            text: document?.getText(diagnostic.range) ?? null,
            message: diagnostic.message,
          })),
        });
      }
    });
    await activateAureliaExtension();
    renameUiPage = await connectRenameUiPage();
  });

  suiteTeardown(() => {
    subscription?.dispose();
    diagnosticsSubscription?.dispose();
  });

  setup(async () => {
    changeLog = [];
    diagnosticsChangeLog = [];
    await resetWorkspaceToBaseline();
    changeLog = [];
    diagnosticsChangeLog = [];
  });

  for (const targetMode of ["closed", "open"]) {
    test(`real F2 state rename is one undo unit with my-app.ts ${targetMode}`, async () => {
      await runStateF2Journey(renameUiPage, targetMode);
    }).timeout(REAL_F2_RELIABILITY_TIMEOUT_MS);
  }

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
    assertDiskFilesEqual(
      affected,
      baseline,
      "provider plus workspace.applyEdit should not invoke native refactoring auto-save",
    );

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
    const diagnosticStartedAt = Date.now();
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
      }, "unsaved non-callable template expression should publish TS2349 on the authored member token", DIAGNOSTIC_RELIABILITY_TIMEOUT_MS);
    } catch (error) {
      const diagnostics = vscode.languages.getDiagnostics(document.uri).map((diagnostic) => ({
        source: diagnostic.source,
        code: typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code,
        text: document.getText(diagnostic.range),
        message: diagnostic.message,
      }));
      throw new Error(
        `${error.message}; elapsedMs=${Date.now() - diagnosticStartedAt}; document=${document.languageId}@${document.version}; `
        + `changes=${JSON.stringify(changeLog)}; diagnosticsChanges=${JSON.stringify(diagnosticsChangeLog)}; `
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

function authoredWorkspaceFiles() {
  const files = [];
  const generatedDirectories = new Set([
    ".aurelia",
    ".git",
    "dist",
    "node_modules",
    "out",
  ]);
  const visit = (directory, prefix) => {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const absolute = filePath(rel);
      if (entry.isDirectory()) {
        if (!generatedDirectories.has(entry.name)) {
          visit(absolute, rel);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(rel);
      }
    }
  };
  visit(workspaceRoot, "");
  return files;
}

function captureWorkspaceStage(label) {
  const authoredFiles = authoredWorkspaceFiles();
  assert.deepStrictEqual(
    authoredFiles,
    [...workspaceBaseline.keys()],
    `${label}: authored workspace file set changed`,
  );

  const files = {};
  const exactTokenTotals = { state: 0, state2: 0 };
  for (const rel of authoredFiles) {
    const diskBytes = fs.readFileSync(filePath(rel));
    const document = openDocumentFor(rel);
    const textual = isAuthoredTextFile(rel);
    const diskText = textual ? diskBytes.toString("utf8") : null;
    const bufferText = document?.getText() ?? null;
    const effectiveText = bufferText ?? diskText;
    const exactTokens = {
      state: effectiveText == null ? 0 : exactTokenCount(effectiveText, "state"),
      state2: effectiveText == null ? 0 : exactTokenCount(effectiveText, "state2"),
    };
    exactTokenTotals.state += exactTokens.state;
    exactTokenTotals.state2 += exactTokens.state2;
    files[rel] = {
      diskSha256: sha256(diskBytes),
      bufferSha256: bufferText == null ? null : sha256(bufferText),
      effectiveSha256: effectiveText == null ? sha256(diskBytes) : sha256(effectiveText),
      isOpen: document != null,
      isVisible: vscode.window.visibleTextEditors.some((editor) => editor.document.uri.toString() === uriFor(rel).toString()),
      isDirty: document?.isDirty ?? false,
      version: document?.version ?? null,
      exactTokens,
    };
  }

  return {
    label,
    exactTokenTotals,
    files,
  };
}

function isAuthoredTextFile(rel) {
  return /(?:^|\/)(?:[^/]+\.)?(?:css|html|js|json|jsonc|jsx|less|md|scss|ts|tsx|txt|yaml|yml)$/iu.test(rel);
}

function exactTokenCount(text, token) {
  let count = 0;
  let from = 0;
  while (from <= text.length - token.length) {
    const offset = text.indexOf(token, from);
    if (offset === -1) break;
    const before = offset === 0 ? "" : text[offset - 1];
    const after = offset + token.length === text.length ? "" : text[offset + token.length];
    if (!isIdentifierPart(before) && !isIdentifierPart(after)) {
      count += 1;
    }
    from = offset + token.length;
  }
  return count;
}

function isIdentifierPart(value) {
  return value !== "" && /[A-Za-z0-9_$]/u.test(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertStateTokenContract(snapshot, expectedToken, expectedCount, oppositeCount, affected, label) {
  const oppositeToken = expectedToken === "state" ? "state2" : "state";
  assert.strictEqual(
    snapshot.exactTokenTotals[expectedToken],
    expectedCount,
    `${label}: whole workspace should contain ${expectedCount} exact ${expectedToken} tokens`,
  );
  assert.strictEqual(
    snapshot.exactTokenTotals[oppositeToken],
    oppositeCount,
    `${label}: whole workspace should contain ${oppositeCount} exact ${oppositeToken} tokens`,
  );

  const affectedSet = new Set(affected);
  let affectedExpectedCount = 0;
  let outsideExpectedCount = 0;
  let affectedOppositeCount = 0;
  let outsideOppositeCount = 0;
  for (const [rel, file] of Object.entries(snapshot.files)) {
    if (affectedSet.has(rel)) {
      affectedExpectedCount += file.exactTokens[expectedToken];
      affectedOppositeCount += file.exactTokens[oppositeToken];
    } else {
      outsideExpectedCount += file.exactTokens[expectedToken];
      outsideOppositeCount += file.exactTokens[oppositeToken];
    }
  }
  assert.strictEqual(affectedExpectedCount, expectedCount,
    `${label}: all exact ${expectedToken} tokens should be confined to the expected rename files`);
  assert.strictEqual(affectedOppositeCount, oppositeCount,
    `${label}: expected rename files contain residual exact ${oppositeToken} tokens`);
  assert.strictEqual(outsideExpectedCount, 0,
    `${label}: exact ${expectedToken} residue escaped the expected rename files`);
  assert.strictEqual(outsideOppositeCount, 0,
    `${label}: exact ${oppositeToken} residue escaped the expected rename files`);

  for (const rel of affected) {
    const authoredStateCount = exactTokenCount(workspaceBaseline.get(rel), "state");
    assert.strictEqual(
      snapshot.files[rel].exactTokens[expectedToken],
      authoredStateCount,
      `${label}: ${rel} should contain ${authoredStateCount} exact ${expectedToken} tokens`,
    );
    assert.strictEqual(
      snapshot.files[rel].exactTokens[oppositeToken],
      0,
      `${label}: ${rel} should contain no exact ${oppositeToken} residue`,
    );
  }
}

function assertOnlyExpectedWorkspaceChanges(before, after, expectedChanges, label) {
  assert.deepStrictEqual(
    Object.keys(after.files),
    Object.keys(before.files),
    `${label}: authored workspace file set changed`,
  );
  for (const rel of Object.keys(before.files)) {
    const beforeFile = before.files[rel];
    const afterFile = after.files[rel];
    if (expectedChanges.has(rel)) {
      assert.notStrictEqual(afterFile.effectiveSha256, beforeFile.effectiveSha256,
        `${label}: expected ${rel} effective content to change`);
      continue;
    }
    assert.strictEqual(afterFile.diskSha256, beforeFile.diskSha256,
      `${label}: unexpected disk change in ${rel}`);
    assert.strictEqual(afterFile.effectiveSha256, beforeFile.effectiveSha256,
      `${label}: unexpected buffer or disk change in ${rel}`);
  }
}

function assertRenamePersistencePolicy(before, renamed, targetMode, label) {
  const refactoringAutoSave = vscode.workspace.getConfiguration("files").get("refactoring.autoSave");
  for (const rel of ["src/my-app.html", "src/my-app.ts"]) {
    const beforeFile = before.files[rel];
    const renamedFile = renamed.files[rel];
    assert.notStrictEqual(renamedFile.effectiveSha256, beforeFile.effectiveSha256,
      `${label}: ${rel} should expose renamed effective content`);
    if (refactoringAutoSave === true) {
      assert.notStrictEqual(renamedFile.diskSha256, beforeFile.diskSha256,
        `${label}: VS Code files.refactoring.autoSave should persist ${rel}`);
      assert.strictEqual(renamedFile.diskSha256, renamedFile.effectiveSha256,
        `${label}: ${rel} renamed disk and effective content should agree`);
    } else {
      assert.strictEqual(renamedFile.diskSha256, beforeFile.diskSha256,
        `${label}: disabled files.refactoring.autoSave should leave ${rel} disk unchanged`);
      assert.notStrictEqual(renamedFile.bufferSha256, beforeFile.effectiveSha256,
        `${label}: ${rel} should carry the rename in a buffer while disk remains unchanged`);
      assert.strictEqual(renamedFile.isDirty, true,
        `${label}: ${rel} should be dirty while its rename is only buffered`);
    }
  }
  if (targetMode === "closed" && renamed.files["src/my-app.ts"].isOpen) {
    assert.strictEqual(renamed.files["src/my-app.ts"].isVisible, false,
      `${label}: materialized closed-target my-app.ts should remain hidden`);
  }
  if (targetMode === "closed" && refactoringAutoSave !== true) {
    assert.strictEqual(renamed.files["src/my-app.ts"].isOpen, true,
      `${label}: a buffered closed-target rename must materialize my-app.ts as a TextDocument`);
  }
}

function assertOneUndoPersistencePolicy(before, renamed, undone, label) {
  const refactoringAutoSave = vscode.workspace.getConfiguration("files").get("refactoring.autoSave");
  for (const rel of ["src/my-app.html", "src/my-app.ts"]) {
    const beforeFile = before.files[rel];
    const renamedFile = renamed.files[rel];
    const undoneFile = undone.files[rel];
    if (refactoringAutoSave === true) {
      assert.strictEqual(undoneFile.diskSha256, renamedFile.diskSha256,
        `${label}: one undo should leave the auto-saved rename on disk until the restored buffer is saved`);
      assert.strictEqual(undoneFile.isDirty, true,
        `${label}: ${rel} restored buffer should be dirty over the auto-saved rename`);
      continue;
    }
    assert.strictEqual(undoneFile.diskSha256, beforeFile.diskSha256,
      `${label}: ${rel} disk should remain at the pre-rename hash`);
  }
}

function assertRedoPersistencePolicy(before, redone, label) {
  assert.strictEqual(vscode.workspace.getConfiguration("files").get("autoSave"), "off",
    `${label}: fresh Extension Host profile should keep ordinary auto-save disabled`);
  for (const rel of ["src/my-app.html", "src/my-app.ts"]) {
    const beforeFile = before.files[rel];
    const redoneFile = redone.files[rel];
    assert.strictEqual(redoneFile.diskSha256, beforeFile.diskSha256,
      `${label}: redo should remain buffered after the persisted undo baseline`);
    assert.notStrictEqual(redoneFile.bufferSha256, beforeFile.effectiveSha256,
      `${label}: ${rel} redo should restore renamed buffer content`);
    assert.strictEqual(redoneFile.isDirty, true,
      `${label}: ${rel} redo should be dirty while ordinary auto-save is off`);
  }
}

function assertWorkspaceSnapshotsEqual(actual, expected, label) {
  assert.deepStrictEqual(
    Object.keys(actual.files),
    Object.keys(expected.files),
    `${label}: authored workspace file set differs`,
  );
  for (const rel of Object.keys(expected.files)) {
    assert.strictEqual(actual.files[rel].diskSha256, expected.files[rel].diskSha256,
      `${label}: ${rel} disk hash differs`);
    assert.strictEqual(actual.files[rel].effectiveSha256, expected.files[rel].effectiveSha256,
      `${label}: ${rel} effective buffer/disk hash differs`);
  }
}

function assertEffectiveWorkspaceSnapshotsEqual(actual, expected, label) {
  assert.deepStrictEqual(
    Object.keys(actual.files),
    Object.keys(expected.files),
    `${label}: authored workspace file set differs`,
  );
  for (const rel of Object.keys(expected.files)) {
    assert.strictEqual(actual.files[rel].effectiveSha256, expected.files[rel].effectiveSha256,
      `${label}: ${rel} effective buffer/disk hash differs`);
  }
}

async function waitForStateTokenContract(expectedToken, expectedCount, oppositeCount, affected, label) {
  await waitFor(() => {
    assertStateTokenContract(
      captureWorkspaceStage(label),
      expectedToken,
      expectedCount,
      oppositeCount,
      affected,
      label,
    );
    return true;
  }, `${label}: exact token contract should settle`, DIAGNOSTIC_RELIABILITY_TIMEOUT_MS);
}

async function waitForWorkspaceSnapshot(expected, label) {
  await waitFor(() => {
    assertWorkspaceSnapshotsEqual(captureWorkspaceStage(label), expected, label);
    return true;
  }, `${label}: workspace hashes should settle`, DIAGNOSTIC_RELIABILITY_TIMEOUT_MS);
}

async function waitForEffectiveWorkspaceSnapshot(expected, label) {
  await waitFor(() => {
    assertEffectiveWorkspaceSnapshotsEqual(captureWorkspaceStage(label), expected, label);
    return true;
  }, `${label}: effective workspace hashes should settle`, DIAGNOSTIC_RELIABILITY_TIMEOUT_MS);
}

async function waitForRenamePersistencePolicy(before, targetMode, label) {
  await waitFor(() => {
    assertRenamePersistencePolicy(before, captureWorkspaceStage(label), targetMode, label);
    return true;
  }, `${label}: native refactor persistence policy should settle`, DIAGNOSTIC_RELIABILITY_TIMEOUT_MS);
}

async function activateAureliaExtension() {
  const extension = vscode.extensions.getExtension(extensionId);
  assert(extension, `Expected extension ${extensionId} to be installed in the Extension Development Host.`);
  await extension.activate();
  await showDocument("src/my-app.html");
  await waitFor(async () => {
    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      uriFor("src/my-app.html"),
      positionForNeedle(await documentFor("src/my-app.html"), "state.searchText", "searchText"),
    );
    return Array.isArray(hovers) && hovers.length > 0;
  }, "Aurelia extension should answer language-feature requests");
}

async function resetWorkspaceToBaseline() {
  const edit = new vscode.WorkspaceEdit();
  let hasChanges = false;
  for (const rel of trackedFiles) {
    const expected = baseline.get(rel);
    const doc = openDocumentFor(rel);
    if (doc == null) {
      if (fs.readFileSync(filePath(rel), "utf8") !== expected) {
        fs.writeFileSync(filePath(rel), expected, "utf8");
      }
      continue;
    }
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
  }
  for (const rel of trackedFiles) {
    const doc = openDocumentFor(rel);
    if (doc?.isDirty) {
      const saved = await doc.save();
      assert.strictEqual(saved, true, `fixture reset should save ${rel}`);
    }
  }
  await waitForWorkspaceFilesEqual(trackedFiles, baseline, "fixture reset");
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
  return openDocumentFor(rel) ?? vscode.workspace.openTextDocument(uri);
}

function openDocumentFor(rel) {
  const uri = uriFor(rel);
  return vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
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

async function connectRenameUiPage() {
  const port = Number(process.env.AURELIA_LS_RENAME_UI_CDP_PORT);
  assert(Number.isSafeInteger(port) && port > 0 && port <= 65_535,
    `AURELIA_LS_RENAME_UI_CDP_PORT must be a TCP port, received ${process.env.AURELIA_LS_RENAME_UI_CDP_PORT}`);
  let browser;
  await waitFor(async () => {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
      return true;
    } catch {
      return false;
    }
  }, `rename UI driver should connect to VS Code CDP port ${port}`, 30_000);
  const pages = browser.contexts().flatMap((context) => context.pages());
  for (const page of pages) {
    if (await page.locator(".monaco-workbench").count() > 0) {
      return page;
    }
  }
  throw new Error(`rename UI driver found no VS Code workbench page on CDP port ${port}`);
}

async function runStateF2Journey(page, targetMode) {
  const affected = ["src/my-app.html", "src/my-app.ts"];
  if (targetMode === "open") {
    await showDocument("src/my-app.ts");
  } else {
    assert.strictEqual(openDocumentFor("src/my-app.ts"), undefined,
      "closed-target F2 journey must begin without a my-app.ts TextDocument");
  }
  const origin = await showDocument("src/my-app.html");
  const before = captureWorkspaceStage("before-rename");
  assert.strictEqual(before.files["src/my-app.ts"].isOpen, targetMode === "open");
  assertStateTokenContract(before, "state", 11, 0, affected, "before rename");

  changeLog = [];
  await renameThroughF2(page, origin, "state.selectionProgressPercent", "state", "state2");
  await waitForStateTokenContract("state2", 11, 0, affected, "after real F2 rename");
  await waitForRenamePersistencePolicy(before, targetMode, "after real F2 rename");
  await waitForDiagnosticsClean(affected, "after real F2 rename");
  const renamed = captureWorkspaceStage("after-rename");
  assertOnlyExpectedWorkspaceChanges(before, renamed, new Set(affected), "after real F2 rename");
  assertStateTokenContract(renamed, "state2", 11, 0, affected, "after real F2 rename");
  assertRenamePersistencePolicy(before, renamed, targetMode, "after real F2 rename");

  changeLog = [];
  await runEditorCommand("undo", origin);
  await waitForEffectiveWorkspaceSnapshot(before, "after exactly one real F2 undo");
  await waitForDiagnosticsClean(affected, "after exactly one real F2 undo");
  const undone = captureWorkspaceStage("after-one-undo");
  assertEffectiveWorkspaceSnapshotsEqual(undone, before, "one real F2 undo");
  assertStateTokenContract(undone, "state", 11, 0, affected, "after exactly one real F2 undo");
  assertOneUndoPersistencePolicy(before, renamed, undone, "after exactly one real F2 undo");
  assertUndoRedoReasons(
    targetMode === "open" ? affected : ["src/my-app.html"],
    vscode.TextDocumentChangeReason.Undo,
    `real F2 ${targetMode}-target undo`,
  );

  // Native rename deliberately asks VS Code to respect files.refactoring.autoSave.
  // Capture the exact one-undo state before flushing dirty buffers so the receipt
  // explains disk/effective divergence without mistaking it for another undo unit.
  console.log(`[aurelia-extension-host] real F2 one-undo state ${JSON.stringify({
    autoSave: vscode.workspace.getConfiguration("files").get("autoSave"),
    autoSaveDelay: vscode.workspace.getConfiguration("files").get("autoSaveDelay"),
    refactoringAutoSave: vscode.workspace.getConfiguration("files").get("refactoring.autoSave"),
    files: Object.fromEntries(affected.map((rel) => [rel, undone.files[rel]])),
  })}`);
  await saveDocuments(affected, "persisting exactly one real F2 undo");
  await waitForWorkspaceSnapshot(before, "after persisting exactly one real F2 undo");
  await waitForDirtyState(affected, false, "after persisting exactly one real F2 undo");
  const persistedUndone = captureWorkspaceStage("after-one-undo-save");
  assertWorkspaceSnapshotsEqual(persistedUndone, before, "persisted one real F2 undo");

  changeLog = [];
  await runEditorCommand("redo", origin);
  await waitForStateTokenContract("state2", 11, 0, affected, "after real F2 redo");
  await waitForDiagnosticsClean(affected, "after real F2 redo");
  const redone = captureWorkspaceStage("after-redo");
  assertEffectiveWorkspaceSnapshotsEqual(redone, renamed, "real F2 redo");
  assertStateTokenContract(redone, "state2", 11, 0, affected, "after real F2 redo");
  assertRedoPersistencePolicy(before, redone, "after real F2 redo");
  assertUndoRedoReasons(
    targetMode === "open" ? affected : ["src/my-app.html"],
    vscode.TextDocumentChangeReason.Redo,
    `real F2 ${targetMode}-target redo`,
  );

  const receipt = {
    schemaVersion: "aurelia-real-f2-rename/1",
    vscodeVersion: vscode.version,
    targetMode,
    renamePath: "keyboard:F2 -> native rename input -> Enter",
    autoSave: vscode.workspace.getConfiguration("files").get("autoSave"),
    autoSaveDelay: vscode.workspace.getConfiguration("files").get("autoSaveDelay"),
    refactoringAutoSave: vscode.workspace.getConfiguration("files").get("refactoring.autoSave"),
    expectedEditCount: 11,
    affected,
    stages: [before, renamed, undone, persistedUndone, redone],
  };
  const receiptPath = path.join(workspaceRoot, "..", `state-rename-real-f2-${targetMode}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  console.log(`[aurelia-extension-host] real F2 receipt ${receiptPath}`);
}

async function renameThroughF2(page, document, needle, oldName, newName) {
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  const position = positionForNeedle(document, needle, oldName);
  editor.selection = new vscode.Selection(position, position);
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  await page.bringToFront();
  // Current VS Code uses Chromium EditContext while the minimum 1.91 lane uses
  // Monaco's textarea input. Focusing either DOM carrier preserves the cursor
  // selected through the extension API while making the keyboard F2 literal.
  const editorInputs = page.locator([
    ".part.editor .monaco-editor:visible .native-edit-context",
    ".part.editor .monaco-editor:visible textarea.inputarea",
  ].join(", "));
  assert.ok(await editorInputs.count() >= 1,
    "real F2 journey should find a Monaco editor input");
  const editorInput = editorInputs.last();
  await editorInput.focus();
  await page.waitForFunction(() => document.activeElement?.matches(".native-edit-context, textarea.inputarea"));
  await page.keyboard.press("F2");
  const input = page.locator(".rename-box input.rename-input").first();
  try {
    await input.waitFor({ state: "visible", timeout: 60_000 });
  } catch (error) {
    const uiState = await page.evaluate(() => ({
      activeElement: document.activeElement == null
        ? null
        : {
            className: document.activeElement.className,
            nodeName: document.activeElement.nodeName,
          },
      renameBoxes: [...document.querySelectorAll(".rename-box")].map((element) => ({
        className: element.className,
        display: getComputedStyle(element).display,
        visibility: getComputedStyle(element).visibility,
      })),
      renameInputs: [...document.querySelectorAll("input")]
        .filter((element) => element.className.includes("rename") || element.closest(".rename-box") != null)
        .map((element) => ({
          className: element.className,
          display: getComputedStyle(element).display,
          visibility: getComputedStyle(element).visibility,
          value: element.value,
        })),
    }));
    throw new Error(`native F2 did not expose the rename input; ui=${JSON.stringify(uiState)}; ${error.message}`);
  }
  assert.strictEqual(await input.inputValue(), oldName,
    "native rename input should initialize with the authored state token");
  await input.fill(newName);
  assert.strictEqual(await input.inputValue(), newName,
    "native rename input should contain the requested state2 token");
  await input.press("Enter");
  await input.waitFor({ state: "hidden", timeout: 60_000 });
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
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
  assert.strictEqual(
    vscode.window.activeTextEditor?.document.uri.toString(),
    editor.document.uri.toString(),
    `${command} must target the requested active editor`,
  );
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

async function waitForWorkspaceFilesEqual(files, expected, label) {
  await waitFor(() => {
    for (const rel of files) {
      const target = expected instanceof Map ? expected.get(rel) : expected[rel];
      const openDocument = openDocumentFor(rel);
      const bufferText = openDocument?.getText() ?? null;
      const diskText = fs.readFileSync(filePath(rel), "utf8");
      if ((bufferText != null && bufferText !== target) || diskText !== target) {
        return false;
      }
    }
    return true;
  }, `${label}: buffers and disk files should match expected text`);
}

function assertDiskFilesEqual(files, expected, label) {
  for (const rel of files) {
    const target = expected instanceof Map ? expected.get(rel) : expected[rel];
    assert.strictEqual(fs.readFileSync(filePath(rel), "utf8"), target,
      `${label}: unexpected persisted content in ${rel}`);
  }
}

async function waitForDiagnosticsClean(files, label) {
  await waitFor(() => {
    const diagnostics = [];
    for (const rel of files) {
      const uri = uriFor(rel);
      diagnostics.push(...vscode.languages.getDiagnostics(uri)
        .filter(isRelevantDiagnostic)
        .map((diagnostic) => ({
          file: rel,
          source: diagnostic.source,
          code: typeof diagnostic.code === "object" ? diagnostic.code?.value : diagnostic.code,
          message: diagnostic.message,
          range: {
            start: diagnostic.range.start,
            end: diagnostic.range.end,
          },
        })));
    }
    if (diagnostics.length > 0) {
      throw new Error(`${label}: expected no relevant diagnostics; observed ${JSON.stringify(diagnostics)}`);
    }
    return true;
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
