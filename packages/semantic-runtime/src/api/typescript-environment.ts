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
    case TypeSystemTypeScriptVersionRelation.Match:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=match.`;
    case TypeSystemTypeScriptVersionRelation.Mismatch:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=mismatch. Diagnostics reflect the analyzer compiler; align the MCP install with the workspace TypeScript before treating compiler-version-sensitive diagnostics as authoritative.`;
    case TypeSystemTypeScriptVersionRelation.WorkspaceNotFound:
      return `TypeScript: analyzer=${environment.analyzer.version}; workspace=not-found; relation=workspace-not-found. Diagnostics reflect the analyzer compiler because no workspace TypeScript package was found.`;
  }
  return `TypeScript: analyzer=${environment.analyzer.version}; workspace=${environment.workspace?.version ?? 'missing'}; relation=${environment.versionRelation}.`;
}
