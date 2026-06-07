import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  appBuilderOntologyStatus,
  type AppBuilderOntologyStatus,
} from './status.js';
import {
  appBuilderEnumValues,
} from './detail-helpers.js';
import {
  AppBuilderControlManifestKind,
  AppBuilderControlManifestRowId,
} from './control.js';
import {
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectRole,
  ExpectedSemanticEffectScope,
  ExpectedSemanticEffectTopologyNodeKind,
} from '../../fixture-verification/expected-effect.js';
import {
  SourcePlanBuildToolPolicy,
  SourcePlanPackageDependencyScope,
  SourcePlanPackageManager,
  SourcePlanProjectToolingFileKind,
  SourcePlanProjectToolingLanguage,
} from '../../source-plan/package-tooling.js';
import {
  SourcePlanConflictPolicy,
  SourcePlanContributionKind,
  SourcePlanContributionOriginKind,
  SourcePlanEditKind,
  SourcePlanFileRole,
  SourcePlanFormattingPolicy,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanPackageToolingPolicy,
  SourcePlanTextAuthority,
} from '../../source-plan/source-plan.js';

/** Boundary where an app-builder effect contract can be witnessed. */
export enum AppBuilderEffectBoundary {
  /** Before host writes, by inspecting SourcePlan files, policy, and contributions. */
  SourcePlan = 'source-plan',
  /** After source is applied, by reopening through semantic-runtime app queries. */
  SemanticRuntimeReopen = 'semantic-runtime-reopen',
  /** Through the canonical component/control manifest substrate. */
  ComponentControlManifest = 'component-control-manifest',
  /** Through deterministic existing-app analysis facts. */
  ExistingAppAnalysis = 'existing-app-analysis',
}

/** Stable value list for app-builder effect boundary transport schemas. */
export const APP_BUILDER_EFFECT_BOUNDARIES = [
  AppBuilderEffectBoundary.SourcePlan,
  AppBuilderEffectBoundary.SemanticRuntimeReopen,
  AppBuilderEffectBoundary.ComponentControlManifest,
  AppBuilderEffectBoundary.ExistingAppAnalysis,
] as const;

/** Witness family that can inspect or prove an effect contract at its declared boundary. */
export enum AppBuilderEffectWitnessKind {
  /** SourcePlan file artifacts, roles, edit policy, and complete-text state. */
  SourcePlanFile = 'source-plan-file',
  /** SourcePlan import/source-fragment contributions and their origins. */
  SourcePlanContribution = 'source-plan-contribution',
  /** ExpectedSemanticEffect rows that can be checked after reopening. */
  ExpectedSemanticEffect = 'expected-semantic-effect',
  /** Public semantic-runtime app-query rows after source is reopened. */
  SemanticRuntimeQueryRow = 'semantic-runtime-query-row',
  /** Canonical component/control manifest or control-use rows. */
  ComponentControlManifestRow = 'component-control-manifest-row',
  /** Deterministic facts from workspace/app analysis, not inferred business intent. */
  DeterministicAppFact = 'deterministic-app-fact',
}

/** Stable value list for app-builder effect witness transport schemas. */
export const APP_BUILDER_EFFECT_WITNESS_KINDS = [
  AppBuilderEffectWitnessKind.SourcePlanFile,
  AppBuilderEffectWitnessKind.SourcePlanContribution,
  AppBuilderEffectWitnessKind.ExpectedSemanticEffect,
  AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
  AppBuilderEffectWitnessKind.ComponentControlManifestRow,
  AppBuilderEffectWitnessKind.DeterministicAppFact,
] as const;

/** Stable source surface where an app-builder effect witness can be inspected. */
export enum AppBuilderEffectWitnessSurface {
  /** SourcePlan policy envelope before host writes files. */
  SourcePlanPolicy = 'source-plan-policy',
  /** SourcePlan file artifact rows before host writes files. */
  SourcePlanFileArtifacts = 'source-plan-file-artifacts',
  /** SourcePlan contribution rows attached to file artifacts. */
  SourcePlanContributions = 'source-plan-contributions',
  /** SourcePlan project/tooling envelope beside app source files. */
  SourcePlanProjectTooling = 'source-plan-project-tooling',
  /** ExpectedSemanticEffect rows carried by fixtures or source-plan previews. */
  ExpectedSemanticEffects = 'expected-semantic-effects',
  /** Public semantic-runtime app-query rows observed after reopening generated source. */
  SemanticRuntimeAppQueryRows = 'semantic-runtime-app-query-rows',
  /** App-builder component/control manifest rows. */
  ComponentControlManifestRows = 'component-control-manifest-rows',
  /** Deterministic existing-app facts from semantic-runtime project/app analysis. */
  ExistingAppDeterministicFacts = 'existing-app-deterministic-facts',
}

/** Stable value list for app-builder effect witness source-surface transport schemas. */
export const APP_BUILDER_EFFECT_WITNESS_SURFACES = [
  AppBuilderEffectWitnessSurface.SourcePlanPolicy,
  AppBuilderEffectWitnessSurface.SourcePlanFileArtifacts,
  AppBuilderEffectWitnessSurface.SourcePlanContributions,
  AppBuilderEffectWitnessSurface.SourcePlanProjectTooling,
  AppBuilderEffectWitnessSurface.ExpectedSemanticEffects,
  AppBuilderEffectWitnessSurface.SemanticRuntimeAppQueryRows,
  AppBuilderEffectWitnessSurface.ComponentControlManifestRows,
  AppBuilderEffectWitnessSurface.ExistingAppDeterministicFacts,
] as const;

/** Field-level witness vocabulary for effect contracts. */
export enum AppBuilderEffectWitnessFieldId {
  /** SourcePlan root directory supplied by caller/host policy. */
  SourcePlanRootDir = 'source-plan-root-dir',
  /** SourcePlan conflict policy for file application. */
  SourcePlanConflictPolicy = 'source-plan-conflict-policy',
  /** SourcePlan formatting policy for generated or host-owned text. */
  SourcePlanFormattingPolicy = 'source-plan-formatting-policy',
  /** SourcePlan package/build/tooling ownership policy. */
  SourcePlanPackageToolingPolicy = 'source-plan-package-tooling-policy',
  /** Whether every planned source and tooling file carries complete text. */
  SourcePlanHasCompleteFileText = 'source-plan-has-complete-file-text',
  /** Project-relative SourcePlan file path. */
  SourcePlanFilePath = 'source-plan-file-path',
  /** App-topology role of a SourcePlan file. */
  SourcePlanFileRole = 'source-plan-file-role',
  /** Source language of a SourcePlan file. */
  SourcePlanFileLanguage = 'source-plan-file-language',
  /** File-level edit shape before host conflict resolution. */
  SourcePlanFileEditKind = 'source-plan-file-edit-kind',
  /** Source operation that caused a SourcePlan file artifact to exist. */
  SourcePlanFileOperationKind = 'source-plan-file-operation-kind',
  /** Who owns concrete SourcePlan file text. */
  SourcePlanFileTextAuthority = 'source-plan-file-text-authority',
  /** SourcePlan contribution family attached to a file. */
  SourcePlanContributionKind = 'source-plan-contribution-kind',
  /** Origin family for a SourcePlan contribution. */
  SourcePlanContributionOriginKind = 'source-plan-contribution-origin-kind',
  /** TypeScript module specifier required by a SourcePlan import contribution. */
  SourcePlanImportModuleSpecifier = 'source-plan-import-module-specifier',
  /** App-builder part identity carried by a SourcePlan contribution origin. */
  SourcePlanAppBuilderPartOrigin = 'source-plan-app-builder-part-origin',
  /** App-builder source-lowering target identity carried by a SourcePlan contribution origin. */
  SourcePlanAppBuilderSourceLoweringOrigin = 'source-plan-app-builder-source-lowering-origin',
  /** Aurelia configuration admission carried by a SourcePlan contribution origin. */
  SourcePlanConfigurationAdmissionOrigin = 'source-plan-configuration-admission-origin',
  /** SourcePlan package manager ownership. */
  SourcePlanPackageManager = 'source-plan-package-manager',
  /** SourcePlan build-tool ownership. */
  SourcePlanBuildToolPolicy = 'source-plan-build-tool-policy',
  /** SourcePlan package dependency scope. */
  SourcePlanPackageDependencyScope = 'source-plan-package-dependency-scope',
  /** SourcePlan project tooling file kind. */
  SourcePlanProjectToolingFileKind = 'source-plan-project-tooling-file-kind',
  /** SourcePlan project tooling file language. */
  SourcePlanProjectToolingLanguage = 'source-plan-project-tooling-language',
  /** Semantic fact family expected after reopening generated source. */
  ExpectedSemanticEffectKind = 'expected-semantic-effect-kind',
  /** Broad semantic effect scope. */
  ExpectedSemanticEffectScope = 'expected-semantic-effect-scope',
  /** App topology node kind associated with an expected effect. */
  ExpectedSemanticEffectTopologyNodeKind = 'expected-semantic-effect-topology-node-kind',
  /** Cardinality rule for matching reopened app facts. */
  ExpectedSemanticEffectCardinality = 'expected-semantic-effect-cardinality',
  /** Whether an expected effect is baseline, signature, or discriminator evidence. */
  ExpectedSemanticEffectRole = 'expected-semantic-effect-role',
  /** Stable target key for grouping an expected effect. */
  ExpectedSemanticEffectSemanticTargetKey = 'expected-semantic-effect-semantic-target-key',
  /** Field/value predicate over row-shaped expected effect facts. */
  ExpectedSemanticEffectFilter = 'expected-semantic-effect-filter',
  /** Public semantic-runtime query family used as reopen evidence. */
  SemanticRuntimeQueryFamily = 'semantic-runtime-query-family',
  /** Component/control manifest row identity. */
  ControlManifestRowId = 'control-manifest-row-id',
  /** Component/control manifest kind. */
  ControlManifestKind = 'control-manifest-kind',
  /** Deterministic existing-app fact source family. */
  ExistingAppFactSource = 'existing-app-fact-source',
}

/** Stable value list for app-builder effect witness field transport schemas. */
export const APP_BUILDER_EFFECT_WITNESS_FIELD_IDS = [
  AppBuilderEffectWitnessFieldId.SourcePlanRootDir,
  AppBuilderEffectWitnessFieldId.SourcePlanConflictPolicy,
  AppBuilderEffectWitnessFieldId.SourcePlanFormattingPolicy,
  AppBuilderEffectWitnessFieldId.SourcePlanPackageToolingPolicy,
  AppBuilderEffectWitnessFieldId.SourcePlanHasCompleteFileText,
  AppBuilderEffectWitnessFieldId.SourcePlanFilePath,
  AppBuilderEffectWitnessFieldId.SourcePlanFileRole,
  AppBuilderEffectWitnessFieldId.SourcePlanFileLanguage,
  AppBuilderEffectWitnessFieldId.SourcePlanFileEditKind,
  AppBuilderEffectWitnessFieldId.SourcePlanFileOperationKind,
  AppBuilderEffectWitnessFieldId.SourcePlanFileTextAuthority,
  AppBuilderEffectWitnessFieldId.SourcePlanContributionKind,
  AppBuilderEffectWitnessFieldId.SourcePlanContributionOriginKind,
  AppBuilderEffectWitnessFieldId.SourcePlanImportModuleSpecifier,
  AppBuilderEffectWitnessFieldId.SourcePlanAppBuilderPartOrigin,
  AppBuilderEffectWitnessFieldId.SourcePlanAppBuilderSourceLoweringOrigin,
  AppBuilderEffectWitnessFieldId.SourcePlanConfigurationAdmissionOrigin,
  AppBuilderEffectWitnessFieldId.SourcePlanPackageManager,
  AppBuilderEffectWitnessFieldId.SourcePlanBuildToolPolicy,
  AppBuilderEffectWitnessFieldId.SourcePlanPackageDependencyScope,
  AppBuilderEffectWitnessFieldId.SourcePlanProjectToolingFileKind,
  AppBuilderEffectWitnessFieldId.SourcePlanProjectToolingLanguage,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectKind,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectScope,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectTopologyNodeKind,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectCardinality,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectRole,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectSemanticTargetKey,
  AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectFilter,
  AppBuilderEffectWitnessFieldId.SemanticRuntimeQueryFamily,
  AppBuilderEffectWitnessFieldId.ControlManifestRowId,
  AppBuilderEffectWitnessFieldId.ControlManifestKind,
  AppBuilderEffectWitnessFieldId.ExistingAppFactSource,
] as const;

/** Source-backed field that can help prove or inspect an effect witness. */
export interface AppBuilderEffectWitnessFieldDescriptor {
  /** Stable field id for filtering and coverage. */
  readonly fieldId: AppBuilderEffectWitnessFieldId;
  /** Source/API path where this field is expected to appear. */
  readonly sourcePath: string;
  /** Short display title for the witness field. */
  readonly title: string;
  /** What this field proves or constrains. */
  readonly summary: string;
  /** Optional stable value set when the field is enum-backed. */
  readonly valueSet?: readonly string[];
}

/** Read-only descriptor for a witness family named by an effect contract. */
export interface AppBuilderEffectWitnessDescriptorRow {
  /** Witness family kind named by effect contracts. */
  readonly kind: AppBuilderEffectWitnessKind;
  /** Boundary where this witness family is meaningful. */
  readonly boundary: AppBuilderEffectBoundary;
  /** Source surfaces that should expose this witness. */
  readonly surfaces: readonly AppBuilderEffectWitnessSurface[];
  /** Short display title for this witness family. */
  readonly title: string;
  /** What this witness family proves, and what it does not prove. */
  readonly summary: string;
  /** Source/API fields that make this witness inspectable. */
  readonly fields: readonly AppBuilderEffectWitnessFieldDescriptor[];
}

/** Stable witness descriptors that make effect contracts concrete without lowering source. */
export const APP_BUILDER_EFFECT_WITNESS_DESCRIPTOR_ROWS: readonly AppBuilderEffectWitnessDescriptorRow[] = [
  {
    kind: AppBuilderEffectWitnessKind.SourcePlanFile,
    boundary: AppBuilderEffectBoundary.SourcePlan,
    surfaces: [
      AppBuilderEffectWitnessSurface.SourcePlanPolicy,
      AppBuilderEffectWitnessSurface.SourcePlanFileArtifacts,
      AppBuilderEffectWitnessSurface.SourcePlanProjectTooling,
    ],
    title: 'SourcePlan File Artifact',
    summary: 'Inspects planned file artifacts, text authority, edit policy, project tooling, and complete-text state before any host writes files.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.SourcePlanRootDir, 'SourcePlan.rootDir', 'Root Directory', 'Caller/host root for planned source artifacts.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanConflictPolicy, 'SourcePlan.policy.conflictPolicy', 'Conflict Policy', 'Whether planned files must not exist, may replace generated files, or defer conflict resolution to the host.', appBuilderEnumValues(SourcePlanConflictPolicy)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFormattingPolicy, 'SourcePlan.policy.formattingPolicy', 'Formatting Policy', 'Whether generated text follows semantic-runtime/app-builder baselines or host/operator formatting.', appBuilderEnumValues(SourcePlanFormattingPolicy)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanPackageToolingPolicy, 'SourcePlan.policy.packageToolingPolicy', 'Package Tooling Policy', 'Whether package/build tooling is modeled, host-owned, or baseline-generated.', appBuilderEnumValues(SourcePlanPackageToolingPolicy)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanHasCompleteFileText, 'SourcePlan.hasCompleteFileText', 'Complete Text', 'Whether every planned source and tooling file has concrete text.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFilePath, 'SourcePlan.files[].path', 'File Path', 'Project-relative path of one planned source artifact.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFileRole, 'SourcePlan.files[].role', 'File Role', 'App-topology role expected for the planned file.', appBuilderEnumValues(SourcePlanFileRole)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFileLanguage, 'SourcePlan.files[].language', 'File Language', 'Source language of the planned file.', appBuilderEnumValues(SourcePlanLanguage)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFileEditKind, 'SourcePlan.files[].editKind', 'Edit Kind', 'File-level create/replace/upsert shape before host application.', appBuilderEnumValues(SourcePlanEditKind)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFileOperationKind, 'SourcePlan.files[].operationKind', 'Operation Kind', 'Source operation that caused this file artifact to exist.', appBuilderEnumValues(SourcePlanOperationKind)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanFileTextAuthority, 'SourcePlan.files[].text.authority', 'Text Authority', 'Who owns the concrete file text when text is present.', appBuilderEnumValues(SourcePlanTextAuthority)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanPackageManager, 'SourcePlan.projectTooling.packageManager', 'Package Manager', 'Package-manager ownership for generated project tooling.', appBuilderEnumValues(SourcePlanPackageManager)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanBuildToolPolicy, 'SourcePlan.projectTooling.buildToolPolicy', 'Build Tool Policy', 'Build-tool ownership for generated project tooling.', appBuilderEnumValues(SourcePlanBuildToolPolicy)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanPackageDependencyScope, 'SourcePlan.projectTooling.dependencies[].scope', 'Dependency Scope', 'Package dependency bucket for generated project tooling.', appBuilderEnumValues(SourcePlanPackageDependencyScope)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanProjectToolingFileKind, 'SourcePlan.projectTooling.files[].fileKind', 'Tooling File Kind', 'Kind of package/build/tooling artifact carried beside app source.', appBuilderEnumValues(SourcePlanProjectToolingFileKind)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanProjectToolingLanguage, 'SourcePlan.projectTooling.files[].language', 'Tooling File Language', 'Source language of a package/build/tooling artifact.', appBuilderEnumValues(SourcePlanProjectToolingLanguage)),
    ],
  },
  {
    kind: AppBuilderEffectWitnessKind.SourcePlanContribution,
    boundary: AppBuilderEffectBoundary.SourcePlan,
    surfaces: [AppBuilderEffectWitnessSurface.SourcePlanContributions],
    title: 'SourcePlan Contribution',
    summary: 'Inspects imports, fragments, and contribution origins so later source text can be traced to app-builder parts, app-builder source-lowering targets, or framework configuration admissions.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.SourcePlanContributionKind, 'SourcePlan.files[].contributions[].kind', 'Contribution Kind', 'Contribution family attached to a planned file.', appBuilderEnumValues(SourcePlanContributionKind)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanContributionOriginKind, 'SourcePlan.files[].contributions[].origin.kind', 'Origin Kind', 'Source of a contribution before concrete file spans exist.', appBuilderEnumValues(SourcePlanContributionOriginKind)),
      field(AppBuilderEffectWitnessFieldId.SourcePlanImportModuleSpecifier, 'SourcePlan.files[].contributions[].importRequirement.moduleSpecifier', 'Import Module Specifier', 'Static package/local import requirement contributed before final import assembly.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanAppBuilderPartOrigin, 'SourcePlan.files[].contributions[].origin.partKind/partId', 'Part Origin', 'App-builder part invocation identity that produced a fragment or import.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanAppBuilderSourceLoweringOrigin, 'SourcePlan.files[].contributions[].origin.targetKind/targetId', 'App-builder Source-Lowering Origin', 'App-builder ontology target identity that produced a composed source fragment.'),
      field(AppBuilderEffectWitnessFieldId.SourcePlanConfigurationAdmissionOrigin, 'SourcePlan.files[].contributions[].origin.admissionKind', 'Configuration Admission Origin', 'Framework configuration admission identity that produced a contribution.'),
    ],
  },
  {
    kind: AppBuilderEffectWitnessKind.ExpectedSemanticEffect,
    boundary: AppBuilderEffectBoundary.SemanticRuntimeReopen,
    surfaces: [AppBuilderEffectWitnessSurface.ExpectedSemanticEffects],
    title: 'Expected Semantic Effect',
    summary: 'Declares product-facing effects that generated source should satisfy after reopening, without using file snapshots as the verification authority.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectKind, 'ExpectedSemanticEffect.effectKind', 'Effect Kind', 'Semantic fact family the verifier should inspect.', appBuilderEnumValues(ExpectedSemanticEffectKind)),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectScope, 'ExpectedSemanticEffect.scope', 'Effect Scope', 'Broad scope used for reporting and verifier dispatch.', appBuilderEnumValues(ExpectedSemanticEffectScope)),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectTopologyNodeKind, 'ExpectedSemanticEffect.topologyNodeKind', 'Topology Node Kind', 'Optional app topology node this expectation belongs to.', appBuilderEnumValues(ExpectedSemanticEffectTopologyNodeKind)),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectCardinality, 'ExpectedSemanticEffect.cardinality', 'Cardinality', 'Count rule for matching reopened facts.', appBuilderEnumValues(ExpectedSemanticEffectCardinality)),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectRole, 'ExpectedSemanticEffect.role', 'Effect Role', 'Whether the expectation is baseline verification, signature evidence, or discriminator evidence.', appBuilderEnumValues(ExpectedSemanticEffectRole)),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectSemanticTargetKey, 'ExpectedSemanticEffect.semanticTargetKey', 'Semantic Target Key', 'Compact stable grouping key derived from effect kind, cardinality, count, and filters.'),
      field(AppBuilderEffectWitnessFieldId.ExpectedSemanticEffectFilter, 'ExpectedSemanticEffect.filters[]', 'Effect Filter', 'Field/value predicates for row-shaped fact families.'),
    ],
  },
  {
    kind: AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
    boundary: AppBuilderEffectBoundary.SemanticRuntimeReopen,
    surfaces: [AppBuilderEffectWitnessSurface.SemanticRuntimeAppQueryRows],
    title: 'Semantic-Runtime Query Row',
    summary: 'Uses public app-query rows after source is reopened; app-builder should not recreate private verification loops when a semantic-runtime query family exists.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.SemanticRuntimeQueryFamily, 'SemanticRuntimeAppQueryResult.value.rows', 'Query Family', 'Public semantic-runtime app-query family that observes a generated fact, such as resources, routes, binding data-flow, diagnostics, or open seams.'),
    ],
  },
  {
    kind: AppBuilderEffectWitnessKind.ComponentControlManifestRow,
    boundary: AppBuilderEffectBoundary.ComponentControlManifest,
    surfaces: [AppBuilderEffectWitnessSurface.ComponentControlManifestRows],
    title: 'Component/Control Manifest Row',
    summary: 'Uses the app-builder component/control manifest substrate for native-first controls, control-use inventory, and later external manifest projections.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.ControlManifestRowId, 'APP_BUILDER_CONTROL_MANIFEST_ROWS[].id', 'Manifest Row Id', 'Canonical component/control manifest row identity.', appBuilderEnumValues(AppBuilderControlManifestRowId)),
      field(AppBuilderEffectWitnessFieldId.ControlManifestKind, 'APP_BUILDER_CONTROL_MANIFEST_ROWS[].manifestKind', 'Manifest Kind', 'Whether a manifest row describes control patterns, control use, or component manifest facets.', appBuilderEnumValues(AppBuilderControlManifestKind)),
    ],
  },
  {
    kind: AppBuilderEffectWitnessKind.DeterministicAppFact,
    boundary: AppBuilderEffectBoundary.ExistingAppAnalysis,
    surfaces: [AppBuilderEffectWitnessSurface.ExistingAppDeterministicFacts],
    title: 'Deterministic Existing-App Fact',
    summary: 'Restricts existing-app app-builder input to facts semantic-runtime can prove, leaving domain inference and fit judgement to the calling AI.',
    fields: [
      field(AppBuilderEffectWitnessFieldId.ExistingAppFactSource, 'semantic-runtime app/workspace queries', 'Fact Source', 'Deterministic app facts such as resources, routes, plugin usage, conventions, DI registrations, state stores, diagnostics, or topology rows.'),
    ],
  },
];

/** Effect contract ids for app-builder moves before host writes happen. */
export enum AppBuilderEffectContractId {
  /** SourcePlan preview is the reviewable boundary for generated files and fragments. */
  SourcePlanPreview = 'source-plan-preview',
  /** Generated source should be reopenable through semantic-runtime app analysis. */
  SemanticRuntimeReopen = 'semantic-runtime-reopen',
  /** Generated and existing controls should publish canonical control/component manifest rows. */
  ComponentManifestPublication = 'component-manifest-publication',
  /** Generated inline controls should remain visible as control-use inventory. */
  ControlUseInventory = 'control-use-inventory',
  /** Existing-app workflows should feed only deterministic facts into app-builder policy. */
  ExistingAppFactRead = 'existing-app-fact-read',
}

/** Stable value list for effect-contract transport schemas. */
export const APP_BUILDER_EFFECT_CONTRACT_IDS = [
  AppBuilderEffectContractId.SourcePlanPreview,
  AppBuilderEffectContractId.SemanticRuntimeReopen,
  AppBuilderEffectContractId.ComponentManifestPublication,
  AppBuilderEffectContractId.ControlUseInventory,
  AppBuilderEffectContractId.ExistingAppFactRead,
] as const;

/** Return unique effect-contract ids while preserving first-seen contract order. */
export function appBuilderUniqueEffectContractIds(
  ids: readonly AppBuilderEffectContractId[],
): readonly AppBuilderEffectContractId[] {
  return [...new Set(ids)];
}

/** Read-only effect contract row for future app-builder lowerers. */
export interface AppBuilderEffectContractRow {
  /** Stable effect contract id. */
  readonly id: AppBuilderEffectContractId;
  /** Boundary where the effect is supposed to be witnessed. */
  readonly boundary: AppBuilderEffectBoundary;
  /** Witness families that can prove or inspect the effect. */
  readonly witnessKinds: readonly AppBuilderEffectWitnessKind[];
  /** Short display title for the effect contract. */
  readonly title: string;
  /** The promise app-builder should make before a source-producing row is trusted. */
  readonly summary: string;
  /** Whether this effect is currently modeled, source-lowerable, or deferred. */
  readonly status: AppBuilderOntologyStatus;
}

/** Initial effect contracts that keep source generation and verification separate. */
export const APP_BUILDER_EFFECT_CONTRACT_ROWS: readonly AppBuilderEffectContractRow[] = [
  {
    id: AppBuilderEffectContractId.SourcePlanPreview,
    boundary: AppBuilderEffectBoundary.SourcePlan,
    witnessKinds: [
      AppBuilderEffectWitnessKind.SourcePlanFile,
      AppBuilderEffectWitnessKind.SourcePlanContribution,
    ],
    title: 'SourcePlan Preview',
    summary: 'App-builder should emit SourcePlan artifacts and expected contributions before any host writes files.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderEffectContractId.SemanticRuntimeReopen,
    boundary: AppBuilderEffectBoundary.SemanticRuntimeReopen,
    witnessKinds: [
      AppBuilderEffectWitnessKind.ExpectedSemanticEffect,
      AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
    ],
    title: 'Semantic-Runtime Reopen',
    summary: 'Generated fixtures/apps should be verified by reopening through semantic-runtime contracts, not by app-builder-specific private verification loops.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Recommendable,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderEffectContractId.ComponentManifestPublication,
    boundary: AppBuilderEffectBoundary.ComponentControlManifest,
    witnessKinds: [
      AppBuilderEffectWitnessKind.ComponentControlManifestRow,
      AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
    ],
    title: 'Component Manifest Publication',
    summary: 'A canonical component/control manifest should be a semantic-runtime product that can later project to external manifest formats.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
      note: 'Generated source-lowering answers publish control-use rows; existing app inventory and wrapper/external component extraction are still deferred.',
    }),
  },
  {
    id: AppBuilderEffectContractId.ControlUseInventory,
    boundary: AppBuilderEffectBoundary.ComponentControlManifest,
    witnessKinds: [
      AppBuilderEffectWitnessKind.ComponentControlManifestRow,
      AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
    ],
    title: 'Control Use Inventory',
    summary: 'Inline native controls and wrapper controls should remain discoverable as control-use rows even when no marker attribute is present.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
  {
    id: AppBuilderEffectContractId.ExistingAppFactRead,
    boundary: AppBuilderEffectBoundary.ExistingAppAnalysis,
    witnessKinds: [
      AppBuilderEffectWitnessKind.DeterministicAppFact,
      AppBuilderEffectWitnessKind.SemanticRuntimeQueryRow,
    ],
    title: 'Existing App Fact Read',
    summary: 'Existing app extension should consume facts semantic-runtime can prove, then let the AI decide whether app-builder fits the codebase.',
    status: appBuilderOntologyStatus({
      modeled: true,
      sourceLoweringImplemented: false,
      recommendationStatus: AppBuilderRecommendationStatus.Contextual,
      requiresExplicitInput: false,
      reasonAuthority: AppBuilderOntologyReasonAuthority.OperatorConfirmed,
    }),
  },
];

/** Return witness descriptors for selected witness families in declaration order. */
export function appBuilderEffectWitnessDescriptorsForKinds(
  kinds: readonly AppBuilderEffectWitnessKind[],
): readonly AppBuilderEffectWitnessDescriptorRow[] {
  const selectedKinds = new Set(kinds);
  return APP_BUILDER_EFFECT_WITNESS_DESCRIPTOR_ROWS.filter((row) =>
    selectedKinds.has(row.kind)
  );
}

function field(
  fieldId: AppBuilderEffectWitnessFieldId,
  sourcePath: string,
  title: string,
  summary: string,
  valueSet?: readonly string[],
): AppBuilderEffectWitnessFieldDescriptor {
  return {
    fieldId,
    sourcePath,
    title,
    summary,
    ...(valueSet == null ? {} : { valueSet }),
  };
}
