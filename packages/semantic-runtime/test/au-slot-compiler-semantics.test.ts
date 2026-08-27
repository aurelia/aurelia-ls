import { describe, expect, test } from 'vitest';

import {
  RuntimeHtmlAuComposeResource,
  RuntimeHtmlAuSlotResource,
} from '../src/resources/built-in-resources.js';
import {
  AU_SLOT_DEFAULT_NAME,
  AuSlotCompilerAttributeSnapshot,
  AuSlotCompilerChildSnapshot,
  AuSlotCompilerProcessContentInput,
  planAuSlotCompilerProcessContent,
} from '../src/template/au-slot-compiler-semantics.js';

describe('AuSlot compiler semantics', () => {
  test('selects the static name and ordered direct element removals from a representation-neutral snapshot', () => {
    const nameCarrier = { key: 'name' };
    const firstRemoved = { key: 'first-removed' };
    const namespacedRemoved = { key: 'namespaced-removed' };
    const secondRemoved = { key: 'second-removed' };
    const input = new AuSlotCompilerProcessContentInput(
      [attribute(nameCarrier, 'name', '', 'urn:example')],
      [
        new AuSlotCompilerChildSnapshot({ key: 'text' }, null),
        new AuSlotCompilerChildSnapshot(firstRemoved, [attribute({ key: 'slot-1' }, 'au-slot', 'first')]),
        new AuSlotCompilerChildSnapshot({ key: 'prefixed' }, [attribute({ key: 'slot-2' }, 'x:au-slot', '')]),
        new AuSlotCompilerChildSnapshot(namespacedRemoved, [
          attribute({ key: 'slot-3' }, 'au-slot', '', 'urn:example'),
        ]),
        new AuSlotCompilerChildSnapshot(secondRemoved, [attribute({ key: 'slot-4' }, 'au-slot', 'second')]),
      ],
    );

    const plan = planAuSlotCompilerProcessContent(new RuntimeHtmlAuSlotResource(), input);

    expect(plan?.name).toBe('');
    expect(plan?.nameAttribute?.attribute).toBe(nameCarrier);
    expect(plan?.removedChildren).toEqual([firstRemoved, namespacedRemoved, secondRemoved]);
    expect(planAuSlotCompilerProcessContent(new RuntimeHtmlAuComposeResource(), input)).toBeNull();
    expect(planAuSlotCompilerProcessContent({ ...new RuntimeHtmlAuSlotResource() }, input)).toBeNull();
  });

  test('uses the framework default only when the static name attribute is absent', () => {
    const plan = planAuSlotCompilerProcessContent(
      new RuntimeHtmlAuSlotResource(),
      new AuSlotCompilerProcessContentInput([], []),
    );

    expect(plan).toMatchObject({
      name: AU_SLOT_DEFAULT_NAME,
      nameAttribute: null,
      removedChildren: [],
    });
  });
});

function attribute<TAttribute>(
  carrier: TAttribute,
  qualifiedName: string,
  value: string,
  namespaceUri: string | null = null,
): AuSlotCompilerAttributeSnapshot<TAttribute> {
  return new AuSlotCompilerAttributeSnapshot(carrier, qualifiedName, value, namespaceUri);
}
