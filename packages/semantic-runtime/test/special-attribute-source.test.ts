import { describe, expect, test } from 'vitest';

import { HtmlNamespaceKind } from '../src/template/html-ir.js';
import {
  templateElementLookupNameFromAttributes,
  TemplateSpecialAttributeName,
} from '../src/template/special-attribute-source.js';

describe('template element lookup name', () => {
  test('distinguishes an absent as-element attribute from an empty present value', () => {
    expect(templateElementLookupNameFromAttributes('DIV', [])).toBe('div');
    expect(templateElementLookupNameFromAttributes('DIV', [{
      rawName: TemplateSpecialAttributeName.AsElement,
      rawValue: '',
    }])).toBe('');
  });

  test('normalizes the present value with the JIT resource lookup rule', () => {
    expect(templateElementLookupNameFromAttributes('div', [{
      rawName: 'AS-ELEMENT',
      rawValue: 'My-Card',
    }], HtmlNamespaceKind.Html)).toBe('my-card');
  });
});
