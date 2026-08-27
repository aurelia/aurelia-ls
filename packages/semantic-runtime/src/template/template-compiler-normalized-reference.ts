import type { AttributeClassification } from './attribute-syntax.js';
import type { MultiBindingLowering, MultiBindingSegment } from './binding-command-execution.js';
import type {
  HtmlAttribute,
  HtmlAttributeReference,
  HtmlElement,
  HtmlNodeReference,
  HtmlText,
} from './html-ir.js';
import type { TemplateExpressionParse, TemplateValueSite } from './value-site.js';

export function sameNormalizedAttributeReference(
  reference: HtmlAttributeReference | null,
  attribute: HtmlAttribute,
): boolean {
  return reference != null
    && reference.productHandle === attribute.productHandle
    && reference.addressHandle === attribute.sourceAddressHandle
    && reference.rawName === attribute.rawName;
}

export function sameNormalizedNodeReference(
  reference: HtmlNodeReference,
  node: HtmlElement | HtmlText,
): boolean {
  return reference.productHandle === node.productHandle
    && reference.identityHandle === node.identityHandle
    && reference.addressHandle === node.sourceAddressHandle
    && reference.nodeKind === node.nodeKind;
}

export function sameNormalizedValueSiteReference(
  reference: TemplateExpressionParse['site'] | MultiBindingSegment['site'] | MultiBindingLowering['site'],
  site: TemplateValueSite,
): boolean {
  return reference.productHandle === site.productHandle
    && reference.identityHandle === site.identityHandle
    && reference.siteKind === site.siteKind
    && reference.entryFamily === site.entryFamily
    && reference.sourceAddressHandle === site.sourceAddressHandle;
}

export function sameNormalizedBindingCommandReference(
  left: AttributeClassification['bindingCommand'],
  right: AttributeClassification['bindingCommand'],
): boolean {
  return left == null || right == null
    ? left === right
    : left.productHandle === right.productHandle
      && left.identityHandle === right.identityHandle
      && left.name === right.name
      && left.key === right.key;
}
