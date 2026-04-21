import type {
  BindingCommandDefinition,
  CustomAttributeDefinition,
  CustomElementDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { TemplateNodeRef } from '../refs.js';
import type { CompilationContext } from './compilation-context.js';
import type {
  CompilerAttributeParseResult,
  CompilerResourceAdmissionProvenance,
} from './compiler-consulted-world.js';
import type { CustomElementBindableEntry } from '../resources/index.js';

export const COMPILER_ATTRIBUTE_CLASSIFICATION_LANE_KINDS = [
  'special-attribute',
  'captured-attribute',
  'spread-transferred-bindings',
  'command-owned-attribute',
  'spread-value-bindings',
  'custom-element-bindable',
  'custom-attribute',
  'template-controller',
  'plain-attribute',
  'open',
] as const;

export type CompilerAttributeClassificationLaneKind =
  typeof COMPILER_ATTRIBUTE_CLASSIFICATION_LANE_KINDS[number];

export const COMPILER_ATTRIBUTE_CLASSIFICATION_OPEN_SEAM_KINDS = [
  'parser-ambiguous',
  'parser-handler-open',
  'capture-predicate-open',
  'binding-command-ownership-open',
  'binding-command-lowering-open',
  'spread-value-lowering-open',
  'custom-element-bindable-lowering-open',
  'custom-attribute-bindables-open',
  'template-controller-lowering-open',
  'plain-attribute-lowering-open',
] as const;

export type CompilerAttributeClassificationOpenSeamKind =
  typeof COMPILER_ATTRIBUTE_CLASSIFICATION_OPEN_SEAM_KINDS[number];

export class CompilerAuthoredAttribute {
  constructor(
    readonly id: string,
    readonly rawName: string,
    readonly rawValue: string,
    readonly source: TemplateNodeRef | null = null,
  ) {}
}

export class CompilerAttributeClassificationOpenSeam {
  constructor(
    readonly kind: CompilerAttributeClassificationOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeClassificationProvenance {
  constructor(
    readonly receiverElementAdmission: CompilerResourceAdmissionProvenance | null = null,
    readonly bindingCommandAdmission: CompilerResourceAdmissionProvenance | null = null,
    readonly attributeResourceAdmission: CompilerResourceAdmissionProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeClassification {
  constructor(
    readonly authored: CompilerAuthoredAttribute,
    readonly lane: CompilerAttributeClassificationLaneKind,
    readonly parse: CompilerAttributeParseResult | null,
    readonly bindingCommand: BindingCommandDefinition | null = null,
    readonly customElementBindable: CustomElementBindableEntry | null = null,
    readonly attributeResource: CustomAttributeDefinition | TemplateControllerDefinition | null = null,
    readonly provenance: CompilerAttributeClassificationProvenance | null = null,
    readonly openSeams: readonly CompilerAttributeClassificationOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerElementAttributeClassification {
  constructor(
    readonly elementName: string,
    readonly receiverElement: CustomElementDefinition | null,
    readonly receiverElementAdmission: CompilerResourceAdmissionProvenance | null = null,
    readonly items: readonly CompilerAttributeClassification[] = [],
    readonly captured: readonly CompilerAttributeClassification[] = [],
    readonly hasContainerless: boolean = false,
    readonly note: string | null = null,
  ) {}
}

// This is the first clean-room cut of the JIT compiler's eight-step attribute
// classifier. It routes authored attributes into the same broad semantic lanes
// while leaving lowering/instruction emission as later work.
//
// TODO: stage 4 now spends declaration-side `ignoreAttr`, but full command-
// owned lowering still needs a dedicated lowering/value-parse seam.
// TODO: stage 7 custom-attribute bindable/default-property semantics still need
// their own materialization layer before routing can become fully precise.
// TODO: stage 8 plain-attribute routing still needs expression/interpolation
// parsing and lowering.
export class CompilerAttributeClassifier {
  constructor(
    private readonly context: CompilationContext,
  ) {}

  classifyElement(
    elementName: string,
    authoredAttributes: readonly CompilerAuthoredAttribute[],
  ): CompilerElementAttributeClassification {
    const receiverElement = this.context.findElement(elementName);
    const receiverElementAdmission = receiverElement == null
      ? null
      : this.context.readResourceAdmission(receiverElement);
    const items = authoredAttributes.map((current) => this.classifyAttribute(current, receiverElement));
    const captured = items.filter((current) => current.lane === 'captured-attribute');
    const hasContainerless = items.some((current) =>
      current.lane === 'special-attribute' && current.authored.rawName === 'containerless',
    );

    return new CompilerElementAttributeClassification(
      elementName,
      receiverElement,
      receiverElementAdmission,
      items,
      captured,
      hasContainerless,
      'First JIT-shaped attribute routing result over authored attributes.',
    );
  }

  private classifyAttribute(
    authored: CompilerAuthoredAttribute,
    receiverElement: CustomElementDefinition | null,
  ): CompilerAttributeClassification {
    if (authored.rawName === 'as-element' || authored.rawName === 'containerless') {
      return new CompilerAttributeClassification(
        authored,
        'special-attribute',
        null,
        null,
        null,
        null,
        null,
        [],
        'Closed at stage 1 of the JIT classifier as a special attribute.',
      );
    }

    const parse = this.context.parseAttribute(authored.rawName, authored.rawValue);
    if (parse.status === 'ambiguous') {
      return new CompilerAttributeClassification(
        authored,
        'open',
        parse,
        null,
        null,
        null,
        null,
        [
          new CompilerAttributeClassificationOpenSeam(
            'parser-ambiguous',
            'Multiple top-ranked attribute pattern candidates matched this authored name.',
          ),
        ],
        'Classification stayed open because syntax normalization remained ambiguous.',
      );
    }

    if (parse.status === 'handler-open') {
      return new CompilerAttributeClassification(
        authored,
        'open',
        parse,
        null,
        null,
        null,
        null,
        [
          new CompilerAttributeClassificationOpenSeam(
            'parser-handler-open',
            'The matched attribute pattern handler did not close under the current bounded evaluator.',
          ),
        ],
        'Classification stayed open because the attribute pattern handler semantics were not fully recoverable.',
      );
    }

    const syntax = parse.syntax;
    if (syntax == null) {
      return new CompilerAttributeClassification(
        authored,
        'open',
        parse,
        null,
        null,
        null,
        null,
        [
          new CompilerAttributeClassificationOpenSeam(
            'parser-handler-open',
            'Attribute syntax did not close to a concrete target/command pair.',
          ),
        ],
        'Classification stayed open because syntax normalization did not yield a concrete AttrSyntax.',
      );
    }

    const bindingCommand = syntax.command == null
      ? null
      : this.context.getCommand(syntax.command);
    const bindingCommandOwnsAttribute = bindingCommand?.buildBasis.ignoreAttr ?? null;
    const bindingCommandAdmission = bindingCommand == null
      ? null
      : this.context.readBindingCommandAdmission(bindingCommand);
    const matchedBindable = receiverElement == null
      ? null
      : findCustomElementBindable(receiverElement, syntax.target);
    const attributeResource = this.context.findAttribute(syntax.target);
    const receiverElementAdmission = receiverElement == null
      ? null
      : this.context.readResourceAdmission(receiverElement);
    const attributeResourceAdmission = attributeResource == null
      ? null
      : this.context.readResourceAdmission(attributeResource);
    const provenance = new CompilerAttributeClassificationProvenance(
      receiverElementAdmission,
      bindingCommandAdmission,
      attributeResourceAdmission,
      'Classification provenance keeps receiver, command, and hydrated resource admission separate from syntax-handler provenance.',
    );
    const commandOwnershipSeams = bindingCommand != null && bindingCommandOwnsAttribute == null
      ? [new CompilerAttributeClassificationOpenSeam(
        'binding-command-ownership-open',
        'Binding-command ownership stayed open because ignoreAttr did not close from the current build basis.',
      )]
      : [];

    const captureResult = classifyCapture(
      authored,
      parse,
      receiverElement,
      matchedBindable,
      attributeResource,
      bindingCommandOwnsAttribute,
      provenance,
      commandOwnershipSeams,
    );
    if (captureResult != null) {
      return captureResult;
    }

    if (syntax.target === '...$attrs') {
      return new CompilerAttributeClassification(
        authored,
        'spread-transferred-bindings',
        parse,
        bindingCommand,
        null,
        null,
        provenance,
        commandOwnershipSeams,
        'Closed at stage 3 as spread transferred bindings.',
      );
    }

    if (bindingCommand != null && bindingCommandOwnsAttribute === true) {
      return new CompilerAttributeClassification(
        authored,
        'command-owned-attribute',
        parse,
        bindingCommand,
        null,
        null,
        provenance,
        [
          new CompilerAttributeClassificationOpenSeam(
            'binding-command-lowering-open',
            'Command-owned attribute lowering is not implemented yet.',
          ),
        ],
        'Closed at stage 4 as a command-owned attribute from binding-command build basis.',
      );
    }

    if (syntax.target.startsWith('...')) {
      return new CompilerAttributeClassification(
        authored,
        'spread-value-bindings',
        parse,
        bindingCommand,
        null,
        null,
        provenance,
        [
          ...commandOwnershipSeams,
          new CompilerAttributeClassificationOpenSeam(
            'spread-value-lowering-open',
            'Spread bindable lowering is not implemented yet.',
          ),
        ],
        'Closed at stage 5 as a spread-value binding over a custom-element surface.',
      );
    }

    if (matchedBindable != null) {
      return new CompilerAttributeClassification(
        authored,
        'custom-element-bindable',
        parse,
        bindingCommand,
        matchedBindable,
        null,
        provenance,
        [
          ...commandOwnershipSeams,
          new CompilerAttributeClassificationOpenSeam(
            'custom-element-bindable-lowering-open',
            'Custom-element bindable lowering is not implemented yet.',
          ),
        ],
        'Closed at stage 6 as a custom-element bindable attribute.',
      );
    }

    if (attributeResource != null) {
      if (attributeResource.kind === 'template-controller') {
        return new CompilerAttributeClassification(
          authored,
          'template-controller',
          parse,
          bindingCommand,
          null,
          attributeResource,
          provenance,
          [
            ...commandOwnershipSeams,
            new CompilerAttributeClassificationOpenSeam(
              'template-controller-lowering-open',
              'Template-controller structural lowering is not implemented yet.',
            ),
          ],
          'Closed at stage 7 as a template-controller hydration route.',
        );
      }

      return new CompilerAttributeClassification(
        authored,
        'custom-attribute',
        parse,
        bindingCommand,
        null,
        attributeResource,
        provenance,
        [
          ...commandOwnershipSeams,
          new CompilerAttributeClassificationOpenSeam(
            'custom-attribute-bindables-open',
            'Custom-attribute bindable/default-property semantics are not modeled yet.',
          ),
        ],
        'Closed at stage 7 as a custom-attribute hydration route.',
      );
    }

    return new CompilerAttributeClassification(
      authored,
      'plain-attribute',
      parse,
      bindingCommand,
      null,
      null,
      provenance,
      [
        ...commandOwnershipSeams,
        new CompilerAttributeClassificationOpenSeam(
          bindingCommand == null
            ? 'plain-attribute-lowering-open'
            : 'binding-command-lowering-open',
          bindingCommand == null
            ? 'Plain-attribute interpolation/static lowering is not implemented yet.'
            : 'Binding-command lowering is not implemented yet.',
        ),
      ],
      'Closed at stage 8 as a plain-attribute route.',
    );
  }
}

function classifyCapture(
  authored: CompilerAuthoredAttribute,
  parse: CompilerAttributeParseResult,
  receiverElement: CustomElementDefinition | null,
  matchedBindable: CustomElementBindableEntry | null,
  attributeResource: CustomAttributeDefinition | TemplateControllerDefinition | null,
  bindingCommandOwnsAttribute: boolean | null,
  provenance: CompilerAttributeClassificationProvenance,
  commandOwnershipSeams: readonly CompilerAttributeClassificationOpenSeam[],
): CompilerAttributeClassification | null {
  if (receiverElement == null || parse.syntax == null) {
    return null;
  }

  if (receiverElement.policy.captureKind === 'predicate') {
    return new CompilerAttributeClassification(
      authored,
      'open',
      parse,
      null,
      matchedBindable,
      attributeResource,
      provenance,
      [
        ...commandOwnershipSeams,
        new CompilerAttributeClassificationOpenSeam(
          'capture-predicate-open',
          'Predicate-based capture policy is not modeled yet.',
        ),
      ],
      'Classification stayed open because receiver capture policy is predicate-based.',
    );
  }

  if (receiverElement.policy.captureKind !== 'boolean') {
    return null;
  }

  const target = parse.syntax.target;
  const spreadIndex = target.indexOf('...');
  const canCapture = target !== 'au-slot'
    && target !== 'slot'
    && (spreadIndex === -1 || (spreadIndex === 0 && target === '...$attrs'));
  const isTemplateController = attributeResource?.kind === 'template-controller';

  if (bindingCommandOwnsAttribute === true && canCapture) {
    return new CompilerAttributeClassification(
      authored,
      'captured-attribute',
      parse,
      null,
      null,
      null,
      provenance,
      commandOwnershipSeams,
      'Closed at stage 2 as a captured attribute over a capturing custom-element receiver before command-owned lowering.',
    );
  }

  if (canCapture && matchedBindable == null && !isTemplateController) {
    return new CompilerAttributeClassification(
      authored,
      'captured-attribute',
      parse,
      null,
      matchedBindable,
      attributeResource,
      provenance,
      commandOwnershipSeams,
      'Closed at stage 2 as a captured attribute over a capturing custom-element receiver.',
    );
  }

  return null;
}

function findCustomElementBindable(
  receiverElement: CustomElementDefinition,
  target: string,
): CustomElementBindableEntry | null {
  return receiverElement.bindableSurface.entries.find((current) =>
    current.attribute === target || current.name === target,
  ) ?? null;
}
