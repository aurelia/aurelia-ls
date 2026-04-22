import { CompiledTemplateRef } from '../refs.js';
import {
  CompilerAttributeClassification,
  CompilerAuthoredAttribute,
} from './attribute-classification.js';
import {
  AuthoredElementNode,
  type AuthoredTemplate,
  type AuthoredTemplateNode,
  type AuthoredTemplateAttribute,
  type AuthoredTextNode,
} from './authored-template.js';
import { CompilationContext } from './compilation-context.js';
import {
  CompiledElementNode,
  CompilerProjectionExtraction,
  CompilerProjectionSlot,
  CompiledTemplate,
  CompiledTemplateOpenSeam,
  CompiledTextNode,
  CompilerElementStructuralCarrier,
  type CompiledTemplateNode,
} from './compiled-template.js';
import { CompilerCustomAttributeBindingLowerer } from './custom-attribute-binding-lowering.js';
import {
  TemplateControllerStructuralLowerer,
  type TemplateControllerStructuralParticipant,
} from './template-controller-structural-lowering.js';
import type { CustomElementDefinition } from '../resources/index.js';

export class TemplateCompilationEngine {
  private readonly customAttributeBindingLowerer: CompilerCustomAttributeBindingLowerer;
  private readonly templateControllerStructuralLowerer = new TemplateControllerStructuralLowerer();

  constructor(
    private readonly context: CompilationContext,
  ) {
    this.customAttributeBindingLowerer = new CompilerCustomAttributeBindingLowerer(context);
  }

  compile(
    authored: AuthoredTemplate,
  ): CompiledTemplate {
    const ref = new CompiledTemplateRef(
      `compiled:${authored.ref.id}`,
      authored.ref,
      this.context.world.world,
    );
    return new CompiledTemplate(
      ref,
      authored,
      authored.root.children
        .map((current) => this.compileNode(current, this.context))
        .filter((current): current is CompiledTemplateNode => current != null),
      [],
      'First real template-compiler pass over authored template nodes. This is still a structural/tooling-time compilation product, not final runtime instruction rows.',
    );
  }

  private compileNode(
    node: AuthoredTemplateNode,
    context: CompilationContext,
  ): CompiledTemplateNode | null {
    switch (node.kind) {
      case 'element':
        return this.compileElement(node, context);
      case 'text':
        return this.compileText(node);
      default:
        return null;
    }
  }

  private compileText(
    node: AuthoredTextNode,
  ): CompiledTextNode {
    // TODO: text interpolation should eventually route through a compiler-owned
    // value-routing layer that publishes parser requests over text-node sites.
    // Keep "text interpolation" distinct from attribute interpolation above the
    // parser even though both reuse the parser's interpolation family.
    const interpolationDetected = node.value.includes('${');
    return new CompiledTextNode(
      node,
      interpolationDetected,
      interpolationDetected
        ? [
          new CompiledTemplateOpenSeam(
            'text-interpolation-open',
            'Text interpolation was detected, but text-binding lowering still belongs to a later compiler slice.',
          ),
        ]
        : [],
      interpolationDetected
        ? 'Text node contains interpolation-like syntax.'
        : 'Static authored text node.',
    );
  }

  private compileElement(
    element: AuthoredElementNode,
    context: CompilationContext,
  ): CompiledElementNode {
    const receiverName = readEffectiveElementName(element);
    const authoredAttributes = element.attributes.map((current) =>
      new CompilerAuthoredAttribute(
        current.id,
        current.rawName,
        current.rawValue,
        current.provenance.ref,
      ),
    );
    const classification = context.classifyElementAttributes(receiverName, authoredAttributes);
    const receiverElement = classification.receiverElement;
    const projectionExtractionResult = this.extractProjectionCompilation(element, receiverElement, context);
    // TODO: child compilation currently stays on the same consulted world.
    // Local-template owner branches and other world-widening behavior should
    // eventually create real child compilation contexts instead of sharing the
    // parent one blindly.
    const childCompilations = projectionExtractionResult.retainedChildren
      .map((current) => this.compileNode(current, context))
      .filter((current): current is CompiledTemplateNode => current != null);
    const customAttributeLowerings = classification.items
      .filter((current) => current.lane === 'custom-attribute')
      .map((current) => this.customAttributeBindingLowerer.lowerFromClassification(current))
      .filter((current): current is NonNullable<typeof current> => current != null);
    const templateControllerParticipants = classification.items
      .filter((current) => current.lane === 'template-controller')
      .map((current) => this.lowerTemplateControllerParticipant(current))
      .filter((current): current is TemplateControllerStructuralParticipant => current != null);

    const structuralCarrier = new CompilerElementStructuralCarrier(
      element,
      classification,
      customAttributeLowerings,
      projectionExtractionResult.extraction,
      childCompilations,
      'Element-level structural carrier over authored template syntax, classification, and stage-7 CA lowering.',
    );
    const templateControllerLowering = this.templateControllerStructuralLowerer.lower(
      element,
      structuralCarrier,
      templateControllerParticipants,
    );
    const openSeams: CompiledTemplateOpenSeam[] = [
      new CompiledTemplateOpenSeam(
        'element-direct-lowering-open',
        'Direct custom-element/custom-attribute/plain-attribute instruction rows are not closed yet; this carrier keeps the structural claim surface intact until those lowering slices land.',
      ),
    ];

    if (classification.items.some((current) => current.lane === 'plain-attribute')) {
      openSeams.push(new CompiledTemplateOpenSeam(
        'plain-attribute-lowering-open',
        'Plain-attribute lowering still needs final expression/interpolation/property mapping carriers.',
      ));
    }

    openSeams.push(...projectionExtractionResult.openSeams);

    if (templateControllerLowering != null) {
      openSeams.push(...templateControllerLowering.openSeams);
    }

    return new CompiledElementNode(
      element,
      structuralCarrier,
      templateControllerLowering,
      openSeams,
      templateControllerLowering == null
        ? 'Element compiled without template-controller structural wrapping.'
        : 'Element compiled with generic inside-out template-controller structural wrapping.',
    );
  }

  private extractProjectionCompilation(
    element: AuthoredElementNode,
    receiverElement: CustomElementDefinition | null,
    context: CompilationContext,
  ): {
    readonly retainedChildren: readonly AuthoredTemplateNode[];
    readonly extraction: CompilerProjectionExtraction | null;
    readonly openSeams: readonly CompiledTemplateOpenSeam[];
  } {
    if (receiverElement == null) {
      return {
        retainedChildren: element.children,
        extraction: null,
        openSeams: [],
      };
    }

    if (receiverElement.name === 'au-slot') {
      return this.extractAuSlotFallbackCompilation(element, context);
    }

    const processContentProvenance = receiverElement.policy.readProvenance('process-content');
    if (processContentProvenance?.selected != null) {
      return {
        retainedChildren: element.children,
        extraction: null,
        openSeams: [
          new CompiledTemplateOpenSeam(
            'process-content-open',
            'Projection extraction stayed open because this custom element declares processContent. Runtime lets processContent mutate the host content before projection grouping, and that mutation is not interpreted in the current clean-room slice.',
          ),
        ],
      };
    }

    const retainedChildren: AuthoredTemplateNode[] = [];
    const grouped = new Map<string, {
      targetSource: typeof element.attributes[number]['provenance']['ref'] | null;
      targetElementSource: typeof element.provenance.ref | null;
      nodes: AuthoredTemplateNode[];
    }>();
    // NOTE: runtime template compilation projects all authored child content of
    // non-shadow custom elements into slot definitions, even when no explicit
    // [au-slot] attribute is present. Explicit [au-slot] only changes the
    // target slot; it is not the only trigger for projection extraction.
    const projectsImplicitDefaultSlot = receiverElement.policy.shadowMode == null;

    for (const child of element.children) {
      const slotAttribute = child instanceof AuthoredElementNode
        ? child.attributes.find((current) => current.rawName === 'au-slot') ?? null
        : null;
      const projectsToSlot = slotAttribute != null || projectsImplicitDefaultSlot;

      if (!projectsToSlot) {
        retainedChildren.push(child);
        continue;
      }

      const slotName = slotAttribute == null || slotAttribute.rawValue.length === 0
        ? 'default'
        : slotAttribute.rawValue;
      const projectedNodes = materializeProjectedNodes(child, slotAttribute);
      if (projectedNodes.length === 0) {
        continue;
      }
      const bucket = grouped.get(slotName) ?? {
        targetSource: slotAttribute?.provenance.ref ?? child.provenance.ref,
        targetElementSource: child.provenance.ref,
        nodes: [],
      };
      bucket.nodes.push(...projectedNodes);
      grouped.set(slotName, bucket);
    }

    if (grouped.size === 0) {
      return {
        retainedChildren,
        extraction: null,
        openSeams: [],
      };
    }

    const projectedSlots = [...grouped.entries()].map(([slotName, bucket]) =>
      new CompilerProjectionSlot(
        slotName,
        bucket.targetSource,
        bucket.targetElementSource,
        bucket.nodes
          .map((current) => this.compileNode(current, context))
          .filter((current): current is CompiledTemplateNode => current != null),
        slotName === 'default' && projectsImplicitDefaultSlot
          ? `Projection content targeting slot ${slotName} was extracted from authored custom-element children, including implicit default-slot content without explicit [au-slot].`
          : `Projection content targeting slot ${slotName} was extracted from authored children carrying [au-slot].`,
      ),
    );

    return {
      retainedChildren,
      extraction: new CompilerProjectionExtraction(
        projectedSlots,
        projectsImplicitDefaultSlot
          ? 'Projection extraction grouped authored custom-element content by slot name before ordinary child compilation, including implicit default-slot projection for non-shadow custom elements.'
          : 'Projection extraction grouped authored [au-slot] children by slot name before ordinary child compilation.',
      ),
      openSeams: [],
    };
  }

  private extractAuSlotFallbackCompilation(
    element: AuthoredElementNode,
    context: CompilationContext,
  ): {
    readonly retainedChildren: readonly AuthoredTemplateNode[];
    readonly extraction: CompilerProjectionExtraction | null;
    readonly openSeams: readonly CompiledTemplateOpenSeam[];
  } {
    const fallbackNodes: AuthoredTemplateNode[] = [];
    const openSeams: CompiledTemplateOpenSeam[] = [];

    for (const child of element.children) {
      if (child instanceof AuthoredElementNode && child.attributes.some((current) => current.rawName === 'au-slot')) {
        openSeams.push(new CompiledTemplateOpenSeam(
          'process-content-open',
          'Builtin AuSlot processContent removes child nodes that themselves carry [au-slot]. The clean-room omits those nodes from fallback compilation, but it does not yet model the full processContent hook surface generically.',
        ));
        continue;
      }

      fallbackNodes.push(...materializeProjectedNodes(child, null));
    }

    if (fallbackNodes.length === 0) {
      return {
        retainedChildren: [],
        extraction: null,
        openSeams,
      };
    }

    return {
      retainedChildren: [],
      extraction: new CompilerProjectionExtraction(
        [
          new CompilerProjectionSlot(
            'default',
            element.provenance.ref,
            element.provenance.ref,
            fallbackNodes
              .map((current) => this.compileNode(current, context))
              .filter((current): current is CompiledTemplateNode => current != null),
            'Builtin AuSlot fallback content was separated from ordinary child compilation and prepared as the default projection slot.',
          ),
        ],
        'Builtin AuSlot fallback content was prepared through the same projection carrier used for external [au-slot] projection grouping.',
      ),
      openSeams,
    };
  }

  private lowerTemplateControllerParticipant(
    classification: CompilerAttributeClassification,
  ): TemplateControllerStructuralParticipant | null {
    const bindingLowering = this.customAttributeBindingLowerer.lowerFromClassification(classification, {
      treatEmptyAsNoBinding: true,
    });
    if (bindingLowering == null) {
      return null;
    }

    return {
      classification,
      bindingLowering,
    };
  }
}

function stripProjectionAttribute(
  node: AuthoredElementNode,
): AuthoredElementNode {
  return new AuthoredElementNode(
    node.id,
    node.tagName,
    node.provenance,
    node.attributes.filter((current) => current.rawName !== 'au-slot'),
    node.children,
    node.selfClosing,
    node.note == null
      ? 'Projection-target element compiled without its authored [au-slot] attribute because runtime removes that attribute during projection extraction.'
      : `${node.note} Projection-target element compiled without its authored [au-slot] attribute because runtime removes that attribute during projection extraction.`,
  );
}

function materializeProjectedNodes(
  node: AuthoredTemplateNode,
  projectionAttribute: AuthoredTemplateAttribute | null,
): readonly AuthoredTemplateNode[] {
  if (node.kind === 'text') {
    return node.value.trim().length === 0
      ? []
      : [node];
  }

  if (!(node instanceof AuthoredElementNode)) {
    return [node];
  }

  const projectedElement = projectionAttribute == null
    ? node
    : stripProjectionAttribute(node);

  if (projectedElement.tagName !== 'template' || projectedElement.attributes.length > 0) {
    return [projectedElement];
  }

  return projectedElement.children;
}

function readEffectiveElementName(
  element: AuthoredElementNode,
): string {
  const asElement = element.attributes.find((current) => current.rawName === 'as-element');
  return (asElement?.rawValue || element.tagName).toLowerCase();
}
