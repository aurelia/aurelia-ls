/**
 * Template Import Extraction
 *
 * Extracts <import> and <require> elements from template HTML files.
 * Uses the compiler's extractTemplateMeta function to parse the template.
 *
 * These imports create local scope registrations (equivalent to static dependencies).
 */

import {
  extractTemplateMeta,
  toSourceFileId,
  type NormalizedPath,
  type ImportMetaIR,
  type SourceSpan,
} from "@aurelia-ls/compiler";
import type { FileSystemContext } from "../project/context.js";
import type { TemplateImport } from "./file-facts.js";

/**
 * Extract template imports from a template file.
 *
 * @param templatePath - Path to the template file
 * @param fileSystem - File system context for reading the file
 * @returns Array of template import facts, or empty array if template can't be read
 */
export function extractTemplateImports(
  templatePath: NormalizedPath,
  fileSystem: FileSystemContext,
): TemplateImport[] {
  // Read the template file
  const content = fileSystem.readFile(templatePath);
  if (content === undefined) {
    return [];
  }

  // Extract meta elements using compiler's function
  const meta = extractTemplateMeta(content, templatePath);

  // Convert ImportMetaIR to TemplateImport
  return meta.imports.map((imp) => convertImportMeta(imp, templatePath));
}

/**
 * Convert ImportMetaIR from the compiler to TemplateImport.
 *
 * Preserves source spans as SourceSpan (with file) rather than downgrading to TextSpan.
 */
function convertImportMeta(imp: ImportMetaIR, templatePath: NormalizedPath): TemplateImport {
  const namedAliases: readonly { exportName: string; alias: string }[] = imp.namedAliases.map((na) => ({
    exportName: na.exportName.value,
    alias: na.alias.value,
  }));

  const file = toSourceFileId(templatePath);

  return {
    moduleSpecifier: imp.from.value,
    resolvedPath: null, // Will be resolved by import resolution phase
    defaultAlias: imp.defaultAlias?.value ?? null,
    namedAliases,
    span: {
      file,
      start: imp.elementLoc.start,
      end: imp.elementLoc.end,
    },
    moduleSpecifierSpan: {
      file,
      start: imp.from.loc.start,
      end: imp.from.loc.end,
    },
  };
}

/**
 * Resolve module specifiers in template imports to file paths.
 *
 * Uses TypeScript's module resolution to resolve relative and package imports.
 *
 * @param imports - Template import facts to resolve
 * @param templatePath - Path to the template file (base for relative imports)
 * @param resolveModule - Function to resolve module specifier to file path
 * @returns Template import facts with resolvedPath populated
 */
export function resolveTemplateImportPaths(
  imports: readonly TemplateImport[],
  templatePath: NormalizedPath,
  resolveModule: (specifier: string, fromFile: NormalizedPath) => NormalizedPath | null,
): TemplateImport[] {
  return imports.map((imp) => {
    const resolvedPath = resolveModule(imp.moduleSpecifier, templatePath);
    return {
      ...imp,
      resolvedPath,
    };
  });
}

/**
 * Get all template imports from a component's sibling template.
 *
 * Convenience function that combines extraction with sibling detection.
 *
 * @param componentPath - Path to the component source file
 * @param siblingTemplatePath - Path to the sibling template file (if known)
 * @param fileSystem - File system context
 * @returns Template import facts, or empty array if no template
 */
export function extractComponentTemplateImports(
  componentPath: NormalizedPath,
  siblingTemplatePath: NormalizedPath | undefined,
  fileSystem: FileSystemContext,
): TemplateImport[] {
  if (!siblingTemplatePath) {
    return [];
  }

  return extractTemplateImports(siblingTemplatePath, fileSystem);
}

