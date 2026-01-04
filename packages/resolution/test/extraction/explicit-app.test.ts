import { describe, it, expect, beforeAll } from "vitest";
import { extractAllFacts } from "@aurelia-ls/resolution";
import type { SourceFacts } from "@aurelia-ls/resolution";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);

describe("Extraction: explicit-app", () => {
  let appFacts: Map<string, SourceFacts>;

  beforeAll(() => {
    const program = createProgramFromApp(EXPLICIT_APP);
    const allFacts = extractAllFacts(program);
    appFacts = filterFactsByPathPattern(allFacts, "/explicit-app/src/") as Map<string, SourceFacts>;
  });

  it("extracts facts from all source files", () => {
    // Count files - should have all source files from explicit-app
    expect(appFacts.size).toBeGreaterThan(10);

    // Check specific files exist
    const paths = [...appFacts.keys()].map(p => p.replace(/\\/g, "/"));
    expect(paths.some(p => p.includes("main.ts")), "Should have main.ts").toBe(true);
    expect(paths.some(p => p.includes("my-app.ts")), "Should have my-app.ts").toBe(true);
    expect(paths.some(p => p.includes("nav-bar.ts")), "Should have nav-bar.ts").toBe(true);
  });

  it("extracts decorators correctly", () => {
    // Find nav-bar.ts facts
    const navBarFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("nav-bar.ts")
    );
    expect(navBarFacts, "Should find nav-bar.ts").toBeTruthy();

    const navBarClass = navBarFacts!.classes.find(c => c.name === "NavBar");
    expect(navBarClass, "Should find NavBar class").toBeTruthy();
    expect(navBarClass!.decorators.length).toBeGreaterThan(0);
    expect(navBarClass!.decorators.some(d => d.name === "customElement"), "Should have @customElement").toBe(true);
  });

  it("extracts static $au correctly", () => {
    // Find fancy-button.ts facts
    const fancyButtonFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("fancy-button.ts")
    );
    expect(fancyButtonFacts, "Should find fancy-button.ts").toBeTruthy();

    const fancyButtonClass = fancyButtonFacts!.classes.find(c => c.name === "FancyButton");
    expect(fancyButtonClass, "Should find FancyButton class").toBeTruthy();
    expect(fancyButtonClass!.staticAu, "FancyButton should have static $au").toBeTruthy();
    expect(fancyButtonClass!.staticAu!.type).toBe("custom-element");
    expect(fancyButtonClass!.staticAu!.name).toBe("fancy-button");
    expect(fancyButtonClass!.staticAu!.bindables).toBeTruthy();
    expect(fancyButtonClass!.staticAu!.bindables!.length).toBe(3);
  });

  it("extracts static dependencies correctly", () => {
    // Find product-card.ts facts
    const productCardFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("product-card.ts")
    );
    expect(productCardFacts, "Should find product-card.ts").toBeTruthy();

    const productCardClass = productCardFacts!.classes.find(c => c.name === "ProductCard");
    expect(productCardClass, "Should find ProductCard class").toBeTruthy();
    expect(productCardClass!.staticDependencies, "ProductCard should have static dependencies").toBeTruthy();

    const refs = productCardClass!.staticDependencies!.references;
    expect(refs.length).toBe(2);

    // Check dependency names
    const depNames = refs
      .filter(r => r.kind === "identifier")
      .map(r => (r as { kind: "identifier"; name: string }).name)
      .sort();
    expect(depNames).toEqual(["PriceTag", "StockBadge"]);

    // Check that references have spans (provenance)
    for (const ref of refs) {
      expect(ref.span, "DependencyRef should have span").toBeTruthy();
      expect(typeof ref.span.start).toBe("number");
      expect(typeof ref.span.end).toBe("number");
    }
  });

  it("extracts @bindable members correctly", () => {
    // Find user-card.ts facts
    const userCardFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("user-card.ts")
    );
    expect(userCardFacts, "Should find user-card.ts").toBeTruthy();

    const userCardClass = userCardFacts!.classes.find(c => c.name === "UserCard");
    expect(userCardClass, "Should find UserCard class").toBeTruthy();
    expect(userCardClass!.bindableMembers.length).toBeGreaterThan(0);

    const bindableNames = userCardClass!.bindableMembers.map(b => b.name).sort();
    expect(bindableNames).toEqual(["avatar", "name", "selected"]);
  });

  it("extracts registration calls correctly", () => {
    // Find main.ts facts
    const mainFacts = [...appFacts.values()].find(f =>
      f.path.replace(/\\/g, "/").includes("main.ts")
    );
    expect(mainFacts, "Should find main.ts").toBeTruthy();

    expect(mainFacts!.registrationCalls.length).toBeGreaterThan(0);

    const aureliaCall = mainFacts!.registrationCalls.find(c => c.receiver === "Aurelia");
    expect(aureliaCall, "Should find Aurelia.register() call").toBeTruthy();
    expect(aureliaCall!.arguments.length).toBe(5); // 5 spread arguments
  });
});
