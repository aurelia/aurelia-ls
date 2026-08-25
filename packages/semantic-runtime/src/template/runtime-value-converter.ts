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
import { BuiltInValueConverterName } from '../resources/built-in-resources.js';
import {
  RuntimeHtmlValueConverterFrameworkErrorCode,
  type RuntimeHtmlValueConverterFrameworkErrorCode as RuntimeHtmlValueConverterFrameworkErrorCodeValue,
} from './framework-error-code.js';
import type {
  RuntimeHtmlAstFrameworkErrorCode as RuntimeHtmlAstFrameworkErrorCodeValue,
} from '../type-system/framework-error-code.js';
import type {
  RuntimeBindingReference,
} from './runtime-binding.js';
import type { TemplateVisibleResourceReference } from './compiler-world-reference.js';
import type { SourceSpan } from '../expression/source-span.js';
import {
  RuntimeExpressionResourceApplicationOrigin,
  RuntimeExpressionResourceLifecycleEffects,
} from './runtime-expression-resource.js';
import type { RuntimeOperationReachability } from '../runtime-expression/runtime-operation.js';

export const enum RuntimeValueConverterApplicationPhase {
  Bind = 'bind',
  ToView = 'to-view',
  FromView = 'from-view',
  Unbind = 'unbind',
}

export type RuntimeValueConverterApplicationField =
  | 'binding'
  | 'resource'
  | 'phase'
  | 'origin'
  | 'converterName'
  | 'argumentCount'
  | 'expressionProductHandle'
  | 'chainIndex'
  | 'authoredChainDepth'
  | 'runtimeChainDepth'
  | 'bindReachability'
  | 'phaseReachability'
  | 'bindOrder'
  | 'phaseOrder'
  | 'lifecycleEffects'
  | 'argumentSpans'
  | 'source';

export class RuntimeValueConverterApplicationReference {
  constructor(
    readonly converterName: string,
    readonly resource: TemplateVisibleResourceReference | null,
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
    readonly resource: TemplateVisibleResourceReference | null,
    readonly phase: RuntimeValueConverterApplicationPhase,
    readonly origin: RuntimeExpressionResourceApplicationOrigin,
    readonly converterName: string,
    readonly argumentCount: number,
    readonly expressionProductHandle: ProductHandle,
    readonly chainIndex: number,
    readonly authoredChainDepth: number | null,
    readonly runtimeChainDepth: number,
    readonly bindReachability: RuntimeOperationReachability,
    readonly phaseReachability: RuntimeOperationReachability,
    readonly bindOrder: number | null,
    readonly phaseOrder: number | null,
    readonly lifecycleEffects: RuntimeExpressionResourceLifecycleEffects,
    readonly argumentSpans: readonly SourceSpan[],
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeValueConverterApplicationField>[] = [],
  ) {}

  toReference(): RuntimeValueConverterApplicationReference {
    return new RuntimeValueConverterApplicationReference(
      this.converterName,
      this.resource,
      this.productHandle,
      this.identityHandle,
      this.sourceAddressHandle,
    );
  }
}

export const enum RuntimeValueConverterIssuePhase {
  /** `astBind` resolves the converter and subscribes any declared signals. */
  Bind = 'bind',
  /** Source-to-target evaluation invokes `toView`. */
  ToView = 'to-view',
  /** Target-to-source assignment invokes `fromView`. */
  FromView = 'from-view',
}

export const enum RuntimeValueConverterIssueKind {
  /** `astBind` could not resolve the authored converter from the binding service locator. */
  ResourceNotFound = 'resource-not-found',
  /** The default sanitize converter reached the intentionally throwing sanitizer implementation. */
  SanitizerMethodNotImplemented = 'sanitizer-method-not-implemented',
}

export type RuntimeValueConverterFrameworkErrorCodeValue =
  | RuntimeHtmlValueConverterFrameworkErrorCodeValue
  | RuntimeHtmlAstFrameworkErrorCodeValue;

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
    readonly frameworkErrorCode: RuntimeValueConverterFrameworkErrorCodeValue,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly fieldProvenance: readonly FieldProvenance<RuntimeValueConverterIssueField>[] = [],
  ) {}
}

export type RuntimeValueConverterIssueDraft = {
  readonly issueKind: RuntimeValueConverterIssueKind;
  readonly message: string;
  readonly frameworkErrorCode: RuntimeValueConverterFrameworkErrorCodeValue;
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
  readonly name = BuiltInValueConverterName.Sanitize;

  toView(context: SanitizeValueConverterToViewContext): RuntimeValueConverterIssueDraft | null {
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
