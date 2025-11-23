import test from "node:test";
import assert from "node:assert/strict";

import {
  DefaultTemplateBuildService,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  canonicalDocumentUri,
  deriveTemplatePaths,
} from "../../out/program/index.js";

test("build service exposes canonical overlay artifacts", () => {
  const program = createProgram();
  const build = new DefaultTemplateBuildService(program);
  const uri = "/app/build-overlay.html";
  const markup = "<template>${value}</template>";
  program.upsertTemplate(uri, markup);

  const artifact = build.getOverlay(uri);
  const derived = deriveTemplatePaths(uri, { isJs: false });
  const canonicalTemplate = canonicalDocumentUri(uri);

  assert.equal(artifact.template.uri, canonicalTemplate.uri);
  assert.equal(artifact.template.path, canonicalTemplate.path);
  assert.equal(artifact.template.version, 1);
  assert.ok(artifact.template.contentHash.length > 0);

  assert.equal(artifact.overlay.uri, canonicalDocumentUri(derived.overlay.uri).uri);
  assert.equal(artifact.overlay.path, derived.overlay.path);
  assert.equal(artifact.overlay.baseName, derived.overlay.baseName);
  assert.equal(artifact.overlay.version, artifact.template.version);
  assert.ok(artifact.overlay.contentHash.length > 0);
  assert.ok(artifact.overlay.text.length > 0);

  assert.ok(artifact.mapping.entries.length > 0);
  assert.ok(artifact.calls.length > 0);

  const repeated = build.getOverlay(uri);
  assert.equal(repeated.overlay.contentHash, artifact.overlay.contentHash);

  program.upsertTemplate(uri, "<template>${value}!</template>");
  const updated = build.getOverlay(uri);
  assert.notEqual(updated.template.contentHash, artifact.template.contentHash);
});

test("build service exposes canonical SSR artifacts", () => {
  const program = createProgram();
  const build = new DefaultTemplateBuildService(program);
  const uri = "/app/build-ssr.html";
  const markup = "<template><span>${value}</span></template>";
  program.upsertTemplate(uri, markup);

  const artifact = build.getSsr(uri);
  const derived = deriveTemplatePaths(uri, { isJs: false });

  assert.equal(artifact.baseName, derived.ssr.baseName);
  assert.equal(artifact.template.version, 1);
  assert.ok(artifact.template.contentHash.length > 0);

  assert.equal(artifact.html.uri, canonicalDocumentUri(derived.ssr.htmlUri).uri);
  assert.equal(artifact.html.path, derived.ssr.htmlPath);
  assert.ok(artifact.html.text.length > 0);

  assert.equal(artifact.manifest.uri, canonicalDocumentUri(derived.ssr.manifestUri).uri);
  assert.equal(artifact.manifest.path, derived.ssr.manifestPath);
  assert.ok(artifact.manifest.text.length > 0);

  assert.ok(artifact.mapping.entries.length > 0);
});

test("build service respects custom overlay base name and JS extension", () => {
  const program = createProgram({ isJs: true, overlayBaseName: "custom.overlay" });
  const build = new DefaultTemplateBuildService(program);
  const uri = "/app/custom-overlay.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const derived = deriveTemplatePaths(uri, { isJs: true, overlayBaseName: "custom.overlay" });
  const overlay = build.getOverlay(uri);
  const ssr = build.getSsr(uri);

  assert.equal(overlay.overlay.baseName, "custom.overlay");
  assert.equal(overlay.overlay.path, derived.overlay.path);
  assert.ok(overlay.overlay.uri.endsWith(".js"));
  assert.equal(ssr.baseName, derived.ssr.baseName);
  assert.equal(ssr.html.path, derived.ssr.htmlPath);
  assert.equal(ssr.manifest.path, derived.ssr.manifestPath);
});

test("language service delegates build calls when provided", () => {
  const program = createProgram();
  const uri = "/app/delegate.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const canonical = canonicalDocumentUri(uri);
  const paths = deriveTemplatePaths(uri, { isJs: false });
  const baseSnapshot = {
    uri: canonical.uri,
    path: canonical.path,
    file: canonical.file,
    version: 1,
    contentHash: "tpl",
  };
  const overlayArtifact = {
    template: baseSnapshot,
    overlay: {
      uri: paths.overlay.uri,
      path: paths.overlay.path,
      file: paths.overlay.file,
      version: 1,
      contentHash: "ov",
      baseName: paths.overlay.baseName,
      text: "// overlay",
    },
    mapping: { kind: "mapping", entries: [] },
    calls: [],
  };
  const ssrArtifact = {
    template: baseSnapshot,
    baseName: paths.ssr.baseName,
    html: { uri: paths.ssr.htmlUri, path: paths.ssr.htmlPath, file: paths.ssr.htmlFile, version: 1, contentHash: "html", text: "<html></html>" },
    manifest: {
      uri: paths.ssr.manifestUri,
      path: paths.ssr.manifestPath,
      file: paths.ssr.manifestFile,
      version: 1,
      contentHash: "manifest",
      text: "{}",
    },
    mapping: { kind: "ssr-mapping", entries: [] },
  };

  let overlayCalls = 0;
  let ssrCalls = 0;
  const buildService = {
    getOverlay(requestedUri) {
      overlayCalls += 1;
      assert.equal(canonicalDocumentUri(requestedUri).uri, canonical.uri);
      return overlayArtifact;
    },
    getSsr(requestedUri) {
      ssrCalls += 1;
      assert.equal(canonicalDocumentUri(requestedUri).uri, canonical.uri);
      return ssrArtifact;
    },
  };

  const service = new DefaultTemplateLanguageService(program, { buildService });

  assert.equal(service.getOverlay(uri), overlayArtifact);
  assert.equal(service.getSsr(uri), ssrArtifact);
  assert.equal(overlayCalls, 1);
  assert.equal(ssrCalls, 1);
});

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

function createProgram(opts = {}) {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
    ...opts,
  });
}
