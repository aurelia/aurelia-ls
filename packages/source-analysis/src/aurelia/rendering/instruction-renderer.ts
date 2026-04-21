import type { Controller } from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import type { CustomAttributePreparation } from './custom-attribute-renderer.js';
import type { CustomElementPreparation } from './custom-element-renderer.js';
import type { TemplateControllerPreparation } from '../compiler/template-controller-renderer.js';
import type { BuiltinInstructionRendererKind } from './builtin-instruction-renderers.js';
import type { InstructionRendererAdmissionProvenance } from './renderer-admission.js';

export interface InstructionRenderer {
  readonly referenceName: string;
  readonly instructionKind: BuiltinInstructionRendererKind | null;
  readonly admission: InstructionRendererAdmissionProvenance;
  readonly note: string | null;
  prepareCustomElement(parentController: Controller, hostElement: CompiledElementNode): CustomElementPreparation | null;
  prepareCustomAttributes(parentController: Controller, hostElement: CompiledElementNode): readonly CustomAttributePreparation[];
  prepareTemplateController(parentController: Controller, hostElement: CompiledElementNode): TemplateControllerPreparation | null;
}

export class PassiveInstructionRenderer implements InstructionRenderer {
  constructor(
    readonly referenceName: string,
    readonly instructionKind: BuiltinInstructionRendererKind | null,
    readonly admission: InstructionRendererAdmissionProvenance,
    readonly note: string | null = null,
  ) {}

  prepareCustomElement(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): CustomElementPreparation | null {
    return null;
  }

  prepareCustomAttributes(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): readonly CustomAttributePreparation[] {
    return [];
  }

  prepareTemplateController(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    return null;
  }
}

export class CustomInstructionRenderer implements InstructionRenderer {
  readonly instructionKind = null;

  constructor(
    readonly referenceName: string,
    readonly admission: InstructionRendererAdmissionProvenance,
    readonly note: string | null = 'Custom renderer admitted into the consulted world. Later extension schema layers can attach richer instruction-consumption behavior to this instance.',
  ) {}

  prepareCustomElement(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): CustomElementPreparation | null {
    return null;
  }

  prepareCustomAttributes(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): readonly CustomAttributePreparation[] {
    return [];
  }

  prepareTemplateController(
    _parentController: Controller,
    _hostElement: CompiledElementNode,
  ): TemplateControllerPreparation | null {
    return null;
  }
}
