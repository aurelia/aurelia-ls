import { test, expect } from "vitest";

import {
  DEFAULT_SEMANTICS,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  canonicalDocumentUri,
} from "@aurelia-ls/compiler";
import { noopModuleResolver } from "../_helpers/test-utils.js";

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
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
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
  const diagStart = mappingEntry.overlaySpan.start + 1;
  const diagLength = Math.max(1, mappingEntry.overlaySpan.end - mappingEntry.overlaySpan.start - 1);
  const diagSpan = { start: diagStart, end: diagStart + diagLength };
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        expect(overlay.uri).toBe(overlayUri);
        return [
          {
            category: "error",
            code: 2339,
            start: diagStart,
            length: diagLength,
            messageText: "TS2339: Property 'bar' does not exist on type.",
            relatedInformation: [
              {
                messageText: "overlay reference",
                start: diagStart - 1,
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
  expect(compilerDiag, "compiler diagnostics should be preserved").toBeTruthy();
  expect(compilerDiag.location?.uri).toBe(canonicalDocumentUri(uri).uri);

  const tsDiag = diags.typescript.find((d) => d.source === "typescript");
  expect(tsDiag, "typescript diagnostics should be present").toBeTruthy();
  const projected = program.provenance.projectGeneratedSpan(overlayUri, diagSpan);
  expect(projected, "typescript diagnostic should map through provenance").toBeTruthy();
  expect(tsDiag.location?.uri).toBe(canonicalDocumentUri(uri).uri);
  expect(tsDiag.location?.span).toEqual(projected.edge.to.span);
  // Overlay paths should NOT appear in related info - they are internal implementation details
  expect(tsDiag.related?.some((rel) => rel.location?.uri === overlayUri), "overlay paths should not leak to related info").toBeFalsy();

  expect(diags.all.length).toBe(diags.compiler.length + diags.typescript.length);
});

test("BadExpression still produces aurelia/expr-parse-error and a mapped overlay span", () => {
  const program = createProgram();
  const uri = "/app/bad-expr.html";
  const markup = "<template><div title.bind=\"foo(\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const entry = compilation.mapping.entries[0];

  expect(entry.overlaySpan.file, "overlay span should carry file metadata").toBeTruthy();
  expect(entry.htmlSpan.file, "html span should carry file metadata").toBeTruthy();
  expect(compilation.overlay.text.includes("undefined/*bad*/"), "overlay should stay valid with a bad-expression placeholder").toBeTruthy();

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        expect(overlay.uri).toBe(overlayUri);
        return [];
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  const badExpr = diags.compiler.find((d) => d.code === "aurelia/expr-parse-error");
  expect(badExpr, "bad expression should surface aurelia/expr-parse-error").toBeTruthy();
  expect(badExpr.location?.uri).toBe(canonicalDocumentUri(uri).uri);
});

test("diagnostics use VM display name for missing members", () => {
  const program = new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() { return "MyVm"; },
      getQualifiedRootVmTypeExpr() { return "MyVm"; },
      getDisplayName() { return "MyVm"; },
      getSyntheticPrefix() { return "__AU_TTC_"; },
    },
    isJs: false,
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
  });
  const uri = "/app/diag-display.html";
  program.upsertTemplate(uri, "<template>${missing}</template>");

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.[0] ?? mappingEntry;
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(tsOverlay) {
        expect(tsOverlay.uri).toBe(overlayUri);
        return [{
          category: "error",
          code: 2339,
          start: memberSeg.overlaySpan.start,
          length: Math.max(1, memberSeg.overlaySpan.end - memberSeg.overlaySpan.start),
          messageText: "TS2339: Property 'missing' does not exist on type.",
        }];
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  const tsDiag = diags.typescript.find((d) => d.source === "typescript");
  expect(tsDiag, "typescript diagnostic should be present").toBeTruthy();
  expect(tsDiag.message).toBe("Property 'missing' does not exist on MyVm");
});

test("TypeScript diagnostics replace overlay aliases with VM display names", () => {
  const program = new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() { return 'InstanceType<typeof import("/app/vm")["VmClass"]>'; },
      getQualifiedRootVmTypeExpr() { return 'InstanceType<typeof import("/app/vm")["VmClass"]>'; },
      getDisplayName() { return "FriendlyVm"; },
      getSyntheticPrefix() { return "__AU_TTC_"; },
    },
    isJs: false,
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
  });
  const uri = "/app/noisy.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const alias = compilation.overlayPlan.templates?.[0]?.vmType?.alias ?? "__AU_TTC_VM";
  const mappingEntry = compilation.mapping.entries[0];
  const overlaySpan = mappingEntry.overlaySpan;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        expect(overlay.uri).toBe(overlayUri);
        return [{
          category: "error",
          code: 2345,
          start: overlaySpan.start,
          length: Math.max(1, overlaySpan.end - overlaySpan.start),
          messageText: `Type '${alias}' is not assignable to type 'string'.`,
          relatedInformation: [{
            messageText: `Related ${alias}`,
            start: overlaySpan.start,
            length: 1,
            fileName: overlayUri,
          }],
        }];
      },
    },
  });

  const tsDiag = service.getDiagnostics(uri).typescript[0];
  expect(tsDiag, "typescript diagnostic should be present").toBeTruthy();
  expect(tsDiag.message.includes("FriendlyVm"), "alias should be replaced with display name").toBeTruthy();
  expect(tsDiag.message.includes(alias), "raw overlay alias should be hidden").toBeFalsy();

  const related = tsDiag.related?.find((rel) => rel.message.startsWith("Related"));
  if (related) {
    expect(related.message.includes("FriendlyVm"), "related info should use display name").toBeTruthy();
    expect(related.message.includes(alias), "related info should hide alias").toBeFalsy();
  }
});

test("suppresses typecheck mismatch when TypeScript confirms matching type", () => {
  const program = new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() { return "MyVm"; },
      getQualifiedRootVmTypeExpr() { return "MyVm"; },
      getDisplayName() { return "MyVm"; },
      getSyntheticPrefix() { return "__AU_TTC_"; },
    },
    isJs: false,
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
  });
  const uri = "/app/typecheck-noise.html";
  const markup = "<template><div class.bind=\"greeting\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);

  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  let quickInfoHits = 0;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        expect(overlay.uri).toBe(overlayUri);
        return [];
      },
      getQuickInfo(overlay, offset) {
        quickInfoHits += 1;
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        return { text: "greeting: string" };
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  expect(quickInfoHits > 0, "should consult TypeScript quick info for typecheck mismatches").toBeTruthy();
  expect(diags.compiler.length, "matching types should suppress typecheck noise").toBe(0);
  expect(diags.all.length, "no diagnostics should remain when types align").toBe(0);
});

test("falls back to template URI when provenance has no mapping", () => {
  const program = createProgram();
  const uri = "/app/raw-overlay.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const templateUri = canonicalDocumentUri(uri).uri;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics(overlay) {
        expect(overlay.uri).toBe(overlayUri);
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
  expect(tsDiag, "typescript diagnostic should be returned even without provenance").toBeTruthy();
  // When provenance mapping fails, fall back to template URI (not overlay URI)
  // Overlay paths are internal implementation details and should not be exposed
  expect(tsDiag.location?.uri).toBe(templateUri);
});

test("hover merges template query and TypeScript quick info mapped to template span", () => {
  const program = createProgram();
  const uri = "/app/hover.html";
  const markup = "<template><div foo.bind=\"bar\"></div></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getQuickInfo(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        return {
          text: "bar: string",
          documentation: "vm member",
          start: mappingEntry.overlaySpan.start,
          length: mappingEntry.overlaySpan.end - mappingEntry.overlaySpan.start,
        };
      },
    },
  });

  const hover = service.getHover(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start + 1));
  expect(hover, "hover should be produced").toBeTruthy();
  expect(hover.contents.includes("bar: string"), "TS quick info should be present").toBeTruthy();
  expect(hover.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
});

test("definitions map overlay ranges back to template and pass through VM files", () => {
  const program = createProgram();
  const uri = "/app/defs.html";
  const markup = "<template><p text.bind=\"vmProp\"></p></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getDefinition(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        return [
          { fileName: overlay.uri, range: spanToRange(mappingEntry.overlaySpan, overlay.text) },
          {
            fileName: "/app/view-model.ts",
            range: { start: { line: 10, character: 2 }, end: { line: 10, character: 8 } },
          },
        ];
      },
    },
  });

  const defs = service.getDefinition(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start));
  expect(defs.length, "template and VM targets should be present").toBe(2);

  const templateDef = defs.find((loc) => loc.uri === canonicalDocumentUri(uri).uri);
  expect(templateDef, "overlay hit should map back to template").toBeTruthy();
  expect(templateDef.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));

  const vmUri = canonicalDocumentUri("/app/view-model.ts").uri;
  expect(defs.some((loc) => loc.uri === vmUri)).toBeTruthy();
});

test("references de-duplicate overlay hits and keep VM references", () => {
  const program = createProgram();
  const uri = "/app/refs.html";
  const markup = "<template><span>${value}</span></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getReferences(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        const overlayRange = spanToRange(mappingEntry.overlaySpan, overlay.text);
        return [
          { fileName: overlay.uri, range: overlayRange },
          { fileName: overlay.uri, range: overlayRange },
          { fileName: "/app/vm.ts", range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } } },
        ];
      },
    },
  });

  const refs = service.getReferences(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start + 1));
  expect(refs.length, "duplicate overlay references should be collapsed").toBe(2);
  const templateRef = refs.find((loc) => loc.uri === canonicalDocumentUri(uri).uri);
  expect(templateRef, "overlay references should map back to template spans").toBeTruthy();
  expect(templateRef.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
});

test("references map overlay hits from other templates via provenance", () => {
  const program = createProgram();
  const markup = "<template>${shared}</template>";
  const uriA = "/app/a.html";
  const uriB = "/app/b.html";
  program.upsertTemplate(uriA, markup);
  program.upsertTemplate(uriB, markup);

  const compilationA = program.getCompilation(uriA);
  const compilationB = program.getCompilation(uriB);
  const mappingA = compilationA.mapping.entries[0];
  const mappingB = compilationB.mapping.entries[0];
  const overlayUriA = canonicalDocumentUri(compilationA.overlay.overlayPath).uri;
  const overlayUriB = canonicalDocumentUri(compilationB.overlay.overlayPath).uri;
  const overlayRangeB = spanToRange(mappingB.overlaySpan, compilationB.overlay.text);

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getReferences(tsOverlay, offset) {
        expect(tsOverlay.uri).toBe(overlayUriA);
        expect(offset >= mappingA.overlaySpan.start && offset <= mappingA.overlaySpan.end).toBeTruthy();
        return [
          {
            fileName: overlayUriB,
            range: overlayRangeB,
            start: mappingB.overlaySpan.start,
            length: mappingB.overlaySpan.end - mappingB.overlaySpan.start,
          },
        ];
      },
    },
  });

  const refs = service.getReferences(uriA, positionAtOffset(markup, mappingA.htmlSpan.start + 1));
  const target = refs.find((loc) => loc.uri === canonicalDocumentUri(uriB).uri);
  expect(target, "reference should map overlay B back to template B").toBeTruthy();
  expect(target.range).toEqual(spanToRange(mappingB.htmlSpan, markup));
});

test("definitions map overlay hits using start/length when range is absent", () => {
  const program = createProgram();
  const uri = "/app/defs-offset.html";
  const markup = "<template>${value}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const overlaySpan = mappingEntry.overlaySpan;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getDefinition(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= overlaySpan.start && offset <= overlaySpan.end).toBeTruthy();
        return [
          {
            fileName: overlayUri,
            start: overlaySpan.start,
            length: overlaySpan.end - overlaySpan.start,
          },
        ];
      },
    },
  });

  const defs = service.getDefinition(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start + 1));
  expect(defs.length).toBe(1);
  expect(defs[0]).toEqual({
    uri: canonicalDocumentUri(uri).uri,
    range: spanToRange(mappingEntry.htmlSpan, markup),
  });
});

test("completions project TypeScript replacement spans through provenance", () => {
  const program = createProgram();
  const uri = "/app/completions-ts.html";
  const markup = "<template><span>${value}</span></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCompletions(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        return [
          {
            name: "value",
            kind: "property",
            replacementSpan: {
              start: mappingEntry.overlaySpan.start,
              length: mappingEntry.overlaySpan.end - mappingEntry.overlaySpan.start,
            },
          },
        ];
      },
    },
  });

  const pos = positionAtOffset(markup, mappingEntry.htmlSpan.start + 1);
  const completions = service.getCompletions(uri, pos);
  expect(completions.length).toBe(1);
  const [item] = completions;
  expect(item.label).toBe("value");
  expect(item.source).toBe("typescript");
  expect(item.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
});

test("completions map partial replacement spans to the matching slice of the template expression", () => {
  const program = createProgram();
  const uri = "/app/completions-partial-span.html";
  const markup = "<template><span>${person.name}</span></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.find((seg) => seg.path === "person.name");
  expect(memberSeg, "member segment should be present for member completions").toBeTruthy();
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  // Simulate a TS completion that only replaces a subset of the overlay member span.
  const partialOverlaySpan = {
    start: memberSeg.overlaySpan.start + 2,
    length: 2,
  };

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCompletions(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end).toBeTruthy();
        return [
          {
            name: "person.name",
            replacementSpan: partialOverlaySpan,
          },
        ];
      },
    },
  });

  const pos = positionAtOffset(markup, memberSeg.htmlSpan.start + 2);
  const completions = service.getCompletions(uri, pos);
  expect(completions.length).toBe(1);

  const [item] = completions;
  expect(item.label).toBe("person.name");

  const expectedRange = spanToRange({
    start: memberSeg.htmlSpan.start + 2,
    end: memberSeg.htmlSpan.start + 2 + partialOverlaySpan.length,
  }, markup);
  expect(item.range, "partial overlay replacements should map to the same slice in the template").toEqual(expectedRange);
});

test("completions map TypeScript entries without replacement spans to template spans", () => {
  const program = createProgram();
  const uri = "/app/completions-ts-no-replace.html";
  const markup = "<template><span>${vmProp}</span></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCompletions(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end).toBeTruthy();
        return [
          {
            name: "vmProp",
            insertText: "vmProp",
            sortText: "1",
          },
        ];
      },
    },
  });

  const pos = positionAtOffset(markup, mappingEntry.htmlSpan.start + 2);
  const completions = service.getCompletions(uri, pos);
  expect(completions.length).toBe(1);
  const [item] = completions;
  expect(item.label).toBe("vmProp");
  expect(item.insertText).toBe("vmProp");
  expect(item.source).toBe("typescript");
  expect(item.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
});

test("completions do not invoke TypeScript when provenance misses", () => {
  const program = createProgram();
  const uri = "/app/completions-outside.html";
  const markup = "<template><span>${value}</span></template>";
  program.upsertTemplate(uri, markup);

  let tsCalled = false;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCompletions() { tsCalled = true; return [{ name: "shouldNotAppear" }]; },
    },
  });

  const pos = positionAtOffset(markup, markup.length - 1);
  const completions = service.getCompletions(uri, pos);
  expect(completions.length).toBe(0);
  expect(tsCalled, "TypeScript completions should not run without provenance").toBe(false);
});

test("code actions map TypeScript fixes through provenance and keep external edits", () => {
  const program = createProgram();
  const uri = "/app/code-actions.html";
  const markup = "<template>${person.name}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlay = program.getOverlay(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const overlayRange = spanToRange(mappingEntry.overlaySpan, overlay.text);

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCodeActions(tsOverlay, start, end) {
        expect(tsOverlay.uri).toBe(overlayUri);
        expect(start >= mappingEntry.overlaySpan.start && start <= mappingEntry.overlaySpan.end).toBeTruthy();
        expect(end >= start && end <= mappingEntry.overlaySpan.end).toBeTruthy();
        return [
          {
            title: "TS fix",
            edits: [
              { fileName: overlayUri, range: overlayRange, newText: "updated" },
              { fileName: "/app/vm.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: "// vm" },
            ],
          },
        ];
      },
    },
  });

  const actions = service.getCodeActions(uri, spanToRange(mappingEntry.htmlSpan, markup));
  expect(actions.length).toBe(1);
  const [action] = actions;
  expect(action.title).toBe("TS fix");
  expect(action.source).toBe("typescript");
  expect(action.kind).toBe("quickfix");

  const templateUri = canonicalDocumentUri(uri).uri;
  const templateEdit = action.edits.find((edit) => edit.uri === templateUri);
  expect(templateEdit, "overlay edit should map to template").toBeTruthy();
  expect(templateEdit.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
  expect(templateEdit.newText).toBe("updated");

  const vmUri = canonicalDocumentUri("/app/vm.ts").uri;
  const vmEdit = action.edits.find((edit) => edit.uri === vmUri);
  expect(vmEdit, "VM edits should be preserved").toBeTruthy();
  expect(vmEdit.newText).toBe("// vm");
});

test("code actions drop edits when overlay changes cannot be mapped", () => {
  const program = createProgram();
  const uri = "/app/code-actions-unmapped.html";
  const markup = "<template>${value}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCodeActions(tsOverlay) {
        expect(tsOverlay.uri).toBe(overlayUri);
        // Return an edit against overlay prelude (offset 0) which has no provenance mapping.
        return [{ title: "unmappable", edits: [{ fileName: overlayUri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: "noop" }] }];
      },
    },
  });

  const actions = service.getCodeActions(uri, spanToRange(mappingEntry.htmlSpan, markup));
  expect(actions, "code actions should drop when overlay edits cannot be mapped").toEqual([]);
});

test("rename maps overlay edits back to the template and preserves external edits", () => {
  const program = createProgram();
  const uri = "/app/rename.html";
  const markup = "<template>${person.name}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.find((seg) => seg.path === "person.name");
  expect(memberSeg, "member segment should be present for rename").toBeTruthy();

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        expect(newName).toBe("renamedProp");
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end).toBeTruthy();
        return [
          { fileName: overlay.uri, range: spanToRange(memberSeg.overlaySpan, overlay.text), newText: newName },
          {
            fileName: "/app/vm.ts",
            range: { start: { line: 1, character: 4 }, end: { line: 1, character: 8 } },
            newText: newName,
          },
        ];
      },
    },
  });

  const edits = service.renameSymbol(uri, positionAtOffset(markup, memberSeg.htmlSpan.end - 1), "renamedProp");
  expect(edits.length, "template and VM edits should be returned").toBe(2);

  const templateUri = canonicalDocumentUri(uri).uri;
  const templateEdit = edits.find((edit) => edit.uri === templateUri);
  expect(templateEdit, "overlay rename should map to template edit").toBeTruthy();
  expect(templateEdit.range).toEqual(spanToRange(memberSeg.htmlSpan, markup));
  expect(templateEdit.newText).toBe("renamedProp");

  const vmUri = canonicalDocumentUri("/app/vm.ts").uri;
  const vmEdit = edits.find((edit) => edit.uri === vmUri);
  expect(vmEdit, "VM edits should pass through").toBeTruthy();
  expect(vmEdit.newText).toBe("renamedProp");
});

test("rename uses start/length fallback when TS edits omit range", () => {
  const program = createProgram();
  const uri = "/app/rename-offset.html";
  const markup = "<template>${person.name}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.find((seg) => seg.path === "person.name");
  expect(memberSeg, "member segment should be present for rename").toBeTruthy();

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        expect(overlay.uri).toBe(overlayUri);
        expect(newName).toBe("offsetRename");
        expect(typeof offset === "number").toBeTruthy();
        return [
          {
            fileName: overlayUri,
            start: memberSeg.overlaySpan.start,
            length: memberSeg.overlaySpan.end - memberSeg.overlaySpan.start,
            newText: newName,
          },
          {
            fileName: "/app/vm.ts",
            range: { start: { line: 2, character: 4 }, end: { line: 2, character: 8 } },
            newText: newName,
          },
        ];
      },
    },
  });

  const edits = service.renameSymbol(uri, positionAtOffset(markup, memberSeg.htmlSpan.start + 1), "offsetRename");
  const templateEdit = edits.find((edit) => edit.uri === canonicalDocumentUri(uri).uri);
  expect(templateEdit, "overlay edit should map back to template via start/length").toBeTruthy();
  expect(templateEdit.range).toEqual(spanToRange(memberSeg.htmlSpan, markup));
  expect(templateEdit.newText).toBe("offsetRename");

  const vmEdit = edits.find((edit) => edit.uri === canonicalDocumentUri("/app/vm.ts").uri);
  expect(vmEdit, "non-overlay edits should be preserved").toBeTruthy();
});

test("rename aborts when overlay edits cannot be mapped to the template", () => {
  const program = createProgram();
  const uri = "/app/rename-unmapped.html";
  const markup = "<template>${person.name}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.find((seg) => seg.path === "person.name");
  expect(memberSeg, "member segment should be present for rename").toBeTruthy();

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        expect(overlay.uri).toBe(overlayUri);
        expect(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end).toBeTruthy();
        expect(newName).toBe("shouldSkip");
        // Force an unmapped overlay edit by targeting overlay prelude with no provenance.
        return [{ fileName: overlay.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: newName }];
      },
    },
  });

  const edits = service.renameSymbol(uri, positionAtOffset(markup, memberSeg.htmlSpan.end - 1), "shouldSkip");
  expect(edits, "rename should abort when overlay edits cannot be mapped").toEqual([]);
});

test("hover uses overlay offset when TS quick info lacks span data", () => {
  const program = createProgram();
  const uri = "/app/hover-fallback.html";
  const markup = "<template><em>${value}</em></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getQuickInfo(overlay) {
        expect(overlay.uri).toBe(overlayUri);
        return { text: "value: number" }; // no start/length provided
      },
    },
  });

  const hover = service.getHover(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start + 1));
  expect(hover, "hover should map quick info without span data").toBeTruthy();
  expect(hover.range).toEqual(spanToRange(mappingEntry.htmlSpan, markup));
});

test("navigation is empty when TS services are absent", () => {
  const program = createProgram();
  const uri = "/app/nav-none.html";
  const markup = "<template><span>${vmProp}</span></template>";
  program.upsertTemplate(uri, markup);

  const service = new DefaultTemplateLanguageService(program);
  const pos = positionAtOffset(markup, 5);

  expect(service.getDefinition(uri, pos), "definitions should be empty without TS").toEqual([]);
  expect(service.getReferences(uri, pos), "references should be empty without TS").toEqual([]);
});

test("navigation short-circuits when no provenance hit at position", () => {
  const program = createProgram();
  const uri = "/app/nav-outside.html";
  const markup = "<template><span>${vmProp}</span></template>";
  program.upsertTemplate(uri, markup);

  let called = false;
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getDefinition() { called = true; return [{ fileName: "/should/not/be/used.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }]; },
      getReferences() { called = true; return [{ fileName: "/should/not/be/used.ts", range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }]; },
    },
  });

  const outsidePos = positionAtOffset(markup, markup.length - 1); // after closing template
  expect(service.getDefinition(uri, outsidePos), "definitions should be empty without provenance").toEqual([]);
  expect(service.getReferences(uri, outsidePos), "references should be empty without provenance").toEqual([]);
  expect(called, "TS services should not be invoked when provenance misses").toBe(false);
});

test("completions aim TS at the member segment under the cursor", () => {
  const program = createProgram();
  const uri = "/app/completions-multi-member.html";
  const markup = "<template>${person.name} ${person.age}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const entry = compilation.mapping.entries[0];
  const nameSeg = entry.segments.find((s) => s.path === "person.name");
  const ageSeg = entry.segments.find((s) => s.path === "person.age");
  const overlayUri = canonicalDocumentUri(compilation.overlay.overlayPath).uri;

  const seen = [];
  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getCompletions(overlay, offset) {
        expect(overlay.uri).toBe(overlayUri);
        seen.push(offset);
        return [{ name: "dummy" }];
      },
    },
  });

  service.getCompletions(uri, positionAtOffset(markup, nameSeg.htmlSpan.start + 1));
  service.getCompletions(uri, positionAtOffset(markup, ageSeg.htmlSpan.start + 1));

  expect(seen[0] >= nameSeg.overlaySpan.start && seen[0] <= nameSeg.overlaySpan.end).toBeTruthy();
  expect(seen[1] >= ageSeg.overlaySpan.start && seen[1] <= ageSeg.overlaySpan.end).toBeTruthy();
});

test("buildTemplateMapping preserves all member segments for multi-member expressions", () => {
  const program = createProgram();
  const uri = "/app/multi-members.html";
  const markup = "<template>${person.name} ${person.age}</template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const entry = compilation.mapping.entries[0];

  const paths = (entry.segments ?? []).map((s) => s.path).sort();
  expect(paths).toEqual(["person.age", "person.name"].sort());

  // Ensure segments are disjoint in HTML.
  const [nameSeg] = entry.segments.filter((s) => s.path === "person.name");
  const [ageSeg]  = entry.segments.filter((s) => s.path === "person.age");
  expect(nameSeg.htmlSpan.end <= ageSeg.htmlSpan.start || ageSeg.htmlSpan.end <= nameSeg.htmlSpan.start).toBeTruthy();
});

function positionAtOffset(text, offset) {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 0;
  let lastBreak = 0;
  for (let i = 0; i < clamped; i += 1) {
    const ch = text.charCodeAt(i);
    if (ch === 10 /* LF */ || ch === 13 /* CR */) {
      if (ch === 13 /* CR */ && text.charCodeAt(i + 1) === 10 /* LF */) i += 1;
      line += 1;
      lastBreak = i + 1;
    }
  }
  return { line, character: clamped - lastBreak };
}

function spanToRange(span, text) {
  return {
    start: positionAtOffset(text, span.start),
    end: positionAtOffset(text, span.end),
  };
}

// =============================================================================
// Typecheck Phase Integration Tests
// =============================================================================
// These tests verify that typecheck diagnostics (aurelia/expr-type-mismatch) surface
// correctly through the language service layer.

import { describe } from "vitest";
import { resolveTypecheckConfig } from "@aurelia-ls/compiler";

describe("typecheck diagnostics integration", () => {
  // Note: Default config is "lenient" which produces:
  // - warning severity for type mismatches
  // - error severity only with strict/standard configs

  test("expr-type-mismatch (warning) surfaces for boolean target with string value in lenient mode", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-warning.html";
    // disabled expects boolean, but we give it a string literal
    const markup = "<template><input disabled.bind=\"'yes'\"></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiag = diags.compiler.find((d) => d.code === "aurelia/expr-type-mismatch");
    expect(tcDiag, "expr-type-mismatch should surface for string→boolean mismatch in lenient mode").toBeTruthy();
    expect(tcDiag.source).toBe("typecheck");
    expect(tcDiag.severity).toBe("warning");
    expect(tcDiag.location?.uri).toBe(canonicalDocumentUri(uri).uri);
    expect(tcDiag.message).toContain("expected boolean");
    expect(tcDiag.message).toContain("string");
  });

  test("typecheck diagnostic has correct location pointing to expression", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-location.html";
    // The 'yes' literal is at offset 32-37 in: <template><input disabled.bind="'yes'"></template>
    const markup = "<template><input disabled.bind=\"'yes'\"></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiag = diags.compiler.find((d) => d.source === "typecheck");
    expect(tcDiag, "typecheck diagnostic should be present").toBeTruthy();
    expect(tcDiag.location).toBeTruthy();
    // Location should point to the expression 'yes' not the whole binding
    expect(tcDiag.location?.span.start).toBeGreaterThanOrEqual(32);
    expect(tcDiag.location?.span.end).toBeLessThanOrEqual(37);
  });

  test("null→string produces no diagnostic in lenient mode (nullToString: off)", () => {
    // Lenient mode has nullToString: "off"
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-null.html";
    // value expects string, null would be problematic in strict mode
    const markup = "<template><input value.bind=\"null\"></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    // With lenient defaults, nullToString is "off" so no warning
    const nullDiag = diags.compiler.find((d) => d.source === "typecheck");
    expect(nullDiag, "lenient mode should NOT emit null→string warning").toBeFalsy();
  });

  test("DOM coercion allows number→string for input value", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-coerce.html";
    // value expects string, number should coerce without error
    const markup = "<template><input value.bind=\"42\"></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiags = diags.compiler.filter((d) => d.source === "typecheck");
    expect(tcDiags.length, "DOM coercion should allow number→string").toBe(0);
  });

  test("cascade suppression: no typecheck diagnostic when target is unknown", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-cascade.html";
    // nonexistent is not a valid property - resolve will set target.kind = "unknown"
    const markup = "<template><div nonexistent.bind=\"42\"></div></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    // Should have resolve diagnostic (aurelia/invalid-binding-pattern) but no typecheck diagnostic
    const resolveDiag = diags.compiler.find((d) => d.source === "resolve-host");
    expect(resolveDiag, "resolve should emit diagnostic for unknown property").toBeTruthy();

    const tcDiags = diags.compiler.filter((d) => d.source === "typecheck");
    expect(tcDiags.length, "typecheck should not emit when target.kind is unknown").toBe(0);
  });

  test("style binding coercion allows number→string", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-style.html";
    // width.style expects string, number should coerce without error
    const markup = "<template><div width.style=\"100\"></div></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiags = diags.compiler.filter((d) => d.source === "typecheck");
    expect(tcDiags.length, "style coercion should allow number→string").toBe(0);
  });

  test("style binding rejects boolean→string as type mismatch", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-style-bool.html";
    // width.style expects string, boolean should error
    const markup = "<template><div width.style=\"true\"></div></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiag = diags.compiler.find((d) => d.code === "aurelia/expr-type-mismatch");
    // This should produce a mismatch since boolean→string isn't a style coercion
    expect(tcDiag, "style binding should reject boolean→string").toBeTruthy();
    expect(tcDiag?.source).toBe("typecheck");
  });

  test("if.bind expects boolean, string literal produces warning", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-if.html";
    // if.bind expects boolean value
    const markup = "<template><div if.bind=\"'show'\">content</div></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiag = diags.compiler.find((d) => d.source === "typecheck");
    expect(tcDiag, "if.bind should produce typecheck warning for string→boolean").toBeTruthy();
    // Lenient mode produces warning severity
    expect(tcDiag?.code).toBe("aurelia/expr-type-mismatch");
    expect(tcDiag?.severity).toBe("warning");
  });

  test("multiple bindings produce independent diagnostics", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-multi.html";
    // value.bind is fine (string→string), disabled.bind is mismatch (number→boolean)
    const markup = "<template><input value.bind=\"'ok'\" disabled.bind=\"99\"></template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiags = diags.compiler.filter((d) => d.source === "typecheck");
    // Should have exactly one diagnostic for disabled.bind (number→boolean mismatch)
    expect(tcDiags.length, "should have one typecheck diagnostic for disabled").toBe(1);
    // Lenient mode produces warning severity
    expect(tcDiags[0]?.code).toBe("aurelia/expr-type-mismatch");
    expect(tcDiags[0]?.severity).toBe("warning");
  });

  test("text interpolation has unknown expected type, accepts any value", () => {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const uri = "/app/tc-text.html";
    // Text bindings accept anything - they stringify the value
    const markup = "<template>${42}</template>";
    program.upsertTemplate(uri, markup);

    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });

    const diags = service.getDiagnostics(uri);
    const tcDiags = diags.compiler.filter((d) => d.source === "typecheck");
    expect(tcDiags.length, "text interpolation should accept any type").toBe(0);
  });

  test("typecheck config presets work correctly", () => {
    // Test that resolveTypecheckConfig produces expected configs
    const lenient = resolveTypecheckConfig({ preset: "lenient" });
    expect(lenient.enabled).toBe(true);
    expect(lenient.domCoercion).toBe(true);
    expect(lenient.nullToString).toBe("off");
    expect(lenient.typeMismatch).toBe("warning");

    const strict = resolveTypecheckConfig({ preset: "strict" });
    expect(strict.enabled).toBe(true);
    expect(strict.domCoercion).toBe(false);
    expect(strict.nullToString).toBe("error");
    expect(strict.typeMismatch).toBe("error");

    const standard = resolveTypecheckConfig({ preset: "standard" });
    expect(standard.nullToString).toBe("warning");
    expect(standard.typeMismatch).toBe("error");

    const off = resolveTypecheckConfig({ preset: "off" });
    expect(off.enabled).toBe(false);
  });
});

// =============================================================================
// Elm-Style Error Propagation Tests
// =============================================================================
// These tests verify the Elm-style error handling architecture:
// - Errors produce stubs (degraded values) that propagate through the pipeline
// - Downstream phases see stubs and suppress cascade errors
// - User sees ONE error at the root cause, not noisy cascades
//
// Key principle: If earlier phase failed, later phases should not pile on.

describe("Elm-style error propagation", () => {
  // Helper to create program and service
  function createTestHarness() {
    const program = new DefaultTemplateProgram({
      vm: {
        getRootVmTypeExpr() { return "TestVm"; },
        getSyntheticPrefix() { return "__AU_TTC_"; },
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      moduleResolver: noopModuleResolver,
    });
    const service = new DefaultTemplateLanguageService(program, {
      typescript: { getDiagnostics() { return []; } },
    });
    return { program, service };
  }

  describe("unknown property target → stub propagation", () => {
    test("unknown property produces resolve error, no typecheck cascade", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-prop.html";
      // 'nonexistent' is not a valid property on div
      const markup = "<template><div nonexistent.bind=\"42\"></div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have exactly ONE error from resolve phase
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBeGreaterThanOrEqual(1);

      // Should have ZERO errors from typecheck (cascade suppressed)
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "typecheck should not cascade on unknown property").toBe(0);
    });

    test("multiple unknown properties each produce one error, no cascades", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-multi-prop.html";
      // Two unknown properties
      const markup = "<template><div foo.bind=\"1\" bar.bind=\"2\"></div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Each unknown property should produce exactly one resolve error
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBe(2);

      // No typecheck cascades
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "no typecheck cascades for multiple unknowns").toBe(0);
    });
  });

  describe("valid bindings still type-checked after encountering stub", () => {
    test("valid binding after unknown property still gets type-checked", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-then-valid.html";
      // First binding: unknown property (stub)
      // Second binding: valid property with type mismatch
      const markup = "<template><input unknown.bind=\"1\" disabled.bind=\"'yes'\"></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have resolve error for 'unknown'
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBeGreaterThanOrEqual(1);

      // Should ALSO have typecheck warning for disabled (string → boolean mismatch)
      // This proves we don't over-suppress - valid targets still get checked
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "valid binding should still be type-checked").toBe(1);
      expect(typecheckErrors[0]?.code).toBe("aurelia/expr-type-mismatch");
      expect(typecheckErrors[0]?.severity).toBe("warning");
    });

    test("stub on one element doesn't affect sibling elements", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-sibling.html";
      // First element: unknown property (stub)
      // Second element: valid property with type mismatch
      const markup = `<template>
        <div unknown.bind="1"></div>
        <input disabled.bind="'yes'">
      </template>`;
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Resolve error for unknown
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBeGreaterThanOrEqual(1);

      // Typecheck error for disabled on SIBLING element
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "sibling element should still be type-checked").toBe(1);
    });
  });

  describe("nested scope error containment", () => {
    test("error in if.bind content doesn't affect outer scope", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-nested-if.html";
      // Outer: valid binding
      // Inner (inside if): unknown property
      const markup = `<template>
        <input disabled.bind="'outer'">
        <div if.bind="true">
          <div unknown.bind="1"></div>
        </div>
      </template>`;
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have resolve error for inner unknown
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBeGreaterThanOrEqual(1);

      // Should have typecheck error for outer disabled (not suppressed by inner stub)
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "outer scope type errors not affected by inner stub").toBe(1);
    });

    test("error in repeat item doesn't cascade within repeat", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/stub-repeat.html";
      // Unknown property inside repeat - should get ONE error, not per-iteration cascade
      const markup = `<template>
        <div repeat.for="item of items">
          <span unknown.bind="item"></span>
        </div>
      </template>`;
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have exactly one resolve error for 'unknown'
      const resolveErrors = diags.compiler.filter((d) =>
        d.source === "resolve-host" && d.message?.includes("unknown")
      );
      expect(resolveErrors.length, "should have one error for unknown property").toBe(1);

      // No typecheck cascades
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "no typecheck cascades in repeat").toBe(0);
    });
  });

  describe("error isolation between unrelated bindings", () => {
    test("type error on one binding doesn't affect unrelated bindings", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/isolated-errors.html";
      // Two independent type errors - each should produce exactly one diagnostic
      const markup = `<template>
        <input disabled.bind="'string1'">
        <input disabled.bind="'string2'">
      </template>`;
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have exactly 2 typecheck warnings (one per binding)
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "each type error independent").toBe(2);
      expect(typecheckErrors.every((d) => d.code === "aurelia/expr-type-mismatch")).toBe(true);
      expect(typecheckErrors.every((d) => d.severity === "warning")).toBe(true);
    });

    test("mixed valid and invalid bindings on same element", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/mixed-bindings.html";
      // Same element: one valid (string→string), one invalid (string→boolean)
      const markup = "<template><input value.bind=\"'text'\" disabled.bind=\"'yes'\"></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // value.bind: string→string is valid, no error
      // disabled.bind: string→boolean is invalid, one error
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length, "only invalid binding produces error").toBe(1);

      // No resolve errors (both properties are valid targets)
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBe(0);
    });
  });

  describe("diagnostic quality", () => {
    test("error message is actionable (includes property name)", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/actionable-error.html";
      const markup = "<template><div nonexistent.bind=\"42\"></div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);
      const error = diags.compiler.find((d) => d.source === "resolve-host");

      expect(error).toBeTruthy();
      // Error message should mention what couldn't be found
      expect(error?.message).toMatch(/nonexistent|property|target/i);
    });

    test("error location points to the binding, not the element", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/error-location.html";
      // The binding starts after '<template><div '
      const markup = "<template><div nonexistent.bind=\"42\"></div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);
      const error = diags.compiler.find((d) => d.source === "resolve-host");

      expect(error?.location).toBeTruthy();
      // Span should be within the binding, not at element start
      const bindingStart = markup.indexOf("nonexistent");
      expect(error?.location?.span.start).toBeGreaterThanOrEqual(bindingStart);
    });

    test("no duplicate diagnostics for same error", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/no-dupes.html";
      const markup = "<template><div foo.bind=\"1\"></div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Group diagnostics by message
      const messageCounts = new Map<string, number>();
      for (const d of diags.compiler) {
        const msg = d.message ?? "";
        messageCounts.set(msg, (messageCounts.get(msg) ?? 0) + 1);
      }

      // No message should appear more than once
      for (const [msg, count] of messageCounts) {
        expect(count, `duplicate diagnostic: "${msg}"`).toBe(1);
      }
    });
  });

  describe("edge cases", () => {
    test("empty template produces no errors", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/empty.html";
      const markup = "<template></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);
      expect(diags.compiler.length).toBe(0);
    });

    test("static-only template produces no errors", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/static.html";
      const markup = "<template><div class=\"foo\">Hello</div></template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);
      expect(diags.compiler.length).toBe(0);
    });

    test("interpolation in text doesn't produce spurious errors", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/interp.html";
      const markup = "<template>${someValue}</template>";
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);
      // Text interpolation accepts any type - no errors expected
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length).toBe(0);
    });

    test("deeply nested structure with error at leaf", () => {
      const { program, service } = createTestHarness();
      const uri = "/app/deep-nest.html";
      const markup = `<template>
        <div if.bind="true">
          <div if.bind="true">
            <div if.bind="true">
              <span unknown.bind="1"></span>
            </div>
          </div>
        </div>
      </template>`;
      program.upsertTemplate(uri, markup);

      const diags = service.getDiagnostics(uri);

      // Should have exactly one resolve error at the leaf
      const resolveErrors = diags.compiler.filter((d) => d.source === "resolve-host");
      expect(resolveErrors.length).toBe(1);

      // No cascades from any level
      const typecheckErrors = diags.compiler.filter((d) => d.source === "typecheck");
      expect(typecheckErrors.length).toBe(0);
    });
  });
});
