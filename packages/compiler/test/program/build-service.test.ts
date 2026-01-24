import { test, expect } from "vitest";

import {
  DEFAULT_SEMANTICS,
  DefaultTemplateBuildService,
  DefaultTemplateLanguageService,
  DefaultTemplateProgram,
  canonicalDocumentUri,
  deriveTemplatePaths,
} from "@aurelia-ls/compiler";
import { noopModuleResolver } from "../_helpers/test-utils.js";

test("build service exposes canonical overlay artifacts", () => {
  const program = createProgram();
  const build = new DefaultTemplateBuildService(program);
  const uri = "/app/build-overlay.html";
  const markup = "<template>${value}</template>";
  program.upsertTemplate(uri, markup);

  const artifact = build.getOverlay(uri);
  const derived = deriveTemplatePaths(uri, { isJs: false });
  const canonicalTemplate = canonicalDocumentUri(uri);

  expect(artifact.template.uri).toBe(canonicalTemplate.uri);
  expect(artifact.template.path).toBe(canonicalTemplate.path);
  expect(artifact.template.version).toBe(1);
  expect(artifact.template.contentHash.length > 0).toBeTruthy();

  expect(artifact.overlay.uri).toBe(canonicalDocumentUri(derived.overlay.uri).uri);
  expect(artifact.overlay.path).toBe(derived.overlay.path);
  expect(artifact.overlay.baseName).toBe(derived.overlay.baseName);
  expect(artifact.overlay.version).toBe(artifact.template.version);
  expect(artifact.overlay.contentHash.length > 0).toBeTruthy();
  expect(artifact.overlay.text.length > 0).toBeTruthy();

  expect(artifact.mapping.entries.length > 0).toBeTruthy();
  expect(artifact.calls.length > 0).toBeTruthy();

  const repeated = build.getOverlay(uri);
  expect(repeated.overlay.contentHash).toBe(artifact.overlay.contentHash);

  program.upsertTemplate(uri, "<template>${value}!</template>");
  const updated = build.getOverlay(uri);
  expect(updated.template.contentHash).not.toBe(artifact.template.contentHash);
});

test("build service respects custom overlay base name and JS extension", () => {
  const program = createProgram({ isJs: true, overlayBaseName: "custom.overlay" });
  const build = new DefaultTemplateBuildService(program);
  const uri = "/app/custom-overlay.html";
  program.upsertTemplate(uri, "<template>${value}</template>");

  const derived = deriveTemplatePaths(uri, { isJs: true, overlayBaseName: "custom.overlay" });
  const overlay = build.getOverlay(uri);

  expect(overlay.overlay.baseName).toBe("custom.overlay");
  expect(overlay.overlay.path).toBe(derived.overlay.path);
  expect(overlay.overlay.uri.endsWith(".js")).toBeTruthy();
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

  let overlayCalls = 0;
  const buildService = {
    getOverlay(requestedUri) {
      overlayCalls += 1;
      expect(canonicalDocumentUri(requestedUri).uri).toBe(canonical.uri);
      return overlayArtifact;
    },
  };

  const service = new DefaultTemplateLanguageService(program, { buildService });

  expect(service.getOverlay(uri)).toBe(overlayArtifact);
  expect(overlayCalls).toBe(1);
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
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
    ...opts,
  });
}
