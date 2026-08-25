import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
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
    expect(documentUris.resolve("file:///C:/Workspace/App/src/Widget.ts").uri).toBe(
      "file:///C:/Workspace/App/src/Widget.ts",
    );
    expect(documentUris.sameDocument(
      "file:///C:/Workspace/App/src/my-app.ts",
      "file:///c:/workspace/app/src/my-app.ts",
    )).toBe(true);
    expect(documentUris.sameDocument(
      "/home/user/app/src/my-app.ts",
      "C:\\home\\user\\app\\src\\my-app.ts",
    )).toBe(false);
    expect(documentUris.sameDocument(
      "/home/user/app/src/my-app.ts",
      "\\home\\user\\app\\src\\my-app.ts",
    )).toBe(false);
  });

  test("follows the detected host case policy for document identity", () => {
    const documentUris = new WorkspaceDocumentUris();
    const workspaceRoot = path.resolve("uri-case-policy-workspace");
    documentUris.configure(pathToFileURL(workspaceRoot).toString());
    const authored = pathToFileURL(path.join(workspaceRoot, "src", "Widget.ts")).toString();
    const caseVariant = pathToFileURL(path.join(workspaceRoot, "src", "widget.ts")).toString();

    expect(documentUris.sameDocument(authored, caseVariant)).toBe(
      !ts.sys.useCaseSensitiveFileNames,
    );
    expect(documentUris.ownsDocument(caseVariant)).toBe(true);
    expect(documentUris.hasHostFileName(authored, "widget.ts")).toBe(
      !ts.sys.useCaseSensitiveFileNames,
    );
    const rootCaseVariant = pathToFileURL(path.join(
      path.dirname(workspaceRoot),
      path.basename(workspaceRoot).toUpperCase(),
      "src",
      "Widget.ts",
    )).toString();
    expect(documentUris.ownsDocument(rootCaseVariant)).toBe(
      !ts.sys.useCaseSensitiveFileNames,
    );
  });

  test("keeps Windows URI ownership bounded independently of the server host", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("file:///C:/Workspace/App", [
      "file:///C:/Workspace/App/packages/disabled",
      "file:///C:/Workspace/App/packages/disabled/nested",
    ]);

    expect(documentUris.workspaceRoot).toBe(path.win32.normalize("C:/Workspace/App"));
    expect(documentUris.excludedWorkspaceRoots).toEqual([
      path.win32.normalize("C:/Workspace/App/packages/disabled"),
    ]);
    expect(documentUris.ownsDocument("file:///C:/Workspace/App/src/main.ts")).toBe(true);
    expect(documentUris.ownsDocument("file:///C:/Workspace/App/packages/disabled/main.ts")).toBe(false);
    expect(documentUris.ownsDocument("file:///C:/Workspace/App-sibling/src/main.ts")).toBe(false);
    expect(documentUris.sameDocument(
      "C:\\Workspace\\App\\src\\Widget.ts",
      "file:///c:/workspace/app/src/widget.ts",
    )).toBe(true);
    expect(documentUris.hasHostFileName(
      "file:///C:/Workspace/App/AURELIA.PROJECT.JSON",
      "aurelia.project.json",
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

  test("round-trips UNC workspace URIs independently of the server host", () => {
    const documentUris = new WorkspaceDocumentUris();
    documentUris.configure("file://Server/Share/App", [
      "file://Server/Share/App/packages/disabled",
    ]);

    const authored = "file://server/Share/App/src/my%20app.ts";
    const authoredHostPath = "\\\\server\\Share\\App\\src\\my app.ts";
    expect(documentUris.workspaceRoot).toBe("\\\\server\\Share\\App");
    expect(documentUris.hostPath(authored)).toBe(authoredHostPath);
    expect(documentUris.ownsDocument(authored)).toBe(true);
    expect(documentUris.ownsDocument("file://server/Share/App/packages/disabled/main.ts")).toBe(false);
    expect(documentUris.ownsDocument("file://server/Share/App-sibling/main.ts")).toBe(false);
    expect(documentUris.sameDocument(documentUris.uriForHostPath(authoredHostPath), authored)).toBe(true);
    expect(documentUris.sameDocument("//SERVER/Share/App/src/my app.ts", authored)).toBe(true);
    expect(documentUris.uriForHostPath("//SERVER/Share/App/src/my app.ts"))
      .toBe("file://server/Share/App/src/my%20app.ts");
  });

  test.runIf(process.platform !== "win32")(
    "rejects Windows path domains from a POSIX workspace",
    () => {
      const documentUris = new WorkspaceDocumentUris();
      documentUris.configure(pathToFileURL(process.cwd()).toString());

      expect(documentUris.ownsDocument("C:\\outside\\source.ts")).toBe(false);
      expect(documentUris.workspaceHostPath("C:\\outside\\source.ts")).toBeNull();
      expect(documentUris.uriForWorkspaceRelativePath("C:\\outside\\source.ts")).toBeNull();
      expect(() => documentUris.configure(pathToFileURL(process.cwd()).toString(), [
        "file:///C:/outside",
      ])).toThrow(/strict descendant/u);
    },
  );

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
