import { describe, expect, test } from 'vitest';

import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
} from '../src/resources/custom-attribute-definition.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import { AttributeClassificationKind } from '../src/template/attribute-syntax.js';
import {
  selectTemplateAttributeValueSite,
  TemplateAttributeEmptyValueBindingPolicy,
  TemplateAttributeValueSiteSelection,
  type TemplateAttributeValueSiteSelectionInput,
} from '../src/template/attribute-value-site-selection.js';
import { TemplateValueSiteKind } from '../src/template/value-site.js';

describe('product-free attribute value-site selection', () => {
  test('selects parser ownership across the compiler classification lanes', () => {
    const multiBindingDefinition = customAttributeDefinition(false);
    const noMultiBindingDefinition = customAttributeDefinition(true);
    const cases: readonly [
      string,
      TemplateAttributeValueSiteSelectionInput,
      TemplateAttributeValueSiteSelection | null,
    ][] = [
      [
        'plain static value',
        input(AttributeClassificationKind.Plain, 'static'),
        null,
      ],
      [
        'plain interpolation',
        input(AttributeClassificationKind.Plain, 'before ${value} after'),
        selected(TemplateValueSiteKind.PlainAttributeInterpolation, 'before ${value} after', 'Interpolation'),
      ],
      [
        'custom-element bindable',
        input(AttributeClassificationKind.Bindable, ''),
        selected(TemplateValueSiteKind.BindableValue, '', 'Interpolation'),
      ],
      [
        'custom-attribute primary value',
        input(AttributeClassificationKind.CustomAttribute, 'value', {
          resourceKind: ResourceDefinitionKind.CustomAttribute,
          definition: noMultiBindingDefinition,
        }),
        selected(TemplateValueSiteKind.CustomAttributeValue, 'value', 'Interpolation'),
      ],
      [
        'template-controller primary value',
        input(AttributeClassificationKind.TemplateController, 'item of items', {
          resourceKind: ResourceDefinitionKind.TemplateController,
          definition: noMultiBindingDefinition,
        }),
        selected(TemplateValueSiteKind.TemplateControllerValue, 'item of items', 'Interpolation'),
      ],
      [
        'custom-attribute multi-binding value',
        input(AttributeClassificationKind.CustomAttribute, 'first: one; second.bind: two', {
          resourceKind: ResourceDefinitionKind.CustomAttribute,
          definition: multiBindingDefinition,
        }),
        selected(TemplateValueSiteKind.MultiBindingValue, 'first: one; second.bind: two', null),
      ],
      [
        'custom-attribute definition disables multi-binding',
        input(AttributeClassificationKind.CustomAttribute, 'first: one', {
          resourceKind: ResourceDefinitionKind.CustomAttribute,
          definition: noMultiBindingDefinition,
        }),
        selected(TemplateValueSiteKind.CustomAttributeValue, 'first: one', 'Interpolation'),
      ],
      [
        'escaped colon stays a primary value',
        input(AttributeClassificationKind.CustomAttribute, String.raw`first\: one`, {
          resourceKind: ResourceDefinitionKind.CustomAttribute,
          definition: multiBindingDefinition,
        }),
        selected(TemplateValueSiteKind.CustomAttributeValue, String.raw`first\: one`, 'Interpolation'),
      ],
      [
        'custom-attribute interpolation containing a colon',
        input(AttributeClassificationKind.CustomAttribute, "${condition ? 'yes: value' : 'no'}", {
          resourceKind: ResourceDefinitionKind.CustomAttribute,
          definition: multiBindingDefinition,
        }),
        selected(
          TemplateValueSiteKind.CustomAttributeValue,
          "${condition ? 'yes: value' : 'no'}",
          'Interpolation',
        ),
      ],
      [
        'captured attribute',
        input(AttributeClassificationKind.Captured, '${captured}'),
        selected(TemplateValueSiteKind.CapturedValue, '${captured}', 'Interpolation'),
      ],
      [
        'spread transfer',
        input(AttributeClassificationKind.Spread, '', { target: '...$attrs' }),
        null,
      ],
      [
        'spread bindables',
        input(AttributeClassificationKind.Spread, 'source', { target: '...$bindables' }),
        selected(TemplateValueSiteKind.SpreadValue, 'source', 'IsProperty'),
      ],
      [
        'direct spread expression',
        input(AttributeClassificationKind.Spread, '', { target: '...model' }),
        selected(TemplateValueSiteKind.SpreadValue, 'model', 'IsProperty'),
      ],
      [
        'compiler control',
        input(AttributeClassificationKind.CompilerControl, 'ignored'),
        null,
      ],
      [
        'open classification',
        input(AttributeClassificationKind.Open, 'unknown'),
        null,
      ],
    ];

    for (const [label, selectionInput, expected] of cases) {
      expect(selectTemplateAttributeValueSite(selectionInput), label).toEqual(expected);
    }
  });

  test('lets binding-command ownership preempt classification without executing the command', () => {
    const result = selectTemplateAttributeValueSite(input(
      AttributeClassificationKind.BindingCommand,
      '',
      { hasBindingCommand: true },
    ));

    expect(result).toEqual(selected(TemplateValueSiteKind.BindingCommandValue, '', null));
  });

  test('records both empty resource policies without changing value-site selection', () => {
    const definition = customAttributeDefinition(false);
    const lanes: readonly [AttributeClassificationKind, ResourceDefinitionKind, TemplateValueSiteKind][] = [
      [
        AttributeClassificationKind.CustomAttribute,
        ResourceDefinitionKind.CustomAttribute,
        TemplateValueSiteKind.CustomAttributeValue,
      ],
      [
        AttributeClassificationKind.TemplateController,
        ResourceDefinitionKind.TemplateController,
        TemplateValueSiteKind.TemplateControllerValue,
      ],
    ];

    for (const [classificationKind, resourceKind, siteKind] of lanes) {
      const base = input(classificationKind, '', { resourceKind, definition });
      const bindPrimary = selectTemplateAttributeValueSite({
        ...base,
        emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.BindPrimary,
      });
      const noBinding = selectTemplateAttributeValueSite({
        ...base,
        emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      });

      expect(bindPrimary).toEqual(selected(
        siteKind,
        '',
        'Interpolation',
        TemplateAttributeEmptyValueBindingPolicy.BindPrimary,
      ));
      expect(noBinding).toEqual(selected(
        siteKind,
        '',
        'Interpolation',
        TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      ));
    }
  });

  test('does not apply the empty custom-attribute policy to commands, bindables, or non-empty values', () => {
    const definition = customAttributeDefinition(false);
    const results = [
      selectTemplateAttributeValueSite(input(AttributeClassificationKind.CustomAttribute, '', {
        resourceKind: ResourceDefinitionKind.CustomAttribute,
        definition,
        hasBindingCommand: true,
        emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      })),
      selectTemplateAttributeValueSite(input(AttributeClassificationKind.Bindable, '', {
        emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      })),
      selectTemplateAttributeValueSite(input(AttributeClassificationKind.TemplateController, 'condition', {
        resourceKind: ResourceDefinitionKind.TemplateController,
        definition,
        emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.NoBinding,
      })),
    ];

    expect(results.map((result) => result?.emptyValueBindingPolicy)).toEqual([null, null, null]);
  });
});

function input(
  classificationKind: AttributeClassificationKind,
  rawValue: string,
  overrides: Partial<TemplateAttributeValueSiteSelectionInput> = {},
): TemplateAttributeValueSiteSelectionInput {
  return {
    classificationKind,
    resourceKind: null,
    definition: null,
    rawValue,
    target: 'value',
    hasBindingCommand: false,
    emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy.BindPrimary,
    ...overrides,
  };
}

function selected(
  siteKind: TemplateValueSiteKind,
  rawValue: string,
  entryFamily: TemplateAttributeValueSiteSelection['entryFamily'],
  emptyValueBindingPolicy: TemplateAttributeEmptyValueBindingPolicy | null = null,
): TemplateAttributeValueSiteSelection {
  return new TemplateAttributeValueSiteSelection(siteKind, rawValue, entryFamily, emptyValueBindingPolicy);
}

function customAttributeDefinition(noMultiBindings: boolean): CustomAttributeDefinition {
  return new CustomAttributeDefinition(
    null,
    null,
    null,
    new ResourceTargetReference(null, null, 'TestCustomAttribute'),
    'test',
    [],
    'au:resource:custom-attribute:test',
    false,
    [],
    noMultiBindings,
    [],
    [],
    CustomAttributeContainerStrategy.Reuse,
    'value',
  );
}
