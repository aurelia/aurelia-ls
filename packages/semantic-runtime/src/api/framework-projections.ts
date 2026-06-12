import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityDemandSiteKind,
} from '../framework/capability-demand.js';
import {
  FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import type { KernelStore } from '../kernel/store.js';
import {
  SemanticAppQueryKind,
  type SemanticAppDiagnosticRow,
} from './contracts.js';
import {
  frameworkCapabilityDemandDiagnostic,
} from './template-diagnostic-policy.js';
import { describeAddress } from './source-reference.js';

/** Project source-faced framework capability demands into unified app diagnostics. */
export function readFrameworkCapabilityDemandDiagnosticRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
): readonly SemanticAppDiagnosticRow[] {
  return emission.capabilityDemands.readDemands()
    .filter((demand) =>
      demand.siteKind === FrameworkCapabilityDemandSiteKind.SourceServiceApi
      && demand.admissionState === FrameworkCapabilityAdmissionState.NotAdmitted
    )
    .flatMap((demand): readonly SemanticAppDiagnosticRow[] => {
      const source = describeAddress(store, demand.sourceAddressHandle);
      if (source == null) {
        return [];
      }
      const diagnostic = frameworkCapabilityDemandDiagnostic(demand, source);
      return [{
        projectKey: demand.projectKey,
        diagnosticDomain: 'framework',
        diagnosticKind: diagnostic.diagnosticKind,
        diagnosticAuthority: diagnostic.diagnosticAuthority,
        frameworkErrorCode: diagnostic.frameworkErrorCode,
        severity: diagnostic.severity,
        summary: diagnostic.summary,
        missingInput: diagnostic.missingInput,
        missingInputs: diagnostic.missingInputs,
        source: diagnostic.source,
        suggestion: diagnostic.suggestion,
        relatedQueryKind: relatedQueryKindForCapability(demand.requiredCapability),
        handles: {
          productHandle: demand.productHandle,
          identityHandle: demand.identityHandle,
          ownerIdentityHandle: demand.ownerIdentityHandle,
          sourceAddressHandle: demand.sourceAddressHandle,
          templateSourceAddressHandle: demand.templateSourceAddressHandle,
          resourceDefinitionProductHandle: demand.resourceDefinitionProductHandle,
        },
      }];
    })
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticKind}:${left.missingInput ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticKind}:${right.missingInput ?? ''}`)
    );
}

function relatedQueryKindForCapability(
  capability: FrameworkRegistrationCapability,
): SemanticAppQueryKind {
  switch (capability) {
    case FrameworkRegistrationCapability.DialogServiceResolvers:
      return SemanticAppQueryKind.DialogIssues;
    case FrameworkRegistrationCapability.ValidationServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.ValidationHtmlServiceResolvers:
      return SemanticAppQueryKind.ValidationIssues;
    case FrameworkRegistrationCapability.I18nServiceResolvers:
      return SemanticAppQueryKind.I18nTranslationBindings;
    case FrameworkRegistrationCapability.RouterConfigurationResolvers:
    case FrameworkRegistrationCapability.RouterDefaultComponents:
    case FrameworkRegistrationCapability.RouterDefaultResources:
    case FrameworkRegistrationCapability.RouterLifecycleTasks:
      return SemanticAppQueryKind.RouterIssues;
    case FrameworkRegistrationCapability.StateStoreResolvers:
    case FrameworkRegistrationCapability.StateStoreTasks:
      return SemanticAppQueryKind.StateIssues;
    default:
      return SemanticAppQueryKind.ConfigurationIssues;
  }
}
