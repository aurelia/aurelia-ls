import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import { IterateBindingInstruction, IteratorBindingInstruction } from '../src/template/instruction-ir.js';
import {
  frameworkInstructionTypeFor,
  TemplateCompilerFrameworkInstructionType,
} from '../src/template/template-instruction-runtime-value.js';

describe('template instruction runtime values', () => {
  test('preserves core and plugin iterator runtime type identity', () => {
    const handles = new KernelHandleFactory('template-instruction-runtime-value');
    const node = new HtmlNodeReference(
      HtmlIrNodeKind.Element,
      handles.identity('node'),
      handles.product('node'),
      handles.address('node'),
    );
    const attribute = new HtmlAttributeReference(
      handles.product('attribute'),
      handles.address('attribute'),
      'repeat.for',
    );
    const instructionArguments = [
      handles.product('instruction'),
      handles.identity('instruction'),
      node,
      attribute,
      'items',
      ['item'],
      [],
      handles.product('expression'),
      [],
      handles.address('instruction'),
    ] as const;

    expect(frameworkInstructionTypeFor(new IteratorBindingInstruction(...instructionArguments)))
      .toBe(TemplateCompilerFrameworkInstructionType.IteratorBinding);
    expect(frameworkInstructionTypeFor(new IterateBindingInstruction(...instructionArguments)))
      .toBe(TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding);
  });
});
