import type {
  StructuralClaimGraphRuntime,
  StructuralClaimId,
} from './structural-claim-graph.js';

export const STRUCTURAL_PATH_EVALUATOR_IDS = [
  'file-path-deterministic-ceiling',
] as const;

export const STRUCTURAL_OPERATIONAL_TIERS = [
  'source-analyzable',
  'type-assisted',
  'runtime-only',
] as const;

export const STRUCTURAL_PATH_EVALUATION_STATUSES = [
  'supported',
  'blocked',
  'unclaimed',
] as const;

export type StructuralPathEvaluatorId =
  typeof STRUCTURAL_PATH_EVALUATOR_IDS[number];

export type StructuralOperationalTier =
  typeof STRUCTURAL_OPERATIONAL_TIERS[number];

export type StructuralPathEvaluationStatus =
  typeof STRUCTURAL_PATH_EVALUATION_STATUSES[number];

export interface StructuralPathBlockerReason {
  readonly code:
    | 'file-not-produced'
    | 'file-not-in-project-graph'
    | 'unresolved-relative-imports';
  readonly message: string;
  readonly claimIds: readonly StructuralClaimId[];
}

export interface StructuralPathEvaluation {
  readonly evaluatorId: StructuralPathEvaluatorId;
  readonly path: string;
  readonly status: StructuralPathEvaluationStatus;
  readonly operationalAnalyzabilityTier: StructuralOperationalTier | null;
  readonly supportingClaimIds: readonly StructuralClaimId[];
  readonly blockerReasons: readonly StructuralPathBlockerReason[];
}

export function evaluateFilePathStructuralClaims(
  runtime: StructuralClaimGraphRuntime,
  filePath: string,
): StructuralPathEvaluation {
  // TODO: Extend this into a real path evaluator with checker-backed blocker
  // reasons such as typed residuals, alias/export opacity, and runtime-only
  // registration/value flow once the shared semantic claim layer lands.
  const sourceFileClaim = runtime.index.sourceFileByPath.get(filePath);
  if (!sourceFileClaim) {
    return {
      evaluatorId: 'file-path-deterministic-ceiling',
      path: filePath,
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
    status: 'supported',
    operationalAnalyzabilityTier: 'source-analyzable',
    supportingClaimIds,
    blockerReasons: [],
  };
}
