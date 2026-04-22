import type {
  CustomAttributeDefinition,
  TemplateControllerDefinition,
} from '../resources/index.js';
import type { CompilationContext } from './compilation-context.js';
import type {
  CompilerAttributeClassification,
  CompilerAuthoredAttribute,
} from './attribute-classification.js';
import type { CompilerResourceAdmissionProvenance } from './compiler-consulted-world.js';
import type {
  CompilerAttributeBindablesInfo,
  CompilerAttributeBindableInfoEntry,
} from './custom-attribute-bindables-info.js';
import type { CompilerValueParseResult } from './compiler-value-parser.js';

export const COMPILER_ATTRIBUTE_BINDABLE_ASSIGNMENT_SOURCE_KINDS = [
  'primary-bindable',
  'multi-binding-entry',
] as const;

export type CompilerAttributeBindableAssignmentSourceKind =
  typeof COMPILER_ATTRIBUTE_BINDABLE_ASSIGNMENT_SOURCE_KINDS[number];

export const COMPILER_ATTRIBUTE_BINDABLE_VALUE_KINDS = [
  'literal-value',
  'interpolation-candidate',
  'binding-command-plan',
  'empty-no-binding',
  'open',
] as const;

export type CompilerAttributeBindableValueKind =
  typeof COMPILER_ATTRIBUTE_BINDABLE_VALUE_KINDS[number];

export const COMPILER_ATTRIBUTE_BINDING_LOWERING_OPEN_SEAM_KINDS = [
  'missing-primary-bindable',
  'multi-binding-target-open',
  'multi-binding-syntax-open',
  'interpolation-parse-open',
  'binding-command-plan-open',
  'attribute-syntax-open',
] as const;

export type CompilerAttributeBindingLoweringOpenSeamKind =
  typeof COMPILER_ATTRIBUTE_BINDING_LOWERING_OPEN_SEAM_KINDS[number];

export class CompilerAttributeBindingLoweringOpenSeam {
  constructor(
    readonly kind: CompilerAttributeBindingLoweringOpenSeamKind,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeBindableAssignmentProvenance {
  constructor(
    readonly authoredAttribute: CompilerAuthoredAttribute,
    readonly resourceAdmission: CompilerResourceAdmissionProvenance | null,
    readonly bindable: CompilerAttributeBindableInfoEntry | null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeBindableAssignment {
  constructor(
    readonly bindable: CompilerAttributeBindableInfoEntry,
    readonly sourceKind: CompilerAttributeBindableAssignmentSourceKind,
    readonly rawValue: string,
    readonly valueKind: CompilerAttributeBindableValueKind,
    readonly bindingCommandName: string | null = null,
    readonly valueParsePlan: CompilerValueParseResult | null = null,
    readonly provenance: CompilerAttributeBindableAssignmentProvenance | null = null,
    readonly note: string | null = null,
  ) {}
}

export class CompilerAttributeBindingLowering {
  constructor(
    readonly resource: CustomAttributeDefinition | TemplateControllerDefinition,
    readonly authoredAttribute: CompilerAuthoredAttribute,
    readonly assignments: readonly CompilerAttributeBindableAssignment[] = [],
    readonly openSeams: readonly CompilerAttributeBindingLoweringOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

export class CompilerCustomAttributeBindingLowerer {
  constructor(
    private readonly context: CompilationContext,
  ) {}

  // NOTE: runtime does not lower CA/TC bindables straight from raw definition
  // support. It goes through ResourceResolver.bindables(def), which computes a
  // bindables-info intermediate and may synthesize a primary bindable from
  // defaultProperty. The clean-room mirrors that shape, but keeps the
  // authored-vs-synthesized split explicit instead of silently collapsing it.
  lowerFromClassification(
    classification: CompilerAttributeClassification,
    options: {
      readonly treatEmptyAsNoBinding?: boolean;
    } = {},
  ): CompilerAttributeBindingLowering | null {
    const resource = classification.attributeResource;
    const syntax = classification.parse?.syntax;
    if (resource == null) {
      return null;
    }

    if (syntax == null) {
      return new CompilerAttributeBindingLowering(
        resource,
        classification.authored,
        [],
        [
          new CompilerAttributeBindingLoweringOpenSeam(
            'attribute-syntax-open',
            'Bindable lowering could not proceed because attribute syntax did not close to a target/command pair.',
          ),
        ],
        'Custom-attribute/template-controller bindable lowering remained open because syntax normalization did not close.',
      );
    }

    const treatEmptyAsNoBinding = options.treatEmptyAsNoBinding ?? true;
    const bindingCommand = classification.bindingCommand;
    const authored = classification.authored;
    const openSeams: CompilerAttributeBindingLoweringOpenSeam[] = [];
    const admission = classification.provenance?.attributeResourceAdmission ?? null;
    const bindablesInfo = this.context.readAttributeBindablesInfo(resource);

    const multiBindingAllowed = resource.noMultiBindings === false && bindingCommand == null && hasInlineBindings(authored.rawValue);
    if (multiBindingAllowed) {
      const assignments = this.lowerMultiBindings(bindablesInfo, authored, admission, openSeams);
      return new CompilerAttributeBindingLowering(
        resource,
        authored,
        assignments,
        openSeams,
        'Lowered through multi-binding custom-attribute/template-controller syntax.',
      );
    }

    const primaryBindable = bindablesInfo.primary;
    if (primaryBindable == null) {
      return new CompilerAttributeBindingLowering(
        resource,
        authored,
        [],
        [
          new CompilerAttributeBindingLoweringOpenSeam(
            'missing-primary-bindable',
            'The compiler-facing bindables-info intermediate did not close a primary bindable for this custom attribute/template controller.',
          ),
        ],
        'Single-value CA/TC lowering stayed open because no primary bindable closed from bindables-info.',
      );
    }

    if (bindingCommand == null) {
      if (treatEmptyAsNoBinding && authored.rawValue === '') {
        return new CompilerAttributeBindingLowering(
          resource,
          authored,
          [],
          [],
          'Empty authored attribute value lowered to no bindable assignments under treatEmptyAsNoBinding.',
        );
      }

      const hasInterpolation = containsInterpolation(authored.rawValue);
      if (hasInterpolation) {
        openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
          'interpolation-parse-open',
          'Interpolation presence closed, but actual expression parsing still belongs to a later value-carrier layer.',
        ));
      }

      return new CompilerAttributeBindingLowering(
        resource,
        authored,
        [
          new CompilerAttributeBindableAssignment(
            primaryBindable,
            'primary-bindable',
            authored.rawValue,
            hasInterpolation ? 'interpolation-candidate' : 'literal-value',
            null,
            null,
            new CompilerAttributeBindableAssignmentProvenance(
              authored,
              admission,
              primaryBindable,
              'Single-value CA/TC lowering selected the primary bindable from the compiler-facing bindables-info intermediate.',
            ),
            hasInterpolation
              ? 'Interpolation was detected in the authored value, but the actual expression carrier is still open.'
              : 'Literal authored value lowered directly to the primary bindable.',
          ),
        ],
        openSeams,
        'Single-value CA/TC lowering over the primary bindable.',
      );
    }

    const plan = this.context.planBindingCommandValueParse(bindingCommand, authored.rawValue);
    if (plan.status === 'open') {
      openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
        'binding-command-plan-open',
        'Binding-command value handling did not fully close under the current build-basis/value-parser planning seam.',
      ));
    }

    return new CompilerAttributeBindingLowering(
      resource,
      authored,
      [
        new CompilerAttributeBindableAssignment(
          primaryBindable,
          'primary-bindable',
          authored.rawValue,
          'binding-command-plan',
          bindingCommand.name,
          plan,
          new CompilerAttributeBindableAssignmentProvenance(
            authored,
            admission,
            primaryBindable,
            'Single-value CA/TC lowering routes through the selected binding command over the primary bindable.',
          ),
          'Value handling is delegated to the binding-command planning seam instead of being closed directly here.',
        ),
      ],
      openSeams,
      'Single-value CA/TC lowering over a binding-command path.',
    );
  }

  private lowerMultiBindings(
    bindablesInfo: CompilerAttributeBindablesInfo,
    authored: CompilerAuthoredAttribute,
    admission: CompilerResourceAdmissionProvenance | null,
    openSeams: CompilerAttributeBindingLoweringOpenSeam[],
  ): readonly CompilerAttributeBindableAssignment[] {
    const assignments: CompilerAttributeBindableAssignment[] = [];

    for (const current of splitMultiBindings(authored.rawValue)) {
      const syntax = this.context.parseAttribute(current.rawName, current.rawValue).syntax;
      if (syntax == null) {
        openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
          'multi-binding-syntax-open',
          `Multi-binding segment ${current.rawName} did not close to a concrete target/command pair.`,
        ));
        continue;
      }

      const bindable = bindablesInfo.readByAttr(syntax.target) ?? bindablesInfo.readByName(syntax.target);
      if (bindable == null) {
        openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
          'multi-binding-target-open',
          `Multi-binding segment ${current.rawName} targeted ${syntax.target}, which is not a known bindable on ${bindablesInfo.resource.name ?? '(anonymous resource)'}.`,
        ));
        continue;
      }

      const command = syntax.command == null
        ? null
        : this.context.getCommand(syntax.command);
      const plan = command == null
        ? null
        : this.context.planBindingCommandValueParse(command, current.rawValue);

      if (plan?.status === 'open') {
        openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
          'binding-command-plan-open',
          `Binding-command plan for multi-binding segment ${current.rawName} stayed open.`,
        ));
      }

      const hasInterpolation = command == null && containsInterpolation(current.rawValue);
      if (hasInterpolation) {
        openSeams.push(new CompilerAttributeBindingLoweringOpenSeam(
          'interpolation-parse-open',
          `Interpolation detected in multi-binding segment ${current.rawName}, but expression parsing is still a later layer.`,
        ));
      }

      assignments.push(new CompilerAttributeBindableAssignment(
        bindable,
        'multi-binding-entry',
        current.rawValue,
        command != null
          ? 'binding-command-plan'
          : hasInterpolation
            ? 'interpolation-candidate'
            : 'literal-value',
        command?.name ?? null,
        plan,
        new CompilerAttributeBindableAssignmentProvenance(
          authored,
          admission,
          bindable,
          `Multi-binding segment ${current.rawName} lowered against bindable ${bindable.name ?? bindable.attribute ?? '(anonymous bindable)'}.`,
        ),
      ));
    }

    return assignments;
  }
}

function containsInterpolation(
  rawValue: string,
): boolean {
  return rawValue.includes('${');
}

function hasInlineBindings(
  rawValue: string,
): boolean {
  for (let index = 0; index < rawValue.length; index += 1) {
    const current = rawValue[index];
    if (current === '\\') {
      index += 1;
      continue;
    }
    if (current === ':') {
      return true;
    }
    if (current === '$' && rawValue[index + 1] === '{') {
      return false;
    }
  }
  return false;
}

function splitMultiBindings(
  rawValue: string,
): readonly {
  readonly rawName: string;
  readonly rawValue: string;
}[] {
  // TODO: multi-binding splitting stays compiler-owned. The parser should see
  // one segment value at a time after this split, not the full semicolon-
  // separated authored string. Keep command/interpolation routing above the
  // parser so segment provenance remains attached to the original attribute.
  const entries: {
    rawName: string;
    rawValue: string;
  }[] = [];

  let start = 0;
  let currentName: string | null = null;
  for (let index = 0; index < rawValue.length; index += 1) {
    const current = rawValue[index];
    if (current === '\\') {
      index += 1;
      continue;
    }

    if (currentName == null && current === ':') {
      currentName = rawValue.slice(start, index).trim();
      start = skipWhitespace(rawValue, index + 1);
      continue;
    }

    if (current === ';' && currentName != null) {
      entries.push({
        rawName: currentName,
        rawValue: rawValue.slice(start, index).trim(),
      });
      currentName = null;
      start = skipWhitespace(rawValue, index + 1);
    }
  }

  if (currentName != null) {
    entries.push({
      rawName: currentName,
      rawValue: rawValue.slice(start).trim(),
    });
  }

  return entries;
}

function skipWhitespace(
  rawValue: string,
  index: number,
): number {
  let current = index;
  while (current < rawValue.length) {
    const value = rawValue[current];
    if (value == null || !/\s/.test(value)) {
      break;
    }
    current += 1;
  }
  return current;
}
