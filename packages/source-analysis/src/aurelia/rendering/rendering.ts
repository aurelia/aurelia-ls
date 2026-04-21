import type { Controller } from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import { CustomAttributeRenderer, type CustomAttributePreparation } from './custom-attribute-renderer.js';
import { CustomElementRenderer, type CustomElementPreparation } from './custom-element-renderer.js';
import { TemplateControllerRenderer } from '../compiler/template-controller-renderer.js';
import type { TemplateControllerPreparation } from '../compiler/template-controller-renderer.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { BuiltinInstructionRendererKind } from './builtin-instruction-renderers.js';

export const RENDERING_OPEN_SEAM_KINDS = [
  'custom-renderer-profile-open',
  'resource-renderer-preparation-open',
] as const;

export type RenderingOpenSeamKind =
  typeof RENDERING_OPEN_SEAM_KINDS[number];

export class RenderingOpenSeam {
  constructor(
    readonly kind: RenderingOpenSeamKind,
    readonly location: string | null = null,
    readonly note: string | null = null,
  ) {}
}

// NOTE: this clean-room Rendering surface mirrors runtime's role as the
// instruction-to-renderer dispatcher and helper owner. It intentionally does
// not try to clone DOM/node creation or cached compiled-definition behavior
// yet; the current burden is renderer admission + division-of-labor over the
// consulted world.
export class Rendering {
  private readonly byInstructionKind = new Map<BuiltinInstructionRendererKind, InstructionRenderer>();
  private readonly byReferenceName = new Map<string, InstructionRenderer>();
  private readonly customElementRenderer: CustomElementRenderer | null;
  private readonly customAttributeRenderer: CustomAttributeRenderer | null;
  private readonly templateControllerRenderer: TemplateControllerRenderer | null;

  constructor(
    readonly definitions: readonly InstructionRenderer[] = [],
    readonly openSeams: readonly RenderingOpenSeam[] = [],
  ) {
    for (const current of definitions) {
      this.byReferenceName.set(current.referenceName, current);
      if (current.instructionKind != null) {
        this.byInstructionKind.set(current.instructionKind, current);
      }
    }

    const ceRenderer = this.findByReferenceName('CustomElementRenderer');
    const caRenderer = this.findByReferenceName('CustomAttributeRenderer');
    const tcRenderer = this.findByReferenceName('TemplateControllerRenderer');
    this.customElementRenderer = ceRenderer instanceof CustomElementRenderer ? ceRenderer : null;
    this.customAttributeRenderer = caRenderer instanceof CustomAttributeRenderer ? caRenderer : null;
    this.templateControllerRenderer = tcRenderer instanceof TemplateControllerRenderer ? tcRenderer : null;
  }

  readAll(): readonly InstructionRenderer[] {
    return [...this.definitions];
  }

  findByReferenceName(
    name: string,
  ): InstructionRenderer | null {
    return this.byReferenceName.get(name) ?? null;
  }

  findByInstructionKind(
    kind: BuiltinInstructionRendererKind,
  ): InstructionRenderer | null {
    return this.byInstructionKind.get(kind) ?? null;
  }

  prepareCustomElement(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): CustomElementPreparation | null {
    return this.customElementRenderer?.prepareCustomElement(parentController, hostElement) ?? null;
  }

  prepareCustomAttributes(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): readonly CustomAttributePreparation[] {
    return this.customAttributeRenderer?.prepareCustomAttributes(parentController, hostElement) ?? [];
  }

  prepareTemplateController(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    return this.templateControllerRenderer?.prepareTemplateController(parentController, hostElement) ?? null;
  }
}
