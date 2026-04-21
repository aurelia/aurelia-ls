import type { Controller } from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import type { ControllerOwnedTemplateBranch } from '../compiler/controller-owned-template-branch.js';
import type { PreparedResourceHydrationBundle } from '../compiler/prepared-resource-hydration.js';
import type { TemplateControllerPreparation } from '../compiler/template-controller-renderer.js';
import type { CustomAttributePreparation } from './custom-attribute-renderer.js';
import type { CustomElementPreparation } from './custom-element-renderer.js';

export const CURRENT_TARGET_PREPARATION_MODE_KINDS = [
  'resource-current-target',
  'template-controller-current-target',
] as const;

export type CurrentTargetPreparationModeKind =
  typeof CURRENT_TARGET_PREPARATION_MODE_KINDS[number];

export const CURRENT_TARGET_PREPARATION_OPEN_SEAM_KINDS = [
  'nested-resource-preparation-deferred',
] as const;

export type CurrentTargetPreparationOpenSeamKind =
  typeof CURRENT_TARGET_PREPARATION_OPEN_SEAM_KINDS[number];

export class CurrentTargetPreparationOpenSeam {
  constructor(
    readonly kind: CurrentTargetPreparationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

// This is the spend of one prepared current-target bundle through the relevant
// resource renderers plus recursive branch planning. It exists because the
// tool must preserve the runtime "who is current at this target?" split before
// it can continue recursive compilation under the right world/controller owner.
export class CurrentTargetPreparation {
  constructor(
    readonly hostElement: CompiledElementNode,
    readonly ownerController: Controller,
    readonly instructionBundle: PreparedResourceHydrationBundle,
    readonly mode: CurrentTargetPreparationModeKind,
    readonly customElement: CustomElementPreparation | null = null,
    readonly customAttributes: readonly CustomAttributePreparation[] = [],
    readonly templateController: TemplateControllerPreparation | null = null,
    readonly templateBranches: readonly ControllerOwnedTemplateBranch[] = [],
    readonly openSeams: readonly CurrentTargetPreparationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}
