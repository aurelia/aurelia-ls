import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractAllFacts, createResolverPipeline } from "@aurelia-ls/resolution";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONVENTION_APP = path.resolve(__dirname, "../apps/convention-app");

/**
 * Create a TypeScript program from the convention-app tsconfig.
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
 * Filter facts to only include files from the app (not node_modules).
 */
function filterAppFacts(
  facts: Map<string, unknown>,
  appPath: string
): Map<string, unknown> {
  const filtered = new Map();
  const normalizedAppPath = appPath.replace(/\\/g, "/");

  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/convention-app/src/")) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}

describe("Inference: convention-app (template-pairing)", () => {
  let result: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;

  beforeAll(() => {
    const program = createProgramFromApp(CONVENTION_APP);
    const allFacts = extractAllFacts(program);
    const appFacts = filterAppFacts(allFacts, CONVENTION_APP);
    const pipeline = createResolverPipeline();
    result = pipeline.resolve(appFacts as any);
  });

  it("resolves convention-based custom elements via template-pairing", () => {
    // These elements have NO @customElement decorator
    // They are detected via: import template from './foo.html' + matching class name

    const elements = result.candidates.filter(c => c.kind === "element");
    const elementNames = elements.map(e => e.name).sort();

    // Should find all 3 convention-based elements
    expect(elementNames, "Should find exactly these 3 elements").toEqual([
      "cortex-devices",
      "my-app",
      "user-profile",
    ]);
  });

  it("resolves cortex-devices via template-pairing", () => {
    const cortex = result.candidates.find(c => c.name === "cortex-devices" && c.kind === "element");

    expect(cortex, "Should find cortex-devices element").toBeTruthy();
    expect(cortex!.className).toBe("CortexDevices");
    expect(cortex!.resolver).toBe("convention");
    expect(cortex!.confidence).toBe("inferred");
  });

  it("resolves my-app via template-pairing", () => {
    const myApp = result.candidates.find(c => c.name === "my-app" && c.kind === "element");

    expect(myApp, "Should find my-app element").toBeTruthy();
    expect(myApp!.className).toBe("MyApp");
    expect(myApp!.resolver).toBe("convention");
    expect(myApp!.confidence).toBe("inferred");
  });

  it("resolves user-profile with bindables via template-pairing", () => {
    const userProfile = result.candidates.find(c => c.name === "user-profile" && c.kind === "element");

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
    const dateFormat = result.candidates.find(c => c.name === "dateFormat" && c.kind === "valueConverter");

    expect(dateFormat, "Should find dateFormat value converter").toBeTruthy();
    expect(dateFormat!.className).toBe("DateFormatValueConverter");
    expect(dateFormat!.resolver).toBe("convention");
    expect(dateFormat!.confidence).toBe("inferred");
  });

  it("does not produce duplicates", () => {
    // Each resource should appear exactly once
    const names = result.candidates.map(c => `${c.kind}:${c.name}`);
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
    const appFacts = filterAppFacts(allFacts, CONVENTION_APP);
    const pipeline = createResolverPipeline();
    const result = pipeline.resolve(appFacts as any);

    const cortex = result.candidates.find(c => c.name === "cortex-devices");
    expect(cortex, "kebab-case file should match PascalCase class").toBeTruthy();
  });
});
