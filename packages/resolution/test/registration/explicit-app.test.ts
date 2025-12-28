import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "@aurelia-ls/resolution";
import { createResolverPipeline } from "@aurelia-ls/resolution";
import { createRegistrationAnalyzer } from "@aurelia-ls/resolution";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLICIT_APP = path.resolve(__dirname, "../apps/explicit-app");

/**
 * Create a TypeScript program from the explicit-app tsconfig.
 */
function createProgramFromApp(appPath) {
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
function filterAppFacts(facts, appPath) {
  const filtered = new Map();
  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/explicit-app/src/")) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}

describe("Registration: explicit-app", () => {
  let program: ts.Program;
  let appFacts: ReturnType<typeof filterAppFacts>;
  let resolved: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;
  let intents: ReturnType<ReturnType<typeof createRegistrationAnalyzer>["analyze"]>;

  beforeAll(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    appFacts = filterAppFacts(allFacts, EXPLICIT_APP);
    const pipeline = createResolverPipeline();
    resolved = pipeline.resolve(appFacts);
    const analyzer = createRegistrationAnalyzer();
    intents = analyzer.analyze(resolved.candidates, appFacts, program);
  });

  it("analyzes registration intents for all candidates", () => {
    // We should have intents for all candidates
    expect(intents.length, "Should produce one intent per candidate").toBe(resolved.candidates.length);
    expect(intents.length, "Should have exactly 14 intents").toBe(14);

    // Assert intent breakdown by kind
    const byKind = {
      global: intents.filter(i => i.kind === "global").map(i => i.resource.name).sort(),
      local: intents.filter(i => i.kind === "local").map(i => i.resource.name).sort(),
      unknown: intents.filter(i => i.kind === "unknown").map(i => i.resource.name).sort(),
    };
    expect(byKind.global, "Global resources (registered via barrels)").toEqual([
      "currency", "data-grid", "date", "debounce", "fancy-button",
      "highlight", "nav-bar", "throttle", "tooltip", "user-card"
    ]);
    expect(byKind.local, "Local resources (scoped to product-card via static dependencies)").toEqual(["price-tag", "stock-badge"]);
    expect(byKind.unknown, "Unknown resources (not explicitly registered via barrels)").toEqual(["my-app", "product-card"]);
  });

  it("identifies globally registered resources via barrel exports", () => {
    // nav-bar should be global (registered via barrel)
    const navBar = intents.find(i => i.resource.name === "nav-bar");
    expect(navBar, "Should find nav-bar intent").toBeTruthy();
    expect(navBar.kind, "nav-bar should be global").toBe("global");
    expect(navBar.evidence[0]?.kind, "nav-bar evidence should be aurelia-register").toBe("aurelia-register");

    // data-grid should be global
    const dataGrid = intents.find(i => i.resource.name === "data-grid");
    expect(dataGrid, "Should find data-grid intent").toBeTruthy();
    expect(dataGrid.kind, "data-grid should be global").toBe("global");

    // tooltip should be global
    const tooltip = intents.find(i => i.resource.name === "tooltip");
    expect(tooltip, "Should find tooltip intent").toBeTruthy();
    expect(tooltip.kind, "tooltip should be global").toBe("global");

    // date value converter should be global
    const date = intents.find(i => i.resource.name === "date" && i.resource.kind === "valueConverter");
    expect(date, "Should find date intent").toBeTruthy();
    expect(date.kind, "date should be global").toBe("global");

    // debounce binding behavior should be global
    const debounce = intents.find(i => i.resource.name === "debounce");
    expect(debounce, "Should find debounce intent").toBeTruthy();
    expect(debounce.kind, "debounce should be global").toBe("global");
  });

  it("identifies locally scoped resources via static dependencies", () => {
    // price-tag should be local (in ProductCard's static dependencies)
    const priceTag = intents.find(i => i.resource.name === "price-tag");
    expect(priceTag, "Should find price-tag intent").toBeTruthy();
    expect(priceTag.kind, "price-tag should be local").toBe("local");
    expect(priceTag.scope?.includes("product-card"), "price-tag scope should be product-card").toBe(true);
    expect(priceTag.evidence[0]?.kind).toBe("static-dependencies");

    // stock-badge should be local
    const stockBadge = intents.find(i => i.resource.name === "stock-badge");
    expect(stockBadge, "Should find stock-badge intent").toBeTruthy();
    expect(stockBadge.kind, "stock-badge should be local").toBe("local");
    expect(stockBadge.scope?.includes("product-card"), "stock-badge scope should be product-card").toBe(true);
  });

  it("identifies static $au resources registered via barrel", () => {
    // fancy-button (static $au element) should be global
    const fancyButton = intents.find(i => i.resource.name === "fancy-button");
    expect(fancyButton, "Should find fancy-button intent").toBeTruthy();
    expect(fancyButton.kind, "fancy-button should be global").toBe("global");

    // currency (static $au value converter) should be global
    const currency = intents.find(i => i.resource.name === "currency");
    expect(currency, "Should find currency intent").toBeTruthy();
    expect(currency.kind, "currency should be global").toBe("global");
  });

  it("extracts import facts correctly", () => {
    // Find main.ts facts
    const mainFacts = Array.from(appFacts.values()).find(f =>
      f.path.includes("main.ts")
    );
    expect(mainFacts, "Should find main.ts facts").toBeTruthy();

    // Should have namespace imports
    const nsImports = mainFacts.imports.filter(i => i.kind === "namespace");
    expect(nsImports.length >= 5, `Should have at least 5 namespace imports, got ${nsImports.length}`).toBe(true);

    // Check components import
    const componentsImport = nsImports.find(i => i.alias === "components");
    expect(componentsImport, "Should have components namespace import").toBeTruthy();
    expect(componentsImport.resolvedPath?.includes("components/index"), "components should resolve to index").toBe(true);
  });

  it("extracts export facts correctly from barrel files", () => {
    // Find components/index.ts facts
    const indexFacts = Array.from(appFacts.values()).find(f =>
      f.path.includes("components/index.ts")
    );
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
      exportedNames.has("NavBar") || indexFacts.exports.some(e => e.kind === "reexport-named"),
      "Should export NavBar or have re-exports"
    ).toBe(true);
  });
});
