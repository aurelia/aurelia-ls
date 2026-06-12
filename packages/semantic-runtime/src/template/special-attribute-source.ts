import { authoredTemplateAttributeText, type AuthoredTemplateAttributeSource } from './authored-template-source.js';

/** Framework-owned template attributes consumed by the compiler before ordinary binding/resource classification. */
export enum TemplateSpecialAttributeName {
  /** Alias a host element to a custom-element resource during element-definition lookup. */
  AsElement = 'as-element',
  /** Request usage-site containerless hydration for a custom element. */
  Containerless = 'containerless',
}

/** Stable value list for compiler-special template attribute names. */
export const TEMPLATE_SPECIAL_ATTRIBUTE_NAMES = [
  TemplateSpecialAttributeName.AsElement,
  TemplateSpecialAttributeName.Containerless,
] as const;

/** Attribute-like shape used by parsed HTML IR and source-free template composers. */
export interface TemplateSpecialAttributeLike {
  readonly rawName: string | null;
  readonly rawValue?: string;
}

/** Return true when an authored attribute is consumed by compiler control flow before binding/resource lowering. */
export function isTemplateSpecialAttributeName(rawName: string): boolean {
  return TEMPLATE_SPECIAL_ATTRIBUTE_NAMES.includes(rawName.toLowerCase() as TemplateSpecialAttributeName);
}

/** Find the authored value of a compiler-special template attribute. */
export function templateSpecialAttributeValue(
  attributes: readonly TemplateSpecialAttributeLike[] | null | undefined,
  name: TemplateSpecialAttributeName,
): string | null {
  return attributes?.find((attribute) => attribute.rawName?.toLowerCase() === name)?.rawValue ?? null;
}

/** Resolve the custom-element lookup name for an element after applying `as-element` when present. */
export function templateElementLookupNameFromAttributes(
  tagName: string,
  attributes: readonly TemplateSpecialAttributeLike[] | null | undefined,
): string {
  const asElement = templateSpecialAttributeValue(attributes, TemplateSpecialAttributeName.AsElement);
  return asElement == null || asElement.length === 0
    ? tagName.toLowerCase()
    : asElement.toLowerCase();
}

/** Serialize an `as-element` compiler-control attribute. */
export function asElementAttributeSource(resourceName: string): AuthoredTemplateAttributeSource {
  return {
    rawName: TemplateSpecialAttributeName.AsElement,
    rawValue: resourceName,
  };
}

/** Serialize an `as-element` compiler-control attribute. */
export function asElementAttributeSourceText(resourceName: string): string {
  return authoredTemplateAttributeText(asElementAttributeSource(resourceName));
}

/** Serialize a `containerless` compiler-control attribute. */
export function containerlessAttributeSource(): AuthoredTemplateAttributeSource {
  return {
    rawName: TemplateSpecialAttributeName.Containerless,
  };
}

/** Serialize a `containerless` compiler-control attribute. */
export function containerlessAttributeSourceText(): string {
  return authoredTemplateAttributeText(containerlessAttributeSource());
}
