import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts, resolveImports } from "@aurelia-ls/resolution";
import { createResolverPipeline } from "@aurelia-ls/resolution";
import { createRegistrationAnalyzer } from "@aurelia-ls/resolution";
import type { RegistrationAnalysis, RegistrationSite } from "@aurelia-ls/resolution";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../apps/explicit-app");

/**
 * Create a TypeScript program from the explicit-app tsconfig.
 */
function createProgramFromApp(appPath: string): ts.Program {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    appPath,
  );

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Filter facts to only include files from the app (not aurelia runtime).
 */
function filterAppFacts(facts: Map<string, unknown>, appPath: string): Map<string, unknown> {
  const filtered = new Map();
  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/explicit-app/src/")) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}

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
  let program: ts.Program;
  let appFacts: ReturnType<typeof filterAppFacts>;
  let resolved: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;
  let analysis: RegistrationAnalysis;

  beforeAll(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);

    // Resolve imports to populate DependencyRef.resolvedPath
    const resolvedFacts = resolveImports(allFacts as any);
    appFacts = filterAppFacts(resolvedFacts, EXPLICIT_APP);

    const pipeline = createResolverPipeline();
    resolved = pipeline.resolve(appFacts as any);
    const analyzer = createRegistrationAnalyzer();
    analysis = analyzer.analyze(resolved.candidates, appFacts as any);
  });

  it("analyzes registration sites and orphans for all candidates", () => {
    // Sites = explicitly registered resources (may have multiple sites per resource)
    // Orphans = declared resources with no registration sites
    const resolvedSites = analysis.sites.filter(s => s.resourceRef.kind === "resolved");

    // Get unique resource names from sites
    const registeredNames = new Set(resolvedSites.map(getResourceName).filter(Boolean));
    const orphanNames = new Set(analysis.orphans.map(o => o.resource.name));

    // All candidates should be either registered or orphaned
    for (const candidate of resolved.candidates) {
      const isRegistered = registeredNames.has(candidate.name);
      const isOrphan = orphanNames.has(candidate.name);
      expect(
        isRegistered || isOrphan,
        `${candidate.name} should be registered or orphaned`
      ).toBe(true);
    }

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
      s.resourceRef.resource.kind === "valueConverter"
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
    // Find main.ts facts
    const mainFacts = Array.from(appFacts.values()).find((f: any) =>
      f.path.includes("main.ts")
    ) as any;
    expect(mainFacts, "Should find main.ts facts").toBeTruthy();

    // Should have namespace imports
    const nsImports = mainFacts.imports.filter((i: any) => i.kind === "namespace");
    expect(nsImports.length >= 5, `Should have at least 5 namespace imports, got ${nsImports.length}`).toBe(true);

    // Check components import
    const componentsImport = nsImports.find((i: any) => i.alias === "components");
    expect(componentsImport, "Should have components namespace import").toBeTruthy();
    expect(componentsImport.resolvedPath?.includes("components/index"), "components should resolve to index").toBe(true);
  });

  it("extracts export facts correctly from barrel files", () => {
    // Find components/index.ts facts
    const indexFacts = Array.from(appFacts.values()).find((f: any) =>
      f.path.includes("components/index.ts")
    ) as any;
    expect(indexFacts, "Should find components/index.ts facts").toBeTruthy();

    // Should have named exports
    expect(indexFacts.exports.length > 0, "Should have exports").toBe(true);

    // Check that exports include our components
    const exportedNames = new Set();
    for (const exp of indexFacts.exports) {
      if (exp.kind === "named") {
        for (const name of exp.names) {
          exportedNames.add(name);
        }
      } else if (exp.kind === "reexport-named") {
        for (const e of exp.names) {
          exportedNames.add(e.alias ?? e.name);
        }
      }
    }

    // The barrel re-exports NavBar, UserCard, DataGrid
    expect(
      exportedNames.has("NavBar") || indexFacts.exports.some((e: any) => e.kind === "reexport-named"),
      "Should export NavBar or have re-exports"
    ).toBe(true);
  });
});
