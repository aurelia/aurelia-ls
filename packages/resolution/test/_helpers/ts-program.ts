/**
 * TypeScript Program Helpers
 *
 * Shared utilities for creating ts.Program instances in tests.
 * Extracted from repeated boilerplate across test files.
 */

import * as ts from "typescript";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Create a TypeScript program from a project directory with tsconfig.json.
 *
 * This is the standard way to load a test fixture app. The tsconfig.json
 * in the app directory determines which files are included.
 */
export function createProgramFromApp(appPath: string): ts.Program {
  const configPath = path.join(appPath, "tsconfig.json");
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Failed to read tsconfig at ${configPath}: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    appPath,
  );

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map(e =>
      ts.flattenDiagnosticMessageText(e.messageText, "\n")
    );
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Get the absolute path to a test app fixture.
 *
 * @param appName - Name of the app directory (e.g., "explicit-app", "sibling-app")
 * @param importMetaUrl - Pass `import.meta.url` from the calling test file
 * @returns Absolute path to the app directory
 *
 * @example
 * const EXPLICIT_APP = getTestAppPath("explicit-app", import.meta.url);
 */
export function getTestAppPath(appName: string, importMetaUrl: string): string {
  const callerDir = path.dirname(fileURLToPath(importMetaUrl));
  // Navigate from any test subdirectory to apps/
  // Test files are in: test/{category}/*.test.ts
  // Apps are in: test/apps/{appName}

  // Find the test root by looking for "test" in the path
  let testRoot = callerDir;
  while (!testRoot.endsWith("test") && path.dirname(testRoot) !== testRoot) {
    testRoot = path.dirname(testRoot);
  }

  return path.resolve(testRoot, "apps", appName);
}

/**
 * Filter facts map to only include files matching a path pattern.
 *
 * @param facts - Map of file path to facts
 * @param pattern - Substring to match in normalized file paths (forward slashes)
 * @returns Filtered map containing only matching entries
 *
 * @example
 * // Keep only files from explicit-app/src/
 * const appFacts = filterFactsByPathPattern(facts, "/explicit-app/src/");
 */
export function filterFactsByPathPattern<T>(
  facts: Map<string, T>,
  pattern: string
): Map<string, T> {
  const filtered = new Map<string, T>();
  for (const [filePath, fileFacts] of facts) {
    const normalized = filePath.replace(/\\/g, "/");
    if (normalized.includes(pattern)) {
      filtered.set(filePath, fileFacts);
    }
  }
  return filtered;
}
