import path from 'node:path';
import ts from 'typescript';
import { hasModifier } from './ts-syntax.js';

export const enum EvaluationImportKind {
  /** Import declaration that only executes the target module. */
  SideEffect = 'side-effect',
  /** Default import binding. */
  Default = 'default',
  /** Named import binding. */
  Named = 'named',
  /** Namespace import binding. */
  Namespace = 'namespace',
  /** CommonJS `require("...")` edge discovered in executable source. */
  CommonJsRequire = 'commonjs-require',
  /** Dynamic `import("...")` edge discovered in executable source. */
  DynamicImport = 'dynamic-import',
}

export const enum EvaluationExportKind {
  /** Export that points at a local binding in the same module. */
  Local = 'local',
  /** Export that forwards a named binding from another module. */
  ReExport = 're-export',
  /** Export star from another module. */
  ExportAll = 'export-all',
  /** Namespace object forwarded as one named export through `export * as name from`. */
  NamespaceReExport = 'namespace-re-export',
  /** Default export assignment or declaration. */
  Default = 'default',
  /** TypeScript/CommonJS-shaped export assignment. */
  ExportEquals = 'export-equals',
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
    /** Exact import binding, side-effect declaration, or dynamic import/require call. */
    readonly node: ts.Node,
    /** TypeScript package-condition mode selected by this exact import usage. */
    readonly resolutionMode: ts.ResolutionMode = undefined,
  ) {}
}

/** Export edge discovered from one source module. */
export class EvaluationExportEntry {
  constructor(
    /** Export category. */
    readonly exportKind: EvaluationExportKind,
    /** Exported name visible to importers. */
    readonly exportName: string,
    /** Local binding name or forwarded target-export name that supplies this export. */
    readonly valueName: string | null,
    /** Target module specifier for re-exports. */
    readonly moduleSpecifier: string | null,
    /** Source node that declared the export. */
    readonly node: ts.Node,
    /** TypeScript package-condition mode selected by this exact re-export usage. */
    readonly resolutionMode: ts.ResolutionMode = undefined,
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
    resolutionMode: ts.ResolutionMode,
    toModuleKey: string | null,
  ): void {
    let edges = this.resolvedEdges.get(fromModuleKey);
    if (edges === undefined) {
      edges = new Map<string, string | null>();
      this.resolvedEdges.set(fromModuleKey, edges);
    }
    edges.set(evaluationModuleResolutionEdgeKey(moduleSpecifier, resolutionMode), toModuleKey);
  }

  /** Read one module record by key. */
  readModule(moduleKey: string): EvaluationModuleRecord | null {
    return this.modules.get(moduleKey) ?? null;
  }

  /** Read the linked target for one authored module specifier. */
  readLinkedModule(
    fromModuleKey: string,
    moduleSpecifier: string,
    resolutionMode: ts.ResolutionMode = undefined,
  ): string | null {
    return this.resolvedEdges.get(fromModuleKey)
      ?.get(evaluationModuleResolutionEdgeKey(moduleSpecifier, resolutionMode)) ?? null;
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
  compilerOptions: ts.CompilerOptions = {},
): EvaluationModuleRecord {
  const imports: EvaluationImportEntry[] = [];
  const exports: EvaluationExportEntry[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      imports.push(...readImportEntries(statement, sourceFile, compilerOptions));
      continue;
    }
    if (ts.isImportEqualsDeclaration(statement)) {
      imports.push(...readImportEqualsEntries(statement, sourceFile, compilerOptions));
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      exports.push(...readExportDeclarationEntries(statement, sourceFile, compilerOptions));
      continue;
    }
    if (ts.isExportAssignment(statement)) {
      exports.push(new EvaluationExportEntry(
        statement.isExportEquals === true ? EvaluationExportKind.ExportEquals : EvaluationExportKind.Default,
        statement.isExportEquals === true ? 'export=' : 'default',
        statement.isExportEquals === true ? null : 'default',
        null,
        statement,
      ));
      continue;
    }
    exports.push(...readLocalExportEntries(statement));
  }

  return new EvaluationModuleRecord(moduleKey, sourceFile, [
    ...imports,
    ...readCommonJsRequireEntries(sourceFile, compilerOptions),
    ...readDynamicImportEntries(sourceFile, compilerOptions),
  ], exports);
}

function readImportEqualsEntries(
  statement: ts.ImportEqualsDeclaration,
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): readonly EvaluationImportEntry[] {
  if (
    statement.isTypeOnly
    || !ts.isExternalModuleReference(statement.moduleReference)
    || statement.moduleReference.expression == null
    || !ts.isStringLiteralLike(statement.moduleReference.expression)
  ) {
    return [];
  }
  const specifier = statement.moduleReference.expression;
  // Import-equals executes its target as a static dependency. Preserve that graph edge without pretending that the
  // evaluator already models the declaration's CommonJS-shaped local value.
  return [new EvaluationImportEntry(
    EvaluationImportKind.SideEffect,
    specifier.text,
    null,
    null,
    statement,
    ts.getModeForUsageLocation(sourceFile, specifier, compilerOptions),
  )];
}

/** Normalize module keys for graph lookups and emitted diagnostics. */
export function normalizeModuleKey(moduleKey: string): string {
  return moduleKey.replace(/\\/g, '/');
}

function readImportEntries(
  statement: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): readonly EvaluationImportEntry[] {
  if (!ts.isStringLiteral(statement.moduleSpecifier)) {
    return [];
  }
  const moduleSpecifier = statement.moduleSpecifier.text;
  const resolutionMode = ts.getModeForUsageLocation(sourceFile, statement.moduleSpecifier, compilerOptions);
  const clause = statement.importClause;
  if (clause == null) {
    return [
      new EvaluationImportEntry(
        EvaluationImportKind.SideEffect,
        moduleSpecifier,
        null,
        null,
        statement,
        resolutionMode,
      ),
    ];
  }
  if (clause.isTypeOnly) {
    return [];
  }

  const entries: EvaluationImportEntry[] = [];
  if (clause.name != null) {
    entries.push(new EvaluationImportEntry(
      EvaluationImportKind.Default,
      moduleSpecifier,
      clause.name.text,
      'default',
      clause.name,
      resolutionMode,
    ));
  }

  const named = clause.namedBindings;
  if (named == null) {
    return entries;
  }
  if (ts.isNamespaceImport(named)) {
    entries.push(new EvaluationImportEntry(
      EvaluationImportKind.Namespace,
      moduleSpecifier,
      named.name.text,
      null,
      named,
      resolutionMode,
    ));
    return entries;
  }

  for (const element of named.elements) {
    if (element.isTypeOnly) {
      continue;
    }
    entries.push(new EvaluationImportEntry(
      EvaluationImportKind.Named,
      moduleSpecifier,
      element.name.text,
      element.propertyName?.text ?? element.name.text,
      element,
      resolutionMode,
    ));
  }
  return entries;
}

function readCommonJsRequireEntries(
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): readonly EvaluationImportEntry[] {
  const entries: EvaluationImportEntry[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === 'require'
      && node.arguments.length > 0
    ) {
      const specifier = node.arguments[0];
      if (specifier != null && ts.isStringLiteralLike(specifier)) {
        entries.push(new EvaluationImportEntry(
          EvaluationImportKind.CommonJsRequire,
          specifier.text,
          null,
          null,
          node,
          ts.getModeForUsageLocation(sourceFile, specifier, compilerOptions),
        ));
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return entries;
}

function readDynamicImportEntries(
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): readonly EvaluationImportEntry[] {
  const entries: EvaluationImportEntry[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && node.arguments.length > 0
    ) {
      const specifier = node.arguments[0];
      if (specifier != null && ts.isStringLiteralLike(specifier)) {
        entries.push(new EvaluationImportEntry(
          EvaluationImportKind.DynamicImport,
          specifier.text,
          null,
          null,
          node,
          ts.getModeForUsageLocation(sourceFile, specifier, compilerOptions),
        ));
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return entries;
}

function readExportDeclarationEntries(
  statement: ts.ExportDeclaration,
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
): readonly EvaluationExportEntry[] {
  if (statement.isTypeOnly) {
    return [];
  }
  if (statement.moduleSpecifier != null && !ts.isStringLiteral(statement.moduleSpecifier)) {
    return [];
  }
  const moduleSpecifier = statement.moduleSpecifier?.text ?? null;
  const resolutionMode = statement.moduleSpecifier == null
    ? undefined
    : ts.getModeForUsageLocation(sourceFile, statement.moduleSpecifier, compilerOptions);
  if (statement.exportClause == null) {
    return moduleSpecifier == null
      ? []
      : [
        new EvaluationExportEntry(
          EvaluationExportKind.ExportAll,
          '*',
          null,
          moduleSpecifier,
          statement,
          resolutionMode,
        ),
      ];
  }
  if (ts.isNamespaceExport(statement.exportClause)) {
    return moduleSpecifier == null
      ? []
      : [new EvaluationExportEntry(
        EvaluationExportKind.NamespaceReExport,
        statement.exportClause.name.text,
        '*',
        moduleSpecifier,
        statement.exportClause,
        resolutionMode,
      )];
  }
  if (!ts.isNamedExports(statement.exportClause)) {
    return [];
  }

  return statement.exportClause.elements
    .filter((element) => !element.isTypeOnly)
    .map((element) =>
      new EvaluationExportEntry(
        moduleSpecifier == null ? EvaluationExportKind.Local : EvaluationExportKind.ReExport,
        element.name.text,
        element.propertyName?.text ?? element.name.text,
        moduleSpecifier,
        element,
        resolutionMode,
      )
    );
}

function readLocalExportEntries(statement: ts.Statement): readonly EvaluationExportEntry[] {
  if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
    return [];
  }

  const defaultExport = hasModifier(statement, ts.SyntaxKind.DefaultKeyword);
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) => {
      const localName = ts.isIdentifier(declaration.name) ? declaration.name.text : null;
      return localName == null
        ? []
        : [
          new EvaluationExportEntry(
            EvaluationExportKind.Local,
            localName,
            localName,
            null,
            declaration,
          ),
        ];
    });
  }

  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
    return [];
  }

  const named = readDeclarationName(statement);
  if (defaultExport) {
    return [
      new EvaluationExportEntry(
        EvaluationExportKind.Default,
        'default',
        named ?? 'default',
        null,
        statement,
      ),
    ];
  }
  return named == null
    ? []
    : [
      new EvaluationExportEntry(
        EvaluationExportKind.Local,
        named,
        named,
        null,
        statement,
      ),
    ];
}

function readDeclarationName(statement: ts.Statement): string | null {
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return statement.name?.text ?? null;
  }
  if (
    ts.isEnumDeclaration(statement)
    || ts.isInterfaceDeclaration(statement)
    || ts.isTypeAliasDeclaration(statement)
    || ts.isModuleDeclaration(statement)
  ) {
    return statement.name.text;
  }
  return null;
}

/** Resolve a relative module key against the importing module key without touching the file system. */
export function resolveRelativeModuleKey(fromModuleKey: string, moduleSpecifier: string): string | null {
  if (!moduleSpecifier.startsWith('./') && !moduleSpecifier.startsWith('../')) {
    return null;
  }
  return normalizeModuleKey(path.resolve(path.dirname(fromModuleKey), moduleSpecifier));
}

function evaluationModuleResolutionEdgeKey(
  moduleSpecifier: string,
  resolutionMode: ts.ResolutionMode,
): string {
  return JSON.stringify([moduleSpecifier, resolutionMode ?? null]);
}
