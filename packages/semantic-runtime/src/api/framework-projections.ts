import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  FrameworkCapabilityDemandSiteKind,
} from '../framework/capability-demand.js';
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
      && !demand.isAdmitted
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
        relatedQueryKind: SemanticAppQueryKind.AppDiagnostics,
      }];
    })
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.diagnosticKind}:${left.missingInput ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.diagnosticKind}:${right.missingInput ?? ''}`)
    );
}
