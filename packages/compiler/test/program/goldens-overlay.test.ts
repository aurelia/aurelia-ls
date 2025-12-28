import { describe, test, expect } from "vitest";
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

const overlayFixtures = [
  { name: "kitchen-sink", dir: new URL("../../../../fixtures/overlays/kitchen-sink/", import.meta.url), vmType: "any" },
  { name: "hydrate-mix", dir: new URL("../../../../fixtures/overlays/hydrate-mix/", import.meta.url), vmType: "AppVm" },
  { name: "hydrate-nesting", dir: new URL("../../../../fixtures/overlays/hydrate-nesting/", import.meta.url), vmType: "AppVm" },
];

describe("TemplateBuildService emits overlay goldens and provenance", () => {
  for (const fixture of overlayFixtures) {
    test(fixture.name, async () => {
      const { uri, markup, expectedOverlay, overlayPath } = await loadOverlayFixture(fixture.dir);
      const program = createProgram(fixture.vmType);
      program.upsertTemplate(uri, markup);

      const build = new DefaultTemplateBuildService(program);
      const artifact = build.getOverlay(uri);
      const derived = deriveTemplatePaths(uri, { isJs: false });

      expect(artifact.overlay.uri).toBe(canonicalDocumentUri(overlayPath).uri);
      expect(artifact.overlay.path).toBe(derived.overlay.path);
      expect(artifact.overlay.baseName).toBe(derived.overlay.baseName);
      expect(artifact.overlay.text).toBe(expectedOverlay);
      expect(artifact.mapping.entries.length > 0, "mapping should contain overlay->template spans").toBeTruthy();

      const stats = program.provenance.templateStats(uri);
      expect(stats.overlayUri).toBe(artifact.overlay.uri);
      expect(stats.overlayEdges > 0, "overlay provenance edges should be indexed").toBeTruthy();

      const entry = artifact.mapping.entries.find((candidate) => candidate.htmlSpan.end > candidate.htmlSpan.start) ?? artifact.mapping.entries[0];
      expect(entry, "should have at least one mapping entry").toBeTruthy();

      const overlayHit = program.provenance.lookupGenerated(artifact.overlay.uri, entry.overlaySpan.start);
      expect(overlayHit, "overlay hit should exist").toBeTruthy();
      expect(overlayHit?.exprId, "overlay hit should surface expr id").toBe(entry.exprId);

      if (entry.htmlSpan.end > entry.htmlSpan.start) {
        const templateHit = program.provenance.lookupSource(uri, entry.htmlSpan.start);
        expect(templateHit, "template hit should exist").toBeTruthy();
        expect(templateHit?.exprId, "template hit should surface expr id").toBe(entry.exprId);
      }

      const memberSeg = entry.segments?.[0];
      if (memberSeg) {
        const memberHit = program.provenance.lookupGenerated(artifact.overlay.uri, memberSeg.overlaySpan.start);
        expect(memberHit?.memberPath, "member segment should be tagged for rename/navigation").toBe(memberSeg.path);
      }
    });
  }
});

async function loadOverlayFixture(dir) {
  const htmlUrl = new URL("./template.html", dir);
  const overlayUrl = new URL("./template.__au.ttc.overlay.ts", dir);
  const htmlPath = path.resolve(fileURLToPath(htmlUrl));
  const overlayPath = path.resolve(fileURLToPath(overlayUrl));

  const markup = await readFile(htmlUrl, "utf8");
  const expectedOverlay = await readFile(overlayUrl, "utf8");
  const canonical = canonicalDocumentUri(htmlPath);
  return { uri: canonical.uri, markup, expectedOverlay, overlayPath };
}

function createProgram(vmType = "RootVm") {
  return new DefaultTemplateProgram({
    vm: {
      getRootVmTypeExpr: () => vmType,
      getSyntheticPrefix: () => "__AU_TTC_",
    },
    isJs: false,
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
  });
}
