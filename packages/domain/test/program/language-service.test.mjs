import test from "node:test";
import assert from "node:assert/strict";

import {
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  canonicalDocumentUri,
} from "../../out/program/index.js";

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

function createProgram() {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
  });
}

test("merges compiler and TypeScript diagnostics via provenance", () => {
  const program = createProgram();
  const uri = "/app/component.html";
  const markup = "<template><div foo.bind=\"bar\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        assert.equal(overlay.uri, overlayUri);
        return [
          {
            category: "error",
            code: 2339,
            start: mappingEntry.overlaySpan.start + 1,
            length: Math.max(1, mappingEntry.overlaySpan.end - mappingEntry.overlaySpan.start - 1),
            messageText: "TS2339: Property 'bar' does not exist on type.",
            relatedInformation: [
              {
                messageText: "overlay reference",
                start: mappingEntry.overlaySpan.start,
                length: 1,
                fileName: overlay.uri,
              },
            ],
          },
        ];
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  const compilerDiag = diags.compiler.find((d) => d.source === "resolve-host");
  assert.ok(compilerDiag, "compiler diagnostics should be preserved");
  assert.equal(compilerDiag.location?.uri, canonicalDocumentUri(uri).uri);

  const tsDiag = diags.typescript.find((d) => d.source === "typescript");
  assert.ok(tsDiag, "typescript diagnostics should be present");
  assert.equal(tsDiag.location?.uri, canonicalDocumentUri(uri).uri);
  assert.equal(tsDiag.location?.span.start, mappingEntry.htmlSpan.start);
  assert.equal(tsDiag.location?.span.end, mappingEntry.htmlSpan.end);
  assert.ok(tsDiag.related?.some((rel) => rel.location?.uri === overlayUri), "overlay span should remain as related info");

  assert.equal(diags.all.length, diags.compiler.length + diags.typescript.length);
});

test("falls back to overlay spans when provenance has no mapping", () => {
  const program = createProgram();
  const uri = "/app/raw-overlay.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        assert.equal(overlay.uri, overlayUri);
        return [
          {
            category: "warning",
            code: "TS6133",
            start: 0,
            length: 0,
            messageText: "Unused overlay prelude",
          },
        ];
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  const tsDiag = diags.typescript[0];
  assert.ok(tsDiag, "typescript diagnostic should be returned even without provenance");
  assert.equal(tsDiag.location?.uri, overlayUri);
});
