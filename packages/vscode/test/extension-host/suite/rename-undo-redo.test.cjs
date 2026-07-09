const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const workspaceRoot = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";
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

suite("extension-host rename reliability", () => {
  let subscription;

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

    await activateAureliaExtension();
  });

  suiteTeardown(() => {
    subscription?.dispose();
  });

  setup(async () => {
    changeLog = [];
    await resetWorkspaceToBaseline();
    changeLog = [];
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
  await extension.activate();
  await showDocument("src/my-app.html");
  await waitFor(async () => {
    const hovers = await vscode.commands.executeCommand(
      "vscode.executeHoverProvider",
      uriFor("src/my-app.html"),
      positionForNeedle(await documentFor("src/my-app.html"), "state.searchText", "searchText"),
    );
    return Array.isArray(hovers);
  }, "Aurelia extension should answer language-feature requests");
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
