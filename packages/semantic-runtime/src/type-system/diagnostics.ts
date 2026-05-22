import ts from 'typescript';
import type { TypeSystemProject } from './project.js';
import {
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';

export type TypeSystemDiagnosticPhase =
  | 'config'
  | 'global'
  | 'options'
  | 'syntactic'
  | 'semantic'
  | 'declaration';

export type TypeSystemDiagnosticCategory =
  | 'error'
  | 'warning'
  | 'suggestion'
  | 'message';

export interface TypeSystemDiagnosticSourceSpan {
  readonly fileName: string;
  readonly start: number;
  readonly end: number;
  readonly line: number;
  readonly character: number;
}

export interface TypeSystemDiagnosticRelatedInformation {
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: TypeSystemDiagnosticSourceSpan | null;
}

export interface TypeSystemDiagnostic {
  readonly phase: TypeSystemDiagnosticPhase;
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: TypeSystemDiagnosticSourceSpan | null;
  readonly relatedInformation: readonly TypeSystemDiagnosticRelatedInformation[];
}

const diagnosticsByProject = new WeakMap<TypeSystemProject, readonly TypeSystemDiagnostic[]>();
const diagnosticsByProjectAndSource = new WeakMap<TypeSystemProject, Map<string, readonly TypeSystemDiagnostic[]>>();

/** Read ordinary TypeScript project diagnostics from the Program epoch owned by semantic-runtime. */
export function readTypeSystemProjectDiagnostics(
  typeSystem: TypeSystemProject,
): readonly TypeSystemDiagnostic[] {
  const cached = diagnosticsByProject.get(typeSystem);
  if (cached != null) {
    return cached;
  }
  const diagnostics: TypeSystemDiagnostic[] = [
    ...typeSystem.configDiagnostics.map((diagnostic) =>
      typeSystemDiagnostic('config', diagnostic, typeSystem.configFilePath)
    ),
    ...typeSystem.program.getGlobalDiagnostics().map((diagnostic) => typeSystemDiagnostic('global', diagnostic)),
    ...typeSystem.program.getOptionsDiagnostics().map((diagnostic) => typeSystemDiagnostic('options', diagnostic)),
  ];

  for (const sourceFile of typeSystem.readProjectProgramSourceFiles()) {
    diagnostics.push(
      ...typeSystem.program.getSyntacticDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('syntactic', diagnostic)
      ),
      ...typeSystem.program.getSemanticDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('semantic', diagnostic)
      ),
      ...typeSystem.program.getDeclarationDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('declaration', diagnostic)
      ),
    );
  }

  const result = [...deduplicateTypeSystemDiagnostics(diagnostics)].sort(compareTypeSystemDiagnostics);
  diagnosticsByProject.set(typeSystem, result);
  return result;
}

/** Read ordinary TypeScript diagnostics for one source/config file without spending every project source file. */
export function readTypeSystemProjectSourceDiagnostics(
  typeSystem: TypeSystemProject,
  fileName: string,
): readonly TypeSystemDiagnostic[] {
  const sourceFile = typeSystem.readProgramSourceFileByPath(fileName);
  let diagnosticsBySource = diagnosticsByProjectAndSource.get(typeSystem);
  if (diagnosticsBySource == null) {
    diagnosticsBySource = new Map();
    diagnosticsByProjectAndSource.set(typeSystem, diagnosticsBySource);
  }
  const cacheKey = typeSystemDiagnosticSourceCacheKey(typeSystem, fileName, sourceFile);
  const cached = diagnosticsBySource.get(cacheKey);
  if (cached != null) {
    return cached;
  }
  const cachedProjectDiagnostics = diagnosticsByProject.get(typeSystem);
  if (cachedProjectDiagnostics != null) {
    const result = cachedProjectDiagnostics.filter((diagnostic) =>
      typeSystemDiagnosticMatchesSource(diagnostic, fileName)
    );
    diagnosticsBySource.set(cacheKey, result);
    return result;
  }

  const diagnostics: TypeSystemDiagnostic[] = typeSystem.configDiagnostics
    .map((diagnostic) => typeSystemDiagnostic('config', diagnostic, typeSystem.configFilePath))
    .filter((diagnostic) => typeSystemDiagnosticMatchesSource(diagnostic, fileName));

  if (sourceFile != null) {
    diagnostics.push(
      ...typeSystem.program.getSyntacticDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('syntactic', diagnostic)
      ),
      ...typeSystem.program.getSemanticDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('semantic', diagnostic)
      ),
      ...typeSystem.program.getDeclarationDiagnostics(sourceFile).map((diagnostic) =>
        typeSystemDiagnostic('declaration', diagnostic)
      ),
    );
  }

  const result = [...deduplicateTypeSystemDiagnostics(diagnostics)].sort(compareTypeSystemDiagnostics);
  diagnosticsBySource.set(cacheKey, result);
  return result;
}

function typeSystemDiagnostic(
  phase: TypeSystemDiagnosticPhase,
  diagnostic: ts.Diagnostic,
  fallbackFileName: string | null = null,
): TypeSystemDiagnostic {
  return {
    phase,
    category: diagnosticCategory(diagnostic.category),
    code: diagnostic.code,
    message: diagnosticMessageText(diagnostic.messageText),
    typescriptSource: diagnostic.source ?? null,
    source: diagnosticSourceSpan(diagnostic, fallbackFileName),
    relatedInformation: (diagnostic.relatedInformation ?? []).map(typeSystemDiagnosticRelatedInformation),
  };
}

function typeSystemDiagnosticRelatedInformation(
  diagnostic: ts.DiagnosticRelatedInformation,
): TypeSystemDiagnosticRelatedInformation {
  return {
    category: diagnosticCategory(diagnostic.category),
    code: diagnostic.code,
    message: diagnosticMessageText(diagnostic.messageText),
    typescriptSource: diagnosticSourceLabel(diagnostic),
    source: diagnosticSourceSpan(diagnostic),
  };
}

function diagnosticSourceLabel(
  diagnostic: ts.Diagnostic | ts.DiagnosticRelatedInformation,
): string | null {
  return (diagnostic as { readonly source?: string }).source ?? null;
}

function diagnosticSourceSpan(
  diagnostic: Pick<ts.Diagnostic, 'file' | 'start' | 'length'>,
  fallbackFileName: string | null = null,
): TypeSystemDiagnosticSourceSpan | null {
  if (diagnostic.file != null && diagnostic.start != null && diagnostic.length != null) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return {
      fileName: diagnostic.file.fileName,
      start: diagnostic.start,
      end: diagnostic.start + diagnostic.length,
      line: position.line,
      character: position.character,
    };
  }
  if (diagnostic.file != null) {
    return {
      fileName: diagnostic.file.fileName,
      start: 0,
      end: 0,
      line: 0,
      character: 0,
    };
  }
  if (fallbackFileName == null) {
    return null;
  }
  return {
    fileName: fallbackFileName.replace(/\\/g, '/'),
    start: 0,
    end: 0,
    line: 0,
    character: 0,
  };
}

function diagnosticMessageText(message: string | ts.DiagnosticMessageChain): string {
  if (typeof message === 'string') {
    return message;
  }
  const next = message.next?.map(diagnosticMessageText) ?? [];
  return [message.messageText, ...next].join('\n');
}

function diagnosticCategory(category: ts.DiagnosticCategory): TypeSystemDiagnosticCategory {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return 'error';
    case ts.DiagnosticCategory.Warning:
      return 'warning';
    case ts.DiagnosticCategory.Suggestion:
      return 'suggestion';
    case ts.DiagnosticCategory.Message:
      return 'message';
  }
}

function deduplicateTypeSystemDiagnostics(
  diagnostics: readonly TypeSystemDiagnostic[],
): readonly TypeSystemDiagnostic[] {
  const byKey = new Map<string, TypeSystemDiagnostic>();
  for (const diagnostic of diagnostics) {
    byKey.set(typeSystemDiagnosticKey(diagnostic), diagnostic);
  }
  return [...byKey.values()];
}

function typeSystemDiagnosticKey(diagnostic: TypeSystemDiagnostic): string {
  return [
    diagnostic.phase,
    diagnostic.category,
    diagnostic.code,
    diagnostic.typescriptSource ?? '',
    diagnostic.source?.fileName ?? '',
    diagnostic.source?.start ?? '',
    diagnostic.source?.end ?? '',
    diagnostic.message,
  ].join('\0');
}

function compareTypeSystemDiagnostics(
  left: TypeSystemDiagnostic,
  right: TypeSystemDiagnostic,
): number {
  return (left.source?.fileName ?? '').localeCompare(right.source?.fileName ?? '')
    || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    || left.phase.localeCompare(right.phase)
    || left.category.localeCompare(right.category)
    || left.code - right.code
    || left.message.localeCompare(right.message);
}

function typeSystemDiagnosticMatchesSource(
  diagnostic: TypeSystemDiagnostic,
  fileName: string,
): boolean {
  return diagnostic.source?.fileName != null
    && sourcePathMatchesFileName(diagnostic.source.fileName, fileName);
}

function typeSystemDiagnosticSourceCacheKey(
  typeSystem: TypeSystemProject,
  fileName: string,
  sourceFile: ts.SourceFile | null,
): string {
  if (sourceFile != null) {
    return sourceFile.fileName.replace(/\\/g, '/');
  }
  if (
    typeSystem.configFilePath != null
    && sourcePathMatchesFileName(typeSystem.configFilePath, fileName)
  ) {
    return typeSystem.configFilePath.replace(/\\/g, '/');
  }
  return fileName.replace(/\\/g, '/');
}
