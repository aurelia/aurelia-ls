import { test, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";

import { TemplateWorkspace } from "../../out/services/template-workspace.js";
import { DEFAULT_SEMANTICS, buildTemplateSyntaxRegistry, canonicalDocumentUri, asDocumentUri } from "@aurelia-ls/compiler";

function createWorkspace(programOverrides = {}, options = {}) {
  return new TemplateWorkspace({
    program: {
      vm: {
        getRootVmTypeExpr: () => "TestVm",
        getSyntheticPrefix: () => "__AU_TTC_",
      },
      isJs: false,
      semantics: DEFAULT_SEMANTICS,
      catalog: DEFAULT_SEMANTICS.catalog,
      syntax: buildTemplateSyntaxRegistry(DEFAULT_SEMANTICS),
      ...programOverrides,
    },
    ...options,
  });
}

test("workspace syncs documents and invalidates caches on change", () => {
  const workspace = createWorkspace();
  const uri = asDocumentUri("file:///app/components/example.html");

  const firstDoc = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
  workspace.open(firstDoc);

  workspace.buildService.getOverlay(uri);
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  expect(firstStats.compilation?.programCacheHit).toBe(false);
  expect((firstStats.provenance.overlayEdges ?? 0) > 0).toBe(true);

  const secondDoc = TextDocument.create(uri, "html", 2, "<template>${name}! ${name}</template>");
  workspace.change(secondDoc);

  workspace.buildService.getOverlay(uri);
  const secondStats = workspace.program.getCacheStats(uri).documents[0];
  expect(secondStats.version).toBe(2);
  expect(secondStats.compilation?.programCacheHit).toBe(false);
  expect(firstStats.contentHash).not.toBe(secondStats.contentHash);
});

test("reconfigure rebuilds the program on option drift while preserving sources", () => {
  const workspace = createWorkspace();
  const uri = asDocumentUri("file:///app/components/options.html");
  const doc = TextDocument.create(uri, "html", 1, "<template>${value}</template>");
  workspace.upsertDocument(doc);

  const firstOverlay = workspace.buildService.getOverlay(uri).overlay.path;
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  expect(firstStats.compilation?.programCacheHit).toBe(false);

  const changed = workspace.reconfigure({
    program: {
      ...workspace.program.options,
      overlayBaseName: "__custom__",
    },
  });
  expect(changed).toBe(true);

  const snap = workspace.snapshot(uri);
  expect(snap?.version).toBe(1);

  const canonical = canonicalDocumentUri(uri);
  const nextOverlay = workspace.buildService.getOverlay(canonical.uri).overlay.path;
  expect(nextOverlay).not.toBe(firstOverlay);
  expect(nextOverlay).toContain("__custom__");

  const nextStats = workspace.program.getCacheStats(uri).documents[0];
  expect(nextStats.compilation?.programCacheHit).toBe(false);
  expect((nextStats.provenance.overlayEdges ?? 0) > 0).toBe(true);
});

test("reconfigure reacts to fingerprint drift even when program options are stable", () => {
  const workspace = createWorkspace({}, { fingerprint: "index@1" });
  const uri = asDocumentUri("file:///app/components/fingerprint.html");
  const doc = TextDocument.create(uri, "html", 1, "<template>${value}</template>");
  workspace.open(doc);

  workspace.buildService.getOverlay(uri);
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  expect(firstStats.compilation?.programCacheHit).toBe(false);
  expect(workspace.fingerprint).toBe("index@1");

  const changed = workspace.reconfigure({
    program: workspace.program.options,
    fingerprint: "index@2",
  });

  expect(changed).toBe(true);
  expect(workspace.fingerprint).toBe("index@2");

  workspace.buildService.getOverlay(uri);
  const nextStats = workspace.program.getCacheStats(uri).documents[0];
  expect(nextStats.compilation?.programCacheHit).toBe(false);
});
