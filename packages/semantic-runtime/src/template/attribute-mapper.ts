import { isStandardSvgAttribute } from '../observation/svg-analyzer-data.generated.js';
import { HtmlNamespaceKind } from './html-ir.js';

/** Minimal element shape consumed by AttrMapper without depending on DOM nodes. */
export interface TemplateAttributeMapperNode {
  readonly tagName: string;
  readonly namespace?: HtmlNamespaceKind;
  readonly attributes?: readonly {
    readonly rawName: string | null;
    readonly rawValue?: string;
  }[];
}

export function mapAttribute(
  element: TemplateAttributeMapperNode,
  attr: string,
): string | null {
  const tagName = element.tagName.toUpperCase();
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
  switch (owner.tagName.toUpperCase()) {
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
          return hasAttribute(owner, 'contenteditable');
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
  return owner.attributes?.find((attribute) => attribute.rawName?.toLowerCase() === name)?.rawValue ?? null;
}

function hasAttribute(
  owner: TemplateAttributeMapperNode,
  name: string,
): boolean {
  return owner.attributes?.some((attribute) => attribute.rawName?.toLowerCase() === name) ?? false;
}
