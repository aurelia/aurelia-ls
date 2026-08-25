import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { JSONSchema } from "vscode-json-languageservice";
import { describe, expect, test } from "vitest";

const require = createRequire(import.meta.url);
const { ErrorCode, getLanguageService, TextDocument } = require("vscode-json-languageservice") as
  typeof import("vscode-json-languageservice");

const editorSchemaUrl = new URL(
  "../src/schemas/aurelia.project.jsonc.schema.json",
  import.meta.url,
);
const generatorUrl = new URL(
  "../scripts/generate-project-configuration-editor-schema.mjs",
  import.meta.url,
);
const editorSchemaText = readFileSync(editorSchemaUrl, "utf8");
const editorSchema = JSON.parse(editorSchemaText) as JSONSchema & { readonly $id: string };

function createLanguageService() {
  const service = getLanguageService({});
  service.configure({
    allowComments: true,
    schemas: [{
      uri: editorSchema.$id,
      fileMatch: ["*"],
      schema: editorSchema,
    }],
  });
  return service;
}

async function completionLabels(markedText: string): Promise<readonly string[]> {
  const cursorOffset = markedText.indexOf("|");
  expect(cursorOffset).toBeGreaterThanOrEqual(0);
  const text = markedText.replace("|", "");
  const document = TextDocument.create(
    "file:///workspace/aurelia.project.json",
    "jsonc",
    1,
    text,
  );
  const service = createLanguageService();
  const jsonDocument = service.parseJSONDocument(document);
  const completion = await service.doComplete(
    document,
    document.positionAt(cursorOffset),
    jsonDocument,
  );
  return (completion?.items ?? []).map((item) => item.label.replace(/^"|"$/g, ""));
}

async function diagnostics(text: string) {
  const document = TextDocument.create(
    "file:///workspace/aurelia.project.json",
    "jsonc",
    1,
    text,
  );
  const service = createLanguageService();
  return service.doValidation(document, service.parseJSONDocument(document));
}

describe("Aurelia project editor schema", () => {
  test("is the deterministic byte-for-byte generator output", () => {
    const generatorPath = fileURLToPath(generatorUrl);
    const generated = execFileSync(process.execPath, [generatorPath, "--stdout"], {
      encoding: "utf8",
    });
    expect(generated).toBe(editorSchemaText);
    expect(() => execFileSync(process.execPath, [generatorPath, "--check"]))
      .not.toThrow();
  });

  test("suggests the V1 root, nested, and known finding vocabulary", async () => {
    await expect(completionLabels("{|}"))
      .resolves.toEqual(expect.arrayContaining(["version", "authoredSources", "findings"]));
    await expect(completionLabels('{"version": |}'))
      .resolves.toContain("1");
    await expect(completionLabels('{"authoredSources": {|}}'))
      .resolves.toContain("excludedRoots");
    await expect(completionLabels('{"findings": {|}}'))
      .resolves.toContain("aurelia.analysis.dynamic-registration-spread");
  });

  test("suggests dispositions for manually entered future finding IDs", async () => {
    await expect(completionLabels(
      '{"findings":{"aurelia.analysis.dynamic-registration-spread": |}}',
    )).resolves.toEqual(expect.arrayContaining(["off", "information", "warning", "error"]));
    await expect(completionLabels('{"findings":{"aurelia.future.rule": |}}'))
      .resolves.toEqual(expect.arrayContaining(["off", "information", "warning", "error"]));
  });

  test.each([
    ["missing version", "{}"],
    ["non-object root", "42"],
    ["unsupported version", '{"version":2}'],
    ["wrong version shape", '{"version":"1"}'],
    ["unknown root field", '{"version":1,"unknown":true}'],
    ["unknown authored-sources field", '{"version":1,"authoredSources":{"unknown":true}}'],
    ["wrong excluded-roots shape", '{"version":1,"authoredSources":{"excludedRoots":"dist"}}'],
    ["invalid excluded-root value", '{"version":1,"authoredSources":{"excludedRoots":["../dist"]}}'],
    ["malformed finding ID and disposition", '{"version":1,"findings":{"not-namespaced":"loud"}}'],
    ["future finding with invalid disposition", '{"version":1,"findings":{"aurelia.future.rule":"loud"}}'],
    ["accepted JSONC syntax", '{// comment\n"version":1,\n}'],
  ])("does not diagnose semantic-invalid JSONC: %s", async (_name, text) => {
    expect(await diagnostics(text)).toEqual([]);
  });

  test.each([
    ["malformed JSONC", '{"version":1,,}', ErrorCode.PropertyExpected],
    ["duplicate keys", '{"version":1,"version":1}', ErrorCode.DuplicateKey],
  ])("leaves %s diagnostics with the native JSONC service", async (_name, text, expectedCode) => {
    const nativeDiagnostics = await diagnostics(text);
    expect(nativeDiagnostics.length).toBeGreaterThan(0);
    expect(nativeDiagnostics.every((diagnostic) => diagnostic.source === "jsonc")).toBe(true);
    expect(nativeDiagnostics.map((diagnostic) => diagnostic.code)).toContain(expectedCode);
  });
});
