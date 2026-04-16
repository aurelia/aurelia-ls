import type {
  SourceAnalysisPackageStructuralDiagnostics,
  SourceAnalysisStructuralFileDiagnostics,
  SourceAnalysisStructuralFunctionFact,
  SourceAnalysisStructuralInterfaceFact,
} from './structural-diagnostics.js';
import {
  createSourceAnalysisPackageStructuralDiagnostics,
  getSourceAnalysisStructuralFilesByFunctionRole,
} from './structural-diagnostics.js';

export interface SourceAnalysisCoordinationFunctionSurface {
  readonly name: string;
  readonly line: number;
}

export interface SourceAnalysisCoordinationInterfaceSurface {
  readonly name: string;
  readonly line: number;
  readonly propertyKeys: readonly string[];
}

export interface SourceAnalysisFileCoordinationSurface {
  readonly filePath: string;
  readonly envelopeBuilderFunctions: readonly SourceAnalysisCoordinationFunctionSurface[];
  readonly envelopeWrapperFunctions: readonly SourceAnalysisCoordinationFunctionSurface[];
  readonly cardLikeInterfaces: readonly SourceAnalysisCoordinationInterfaceSurface[];
  readonly refLikeInterfaces: readonly SourceAnalysisCoordinationInterfaceSurface[];
  readonly cardObjectLiteralLines: readonly number[];
  readonly summaryLineSites: readonly number[];
}

export interface SourceAnalysisPackageCoordinationSurface {
  readonly files: readonly SourceAnalysisFileCoordinationSurface[];
  readonly answerBuilderFiles: readonly SourceAnalysisFileCoordinationSurface[];
  readonly presentationCarrierFiles: readonly SourceAnalysisFileCoordinationSurface[];
}

export function createSourceAnalysisPackageCoordinationSurface(
  repoPath: string,
  packageFiles: readonly string[],
): SourceAnalysisPackageCoordinationSurface {
  return coordinationSurfaceFromStructuralDiagnostics(
    createSourceAnalysisPackageStructuralDiagnostics(repoPath, packageFiles),
  );
}

export function coordinationSurfaceFromStructuralDiagnostics(
  diagnostics: SourceAnalysisPackageStructuralDiagnostics,
): SourceAnalysisPackageCoordinationSurface {
  const files = diagnostics.files
    .map(mapStructuralFileToCoordinationSurface)
    .filter((surface): surface is SourceAnalysisFileCoordinationSurface => surface !== null);

  return {
    files,
    answerBuilderFiles: getSourceAnalysisStructuralFilesByFunctionRole(
      diagnostics,
      'answer-envelope-builder',
    ).map((file) => mapStructuralFileToCoordinationSurface(file)).filter(Boolean) as SourceAnalysisFileCoordinationSurface[],
    presentationCarrierFiles: files.filter((file) =>
      file.cardLikeInterfaces.length > 0
      && file.refLikeInterfaces.length > 0
      && file.cardObjectLiteralLines.length > 0,
    ),
  };
}

function mapStructuralFileToCoordinationSurface(
  file: SourceAnalysisStructuralFileDiagnostics,
): SourceAnalysisFileCoordinationSurface | null {
  const envelopeBuilderFunctions = mapFunctionsByRole(file.functions, 'answer-envelope-builder');
  const envelopeWrapperFunctions = mapFunctionsByRole(file.functions, 'answer-envelope-wrapper');
  const cardLikeInterfaces = mapInterfacesByRole(file.interfaces, 'card-like');
  const refLikeInterfaces = mapInterfacesByRole(file.interfaces, 'ref-like');
  const cardObjectLiteralLines = file.objectLiterals
    .filter((item) => item.roles.includes('card-like'))
    .map((item) => item.line)
    .sort((left, right) => left - right);

  if (
    envelopeBuilderFunctions.length === 0
    && envelopeWrapperFunctions.length === 0
    && cardLikeInterfaces.length === 0
    && refLikeInterfaces.length === 0
    && cardObjectLiteralLines.length === 0
    && file.summaryLineSites.length === 0
  ) {
    return null;
  }

  return {
    filePath: file.filePath,
    envelopeBuilderFunctions,
    envelopeWrapperFunctions,
    cardLikeInterfaces,
    refLikeInterfaces,
    cardObjectLiteralLines,
    summaryLineSites: file.summaryLineSites,
  };
}

function mapFunctionsByRole(
  functions: readonly SourceAnalysisStructuralFunctionFact[],
  role: 'answer-envelope-builder' | 'answer-envelope-wrapper',
): readonly SourceAnalysisCoordinationFunctionSurface[] {
  return functions
    .filter((fn) => fn.roles.includes(role))
    .map((fn) => ({ name: fn.name, line: fn.line }));
}

function mapInterfacesByRole(
  interfaces: readonly SourceAnalysisStructuralInterfaceFact[],
  role: 'card-like' | 'ref-like',
): readonly SourceAnalysisCoordinationInterfaceSurface[] {
  return interfaces
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      name: item.name,
      line: item.line,
      propertyKeys: item.propertyKeys,
    }));
}
