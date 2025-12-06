import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/domain";
import type { SourceFacts, ClassFacts, ImportFact, ExportFact, ImportedName, ExportedName } from "./types.js";
import { extractClassFacts } from "./class-extractor.js";
import { extractRegistrationCalls } from "./registrations.js";
import { canonicalPath } from "../util/naming.js";

/**
 * Extract facts from all source files in a TypeScript program.
 * Returns a map from file path to extracted facts.
 */
export function extractAllFacts(program: ts.Program): Map<NormalizedPath, SourceFacts> {
  const result = new Map<NormalizedPath, SourceFacts>();
  const checker = program.getTypeChecker();

  const files = program
    .getSourceFiles()
    .filter((sf) => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  for (const sf of files) {
    const facts = extractSourceFacts(sf, checker, program);
    result.set(facts.path, facts);
  }

  return result;
}

/**
 * Extract facts from a single source file.
 */
export function extractSourceFacts(sf: ts.SourceFile, checker: ts.TypeChecker, program?: ts.Program): SourceFacts {
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
      const importFact = extractImportFact(stmt, sf.fileName, program);
      if (importFact) imports.push(importFact);
    }

    if (ts.isExportDeclaration(stmt)) {
      const exportFact = extractExportFact(stmt, sf.fileName, program);
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

  return { path, classes, registrationCalls, imports, exports };
}

/**
 * Extract import fact from an import declaration.
 */
function extractImportFact(decl: ts.ImportDeclaration, containingFile: string, program?: ts.Program): ImportFact | null {
  const specifier = decl.moduleSpecifier;
  if (!ts.isStringLiteral(specifier)) return null;

  const moduleSpecifier = specifier.text;
  const resolvedPath = program ? resolveModulePath(moduleSpecifier, containingFile, program) : null;

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
function extractExportFact(decl: ts.ExportDeclaration, containingFile: string, program?: ts.Program): ExportFact | null {
  // Re-export from another module
  if (decl.moduleSpecifier && ts.isStringLiteral(decl.moduleSpecifier)) {
    const moduleSpecifier = decl.moduleSpecifier.text;
    const resolvedPath = program ? resolveModulePath(moduleSpecifier, containingFile, program) : null;

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
function resolveModulePath(specifier: string, containingFile: string, program: ts.Program): NormalizedPath | null {
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
