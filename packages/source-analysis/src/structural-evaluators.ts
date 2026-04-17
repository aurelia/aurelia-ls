import type {
  StructuralClaimGraphRuntime,
  StructuralClaimId,
} from './structural-claim-graph.js';
import {
  STRUCTURAL_OPERATIONAL_ANALYZABILITY_TIER_IDS,
  type StructuralOperationalAnalyzabilityTierId,
} from './operational-analyzability.js';

export const STRUCTURAL_PATH_EVALUATOR_IDS = [
  'file-path-deterministic-ceiling',
] as const;

export const STRUCTURAL_OPERATIONAL_TIERS =
  STRUCTURAL_OPERATIONAL_ANALYZABILITY_TIER_IDS;

export const STRUCTURAL_PATH_SOURCE_COVERAGE_IDS = [
  'source-backed',
  'repo-blindspot',
  'not-in-repo-scan',
] as const;

export const STRUCTURAL_PATH_EVALUATION_STATUSES = [
  'supported',
  'blocked',
  'unclaimed',
] as const;

export type StructuralPathEvaluatorId =
  typeof STRUCTURAL_PATH_EVALUATOR_IDS[number];

export type StructuralOperationalTier =
  StructuralOperationalAnalyzabilityTierId;

export type StructuralPathSourceCoverageId =
  typeof STRUCTURAL_PATH_SOURCE_COVERAGE_IDS[number];

export type StructuralPathEvaluationStatus =
  typeof STRUCTURAL_PATH_EVALUATION_STATUSES[number];

export interface StructuralPathBlockerReason {
  readonly code:
    | 'file-not-produced'
    | 'file-outside-tsconfig'
    | 'file-not-in-project-graph'
    | 'unresolved-relative-imports';
  readonly message: string;
  readonly claimIds: readonly StructuralClaimId[];
}

export interface StructuralPathEvaluationOptions {
  readonly repoSourceFiles?: readonly string[];
}

export interface StructuralPathEvaluation {
  readonly evaluatorId: StructuralPathEvaluatorId;
  readonly path: string;
  readonly sourceCoverage: StructuralPathSourceCoverageId;
  readonly status: StructuralPathEvaluationStatus;
  readonly operationalAnalyzabilityTier: StructuralOperationalTier | null;
  readonly supportingClaimIds: readonly StructuralClaimId[];
  readonly blockerReasons: readonly StructuralPathBlockerReason[];
}

export function evaluateFilePathStructuralClaims(
  runtime: StructuralClaimGraphRuntime,
  filePath: string,
  options: StructuralPathEvaluationOptions = {},
): StructuralPathEvaluation {
  const sourceFileClaim = runtime.index.sourceFileByPath.get(filePath);
  if (!sourceFileClaim) {
    if (options.repoSourceFiles?.includes(filePath)) {
      return {
        evaluatorId: 'file-path-deterministic-ceiling',
        path: filePath,
        sourceCoverage: 'repo-blindspot',
        status: 'blocked',
        operationalAnalyzabilityTier: null,
        supportingClaimIds: [],
        blockerReasons: [{
          code: 'file-outside-tsconfig',
          message: `${filePath} exists in the repo source scan but is not admitted by any loaded tsconfig/project claim.`,
          claimIds: [],
        }],
      };
    }

    return {
      evaluatorId: 'file-path-deterministic-ceiling',
      path: filePath,
      sourceCoverage: 'not-in-repo-scan',
      status: 'unclaimed',
      operationalAnalyzabilityTier: null,
      supportingClaimIds: [],
      blockerReasons: [{
        code: 'file-not-produced',
        message: `${filePath} was not produced by the current structural source-file catalog.`,
        claimIds: [],
      }],
    };
  }

  const projectClaims = runtime.index.projectSourceFilesByFilePath.get(filePath) ?? [];
  const supportingClaimIds = [
    sourceFileClaim.id,
    ...projectClaims.map((claim) => claim.id),
  ];
  if (projectClaims.length === 0) {
    return {
      evaluatorId: 'file-path-deterministic-ceiling',
      path: filePath,
      sourceCoverage: 'source-backed',
      status: 'blocked',
      operationalAnalyzabilityTier: null,
      supportingClaimIds,
      blockerReasons: [{
        code: 'file-not-in-project-graph',
        message: `${filePath} is present in the source-file catalog but not admitted by any loaded tsconfig/project claim.`,
        claimIds: [sourceFileClaim.id],
      }],
    };
  }

  const unresolvedImportIds: StructuralClaimId[] = [];
  for (const importClaim of runtime.index.importsBySourceFilePath.get(filePath) ?? []) {
    const resolution = runtime.index.resolutionByImportId.get(importClaim.id);
    if (resolution?.attributes.status === 'unresolved') {
      unresolvedImportIds.push(importClaim.id, resolution.id);
    }
  }

  if (unresolvedImportIds.length > 0) {
    return {
      evaluatorId: 'file-path-deterministic-ceiling',
      path: filePath,
      sourceCoverage: 'source-backed',
      status: 'blocked',
      operationalAnalyzabilityTier: null,
      supportingClaimIds,
      blockerReasons: [{
        code: 'unresolved-relative-imports',
        message: `${filePath} still has unresolved relative imports, so the structural ceiling cannot honestly close on it yet.`,
        claimIds: unresolvedImportIds,
      }],
    };
  }

  return {
    evaluatorId: 'file-path-deterministic-ceiling',
    path: filePath,
    sourceCoverage: 'source-backed',
    status: 'supported',
    operationalAnalyzabilityTier: 'source-analyzable',
    supportingClaimIds,
    blockerReasons: [],
  };
}
