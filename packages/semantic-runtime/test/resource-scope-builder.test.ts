import { describe, expect, test } from 'vitest';

import type { IdentityHandle, ProductHandle } from '../src/kernel/handles.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResource,
} from '../src/template/compiler-world-reference.js';
import { mergeVisibleResourceScopes } from '../src/template/resource-scope-builder.js';

describe('template resource-scope merging', () => {
  test('preserves inherited order for exact winners without weakening preferred shadowing', () => {
    const first = visibleResource('first-resource', 'product:first');
    const second = visibleResource('second-resource', 'product:second');

    expect(mergeVisibleResourceScopes([second], [first, second]).map((resource) => resource.name))
      .toEqual(['first-resource', 'second-resource']);

    const shadowingFirst = visibleResource('first-resource', 'product:shadowing-first');
    expect(mergeVisibleResourceScopes([shadowingFirst, second], [first, second]).map((resource) =>
      resource.resourceProductHandle
    )).toEqual(['product:shadowing-first', 'product:second']);
  });
});

function visibleResource(name: string, productHandle: string): TemplateVisibleResource {
  return new TemplateVisibleResource(
    ResourceDefinitionKind.CustomElement,
    name,
    [],
    productHandle as ProductHandle,
    `identity:${productHandle}` as IdentityHandle,
    productHandle as ProductHandle,
    TemplateResourceVisibilityKind.Local,
    null,
  );
}
