import type { Export } from '../exports/export.js';
import type { SourceNodeRef } from '../refs.js';
import type { ResourceDefinitionKind } from '../resources/contracts.js';

export const ADMITTED_SUBJECT_CARRIER_KINDS = [
  'service',
  'renderer',
  'registry',
  'resource-definition',
  'registrable-metadata-registry',
  'open',
] as const;

export type AdmittedSubjectCarrierKind =
  typeof ADMITTED_SUBJECT_CARRIER_KINDS[number];

export const ADMISSION_POLICY_KINDS = [
  'service-container',
  'instruction-renderer',
  'registry-registration',
  'template-local-or-root',
  'compiler-root-only',
  'open',
] as const;

export type AdmissionPolicyKind =
  typeof ADMISSION_POLICY_KINDS[number];

// Semantic identity lives here, not bundle or expansion history.
// If a configuration spread or helper call contributed this subject, that
// belongs to the contribution path, not to the admitted subject itself.
export class AdmittedSubject {
  constructor(
    readonly id: string,
    readonly source: SourceNodeRef,
    readonly referenceName: string,
    readonly carrier: AdmittedSubjectCarrierKind,
    readonly policy: AdmissionPolicyKind,
    readonly resolvedExport: Export | null,
    readonly declarationKind: ResourceDefinitionKind | null = null,
    readonly note: string | null = null,
  ) {}
}
