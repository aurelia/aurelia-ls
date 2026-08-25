import path from "node:path";
import { describe, expect, test } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceFilePath,
  semanticSourceReferenceMatchesDocument,
  semanticSourceReferenceUri,
} from "../../src/mapping/source-locations.js";
import { WorkspaceDocumentUris } from "../../src/utils/document-uri.js";

const documentUris = new WorkspaceDocumentUris();
documentUris.configure("file:///C:/projects/app");
const uri = documentUris.resolve("file:///C:/projects/app/src/app.html").uri;
const document = TextDocument.create(uri, "html", 1, "<p>value</p>");

function source(start: number, end: number, sourcePath = "src/app.html") {
  return {
    kind: "source-span-address" as const,
    label: `src/app.html@${start}..${end}`,
    path: sourcePath,
    start,
    end,
    role: "range",
  };
}

describe("semantic source locations", () => {
  test("resolves Windows source paths through the workspace path dialect on every host", () => {
    const windowsUris = new WorkspaceDocumentUris();
    windowsUris.configure("file:///C:/projects/app");
    const absolute = source(0, 4, "C:/projects/app/src/component.ts");
    const relative = source(0, 4, "src/component.ts");

    expect(semanticSourceReferenceUri(absolute, windowsUris))
      .toBe("file:///C:/projects/app/src/component.ts");
    expect(semanticSourceReferenceFilePath(absolute, windowsUris))
      .toBe(path.win32.normalize("C:/projects/app/src/component.ts"));
    expect(semanticSourceReferenceFilePath(relative, windowsUris))
      .toBe(path.win32.normalize("C:/projects/app/src/component.ts"));
    expect(semanticSourceReferenceFilePath(
      source(0, 4, "https://example.test/source.ts"),
      windowsUris,
    )).toBeNull();
  });
  test("preserves exact spans and valid zero-width insertions", () => {
    expect(semanticSourceOffsetRangeForDocument(source(3, 8), document)).toEqual({ start: 3, end: 8 });
    const end = document.getText().length;
    expect(semanticSourceOffsetRangeForDocument(source(end, end), document)).toEqual({ start: end, end });
  });

  test("rejects negative, reversed, non-integer, and stale spans", () => {
    expect(semanticSourceOffsetRangeForDocument(source(-1, 2), document)).toBeNull();
    expect(semanticSourceOffsetRangeForDocument(source(8, 3), document)).toBeNull();
    expect(semanticSourceOffsetRangeForDocument(source(0.5, 2), document)).toBeNull();
    expect(semanticSourceOffsetRangeForDocument(source(0, document.getText().length + 1), document)).toBeNull();
  });

  test("follows authored anchors and resolves relative paths through the workspace", () => {
    const anchored = {
      kind: "generated-address" as const,
      label: "generated",
      anchor: source(3, 8),
    };
    expect(semanticSourceReferenceUri(anchored, documentUris)).toBe(uri);
    expect(semanticSourceReferenceMatchesDocument(anchored, documentUris, uri)).toBe(true);
  });

  test("projects semantic paths into a remote workspace URI instead of inventing file URIs", () => {
    const remoteUris = new WorkspaceDocumentUris();
    remoteUris.configure("vscode-remote://ssh-remote+host/work/app");

    const resolved = semanticSourceReferenceUri(source(3, 8), remoteUris);

    expect(resolved).toBe("vscode-remote://ssh-remote%2Bhost/work/app/src/app.html");
    expect(remoteUris.sameDocument(resolved!, "vscode-remote://ssh-remote+host/work/app/src/app.html")).toBe(true);
  });
});
