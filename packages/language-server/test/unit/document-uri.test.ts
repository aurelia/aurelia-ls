import path from "node:path";
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
});
