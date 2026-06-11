import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { KernelStoreRecord } from '../kernel/store.js';
import type { ProductKindKey } from '../kernel/vocabulary.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FrameworkRegistrationCapability } from '../registration/framework-registration-manifest.js';
import type { FrameworkRegistrationKind } from '../registration/registration-reference.js';

export const enum FrameworkCapabilityDemandSiteKind {
  TemplateAttribute = 'template-attribute',
  TemplateElement = 'template-element',
  TemplateValueConverter = 'template-value-converter',
  TemplateBindingBehavior = 'template-binding-behavior',
}

export const enum FrameworkCapabilityDemandKind {
  RuntimeHtmlDefaultBindingSyntax = 'runtime-html.default-binding-syntax',
  RuntimeHtmlShortHandBindingSyntax = 'runtime-html.short-hand-binding-syntax',
  RuntimeHtmlDefaultBindingLanguage = 'runtime-html.default-binding-language',
  RuntimeHtmlDefaultResources = 'runtime-html.default-resources',
  I18nDefaultResources = 'i18n.default-resources',
  I18nTranslationSyntax = 'i18n.translation-syntax',
  ValidationHtmlDefaultResources = 'validation-html.default-resources',
  RouterDefaultResources = 'router.default-resources',
  UiVirtualizationDefaultResources = 'ui-virtualization.default-resources',
  StateDefaultResources = 'state.default-resources',
  StateBindingSyntax = 'state.binding-syntax',
}

export const enum FrameworkCapabilityAdmissionState {
  Admitted = 'admitted',
  NotAdmitted = 'not-admitted',
}

export const enum FrameworkCapabilityAvailabilityState {
  EvidenceFound = 'evidence-found',
  NoLocalEvidence = 'no-local-evidence',
}

export const enum FrameworkCapabilityPackageEvidenceKind {
  ProjectManifestDependency = 'project-manifest-dependency',
  WorkspaceManifestDependency = 'workspace-manifest-dependency',
  SourceImport = 'source-import',
}

export type FrameworkCapabilityPackageEvidenceScope =
  | 'dependencies'
  | 'peerDependencies'
  | 'devDependencies'
  | 'import';

export class FrameworkCapabilityPackageEvidence {
  constructor(
    readonly evidenceKind: FrameworkCapabilityPackageEvidenceKind,
    readonly packageName: string,
    readonly moduleName: string,
    readonly scope: FrameworkCapabilityPackageEvidenceScope,
    readonly sourceAddressHandle: AddressHandle | null = null,
  ) {}
}

/** Source-backed use of a framework capability joined to app admission and package/import evidence. */
export class FrameworkCapabilityDemand {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Framework.CapabilityDemand.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly projectKey: string,
    readonly siteKind: FrameworkCapabilityDemandSiteKind,
    readonly demandKind: FrameworkCapabilityDemandKind,
    readonly requiredCapability: FrameworkRegistrationCapability,
    readonly requiredRegistrationKinds: readonly FrameworkRegistrationKind[],
    readonly candidateModuleNames: readonly string[],
    readonly admissionState: FrameworkCapabilityAdmissionState,
    readonly availabilityState: FrameworkCapabilityAvailabilityState,
    readonly packageEvidence: readonly FrameworkCapabilityPackageEvidence[],
    readonly recommendedModuleName: string | null,
    readonly authoredName: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly ownerIdentityHandle: IdentityHandle | null,
    readonly templateSourceAddressHandle: AddressHandle | null,
    readonly resourceDefinitionProductHandle: ProductHandle | null,
  ) {}

  get isAdmitted(): boolean {
    return this.admissionState === FrameworkCapabilityAdmissionState.Admitted;
  }
}

export class FrameworkCapabilityDemandProjectResult {
  constructor(
    readonly demands: readonly FrameworkCapabilityDemand[],
    readonly records: readonly KernelStoreRecord[],
  ) {}

  readDemands(): readonly FrameworkCapabilityDemand[] {
    return this.demands;
  }
}
