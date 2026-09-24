import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import {
  DispatchBindingInstruction,
  IterateBindingInstruction,
  IteratorBindingInstruction,
  StateBindingInstruction,
} from '../src/template/instruction-ir.js';
import {
  frameworkInstructionTypeFor,
  projectTemplateCompilerRuntimeInstructionClosure,
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeInstructionFamilyState,
  TemplateCompilerRuntimeInstructionReasonKind,
  TemplateCompilerRuntimeResourceRepresentation,
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

  test.each([StateBindingInstruction, DispatchBindingInstruction])(
    'does not replace missing expression authority with raw strings for %s',
    (Instruction) => {
      const handles = new KernelHandleFactory('state-instruction-expression-authority');
      const node = new HtmlNodeReference(
        HtmlIrNodeKind.Element,
        handles.identity('node'),
        handles.product('node'),
        handles.address('node'),
      );
      const attribute = new HtmlAttributeReference(
        handles.product('attribute'),
        handles.address('attribute'),
        Instruction === StateBindingInstruction ? 'value.state' : 'click.dispatch',
      );
      const instruction = new Instruction(
        handles.product('instruction'),
        handles.identity('instruction'),
        node,
        attribute,
        'value',
        'value',
        null,
        null,
        handles.product('missing-expression'),
        handles.address('instruction'),
      );
      const revision = { equals: () => true };
      const result = projectTemplateCompilerRuntimeInstructionClosure({
        rootInstructions: [instruction],
        createdInstructions: [instruction],
        productDetails: {
          readProductDetail: () => null,
          readProjectionRevision: () => revision,
        },
        resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
      });
      expect(result.state).toBe(TemplateCompilerRuntimeInstructionFamilyState.Pending);
      expect(result.value).toBeNull();
      expect(result.reasons).toMatchObject([{
        reasonKind: TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        instructionKind: instruction.instructionKind,
      }]);
    },
  );
});
