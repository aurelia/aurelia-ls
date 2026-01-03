import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractAllFacts,
  createResolverPipeline,
  createNodeFileSystem,
  resolve,
} from "@aurelia-ls/resolution";
import type { ResourceCandidate, ResolutionResult } from "@aurelia-ls/resolution";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIBLING_APP = path.resolve(__dirname, "../apps/sibling-app");

/**
 * Create a TypeScript program from the sibling-app tsconfig.
 */
function createProgramFromApp(appPath: string): ts.Program {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`
    );
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, appPath);

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map((e) =>
      ts.flattenDiagnosticMessageText(e.messageText, "\n")
    );
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Filter candidates to only include those from the app (not node_modules).
 */
function filterAppCandidates(
  candidates: readonly ResourceCandidate[]
): ResourceCandidate[] {
  return candidates.filter((c) =>
    c.source.replace(/\\/g, "/").includes("/sibling-app/src/")
  );
}

/**
 * Filter facts to only include files from the app (not node_modules).
 */
function filterAppFacts(
  facts: Map<string, unknown>,
  appPath: string
): Map<string, unknown> {
  const filtered = new Map();

  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes("/sibling-app/src/")) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}

// =============================================================================
// Integration Tests: Sibling-File Convention
// =============================================================================

describe("Inference: sibling-app (sibling-file convention)", () => {
  let program: ts.Program;
  let result: ReturnType<ReturnType<typeof createResolverPipeline>["resolve"]>;

  beforeAll(() => {
    program = createProgramFromApp(SIBLING_APP);

    // Create FileSystemContext for sibling detection
    const fileSystem = createNodeFileSystem({ root: SIBLING_APP });

    // Extract facts WITH FileSystemContext (enables sibling detection)
    const allFacts = extractAllFacts(program, {
      fileSystem,
      templateExtensions: [".html"],
      styleExtensions: [".css", ".scss"],
    });

    // Filter to app-only facts
    const appFacts = filterAppFacts(allFacts, SIBLING_APP);

    // Run inference pipeline
    const pipeline = createResolverPipeline();
    result = pipeline.resolve(appFacts as any);
  });

  it("detects sibling files during extraction", () => {
    const fileSystem = createNodeFileSystem({ root: SIBLING_APP });
    const allFacts = extractAllFacts(program, { fileSystem });
    const appFacts = filterAppFacts(allFacts, SIBLING_APP);

    // Find my-app facts
    const myAppEntry = Array.from(appFacts.entries()).find(([p]) =>
      p.includes("my-app.ts")
    );
    expect(myAppEntry, "my-app.ts should be extracted").toBeTruthy();

    const [, myAppFacts] = myAppEntry as [string, { siblingFiles: unknown[] }];
    expect(myAppFacts.siblingFiles, "Should have sibling files").toBeDefined();
    expect(myAppFacts.siblingFiles.length, "Should detect sibling HTML").toBeGreaterThan(0);
  });

  it("resolves my-app via sibling-file convention", () => {
    const candidates = filterAppCandidates(result.candidates);
    const myApp = candidates.find(
      (c) => c.name === "my-app" && c.kind === "element"
    );

    expect(myApp, "Should find my-app element").toBeTruthy();
    expect(myApp!.className).toBe("MyApp");
    expect(myApp!.resolver).toBe("convention");
    expect(myApp!.confidence).toBe("inferred");
  });

  it("resolves nav-bar via sibling-file convention", () => {
    const candidates = filterAppCandidates(result.candidates);
    const navBar = candidates.find(
      (c) => c.name === "nav-bar" && c.kind === "element"
    );

    expect(navBar, "Should find nav-bar element").toBeTruthy();
    expect(navBar!.className).toBe("NavBar");
    expect(navBar!.resolver).toBe("convention");
  });

  it("resolves user-card with bindables via sibling-file convention", () => {
    const candidates = filterAppCandidates(result.candidates);
    const userCard = candidates.find(
      (c) => c.name === "user-card" && c.kind === "element"
    );

    expect(userCard, "Should find user-card element").toBeTruthy();
    expect(userCard!.className).toBe("UserCard");
    expect(userCard!.resolver).toBe("convention");

    // Should capture @bindable members
    const bindableNames = userCard!.bindables.map((b) => b.name).sort();
    expect(bindableNames).toEqual(["age", "name", "selected"]);
  });

  it("resolves inline-only via decorator (not sibling convention)", () => {
    const candidates = filterAppCandidates(result.candidates);
    const inlineOnly = candidates.find(
      (c) => c.name === "inline-only" && c.kind === "element"
    );

    expect(inlineOnly, "Should find inline-only element").toBeTruthy();
    // Should be resolved by decorator resolver, not convention
    expect(inlineOnly!.resolver).toBe("decorator");
    expect(inlineOnly!.confidence).toBe("explicit");
  });

  it("finds exactly 4 element resources from sibling-app", () => {
    const candidates = filterAppCandidates(result.candidates);
    const elements = candidates.filter((c) => c.kind === "element");
    const elementNames = elements.map((e) => e.name).sort();

    expect(elementNames).toEqual([
      "inline-only", // Explicit decorator
      "my-app", // Sibling convention
      "nav-bar", // Sibling convention
      "user-card", // Sibling convention
    ]);
  });

  it("does not produce duplicates", () => {
    const candidates = filterAppCandidates(result.candidates);
    const names = candidates.map((c) => `${c.kind}:${c.name}`);
    const uniqueNames = [...new Set(names)];

    expect(names.length).toBe(uniqueNames.length);
  });
});

// =============================================================================
// Full Resolution Pipeline with FileSystemContext
// =============================================================================

describe("Resolution: full pipeline with FileSystemContext", () => {
  let resolutionResult: ResolutionResult;

  beforeAll(() => {
    const program = createProgramFromApp(SIBLING_APP);
    const fileSystem = createNodeFileSystem({ root: SIBLING_APP });

    resolutionResult = resolve(program, {
      fileSystem,
      templateExtensions: [".html"],
      styleExtensions: [".css"],
    });
  });

  it("builds resource graph with sibling-detected elements", () => {
    expect(resolutionResult.resourceGraph).toBeDefined();
    expect(resolutionResult.resourceGraph.root).toBeDefined();
  });

  it("discovers external templates for sibling-convention elements", () => {
    // Filter to app-only templates
    const appTemplates = resolutionResult.templates.filter((t) =>
      t.templatePath.replace(/\\/g, "/").includes("/sibling-app/src/")
    );

    const templatePaths = appTemplates
      .map((t) => path.basename(t.templatePath))
      .sort();

    // Should find templates for sibling-convention elements
    expect(templatePaths).toContain("my-app.html");
    expect(templatePaths).toContain("nav-bar.html");
    expect(templatePaths).toContain("user-card.html");
  });

  it("identifies inline templates separately", () => {
    // Filter to app-only inline templates
    const appInline = resolutionResult.inlineTemplates.filter((t) =>
      t.componentPath.replace(/\\/g, "/").includes("/sibling-app/src/")
    );

    // inline-only has an inline template
    const inlineOnly = appInline.find((t) => t.className === "InlineOnly");
    expect(inlineOnly, "Should find InlineOnly inline template").toBeTruthy();
    expect(inlineOnly!.content).toBe("<div>Inline template</div>");
  });

  it("populates registration intents correctly", () => {
    // Filter to app-only intents
    const appIntents = resolutionResult.intents.filter((i) =>
      i.resource.source.replace(/\\/g, "/").includes("/sibling-app/src/")
    );

    expect(appIntents.length).toBeGreaterThan(0);

    // All should have valid resource definitions
    for (const intent of appIntents) {
      expect(intent.resource.name).toBeTruthy();
      expect(intent.resource.className).toBeTruthy();
      expect(intent.resource.source).toBeTruthy();
    }
  });
});

// =============================================================================
// Comparison: With vs Without FileSystemContext
// =============================================================================

describe("Resolution: FileSystemContext impact", () => {
  it("detects fewer elements without FileSystemContext", () => {
    const program = createProgramFromApp(SIBLING_APP);

    // WITHOUT FileSystemContext - only template-import convention works
    const withoutFs = extractAllFacts(program);
    const withoutFsAppFacts = filterAppFacts(withoutFs, SIBLING_APP);
    const pipelineNoFs = createResolverPipeline();
    const resultNoFs = pipelineNoFs.resolve(withoutFsAppFacts as any);
    const candidatesNoFs = filterAppCandidates(resultNoFs.candidates);

    // WITH FileSystemContext - sibling-file convention also works
    const fileSystem = createNodeFileSystem({ root: SIBLING_APP });
    const withFs = extractAllFacts(program, { fileSystem });
    const withFsAppFacts = filterAppFacts(withFs, SIBLING_APP);
    const pipelineWithFs = createResolverPipeline();
    const resultWithFs = pipelineWithFs.resolve(withFsAppFacts as any);
    const candidatesWithFs = filterAppCandidates(resultWithFs.candidates);

    // Without FS: only inline-only (explicit decorator) should be detected
    // With FS: my-app, nav-bar, user-card (sibling) + inline-only (decorator)
    expect(candidatesNoFs.length).toBeLessThan(candidatesWithFs.length);

    // Specifically, without FS we should still detect decorator-based element
    const explicitNoFs = candidatesNoFs.filter((c) => c.resolver === "decorator");
    expect(explicitNoFs.length).toBeGreaterThan(0);

    // With FS, we should detect convention-based elements
    const conventionWithFs = candidatesWithFs.filter((c) => c.resolver === "convention");
    expect(conventionWithFs.length).toBeGreaterThan(0);
  });

  it("sibling facts are empty without FileSystemContext", () => {
    const program = createProgramFromApp(SIBLING_APP);
    const facts = extractAllFacts(program);
    const appFacts = filterAppFacts(facts, SIBLING_APP);

    // All app files should have empty siblingFiles without FileSystemContext
    for (const [, fileFacts] of appFacts as Map<string, { siblingFiles: unknown[] }>) {
      expect(fileFacts.siblingFiles).toEqual([]);
    }
  });

  it("sibling facts are populated with FileSystemContext", () => {
    const program = createProgramFromApp(SIBLING_APP);
    const fileSystem = createNodeFileSystem({ root: SIBLING_APP });
    const facts = extractAllFacts(program, { fileSystem });
    const appFacts = filterAppFacts(facts, SIBLING_APP);

    // Files that have sibling HTML should have populated siblingFiles
    const myAppFacts = Array.from(appFacts.entries()).find(([p]) =>
      p.includes("my-app.ts")
    );
    expect(myAppFacts).toBeTruthy();

    const [, factData] = myAppFacts as [string, { siblingFiles: Array<{ extension: string }> }];
    const htmlSibling = factData.siblingFiles.find((s) => s.extension === ".html");
    expect(htmlSibling, "my-app.ts should have HTML sibling").toBeTruthy();
  });
});
