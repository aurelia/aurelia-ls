export const SemanticRuntimeSurfaceKind = Object.freeze({
  RuntimeIndex: 1,
  SemanticRuntime: 2,
  QuestionRoute: 3,
  WorldFrame: 4,
  BoundaryRoutes: 5,
  BoundaryRouter: 6,
  BoundaryConsequenceBasis: 7,
  BoundaryPorts: 8,
  ClaimModel: 9,
  SemanticApiModel: 10,
  WorldContextHandoff: 11,
  SubstrateReader: 12,
  EvaluatorReadPort: 13,
  AnswerAssembler: 14
} as const);

export type SemanticRuntimeSurfaceKind =
  (typeof SemanticRuntimeSurfaceKind)[keyof typeof SemanticRuntimeSurfaceKind];

export const SemanticRuntimeVerificationPocketKind = Object.freeze({
  RuntimeReadFacadeAndServices: 1,
  BoundaryRoutingAndDeferredOwnerPorts: 2,
  ReplayObservabilityAndAIDebug: 3,
  ModelQueryAnswerCore: 4,
  WorkspaceCurrentWorldHandoff: 5,
  SubstrateAndEvaluatorRead: 6
} as const);

export type SemanticRuntimeVerificationPocketKind =
  (typeof SemanticRuntimeVerificationPocketKind)[keyof typeof SemanticRuntimeVerificationPocketKind];

export const VerificationProofClassKind = Object.freeze({
  ContractProof: 1,
  SeamProof: 2,
  ContinuityRegression: 3,
  OperatorPressureDiscovery: 4
} as const);

export type VerificationProofClassKind =
  (typeof VerificationProofClassKind)[keyof typeof VerificationProofClassKind];

export const VerificationBasisKind = Object.freeze({
  CleanRoomSubjectOracle: 1,
  AdmittedSubjectEmpirical: 2,
  InventedProductObligation: 3,
  ContinuityRegression: 4,
  OperatorPressureDiscovery: 5
} as const);

export type VerificationBasisKind =
  (typeof VerificationBasisKind)[keyof typeof VerificationBasisKind];

export const ClosureStatusKind = Object.freeze({
  Closed: 1,
  Qualified: 2,
  Partial: 3,
  Open: 4,
  Retreat: 5,
  OpaqueCarried: 6
} as const);

export type ClosureStatusKind =
  (typeof ClosureStatusKind)[keyof typeof ClosureStatusKind];

export const ReentryAreaKind = Object.freeze({
  ProjectionAndNaming: 1,
  VerificationBurden: 2,
  IntrospectionArchitecture: 3,
  SubjectOracle: 4,
  ToolingJoinSurface: 5
} as const);

export type ReentryAreaKind =
  (typeof ReentryAreaKind)[keyof typeof ReentryAreaKind];
