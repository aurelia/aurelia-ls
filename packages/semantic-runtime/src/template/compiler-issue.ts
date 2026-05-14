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
  BindingToNonBindable = 'binding-to-non-bindable',
  InvalidLetCommand = 'invalid-let-command',
  ReservedSpreadSyntax = 'reserved-spread-syntax',
  ReservedBindableSyntax = 'reserved-bindables-syntax',
  BindingCommandBuildInvalid = 'binding-command-build-invalid',
  AttributeClassificationInvalid = 'attribute-classification-invalid',
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
  ) {}
}
