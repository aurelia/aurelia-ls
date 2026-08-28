import { describe, expect, test } from 'vitest';

import { AttributeSyntaxKind } from '../src/template/attribute-syntax.js';
import {
  decideTemplateCompilerSurrogateValidation,
  isInvalidTemplateCompilerSurrogateTarget,
  TemplateCompilerSurrogateValidationOutcome,
} from '../src/template/surrogate-compiler-semantics.js';

describe('surrogate compiler semantics', () => {
  test('retains the four intended invalid targets without object-prototype membership', () => {
    expect(['id', 'name', 'au-slot', 'as-element'].map(isInvalidTemplateCompilerSurrogateTarget))
      .toEqual([true, true, true, true]);
    expect(['constructor', 'toString', '__proto__', 'data-ok'].map(isInvalidTemplateCompilerSurrogateTarget))
      .toEqual([false, false, false, false]);
  });

  test('keeps parser/scalar openness distinct from refused and valid targets', () => {
    expect(decideTemplateCompilerSurrogateValidation(
      true,
      true,
      true,
      AttributeSyntaxKind.Pattern,
      'id',
    )).toBe(TemplateCompilerSurrogateValidationOutcome.Refused);
    expect(decideTemplateCompilerSurrogateValidation(
      false,
      true,
      true,
      AttributeSyntaxKind.Plain,
      'data-ok',
    )).toBe(TemplateCompilerSurrogateValidationOutcome.Open);
    expect(decideTemplateCompilerSurrogateValidation(
      true,
      true,
      true,
      AttributeSyntaxKind.Plain,
      'data-ok',
    )).toBe(TemplateCompilerSurrogateValidationOutcome.Valid);
  });
});
