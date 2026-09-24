import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import {
  DispatchBindingInstruction,
  IterateBindingInstruction,
  IteratorBindingInstruction,
  StateBindingInstruction,
  TranslationBindingInstruction,
  TranslationBindBindingInstruction,
  TranslationParametersBindingInstruction,
  type TemplateInstruction,
} from '../src/template/instruction-ir.js';
import {
  frameworkInstructionTypeFor,
  projectTemplateCompilerRuntimeInstructionClosure,
  TemplateCompilerFrameworkInstructionType,
  TemplateCompilerRuntimeInstructionFamilyState,
  TemplateCompilerRuntimeInstructionReasonKind,
  TemplateCompilerRuntimeResourceRepresentation,
  TemplateCompilerRuntimeTranslationKeyValue,
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

  test.each([TranslationBindBindingInstruction, TranslationParametersBindingInstruction])(
    'retains missing expression authority for %s',
    (Instruction) => {
      const site = translationInstructionSite();
      const instruction = new Instruction(
        site.handles.product('instruction'),
        site.handles.identity('instruction'),
        site.node,
        site.attribute,
        site.handles.product('missing-expression'),
        '',
        site.handles.address('instruction'),
      );
      const result = projectInstruction(instruction);
      expect(result.state).toBe(TemplateCompilerRuntimeInstructionFamilyState.Pending);
      expect(result.value).toBeNull();
      expect(result.reasons).toMatchObject([{
        reasonKind: TemplateCompilerRuntimeInstructionReasonKind.MissingExpressionAuthority,
        instructionKind: instruction.instructionKind,
      }]);
    },
  );

  test.each(['dashboard.title', '[title]dashboard.title;[text]dashboard.caption', ''])(
    'keeps raw translation key %j with a known-absent interpolation result',
    (key) => {
      const result = projectInstruction(rawTranslationInstruction(key));
      expect(result.reasons).toEqual([]);
      expect(result.value?.roots).toEqual([{
        type: TemplateCompilerFrameworkInstructionType.TranslationBinding,
        from: new TemplateCompilerRuntimeTranslationKeyValue(key, undefined),
        to: 'title',
        mode: 2,
      }]);
      // The recipe is deliberately not an executable generic Custom AST.
      expect(result.value?.roots[0]).not.toHaveProperty('from.$kind');
    },
  );

  test.each(['dashboard.${section}', 'dashboard.${section'])(
    'projects runtime-accepted translation interpolation %j through the shared parser',
    (key) => {
      const result = projectInstruction(rawTranslationInstruction(key));
      expect(result.reasons).toEqual([]);
      expect(result.value?.roots).toEqual([{
        type: TemplateCompilerFrameworkInstructionType.TranslationBinding,
        from: new TemplateCompilerRuntimeTranslationKeyValue(key, {
          $kind: 'Interpolation',
          isMulti: false,
          firstExpression: { $kind: 'AccessScope', name: 'section', ancestor: 0 },
          parts: ['dashboard.', ''],
          expressions: [{ $kind: 'AccessScope', name: 'section', ancestor: 0 }],
        }),
        to: 'title',
        mode: 2,
      }]);
    },
  );

  test('does not cache malformed raw translation interpolation as an absent result', () => {
    const result = projectInstruction(rawTranslationInstruction('dashboard.${section.}'));
    expect(result.state).toBe(TemplateCompilerRuntimeInstructionFamilyState.Pending);
    expect(result.value).toBeNull();
    expect(result.reasons).toMatchObject([{
      reasonKind: TemplateCompilerRuntimeInstructionReasonKind.ExpressionAstUnavailable,
    }]);
  });
});

function translationInstructionSite() {
  const handles = new KernelHandleFactory('translation-instruction-value');
  return {
    handles,
    node: new HtmlNodeReference(
      HtmlIrNodeKind.Element,
      handles.identity('node'),
      handles.product('node'),
      handles.address('node'),
    ),
    attribute: new HtmlAttributeReference(handles.product('attribute'), handles.address('attribute'), 't'),
  };
}

function rawTranslationInstruction(key: string): TranslationBindingInstruction {
  const site = translationInstructionSite();
  return new TranslationBindingInstruction(
    site.handles.product('instruction'),
    site.handles.identity('instruction'),
    site.node,
    site.attribute,
    key,
    'title',
    site.handles.address('instruction'),
  );
}

function projectInstruction(instruction: TemplateInstruction) {
  const revision = { equals: () => true };
  return projectTemplateCompilerRuntimeInstructionClosure({
    rootInstructions: [instruction],
    createdInstructions: [instruction],
    productDetails: {
      readProductDetail: () => null,
      readProjectionRevision: () => revision,
    },
    resourceRepresentation: TemplateCompilerRuntimeResourceRepresentation.Name,
  });
}
