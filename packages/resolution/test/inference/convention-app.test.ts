import { describe, it, expect, beforeAll } from "vitest";
import { extractAllFacts, createResolverPipeline } from "@aurelia-ls/resolution";
import {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "../_helpers/index.js";

const CONVENTION_APP = getTestAppPath("convention-app", import.meta.url);

describe("Inference: convention-app (template-pairing)", () => {
  let result: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;

  beforeAll(() => {
    const program = createProgramFromApp(CONVENTION_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterFactsByPathPattern(allFacts, "/convention-app/src/");
    const pipeline = createResolverPipeline();
    result = pipeline.resolve(appFacts as any);
  });

  it("returns confidence and gaps for convention-based resolution", () => {
    // Verify result has confidence and gaps properties (Q10 test hardening)
    expect(result.confidence).toBeDefined();
    expect(result.gaps).toBeDefined();
    // Convention-based resources with explicit @bindable achieve partial/high confidence
    expect(["partial", "high"]).toContain(result.confidence);
    expect(result.gaps).toHaveLength(0);
  });

  it("resolves convention-based custom elements via template-pairing", () => {
    // These elements have NO @customElement decorator
    // They are detected via: import template from './foo.html' + matching class name

    const elements = result.value.filter(c => c.kind === "element");
    const elementNames = elements.map(e => e.name).sort();

    // Should find all 3 convention-based elements
    expect(elementNames, "Should find exactly these 3 elements").toEqual([
      "cortex-devices",
      "my-app",
      "user-profile",
    ]);
  });

  it("resolves cortex-devices via template-pairing", () => {
    const cortex = result.value.find(c => c.name === "cortex-devices" && c.kind === "element");

    expect(cortex, "Should find cortex-devices element").toBeTruthy();
    expect(cortex!.className).toBe("CortexDevices");
    expect(cortex!.resolver).toBe("convention");
    expect(cortex!.confidence).toBe("inferred");
  });

  it("resolves my-app via template-pairing", () => {
    const myApp = result.value.find(c => c.name === "my-app" && c.kind === "element");

    expect(myApp, "Should find my-app element").toBeTruthy();
    expect(myApp!.className).toBe("MyApp");
    expect(myApp!.resolver).toBe("convention");
    expect(myApp!.confidence).toBe("inferred");
  });

  it("resolves user-profile with bindables via template-pairing", () => {
    const userProfile = result.value.find(c => c.name === "user-profile" && c.kind === "element");

    expect(userProfile, "Should find user-profile element").toBeTruthy();
    expect(userProfile!.className).toBe("UserProfile");
    expect(userProfile!.resolver).toBe("convention");
    expect(userProfile!.confidence).toBe("inferred");

    // Should also capture @bindable members
    const bindableNames = userProfile!.bindables.map(b => b.name).sort();
    expect(bindableNames, "Should have all three bindables").toEqual(["age", "bio", "name"]);
  });

  it("resolves suffix-based value converter", () => {
    // DateFormatValueConverter is detected via class name suffix, not template-pairing
    const dateFormat = result.value.find(c => c.name === "dateFormat" && c.kind === "valueConverter");

    expect(dateFormat, "Should find dateFormat value converter").toBeTruthy();
    expect(dateFormat!.className).toBe("DateFormatValueConverter");
    expect(dateFormat!.resolver).toBe("convention");
    expect(dateFormat!.confidence).toBe("inferred");
  });

  it("does not produce duplicates", () => {
    // Each resource should appear exactly once
    const names = result.value.map(c => `${c.kind}:${c.name}`);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });
});

describe("Inference: template-pairing edge cases", () => {
  it("handles kebab-case to PascalCase matching", () => {
    // cortex-devices.ts contains CortexDevices class
    // The convention resolver should match despite case difference
    const program = createProgramFromApp(CONVENTION_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterFactsByPathPattern(allFacts, "/convention-app/src/");
    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts as any);

    const cortex = result.value.find(c => c.name === "cortex-devices");
    expect(cortex, "kebab-case file should match PascalCase class").toBeTruthy();
  });
});
