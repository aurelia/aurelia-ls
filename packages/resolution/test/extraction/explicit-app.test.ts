import { describe, it } from "vitest";
import assert from "node:assert/strict";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts } from "../../out/extraction/index.js";

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
  it("extracts facts from all source files", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Get just app source files (not node_modules or aurelia runtime)
    const appFiles = Array.from(facts.keys())
      .filter(p => p.replace(/\\/g, "/").includes("/explicit-app/src/"))
      .map(p => path.relative(EXPLICIT_APP, p).replace(/\\/g, "/"))
      .sort();

    // Assert exact file discovery
    assert.deepStrictEqual(appFiles, [
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
    ], "Should extract facts from exactly these 20 app source files");
  });

  it("extracts decorators correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Find nav-bar facts
    const navBarEntry = Array.from(facts.entries()).find(([p]) => p.includes("nav-bar"));
    assert.ok(navBarEntry, "nav-bar.ts should be extracted");

    const [, navBarFacts] = navBarEntry;
    const navBarClass = navBarFacts.classes.find(c => c.name === "NavBar");
    assert.ok(navBarClass, "NavBar class should be found");

    // Should have customElement decorator
    const ceDecorator = navBarClass.decorators.find(d => d.name === "customElement");
    assert.ok(ceDecorator, "Should have @customElement decorator");
    assert.ok(ceDecorator.args, "Decorator should have args");
  });

  it("extracts static $au correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Find currency facts (static $au value converter)
    const currencyEntry = Array.from(facts.entries()).find(([p]) => p.includes("currency"));
    assert.ok(currencyEntry, "currency.ts should be extracted");

    const [, currencyFacts] = currencyEntry;
    const currencyClass = currencyFacts.classes.find(c => c.name === "CurrencyValueConverter");
    assert.ok(currencyClass, "CurrencyValueConverter class should be found");
    assert.ok(currencyClass.staticAu, "Should have static $au");
    assert.strictEqual(currencyClass.staticAu.type, "value-converter");
    assert.strictEqual(currencyClass.staticAu.name, "currency");

    // Find fancy-button facts (static $au element)
    const fancyEntry = Array.from(facts.entries()).find(([p]) => p.includes("fancy-button"));
    assert.ok(fancyEntry, "fancy-button.ts should be extracted");

    const [, fancyFacts] = fancyEntry;
    const fancyClass = fancyFacts.classes.find(c => c.name === "FancyButton");
    assert.ok(fancyClass, "FancyButton class should be found");
    assert.ok(fancyClass.staticAu, "Should have static $au");
    assert.strictEqual(fancyClass.staticAu.type, "custom-element");
    assert.strictEqual(fancyClass.staticAu.name, "fancy-button");
  });

  it("extracts static dependencies correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Find product-card facts
    const productEntry = Array.from(facts.entries()).find(([p]) => p.includes("product-card"));
    assert.ok(productEntry, "product-card.ts should be extracted");

    const [, productFacts] = productEntry;
    const productClass = productFacts.classes.find(c => c.name === "ProductCard");
    assert.ok(productClass, "ProductCard class should be found");
    assert.ok(productClass.staticDependencies, "Should have static dependencies");

    const depNames = productClass.staticDependencies.references.map(r =>
      r.kind === "identifier" ? r.name : r.exportName
    );
    assert.ok(depNames.includes("PriceTag"), "Should reference PriceTag");
    assert.ok(depNames.includes("StockBadge"), "Should reference StockBadge");
  });

  it("extracts @bindable members correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Find user-card facts
    const userCardEntry = Array.from(facts.entries()).find(([p]) => p.includes("user-card"));
    assert.ok(userCardEntry, "user-card.ts should be extracted");

    const [, userCardFacts] = userCardEntry;
    const userCardClass = userCardFacts.classes.find(c => c.name === "UserCard");
    assert.ok(userCardClass, "UserCard class should be found");
    assert.ok(userCardClass.bindableMembers.length >= 2, "Should have bindable members");

    const nameBindable = userCardClass.bindableMembers.find(b => b.name === "name");
    assert.ok(nameBindable, "Should have 'name' bindable");

    const selectedBindable = userCardClass.bindableMembers.find(b => b.name === "selected");
    assert.ok(selectedBindable, "Should have 'selected' bindable");
  });

  it("extracts registration calls correctly", () => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const facts = extractAllFacts(program);

    // Find main.ts facts
    const mainEntry = Array.from(facts.entries()).find(([p]) => p.includes("main"));
    assert.ok(mainEntry, "main.ts should be extracted");

    const [, mainFacts] = mainEntry;
    assert.ok(mainFacts.registrationCalls.length > 0, "Should have registration calls");

    const aureliaRegister = mainFacts.registrationCalls.find(r => r.receiver === "Aurelia");
    assert.ok(aureliaRegister, "Should have Aurelia.register() call");

    // Check for spread arguments (barrel imports)
    const spreadArgs = aureliaRegister.arguments.filter(a => a.kind === "spread");
    assert.ok(spreadArgs.length >= 5, `Should have spread args for barrels, got ${spreadArgs.length}`);
  });
});
