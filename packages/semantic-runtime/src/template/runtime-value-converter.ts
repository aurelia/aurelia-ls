import { auLink } from '../kernel/au-link.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import {
  KernelVocabulary,
  type ProductKindKey,
} from '../kernel/vocabulary.js';
import {
  RuntimeHtmlValueConverterFrameworkErrorCode,
  type RuntimeHtmlValueConverterFrameworkErrorCode as RuntimeHtmlValueConverterFrameworkErrorCodeValue,
} from './framework-error-code.js';
import type {
  RuntimeBindingReference,
} from './runtime-binding.js';

export const enum RuntimeValueConverterApplicationPhase {
  ToView = 'to-view',
  FromView = 'from-view',
}

export type RuntimeValueConverterApplicationField =
  | 'binding'
  | 'phase'
  | 'converterName'
  | 'argumentCount'
  | 'source';

export class RuntimeValueConverterApplicationReference {
  constructor(
    readonly converterName: string,
    readonly productHandle: ProductHandle | null,
    readonly identityHandle: IdentityHandle | null,
    readonly addressHandle: AddressHandle | null,
  ) {}
}

/** Runtime value-converter application over an already-rendered binding expression. */
export class RuntimeValueConverterApplication {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.ValueConverterApplication.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly binding: RuntimeBindingReference,
    readonly phase: RuntimeValueConverterApplicationPhase,
    readonly converterName: string,
    readonly argumentCount: number,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeValueConverterApplicationField>[] = [],
  ) {}

  toReference(): RuntimeValueConverterApplicationReference {
    return new RuntimeValueConverterApplicationReference(
      this.converterName,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export const enum RuntimeValueConverterIssuePhase {
  ToView = 'to-view',
  FromView = 'from-view',
}

export const enum RuntimeValueConverterIssueKind {
  SanitizerMethodNotImplemented = 'sanitizer-method-not-implemented',
}

export type RuntimeValueConverterIssueField =
  | 'application'
  | 'binding'
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'frameworkErrorCode'
  | 'source';

/** Framework-runtime issue discovered while invoking a value converter. */
export class RuntimeValueConverterIssue {
  readonly productKindKey: ProductKindKey = KernelVocabulary.Binding.ValueConverterIssue.key;

  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly application: RuntimeValueConverterApplicationReference,
    readonly binding: RuntimeBindingReference,
    readonly phase: RuntimeValueConverterIssuePhase,
    readonly issueKind: RuntimeValueConverterIssueKind,
    readonly message: string,
    readonly frameworkErrorCode: RuntimeHtmlValueConverterFrameworkErrorCodeValue,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeValueConverterIssueField>[] = [],
  ) {}
}

export type BuiltInValueConverterInvocationIssue = {
  readonly issueKind: RuntimeValueConverterIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeHtmlValueConverterFrameworkErrorCodeValue;
};

export type SanitizeValueConverterToViewContext = {
  readonly hasCustomSanitizer: boolean;
};

/**
 * Semantic-runtime model of Aurelia's SanitizeValueConverter.toView path.
 *
 * The converter itself is registered by runtime-html DefaultResources. Its `ISanitizer` dependency is an interface
 * with a throwing default implementation, so static analysis can claim AUR0099 only when no modeled app resolver for
 * `ISanitizer` shadows that default.
 */
@auLink('runtime-html:SanitizeValueConverter', { facet: 'value-converter-semantics' })
export class SanitizeValueConverter {
  readonly name = 'sanitize';

  toView(context: SanitizeValueConverterToViewContext): BuiltInValueConverterInvocationIssue | null {
    if (context.hasCustomSanitizer) {
      return null;
    }
    return {
      issueKind: RuntimeValueConverterIssueKind.SanitizerMethodNotImplemented,
      message: 'sanitize uses the default ISanitizer implementation, whose sanitize method is not implemented.',
      frameworkErrorCode: RuntimeHtmlValueConverterFrameworkErrorCode.SanitizerMethodNotImplemented,
    };
  }
}
