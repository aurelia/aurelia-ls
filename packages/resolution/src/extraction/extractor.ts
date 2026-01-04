import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import { debug } from "@aurelia-ls/compiler";
import type { SourceFacts, ClassFacts, ImportFact, ExportFact, ImportedName, ExportedName, SiblingFileFact, TemplateImportFact } from "./types.js";
import { extractClassFacts } from "./class-extractor.js";
import { extractRegistrationCalls } from "./registrations.js";
import { extractTemplateImports, resolveTemplateImportPaths } from "./template-imports.js";
import { canonicalPath } from "../util/naming.js";
import type { FileSystemContext } from "../project/context.js";

/**
 * Options for fact extraction.
 */
export interface ExtractionOptions {
  /**
   * File system context for sibling detection.
   * When provided, enables sibling file convention support.
   */
  readonly fileSystem?: FileSystemContext;

  /**
   * Template extensions to look for as siblings.
   * @default ['.html']
   */
  readonly templateExtensions?: readonly string[];

  /**
   * Style extensions to look for as siblings.
   * @default ['.css', '.scss']
   */
  readonly styleExtensions?: readonly string[];

  /**
   * Custom module resolution host for resolving import paths.
   * When provided, used instead of ts.sys for module resolution.
   * Useful for in-memory programs in tests.
   */
  readonly moduleResolutionHost?: ts.ModuleResolutionHost;
}

/**
 * Extract facts from all source files in a TypeScript program.
 * Returns a map from file path to extracted facts.
 *
 * @param program - TypeScript program
 * @param options - Extraction options (including optional FileSystemContext)
 */
export function extractAllFacts(
  program: ts.Program,
  options?: ExtractionOptions,
): Map<NormalizedPath, SourceFacts> {
  const result = new Map<NormalizedPath, SourceFacts>();
  const checker = program.getTypeChecker();

  const files = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  debug.resolution("extraction.allFacts.start", {
    fileCount: files.length,
    hasFileSystem: !!options?.fileSystem,
  });

  for (const sf of files) {
    const facts = extractSourceFacts(sf, checker, program, options);
    result.set(facts.path, facts);
  }

  debug.resolution("extraction.allFacts.done", {
    factCount: result.size,
  });

  return result;
}

/**
 * Extract facts from a single source file.
 *
 * @param sf - TypeScript source file
 * @param checker - Type checker
 * @param program - TypeScript program (optional, for import resolution)
 * @param options - Extraction options (optional, for sibling detection)
 */
export function extractSourceFacts(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  program?: ts.Program,
  options?: ExtractionOptions,
): SourceFacts {
  const path = canonicalPath(sf.fileName);
  const classes: ClassFacts[] = [];
  const registrationCalls = extractRegistrationCalls(sf, checker);
  const imports: ImportFact[] = [];
  const exports: ExportFact[] = [];

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      classes.push(extractClassFacts(stmt, checker));
    }

    if (ts.isImportDeclaration(stmt)) {
      const importFact = extractImportFact(stmt, sf.fileName, program, options?.moduleResolutionHost);
      if (importFact) imports.push(importFact);
    }

    if (ts.isExportDeclaration(stmt)) {
      const exportFact = extractExportFact(stmt, sf.fileName, program, options?.moduleResolutionHost);
      if (exportFact) exports.push(exportFact);
    }

    // Handle named exports from class declarations: export class Foo {}
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

      if (hasExport && hasDefault) {
        exports.push({ kind: "default", name: stmt.name.text });
      } else if (hasExport) {
        // Add to named exports (will be merged later if needed)
        const existing = exports.find((e): e is Extract<ExportFact, { kind: "named" }> => e.kind === "named");
        if (existing) {
          (existing.names as string[]).push(stmt.name.text);
        } else {
          exports.push({ kind: "named", names: [stmt.name.text] });
        }
      }
    }
  }

  // Detect sibling files if FileSystemContext is provided
  const siblingFiles = detectSiblingFiles(sf.fileName, options);

  // Extract template imports from sibling HTML template (with resolution if program available)
  const templateImports = extractSiblingTemplateImports(siblingFiles, options, program);

  return { path, classes, registrationCalls, imports, exports, siblingFiles, templateImports };
}

/**
 * Extract template imports from a sibling HTML template.
 *
 * Finds the sibling .html file (if any) and extracts <import>/<require> elements.
 * Also resolves module specifiers to file paths using TypeScript's module resolution.
 */
function extractSiblingTemplateImports(
  siblingFiles: SiblingFileFact[],
  options: ExtractionOptions | undefined,
  program: ts.Program | undefined,
): readonly TemplateImportFact[] {
  if (!options?.fileSystem) {
    return [];
  }

  // Find the sibling HTML template
  const templateExtensions = options.templateExtensions ?? [".html"];
  const templateSibling = siblingFiles.find((s) =>
    templateExtensions.includes(s.extension.toLowerCase())
  );

  if (!templateSibling) {
    return [];
  }

  // Extract imports from the template
  const imports = extractTemplateImports(templateSibling.path, options.fileSystem);

  debug.resolution("extraction.templateImports", {
    templatePath: templateSibling.path,
    importCount: imports.length,
  });

  // Resolve module specifiers if we have a program
  if (program && imports.length > 0) {
    const resolveModule = (specifier: string, fromFile: NormalizedPath) =>
      resolveModulePath(specifier, fromFile, program, options.moduleResolutionHost);

    const resolved = resolveTemplateImportPaths(imports, templateSibling.path, resolveModule);

    debug.resolution("extraction.templateImports.resolved", {
      templatePath: templateSibling.path,
      resolvedCount: resolved.filter((i) => i.resolvedPath !== null).length,
      unresolvedCount: resolved.filter((i) => i.resolvedPath === null).length,
    });

    return resolved;
  }

  return imports;
}

/**
 * Detect sibling files using FileSystemContext.
 */
function detectSiblingFiles(
  sourcePath: string,
  options?: ExtractionOptions,
): SiblingFileFact[] {
  if (!options?.fileSystem) {
    return [];
  }

  const fileSystem = options.fileSystem;
  const templateExtensions = options.templateExtensions ?? [".html"];
  const styleExtensions = options.styleExtensions ?? [".css", ".scss"];

  const allExtensions = [...templateExtensions, ...styleExtensions];
  const siblings = fileSystem.getSiblingFiles(sourcePath, allExtensions);

  debug.resolution("extraction.siblings", {
    sourcePath,
    found: siblings.map((s) => s.path),
  });

  return siblings.map((s) => ({
    path: s.path,
    extension: s.extension,
    baseName: s.baseName,
  }));
}

/**
 * Extract import fact from an import declaration.
 */
function extractImportFact(
  decl: ts.ImportDeclaration,
  containingFile: string,
  program?: ts.Program,
  host?: ts.ModuleResolutionHost
): ImportFact | null {
  const specifier = decl.moduleSpecifier;
  if (!ts.isStringLiteral(specifier)) return null;

  const moduleSpecifier = specifier.text;
  const resolvedPath = program ? resolveModulePath(moduleSpecifier, containingFile, program, host) : null;

  const importClause = decl.importClause;
  if (!importClause) {
    // Side-effect import: import "./foo"
    return null;
  }

  // Namespace import: import * as foo from "./foo"
  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    return {
      kind: "namespace",
      alias: importClause.namedBindings.name.text,
      moduleSpecifier,
      resolvedPath,
    };
  }

  // Named imports: import { a, b as c } from "./foo"
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    const names: ImportedName[] = [];
    for (const el of importClause.namedBindings.elements) {
      names.push({
        name: el.propertyName?.text ?? el.name.text,
        alias: el.propertyName ? el.name.text : null,
      });
    }
    return {
      kind: "named",
      names,
      moduleSpecifier,
      resolvedPath,
    };
  }

  // Default import: import foo from "./foo"
  if (importClause.name) {
    return {
      kind: "default",
      alias: importClause.name.text,
      moduleSpecifier,
      resolvedPath,
    };
  }

  return null;
}

/**
 * Extract export fact from an export declaration.
 */
function extractExportFact(
  decl: ts.ExportDeclaration,
  containingFile: string,
  program?: ts.Program,
  host?: ts.ModuleResolutionHost
): ExportFact | null {
  // Re-export from another module
  if (decl.moduleSpecifier && ts.isStringLiteral(decl.moduleSpecifier)) {
    const moduleSpecifier = decl.moduleSpecifier.text;
    const resolvedPath = program ? resolveModulePath(moduleSpecifier, containingFile, program, host) : null;

    // export * from "./foo"
    if (!decl.exportClause) {
      return {
        kind: "reexport-all",
        moduleSpecifier,
        resolvedPath,
      };
    }

    // export { a, b as c } from "./foo"
    if (ts.isNamedExports(decl.exportClause)) {
      const names: ExportedName[] = [];
      for (const el of decl.exportClause.elements) {
        names.push({
          name: el.propertyName?.text ?? el.name.text,
          alias: el.propertyName ? el.name.text : null,
        });
      }
      return {
        kind: "reexport-named",
        names,
        moduleSpecifier,
        resolvedPath,
      };
    }
  }

  // Local export: export { a, b as c }
  if (!decl.moduleSpecifier && decl.exportClause && ts.isNamedExports(decl.exportClause)) {
    const names: string[] = [];
    for (const el of decl.exportClause.elements) {
      names.push(el.name.text);
    }
    return {
      kind: "named",
      names,
    };
  }

  return null;
}

/**
 * Resolve a module specifier to a file path.
 */
function resolveModulePath(
  specifier: string,
  containingFile: string,
  program: ts.Program,
  host?: ts.ModuleResolutionHost
): NormalizedPath | null {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    host ?? ts.sys,
  );

  if (result.resolvedModule?.resolvedFileName) {
    return canonicalPath(result.resolvedModule.resolvedFileName);
  }

  return null;
}
