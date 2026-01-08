import { describe, it, expect, beforeAll } from "vitest";
import {
  extractAllFileFacts,
  buildExportBindingMap,
  createRegistrationAnalyzer,
  matchFileFacts,
} from "@aurelia-ls/resolution";
import type { RegistrationAnalysis, RegistrationSite, ResourceAnnotation } from "@aurelia-ls/resolution";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

/**
 * Find a resolved site by resource name.
 */
function findSiteByName(sites: readonly RegistrationSite[], name: string): RegistrationSite | undefined {
  return sites.find(s =>
    s.resourceRef.kind === "resolved" && s.resourceRef.resource.name === name
  );
}

/**
 * Get resource name from a site (only for resolved refs).
 */
function getResourceName(site: RegistrationSite): string | undefined {
  return site.resourceRef.kind === "resolved" ? site.resourceRef.resource.name : undefined;
}

describe("Registration: explicit-app", () => {
  let analysis: RegistrationAnalysis;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFileFacts(program);
    const appFacts = filterFactsByPathPattern(allFacts, "/explicit-app/src/");

    // Run pattern matching on all files to get annotations
    const allAnnotations: ResourceAnnotation[] = [];
    for (const [, fileFacts] of appFacts) {
      const matchResult = matchFileFacts(fileFacts);
      allAnnotations.push(...matchResult.annotations);
    }

    // Build export binding map
    const exportBindings = buildExportBindingMap(appFacts);

    // Analyze registrations
    const analyzer = createRegistrationAnalyzer();
    analysis = analyzer.analyze(allAnnotations, appFacts, exportBindings);
  });

  it("analyzes registration sites and orphans for all candidates", () => {
    // Sites = explicitly registered resources (may have multiple sites per resource)
    // Orphans = declared resources with no registration sites
    const resolvedSites = analysis.sites.filter(s => s.resourceRef.kind === "resolved");

    // Get unique resource names from sites
    const registeredNames = new Set(resolvedSites.map(getResourceName).filter(Boolean));
    const orphanNames = new Set(analysis.orphans.map(o => o.resource.name));

    // Assert site breakdown by scope
    const globalSites = resolvedSites.filter(s => s.scope.kind === "global");
    const localSites = resolvedSites.filter(s => s.scope.kind === "local");

    const globalNames = [...new Set(globalSites.map(getResourceName))].sort();
    const localNames = [...new Set(localSites.map(getResourceName))].sort();
    const orphanNamesSorted = [...orphanNames].sort();

    expect(globalNames, "Global resources (registered via barrels)").toEqual([
      "currency", "data-grid", "date", "debounce", "fancy-button",
      "highlight", "nav-bar", "throttle", "tooltip", "user-card"
    ]);
    expect(localNames, "Local resources (scoped to product-card via static dependencies)").toEqual([
      "price-tag", "stock-badge"
    ]);
    expect(orphanNamesSorted, "Orphan resources (not explicitly registered)").toEqual([
      "my-app", "product-card"
    ]);
  });

  it("identifies globally registered resources via barrel exports", () => {
    // nav-bar should be global (registered via barrel)
    const navBar = findSiteByName(analysis.sites, "nav-bar");
    expect(navBar, "Should find nav-bar site").toBeTruthy();
    expect(navBar!.scope.kind, "nav-bar should be global").toBe("global");
    expect(navBar!.evidence.kind, "nav-bar evidence should be aurelia-register").toBe("aurelia-register");

    // data-grid should be global
    const dataGrid = findSiteByName(analysis.sites, "data-grid");
    expect(dataGrid, "Should find data-grid site").toBeTruthy();
    expect(dataGrid!.scope.kind, "data-grid should be global").toBe("global");

    // tooltip should be global
    const tooltip = findSiteByName(analysis.sites, "tooltip");
    expect(tooltip, "Should find tooltip site").toBeTruthy();
    expect(tooltip!.scope.kind, "tooltip should be global").toBe("global");

    // date value converter should be global
    const dateSites = analysis.sites.filter(s =>
      s.resourceRef.kind === "resolved" &&
      s.resourceRef.resource.name === "date" &&
      s.resourceRef.resource.kind === "value-converter"
    );
    expect(dateSites.length > 0, "Should find date site").toBe(true);
    expect(dateSites[0]!.scope.kind, "date should be global").toBe("global");

    // debounce binding behavior should be global
    const debounce = findSiteByName(analysis.sites, "debounce");
    expect(debounce, "Should find debounce site").toBeTruthy();
    expect(debounce!.scope.kind, "debounce should be global").toBe("global");
  });

  it("identifies locally scoped resources via static dependencies", () => {
    // price-tag should be local (in ProductCard's static dependencies)
    const priceTag = findSiteByName(analysis.sites, "price-tag");
    expect(priceTag, "Should find price-tag site").toBeTruthy();
    expect(priceTag!.scope.kind, "price-tag should be local").toBe("local");
    if (priceTag!.scope.kind === "local") {
      expect(priceTag!.scope.owner.includes("product-card"), "price-tag scope should be product-card").toBe(true);
    }
    expect(priceTag!.evidence.kind).toBe("static-dependencies");

    // stock-badge should be local
    const stockBadge = findSiteByName(analysis.sites, "stock-badge");
    expect(stockBadge, "Should find stock-badge site").toBeTruthy();
    expect(stockBadge!.scope.kind, "stock-badge should be local").toBe("local");
    if (stockBadge!.scope.kind === "local") {
      expect(stockBadge!.scope.owner.includes("product-card"), "stock-badge scope should be product-card").toBe(true);
    }
  });

  it("identifies static $au resources registered via barrel", () => {
    // fancy-button (static $au element) should be global
    const fancyButton = findSiteByName(analysis.sites, "fancy-button");
    expect(fancyButton, "Should find fancy-button site").toBeTruthy();
    expect(fancyButton!.scope.kind, "fancy-button should be global").toBe("global");

    // currency (static $au value converter) should be global
    const currency = findSiteByName(analysis.sites, "currency");
    expect(currency, "Should find currency site").toBeTruthy();
    expect(currency!.scope.kind, "currency should be global").toBe("global");
  });

  it("extracts import facts correctly", () => {
    // This test verifies the extraction → import resolution chain works
    // by checking that namespace imports are properly indexed
    const navBar = findSiteByName(analysis.sites, "nav-bar");
    expect(navBar, "Should find nav-bar site").toBeTruthy();

    // The evidence should indicate it was registered via Aurelia.register()
    expect(navBar!.evidence.kind).toBe("aurelia-register");
  });

  it("provides provenance (span) for all registration sites", () => {
    // Every registration site should have a span with valid offsets
    for (const site of analysis.sites) {
      expect(site.span, "Site should have span").toBeTruthy();
      expect(site.span.file, "Span should have file").toBeTruthy();
      expect(typeof site.span.start).toBe("number");
      expect(typeof site.span.end).toBe("number");
      expect(site.span.end >= site.span.start, "Span end should be >= start").toBe(true);
    }
  });
});
