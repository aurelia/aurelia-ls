import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "@aurelia-ls/resolution";

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

  const program = ts.createProgram(parsed.fileNames, parsed.options);
  return program;
}

describe("Extraction: explicit-app", () => {
  let program: ts.Program;
  let facts: ReturnType<typeof extractAllFacts>;

  beforeAll(() => {
    program = createProgramFromApp(EXPLICIT_APP);
    facts = extractAllFacts(program);
  });

  it("extracts facts from all source files", () => {

    // Get just app source files (not node_modules or aurelia runtime)
    const appFiles = Array.from(facts.keys())
      .filter(p => p.replace(/\\/g, "/").includes("/explicit-app/src/"))
      .map(p => path.relative(EXPLICIT_APP, p).replace(/\\/g, "/"))
      .sort();

    // Assert exact file discovery
    expect(appFiles, "Should extract facts from exactly these 20 app source files").toEqual([
      "src/attributes/highlight.ts",
      "src/attributes/index.ts",
      "src/attributes/tooltip.ts",
      "src/binding-behaviors/debounce.ts",
      "src/binding-behaviors/index.ts",
      "src/binding-behaviors/throttle.ts",
      "src/components/data-grid.ts",
      "src/components/index.ts",
      "src/components/nav-bar.ts",
      "src/components/user-card.ts",
      "src/main.ts",
      "src/my-app.ts",
      "src/static-au/fancy-button.ts",
      "src/static-au/index.ts",
      "src/value-converters/currency.ts",
      "src/value-converters/date-format.ts",
      "src/value-converters/index.ts",
      "src/widgets/price-tag.ts",
      "src/widgets/product-card.ts",
      "src/widgets/stock-badge.ts",
    ]);
  });

  it("extracts decorators correctly", () => {
    // Find nav-bar facts
    const navBarEntry = Array.from(facts.entries()).find(([p]) => p.includes("nav-bar"));
    expect(navBarEntry, "nav-bar.ts should be extracted").toBeTruthy();

    const [, navBarFacts] = navBarEntry;
    const navBarClass = navBarFacts.classes.find(c => c.name === "NavBar");
    expect(navBarClass, "NavBar class should be found").toBeTruthy();

    // Should have customElement decorator
    const ceDecorator = navBarClass.decorators.find(d => d.name === "customElement");
    expect(ceDecorator, "Should have @customElement decorator").toBeTruthy();
    expect(ceDecorator.args, "Decorator should have args").toBeTruthy();
  });

  it("extracts static $au correctly", () => {
    // Find currency facts (static $au value converter)
    const currencyEntry = Array.from(facts.entries()).find(([p]) => p.includes("currency"));
    expect(currencyEntry, "currency.ts should be extracted").toBeTruthy();

    const [, currencyFacts] = currencyEntry;
    const currencyClass = currencyFacts.classes.find(c => c.name === "CurrencyValueConverter");
    expect(currencyClass, "CurrencyValueConverter class should be found").toBeTruthy();
    expect(currencyClass.staticAu, "Should have static $au").toBeTruthy();
    expect(currencyClass.staticAu.type).toBe("value-converter");
    expect(currencyClass.staticAu.name).toBe("currency");

    // Find fancy-button facts (static $au element)
    const fancyEntry = Array.from(facts.entries()).find(([p]) => p.includes("fancy-button"));
    expect(fancyEntry, "fancy-button.ts should be extracted").toBeTruthy();

    const [, fancyFacts] = fancyEntry;
    const fancyClass = fancyFacts.classes.find(c => c.name === "FancyButton");
    expect(fancyClass, "FancyButton class should be found").toBeTruthy();
    expect(fancyClass.staticAu, "Should have static $au").toBeTruthy();
    expect(fancyClass.staticAu.type).toBe("custom-element");
    expect(fancyClass.staticAu.name).toBe("fancy-button");
  });

  it("extracts static dependencies correctly", () => {
    // Find product-card facts
    const productEntry = Array.from(facts.entries()).find(([p]) => p.includes("product-card"));
    expect(productEntry, "product-card.ts should be extracted").toBeTruthy();

    const [, productFacts] = productEntry;
    const productClass = productFacts.classes.find(c => c.name === "ProductCard");
    expect(productClass, "ProductCard class should be found").toBeTruthy();
    expect(productClass.staticDependencies, "Should have static dependencies").toBeTruthy();

    const depNames = productClass.staticDependencies.references.map(r =>
      r.kind === "identifier" ? r.name : r.exportName
    );
    expect(depNames.includes("PriceTag"), "Should reference PriceTag").toBe(true);
    expect(depNames.includes("StockBadge"), "Should reference StockBadge").toBe(true);

    // Verify provenance (spans) are captured
    for (const ref of productClass.staticDependencies.references) {
      if (ref.kind === "identifier") {
        expect(ref.span, `${ref.name} should have span`).toBeTruthy();
        expect(typeof ref.span.start, `${ref.name} span.start should be number`).toBe("number");
        expect(typeof ref.span.end, `${ref.name} span.end should be number`).toBe("number");
        expect(ref.span.end > ref.span.start, `${ref.name} span.end > span.start`).toBe(true);
        // resolvedPath is null until WP2 (import resolution)
        expect(ref.resolvedPath, `${ref.name} resolvedPath should be null until WP2`).toBeNull();
      }
    }
  });

  it("extracts @bindable members correctly", () => {
    // Find user-card facts
    const userCardEntry = Array.from(facts.entries()).find(([p]) => p.includes("user-card"));
    expect(userCardEntry, "user-card.ts should be extracted").toBeTruthy();

    const [, userCardFacts] = userCardEntry;
    const userCardClass = userCardFacts.classes.find(c => c.name === "UserCard");
    expect(userCardClass, "UserCard class should be found").toBeTruthy();
    expect(userCardClass.bindableMembers.length >= 2, "Should have bindable members").toBe(true);

    const nameBindable = userCardClass.bindableMembers.find(b => b.name === "name");
    expect(nameBindable, "Should have 'name' bindable").toBeTruthy();

    const selectedBindable = userCardClass.bindableMembers.find(b => b.name === "selected");
    expect(selectedBindable, "Should have 'selected' bindable").toBeTruthy();
  });

  it("extracts registration calls correctly", () => {
    // Find main.ts facts
    const mainEntry = Array.from(facts.entries()).find(([p]) => p.includes("main"));
    expect(mainEntry, "main.ts should be extracted").toBeTruthy();

    const [, mainFacts] = mainEntry;
    expect(mainFacts.registrationCalls.length > 0, "Should have registration calls").toBe(true);

    const aureliaRegister = mainFacts.registrationCalls.find(r => r.receiver === "Aurelia");
    expect(aureliaRegister, "Should have Aurelia.register() call").toBeTruthy();

    // Check for spread arguments (barrel imports)
    const spreadArgs = aureliaRegister.arguments.filter(a => a.kind === "spread");
    expect(spreadArgs.length >= 5, `Should have spread args for barrels, got ${spreadArgs.length}`).toBe(true);
  });
});
