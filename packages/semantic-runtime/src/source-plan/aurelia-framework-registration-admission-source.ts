import {
  FrameworkRegistrationCapability,
  frameworkRegistrationDescriptorForKind,
  frameworkRegistrationKindsForCapability,
  frameworkRegistrationSourceExportNameForKind,
} from '../registration/framework-registration-manifest.js';
import {
  FrameworkRegistrationKind,
} from '../registration/registration-reference.js';
import {
  aureliaEntrypointRegistrationExpressionSource,
  type AureliaEntrypointImport,
  type AureliaEntrypointRegistrationExpression,
} from './aurelia-entrypoint-source-plan.js';
import {
  SourcePlanLanguage,
  sourcePlanAureliaFrameworkRegistrationAdmissionOrigin,
  sourcePlanSourceFragmentContribution,
  sourcePlanTypeScriptImportContribution,
} from './source-plan.js';

export interface AureliaFrameworkRegistrationAdmissionSourceModel {
  readonly capability: FrameworkRegistrationCapability;
  readonly requiredRegistrationKinds?: readonly FrameworkRegistrationKind[];
  readonly preferredModuleName?: string | null;
}

/** Entrypoint imports and registration expressions that admit one framework capability. */
export interface AureliaFrameworkRegistrationAdmissionSource {
  readonly capability: FrameworkRegistrationCapability;
  readonly registrationKind: FrameworkRegistrationKind;
  readonly dependencySpecifiers: readonly string[];
  readonly entrypointImports: readonly AureliaEntrypointImport[];
  readonly registrationExpressions: readonly AureliaEntrypointRegistrationExpression[];
}

export function aureliaFrameworkRegistrationAdmissionSource(
  model: AureliaFrameworkRegistrationAdmissionSourceModel,
): AureliaFrameworkRegistrationAdmissionSource | null {
  const registrationKind = selectRegistrationKindForCapability(model.capability, model.requiredRegistrationKinds ?? []);
  if (registrationKind == null) {
    return null;
  }
  const descriptor = frameworkRegistrationDescriptorForKind(registrationKind);
  const moduleSpecifier = descriptor.moduleNames.includes(model.preferredModuleName ?? '')
    ? model.preferredModuleName!
    : descriptor.moduleNames[0] ?? null;
  if (moduleSpecifier == null) {
    return null;
  }
  const sourceExportName = frameworkRegistrationSourceExportNameForKind(registrationKind);
  if (sourceExportName == null) {
    return null;
  }

  const origin = sourcePlanAureliaFrameworkRegistrationAdmissionOrigin(registrationKind, model.capability);
  const importRequirement = {
    moduleSpecifier,
    namedImports: [sourceExportName],
  };
  const registrationExpression = sourceExportName;
  return {
    capability: model.capability,
    registrationKind,
    dependencySpecifiers: dependencySpecifiersForRegistrationKind(registrationKind, moduleSpecifier),
    entrypointImports: [{
      ...importRequirement,
      contributions: [sourcePlanTypeScriptImportContribution(importRequirement, origin)],
    }],
    registrationExpressions: [
      aureliaEntrypointRegistrationExpressionSource(registrationExpression, [
        sourcePlanSourceFragmentContribution(
          SourcePlanLanguage.TypeScript,
          registrationExpression,
          origin,
        ),
      ]),
    ],
  };
}

function selectRegistrationKindForCapability(
  capability: FrameworkRegistrationCapability,
  requiredRegistrationKinds: readonly FrameworkRegistrationKind[],
): FrameworkRegistrationKind | null {
  const candidates = [
    ...requiredRegistrationKinds,
    ...frameworkRegistrationKindsForCapability(capability),
  ];
  const unique = [...new Set(candidates)];
  return unique.find(registrationKindSupportsSourceOperation) ?? null;
}

function registrationKindSupportsSourceOperation(
  kind: FrameworkRegistrationKind,
): boolean {
  return frameworkRegistrationSourceExportNameForKind(kind) != null;
}

function dependencySpecifiersForRegistrationKind(
  kind: FrameworkRegistrationKind,
  moduleSpecifier: string,
): readonly string[] {
  switch (kind) {
    case FrameworkRegistrationKind.ValidationHtmlConfiguration:
      return [moduleSpecifier, '@aurelia/validation'];
    default:
      return [moduleSpecifier];
  }
}
