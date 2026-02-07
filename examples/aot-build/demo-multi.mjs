#!/usr/bin/env node
/**
 * Multi-File AOT Build Demo
 *
 * Demonstrates the full AOT pipeline with resource resolution:
 * 1. Create a TypeScript program from src/
 * 2. Run resolution to discover all resources
 * 3. Compile each component with the linked ResourceGraph
 * 4. Emit a bundled output
 *
 * Usage:
 *   node demo-multi.mjs           # Show transformation
 *   node demo-multi.mjs --emit    # Write output to dist/
 */

import ts from "typescript";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");
const srcDir = resolve(__dirname, "src");
const distDir = resolve(__dirname, "dist");

// Parse args
const args = process.argv.slice(2);
const shouldEmit = args.includes("--emit") || args.includes("-e");

// Import from local packages
const ssrPath = pathToFileURL(resolve(rootDir, "packages/ssr/out/index.js")).href;
const transformPath = pathToFileURL(resolve(rootDir, "packages/transform/out/index.js")).href;
const resolutionPath = pathToFileURL(resolve(rootDir, "packages/compiler/out/index.js")).href;

const { compileWithAot } = await import(ssrPath);
const { transform } = await import(transformPath);
const { resolve: runResolution } = await import(resolutionPath);

// =============================================================================
// Step 1: Create TypeScript Program
// =============================================================================

console.log("=".repeat(80));
console.log("MULTI-FILE AOT BUILD DEMO");
console.log("=".repeat(80));
console.log();

console.log("Step 1: Create TypeScript program from src/");
console.log("-".repeat(80));

const configPath = resolve(__dirname, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  __dirname
);

const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options,
});

console.log(`  Config: tsconfig.json`);
console.log(`  Files: ${parsedConfig.fileNames.length}`);
for (const f of parsedConfig.fileNames) {
  console.log(`    - ${basename(f)}`);
}
console.log();

// =============================================================================
// Step 2: Run Resolution
// =============================================================================

console.log("Step 2: Run resource resolution");
console.log("-".repeat(80));

const logger = {
  log: () => {},
  info: (msg) => console.log(`  ${msg}`),
  warn: (msg) => console.log(`  WARN: ${msg}`),
  error: (msg) => console.log(`  ERROR: ${msg}`),
};

const resolution = runResolution(program, {}, logger);

console.log();
console.log("  Resources discovered:");
for (const candidate of resolution.candidates) {
  const kind = candidate.kind.padEnd(10);
  const name = candidate.name.padEnd(15);
  console.log(`    ${kind} ${name} (${candidate.className})`);
}

console.log();
console.log("  Templates:");
for (const t of resolution.templates) {
  console.log(`    ${basename(t.componentPath)} → ${basename(t.templatePath)}`);
}
console.log();

// =============================================================================
// Step 3: Compile Each Component
// =============================================================================

console.log("Step 3: Compile templates with linked resources");
console.log("-".repeat(80));

const compiledComponents = [];

for (const templateInfo of resolution.templates) {
  const { templatePath, componentPath, className, resourceName, scopeId } = templateInfo;

  // Read template
  const templateContent = readFileSync(templatePath, "utf-8");

  // Compile with the resource graph - this is where resolution links everything
  const compiled = compileWithAot(templateContent, {
    name: resourceName,
    resourceGraph: resolution.resourceGraph,
    resourceScope: scopeId,
  });

  // Find the candidate to get bindables
  const candidate = resolution.candidates.find(c => c.className === className);

  // Check what resources this template uses
  const usedResources = compiled.raw.codeResult.definition.instructions
    .flat()
    .filter(i => i.type === "hydrateElement" || i.type === "hydrateAttribute")
    .map(i => i.resource);

  console.log(`  ${resourceName}:`);
  console.log(`    Targets: ${compiled.raw.codeResult.definition.instructions.length}`);
  console.log(`    Expressions: ${compiled.raw.codeResult.expressions.length}`);
  if (usedResources.length > 0) {
    console.log(`    Uses: ${usedResources.join(", ")}`);
  }

  compiledComponents.push({
    className,
    resourceName,
    componentPath,
    templatePath,
    compiled,
    candidate,
  });
}
console.log();

// =============================================================================
// Step 4: Transform Sources
// =============================================================================

console.log("Step 4: Transform TypeScript sources");
console.log("-".repeat(80));

const transformedFiles = [];

for (const comp of compiledComponents) {
  const { className, resourceName, componentPath, compiled, candidate } = comp;

  // Read source
  const source = readFileSync(componentPath, "utf-8");

  // Transform using the compiled AOT result
  const result = transform({
    source,
    filePath: componentPath,
    aot: compiled.raw.codeResult,
    resource: {
      kind: "custom-element",
      name: resourceName,
      className,
      declarationForm: "decorator",
      bindables: candidate?.bindables ?? [],
    },
    template: compiled.template,
    nestedHtmlTree: compiled.raw.nestedHtmlTree,
    removeDecorators: true,
    includeComments: false,
  });

  console.log(`  ${className}: ${result.edits.length} edits`);

  transformedFiles.push({
    className,
    resourceName,
    original: source,
    transformed: result.code,
  });
}

// Also handle value converters (they don't have templates but still need transform)
for (const candidate of resolution.candidates) {
  if (candidate.kind !== "value-converter") continue;

  const componentPath = resolve(srcDir, `${candidate.name}.ts`);
  if (!existsSync(componentPath)) continue;

  const source = readFileSync(componentPath, "utf-8");

  // For value converters, we just remove the decorator
  // (In a full implementation, we'd also generate static $au)
  const transformed = source
    .replace(/@valueConverter\([^)]+\)\s*\n?/g, "")
    .replace(/import \{ valueConverter \} from ["']aurelia["'];?\n?/g, "");

  console.log(`  ${candidate.className}: decorator removed`);

  transformedFiles.push({
    className: candidate.className,
    resourceName: candidate.name,
    original: source,
    transformed,
    isValueConverter: true,
  });
}

console.log();

// =============================================================================
// Step 5: Show/Emit Output
// =============================================================================

if (shouldEmit) {
  console.log("Step 5: Emit bundle");
  console.log("-".repeat(80));

  mkdirSync(distDir, { recursive: true });

  // Build a combined bundle
  const bundleParts = [
    `/**`,
    ` * AOT-Compiled Bundle`,
    ` *`,
    ` * Components: ${transformedFiles.filter(f => !f.isValueConverter).map(f => f.resourceName).join(", ")}`,
    ` * Value Converters: ${transformedFiles.filter(f => f.isValueConverter).map(f => f.resourceName).join(", ") || "none"}`,
    ` *`,
    ` * Generated: ${new Date().toISOString()}`,
    ` */`,
    ``,
  ];

  for (const file of transformedFiles) {
    // Clean up imports for bundle
    let code = file.transformed
      .replace(/import template from ["'][^"']+["'];?\n?/g, "")
      .replace(/import \{ customElement(?:, bindable)? \} from ["']aurelia["'];?\n?/g, "")
      .replace(/import \{ [^}]+ \} from ["']\.\/[^"']+["'];?\n?/g, "");

    bundleParts.push(`// === ${file.className} ===`);
    bundleParts.push(code.trim());
    bundleParts.push("");
  }

  const bundle = bundleParts.join("\n");
  const bundlePath = resolve(distDir, "bundle.js");
  writeFileSync(bundlePath, bundle);
  console.log(`  Written: dist/bundle.js (${bundle.length} bytes)`);

  // Also write individual files
  for (const file of transformedFiles) {
    const outPath = resolve(distDir, `${file.resourceName}.js`);
    let code = file.transformed
      .replace(/import template from ["'][^"']+["'];?\n?/g, "")
      .replace(/import \{ customElement(?:, bindable)? \} from ["']aurelia["'];?\n?/g, "")
      .replace(/import \{ [^}]+ \} from ["']\.\/[^"']+["'];?\n?/g, "");
    writeFileSync(outPath, code);
    console.log(`  Written: dist/${file.resourceName}.js`);
  }

  // Write resolution data
  const resolutionData = {
    candidates: resolution.candidates.map(c => ({
      kind: c.kind,
      name: c.name,
      className: c.className,
      bindables: c.bindables,
    })),
    templates: resolution.templates.map(t => ({
      component: basename(t.componentPath),
      template: basename(t.templatePath),
    })),
  };
  writeFileSync(resolve(distDir, "resolution.json"), JSON.stringify(resolutionData, null, 2));
  console.log(`  Written: dist/resolution.json`);

  console.log();
  console.log("Files written to: examples/aot-build/dist/");
} else {
  console.log("Step 5: Show transformed output");
  console.log("-".repeat(80));

  for (const file of transformedFiles) {
    console.log();
    console.log(`=== ${file.className} ===`);
    console.log(file.transformed);
  }

  console.log();
  console.log("Run with --emit to write output files to dist/");
}

console.log();
