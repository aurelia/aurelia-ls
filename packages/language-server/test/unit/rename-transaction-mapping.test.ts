import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA,
  aureliaWorkspaceEditContentRevision,
} from "../../src/protocol.js";
import { mapSemanticRuntimeTemplateRenameEdit } from "../../src/mapping/lsp-types.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";
import { canonicalTypeSystemPath } from "@aurelia-ls/semantic-runtime";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("rename transaction mapping", () => {
  test("carries exact open and closed document revisions to the client", () => {
    const fixture = mappingFixture();
    const mapping = mapSemanticRuntimeTemplateRenameEdit(
      renameAnswer([
        edit(fixture.originPath, fixture.originText, 3, 8),
        edit(fixture.targetPath, fixture.targetText, 13, 18),
      ]),
      (uri) => fixture.snapshot(uri),
      {
        documentUris: fixture.documentUris,
        originDocument: fixture.originDocument,
      },
    );

    expect(mapping.failures).toEqual([]);
    expect(mapping.edit?.aureliaWorkspaceEditTransaction).toEqual({
      schema: AURELIA_WORKSPACE_EDIT_TRANSACTION_SCHEMA,
      documents: [
        expect.objectContaining({
          uri: fixture.originUri,
          version: 3,
          contentRevision: aureliaWorkspaceEditContentRevision(fixture.originText),
          physicalPath: canonicalTypeSystemPath(realpathSync.native(fixture.originPath)),
        }),
        expect.objectContaining({
          uri: fixture.targetUri,
          version: null,
          contentRevision: aureliaWorkspaceEditContentRevision(fixture.targetText),
          physicalPath: canonicalTypeSystemPath(realpathSync.native(fixture.targetPath)),
        }),
      ].sort((left, right) => String(left.uri).localeCompare(String(right.uri))),
    });
  });

  test("refuses URI-distinct edit targets that alias one physical file", () => {
    const fixture = mappingFixture();
    const aliasRoot = path.join(fixture.root, "alias-src");
    symlinkSync(path.dirname(fixture.targetPath), aliasRoot, process.platform === "win32" ? "junction" : "dir");
    const aliasPath = path.join(aliasRoot, path.basename(fixture.targetPath));
    const aliasUri = pathToFileURL(aliasPath).toString();

    const mapping = mapSemanticRuntimeTemplateRenameEdit(
      renameAnswer([
        edit(fixture.targetPath, fixture.targetText, 13, 18),
        edit(aliasPath, fixture.targetText, 13, 18),
      ]),
      (uri) => uri === fixture.targetUri || uri === aliasUri
        ? { uri, languageId: "typescript", version: null, text: fixture.targetText }
        : null,
      {
        documentUris: fixture.documentUris,
        originDocument: fixture.originDocument,
      },
    );

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([expect.stringContaining("alias the same physical source")]);
  });

  test.runIf(process.platform === "win32")("refuses case-distinct URI aliases for one target", () => {
    const fixture = mappingFixture();
    const caseAliasPath = fixture.targetPath.toUpperCase();
    const caseAliasUri = pathToFileURL(caseAliasPath).toString();

    const mapping = mapSemanticRuntimeTemplateRenameEdit(
      renameAnswer([
        edit(fixture.targetPath, fixture.targetText, 13, 18),
        edit(caseAliasPath, fixture.targetText, 19, 23),
      ]),
      (uri) => fixture.documentUris.sameDocument(uri, fixture.targetUri)
        ? { uri, languageId: "typescript", version: null, text: fixture.targetText }
        : null,
      {
        documentUris: fixture.documentUris,
        originDocument: fixture.originDocument,
      },
    );

    expect(mapping.edit).toBeNull();
    expect(mapping.failures).toEqual([expect.stringContaining("alias the same physical source")]);
  });
});

function mappingFixture() {
  const root = mkdtempSync(path.join(process.cwd(), ".rename-mapping-"));
  temporaryRoots.push(root);
  const sourceRoot = path.join(root, "src");
  mkdirSync(sourceRoot, { recursive: true });
  const originPath = path.join(sourceRoot, "app.html");
  const targetPath = path.join(sourceRoot, "app.ts");
  const originText = "<p>title</p>\n";
  const targetText = "export const title = true;\n";
  writeFileSync(originPath, originText, "utf8");
  writeFileSync(targetPath, targetText, "utf8");
  const originUri = pathToFileURL(originPath).toString();
  const targetUri = pathToFileURL(targetPath).toString();
  const documentUris = new WorkspaceDocumentUris();
  documentUris.configure(pathToFileURL(root).toString());
  const originDocument = TextDocument.create(originUri, "html", 3, originText);
  return {
    root,
    originPath,
    targetPath,
    originText,
    targetText,
    originUri,
    targetUri,
    documentUris,
    originDocument,
    snapshot: (uri: string) => uri === targetUri
      ? { uri, languageId: "typescript", version: null, text: targetText }
      : null,
  };
}

function renameAnswer(edits: readonly unknown[]) {
  return {
    value: {
      status: "available",
      edits,
    },
  } as never;
}

function edit(filePath: string, text: string, start: number, end: number) {
  return {
    editKind: "typescript-reference",
    source: {
      kind: "source-span-address",
      label: `${filePath}@${start}..${end}`,
      path: filePath,
      start,
      end,
      role: "reference",
    },
    oldText: text.slice(start, end),
    newText: "heading",
  };
}
