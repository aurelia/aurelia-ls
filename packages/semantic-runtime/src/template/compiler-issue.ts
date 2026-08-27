import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';

export const enum TemplateCompilerIssuePhase {
  CompilerWorld = 'compiler-world',
  AttributeClassification = 'attribute-classification',
  BindingCommandLowering = 'binding-command-lowering',
  CompiledTemplate = 'compiled-template',
  SpreadCompile = 'spread-compile',
}

export const enum TemplateCompilerIssueKind {
  AttributePatternDuplicate = 'attribute-pattern-duplicate',
  BindingCommandAlreadyRegistered = 'binding-command-already-registered',
  NoSpreadTemplateController = 'no-spread-template-controller',
  InvalidClassBindingSyntax = 'invalid-class-binding-syntax',
  InvalidSurrogateAttribute = 'invalid-surrogate-attribute',
  TemplateControllerOnSurrogate = 'template-controller-on-surrogate',
  ProjectionOnNonCustomElement = 'projection-on-non-custom-element',
  SlotWithoutShadowDom = 'slot-without-shadow-dom',
  RootTemplateCannotBeLocal = 'root-template-cannot-be-local',
  OnlyLocalTemplates = 'only-local-templates',
  LocalTemplateNotUnderRoot = 'local-template-not-under-root',
  LocalTemplateBindableNotUnderRoot = 'local-template-bindable-not-under-root',
  LocalTemplateBindableNameMissing = 'local-template-bindable-name-missing',
  LocalTemplateBindableDuplicate = 'local-template-bindable-duplicate',
  LocalTemplateNameEmpty = 'local-template-name-empty',
  LocalTemplateNameDuplicate = 'local-template-name-duplicate',
  UnknownBindingCommand = 'unknown-binding-command',
  BindingToNonBindable = 'binding-to-non-bindable',
  InvalidLetCommand = 'invalid-let-command',
  /** Source-authored `<!--au-->` collides with the compiler's runtime target marker spelling. */
  AuthoredCompilerMarker = 'authored-compiler-marker',
  ReservedSpreadSyntax = 'reserved-spread-syntax',
  ReservedBindableSyntax = 'reserved-bindables-syntax',
  BindingCommandBuildInvalid = 'binding-command-build-invalid',
  AttributeClassificationInvalid = 'attribute-classification-invalid',
}

/**
 * Broad authored local-shape findings retained for IDE diagnostics before reached extraction owns refusal order.
 *
 * Root-template `as-custom-element` is intentionally excluded: after exact hook execution it is the earlier dedicated
 * compiler root check, not one of `_compileLocalElement`'s seven authoring candidates.
 */
export function isLocalTemplateAuthoringIssueKind(
  issueKind: TemplateCompilerIssueKind,
): boolean {
  switch (issueKind) {
    case TemplateCompilerIssueKind.OnlyLocalTemplates:
    case TemplateCompilerIssueKind.LocalTemplateNotUnderRoot:
    case TemplateCompilerIssueKind.LocalTemplateBindableNotUnderRoot:
    case TemplateCompilerIssueKind.LocalTemplateBindableNameMissing:
    case TemplateCompilerIssueKind.LocalTemplateBindableDuplicate:
    case TemplateCompilerIssueKind.LocalTemplateNameEmpty:
    case TemplateCompilerIssueKind.LocalTemplateNameDuplicate:
      return true;
    case TemplateCompilerIssueKind.AttributePatternDuplicate:
    case TemplateCompilerIssueKind.BindingCommandAlreadyRegistered:
    case TemplateCompilerIssueKind.NoSpreadTemplateController:
    case TemplateCompilerIssueKind.InvalidClassBindingSyntax:
    case TemplateCompilerIssueKind.InvalidSurrogateAttribute:
    case TemplateCompilerIssueKind.TemplateControllerOnSurrogate:
    case TemplateCompilerIssueKind.ProjectionOnNonCustomElement:
    case TemplateCompilerIssueKind.SlotWithoutShadowDom:
    case TemplateCompilerIssueKind.RootTemplateCannotBeLocal:
    case TemplateCompilerIssueKind.UnknownBindingCommand:
    case TemplateCompilerIssueKind.BindingToNonBindable:
    case TemplateCompilerIssueKind.InvalidLetCommand:
    case TemplateCompilerIssueKind.AuthoredCompilerMarker:
    case TemplateCompilerIssueKind.ReservedSpreadSyntax:
    case TemplateCompilerIssueKind.ReservedBindableSyntax:
    case TemplateCompilerIssueKind.BindingCommandBuildInvalid:
    case TemplateCompilerIssueKind.AttributeClassificationInvalid:
      return false;
  }
  const exhaustiveIssueKind: never = issueKind;
  return exhaustiveIssueKind;
}

export type TemplateCompilerIssueSeverity =
  | 'information'
  | 'warning'
  | 'error';

export type TemplateCompilerIssueField =
  | 'phase'
  | 'issueKind'
  | 'message'
  | 'severity'
  | 'frameworkErrorCode'
  | 'source';

/** A second authored locus needed to explain a template-compiler issue. */
export class TemplateCompilerIssueRelatedInformation {
  constructor(
    readonly message: string,
    readonly sourceAddressHandle: AddressHandle,
  ) {}
}

/** Source-backed compiler failure that corresponds to a framework template-compiler boundary. */
export class TemplateCompilerIssue {
  constructor(
    /** Product handle for the materialized-product envelope that represents this issue. */
    readonly productHandle: ProductHandle,
    /** Identity for this issue product. */
    readonly identityHandle: IdentityHandle,
    /** Compiler phase that detected the issue. */
    readonly phase: TemplateCompilerIssuePhase,
    /** Stable semantic issue kind used by diagnostics and repair planning. */
    readonly issueKind: TemplateCompilerIssueKind,
    /** Human-readable message from the modeled compiler boundary. */
    readonly message: string,
    /** Exact Aurelia framework error code when this issue models a framework ErrorNames throw. */
    readonly frameworkErrorCode: string | null,
    /** Source address for the authored syntax that triggered the issue. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateCompilerIssueField>[] = [],
    /** Diagnostic severity implied by the modeled framework path. */
    readonly severity: TemplateCompilerIssueSeverity = 'error',
    /** Other authored loci that explain this issue, such as the occupied side of a duplicate registration. */
    readonly relatedInformation: readonly TemplateCompilerIssueRelatedInformation[] = [],
  ) {}
}
