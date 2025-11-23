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
