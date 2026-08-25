import ts from "typescript";
import { describe, expect, test } from "vitest";
import { sameDocumentUri } from "../../out/core/uri-identity.js";
import { workspaceFolderContainsUri } from "../../out/workspace-activation.js";
import { createVscodeApi } from "../helpers/vscode-stub.js";

describe("workspace activation path identity", () => {
  test("follows the detected host case policy for workspace containment", () => {
    const { vscode } = createVscodeApi({
      workspaceFolders: [{ name: "app", uri: "file:///CaseRoot/Workspace" }],
    });
    const folder = vscode.workspace.workspaceFolders![0]!;

    expect(workspaceFolderContainsUri(
      folder as never,
      vscode.Uri.parse("file:///caseroot/workspace/src/Widget.ts") as never,
    )).toBe(!ts.sys.useCaseSensitiveFileNames);
    expect(workspaceFolderContainsUri(
      folder as never,
      vscode.Uri.parse("file:///CaseRoot/WorkspaceSibling/src/Widget.ts") as never,
    )).toBe(false);
  });

  test("follows the detected host case policy for filesystem URI identity", () => {
    const { vscode } = createVscodeApi();

    expect(sameDocumentUri(
      vscode as never,
      "file:///CaseRoot/Workspace/src/Widget.ts",
      "file:///caseroot/workspace/src/widget.ts",
    )).toBe(!ts.sys.useCaseSensitiveFileNames);
  });
});
