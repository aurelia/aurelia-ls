import type {
  SourcePlan,
  SourcePlanContributionOrigin,
  SourcePlanContributionOriginKind,
  SourcePlanEditKind,
  SourcePlanLanguage,
  SourcePlanOperationKind,
  SourcePlanTextAuthority,
} from '../../source-plan/source-plan.js';
import {
  SourcePlanContributionKind,
} from '../../source-plan/source-plan.js';
import type {
  SourcePlanBuildToolPolicy,
  SourcePlanPackageDependencyScope,
  SourcePlanPackageManager,
  SourcePlanProjectToolingFileKind,
  SourcePlanProjectToolingLanguage,
} from '../../source-plan/package-tooling.js';
import {
  AppBuilderEffectContractId,
} from './effect.js';

/** SourcePlan witness row family emitted from a concrete generated SourcePlan. */
export enum AppBuilderSourcePlanWitnessRowKind {
  /** SourcePlan policy and complete-text envelope. */
  Policy = 'policy',
  /** One planned source file artifact. */
  FileArtifact = 'file-artifact',
  /** One planned file contribution such as an import or source fragment. */
  Contribution = 'contribution',
  /** One generated package dependency declared by SourcePlan project tooling. */
  ProjectToolingDependency = 'project-tooling-dependency',
  /** One generated package script declared by SourcePlan project tooling. */
  ProjectToolingScript = 'project-tooling-script',
  /** One generated project/build/tooling file. */
  ProjectToolingFile = 'project-tooling-file',
}

/** Stable value list for SourcePlan witness row transport schemas. */
export const APP_BUILDER_SOURCE_PLAN_WITNESS_ROW_KINDS = [
  AppBuilderSourcePlanWitnessRowKind.Policy,
  AppBuilderSourcePlanWitnessRowKind.FileArtifact,
  AppBuilderSourcePlanWitnessRowKind.Contribution,
  AppBuilderSourcePlanWitnessRowKind.ProjectToolingDependency,
  AppBuilderSourcePlanWitnessRowKind.ProjectToolingScript,
  AppBuilderSourcePlanWitnessRowKind.ProjectToolingFile,
] as const;

/** Compact SourcePlan witness row derived from planned source, contributions, and project tooling. */
export interface AppBuilderSourcePlanWitnessRow {
  /** Witness row family. */
  readonly rowKind: AppBuilderSourcePlanWitnessRowKind;
  /** Effect contract this row helps inspect before host writes files. */
  readonly effectContractId: AppBuilderEffectContractId.SourcePlanPreview;
  /** SourcePlan root directory for this witness. */
  readonly rootDir: string;
  /** Whether the whole SourcePlan has concrete text for files and tooling. */
  readonly hasCompleteFileText: boolean;
  /** SourcePlan conflict policy when this row describes the policy envelope. */
  readonly conflictPolicy?: string;
  /** SourcePlan formatting policy when this row describes the policy envelope. */
  readonly formattingPolicy?: string;
  /** SourcePlan package/tooling ownership policy when this row describes the policy envelope. */
  readonly packageToolingPolicy?: string;
  /** Project-relative source file path when this row belongs to a file. */
  readonly filePath?: string;
  /** File role when this row belongs to a file. */
  readonly fileRole?: string;
  /** File language when this row belongs to a file or contribution. */
  readonly fileLanguage?: SourcePlanLanguage;
  /** File-level edit kind before host conflict resolution. */
  readonly fileEditKind?: SourcePlanEditKind;
  /** Source operation that caused the file artifact. */
  readonly fileOperationKind?: SourcePlanOperationKind | null;
  /** Who owns concrete file or tooling text. */
  readonly textAuthority?: SourcePlanTextAuthority | null;
  /** Whether the specific file or tooling file has concrete text. */
  readonly hasText?: boolean;
  /** Zero-based contribution index inside the file contribution ledger. */
  readonly contributionIndex?: number;
  /** Contribution family when this row describes a contribution. */
  readonly contributionKind?: SourcePlanContributionKind;
  /** Contribution origin family when present. */
  readonly contributionOriginKind?: SourcePlanContributionOriginKind;
  /** Full contribution origin identity when present. */
  readonly contributionOrigin?: SourcePlanContributionOrigin | null;
  /** TypeScript import module specifier for import contributions. */
  readonly importModuleSpecifier?: string;
  /** Whether the import contribution is type-only. */
  readonly importTypeOnly?: boolean;
  /** Fragment language for source-fragment contributions. */
  readonly fragmentLanguage?: SourcePlanLanguage;
  /** Source-fragment length, kept compact so witness rows do not duplicate generated source text. */
  readonly fragmentTextLength?: number;
  /** SourcePlan project tooling package manager. */
  readonly packageManager?: SourcePlanPackageManager;
  /** SourcePlan project tooling build-tool policy. */
  readonly buildToolPolicy?: SourcePlanBuildToolPolicy;
  /** Package dependency specifier for project-tooling dependency rows. */
  readonly dependencySpecifier?: string;
  /** Package dependency version range for project-tooling dependency rows. */
  readonly dependencyVersionRange?: string;
  /** Package dependency scope for project-tooling dependency rows. */
  readonly dependencyScope?: SourcePlanPackageDependencyScope;
  /** Package script name for project-tooling script rows. */
  readonly scriptName?: string;
  /** Package script command for project-tooling script rows. */
  readonly scriptCommand?: string;
  /** Project-tooling file kind. */
  readonly projectToolingFileKind?: SourcePlanProjectToolingFileKind;
  /** Project-tooling file language. */
  readonly projectToolingFileLanguage?: SourcePlanProjectToolingLanguage;
}

/** Build compact SourcePlan witness rows from the generated SourcePlan boundary. */
export function appBuilderSourcePlanWitnessRows(
  sourcePlan: SourcePlan | null,
): readonly AppBuilderSourcePlanWitnessRow[] {
  if (sourcePlan == null) {
    return [];
  }
  return [
    sourcePlanPolicyWitnessRow(sourcePlan),
    ...sourcePlan.files.flatMap((file) => {
      const fileRow: AppBuilderSourcePlanWitnessRow = {
        rowKind: AppBuilderSourcePlanWitnessRowKind.FileArtifact,
        effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
        rootDir: sourcePlan.rootDir,
        hasCompleteFileText: sourcePlan.hasCompleteFileText,
        filePath: file.path,
        fileRole: file.role,
        fileLanguage: file.language,
        fileEditKind: file.editKind,
        fileOperationKind: file.operationKind,
        textAuthority: file.text?.authority ?? null,
        hasText: file.text != null,
      };
      return [
        fileRow,
        ...file.contributions.map((contribution, contributionIndex): AppBuilderSourcePlanWitnessRow => {
        if (contribution.kind === SourcePlanContributionKind.TypeScriptImportRequirement) {
          return {
            rowKind: AppBuilderSourcePlanWitnessRowKind.Contribution,
            effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
            rootDir: sourcePlan.rootDir,
            hasCompleteFileText: sourcePlan.hasCompleteFileText,
            filePath: file.path,
            fileRole: file.role,
            fileLanguage: file.language,
            contributionIndex,
            contributionKind: contribution.kind,
            contributionOriginKind: contribution.origin?.kind,
            contributionOrigin: contribution.origin,
            importModuleSpecifier: contribution.importRequirement.moduleSpecifier,
            importTypeOnly: typeScriptImportRequirementIsTypeOnly(contribution.importRequirement),
          };
        }
        return {
          rowKind: AppBuilderSourcePlanWitnessRowKind.Contribution,
          effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
          rootDir: sourcePlan.rootDir,
          hasCompleteFileText: sourcePlan.hasCompleteFileText,
          filePath: file.path,
          fileRole: file.role,
          fileLanguage: file.language,
          contributionIndex,
          contributionKind: contribution.kind,
          contributionOriginKind: contribution.origin?.kind,
          contributionOrigin: contribution.origin,
          fragmentLanguage: contribution.language,
          fragmentTextLength: contribution.text.length,
        };
        }),
      ];
    }),
    ...sourcePlanProjectToolingWitnessRows(sourcePlan),
  ];
}

function typeScriptImportRequirementIsTypeOnly(
  importRequirement: { readonly defaultImport?: string; readonly namedImports?: readonly string[]; readonly defaultTypeImport?: string; readonly namedTypeImports?: readonly string[] },
): boolean {
  const hasValueImport = importRequirement.defaultImport != null
    || (importRequirement.namedImports?.length ?? 0) > 0;
  const hasTypeImport = importRequirement.defaultTypeImport != null
    || (importRequirement.namedTypeImports?.length ?? 0) > 0;
  return hasTypeImport && !hasValueImport;
}

function sourcePlanPolicyWitnessRow(
  sourcePlan: SourcePlan,
): AppBuilderSourcePlanWitnessRow {
  return {
    rowKind: AppBuilderSourcePlanWitnessRowKind.Policy,
    effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
    rootDir: sourcePlan.rootDir,
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
    conflictPolicy: sourcePlan.policy.conflictPolicy,
    formattingPolicy: sourcePlan.policy.formattingPolicy,
    packageToolingPolicy: sourcePlan.policy.packageToolingPolicy,
    packageManager: sourcePlan.projectTooling?.packageManager,
    buildToolPolicy: sourcePlan.projectTooling?.buildToolPolicy,
  };
}

function sourcePlanProjectToolingWitnessRows(
  sourcePlan: SourcePlan,
): readonly AppBuilderSourcePlanWitnessRow[] {
  const projectTooling = sourcePlan.projectTooling;
  if (projectTooling == null) {
    return [];
  }
  return [
    ...projectTooling.dependencies.map((dependency): AppBuilderSourcePlanWitnessRow => ({
      rowKind: AppBuilderSourcePlanWitnessRowKind.ProjectToolingDependency,
      effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
      rootDir: sourcePlan.rootDir,
      hasCompleteFileText: sourcePlan.hasCompleteFileText,
      packageManager: projectTooling.packageManager,
      buildToolPolicy: projectTooling.buildToolPolicy,
      dependencySpecifier: dependency.specifier,
      dependencyVersionRange: dependency.versionRange,
      dependencyScope: dependency.scope,
    })),
    ...projectTooling.scripts.map((script): AppBuilderSourcePlanWitnessRow => ({
      rowKind: AppBuilderSourcePlanWitnessRowKind.ProjectToolingScript,
      effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
      rootDir: sourcePlan.rootDir,
      hasCompleteFileText: sourcePlan.hasCompleteFileText,
      packageManager: projectTooling.packageManager,
      buildToolPolicy: projectTooling.buildToolPolicy,
      scriptName: script.name,
      scriptCommand: script.command,
    })),
    ...projectTooling.files.map((file): AppBuilderSourcePlanWitnessRow => ({
      rowKind: AppBuilderSourcePlanWitnessRowKind.ProjectToolingFile,
      effectContractId: AppBuilderEffectContractId.SourcePlanPreview,
      rootDir: sourcePlan.rootDir,
      hasCompleteFileText: sourcePlan.hasCompleteFileText,
      packageManager: projectTooling.packageManager,
      buildToolPolicy: projectTooling.buildToolPolicy,
      filePath: file.path,
      textAuthority: file.textAuthority,
      hasText: file.text.length > 0,
      projectToolingFileKind: file.fileKind,
      projectToolingFileLanguage: file.language,
    })),
  ];
}
