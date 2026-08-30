import { describe, expect, test } from 'vitest';

import { KernelHandleFactory } from '../src/kernel/handles.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import { IterateBindingInstruction, TemplateInstructionKind } from '../src/template/instruction-ir.js';
import {
  I18nTranslationRenderers,
  RuntimeHtmlDefaultRenderers,
  RuntimeRendererExportVisibility,
  RuntimeRendererPackage,
  runtimeRendererPackageModuleSpecifier,
  StateDefaultRenderers,
} from '../src/template/runtime-renderer.js';
import {
  frameworkInstructionTypeFor,
  TemplateCompilerFrameworkInstructionType,
} from '../src/template/template-instruction-runtime-value.js';

describe('runtime renderer catalog', () => {
  test('mirrors runtime-html DefaultRenderers order and public-entry identities', () => {
    expect(RuntimeHtmlDefaultRenderers.map((renderer) => [
      renderer.targetName,
      renderer.targetInstructionType,
    ])).toEqual([
      ['PropertyBindingRenderer', 12],
      ['IteratorBindingRenderer', 15],
      ['RefBindingRenderer', 14],
      ['InterpolationBindingRenderer', 11],
      ['SetPropertyRenderer', 10],
      ['CustomElementRenderer', 0],
      ['CustomAttributeRenderer', 1],
      ['TemplateControllerRenderer', 2],
      ['LetElementRenderer', 3],
      ['ListenerBindingRenderer', 31],
      ['AttributeBindingRenderer', 32],
      ['SetAttributeRenderer', 34],
      ['SetClassAttributeRenderer', 35],
      ['SetStyleAttributeRenderer', 36],
      ['StylePropertyBindingRenderer', 33],
      ['TextBindingRenderer', 30],
      ['SpreadRenderer', 50],
      ['SpreadValueRenderer', 52],
    ]);
    expect(RuntimeHtmlDefaultRenderers.map((renderer) =>
      runtimeRendererPackageModuleSpecifier(renderer.packageId)))
      .toEqual(RuntimeHtmlDefaultRenderers.map(() => '@aurelia/runtime-html'));
    expect(RuntimeHtmlDefaultRenderers.map((renderer) => renderer.exportVisibility)).toEqual([
      ...RuntimeHtmlDefaultRenderers.slice(0, -1).map(() => RuntimeRendererExportVisibility.Public),
      RuntimeRendererExportVisibility.PackageInternal,
    ]);
  });

  test('owns extension renderer export identities at their framework packages', () => {
    expect(I18nTranslationRenderers.map((renderer) => [
      runtimeRendererPackageModuleSpecifier(renderer.packageId),
      renderer.targetName,
      renderer.targetInstructionType,
      renderer.exportVisibility,
    ])).toEqual([
      ['@aurelia/i18n', 'TranslationBindingRenderer', 100, RuntimeRendererExportVisibility.Public],
      ['@aurelia/i18n', 'TranslationBindBindingRenderer', 101, RuntimeRendererExportVisibility.Public],
      ['@aurelia/i18n', 'TranslationParametersBindingRenderer', 102, RuntimeRendererExportVisibility.Public],
    ]);
    expect(StateDefaultRenderers.map((renderer) => [
      runtimeRendererPackageModuleSpecifier(renderer.packageId),
      renderer.targetName,
      renderer.targetInstructionType,
      renderer.exportVisibility,
    ])).toEqual([
      ['@aurelia/state', 'StateBindingInstructionRenderer', 120, RuntimeRendererExportVisibility.Public],
      ['@aurelia/state', 'DispatchBindingInstructionRenderer', 121, RuntimeRendererExportVisibility.Public],
    ]);
    expect(runtimeRendererPackageModuleSpecifier(RuntimeRendererPackage.RuntimeHtml)).toBe('@aurelia/runtime-html');
  });

  test('keeps plugin type-200 distinct from the runtime-html iterator renderer', () => {
    const handles = new KernelHandleFactory('runtime-renderer-catalog-type-200');
    const instruction = new IterateBindingInstruction(
      handles.product('instruction'),
      handles.identity('instruction'),
      new HtmlNodeReference(
        HtmlIrNodeKind.Element,
        handles.identity('node'),
        handles.product('node'),
        handles.address('node'),
      ),
      new HtmlAttributeReference(
        handles.product('attribute'),
        handles.address('attribute'),
        'virtual-repeat.for',
      ),
      'items',
      ['item'],
      [],
      handles.product('expression'),
      [],
      handles.address('instruction'),
    );
    const semanticIteratorRenderers = RuntimeHtmlDefaultRenderers.filter((renderer) =>
      renderer.targetInstructionKind === TemplateInstructionKind.IteratorBinding);

    expect(instruction.instructionKind).toBe(TemplateInstructionKind.IteratorBinding);
    expect(frameworkInstructionTypeFor(instruction))
      .toBe(TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding);
    expect(semanticIteratorRenderers.map((renderer) => renderer.targetName)).toEqual([
      'IteratorBindingRenderer',
    ]);
    expect(semanticIteratorRenderers.map((renderer) => renderer.targetInstructionType)).toEqual([15]);
    expect([
      ...RuntimeHtmlDefaultRenderers,
      ...I18nTranslationRenderers,
      ...StateDefaultRenderers,
    ].map((renderer) => renderer.targetInstructionType)).not.toContain(200);
    expect(RuntimeHtmlDefaultRenderers.map((renderer) => renderer.targetName))
      .not.toContain('IterateBindingRenderer');
  });
});
