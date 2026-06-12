import { isStandardSvgAttribute } from '../observation/svg-analyzer-data.generated.js';
import {
  hasHtmlAttribute,
  htmlAttributeValue,
  HtmlNamespaceKind,
  normalizeHtmlTagName,
  type HtmlAttributeLike,
} from './html-ir.js';

/** Minimal element shape consumed by AttrMapper without depending on DOM nodes. */
export interface TemplateAttributeMapperNode {
  readonly tagName: string;
  readonly namespace?: HtmlNamespaceKind;
  readonly attributes?: readonly HtmlAttributeLike[];
}

export class AttributeMapperMapping {
  constructor(
    /** Runtime nodeName lane consumed by AttrMapper.map, normalized to the framework's uppercase HTML node names. */
    readonly tagName: string | null,
    /** Authored attribute key before binding-command lowering maps it to a target property. */
    readonly attributeName: string,
    /** Runtime property key selected for the attribute. */
    readonly propertyName: string,
  ) {}
}

export class AttributeMapperTwoWayRule {
  constructor(
    /** Runtime nodeName/tagName required by an app-authored useTwoWay predicate. */
    readonly tagName: string | null,
    /** Runtime attribute/property key required by an app-authored useTwoWay predicate. */
    readonly propertyName: string | null,
  ) {}

  matches(
    node: TemplateAttributeMapperNode,
    propertyName: string,
  ): boolean {
    return (this.tagName == null || normalizeHtmlTagName(node.tagName) === normalizeHtmlTagName(this.tagName))
      && (this.propertyName == null || propertyName === this.propertyName);
  }
}

/**
 * Static service state produced by app-authored AttrMapper customizations.
 *
 * Aurelia keeps this state inside the mutable AttrMapper instance. Semantic-runtime keeps the same service shape while
 * making the statically recognized state explicit so compiler worlds and component worlds can inherit it.
 */
export class AttributeMapperConfiguration {
  static readonly empty = new AttributeMapperConfiguration([], []);

  private readonly mappingsByTag = new Map<string, Map<string, string>>();
  private readonly globalMappings = new Map<string, string>();

  constructor(
    readonly mappings: readonly AttributeMapperMapping[],
    readonly twoWayRules: readonly AttributeMapperTwoWayRule[],
  ) {
    for (const mapping of mappings) {
      if (mapping.tagName == null) {
        this.globalMappings.set(normalizeAttributeName(mapping.attributeName), mapping.propertyName);
        continue;
      }
      const tagName = normalizeHtmlTagName(mapping.tagName);
      let tagMappings = this.mappingsByTag.get(tagName);
      if (tagMappings == null) {
        tagMappings = new Map();
        this.mappingsByTag.set(tagName, tagMappings);
      }
      tagMappings.set(normalizeAttributeName(mapping.attributeName), mapping.propertyName);
    }
  }

  get isEmpty(): boolean {
    return this.mappings.length === 0 && this.twoWayRules.length === 0;
  }

  map(
    element: TemplateAttributeMapperNode,
    attr: string,
  ): string | null {
    const attributeName = normalizeAttributeName(attr);
    return this.mappingsByTag.get(normalizeHtmlTagName(element.tagName))?.get(attributeName)
      ?? this.globalMappings.get(attributeName)
      ?? null;
  }

  isTwoWay(
    node: TemplateAttributeMapperNode,
    propertyName: string,
  ): boolean {
    return this.twoWayRules.some((rule) => rule.matches(node, propertyName));
  }
}

export function mapAttribute(
  element: TemplateAttributeMapperNode,
  attr: string,
): string | null {
  const tagName = normalizeHtmlTagName(element.tagName);
  const lowerAttr = attr.toLowerCase();
  const tagMapping = tagName === 'LABEL' && lowerAttr === 'for'
    ? 'htmlFor'
    : tagName === 'IMG' && lowerAttr === 'usemap'
      ? 'useMap'
      : tagName === 'INPUT'
        ? inputAttributeMapping(lowerAttr)
        : (tagName === 'TEXTAREA' && lowerAttr === 'maxlength')
          ? 'maxLength'
          : (tagName === 'TD' || tagName === 'TH')
            ? tableCellAttributeMapping(lowerAttr)
            : null;
  return tagMapping
    ?? globalAttributeMapping(lowerAttr)
    ?? (isDataAttribute(element, attr) ? attr : null);
}

export function camelCaseAttributeName(value: string): string {
  return value.replace(/-([a-z])/g, (_match, char: string) => char.toUpperCase());
}

export function shouldDefaultToTwoWay(
  owner: TemplateAttributeMapperNode,
  attr: string,
): boolean {
  const lowerAttr = attr.toLowerCase();
  switch (normalizeHtmlTagName(owner.tagName)) {
    case 'INPUT': {
      const type = attributeValue(owner, 'type')?.toLowerCase() ?? '';
      switch (type) {
        case 'checkbox':
        case 'radio':
          return lowerAttr === 'checked';
        default:
          return lowerAttr === 'value'
            || lowerAttr === 'files'
            || lowerAttr === 'value-as-number'
            || lowerAttr === 'value-as-date';
      }
    }
    case 'TEXTAREA':
    case 'SELECT':
      return lowerAttr === 'value';
    default:
      switch (lowerAttr) {
        case 'textcontent':
        case 'innerhtml':
          return hasHtmlAttribute(owner, 'contenteditable');
        case 'scrolltop':
        case 'scrollleft':
          return true;
        default:
          return false;
      }
  }
}

function inputAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'maxlength':
      return 'maxLength';
    case 'minlength':
      return 'minLength';
    case 'formaction':
      return 'formAction';
    case 'formenctype':
      return 'formEncType';
    case 'formmethod':
      return 'formMethod';
    case 'formnovalidate':
      return 'formNoValidate';
    case 'formtarget':
      return 'formTarget';
    case 'inputmode':
      return 'inputMode';
    default:
      return null;
  }
}

function tableCellAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'rowspan':
      return 'rowSpan';
    case 'colspan':
      return 'colSpan';
    default:
      return null;
  }
}

function globalAttributeMapping(attr: string): string | null {
  switch (attr) {
    case 'accesskey':
      return 'accessKey';
    case 'contenteditable':
      return 'contentEditable';
    case 'tabindex':
      return 'tabIndex';
    case 'textcontent':
      return 'textContent';
    case 'innerhtml':
      return 'innerHTML';
    case 'scrolltop':
      return 'scrollTop';
    case 'scrollleft':
      return 'scrollLeft';
    case 'readonly':
      return 'readOnly';
    default:
      return null;
  }
}

function isDataAttribute(
  element: TemplateAttributeMapperNode,
  attr: string,
): boolean {
  const lowerAttr = attr.toLowerCase();
  return lowerAttr.startsWith('data-')
    || lowerAttr.startsWith('aria-')
    || (
      element.namespace === HtmlNamespaceKind.Svg
      && isStandardSvgAttribute(element.tagName, attr)
    );
}

function attributeValue(
  owner: TemplateAttributeMapperNode,
  name: string,
): string | null {
  return htmlAttributeValue(owner, name);
}

function normalizeAttributeName(value: string): string {
  return value.toLowerCase();
}
