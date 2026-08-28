import { describe, expect, test } from 'vitest';

import { HydrateElementProjectionContributorDisposition } from '../src/template/instruction-ir.js';
import {
  groupTemplateCompilerProjectionChildren,
  TemplateCompilerProjectionChildSnapshot,
  TemplateCompilerProjectionGroupingInput,
} from '../src/template/template-compiler-projection-grouping.js';

interface NodeToken {
  readonly key: string;
}

interface AttributeToken {
  readonly key: string;
}

interface ChildOptions {
  readonly slotName?: string | null;
  readonly whitespace?: boolean;
  readonly htmlTemplate?: boolean;
  readonly remainingAttributes?: number;
}

describe('template compiler projection grouping', () => {
  test('groups implicit default and repeated named contributors in direct-child order', () => {
    const children = [
      child('default-a'),
      child('named-a', { slotName: 'named' }),
      child('default-b'),
      child('named-b', { slotName: 'named' }),
    ];

    const plan = group(children);

    expect(plan.groups.map((candidate) => [
      candidate.slotName,
      candidate.members.map((member) => member.node.key),
    ])).toEqual([
      ['default', ['default-a', 'default-b']],
      ['named', ['named-a', 'named-b']],
    ]);
    expect(plan.extractedContributors.map((candidate) => candidate.node.key))
      .toEqual(['default-a', 'named-a', 'default-b', 'named-b']);
    expect(plan.residualChildren).toEqual([]);
  });

  test('normalizes empty explicit names to default without losing explicit attribute identity', () => {
    const explicitDefault = child('explicit-default', { slotName: '' });

    const plan = group([explicitDefault]);

    expect(plan.groups.map((candidate) => candidate.slotName)).toEqual(['default']);
    expect(plan.extractedContributors[0]).toMatchObject({
      node: explicitDefault.node,
      slotAttribute: explicitDefault.slotAttribute,
      slotName: 'default',
    });
  });

  test('discards whitespace without creating an empty projection definition', () => {
    const whitespace = child('whitespace', { whitespace: true });

    const plan = group([whitespace]);

    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]?.createsDefinition).toBe(false);
    expect(plan.definitionGroups).toEqual([]);
    expect(plan.discardedContributors.map((candidate) => candidate.node.key)).toEqual(['whitespace']);
    expect(plan.extractedContributors[0]?.disposition)
      .toBe(HydrateElementProjectionContributorDisposition.DiscardedWhitespace);
  });

  test('retains comments and non-whitespace text as projection definition members', () => {
    const plan = group([child('comment'), child('text')]);

    expect(plan.definitionGroups).toHaveLength(1);
    expect(plan.definitionGroups[0]?.contributors.map((candidate) => candidate.node.key))
      .toEqual(['comment', 'text']);
    expect(plan.definitionGroups[0]?.contributors.every((candidate) =>
      candidate.disposition === HydrateElementProjectionContributorDisposition.RetainedNode
    )).toBe(true);
  });

  test('unwraps a slot-only HTML template but retains a template with another live attribute', () => {
    const emptyTemplate = child('empty-template', {
      slotName: 'named',
      htmlTemplate: true,
      remainingAttributes: 0,
    });
    const controlledTemplate = child('controlled-template', {
      slotName: 'named',
      htmlTemplate: true,
      remainingAttributes: 1,
    });

    const plan = group([emptyTemplate, controlledTemplate]);

    expect(plan.groups[0]?.createsDefinition).toBe(true);
    expect(plan.groups[0]?.members.map((candidate) => candidate.disposition)).toEqual([
      HydrateElementProjectionContributorDisposition.UnwrappedTemplateContent,
      HydrateElementProjectionContributorDisposition.RetainedNode,
    ]);
  });

  test('keeps implicit children residual under explicit shadow while extracting explicit slots', () => {
    const implicit = child('implicit');
    const explicit = child('explicit', { slotName: 'named' });

    const plan = group([implicit, explicit], true);

    expect(plan.residualChildren.map((candidate) => candidate.node.key)).toEqual(['implicit']);
    expect(plan.extractedContributors.map((candidate) => candidate.node.key)).toEqual(['explicit']);
    expect(plan.groups.map((candidate) => candidate.slotName)).toEqual(['named']);
  });

  test('preserves Map first-encounter order for array-index-like slot names', () => {
    const plan = group([
      child('two', { slotName: '2' }),
      child('one', { slotName: '1' }),
      child('two-again', { slotName: '2' }),
    ]);

    expect(plan.groups.map((candidate) => candidate.slotName)).toEqual(['2', '1']);
    expect(plan.groups[0]?.members.map((candidate) => candidate.node.key)).toEqual(['two', 'two-again']);
  });
});

function child(
  key: string,
  options: ChildOptions = {},
): TemplateCompilerProjectionChildSnapshot<NodeToken, AttributeToken> {
  const slotName = options.slotName ?? null;
  const slotAttribute = slotName == null ? null : { key: `${key}:au-slot` };
  return new TemplateCompilerProjectionChildSnapshot(
    { key },
    slotAttribute,
    slotName,
    null,
    null,
    null,
    options.whitespace ?? false,
    options.htmlTemplate ?? false,
    options.remainingAttributes ?? 0,
  );
}

function group(
  children: readonly TemplateCompilerProjectionChildSnapshot<NodeToken, AttributeToken>[],
  hasExplicitShadowOptions = false,
) {
  return groupTemplateCompilerProjectionChildren(new TemplateCompilerProjectionGroupingInput(
    { key: 'host' },
    null,
    hasExplicitShadowOptions,
    children,
  ));
}
