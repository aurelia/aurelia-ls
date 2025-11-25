import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DefaultTemplateBuildService,
  DefaultTemplateProgram,
  canonicalDocumentUri,
  deriveTemplatePaths,
} from "../../out/program/index.js";
import { DEFAULT_SYNTAX, getExpressionParser } from "../../out/index.js";

const BASE_VM = {
  getRootVmTypeExpr: () => "RootVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

const ssrFixtures = [
  {
    name: "basic",
    dir: new URL("../../../../fixtures/ssr/basic/src/", import.meta.url),
    template: "my-app",
    vm: { getRootVmTypeExpr: () => "MyApp" },
  },
  {
    name: "nested",
    dir: new URL("../../../../fixtures/ssr/nested/", import.meta.url),
    template: "template",
    vm: { getRootVmTypeExpr: () => "NestedVm" },
  },
  {
    name: "kitchen-sink",
    dir: new URL("../../../../fixtures/overlays/kitchen-sink/", import.meta.url),
    template: "template",
    vm: { getRootVmTypeExpr: () => "any" },
  },
];

test("TemplateBuildService matches SSR goldens and records provenance", async (t) => {
  for (const fixture of ssrFixtures) {
    await t.test(fixture.name, async () => {
      const loaded = await loadSsrFixture(fixture.dir, fixture.template);
      const program = createProgram(fixture.vm);
      program.upsertTemplate(loaded.uri, loaded.markup);

      const build = new DefaultTemplateBuildService(program);
      const artifact = build.getSsr(loaded.uri);
      const derived = deriveTemplatePaths(loaded.uri, { isJs: false });

      assert.equal(artifact.html.uri, canonicalDocumentUri(loaded.expectedHtmlPath).uri);
      assert.equal(artifact.manifest.uri, canonicalDocumentUri(loaded.expectedManifestPath).uri);
      assert.equal(artifact.baseName, derived.ssr.baseName);
      assert.equal(artifact.html.text, loaded.expectedHtml);
      assert.equal(artifact.manifest.text, loaded.expectedManifest);

      const stats = program.provenance.templateStats(loaded.uri);
      assert.equal(stats.ssrUris?.html, artifact.html.uri);
      assert.equal(stats.ssrUris?.manifest, artifact.manifest.uri);
      assert.ok(stats.ssrEdges > 0, "SSR provenance edges should be indexed");

      const mapped = artifact.mapping.entries.find((entry) => entry.templateSpan && (entry.htmlSpan || entry.manifestSpan));
      assert.ok(mapped, "SSR mapping should include a node span");
      if (mapped.htmlSpan) {
        const htmlHit = program.provenance.lookupGenerated(artifact.html.uri, mapped.htmlSpan.start);
        assert.equal(htmlHit?.edge.from.nodeId, mapped.nodeId);
      }
      if (mapped.manifestSpan) {
        const manifestHit = program.provenance.lookupGenerated(artifact.manifest.uri, mapped.manifestSpan.start);
        assert.equal(manifestHit?.edge.from.nodeId, mapped.nodeId);
      }
      if (mapped.templateSpan) {
        const templateHit = program.provenance.lookupSource(loaded.uri, mapped.templateSpan.start);
        assert.equal(templateHit?.nodeId, mapped.nodeId);
      }

      // Basic manifest sanity: version + at least one node
      const manifest = JSON.parse(artifact.manifest.text);
      assert.equal(manifest.version, "aurelia-ssr-manifest@0");
      assert.ok(Array.isArray(manifest.templates) && manifest.templates[0]?.nodes?.length > 0);
    });
  }
});

test("SSR promise branches keep host + branch controllers and provenance", () => {
  const program = createProgram({ getRootVmTypeExpr: () => "PromiseBranchesVm" });
  const uri = canonicalDocumentUri("/mem/promise-branches.html").uri;
  const markup = `<template>
  <div promise.bind="task">
    <span then>done \${value}</span>
    <span catch>err \${error}</span>
    <span pending>pending</span>
  </div>
</template>`;

  program.upsertTemplate(uri, markup);
  const build = new DefaultTemplateBuildService(program);
  const artifact = build.getSsr(uri);

  assert.ok(artifact.html.text.includes("data-au-hid"), "host should be marked with HID");
  assert.ok(artifact.html.text.includes("promise start"), "promise controller markers should render");

  const manifest = JSON.parse(artifact.manifest.text);
  const nodes = manifest.templates[0]?.nodes ?? [];
  const controllers = nodes.flatMap((n) => n.controllers ?? []).filter((c) => c.res === "promise");
  const branchKinds = new Set(controllers.map((c) => c.branch?.kind ?? "root"));
  assert.ok(branchKinds.has("root") && branchKinds.has("then") && branchKinds.has("catch"));

  const stats = program.provenance.templateStats(uri);
  assert.ok(stats.ssrEdges > 0, "promise controllers should surface SSR provenance");
});

async function loadSsrFixture(dir, baseName) {
  const htmlUrl = new URL(`./${baseName}.html`, dir);
  const ssrHtmlUrl = new URL(`./${baseName}.__au.ssr.html`, dir);
  const ssrManifestUrl = new URL(`./${baseName}.__au.ssr.json`, dir);

  const htmlPath = path.resolve(fileURLToPath(htmlUrl));
  const expectedHtmlPath = path.resolve(fileURLToPath(ssrHtmlUrl));
  const expectedManifestPath = path.resolve(fileURLToPath(ssrManifestUrl));

  const markup = await readFile(htmlUrl, "utf8");
  const expectedHtml = await readFile(ssrHtmlUrl, "utf8");
  const expectedManifest = await readFile(ssrManifestUrl, "utf8");
  const canonical = canonicalDocumentUri(htmlPath);

  return {
    uri: canonical.uri,
    markup,
    expectedHtml,
    expectedManifest,
    expectedHtmlPath,
    expectedManifestPath,
  };
}

function createProgram(vmOverrides = {}) {
  return new DefaultTemplateProgram({
    vm: { ...BASE_VM, ...vmOverrides },
    isJs: false,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });
}
