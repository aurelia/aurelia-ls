import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import { debug } from "@aurelia-ls/compiler";
import type { SourceFacts, ClassFacts, ImportFact, ExportFact, ImportedName, ExportedName, SiblingFileFact, TemplateImportFact, VariableFact, FunctionFact, AnalysisGap } from "./types.js";
import { gap } from "./types.js";
import { extractClassFacts } from "./class-extractor.js";
import { extractRegistrationCalls } from "./registrations.js";
import { extractDefineCalls } from "./define-calls.js";
import { extractTemplateImports, resolveTemplateImportPaths } from "./template-imports.js";
import { canonicalPath } from "../util/naming.js";
import type { FileSystemContext } from "../project/context.js";
import type { PropertyResolutionContext } from "./value-helpers.js";
import { buildSimpleContext, buildContextWithProgram } from "./value-helpers.js";

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
  const defineCalls = extractDefineCalls(sf);
  const imports: ImportFact[] = [];
  const exports: ExportFact[] = [];
  const variables: VariableFact[] = [];
  const functions: FunctionFact[] = [];
  const gaps: AnalysisGap[] = [];

  // Build resolution context for this file.
  // This enables resolving file-local constants in $au properties.
  // When program is available, also enables inline import resolution.
  const resolutionCtx: PropertyResolutionContext = program
    ? buildContextWithProgram(sf, path, program)
    : buildSimpleContext(sf, path);

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      classes.push(extractClassFacts(stmt, checker, resolutionCtx));
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

    // Handle exported variable declarations: export const Foo = ...
    if (ts.isVariableStatement(stmt)) {
      const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (hasExport) {
        const varKind = getVariableKind(stmt.declarationList.flags);
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            variables.push({
              name: decl.name.text,
              kind: varKind,
              initializerKind: getInitializerKind(decl.initializer),
            });
            // Also add to named exports list
            const existing = exports.find((e): e is Extract<ExportFact, { kind: "named" }> => e.kind === "named");
            if (existing) {
              (existing.names as string[]).push(decl.name.text);
            } else {
              exports.push({ kind: "named", names: [decl.name.text] });
            }
          } else {
            // Q55: Destructuring exports are not analyzed
            // e.g., `export const { X, Y } = obj` or `export const [a, b] = arr`
            const patternText = decl.name.getText(sf);
            gaps.push(gap(
              `destructuring export: ${patternText}`,
              { kind: 'unsupported-pattern', path, reason: 'destructuring-export' },
              `Destructuring export patterns like "export const ${patternText} = ..." are not analyzed`
            ));
          }
        }
      }
    }

    // Handle exported function declarations: export function Foo() {}
    if (ts.isFunctionDeclaration(stmt)) {
      const modifiers = ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined;
      const hasExport = modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefault = modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);

      // Q56: Anonymous default function exports are not analyzed
      // e.g., `export default function() { ... }`
      if (ts.isFunctionDeclaration(stmt) && !stmt.name && hasExport && hasDefault) {
        gaps.push(gap(
          'anonymous default function export',
          { kind: 'unsupported-pattern', path, reason: 'anonymous-default-function' },
          'Anonymous default function exports like "export default function() { ... }" are not analyzed'
        ));
      }

      if (!stmt.name) {
        // Skip anonymous functions (gap already recorded above if it's a default export)
        continue;
      }
      if (hasExport) {
        const isAsync = modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
        const isGenerator = stmt.asteriskToken !== undefined;
        functions.push({
          name: stmt.name.text,
          isAsync,
          isGenerator,
        });
        // Also add to exports list
        if (hasDefault) {
          exports.push({ kind: "default", name: stmt.name.text });
        } else {
          const existing = exports.find((e): e is Extract<ExportFact, { kind: "named" }> => e.kind === "named");
          if (existing) {
            (existing.names as string[]).push(stmt.name.text);
          } else {
            exports.push({ kind: "named", names: [stmt.name.text] });
          }
        }
      }
    }
  }

  // Detect sibling files if FileSystemContext is provided
  const siblingFiles = detectSiblingFiles(sf.fileName, options);

  // Extract template imports from sibling HTML template (with resolution if program available)
  const templateImports = extractSiblingTemplateImports(siblingFiles, options, program);

  return { path, classes, registrationCalls, defineCalls, imports, exports, variables, functions, siblingFiles, templateImports, gaps };
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
 *
 * Handles .js → .ts mapping for ESM-style imports in TypeScript source.
 */
function resolveModulePath(
  specifier: string,
  containingFile: string,
  program: ts.Program,
  host?: ts.ModuleResolutionHost
): NormalizedPath | null {
  const resolveHost = host ?? ts.sys;

  debug.resolution("resolveModulePath.start", {
    specifier,
    containingFile,
    hasHost: !!host,
  });

  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    resolveHost,
  );

  debug.resolution("resolveModulePath.result", {
    specifier,
    resolvedFileName: result.resolvedModule?.resolvedFileName ?? null,
  });

  if (result.resolvedModule?.resolvedFileName) {
    let resolvedPath = result.resolvedModule.resolvedFileName;

    // If resolved to .js but .ts exists, prefer .ts
    // This handles ESM-style imports like `import from './foo.js'` pointing to `foo.ts`
    if (resolvedPath.endsWith('.js')) {
      const tsPath = resolvedPath.slice(0, -3) + '.ts';
      if (resolveHost.fileExists?.(tsPath)) {
        debug.resolution("resolveModulePath.jsToTs", { from: resolvedPath, to: tsPath });
        resolvedPath = tsPath;
      }
    }

    const canonicalized = canonicalPath(resolvedPath);
    debug.resolution("resolveModulePath.success", {
      specifier,
      resolvedPath,
      canonicalized,
    });
    return canonicalized;
  }

  // If standard resolution fails, try manual .js → .ts mapping
  if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const tsSpecifier = specifier.slice(0, -3) + '.ts';
    debug.resolution("resolveModulePath.tryTsSpecifier", { tsSpecifier });

    const result2 = ts.resolveModuleName(
      tsSpecifier,
      containingFile,
      program.getCompilerOptions(),
      resolveHost,
    );

    debug.resolution("resolveModulePath.tsResult", {
      tsSpecifier,
      resolvedFileName: result2.resolvedModule?.resolvedFileName ?? null,
    });

    if (result2.resolvedModule?.resolvedFileName) {
      return canonicalPath(result2.resolvedModule.resolvedFileName);
    }
  }

  debug.resolution("resolveModulePath.failed", { specifier });
  return null;
}

/**
 * Get the variable kind from declaration list flags.
 */
function getVariableKind(flags: ts.NodeFlags): 'const' | 'let' | 'var' {
  if (flags & ts.NodeFlags.Const) {
    return 'const';
  }
  if (flags & ts.NodeFlags.Let) {
    return 'let';
  }
  return 'var';
}

/**
 * Get a hint about what kind of expression initializes a variable.
 *
 * This helps downstream analysis understand patterns like:
 * - `const X = renderer(class Y ...)` → 'call'
 * - `const X = class Y {}` → 'class'
 * - `const X = { ... }` → 'object'
 * - `const X = SomeOther` → 'identifier'
 */
function getInitializerKind(
  initializer: ts.Expression | undefined
): VariableFact['initializerKind'] {
  if (!initializer) {
    return undefined;
  }

  if (ts.isCallExpression(initializer)) {
    return 'call';
  }
  if (ts.isClassExpression(initializer)) {
    return 'class';
  }
  if (ts.isObjectLiteralExpression(initializer)) {
    return 'object';
  }
  if (ts.isIdentifier(initializer)) {
    return 'identifier';
  }
  return 'other';
}
