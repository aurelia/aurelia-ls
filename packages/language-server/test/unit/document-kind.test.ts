import { describe, expect, test } from "vitest";
import {
  isAnalyzedSourceDocumentUri,
  isScriptDocument,
  isTemplateDocument,
  languageIdForSource,
} from "../../src/utils/document-kind.js";

describe("semantic source admission", () => {
  test.each([
    ["file:///workspace/src/app.tsx", "typescript"],
    ["file:///workspace/src/app.mts", "typescript"],
    ["file:///workspace/src/app.cts", "typescript"],
    ["file:///workspace/src/app.jsx", "javascript"],
    ["file:///workspace/src/app.mjs", "javascript"],
    ["file:///workspace/src/app.cjs", "javascript"],
  ])("admits modern script form %s", (uri, languageId) => {
    expect(isScriptDocument({ uri })).toBe(true);
    expect(isAnalyzedSourceDocumentUri(uri)).toBe(true);
    expect(languageIdForSource(uri)).toBe(languageId);
  });

  test.each([
    ["file:///workspace/src/app.html", "html"],
    ["file:///workspace/src/app.css", "css"],
    ["file:///workspace/package.json", "json"],
  ])("keeps non-script admitted source %s out of script-only lanes", (uri, languageId) => {
    expect(isScriptDocument({ uri })).toBe(false);
    expect(isAnalyzedSourceDocumentUri(uri)).toBe(true);
    expect(languageIdForSource(uri)).toBe(languageId);
  });

  test("uses semantic source form rather than editor language association for templates", () => {
    expect(isTemplateDocument({ uri: "file:///workspace/src/app.html" })).toBe(true);
    expect(isTemplateDocument({ uri: "file:///workspace/src/app.component" })).toBe(false);
  });
});
