import type { TemplateRef } from '../refs.js';
import type { CustomElementTemplateSource } from '../resources/custom-element-support.js';
import type {
  CustomElementDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';
import type { CompilerAnonymousElementDefinition } from './compiled-template.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { Controller } from './controller.js';
import type { ViewFactory } from './view-factory.js';

export const CONTROLLER_OWNED_TEMPLATE_BRANCH_KINDS = [
  'custom-element-internal-template',
  'template-controller-view',
] as const;

export type ControllerOwnedTemplateBranchKind =
  typeof CONTROLLER_OWNED_TEMPLATE_BRANCH_KINDS[number];

export const CONTROLLER_TEMPLATE_REALIZATION_POLICY_KINDS = [
  'immediate-controller-hydration',
  'deferred-view-factory-realization',
] as const;

export type ControllerTemplateRealizationPolicyKind =
  typeof CONTROLLER_TEMPLATE_REALIZATION_POLICY_KINDS[number];

export const CONTROLLER_OWNED_TEMPLATE_BRANCH_OPEN_SEAM_KINDS = [
  'template-body-recovery-open',
  'linked-branch-family-open',
] as const;

export type ControllerOwnedTemplateBranchOpenSeamKind =
  typeof CONTROLLER_OWNED_TEMPLATE_BRANCH_OPEN_SEAM_KINDS[number];

export class ControllerOwnedTemplateBranchOpenSeam {
  constructor(
    readonly kind: ControllerOwnedTemplateBranchOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class ControllerOwnedTemplateBranch {
  constructor(
    readonly kind: ControllerOwnedTemplateBranchKind,
    readonly ownerController: Controller,
    readonly ownerResource: CustomElementDefinition | TemplateControllerDefinition,
    readonly world: CompilerConsultedWorld,
    readonly realizationPolicy: ControllerTemplateRealizationPolicyKind,
    readonly anonymousDefinition: CompilerAnonymousElementDefinition | null = null,
    readonly templateSource: CustomElementTemplateSource | null = null,
    readonly templateRef: TemplateRef | null = null,
    readonly rawTemplateText: string | null = null,
    readonly worldFormation: CompilerChildWorldFormation | null = null,
    readonly viewFactory: ViewFactory | null = null,
    readonly openSeams: readonly ControllerOwnedTemplateBranchOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}

  hasAnonymousDefinition(): boolean {
    return this.anonymousDefinition != null;
  }

  hasInlineTemplateText(): boolean {
    return this.rawTemplateText != null;
  }
}
