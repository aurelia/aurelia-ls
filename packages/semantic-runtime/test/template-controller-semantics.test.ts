import { describe, expect, test } from 'vitest';

import type { ProductHandle } from '../src/kernel/handles.js';
import type { ProductDetailReadView, ProductDetailSlot } from '../src/kernel/product-details.js';
import { KernelStore } from '../src/kernel/store.js';
import { RuntimeHtmlWithResource } from '../src/resources/built-in-resources.js';
import {
  CustomAttributeContainerStrategy,
  CustomAttributeDefinition,
} from '../src/resources/custom-attribute-definition.js';
import { ResourceProductDetails } from '../src/resources/product-details.js';
import { ResourceDefinitionKind } from '../src/resources/resource-kind.js';
import { ResourceTargetReference } from '../src/resources/resource-reference.js';
import {
  TemplateResourceVisibilityKind,
  TemplateVisibleResourceReference,
} from '../src/template/compiler-world-reference.js';
import {
  BuiltInTemplateControllerFlowKind,
  frameworkTemplateControllerSemanticsForResource,
} from '../src/template/template-controller-semantics.js';

describe('template-controller semantics', () => {
  test('selects framework semantics by resolved definition ownership rather than authored name', () => {
    const framework = new TemplateControllerDefinitionReadView('framework', 'with', true);
    const app = new TemplateControllerDefinitionReadView('app', 'with', false);

    expect(frameworkTemplateControllerSemanticsForResource(
      framework,
      framework.resource,
    )?.flowKind).toBe(BuiltInTemplateControllerFlowKind.ValueScope);
    expect(frameworkTemplateControllerSemanticsForResource(
      app,
      app.resource,
    )).toBeNull();
  });
});

class TemplateControllerDefinitionReadView implements ProductDetailReadView {
  readonly store: KernelStore;
  readonly definition: CustomAttributeDefinition;
  readonly header: RuntimeHtmlWithResource | null;
  readonly resource: TemplateVisibleResourceReference;

  constructor(
    localKey: string,
    name: string,
    frameworkOwned: boolean,
  ) {
    this.store = new KernelStore(`template-controller-semantics:${localKey}`);
    const handles = this.store.handles;
    const productHandle = handles.product(`${localKey}:definition`);
    const resourceProductHandle = frameworkOwned
      ? handles.product(`${localKey}:header`)
      : productHandle;
    const identityHandle = handles.identity(`${localKey}:resource`);
    this.header = frameworkOwned
      ? new RuntimeHtmlWithResource(resourceProductHandle, identityHandle)
      : null;
    this.definition = new CustomAttributeDefinition(
      productHandle,
      identityHandle,
      null,
      new ResourceTargetReference(
        handles.identity(`${localKey}:target`),
        null,
        'With',
      ),
      name,
      [],
      `au:resource:custom-attribute:${name}`,
      true,
      [],
      false,
      [],
      [],
      CustomAttributeContainerStrategy.Reuse,
      'value',
    );
    this.resource = new TemplateVisibleResourceReference(
      ResourceDefinitionKind.TemplateController,
      name,
      resourceProductHandle,
      identityHandle,
      productHandle,
      TemplateResourceVisibilityKind.Configured,
      null,
    );
  }

  readProductDetail<TDetail>(
    slot: ProductDetailSlot<TDetail>,
    productHandle: ProductHandle,
  ): TDetail | null {
    if (slot === ResourceProductDetails.Definition && productHandle === this.definition.productHandle) {
      return this.definition as TDetail;
    }
    return slot === ResourceProductDetails.DefinitionHeader
      && productHandle === this.header?.productHandle
      ? this.header as TDetail
      : null;
  }
}
