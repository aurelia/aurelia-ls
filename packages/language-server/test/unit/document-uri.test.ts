import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

describe("WorkspaceDocumentUris", () => {
  test.runIf(process.platform === "win32")("keeps client-authored drive casing separate from document identity", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("file:///C:/Workspace/App");

    expect(documentUris.workspaceRoot).toBe(path.normalize("C:/Workspace/App"));
    expect(documentUris.uriForWorkspaceRelativePath("src/my-app.ts")).toBe(
      "file:///C:/Workspace/App/src/my-app.ts",
    );
    expect(documentUris.sameDocument(
      "file:///C:/Workspace/App/src/my-app.ts",
      "file:///c:/workspace/app/src/my-app.ts",
    )).toBe(true);
  });

  test("projects semantic paths into a remote workspace URI namespace", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("vscode-remote://ssh-remote+dev/home/user/my%20app");

    expect(documentUris.uriForWorkspaceRelativePath("src/my-app.ts")).toBe(
      "vscode-remote://ssh-remote%2Bdev/home/user/my%20app/src/my-app.ts",
    );
    expect(documentUris.hostPath(
      "vscode-remote://ssh-remote%2Bdev/home/user/my%20app/src/my-app.ts",
    )).toBe(path.normalize("/home/user/my app/src/my-app.ts"));
    expect(documentUris.hostPath(
      "vscode-remote://ssh-remote%2Bother/home/user/my%20app/src/my-app.ts",
    )).toBeNull();
  });

  test("separates incoming authored ownership from unrestricted source projection", () => {
    const documentUris = new WorkspaceDocumentUris();
    const workspaceRoot = path.resolve("uri-boundary-workspace");
    const disabledRoot = path.join(workspaceRoot, "packages", "disabled");
    const disabledFile = path.join(disabledRoot, "src", "main.ts");
    documentUris.configure(pathToFileURL(workspaceRoot).toString(), [
      pathToFileURL(disabledRoot).toString(),
      pathToFileURL(path.join(disabledRoot, "nested")).toString(),
    ]);

    expect(documentUris.excludedWorkspaceRoots).toEqual([
      disabledRoot,
    ]);
    expect(documentUris.ownsDocument(pathToFileURL(path.join(workspaceRoot, "src", "main.ts")).toString())).toBe(true);
    expect(documentUris.ownsDocument(pathToFileURL(disabledFile).toString())).toBe(false);
    expect(documentUris.ownsDocument(pathToFileURL(`${workspaceRoot}-sibling/src/main.ts`).toString())).toBe(false);
    expect(documentUris.authoredHostPath(pathToFileURL(disabledFile).toString())).toBeNull();

    expect(documentUris.hostPath(pathToFileURL(disabledFile).toString())).toBe(disabledFile);
    expect(documentUris.uriForHostPath(disabledFile)).toBe(pathToFileURL(disabledFile).toString());
  });

  test("requires exclusions and incoming documents to share the workspace URI space", () => {
    const documentUris = new WorkspaceDocumentUris();
    expect(() => documentUris.configure("vscode-remote://ssh-remote+dev/home/user/app", [
      "vscode-remote://ssh-remote+other/home/user/app/disabled",
    ])).toThrow(/does not share the workspace URI space/);

    documentUris.configure("vscode-remote://ssh-remote+dev/home/user/app", [
      "vscode-remote://ssh-remote+dev/home/user/app/disabled",
    ]);
    expect(documentUris.ownsDocument(
      "vscode-remote://ssh-remote+dev/home/user/app/src/main.ts",
    )).toBe(true);
    expect(documentUris.ownsDocument(
      "vscode-remote://ssh-remote+dev/home/user/app/disabled/main.ts",
    )).toBe(false);
    expect(documentUris.ownsDocument("file:///home/user/app/src/main.ts")).toBe(false);
  });
});
