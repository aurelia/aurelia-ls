import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { ImportGraph } from "./types.js";
import { canonicalPath } from "../util/naming.js";

/**
 * Build an import graph from a TypeScript program.
 * Uses TypeScript's module resolution to map import specifiers to file paths.
 */
export function buildImportGraph(program: ts.Program): ImportGraph {
  const importers = new Map<NormalizedPath, Set<NormalizedPath>>();
  const imports = new Map<NormalizedPath, Set<NormalizedPath>>();
  const allFiles = new Set<NormalizedPath>();

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile) continue;

    const file = canonicalPath(sf.fileName);
    allFiles.add(file);

    for (const stmt of sf.statements) {
      // Handle import declarations
      if (ts.isImportDeclaration(stmt)) {
        const specifier = stmt.moduleSpecifier;
        if (!ts.isStringLiteral(specifier)) continue;

        const resolved = resolveModulePath(specifier.text, sf.fileName, program);
        if (!resolved) continue;

        addEdge(imports, file, resolved);
        addEdge(importers, resolved, file);
        allFiles.add(resolved);
      }

      // Handle export declarations with 'from' clause
      if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
        const specifier = stmt.moduleSpecifier;
        if (!ts.isStringLiteral(specifier)) continue;

        const resolved = resolveModulePath(specifier.text, sf.fileName, program);
        if (!resolved) continue;

        addEdge(imports, file, resolved);
        addEdge(importers, resolved, file);
        allFiles.add(resolved);
      }
    }
  }

  return {
    getImporters: (file) => Array.from(importers.get(file) ?? []),
    getImports: (file) => Array.from(imports.get(file) ?? []),
    getAllFiles: () => Array.from(allFiles),
  };
}

function addEdge(
  map: Map<NormalizedPath, Set<NormalizedPath>>,
  from: NormalizedPath,
  to: NormalizedPath,
): void {
  let set = map.get(from);
  if (!set) {
    set = new Set();
    map.set(from, set);
  }
  set.add(to);
}

function resolveModulePath(
  specifier: string,
  containingFile: string,
  program: ts.Program,
): NormalizedPath | null {
  // Use TypeScript's module resolution
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    ts.sys,
  );

  if (result.resolvedModule?.resolvedFileName) {
    return canonicalPath(result.resolvedModule.resolvedFileName);
  }

  return null;
}
