import type { Diagnostic, Uri } from "vscode";
import { expect, test } from "vitest";
import { NativeTypeScriptProblemOwnership } from "../../out/native-typescript-problem-ownership.js";
import { typeScriptDiagnosticEvidenceKey } from "@aurelia-ls/language-server/protocol";

test("publishes one decorator Problem according to native code and range in the same document", () => {
  const uri = { toString: () => "file:///component.ts" } as Uri;
  const other = { toString: () => "file:///other.ts" } as Uri;
  const range = { start: { line: 2, character: 0 }, end: { line: 2, character: 6 } };
  const otherRange = { start: { line: 3, character: 0 }, end: { line: 3, character: 6 } };
  const key = typeScriptDiagnosticEvidenceKey(1241, range);
  const alternate = typeScriptDiagnosticEvidenceKey(1270, range);
  const primary = { source: "aurelia", code: "AUR9990", data: { nativeTypeScriptEvidence: [key, alternate] } };
  const independent = { source: "aurelia", code: "AUR0227" };
  const full = { kind: "full", resultId: "same-semantic-result", items: [primary, independent] } as const;
  const native = new Map<string, readonly Diagnostic[]>();
  const owner = new NativeTypeScriptProblemOwnership(document => native.get(document.toString()) ?? []);
  const pull = () => owner.project(uri, full as never);
  const put = (at: Uri, diagnostics: unknown[]) => native.set(at.toString(), diagnostics as Diagnostic[]);
  put(other, [{ source: "ts", code: 1241, range }]);
  put(uri, [{ source: "ts", code: 2339, range }, { source: "ts", code: 1241, range: otherRange },
    { source: "aurelia", code: 1241, range }]);
  expect(pull()).toBe(full);
  expect(owner.changed(uri)).toBe(false);
  put(uri, [{ source: "ts", code: { value: 1270 }, range }]);
  expect(owner.changed(uri)).toBe(true);
  expect(owner.changed(uri)).toBe(false);
  expect(owner.previousResultId(uri, full.resultId)).toBeUndefined();
  expect(pull()).toEqual({ ...full, items: [independent] });
  expect(owner.previousResultId(uri, full.resultId)).toBe(full.resultId);
  put(uri, []);
  expect(owner.changed(uri)).toBe(true);
  expect(owner.previousResultId(uri, full.resultId)).toBeUndefined();
  expect(pull()).toBe(full);
  owner.forget(uri);
  put(uri, [{ source: "ts", code: 1241, range }]);
  expect(owner.changed(uri)).toBe(false);
});
