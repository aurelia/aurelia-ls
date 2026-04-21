import { CompiledTemplateRef } from '../refs.js';
import {
  CompilerAttributeClassification,
  CompilerAuthoredAttribute,
} from './attribute-classification.js';
import type {
  AuthoredElementNode,
  AuthoredTemplate,
  AuthoredTemplateNode,
  AuthoredTextNode,
} from './authored-template.js';
import { CompilationContext } from './compilation-context.js';
import {
  CompiledElementNode,
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
    // TODO: child compilation currently stays on the same consulted world.
    // Local-template owner branches and other world-widening behavior should
    // eventually create real child compilation contexts instead of sharing the
    // parent one blindly.
    const childCompilations = element.children
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

function readEffectiveElementName(
  element: AuthoredElementNode,
): string {
  const asElement = element.attributes.find((current) => current.rawName === 'as-element');
  return (asElement?.rawValue || element.tagName).toLowerCase();
}
