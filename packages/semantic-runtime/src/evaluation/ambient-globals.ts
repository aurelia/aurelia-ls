import path from 'node:path';
import ts from 'typescript';
import type { ProjectBootFrame, SourceFileAdmission } from '../boot/frames.js';
import { buildProjectCompilerOptionsResult } from '../boot/project-compiler-options.js';
import {
  SourceFileRole,
  SourceLanguage,
} from '../kernel/address.js';
import { EvaluationBoundaryKind, EvaluationBoundaryValue } from './values.js';
import type { StaticEvaluationRuntimeHost } from './evaluator.js';

/**
 * Project-local ambient global declarations that bundlers or host environments provide at runtime.
 */
export class StaticEvaluationAmbientGlobalDeclarations {
  constructor(
    /** Ambient variable names visible to project source evaluation. */
    private readonly names: ReadonlySet<string>,
  ) {}

  resolveIdentifier(
    identifier: ts.Identifier,
  ): EvaluationBoundaryValue | null {
    return this.names.has(identifier.text)
      ? new EvaluationBoundaryValue(EvaluationBoundaryKind.HostEnvironment, identifier.text, identifier)
      : null;
  }
}

/**
 * Read ambient value globals from project `.d.ts` files and TypeScript libs for static evaluation.
 */
export function readStaticEvaluationAmbientGlobalDeclarations(
  project: ProjectBootFrame,
  readSourceFile: (moduleKey: string) => ts.SourceFile | null,
): StaticEvaluationAmbientGlobalDeclarations {
  const names = new Set<string>();
  collectCompilerOptionAmbientGlobalNames(project, names);
  for (const admission of project.sourceFiles) {
    if (!isAmbientDeclarationAdmission(admission)) {
      continue;
    }
    const sourceFile = readSourceFile(admission.path);
    if (sourceFile?.isDeclarationFile !== true) {
      continue;
    }
    collectSourceFileAmbientGlobalNames(sourceFile, names);
  }
  return new StaticEvaluationAmbientGlobalDeclarations(names);
}

/**
 * Layer project ambient globals behind caller-provided runtime host intrinsics.
 */
export function withStaticEvaluationAmbientGlobals(
  runtimeHost: StaticEvaluationRuntimeHost,
  ambientGlobals: StaticEvaluationAmbientGlobalDeclarations,
): StaticEvaluationRuntimeHost {
  return {
    ...runtimeHost,
    resolveIdentifier: (identifier, environment, moduleKey) =>
      runtimeHost.resolveIdentifier?.(identifier, environment, moduleKey)
      ?? ambientGlobals.resolveIdentifier(identifier),
  };
}

function isAmbientDeclarationAdmission(
  admission: Pick<SourceFileAdmission, 'language' | 'role'>,
): boolean {
  return admission.language === SourceLanguage.TypeScript && admission.role === SourceFileRole.Declaration;
}

function collectSourceFileAmbientGlobalNames(
  sourceFile: ts.SourceFile,
  names: Set<string>,
): void {
  if (!ts.isExternalModule(sourceFile)) {
    collectAmbientValueNames(sourceFile.statements, names);
  }
  for (const statement of sourceFile.statements) {
    if (isDeclareGlobalStatement(statement)) {
      collectAmbientValueNames(statement.body.statements, names);
    }
  }
}

function isDeclareGlobalStatement(
  statement: ts.Statement,
): statement is ts.ModuleDeclaration & { readonly body: ts.ModuleBlock } {
  return ts.isModuleDeclaration(statement)
    && ts.isIdentifier(statement.name)
    && statement.name.text === 'global'
    && statement.body != null
    && ts.isModuleBlock(statement.body);
}

function collectCompilerOptionAmbientGlobalNames(
  project: ProjectBootFrame,
  names: Set<string>,
): void {
  const options = buildProjectCompilerOptionsResult(project.rootDir, [project.workspaceRootDir]).options;
  if (options.noLib === true) {
    return;
  }
  const defaultLibFilePath = ts.getDefaultLibFilePath(options);
  const libDirectory = path.dirname(defaultLibFilePath);
  const entries = options.lib == null || options.lib.length === 0
    ? [defaultLibFilePath]
    : options.lib.map((lib) => resolveCompilerLibFileName(libDirectory, lib));
  const visited = new Set<string>();
  for (const entry of entries) {
    collectCompilerLibAmbientGlobalNames(entry, names, visited);
  }
}

function collectCompilerLibAmbientGlobalNames(
  fileName: string,
  names: Set<string>,
  visited: Set<string>,
): void {
  const normalized = normalizeAmbientLibFileName(fileName);
  if (visited.has(normalized)) {
    return;
  }
  visited.add(normalized);
  const text = ts.sys.readFile(fileName);
  if (text == null) {
    return;
  }
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  collectAmbientValueNames(sourceFile.statements, names);
  const directory = path.dirname(fileName);
  for (const reference of sourceFile.libReferenceDirectives) {
    collectCompilerLibAmbientGlobalNames(resolveCompilerLibFileName(directory, reference.fileName), names, visited);
  }
}

function resolveCompilerLibFileName(
  libDirectory: string,
  lib: string,
): string {
  const normalized = lib.toLowerCase();
  const fileName = normalized.startsWith('lib.') && normalized.endsWith('.d.ts')
    ? normalized
    : `lib.${normalized.replace(/\.d\.ts$/u, '')}.d.ts`;
  return path.join(libDirectory, fileName);
}

function normalizeAmbientLibFileName(fileName: string): string {
  const resolved = path.resolve(fileName).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function collectAmbientValueNames(
  statements: ts.NodeArray<ts.Statement>,
  names: Set<string>,
): void {
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.add(declaration.name.text);
        }
      }
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name != null) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name != null) {
      names.add(statement.name.text);
      continue;
    }
    if (ts.isEnumDeclaration(statement)) {
      names.add(statement.name.text);
    }
  }
}
