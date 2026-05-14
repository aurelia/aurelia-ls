import type { ExpressionType } from '../expression/ast.js';
import type { ExpressionParseResult } from '../expression/parse-result-algebra.js';
import { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type {
  AddressHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { FieldProvenance } from '../kernel/provenance.js';
import type { TemplateBindableReference } from './compiler-world-reference.js';
import type { AttributeClassification, AttributeSyntax } from './attribute-syntax.js';
import type { BindingCommandExecutableReference } from './binding-command-reference.js';
import type {
  HtmlAttributeReference,
  HtmlNodeReference,
} from './html-ir.js';

export const enum TemplateValueSiteKind {
  /** Text node value owned by interpolation parsing. */
  TextInterpolation = 'text-interpolation',
  /** Plain platform attribute value that has no interpolation opener and is not parser-owned. */
  PlainAttributeValue = 'plain-attribute-value',
  /** Plain platform attribute value owned by interpolation parsing. */
  PlainAttributeInterpolation = 'plain-attribute-interpolation',
  /** Custom element bindable value owned by interpolation or command parsing. */
  BindableValue = 'bindable-value',
  /** Custom attribute primary value owned by interpolation or command parsing. */
  CustomAttributeValue = 'custom-attribute-value',
  /** Template-controller primary value owned by interpolation, iterator, command, or secondary grammar. */
  TemplateControllerValue = 'template-controller-value',
  /** Captured attribute value owned by interpolation parsing. */
  CapturedValue = 'captured-value',
  /** Binding-command-controlled value owned by the command-selected parser entry family. */
  BindingCommandValue = 'binding-command-value',
  /** Custom-attribute or template-controller inline multi-binding value transferred to a secondary grammar. */
  MultiBindingValue = 'multi-binding-value',
  /** Direct spread value owned by SpreadValueBindingInstruction lowering. */
  SpreadValue = 'spread-value',
}

export const enum TemplateExpressionParseState {
  /** Parser published a completed AST-bearing or intentionally absent result. */
  Complete = 'complete',
  /** Parser published a degraded/frontier companion result for partial input. */
  Companion = 'companion',
  /** Completed-input parsing failed and no honest companion result was available. */
  Error = 'error',
}

export type TemplateValueSiteField =
  | 'siteKind'
  | 'rawValue'
  | 'entryFamily'
  | 'node'
  | 'attribute'
  | 'syntax'
  | 'classification'
  | 'bindingCommand'
  | 'bindable'
  | 'source';

export type TemplateExpressionParseField =
  | 'site'
  | 'parser'
  | 'state'
  | 'resultKind'
  | 'source';

export class TemplateValueSiteReference {
  constructor(
    /** Product handle for this template value site. */
    readonly productHandle: ProductHandle,
    /** Identity handle for this template value site. */
    readonly identityHandle: IdentityHandle,
    /** Value-site family. */
    readonly siteKind: TemplateValueSiteKind,
    /** Parser entry family, when the expression parser owns this value. */
    readonly entryFamily: ExpressionType | null,
    /** Source address for the authored value. */
    readonly sourceAddressHandle: AddressHandle | null,
  ) {}
}

/** Compiler-owned ownership decision for one authored template value. */
export class TemplateValueSite {
  constructor(
    /** Product handle for the materialized-product envelope that represents this value site. */
    readonly productHandle: ProductHandle,
    /** Identity for this value site. */
    readonly identityHandle: IdentityHandle,
    /** Value-site family. */
    readonly siteKind: TemplateValueSiteKind,
    /** Raw authored value submitted to the expression parser or reserved for a secondary grammar. */
    readonly rawValue: string,
    /** Parser entry family, when the expression parser owns this value. */
    readonly entryFamily: ExpressionType | null,
    /** HTML node that owns this site. */
    readonly node: HtmlNodeReference,
    /** HTML attribute that owns this site, when this is an attribute value. */
    readonly attribute: HtmlAttributeReference | null,
    /** AttrSyntax product that selected this value site, when present. */
    readonly syntax: AttributeSyntax | null,
    /** Attribute classification that selected this value site, when present. */
    readonly classification: AttributeClassification | null,
    /** Binding command selected before parsing, when present. */
    readonly bindingCommand: BindingCommandExecutableReference | null,
    /** Bindable selected before parsing, when present. */
    readonly bindable: TemplateBindableReference | null,
    /** Source address for the authored value. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateValueSiteField>[] = [],
  ) {}

  toReference(): TemplateValueSiteReference {
    return new TemplateValueSiteReference(
      this.productHandle,
      this.identityHandle,
      this.siteKind,
      this.entryFamily,
      this.sourceAddressHandle,
    );
  }
}

/** Expression parser publication for one parser-owned template value site. */
export class TemplateExpressionParse {
  constructor(
    /** Product handle for the materialized-product envelope that represents this parse result. */
    readonly productHandle: ProductHandle,
    /** Identity for this parse result. */
    readonly identityHandle: IdentityHandle,
    /** Parser-owned value site that produced this parse. */
    readonly site: TemplateValueSiteReference,
    /** Parser service visible through the compiler world. */
    readonly parserProductHandle: ProductHandle | null,
    /** Parser publication state. */
    readonly state: TemplateExpressionParseState,
    /** Parser-owned result kind. */
    readonly resultKind: ExpressionParseResultKind,
    /** Parser-owned publication result. */
    readonly result: ExpressionParseResult,
    /** Source address for the authored value. */
    readonly sourceAddressHandle: AddressHandle | null,
    /** Field-level provenance for source facts that matter to explanation or ambiguity. */
    readonly fieldProvenance: readonly FieldProvenance<TemplateExpressionParseField>[] = [],
  ) {}
}

export function expressionParseStateForResult(
  result: ExpressionParseResult,
): TemplateExpressionParseState {
  switch (result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.IteratorSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.InterpolationAbsent:
    case ExpressionParseResultKind.OpaqueSuccess:
      return TemplateExpressionParseState.Complete;
    case ExpressionParseResultKind.CompleteInputParseError:
      return TemplateExpressionParseState.Error;
    case ExpressionParseResultKind.PropertyLikeDegradedPublication:
    case ExpressionParseResultKind.PropertyLikeFrontierPublication:
    case ExpressionParseResultKind.InterpolationDegradedPublication:
    case ExpressionParseResultKind.InterpolationFrontierPublication:
    case ExpressionParseResultKind.IteratorDegradedPublication:
    case ExpressionParseResultKind.IteratorFrontierPublication:
      return TemplateExpressionParseState.Companion;
  }
}
