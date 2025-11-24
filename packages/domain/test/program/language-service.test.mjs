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
        assert.equal(tsOverlay.uri, overlayUri);
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
  assert.ok(tsDiag, "typescript diagnostic should be present");
  assert.equal(tsDiag.message, "Property 'missing' does not exist on MyVm");
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
        assert.equal(overlay.uri, overlayUri);
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
  assert.ok(tsDiag, "typescript diagnostic should be present");
  assert.ok(tsDiag.message.includes("FriendlyVm"), "alias should be replaced with display name");
  assert.ok(!tsDiag.message.includes(alias), "raw overlay alias should be hidden");

  const related = tsDiag.related?.find((rel) => rel.message.startsWith("Related"));
  if (related) {
    assert.ok(related.message.includes("FriendlyVm"), "related info should use display name");
    assert.ok(!related.message.includes(alias), "related info should hide alias");
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
        assert.equal(overlay.uri, overlayUri);
        return [];
      },
      getQuickInfo(overlay, offset) {
        quickInfoHits += 1;
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end);
        return { text: "greeting: string" };
      },
    },
  });

  const diags = service.getDiagnostics(uri);
  assert.ok(quickInfoHits > 0, "should consult TypeScript quick info for typecheck mismatches");
  assert.equal(diags.compiler.length, 0, "matching types should suppress AU1301 noise");
  assert.equal(diags.all.length, 0, "no diagnostics should remain when types align");
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end, "hover should target overlay span");
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
  assert.ok(hover, "hover should be produced");
  assert.ok(hover.contents.includes("bar: string"), "TS quick info should be present");
  assert.deepEqual(hover.range, spanToRange(mappingEntry.htmlSpan, markup));
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end);
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
  assert.equal(defs.length, 2, "template and VM targets should be present");

  const templateDef = defs.find((loc) => loc.uri === canonicalDocumentUri(uri).uri);
  assert.ok(templateDef, "overlay hit should map back to template");
  assert.deepEqual(templateDef.range, spanToRange(mappingEntry.htmlSpan, markup));

  const vmUri = canonicalDocumentUri("/app/view-model.ts").uri;
  assert.ok(defs.some((loc) => loc.uri === vmUri));
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end);
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
  assert.equal(refs.length, 2, "duplicate overlay references should be collapsed");
  const templateRef = refs.find((loc) => loc.uri === canonicalDocumentUri(uri).uri);
  assert.ok(templateRef, "overlay references should map back to template spans");
  assert.deepEqual(templateRef.range, spanToRange(mappingEntry.htmlSpan, markup));
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
        assert.equal(tsOverlay.uri, overlayUriA);
        assert.ok(offset >= mappingA.overlaySpan.start && offset <= mappingA.overlaySpan.end);
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
  assert.ok(target, "reference should map overlay B back to template B");
  assert.deepEqual(target.range, spanToRange(mappingB.htmlSpan, markup));
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= overlaySpan.start && offset <= overlaySpan.end);
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
  assert.equal(defs.length, 1);
  assert.deepEqual(defs[0], {
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end);
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
  assert.equal(completions.length, 1);
  const [item] = completions;
  assert.equal(item.label, "value");
  assert.equal(item.source, "typescript");
  assert.deepEqual(item.range, spanToRange(mappingEntry.htmlSpan, markup));
});

test("completions map partial replacement spans to the matching slice of the template expression", () => {
  const program = createProgram();
  const uri = "/app/completions-partial-span.html";
  const markup = "<template><span>${person.name}</span></template>";
  program.upsertTemplate(uri, markup);

  const compilation = program.getCompilation(uri);
  const mappingEntry = compilation.mapping.entries[0];
  const memberSeg = mappingEntry.segments?.find((seg) => seg.path === "person.name");
  assert.ok(memberSeg, "member segment should be present for member completions");
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end);
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
  assert.equal(completions.length, 1);

  const [item] = completions;
  assert.equal(item.label, "person.name");

  const expectedRange = spanToRange({
    start: memberSeg.htmlSpan.start + 2,
    end: memberSeg.htmlSpan.start + 2 + partialOverlaySpan.length,
  }, markup);
  assert.deepEqual(item.range, expectedRange, "partial overlay replacements should map to the same slice in the template");
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
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= mappingEntry.overlaySpan.start && offset <= mappingEntry.overlaySpan.end);
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
  assert.equal(completions.length, 1);
  const [item] = completions;
  assert.equal(item.label, "vmProp");
  assert.equal(item.insertText, "vmProp");
  assert.equal(item.source, "typescript");
  assert.deepEqual(item.range, spanToRange(mappingEntry.htmlSpan, markup));
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
  assert.equal(completions.length, 0);
  assert.equal(tsCalled, false, "TypeScript completions should not run without provenance");
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
        assert.equal(tsOverlay.uri, overlayUri);
        assert.ok(
          start >= mappingEntry.overlaySpan.start && start <= mappingEntry.overlaySpan.end,
          "overlay start should land inside mapped span",
        );
        assert.ok(
          end >= start && end <= mappingEntry.overlaySpan.end,
          "overlay end should land inside mapped span",
        );
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
  assert.equal(actions.length, 1);
  const [action] = actions;
  assert.equal(action.title, "TS fix");
  assert.equal(action.source, "typescript");
  assert.equal(action.kind, "quickfix");

  const templateUri = canonicalDocumentUri(uri).uri;
  const templateEdit = action.edits.find((edit) => edit.uri === templateUri);
  assert.ok(templateEdit, "overlay edit should map to template");
  assert.deepEqual(templateEdit.range, spanToRange(mappingEntry.htmlSpan, markup));
  assert.equal(templateEdit.newText, "updated");

  const vmUri = canonicalDocumentUri("/app/vm.ts").uri;
  const vmEdit = action.edits.find((edit) => edit.uri === vmUri);
  assert.ok(vmEdit, "VM edits should be preserved");
  assert.equal(vmEdit.newText, "// vm");
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
        assert.equal(tsOverlay.uri, overlayUri);
        // Return an edit against overlay prelude (offset 0) which has no provenance mapping.
        return [{ title: "unmappable", edits: [{ fileName: overlayUri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: "noop" }] }];
      },
    },
  });

  const actions = service.getCodeActions(uri, spanToRange(mappingEntry.htmlSpan, markup));
  assert.deepEqual(actions, [], "code actions should drop when overlay edits cannot be mapped");
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
  assert.ok(memberSeg, "member segment should be present for rename");

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        assert.equal(newName, "renamedProp");
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end);
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
  assert.equal(edits.length, 2, "template and VM edits should be returned");

  const templateUri = canonicalDocumentUri(uri).uri;
  const templateEdit = edits.find((edit) => edit.uri === templateUri);
  assert.ok(templateEdit, "overlay rename should map to template edit");
  assert.deepEqual(templateEdit.range, spanToRange(memberSeg.htmlSpan, markup));
  assert.equal(templateEdit.newText, "renamedProp");

  const vmUri = canonicalDocumentUri("/app/vm.ts").uri;
  const vmEdit = edits.find((edit) => edit.uri === vmUri);
  assert.ok(vmEdit, "VM edits should pass through");
  assert.equal(vmEdit.newText, "renamedProp");
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
  assert.ok(memberSeg, "member segment should be present for rename");

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        assert.equal(overlay.uri, overlayUri);
        assert.equal(newName, "offsetRename");
        assert.ok(typeof offset === "number");
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
  assert.ok(templateEdit, "overlay edit should map back to template via start/length");
  assert.deepEqual(templateEdit.range, spanToRange(memberSeg.htmlSpan, markup));
  assert.equal(templateEdit.newText, "offsetRename");

  const vmEdit = edits.find((edit) => edit.uri === canonicalDocumentUri("/app/vm.ts").uri);
  assert.ok(vmEdit, "non-overlay edits should be preserved");
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
  assert.ok(memberSeg, "member segment should be present for rename");

  const service = new DefaultTemplateLanguageService(program, {
    typescript: {
      getDiagnostics() { return []; },
      getRenameEdits(overlay, offset, newName) {
        assert.equal(overlay.uri, overlayUri);
        assert.ok(offset >= memberSeg.overlaySpan.start && offset <= memberSeg.overlaySpan.end);
        assert.equal(newName, "shouldSkip");
        // Force an unmapped overlay edit by targeting overlay prelude with no provenance.
        return [{ fileName: overlay.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, newText: newName }];
      },
    },
  });

  const edits = service.renameSymbol(uri, positionAtOffset(markup, memberSeg.htmlSpan.end - 1), "shouldSkip");
  assert.deepEqual(edits, [], "rename should abort when overlay edits cannot be mapped");
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
        assert.equal(overlay.uri, overlayUri);
        return { text: "value: number" }; // no start/length provided
      },
    },
  });

  const hover = service.getHover(uri, positionAtOffset(markup, mappingEntry.htmlSpan.start + 1));
  assert.ok(hover, "hover should map quick info without span data");
  assert.deepEqual(hover.range, spanToRange(mappingEntry.htmlSpan, markup));
});

test("navigation is empty when TS services are absent", () => {
  const program = createProgram();
  const uri = "/app/nav-none.html";
  const markup = "<template><span>${vmProp}</span></template>";
  program.upsertTemplate(uri, markup);

  const service = new DefaultTemplateLanguageService(program);
  const pos = positionAtOffset(markup, 5);

  assert.deepEqual(service.getDefinition(uri, pos), [], "definitions should be empty without TS");
  assert.deepEqual(service.getReferences(uri, pos), [], "references should be empty without TS");
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
  assert.deepEqual(service.getDefinition(uri, outsidePos), [], "definitions should be empty without provenance");
  assert.deepEqual(service.getReferences(uri, outsidePos), [], "references should be empty without provenance");
  assert.equal(called, false, "TS services should not be invoked when provenance misses");
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
