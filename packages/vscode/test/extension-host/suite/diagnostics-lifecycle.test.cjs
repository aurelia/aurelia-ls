const assert = require("assert");
const path = require("path");
const vscode = require("vscode");

const aureliaWorkspace = process.env.AURELIA_LS_EXTENSION_HOST_WORKSPACE;
const extensionId = "AureliaEffect.aurelia-2";
const diagnosticMarker = "missingLifecycleProblem";
const initialDirectory = "diagnostics-lifecycle";
const renamedDirectory = "diagnostics-lifecycle-renamed";
const initialTemplateName = "lifecycle-card.html";
const renamedTemplateName = "renamed-card.html";
const transientTemplateName = "transient-card.html";

if (!aureliaWorkspace) {
  throw new Error("AURELIA_LS_EXTENSION_HOST_WORKSPACE is required.");
}

suite("extension-host Aurelia Problems lifecycle", () => {
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert(extension, `Expected extension ${extensionId} in the Extension Development Host.`);
    await extension.activate();
  });

  test("clears exact old URI collections across file, folder, delete, membership, and session transitions", async function() {
    this.timeout(300_000);

    const workspaceUri = vscode.Uri.file(aureliaWorkspace);
    const configUri = vscode.Uri.joinPath(workspaceUri, "aurelia.project.json");
    const originalConfiguration = await vscode.workspace.fs.readFile(configUri);
    const activation = vscode.workspace.getConfiguration("aurelia", workspaceUri);
    const originalActivationMode = activation.inspect("activationMode")?.workspaceFolderValue;
    let primaryFolderRemoved = false;
    const retiredUris = new Map();

    try {
      let directoryUri = vscode.Uri.joinPath(workspaceUri, "src", initialDirectory);
      await vscode.workspace.fs.createDirectory(directoryUri);
      let viewModelUri = vscode.Uri.joinPath(directoryUri, "lifecycle-card.ts");
      let currentUri = vscode.Uri.joinPath(directoryUri, initialTemplateName);
      await vscode.workspace.fs.writeFile(viewModelUri, Buffer.from(viewModelText(initialTemplateName), "utf8"));
      await vscode.workspace.fs.writeFile(currentUri, Buffer.from(templateText(), "utf8"));

      await showDocument(currentUri);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the planted lifecycle Problem");

      const fileRenamedUri = vscode.Uri.joinPath(directoryUri, renamedTemplateName);
      await renameWorkspaceResource(currentUri, fileRenamedUri);
      await rewriteViewModelTemplateImport(viewModelUri, renamedTemplateName);
      await showDocument(fileRenamedUri);
      await expectAureliaProblem(fileRenamedUri, diagnosticMarker, "the file-renamed current URI");
      await expectNoAureliaProblems(currentUri, "the file-renamed old URI");
      retiredUris.set(currentUri.toString(), currentUri);
      currentUri = fileRenamedUri;

      // Two opposite file moves inside the server's topology debounce window prove
      // that no transient URI collection survives while the final URI settles.
      const transientUri = vscode.Uri.joinPath(directoryUri, transientTemplateName);
      await renameWorkspaceResource(currentUri, transientUri);
      await rewriteViewModelTemplateImport(viewModelUri, transientTemplateName);
      await renameWorkspaceResource(transientUri, currentUri);
      await rewriteViewModelTemplateImport(viewModelUri, renamedTemplateName);
      await showDocument(currentUri);
      await expectAureliaProblem(
        currentUri,
        diagnosticMarker,
        "the final URI after rapid rename churn",
        120_000,
      );
      await expectNoAureliaProblems(transientUri, "the transient rename URI");
      retiredUris.set(transientUri.toString(), transientUri);

      const oldFolderTemplateUri = currentUri;
      const renamedDirectoryUri = vscode.Uri.joinPath(workspaceUri, "src", renamedDirectory);
      await renameWorkspaceResource(directoryUri, renamedDirectoryUri);
      directoryUri = renamedDirectoryUri;
      viewModelUri = vscode.Uri.joinPath(directoryUri, "lifecycle-card.ts");
      currentUri = vscode.Uri.joinPath(directoryUri, renamedTemplateName);
      await showDocument(currentUri);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the folder-renamed current URI");
      await expectNoAureliaProblems(oldFolderTemplateUri, "the folder-renamed old URI");
      retiredUris.set(oldFolderTemplateUri.toString(), oldFolderTemplateUri);

      const retainedTemplate = await vscode.workspace.fs.readFile(currentUri);
      await deleteWorkspaceResource(currentUri);
      await expectNoAureliaProblems(currentUri, "the deleted URI");

      await vscode.workspace.fs.writeFile(currentUri, retainedTemplate);
      await showDocument(currentUri);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the recreated current URI");

      await vscode.workspace.fs.writeFile(configUri, Buffer.from(JSON.stringify({
        version: 1,
        authoredSources: { excludedRoots: [`src/${renamedDirectory}`] },
      }), "utf8"));
      await expectNoAureliaProblems(currentUri, "the configuration-excluded URI");

      await vscode.workspace.fs.writeFile(configUri, originalConfiguration);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the configuration-readmitted URI");

      await activation.update("activationMode", "off", vscode.ConfigurationTarget.WorkspaceFolder);
      await expectNoAureliaProblems(currentUri, "the retired-session URI");

      await activation.update("activationMode", "on", vscode.ConfigurationTarget.WorkspaceFolder);
      await showDocument(currentUri);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the replacement-session URI");

      const primaryFolder = exactWorkspaceFolder(workspaceUri);
      await updateWorkspaceFoldersAndWait(primaryFolder.index, 1);
      primaryFolderRemoved = true;
      await expectNoAureliaProblems(currentUri, "the retired-workspace URI");

      await updateWorkspaceFoldersAndWait(primaryFolder.index, 0, {
        uri: workspaceUri,
        name: primaryFolder.name,
      });
      primaryFolderRemoved = false;
      await showDocument(currentUri);
      await expectAureliaProblem(currentUri, diagnosticMarker, "the re-added workspace URI");
      await expectAllRetiredUrisAbsent(retiredUris.values(), "the final cumulative retired-URI sweep");
    } finally {
      if (primaryFolderRemoved) {
        const insertionIndex = vscode.workspace.workspaceFolders?.length ?? 0;
        await updateWorkspaceFoldersAndWait(insertionIndex, 0, {
          uri: workspaceUri,
          name: path.basename(aureliaWorkspace),
        });
      }
      await vscode.workspace.fs.writeFile(configUri, originalConfiguration);
      await activation.update(
        "activationMode",
        originalActivationMode,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await deleteWorkspaceDirectoryIfPresent(
        vscode.Uri.joinPath(workspaceUri, "src", initialDirectory),
      );
      await deleteWorkspaceDirectoryIfPresent(
        vscode.Uri.joinPath(workspaceUri, "src", renamedDirectory),
      );
    }
  });
});

function viewModelText(templateName) {
  return [
    "import { customElement } from 'aurelia';",
    `import template from './${templateName}';`,
    "@customElement({ name: 'diagnostic-lifecycle-card', template })",
    "export class DiagnosticLifecycleCard { existing = 1; }",
    "",
  ].join("\n");
}

function templateText() {
  return `<template>\${${diagnosticMarker}}</template>\n`;
}

async function rewriteViewModelTemplateImport(viewModelUri, templateName) {
  await vscode.workspace.fs.writeFile(
    viewModelUri,
    Buffer.from(viewModelText(templateName), "utf8"),
  );
}

async function showDocument(uri) {
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
  return document;
}

async function renameWorkspaceResource(oldUri, newUri) {
  const edit = new vscode.WorkspaceEdit();
  edit.renameFile(oldUri, newUri, { overwrite: false, ignoreIfExists: false });
  assert.strictEqual(
    await vscode.workspace.applyEdit(edit),
    true,
    `Expected workspace rename ${oldUri.toString()} -> ${newUri.toString()} to apply.`,
  );
}

async function deleteWorkspaceResource(uri) {
  const edit = new vscode.WorkspaceEdit();
  edit.deleteFile(uri, { recursive: false, ignoreIfNotExists: false });
  assert.strictEqual(
    await vscode.workspace.applyEdit(edit),
    true,
    `Expected workspace delete ${uri.toString()} to apply.`,
  );
}

async function deleteWorkspaceDirectoryIfPresent(uri) {
  try {
    await vscode.workspace.fs.stat(uri);
  } catch (error) {
    if (error?.code === "FileNotFound") return;
    throw error;
  }
  await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
}

async function expectAureliaProblem(uri, marker, label, timeoutMilliseconds = 60_000) {
  const diagnostics = await waitForAureliaDiagnostics(
    uri,
    (rows) => rows.some((diagnostic) => diagnostic.message.includes(marker)),
    `${label} should publish an Aurelia diagnostic containing ${marker}`,
    timeoutMilliseconds,
  );
  assert(
    diagnostics.some((diagnostic) => diagnostic.message.includes(marker)),
    `${label} did not contain ${marker}: ${describeDiagnostics(diagnostics)}`,
  );
}

async function expectNoAureliaProblems(uri, label) {
  const diagnostics = await waitForAureliaDiagnostics(
    uri,
    (rows) => rows.length === 0,
    `${label} should reach an explicit zero/absent Aurelia collection`,
  );
  assert.deepStrictEqual(diagnostics, [], `${label} retained Aurelia Problems.`);
  await assertAureliaDiagnosticsRemainAbsent(uri, label, 600);
}

async function expectAllRetiredUrisAbsent(uris, label) {
  for (const uri of uris) {
    await expectNoAureliaProblems(uri, `${label}: ${uri.toString()}`);
  }
}

async function waitForAureliaDiagnostics(uri, accept, message, timeoutMilliseconds = 60_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let latest = aureliaDiagnostics(uri);
  while (!accept(latest)) {
    if (Date.now() >= deadline) {
      assert.fail(`${message}; latest=${describeDiagnostics(latest)}`);
    }
    await waitForDiagnosticChangeOrDelay(uri, Math.min(100, deadline - Date.now()));
    latest = aureliaDiagnostics(uri);
  }
  return latest;
}

async function assertAureliaDiagnosticsRemainAbsent(uri, label, durationMilliseconds) {
  const deadline = Date.now() + durationMilliseconds;
  while (Date.now() < deadline) {
    await waitForDiagnosticChangeOrDelay(uri, Math.min(100, deadline - Date.now()));
    const rows = aureliaDiagnostics(uri);
    assert.deepStrictEqual(
      rows,
      [],
      `${label} republished an Aurelia Problem after reaching zero: ${describeDiagnostics(rows)}`,
    );
  }
}

function waitForDiagnosticChangeOrDelay(uri, timeoutMilliseconds) {
  return new Promise((resolve) => {
    let settled = false;
    const subscription = vscode.languages.onDidChangeDiagnostics((event) => {
      if (!event.uris.some((candidate) => candidate.toString() === uri.toString())) return;
      settle();
    });
    const timer = setTimeout(settle, Math.max(1, timeoutMilliseconds));
    function settle() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    }
  });
}

function aureliaDiagnostics(uri) {
  return vscode.languages.getDiagnostics(uri).filter((diagnostic) =>
    typeof diagnostic.source === "string"
    && diagnostic.source.toLowerCase() === "aurelia"
  );
}

function describeDiagnostics(diagnostics) {
  return JSON.stringify(diagnostics.map((diagnostic) => ({
    source: diagnostic.source,
    code: diagnostic.code,
    message: diagnostic.message,
  })));
}

function exactWorkspaceFolder(uri) {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const folder = folders.find((candidate) => candidate.uri.toString() === uri.toString());
  assert(folder, `Expected workspace folder ${uri.toString()}.`);
  return folder;
}

async function updateWorkspaceFoldersAndWait(start, deleteCount, ...foldersToAdd) {
  const changed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error("Timed out waiting for the workspace-folder lifecycle event."));
    }, 60_000);
    const subscription = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      clearTimeout(timer);
      subscription.dispose();
      resolve(event);
    });
  });
  assert.strictEqual(
    vscode.workspace.updateWorkspaceFolders(start, deleteCount, ...foldersToAdd),
    true,
    "Expected the workspace-folder update to be accepted.",
  );
  await changed;
}
