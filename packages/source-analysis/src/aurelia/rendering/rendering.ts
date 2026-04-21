import type { Controller } from '../compiler/controller.js';
import type { CompiledElementNode } from '../compiler/compiled-template.js';
import type { CompilerAttributeBindingLowering } from '../compiler/custom-attribute-binding-lowering.js';
import {
  ControllerOwnedTemplateBranch,
  ControllerOwnedTemplateBranchOpenSeam,
} from '../compiler/controller-owned-template-branch.js';
import {
  PreparedHydrateAttributeInstruction,
  PreparedHydrateElementInstruction,
  PreparedHydrateTemplateControllerInstruction,
  PreparedResourceHydrationBundle,
  PreparedResourceHydrationBundleOpenSeam,
} from '../compiler/prepared-resource-hydration.js';
import { BuiltinTemplateControllerProfile } from '../compiler/template-controller-profile.js';
import { CustomAttributeRenderer, type CustomAttributePreparation } from './custom-attribute-renderer.js';
import { CustomElementRenderer, type CustomElementPreparation } from './custom-element-renderer.js';
import { TemplateControllerRenderer } from '../compiler/template-controller-renderer.js';
import type { TemplateControllerPreparation } from '../compiler/template-controller-renderer.js';
import type { InstructionRenderer } from './instruction-renderer.js';
import type { BuiltinInstructionRendererKind } from './builtin-instruction-renderers.js';
import {
  CurrentTargetPreparation,
  CurrentTargetPreparationOpenSeam,
} from './current-target-preparation.js';
import { TemplateRef } from '../refs.js';
import type { CustomAttributeDefinition } from '../resources/index.js';

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

  prepareInstructionBundle(
    hostElement: CompiledElementNode,
  ): PreparedResourceHydrationBundle {
    // TODO: this currently closes only the CE/CA/TC resource-hydration subset.
    // Later compiler slices should add real row/target binding and non-resource
    // instruction spend instead of widening this bundle into a fake full row model.
    const templateControllerLowering = hostElement.templateControllerLowering;
    if (templateControllerLowering != null) {
      return new PreparedResourceHydrationBundle(
        hostElement,
        'template-controller-row',
        null,
        [],
        new PreparedHydrateTemplateControllerInstruction(
          hostElement,
          templateControllerLowering.outermostInstruction,
          'Current-target prepared hydrate-template-controller instruction over the outermost TC structural carrier.',
        ),
        [
          new PreparedResourceHydrationBundleOpenSeam(
            'nested-resource-row-deferred',
            'When a template controller owns the current target, sibling CE/CA resource instructions move into the nested anonymous definition instead of staying current at this host element.',
          ),
          new PreparedResourceHydrationBundleOpenSeam(
            'non-resource-instructions-open',
            'Plain attribute, text-binding, and other non-resource instruction rows still belong to later lowering slices.',
          ),
        ],
        'Prepared resource-hydration bundle for a template-controller-owned current target.',
      );
    }

    const elementInstruction = hostElement.structuralCarrier.classification.receiverElement == null
      ? null
      : new PreparedHydrateElementInstruction(
        hostElement,
        hostElement.structuralCarrier.classification.receiverElement,
        hostElement.structuralCarrier.projectionExtraction,
        'Current-target prepared hydrate-element instruction over the compiled element receiver.',
      );
    const attributeInstructions = hostElement.structuralCarrier.customAttributeBindings
      .filter((current): current is CompilerAttributeBindingLowering & { resource: CustomAttributeDefinition } => current.resource.kind === 'custom-attribute')
      .map((current) => new PreparedHydrateAttributeInstruction(
        hostElement,
        current.resource,
        current,
        'Current-target prepared hydrate-attribute instruction over a lowered custom-attribute use.',
      ));

    return new PreparedResourceHydrationBundle(
      hostElement,
      'resource-row',
      elementInstruction,
      attributeInstructions,
      null,
      [
        new PreparedResourceHydrationBundleOpenSeam(
          'non-resource-instructions-open',
          'Plain attribute, text-binding, and other non-resource instruction rows still belong to later lowering slices.',
        ),
      ],
      'Prepared resource-hydration bundle for a resource-row current target.',
    );
  }

  prepareCurrentTarget(
    parentController: Controller,
    hostElement: CompiledElementNode,
  ): CurrentTargetPreparation {
    const bundle = this.prepareInstructionBundle(hostElement);
    if (bundle.templateControllerInstruction != null) {
      const templateController = this.templateControllerRenderer?.prepareTemplateControllerFromInstruction(
        parentController,
        bundle.templateControllerInstruction,
      ) ?? null;
      const openSeams: CurrentTargetPreparationOpenSeam[] = [
        new CurrentTargetPreparationOpenSeam(
          'nested-resource-preparation-deferred',
          'Template-controller structural lowering moved CE/CA work for this host element into the nested anonymous definition. Current-target preparation therefore stops at the template-controller renderer, and recursive planning should continue through the prepared branch instead of preparing sibling CE/CA renderers at this same target.',
        ),
      ];
      return new CurrentTargetPreparation(
        hostElement,
        parentController,
        bundle,
        'template-controller-current-target',
        null,
        [],
        templateController,
        templateController == null ? [] : [createTemplateControllerBranch(templateController)],
        openSeams,
        'Current target is owned by a template-controller renderer. Nested CE/CA work continues through the prepared TC branch.',
      );
    }

    const customElement = bundle.elementInstruction == null
      ? null
      : this.customElementRenderer?.prepareCustomElementFromInstruction(parentController, bundle.elementInstruction) ?? null;
    const customAttributes = this.customAttributeRenderer?.prepareCustomAttributesFromInstructions(
      parentController,
      bundle.attributeInstructions,
    ) ?? [];
    const branches = customElement == null
      ? []
      : compactBranches([
        createCustomElementBranch(customElement),
      ]);

    return new CurrentTargetPreparation(
      hostElement,
      parentController,
      bundle,
      'resource-current-target',
      customElement,
      customAttributes,
      null,
      branches,
      [],
      customElement == null
        ? 'Current target has no template-controller and no custom-element receiver; only current custom-attribute preparation applies.'
        : 'Current target prepares resource renderers directly and may yield a CE-owned recursive template branch.',
    );
  }

}

function createTemplateControllerBranch(
  preparation: TemplateControllerPreparation,
): ControllerOwnedTemplateBranch {
  const openSeams = preparation.profile.profileKind === 'builtin'
    && preparation.profile instanceof BuiltinTemplateControllerProfile
    && preparation.profile.linkage !== 'none'
    ? [
      new ControllerOwnedTemplateBranchOpenSeam(
        'linked-branch-family-open',
        'Builtin linked template-controller families such as else/case/pending still need explicit sibling/owner branch relations. This branch closes the generic nested-def recursion basis first without claiming those family-specific links are already materialized.',
      ),
    ]
    : [];

  return new ControllerOwnedTemplateBranch(
    'template-controller-view',
    preparation.controller,
    preparation.resource,
    preparation.viewFactory.world,
    'deferred-view-factory-realization',
    preparation.viewFactory.definition,
    null,
    null,
    null,
    preparation.viewFactory.worldFormation,
    preparation.viewFactory,
    openSeams,
    'Prepared template-controller branch over the nested anonymous definition carried by the runtime-like view factory.',
  );
}

function createCustomElementBranch(
  preparation: CustomElementPreparation,
): ControllerOwnedTemplateBranch | null {
  const templateSource = preparation.resource.templateSource;
  if (templateSource.kind === 'none' || templateSource.kind === 'open') {
    return null;
  }

  const provenanceSource = templateSource.provenance?.selected?.source
    ?? templateSource.provenance?.contributors[0]?.source
    ?? null;
  const templateRef = provenanceSource == null
    ? null
    : new TemplateRef(
      `template:${preparation.resource.id}:${provenanceSource.span.start}-${provenanceSource.span.end}`,
      preparation.resource.type,
      provenanceSource.file,
      provenanceSource.span,
    );
  const openSeams: ControllerOwnedTemplateBranchOpenSeam[] = [];

  if (templateSource.inlineText == null) {
    openSeams.push(new ControllerOwnedTemplateBranchOpenSeam(
      'template-body-recovery-open',
      templateSource.kind === 'expression-reference'
        ? 'Custom-element template source is reference-shaped. The branch keeps the template-source seed and provenance, but deeper TS value recovery is still needed before the internal template can be compiled structurally.'
        : 'Custom-element template branch exists, but no inline template body is currently attached to the template-source carrier.',
    ));
  }

  return new ControllerOwnedTemplateBranch(
    'custom-element-internal-template',
    preparation.controller,
    preparation.resource,
    preparation.controller.world,
    'immediate-controller-hydration',
    null,
    templateSource,
    templateRef,
    templateSource.inlineText,
    preparation.controller.worldFormation,
    null,
    openSeams,
    'Prepared custom-element internal-template branch over declaration-side template source and the CE child world.',
  );
}

function compactBranches(
  branches: readonly (ControllerOwnedTemplateBranch | null)[],
): readonly ControllerOwnedTemplateBranch[] {
  return branches.filter((current): current is ControllerOwnedTemplateBranch => current != null);
}
