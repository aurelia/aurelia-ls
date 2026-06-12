import { TypeSystemTypeScriptVersionRelation, type TypeSystemTypeScriptEnvironment } from '../type-system/typescript-environment.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary } from './contracts.js';

/** Project the checker epoch's TypeScript package relation into stable public API rows. */
export function semanticTypeScriptEnvironmentSummary(
  typeSystem: TypeSystemProject,
): SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary {
  return semanticTypeScriptEnvironmentFromProfile(typeSystem.profile.typeScript);
}

export function semanticTypeScriptEnvironmentFromProfile(
  environment: TypeSystemTypeScriptEnvironment,
): SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary {
  return {
    analyzer: {
      version: environment.analyzer.version,
      packageJsonPath: environment.analyzer.packageJsonPath,
    },
    workspace: environment.workspace == null
      ? null
      : {
        version: environment.workspace.version,
        packageJsonPath: environment.workspace.packageJsonPath,
      },
    versionRelation: environment.versionRelation,
  };
}

export function semanticTypeScriptEnvironmentDisplayText(
  environment: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary,
): string {
  switch (environment.versionRelation) {
    case TypeSystemTypeScriptVersionRelation.SamePackage:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=same-package. Diagnostics use the TypeScript package visible from the workspace install.`;
    case TypeSystemTypeScriptVersionRelation.SameVersionDifferentPackage:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=same-version-different-package. Diagnostics reflect the analyzer compiler from a different package path; prefer a project-local MCP install before treating compiler-version-sensitive diagnostics as authoritative.`;
    case TypeSystemTypeScriptVersionRelation.DifferentVersion:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=different-version. Diagnostics reflect the analyzer compiler; align the MCP install with the workspace TypeScript before treating compiler-version-sensitive diagnostics as authoritative.`;
    case TypeSystemTypeScriptVersionRelation.WorkspaceNotFound:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=not-found; relation=workspace-not-found. Diagnostics reflect the analyzer compiler because no workspace TypeScript package was found.`;
  }
  return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=${environment.versionRelation}.`;
}
