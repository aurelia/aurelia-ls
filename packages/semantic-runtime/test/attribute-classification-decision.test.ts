import { describe, expect, test } from 'vitest';

import type { TemplateCompilableResourceDefinition } from '../src/resources/resource-definition.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import {
  type AttributeClassificationDecisionOwner,
  type AttributeClassificationDecisionSyntax,
  decideAttributeClassification,
} from '../src/template/attribute-classification-decision.js';
import {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from '../src/template/attribute-syntax.js';
import type { BindingCommandExecutable } from '../src/template/binding-command-execution.js';
import {
  TemplateCompilerObservedValue,
  type TemplateCompilerReadObservation,
  type TemplateCompilerReadView,
} from '../src/template/compiler-read-view.js';
import {
  type TemplateBindablesInfo,
  TemplateResolvedResource,
  TemplateResourceResolutionKind,
} from '../src/template/compiler-world.js';
import {
  type TemplateBindableReference,
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../src/template/compiler-world-reference.js';

describe('product-free attribute classification decision', () => {
  test('gives compiler controls priority over an open parser result without reading compiler products', () => {
    const decision = decideAttributeClassification(
      syntax({
        syntaxKind: AttributeSyntaxKind.Open,
        rawName: 'containerless',
        runtimeRawName: 'containerless',
        target: 'containerless',
      }),
      owner('article', 'replacement-card'),
      throwingReads(),
    );

    expect(decision.classificationKind).toBe(AttributeClassificationKind.CompilerControl);
    expect(decision.reads).toMatchObject({
      bindingCommand: null,
      element: null,
      attribute: null,
      bindables: [],
      capturePredicate: null,
    });
  });

  test('uses reached lookup identity and retains the full selected definition with paired read authority', () => {
    const definition = { type: ResourceDefinitionKind.CustomAttribute } as TemplateCompilableResourceDefinition;
    const resource = new TemplateVisibleResource(
      ResourceDefinitionKind.CustomAttribute,
      'focus',
      [],
      null,
      null,
      null,
      TemplateResourceVisibilityKind.Configured,
      null,
    );
    const resolution = new TemplateResolvedResource(
      TemplateResourceResolutionKind.Definition,
      resource,
      definition,
      null,
    );
    const bindable = {} as TemplateBindableReference;
    const elementRead = observed<TemplateResolvedResource | null>(null);
    const attributeRead = observed<TemplateResolvedResource | null>(resolution);
    const bindablesRead = observed<TemplateBindablesInfo>({ primary: bindable } as TemplateBindablesInfo);
    const elementLookups: string[] = [];
    const attributeLookups: string[] = [];
    const reads = {
      readElement(name: string) {
        elementLookups.push(name);
        return elementRead;
      },
      readAttribute(name: string) {
        attributeLookups.push(name);
        return attributeRead;
      },
      readBindables() {
        return bindablesRead;
      },
    } as unknown as TemplateCompilerReadView;

    const decision = decideAttributeClassification(
      syntax({
        syntaxKind: AttributeSyntaxKind.Plain,
        rawName: 'focus',
        runtimeRawName: 'focus',
        target: 'focus',
      }),
      owner('article', 'replacement-card'),
      reads,
    );

    expect(elementLookups).toEqual(['replacement-card']);
    expect(attributeLookups).toEqual(['focus']);
    expect(decision.classificationKind).toBe(AttributeClassificationKind.CustomAttribute);
    expect(decision.bindable).toBe(bindable);
    expect(decision.resolvedResource).toBe(resolution);
    expect(decision.resolvedDefinition).toBe(definition);
    expect(decision.reads.element).toBe(elementRead);
    expect(decision.reads.attribute).toBe(attributeRead);
    expect(decision.reads.bindables).toEqual([bindablesRead]);
  });

  test('rejects removed v1 commands before element lookup while retaining the negative command read', () => {
    const commandRead = observed<BindingCommandExecutable | null>(null);
    let elementRead = false;
    const reads = {
      readBindingCommand() {
        return commandRead;
      },
      readElement() {
        elementRead = true;
        throw new Error('Element lookup must remain unreachable.');
      },
    } as unknown as TemplateCompilerReadView;

    const decision = decideAttributeClassification(
      syntax({
        syntaxKind: AttributeSyntaxKind.Pattern,
        rawName: 'click.delegate',
        runtimeRawName: 'click.delegate',
        target: 'click',
        command: 'delegate',
      }),
      owner('button', 'button'),
      reads,
    );

    expect(elementRead).toBe(false);
    expect(decision.classificationKind).toBe(AttributeClassificationKind.Open);
    expect(decision.issue?.message).toContain('unknown binding command: "delegate"');
    expect(decision.reads.bindingCommand).toBe(commandRead);
  });
});

function syntax(
  input: Omit<AttributeClassificationDecisionSyntax, 'command'> & { readonly command?: string | null },
): AttributeClassificationDecisionSyntax {
  return {
    syntaxKind: input.syntaxKind,
    rawName: input.rawName,
    runtimeRawName: input.runtimeRawName,
    target: input.target,
    command: input.command ?? null,
  };
}

function owner(tagName: string, lookupName: string): AttributeClassificationDecisionOwner {
  return {
    tagName,
    lookupName,
    attributeStateKey: `${tagName}:${lookupName}`,
  };
}

function observed<TValue>(value: TValue): TemplateCompilerObservedValue<TValue> {
  return new TemplateCompilerObservedValue(value, {} as TemplateCompilerReadObservation);
}

function throwingReads(): TemplateCompilerReadView {
  return new Proxy({}, {
    get(_target, key) {
      throw new Error(`Unexpected compiler read '${String(key)}'.`);
    },
  }) as TemplateCompilerReadView;
}
