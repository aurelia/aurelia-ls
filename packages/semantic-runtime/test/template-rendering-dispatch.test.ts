import { describe, expect, test } from 'vitest';

import { ContainerReference } from '../src/di/container-reference.js';
import { KernelHandleFactory } from '../src/kernel/handles.js';
import { TemplateRenderingService } from '../src/template/compiler-world.js';
import { HtmlAttributeReference, HtmlIrNodeKind, HtmlNodeReference } from '../src/template/html-ir.js';
import { IterateBindingInstruction, IteratorBindingInstruction } from '../src/template/instruction-ir.js';
import { IterateBindingRenderer, IteratorBindingRenderer } from '../src/template/runtime-renderer.js';
import { TemplateCompilerFrameworkInstructionType } from '../src/template/template-instruction-runtime-value.js';

describe('runtime Rendering instruction dispatch', () => {
  test('uses the exact framework instruction type and preserves first registration precedence', () => {
    const handles = new KernelHandleFactory('rendering-exact-dispatch');
    const first = new IteratorBindingRenderer(handles.product('first'), handles.identity('first'));
    const second = new IteratorBindingRenderer(handles.product('second'), handles.identity('second'));
    const rendering = new TemplateRenderingService(
      handles.product('rendering'),
      handles.identity('rendering'),
      new ContainerReference(handles.identity('container'), handles.product('container'), null, null),
      [first, second],
      null,
    );
    const node = new HtmlNodeReference(HtmlIrNodeKind.Element, handles.identity('node'), handles.product('node'), null);
    const attribute = new HtmlAttributeReference(handles.product('attribute'), null, 'repeat.for');
    const core = new IteratorBindingInstruction(
      handles.product('core'), handles.identity('core'), node, attribute,
      'items', ['item'], [], handles.product('expression'), [], null,
    );
    const plugin = new IterateBindingInstruction(
      handles.product('plugin'), handles.identity('plugin'), node, attribute,
      'items', ['item'], [], handles.product('expression'), [], null,
    );

    expect(core.instructionKind).toBe(plugin.instructionKind);
    expect(rendering.rendererForInstruction(core)).toBe(first);
    expect(rendering.rendererForInstructionType(TemplateCompilerFrameworkInstructionType.IteratorBinding)).toBe(first);
    // A semantic family is not the ABI identity. Missing plugin registration must not borrow the core renderer.
    expect(rendering.rendererForInstruction(plugin)).toBeNull();

    const pluginRenderer = new IterateBindingRenderer(handles.product('plugin-renderer'), handles.identity('plugin-renderer'));
    const withPlugin = new TemplateRenderingService(
      handles.product('plugin-rendering'),
      handles.identity('plugin-rendering'),
      rendering.container,
      [first, pluginRenderer, second],
      null,
    );
    expect(withPlugin.rendererForInstruction(core)).toBe(first);
    expect(withPlugin.rendererForInstruction(plugin)).toBe(pluginRenderer);
    expect(withPlugin.rendererForInstructionType(TemplateCompilerFrameworkInstructionType.VirtualizationIterateBinding))
      .toBe(pluginRenderer);
  });
});
