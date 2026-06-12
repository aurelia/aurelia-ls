import path from "node:path";

import ts from "typescript";

import { hasModifier, toPosixPath } from "../source/index.js";

export const enum EvaluationImportKind {
  /** Import declaration that only executes the target module. */
  SideEffect = "side-effect",
  /** Default import binding. */
  Default = "default",
  /** Named import binding. */
  Named = "named",
  /** Namespace import binding. */
  Namespace = "namespace",
}

export const enum EvaluationExportKind {
  /** Export that points at a local binding in the same module. */
  Local = "local",
  /** Export that forwards a named binding from another module. */
  ReExport = "re-export",
  /** Export star from another module. */
  ExportAll = "export-all",
  /** Default export assignment or declaration. */
  Default = "default",
  /** TypeScript/CommonJS-shaped export assignment. */
  ExportEquals = "export-equals",
}

/** Import edge discovered from one source module. */
export class EvaluationImportEntry {
  constructor(
    /** Import category. */
    readonly importKind: EvaluationImportKind,
    /** Module specifier text as authored. */
    readonly moduleSpecifier: string,
    /** Local binding name, null for side-effect imports. */
    readonly localName: string | null,
    /** Exported name imported from the target module, when one applies. */
    readonly exportName: string | null,
    /** Import declaration node. */
    readonly node: ts.ImportDeclaration,
  ) {}
}

/** Export edge discovered from one source module. */
export class EvaluationExportEntry {
  constructor(
    /** Export category. */
    readonly exportKind: EvaluationExportKind,
    /** Exported name visible to importers. */
    readonly exportName: string,
    /** Local binding name when the export comes from this module. */
    readonly localName: string | null,
    /** Target module specifier for re-exports. */
    readonly moduleSpecifier: string | null,
    /** Source node that declared the export. */
    readonly node: ts.Node,
  ) {}
}

/** Static module record before or after linking. */
export class EvaluationModuleRecord {
  constructor(
    /** Stable key for this source module inside one evaluator run. */
    readonly moduleKey: string,
    /** Parsed TypeScript source file. */
    readonly sourceFile: ts.SourceFile,
    /** Import entries discovered from module syntax. */
    readonly imports: readonly EvaluationImportEntry[],
    /** Export entries discovered from module syntax. */
    readonly exports: readonly EvaluationExportEntry[],
  ) {}
}

/** Directed module graph over parsed source files. */
export class EvaluationModuleGraph {
  private readonly modules = new Map<string, EvaluationModuleRecord>();
  private readonly resolvedEdges = new Map<string, Map<string, string | null>>();

  /** Add or replace one module record. */
  addModule(record: EvaluationModuleRecord): void {
    this.modules.set(record.moduleKey, record);
  }

  /** Record how one authored module specifier resolved from one module. */
  linkModule(
    fromModuleKey: string,
    moduleSpecifier: string,
    toModuleKey: string | null,
  ): void {
    let edges = this.resolvedEdges.get(fromModuleKey);
    if (edges === undefined) {
      edges = new Map<string, string | null>();
      this.resolvedEdges.set(fromModuleKey, edges);
    }
    edges.set(moduleSpecifier, toModuleKey);
  }

  /** Read one module record by key. */
  readModule(moduleKey: string): EvaluationModuleRecord | null {
    return this.modules.get(normalizeModuleKey(moduleKey)) ?? null;
  }

  /** Read the linked target for one authored module specifier. */
  readLinkedModule(
    fromModuleKey: string,
    moduleSpecifier: string,
  ): string | null {
    return (
      this.resolvedEdges
        .get(normalizeModuleKey(fromModuleKey))
        ?.get(moduleSpecifier) ?? null
    );
  }

  /** Read all known module records in insertion order. */
  readModules(): readonly EvaluationModuleRecord[] {
    return [...this.modules.values()];
  }
}

/** Build a static module record from TypeScript module syntax. */
export function readEvaluationModuleRecord(
  sourceFile: ts.SourceFile,
  moduleKey: string = normalizeModuleKey(sourceFile.fileName),
): EvaluationModuleRecord {
  const imports: EvaluationImportEntry[] = [];
  const exports: EvaluationExportEntry[] = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      imports.push(...readImportEntries(statement));
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      exports.push(...readExportDeclarationEntries(statement));
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      exports.push(
        new EvaluationExportEntry(
          statement.isExportEquals === true
            ? EvaluationExportKind.ExportEquals
            : EvaluationExportKind.Default,
          statement.isExportEquals === true ? "export=" : "default",
          statement.isExportEquals === true ? null : "default",
          null,
          statement,
        ),
      );
      continue;
    }
    exports.push(...readLocalExportEntries(statement));
  }

  return new EvaluationModuleRecord(moduleKey, sourceFile, imports, exports);
}

/** Normalize module keys for graph lookups and emitted diagnostics. */
export function normalizeModuleKey(moduleKey: string): string {
  return toPosixPath(moduleKey);
}

function readImportEntries(
  statement: ts.ImportDeclaration,
): readonly EvaluationImportEntry[] {
  if (!ts.isStringLiteral(statement.moduleSpecifier)) {
    return [];
  }
  const moduleSpecifier = statement.moduleSpecifier.text;
  const clause = statement.importClause;
  if (clause === undefined) {
    return [
      new EvaluationImportEntry(
        EvaluationImportKind.SideEffect,
        moduleSpecifier,
        null,
        null,
        statement,
      ),
    ];
  }

  const entries: EvaluationImportEntry[] = [];
  if (clause.name !== undefined) {
    entries.push(
      new EvaluationImportEntry(
        EvaluationImportKind.Default,
        moduleSpecifier,
        clause.name.text,
        "default",
        statement,
      ),
    );
  }

  const named = clause.namedBindings;
  if (named === undefined) {
    return entries;
  }
  if (ts.isNamespaceImport(named)) {
    entries.push(
      new EvaluationImportEntry(
        EvaluationImportKind.Namespace,
        moduleSpecifier,
        named.name.text,
        null,
        statement,
      ),
    );
    return entries;
  }

  for (const element of named.elements) {
    entries.push(
      new EvaluationImportEntry(
        EvaluationImportKind.Named,
        moduleSpecifier,
        element.name.text,
        element.propertyName?.text ?? element.name.text,
        statement,
      ),
    );
  }
  return entries;
}

function readExportDeclarationEntries(
  statement: ts.ExportDeclaration,
): readonly EvaluationExportEntry[] {
  if (
    statement.moduleSpecifier !== undefined &&
    !ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return [];
  }
  const moduleSpecifier = statement.moduleSpecifier?.text ?? null;
  if (statement.exportClause === undefined) {
    return moduleSpecifier === null
      ? []
      : [
          new EvaluationExportEntry(
            EvaluationExportKind.ExportAll,
            "*",
            null,
            moduleSpecifier,
            statement,
          ),
        ];
  }
  if (!ts.isNamedExports(statement.exportClause)) {
    return [];
  }

  return statement.exportClause.elements.map(
    (element) =>
      new EvaluationExportEntry(
        moduleSpecifier === null
          ? EvaluationExportKind.Local
          : EvaluationExportKind.ReExport,
        element.name.text,
        moduleSpecifier === null
          ? element.propertyName?.text ?? element.name.text
          : null,
        moduleSpecifier,
        element,
      ),
  );
}

function readLocalExportEntries(
  statement: ts.Statement,
): readonly EvaluationExportEntry[] {
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    return [];
  }

  const defaultExport = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => {
      return bindingNames(declaration.name).map(
        (localName) =>
          new EvaluationExportEntry(
            EvaluationExportKind.Local,
            localName,
            localName,
            null,
            declaration,
          ),
      );
    });
  }

  const named = readDeclarationName(statement);
  if (named === null) {
    return [];
  }
  return [
    new EvaluationExportEntry(
      defaultExport ? EvaluationExportKind.Default : EvaluationExportKind.Local,
      defaultExport ? "default" : named,
      named,
      null,
      statement,
    ),
  ];
}

function readDeclarationName(statement: ts.Statement): string | null {
  if (
    (ts.isClassDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name !== undefined
  ) {
    return statement.name.text;
  }
  return null;
}

function bindingNames(name: ts.BindingName): readonly string[] {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    return name.elements.flatMap((element) => {
      if (ts.isOmittedExpression(element)) {
        return [];
      }
      return bindingNames(element.name);
    });
  }
  return [];
}

/** Return a module-key-like relative path with POSIX separators. */
export function relativeModuleKey(rootDir: string, filePath: string): string {
  return normalizeModuleKey(path.relative(rootDir, filePath));
}
