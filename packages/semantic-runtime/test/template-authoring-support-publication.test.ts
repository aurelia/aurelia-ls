import { describe, expect, test } from 'vitest';

import { ComputationCommitState, ComputationLifecycleRegistry } from '../src/kernel/computation-lifecycle.js';
import { KernelStore } from '../src/kernel/store.js';
import {
  BuiltInResourceCatalogMaterializer,
} from '../src/resources/built-in-resource-catalog-materializer.js';
import { RuntimeHtmlBuiltInResourceCatalogs } from '../src/resources/built-in-resources.js';
import {
  BuiltInSyntaxCatalogMaterializer,
} from '../src/template/built-in-syntax-catalog-materializer.js';
import { RuntimeHtmlBuiltInSyntaxCatalogs } from '../src/template/built-in-syntax.js';
import {
  BuiltInRuntimeRendererCatalogMaterializer,
} from '../src/template/runtime-renderer-catalog-materializer.js';
import {
  RuntimeHtmlDefaultRenderers,
  RuntimeRendererGroup,
  RuntimeRendererPackage,
} from '../src/template/runtime-renderer.js';

describe('template authoring support publication', () => {
  test('keeps syntax, resource, and renderer support invisible until one computation commits', () => {
    const store = new KernelStore('template-authoring-support-publication');
    const lifecycle = new ComputationLifecycleRegistry(store);
    const locus = {
      kind: 'template-authoring-support-publication',
      reconciliationKey: 'project',
      summary: 'Authoring support catalogs share one replaceable publication.',
    };
    const materialize = () => {
      const run = lifecycle.begin(locus);
      new BuiltInSyntaxCatalogMaterializer(store, run)
        .materialize(Object.values(RuntimeHtmlBuiltInSyntaxCatalogs));
      new BuiltInResourceCatalogMaterializer(store, run)
        .materialize(Object.values(RuntimeHtmlBuiltInResourceCatalogs));
      new BuiltInRuntimeRendererCatalogMaterializer(store, run).materialize([{
        packageId: RuntimeRendererPackage.RuntimeHtml,
        group: RuntimeRendererGroup.RuntimeHtmlDefaultRenderers,
        renderers: RuntimeHtmlDefaultRenderers,
      }]);
      return run;
    };

    const initialCounts = store.readKernelCountSnapshot();
    const first = materialize();
    expect(store.readKernelCountSnapshot()).toEqual(initialCounts);
    expect(first.readKernelCountSnapshot().totalRecords).toBeGreaterThan(initialCounts.totalRecords);
    expect(first.readKernelCountSnapshot().productDetails).toBeGreaterThan(initialCounts.productDetails);
    expect(first.commit().state).toBe(ComputationCommitState.Committed);

    const committedCounts = store.readKernelCountSnapshot();
    expect(committedCounts.totalRecords).toBeGreaterThan(initialCounts.totalRecords);
    expect(committedCounts.productDetails).toBeGreaterThan(initialCounts.productDetails);

    const replacement = materialize();
    expect(store.readKernelCountSnapshot()).toEqual(committedCounts);
    expect(replacement.commit().state).toBe(ComputationCommitState.Committed);
    expect(store.readKernelCountSnapshot()).toEqual(committedCounts);
  });
});
