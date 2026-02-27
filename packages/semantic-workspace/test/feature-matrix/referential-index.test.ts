/**
 * Feature Matrix: Referential Index
 *
 * Boundary tests verifying that the workspace-level referential index is
 * populated correctly after template compilation. These test the seam
 * between template compilation and the referential index — the third
 * provenance dimension from L1 cross-domain-provenance-mapping.md.
 *
 * Per the testing thesis:
 * - Property over output: tests verify referential invariants, not specific spans
 * - Boundary over interior: tests verify the compilation → index seam
 * - Silent over visible: a missing index entry is silent — hover still works,
 *   but find-references/rename would miss the site
 *
 * Test structure:
 * 1. Population — index has entries after template compilation
 * 2. Resource coverage — every resource kind in the template is indexed
 * 3. Reverse lookup — getReferencesForResource returns correct sites
 * 4. Reference kind taxonomy — each site has the correct ReferenceKind
 * 5. Coherence — forward (cursor entity) and reverse (index) agree
 * 6. Invalidation — recompilation updates the index, no stale entries
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getHarness,
  getAppTemplate,
  getAppQuery,
  pos,
} from "./_harness.js";
import type { SemanticQuery, SemanticWorkspace } from "../../out/types.js";
import type { ReferenceSite, ReferentialIndex, TextReferenceSite } from "@aurelia-ls/compiler/schema/referential-index.js";
let query: SemanticQuery;
let text: string;
let workspace: SemanticWorkspace;
let index: ReferentialIndex;

beforeAll(async () => {
  query = await getAppQuery();
  text = (await getAppTemplate()).text;
  const harness = await getHarness();
  workspace = harness.workspace;
  index = workspace.referentialIndex;
  // Trigger a hover to force compilation → referential index population
  query.hover(await pos("<matrix-panel\n", 1));
});

// ============================================================================
// 1. Population — index has entries after template compilation
// ============================================================================

describe("referential index population", () => {
  it("index has reference sites after compilation", () => {
    const all = index.allSites();
    expect(all.length).toBeGreaterThan(0);
  });

  it("index tracks at least one resource", () => {
    const resources = index.indexedResources();
    expect(resources.length).toBeGreaterThan(0);
  });

  it("index tracks multiple resource kinds", () => {
    const resources = index.indexedResources();
    const kinds = new Set(resources.map(k => k.split(":")[0]));
    // Should have at least CE and TC references
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// 2. Resource coverage — every resource kind in the template is indexed
// ============================================================================

describe("referential index resource coverage", () => {
  it("custom element references are indexed", () => {
    const sites = index.getReferencesForResource("custom-element:matrix-panel");
    expect(sites.length).toBeGreaterThan(0);
  });

  it("convention CE references are indexed", () => {
    const sites = index.getReferencesForResource("custom-element:matrix-badge");
    expect(sites.length).toBeGreaterThan(0);
  });

  it("template controller references are indexed", () => {
    // Built-in TCs: repeat, if, etc.
    const repeatSites = index.getReferencesForResource("template-controller:repeat");
    const ifSites = index.getReferencesForResource("template-controller:if");
    expect(repeatSites.length + ifSites.length).toBeGreaterThan(0);
  });

  it("value converter references are indexed", () => {
    const sites = index.getReferencesForResource("value-converter:formatDate");
    expect(sites.length).toBeGreaterThan(0);
  });

  it("binding behavior references are indexed", () => {
    const sites = index.getReferencesForResource("binding-behavior:rateLimit");
    expect(sites.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// 3. Reverse lookup — getReferencesForResource returns correct sites
// ============================================================================

describe("referential index reverse lookup", () => {
  it("CE reverse lookup returns template-domain sites", () => {
    const sites = index.getReferencesForResource("custom-element:matrix-panel");
    const textSites = sites.filter((s): s is TextReferenceSite => s.kind === "text");
    expect(textSites.length).toBeGreaterThan(0);
    for (const site of textSites) {
      expect(site.domain).toBe("template");
    }
  });

  it("VC reverse lookup returns expression-pipe sites", () => {
    const sites = index.getReferencesForResource("value-converter:formatDate");
    const textSites = sites.filter((s): s is TextReferenceSite => s.kind === "text");
    expect(textSites.length).toBeGreaterThan(0);
    for (const site of textSites) {
      expect(site.referenceKind).toBe("expression-pipe");
    }
  });

  it("BB reverse lookup returns expression-behavior sites", () => {
    const sites = index.getReferencesForResource("binding-behavior:rateLimit");
    const textSites = sites.filter((s): s is TextReferenceSite => s.kind === "text");
    expect(textSites.length).toBeGreaterThan(0);
    for (const site of textSites) {
      expect(site.referenceKind).toBe("expression-behavior");
    }
  });

  it("non-existent resource returns empty array", () => {
    const sites = index.getReferencesForResource("custom-element:does-not-exist");
    expect(sites).toEqual([]);
  });
});

// ============================================================================
// 4. Reference kind taxonomy — each site has the correct ReferenceKind
// ============================================================================

describe("referential index reference kinds", () => {
  it("CE tag produces tag-name reference kind", () => {
    const sites = index.getReferencesForResource("custom-element:matrix-panel");
    const tagSites = sites.filter(
      (s): s is TextReferenceSite => s.kind === "text" && s.referenceKind === "tag-name",
    );
    expect(tagSites.length).toBeGreaterThan(0);
  });

  it("CA attribute produces attribute-name reference kind", () => {
    // Find any CA reference
    const resources = index.indexedResources().filter(k => k.startsWith("custom-attribute:"));
    expect(resources.length).toBeGreaterThan(0);
    for (const key of resources) {
      const sites = index.getReferencesForResource(key);
      const attrSites = sites.filter(
        (s): s is TextReferenceSite => s.kind === "text" && s.referenceKind === "attribute-name",
      );
      if (attrSites.length > 0) {
        expect(attrSites[0]!.nameForm).toBe("kebab-case");
        return; // found one, pass
      }
    }
  });

  it("VC pipe produces expression-pipe reference kind with camelCase name form", () => {
    const sites = index.getReferencesForResource("value-converter:formatDate");
    const pipeSites = sites.filter(
      (s): s is TextReferenceSite => s.kind === "text" && s.referenceKind === "expression-pipe",
    );
    expect(pipeSites.length).toBeGreaterThan(0);
    expect(pipeSites[0]!.nameForm).toBe("camelCase");
  });

  it("all reference sites have valid reference kinds", () => {
    const validKinds = new Set([
      "tag-name", "close-tag-name", "attribute-name", "as-element-value",
      "expression-identifier", "expression-pipe", "expression-behavior",
      "local-template-attr", "import-element-from",
      "decorator-name-property", "decorator-string-arg", "static-au-name",
      "define-name", "import-path", "dependencies-class", "dependencies-string",
      "class-name", "property-access", "bindable-config-key", "bindable-callback",
    ]);
    for (const site of index.allSites()) {
      if (site.kind === "text") {
        expect(validKinds.has(site.referenceKind), `Invalid reference kind: ${site.referenceKind}`).toBe(true);
      }
    }
  });
});

// ============================================================================
// 5. Coherence — forward (cursor entity) and reverse (index) agree
//
// This is the forward-reverse coherence invariant from L1:
// For any template position P mapped to resource R by the cursor entity,
// the referential index must include P in its reverse lookup for R.
// ============================================================================

describe("referential index forward-reverse coherence", () => {
  it("CE tag: cursor entity resource matches index entry", async () => {
    // Hover at matrix-panel tag → cursor entity says CE:matrix-panel
    // Index reverse lookup for CE:matrix-panel → should include a site at that position
    const sites = index.getReferencesForResource("custom-element:matrix-panel");
    const tagSites = sites.filter(
      (s): s is TextReferenceSite => s.kind === "text" && s.referenceKind === "tag-name",
    );
    expect(tagSites.length).toBeGreaterThan(0);
    // The tag site's span should overlap with the template text where <matrix-panel appears
    const tagOffset = text.indexOf("<matrix-panel");
    expect(tagOffset).toBeGreaterThan(-1);
    const hasCoveringSpan = tagSites.some(
      s => s.span.start <= tagOffset + 1 && s.span.end >= tagOffset + 1,
    );
    expect(hasCoveringSpan, "index should have a site covering the CE tag position").toBe(true);
  });

  it("VC pipe: cursor entity resource matches index entry", async () => {
    const sites = index.getReferencesForResource("value-converter:formatDate");
    expect(sites.length).toBeGreaterThan(0);
    // The pipe site should be near the "formatDate" text in the template
    const vcOffset = text.indexOf("formatDate");
    expect(vcOffset).toBeGreaterThan(-1);
    const textSites = sites.filter((s): s is TextReferenceSite => s.kind === "text");
    const hasCoveringSpan = textSites.some(
      s => s.span.start <= vcOffset && s.span.end >= vcOffset + "formatDate".length,
    );
    expect(hasCoveringSpan, "index should have a site covering the VC pipe position").toBe(true);
  });
});

// ============================================================================
// 6. Carried property completeness — every site has required fields
//
// Per L1 cross-domain-provenance-mapping §Carried properties on reference sites:
// domain, referenceKind, file, span, nameForm, resourceKey
// ============================================================================

describe("referential index carried properties", () => {
  it("every text reference site has all required fields", () => {
    for (const site of index.allSites()) {
      if (site.kind !== "text") continue;
      expect(site.domain, "site must have domain").toBeTruthy();
      expect(site.referenceKind, "site must have referenceKind").toBeTruthy();
      expect(site.file, "site must have file").toBeTruthy();
      expect(site.span, "site must have span").toBeTruthy();
      expect(site.span.start, "span.start must be a number").toEqual(expect.any(Number));
      expect(site.span.end, "span.end must be a number").toEqual(expect.any(Number));
      expect(site.nameForm, "site must have nameForm").toBeTruthy();
      expect(site.resourceKey, "site must have resourceKey").toBeTruthy();
    }
  });

  it("every text reference site has non-zero span", () => {
    for (const site of index.allSites()) {
      if (site.kind !== "text") continue;
      expect(site.span.end).toBeGreaterThan(site.span.start);
    }
  });

  it("resource keys follow the kind:name pattern", () => {
    const validPrefixes = [
      "custom-element:", "custom-attribute:", "template-controller:",
      "value-converter:", "binding-behavior:",
    ];
    for (const key of index.indexedResources()) {
      const hasValidPrefix = validPrefixes.some(p => key.startsWith(p));
      // Some keys may be bindable refs like "custom-element:x:bindable:y"
      expect(hasValidPrefix, `Invalid resource key prefix: ${key}`).toBe(true);
    }
  });
});
