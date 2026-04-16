import type {
  PackageStructuralDiagnostics,
  StructuralFileDiagnostics,
  StructuralFunctionFact,
  StructuralInterfaceFact,
} from './structural-diagnostics.js';
import {
  createPackageStructuralDiagnostics,
  getStructuralFilesByFunctionRole,
} from './structural-diagnostics.js';

export interface CoordinationFunctionSurface {
  readonly name: string;
  readonly line: number;
}

export interface CoordinationInterfaceSurface {
  readonly name: string;
  readonly line: number;
  readonly propertyKeys: readonly string[];
}

export interface FileCoordinationSurface {
  readonly filePath: string;
  readonly envelopeBuilderFunctions: readonly CoordinationFunctionSurface[];
  readonly envelopeWrapperFunctions: readonly CoordinationFunctionSurface[];
  readonly cardLikeInterfaces: readonly CoordinationInterfaceSurface[];
  readonly refLikeInterfaces: readonly CoordinationInterfaceSurface[];
  readonly cardObjectLiteralLines: readonly number[];
  readonly summaryLineSites: readonly number[];
}

export interface PackageCoordinationSurface {
  readonly files: readonly FileCoordinationSurface[];
  readonly answerBuilderFiles: readonly FileCoordinationSurface[];
  readonly presentationCarrierFiles: readonly FileCoordinationSurface[];
}

export function createPackageCoordinationSurface(
  repoPath: string,
  packageFiles: readonly string[],
): PackageCoordinationSurface {
  return coordinationSurfaceFromStructuralDiagnostics(
    createPackageStructuralDiagnostics(repoPath, packageFiles),
  );
}

export function coordinationSurfaceFromStructuralDiagnostics(
  diagnostics: PackageStructuralDiagnostics,
): PackageCoordinationSurface {
  const files = diagnostics.files
    .map(mapStructuralFileToCoordinationSurface)
    .filter((surface): surface is FileCoordinationSurface => surface !== null);

  return {
    files,
    answerBuilderFiles: getStructuralFilesByFunctionRole(
      diagnostics,
      'answer-envelope-builder',
    ).map((file) => mapStructuralFileToCoordinationSurface(file)).filter(Boolean) as FileCoordinationSurface[],
    presentationCarrierFiles: files.filter((file) =>
      file.cardLikeInterfaces.length > 0
      && file.refLikeInterfaces.length > 0
      && file.cardObjectLiteralLines.length > 0,
    ),
  };
}

function mapStructuralFileToCoordinationSurface(
  file: StructuralFileDiagnostics,
): FileCoordinationSurface | null {
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
  functions: readonly StructuralFunctionFact[],
  role: 'answer-envelope-builder' | 'answer-envelope-wrapper',
): readonly CoordinationFunctionSurface[] {
  return functions
    .filter((fn) => fn.roles.includes(role))
    .map((fn) => ({ name: fn.name, line: fn.line }));
}

function mapInterfacesByRole(
  interfaces: readonly StructuralInterfaceFact[],
  role: 'card-like' | 'ref-like',
): readonly CoordinationInterfaceSurface[] {
  return interfaces
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      name: item.name,
      line: item.line,
      propertyKeys: item.propertyKeys,
    }));
}
