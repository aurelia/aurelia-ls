export {
  STRUCTURAL_CLAIM_GRAPH_VERSION,
  STRUCTURAL_CLAIM_KINDS,
  STRUCTURAL_PRODUCER_IDS,
  buildStructuralClaimGraph,
  indexStructuralClaimGraph,
} from '../structural-claim-graph.js';
export type {
  StructuralClaim,
  StructuralClaimGraph,
  StructuralClaimGraphIndex,
  StructuralClaimGraphOptions,
  StructuralClaimGraphRuntime,
  StructuralClaimId,
  StructuralClaimKind,
  StructuralClaimProvenance,
  StructuralDeclarationKind,
  StructuralProducerId,
  RepoClaim,
  PackageClaim,
  PackageEntrypointClaim,
  TsconfigClaim,
  SourceFileClaim,
  ProjectSourceFileClaim,
  ImportClaim,
  ImportBindingClaim,
  ResolutionClaim,
  ExportObservationClaim,
  DeclarationClaim,
  MemberClaim,
  TypeReferenceClaim,
  ClaimEvidenceBasis,
  ImportObservationKind,
  ExportObservationKind,
  ResolutionStatus,
} from '../structural-claim-graph.js';

export {
  STRUCTURAL_OPERATIONAL_TIERS,
  STRUCTURAL_PATH_EVALUATION_STATUSES,
  STRUCTURAL_PATH_EVALUATOR_IDS,
  evaluateFilePathStructuralClaims,
} from '../structural-evaluators.js';
export type {
  StructuralOperationalTier,
  StructuralPathBlockerReason,
  StructuralPathEvaluation,
  StructuralPathEvaluationStatus,
  StructuralPathEvaluatorId,
} from '../structural-evaluators.js';

export {
  collectCrossPartitionTypeRefSummaries,
  collectPartitionBindingPressure,
  collectPartitionBindingSeams,
  collectPartitionTypeRefPressure,
  resolvePartitionRef,
} from '../partition-coupling.js';
export type {
  CrossPartitionTypeRefSummary,
  PartitionBindingSeamSummary,
  PartitionCouplingPressure,
  PartitionRef,
} from '../partition-coupling.js';

export {
  collectBindingSeams,
  collectCrossSubsystemTypeRefSummaries,
  collectSubsystemBindingPressure,
  collectSubsystemTypeRefPressure,
} from '../subsystem-coupling.js';
export type {
  BindingSeamSummary,
  CrossSubsystemTypeRefSummary,
  SubsystemCouplingPressure,
} from '../subsystem-coupling.js';
