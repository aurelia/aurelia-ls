import test from "node:test";
import assert from "node:assert/strict";
import { TextDocument } from "vscode-languageserver-textdocument";

import { TemplateWorkspace } from "../../out/services/template-workspace.js";
import { canonicalDocumentUri } from "../../../domain/out/program/index.js";

function createWorkspace(programOverrides = {}, options = {}) {
  return new TemplateWorkspace({
    program: {
      vm: {
        getRootVmTypeExpr: () => "TestVm",
        getSyntheticPrefix: () => "__AU_TTC_",
      },
      isJs: false,
      ...programOverrides,
    },
    ...options,
  });
}

test("workspace syncs documents and invalidates caches on change", () => {
  const workspace = createWorkspace();
  const uri = "file:///app/components/example.html";

  const firstDoc = TextDocument.create(uri, "html", 1, "<template>${name}</template>");
  workspace.open(firstDoc);

  workspace.buildService.getOverlay(uri);
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(firstStats.compilation?.programCacheHit, false);
  assert.ok((firstStats.provenance.overlayEdges ?? 0) > 0);

  const secondDoc = TextDocument.create(uri, "html", 2, "<template>${name}! ${name}</template>");
  workspace.change(secondDoc);

  workspace.buildService.getOverlay(uri);
  const secondStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(secondStats.version, 2);
  assert.equal(secondStats.compilation?.programCacheHit, false);
  assert.notEqual(firstStats.contentHash, secondStats.contentHash);
});

test("reconfigure rebuilds the program on option drift while preserving sources", () => {
  const workspace = createWorkspace();
  const uri = "file:///app/components/options.html";
  const doc = TextDocument.create(uri, "html", 1, "<template>${value}</template>");
  workspace.upsertDocument(doc);

  const firstOverlay = workspace.buildService.getOverlay(uri).overlay.path;
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(firstStats.compilation?.programCacheHit, false);

  const changed = workspace.reconfigure({
    program: {
      ...workspace.program.options,
      overlayBaseName: "__custom__",
    },
  });
  assert.equal(changed, true);

  const snap = workspace.snapshot(uri);
  assert.equal(snap?.version, 1);

  const canonical = canonicalDocumentUri(uri);
  const nextOverlay = workspace.buildService.getOverlay(canonical.uri).overlay.path;
  assert.notEqual(nextOverlay, firstOverlay);
  assert.ok(nextOverlay.includes("__custom__"));

  const nextStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(nextStats.compilation?.programCacheHit, false);
  assert.ok((nextStats.provenance.overlayEdges ?? 0) > 0);
});

test("reconfigure reacts to fingerprint drift even when program options are stable", () => {
  const workspace = createWorkspace({}, { fingerprint: "index@1" });
  const uri = "file:///app/components/fingerprint.html";
  const doc = TextDocument.create(uri, "html", 1, "<template>${value}</template>");
  workspace.open(doc);

  workspace.buildService.getOverlay(uri);
  const firstStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(firstStats.compilation?.programCacheHit, false);
  assert.equal(workspace.fingerprint, "index@1");

  const changed = workspace.reconfigure({
    program: workspace.program.options,
    fingerprint: "index@2",
  });

  assert.equal(changed, true);
  assert.equal(workspace.fingerprint, "index@2");

  workspace.buildService.getOverlay(uri);
  const nextStats = workspace.program.getCacheStats(uri).documents[0];
  assert.equal(nextStats.compilation?.programCacheHit, false);
});
