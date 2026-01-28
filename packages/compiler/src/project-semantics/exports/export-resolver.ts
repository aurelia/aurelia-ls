/**
 * Export Binding Resolution
 *
 * Builds a complete map of export bindings for all files.
 * This resolves re-exports to their final definitions, handling:
 * - Named exports: `export { Foo }` or `export class Foo {}`
 * - Default exports: `export default class Foo {}`
 * - Re-export named: `export { Foo } from "./bar"`
 * - Re-export with alias: `export { Foo as Bar } from "./bar"`
 * - Re-export all: `export * from "./bar"`
 *
 * The result is a map that answers: "If I import X from file Y, where is X defined?"
 */

import type { NormalizedPath } from '../compiler.js';
import { debug } from '../compiler.js';
import type { FileFacts } from "../extract/file-facts.js";
import type { ExportBindingMap, FileExportBindings, ResolvedExport } from "./types.js";

/**
 * Build the complete export binding map for all files.
 *
 * @param facts - Extracted facts for all source files
 * @returns Map from file path to export bindings
 */
export function buildExportBindingMap(
  facts: ReadonlyMap<NormalizedPath, FileFacts>,
): ExportBindingMap {
  const result = new Map<NormalizedPath, Map<string, ResolvedExport>>();

  debug.project("binding.build.start", { fileCount: facts.size });

  // Build bindings for each file
  for (const [filePath] of facts) {
    const bindings = buildFileExportBindings(filePath, facts, new Set());
    result.set(filePath, bindings);
  }

  debug.project("binding.build.done", {
    fileCount: result.size,
    totalBindings: [...result.values()].reduce((sum, m) => sum + m.size, 0),
  });

  return result;
}

/**
 * Build export bindings for a single file.
 * Recursively resolves re-exports to their final definitions.
 */
function buildFileExportBindings(
  filePath: NormalizedPath,
  facts: ReadonlyMap<NormalizedPath, FileFacts>,
  visited: Set<NormalizedPath>,
): Map<string, ResolvedExport> {
  // Cycle detection
  if (visited.has(filePath)) {
    return new Map();
  }
  visited.add(filePath);

  const fileFacts = facts.get(filePath);
  if (!fileFacts) {
    return new Map();
  }

  const bindings = new Map<string, ResolvedExport>();

  // Helper to check if a name is exported
  const isNameExported = (name: string) =>
    fileFacts.exports.some(exp => {
      if (exp.kind === "named" && exp.names.includes(name)) return true;
      if (exp.kind === "default" && exp.name === name) return true;
      return false;
    });

  // 1. Add locally defined classes as exports
  for (const cls of fileFacts.classes) {
    if (isNameExported(cls.className)) {
      bindings.set(cls.className, {
        definitionPath: filePath,
        definitionName: cls.className,
      });
    }
  }

  // 2. Add locally defined variables as exports (e.g., `export const Foo = ...`)
  for (const variable of fileFacts.variables) {
    if (isNameExported(variable.name)) {
      bindings.set(variable.name, {
        definitionPath: filePath,
        definitionName: variable.name,
      });
    }
  }

  // 3. Add locally defined functions as exports (e.g., `export function Foo() {}`)
  for (const func of fileFacts.functions) {
    if (isNameExported(func.name)) {
      bindings.set(func.name, {
        definitionPath: filePath,
        definitionName: func.name,
      });
    }
  }

  // Helper to check if a name is locally defined (class, variable, or function)
  const isLocallyDefined = (name: string): boolean =>
    fileFacts.classes.some(c => c.className === name) ||
    fileFacts.variables.some(v => v.name === name) ||
    fileFacts.functions.some(f => f.name === name);

  // 4. Process explicit exports
  for (const exp of fileFacts.exports) {
    if (exp.kind === "named") {
      // Local named exports: export { Foo, Bar }
      for (const name of exp.names) {
        // Check if it's a locally defined class, variable, or function
        if (isLocallyDefined(name)) {
          bindings.set(name, {
            definitionPath: filePath,
            definitionName: name,
          });
        } else {
          // It might be an imported value being re-exported
          // Look up in imports
          for (const imp of fileFacts.imports) {
            if (imp.kind === "named" && imp.resolvedPath) {
              const found = imp.bindings.find(b => (b.alias ?? b.name) === name);
              if (found) {
                // Resolve through the import's source file
                const resolved = resolveExportName(
                  imp.resolvedPath,
                  found.name,
                  facts,
                  new Set(visited),
                );
                if (resolved) {
                  bindings.set(name, resolved);
                }
                break;
              }
            }
          }
        }
      }
    } else if (exp.kind === "default") {
      // Default export
      if (exp.name) {
        bindings.set("default", {
          definitionPath: filePath,
          definitionName: exp.name,
        });
        // Also export by the class name for default class exports
        bindings.set(exp.name, {
          definitionPath: filePath,
          definitionName: exp.name,
        });
      }
    } else if (exp.kind === "reexport-named" && exp.resolvedPath) {
      // Re-export specific names: export { Foo, Bar as Baz } from "./other"
      for (const exported of exp.bindings) {
        const exportedAs = exported.alias ?? exported.name;
        const resolved = resolveExportName(
          exp.resolvedPath,
          exported.name,
          facts,
          new Set(visited),
        );
        if (resolved) {
          bindings.set(exportedAs, resolved);
        }
      }
    } else if (exp.kind === "reexport-all" && exp.resolvedPath) {
      // Re-export all: export * from "./other"
      const sourceBindings = buildFileExportBindings(
        exp.resolvedPath,
        facts,
        new Set(visited),
      );
      for (const [name, binding] of sourceBindings) {
        // Don't override existing bindings (first one wins)
        if (!bindings.has(name)) {
          bindings.set(name, binding);
        }
      }
    }
  }

  return bindings;
}

/**
 * Resolve an export name to its final definition.
 * Follows re-export chains recursively.
 */
function resolveExportName(
  filePath: NormalizedPath,
  name: string,
  facts: ReadonlyMap<NormalizedPath, FileFacts>,
  visited: Set<NormalizedPath>,
): ResolvedExport | null {
  if (visited.has(filePath)) {
    return null; // Cycle
  }
  visited.add(filePath);

  const fileFacts = facts.get(filePath);
  if (!fileFacts) {
    return null;
  }

  // Check if it's a locally defined class, variable, or function
  const isLocallyDefined =
    fileFacts.classes.some(c => c.className === name) ||
    fileFacts.variables.some(v => v.name === name) ||
    fileFacts.functions.some(f => f.name === name);

  if (isLocallyDefined) {
    return {
      definitionPath: filePath,
      definitionName: name,
    };
  }

  // Check exports for re-exports
  for (const exp of fileFacts.exports) {
    if (exp.kind === "reexport-named" && exp.resolvedPath) {
      for (const exported of exp.bindings) {
        const exportedAs = exported.alias ?? exported.name;
        if (exportedAs === name) {
          // Follow to the source file with the original name
          return resolveExportName(exp.resolvedPath, exported.name, facts, visited);
        }
      }
    } else if (exp.kind === "reexport-all" && exp.resolvedPath) {
      // Check if the name is exported from the source
      const resolved = resolveExportName(exp.resolvedPath, name, facts, visited);
      if (resolved) {
        return resolved;
      }
    }
  }

  // Check if it's imported and re-exported via named export
  for (const exp of fileFacts.exports) {
    if (exp.kind === "named" && exp.names.includes(name)) {
      // Find the import
      for (const imp of fileFacts.imports) {
        if (imp.kind === "named" && imp.resolvedPath) {
          const found = imp.bindings.find(b => (b.alias ?? b.name) === name);
          if (found) {
            return resolveExportName(imp.resolvedPath, found.name, facts, visited);
          }
        }
      }
    }
  }

  return null;
}

/**
 * Look up an export binding from the pre-built map.
 *
 * @param map - The export binding map
 * @param filePath - The file to look up in
 * @param exportName - The name being exported/imported
 * @returns The resolved binding or null if not found
 */
export function lookupExportBinding(
  map: ExportBindingMap,
  filePath: NormalizedPath,
  exportName: string,
): ResolvedExport | null {
  const fileBindings = map.get(filePath);
  if (!fileBindings) {
    return null;
  }
  return fileBindings.get(exportName) ?? null;
}

