import { createParser, type AstAttribute, type AstRule, type AstSelector } from 'css-selector-parser';

import { HtmlNamespaceKind } from './html-ir.js';
import { snapshotTemplateCompilerDescendantElements } from './template-compiler-dom-query.js';
import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  type TemplateCompilerAttributeOccurrence,
  type TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';

export type TemplateCompilerSelectorResult =
  | { readonly kind: 'complete'; readonly elements: readonly TemplateCompilerElementOccurrence[] }
  | { readonly kind: 'unsupported' | 'syntax-error'; readonly summary: string };

type AttributeValueReader = (attribute: TemplateCompilerAttributeOccurrence) => string;
type Match = boolean | null;
type SelectorItem = AstRule['items'][number];

const parseSelector = createParser({ syntax: 'progressive', strict: false });
const asciiWhitespace = /[\t\n\f\r ]+/;
// HTML's selector-value rule is by attribute name, not by the element accepting that attribute.
// https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors
const htmlInsensitiveValues = new Set((
  'accept accept-charset align alink axis bgcolor charset checked clear codetype color compact declare defer dir '
  + 'direction disabled enctype face frame hreflang http-equiv lang language link media method multiple nohref '
  + 'noresize noshade nowrap readonly rel rev rules scope scrolling selected shape target text type valign valuetype vlink'
).split(' '));

/**
 * Structural selectors over the current compiler forest, without a second DOM or native-state approximation.
 *
 * Returned nodes are strictly descendants of root. Matching can inspect their ordinary ancestors and siblings outside
 * root, as Element.querySelector(All) does, but cannot cross a template-content edge. The callback supplies current
 * pending attribute values. The supported profile is an HTML standards-mode document, like the browser-template input.
 */
export function queryTemplateCompilerDescendantElements(
  root: TemplateCompilerParentOccurrence,
  selector: string,
  readAttributeValue: AttributeValueReader = attribute => attribute.value,
): TemplateCompilerSelectorResult {
  if (/^[\t\n\f\r ]*$/.test(selector)) return { kind: 'syntax-error', summary: 'An empty selector is not valid.' };
  const profileIssue = selectorParserProfileIssue(selector);
  if (profileIssue !== null) return profileIssue;
  let parsed: AstSelector;
  try {
    parsed = parseSelector(selector);
  } catch {
    // A parser rejection is not necessarily a browser SyntaxError: CSS supports EOF recovery and evolves independently.
    return { kind: 'unsupported', summary: 'Selector syntax is outside the supported compiler DOM parser profile.' };
  }
  const rules: AstRule[][] = [];
  for (const first of parsed.rules) {
    const chain: AstRule[] = [];
    for (let rule: AstRule | undefined = first; rule !== undefined; rule = rule.nestedRule) {
      if (chain.length === 0 && rule.combinator !== undefined) {
        return { kind: 'syntax-error', summary: 'A DOM query cannot begin with a relative selector combinator.' };
      }
      if (rule.combinator !== undefined && !['>', '+', '~'].includes(rule.combinator)) {
        return { kind: 'unsupported', summary: 'This selector combinator is not a supported structural DOM query.' };
      }
      for (const item of rule.items) {
        const summary = unsupportedItem(item);
        if (summary !== null) return { kind: 'unsupported', summary };
      }
      chain.push(rule);
    }
    rules.push(chain);
  }
  const elements: TemplateCompilerElementOccurrence[] = [];
  for (const element of snapshotTemplateCompilerDescendantElements(root)) {
    let matched: Match = false;
    for (const chain of rules) {
      matched = either(matched, matchChain(element, chain, chain.length - 1, root, readAttributeValue));
      if (matched === true) break;
    }
    if (matched === null) {
      return { kind: 'unsupported', summary: 'Foreign-element selector case matching differs across browser profiles.' };
    }
    if (matched) elements.push(element);
  }
  return { kind: 'complete', elements };
}

/** Fence known lexical differences in the pinned parser instead of adding a second CSS lexer. */
function selectorParserProfileIssue(selector: string): Exclude<TemplateCompilerSelectorResult, { readonly kind: 'complete' }> | null {
  if (selector.includes('/*')) {
    return { kind: 'unsupported', summary: 'CSS comments are outside the pinned selector parser profile.' };
  }
  if (selector.includes('\0') || /[\uD800-\uDFFF]/u.test(selector)) {
    return { kind: 'unsupported', summary: 'This selector needs CSS Unicode input preprocessing outside the parser profile.' };
  }
  let quote: string | null = null;
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index]!;
    if (character === '\\') {
      const next = selector[index + 1];
      if (next === undefined || /[\r\n\f]/.test(next)) {
        return { kind: 'unsupported', summary: 'Selector escape continuation is outside the supported parser profile.' };
      }
      const hex = /^[\da-fA-F]{1,6}/.exec(selector.slice(index + 1))?.[0];
      if (hex !== undefined) {
        const codePoint = Number.parseInt(hex, 16);
        if (codePoint === 0 || codePoint > 0xffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
          return { kind: 'unsupported', summary: 'This CSS escape needs Unicode normalization outside the pinned parser profile.' };
        }
        index += hex.length;
        if (/[\t\n\f\r ]/.test(selector[index + 1] ?? '')) {
          if (selector[index + 1] === '\r' && selector[index + 2] === '\n') index++;
          index++;
        }
      } else {
        index++;
      }
    } else if (quote !== null) {
      if (character === quote) quote = null;
      else if (/[\r\n\f]/.test(character)) {
        return { kind: 'syntax-error', summary: 'A CSS quoted string cannot contain an unescaped line break.' };
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    }
  }
  return null;
}

function unsupportedItem(item: SelectorItem): string | null {
  switch (item.type) {
    case 'TagName':
    case 'WildcardTag':
      return item.namespace?.type === 'NamespaceName' ? 'Named selector namespaces are not supported by DOM queries.' : null;
    case 'Id':
    case 'ClassName': return null;
    case 'Attribute':
      if (item.namespace?.type === 'NamespaceName') return 'Named attribute-selector namespaces are not supported by DOM queries.';
      if (item.caseSensitivityModifier !== undefined && asciiLower(item.caseSensitivityModifier) !== 'i') {
        return 'This attribute-selector case modifier is outside the supported browser profile.';
      }
      if (item.operator !== undefined && !['=', '~=', '|=', '^=', '$=', '*='].includes(item.operator)) {
        return 'This attribute-selector operator is not supported.';
      }
      return item.value !== undefined && item.value.type !== 'String' ? 'Selector substitutions are not DOM syntax.' : null;
    case 'PseudoClass':
      return asciiLower(item.name) === 'scope' && item.argument === undefined
        ? null : 'Only :scope is supported; other pseudo-classes retain native JIT evaluation.';
    case 'PseudoElement': return 'Pseudo-element selectors retain native JIT evaluation.';
    case 'NestingSelector': return 'CSS nesting selectors retain native JIT evaluation.';
  }
}

function matchChain(
  element: TemplateCompilerElementOccurrence,
  chain: readonly AstRule[],
  index: number,
  scope: TemplateCompilerParentOccurrence,
  readAttributeValue: AttributeValueReader,
): Match {
  const rule = chain[index]!;
  let own: Match = true;
  for (const item of rule.items) own = both(own, matchItem(element, item, scope, readAttributeValue));
  if (own === false || index === 0) return own;
  const prior = (candidate: TemplateCompilerElementOccurrence): Match =>
    matchChain(candidate, chain, index - 1, scope, readAttributeValue);
  let related: Match = false;
  switch (rule.combinator) {
    case '>': {
      const parent = ordinaryParent(element);
      related = parent === null ? false : prior(parent);
      break;
    }
    case '+':
    case '~': {
      const siblings = element.parent?.readChildren() ?? [];
      for (let ordinal = siblings.indexOf(element) - 1; ordinal >= 0; ordinal--) {
        const sibling = siblings[ordinal]!;
        if (!(sibling instanceof TemplateCompilerElementOccurrence)) continue;
        related = either(related, prior(sibling));
        if (rule.combinator === '+' || related === true) break;
      }
      break;
    }
    default:
      for (let parent = ordinaryParent(element); parent !== null; parent = ordinaryParent(parent)) {
        related = either(related, prior(parent));
        if (related === true) break;
      }
  }
  return both(own, related);
}

function matchItem(
  element: TemplateCompilerElementOccurrence,
  item: SelectorItem,
  scope: TemplateCompilerParentOccurrence,
  readAttributeValue: AttributeValueReader,
): Match {
  switch (item.type) {
    case 'TagName':
    case 'WildcardTag':
      if (item.namespace?.type === 'NoNamespace' && element.namespaceUri !== '') return false;
      return item.type === 'WildcardTag' ? true
        : matchName(element.tagName, item.name, element.namespace === HtmlNamespaceKind.Html);
    case 'Id': return reflectedValue(element, 'id', readAttributeValue) === item.name;
    case 'ClassName': return reflectedValue(element, 'class', readAttributeValue)?.split(asciiWhitespace).includes(item.name) ?? false;
    case 'Attribute': return matchAttribute(element, item, readAttributeValue);
    case 'PseudoClass': return element === scope;
    default: return false; // The complete selector was preflighted before any candidate was inspected.
  }
}

function matchAttribute(
  element: TemplateCompilerElementOccurrence,
  item: AstAttribute,
  readAttributeValue: AttributeValueReader,
): Match {
  let result: Match = false;
  for (const attribute of element.readAttributes()) {
    if (item.namespace?.type !== 'WildcardNamespace' && attribute.namespaceUri !== null) continue;
    const htmlElement = element.namespace === HtmlNamespaceKind.Html;
    const html = htmlElement && attribute.namespaceUri === null;
    const name = htmlElement && !html && attribute.name !== asciiLower(attribute.name)
      && asciiLower(attribute.name) === asciiLower(item.name)
      ? null : matchName(attribute.name, item.name, html);
    if (name === false) continue;
    let matchesValue = true;
    if (item.value?.type === 'String') {
      let value = readAttributeValue(attribute);
      let expected = item.value.value;
      if (item.caseSensitivityModifier !== undefined || (html && htmlInsensitiveValues.has(asciiLower(item.name)))) {
        value = asciiLower(value);
        expected = asciiLower(expected);
      }
      switch (item.operator) {
        case '=': matchesValue = value === expected; break;
        case '~=': matchesValue = expected !== '' && value.split(asciiWhitespace).includes(expected); break;
        case '|=': matchesValue = value === expected || value.startsWith(`${expected}-`); break;
        case '^=': matchesValue = expected !== '' && value.startsWith(expected); break;
        case '$=': matchesValue = expected !== '' && value.endsWith(expected); break;
        case '*=': matchesValue = expected !== '' && value.includes(expected); break;
      }
    }
    result = either(result, both(name, matchesValue));
    if (result === true) break;
  }
  return result;
}

function reflectedValue(element: TemplateCompilerElementOccurrence, name: string, read: AttributeValueReader): string | null {
  const attribute = element.readAttributes().find(value => value.namespaceUri === null && value.name === name);
  return attribute === undefined ? null : read(attribute);
}

function ordinaryParent(element: TemplateCompilerElementOccurrence): TemplateCompilerElementOccurrence | null {
  return element.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.Child && element.parent instanceof TemplateCompilerElementOccurrence
    ? element.parent : null;
}

function matchName(actual: string, expected: string, html: boolean): Match {
  if (actual === (html ? asciiLower(expected) : expected)) return true;
  // Chromium folds foreign names in HTML documents; the HTML standard requires original-case matching there.
  return !html && asciiLower(actual) === asciiLower(expected) ? null : false;
}

function asciiLower(value: string): string {
  return value.replace(/[A-Z]/g, character => character.toLowerCase());
}

function both(left: Match, right: Match): Match {
  return left === false || right === false ? false : left === null || right === null ? null : true;
}

function either(left: Match, right: Match): Match {
  return left === true || right === true ? true : left === null || right === null ? null : false;
}
