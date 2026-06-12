import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { KernelStore } from '../kernel/store.js';
import type {
  SemanticValidationIssueRow,
} from './contracts.js';
import { describeAddress } from './source-reference.js';

/** Project @aurelia/validation issue products into stable diagnostic rows. */
export function readValidationIssueRows(
  emission: AureliaAppWorldProjectEmission,
  store: KernelStore,
  handles: boolean,
): readonly SemanticValidationIssueRow[] {
  return emission.validation.readIssues()
    .map((issue): SemanticValidationIssueRow => ({
      projectKey: issue.projectKey,
      phase: issue.phase,
      issueKind: issue.issueKind,
      diagnosticAuthority: 'framework-runtime-behavior',
      frameworkErrorCode: issue.frameworkErrorCode,
      severity: issue.severity,
      message: issue.message,
      localName: issue.localName,
      source: describeAddress(store, issue.sourceAddressHandle),
      ...(handles ? {
        handles: {
          productHandle: issue.productHandle,
          identityHandle: issue.identityHandle,
          ownerIdentityHandle: issue.ownerIdentityHandle,
          sourceAddressHandle: issue.sourceAddressHandle,
        },
      } : {}),
    }))
    .sort((left, right) =>
      `${left.source?.path ?? ''}:${left.source?.start ?? 0}:${left.issueKind}:${left.localName ?? ''}`
        .localeCompare(`${right.source?.path ?? ''}:${right.source?.start ?? 0}:${right.issueKind}:${right.localName ?? ''}`)
    );
}
