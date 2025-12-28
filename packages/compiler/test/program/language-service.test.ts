import { test, expect } from "vitest";

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
  expect(tsDiag.related?.some((rel) => rel.location?.uri === overlayUri), "overlay span should remain as related info").toBeTruthy();

  expect(diags.all.length).toBe(diags.compiler.length + diags.typescript.length);
});

test("BadExpression still produces AU1203 and a mapped overlay span", () => {
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
  const badExpr = diags.compiler.find((d) => d.code === "AU1203");
  expect(badExpr, "bad expression should surface AU1203").toBeTruthy();
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

test("suppresses AU1301 when TypeScript confirms matching type", () => {
  const program = new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr() { return "MyVm"; },
      getQualifiedRootVmTypeExpr() { return "MyVm"; },
      getDisplayName() { return "MyVm"; },
      getSyntheticPrefix() { return "__AU_TTC_"; },
    },
    isJs: false,
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
  expect(diags.compiler.length, "matching types should suppress AU1301 noise").toBe(0);
  expect(diags.all.length, "no diagnostics should remain when types align").toBe(0);
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
  expect(tsDiag.location?.uri).toBe(overlayUri);
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
    length: 3,
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
