import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { readRouterOptionsRows } from '../src/api/route-projections.js';
import { createSemanticRuntime } from '../src/api/runtime.js';
import { ConfigurationOptionValueKind } from '../src/configuration/configuration-option.js';
import {
  NodeSemanticRuntimeProjectInputHost,
  SemanticRuntimeProjectInputAuthority,
} from '../src/kernel/project-input.js';
import type { EvidenceHandle, ProductHandle, ProvenanceHandle } from '../src/kernel/handles.js';
import { readFieldProvenance } from '../src/kernel/provenance.js';
import type { KernelStore } from '../src/kernel/store.js';
import {
  RouterOptionsFieldStateKind,
  type RouterOptionsModel,
  type RouterOptionsValueField,
} from '../src/router/model.js';
import { RouterProductDetails } from '../src/router/product-details.js';
import { MutableProjectSourceOverlay } from './support/incremental-conformance.js';

describe('RouterOptions provenance and detail convergence', () => {
  test('publishes one rooted rich detail with exact configured winners and unwitnessed defaults', async () => {
    const fixtureRoot = pressureFixtureRoot('router-configuration-root-ownership');
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:router-options-provenance-detail',
    });
    const app = await runtime.openApp();
    const store = runtime.workspace.store;
    const options = requireRouterOptions(app.emission.routerOptions.readRouterOptions(), 'first-active');
    const states = optionStates(options);

    expect(states.size).toBe(9);
    expect(states.get('activeClass')).toMatchObject({
      stateKind: RouterOptionsFieldStateKind.Configured,
      winningContributionProductHandle: expect.any(String),
      winningContributionIdentityHandle: expect.any(String),
      sourceAddressHandle: expect.any(String),
    });
    expect(states.get('useEagerLoading')).toMatchObject({
      stateKind: RouterOptionsFieldStateKind.Configured,
      winningContributionProductHandle: expect.any(String),
      winningContributionIdentityHandle: expect.any(String),
      sourceAddressHandle: expect.any(String),
    });
    for (const field of [
      'basePath',
      'useUrlFragmentHash',
      'useHref',
      'historyStrategy',
      'useNavigationModel',
      'restorePreviousRouteTreeOnError',
      'treatQueryAsParameters',
    ] as const) {
      expect(states.get(field)).toEqual(expect.objectContaining({
        stateKind: RouterOptionsFieldStateKind.Defaulted,
        winningContributionProductHandle: null,
        winningContributionIdentityHandle: null,
        sourceAddressHandle: null,
      }));
      expect(readFieldProvenance(options.fieldProvenance, field)).toBeNull();
    }

    const activeState = states.get('activeClass')!;
    const eagerState = states.get('useEagerLoading')!;
    const configuration = app.emission.configuration.readConfiguration();
    const activeContribution = configuration.optionContributions.find((contribution) =>
      contribution.productHandle === activeState.winningContributionProductHandle
    )!;
    const eagerContribution = configuration.optionContributions.find((contribution) =>
      contribution.productHandle === eagerState.winningContributionProductHandle
    )!;
    expect(activeContribution).toBeDefined();
    expect(eagerContribution).toBeDefined();
    expect(activeContribution).not.toBe(eagerContribution);
    expect(readFieldProvenance(options.fieldProvenance, 'activeClass')).toBe(
      readFieldProvenance(activeContribution.fieldProvenance, 'value')
        ?? productProvenanceHandle(store, activeContribution.productHandle),
    );
    expect(readFieldProvenance(options.fieldProvenance, 'useEagerLoading')).toBe(
      readFieldProvenance(eagerContribution.fieldProvenance, 'value')
        ?? productProvenanceHandle(store, eagerContribution.productHandle),
    );
    expect(readFieldProvenance(options.fieldProvenance, 'activeClass'))
      .not.toBe(readFieldProvenance(options.fieldProvenance, 'useEagerLoading'));
    expect(new Set(options.fieldProvenance.map((entry) => entry.field)).size)
      .toBe(options.fieldProvenance.length);

    const detail = store.productDetails.read(RouterProductDetails.RouterOptions, options.productHandle);
    const entry = store.productDetails.readEntry(options.productHandle);
    expect(detail).toBe(options);
    expect(entry?.detail).toBe(options);
    expect(entry?.slot).toBe(RouterProductDetails.RouterOptions);
    const structuralHandles = new Set(entry?.references.map((reference) => reference.handle) ?? []);
    for (const handle of [
      options.appRoot.productHandle,
      options.appRoot.identityHandle,
      options.appRoot.addressHandle,
      options.container.productHandle,
      options.container.identityHandle,
      options.container.addressHandle,
      options.registrationProductHandle,
      options.registrationIdentityHandle,
      options.registrationSourceAddressHandle,
      options.configurationValueProductHandle,
      options.configurationValueIdentityHandle,
      options.configurationValueSourceAddressHandle,
      activeState.winningContributionProductHandle,
      activeState.winningContributionIdentityHandle,
      activeState.sourceAddressHandle,
      eagerState.winningContributionProductHandle,
      eagerState.winningContributionIdentityHandle,
      eagerState.sourceAddressHandle,
      ...options.fieldProvenance.map((provenance) => provenance.provenanceHandle),
    ]) {
      if (handle != null) expect(structuralHandles).toContain(handle);
    }

    const productEvidence = new Set(productProvenanceEvidence(store, options.productHandle));
    for (const inputHandle of [
      options.registrationProductHandle,
      options.configurationValueProductHandle,
      activeState.winningContributionProductHandle,
      eagerState.winningContributionProductHandle,
    ]) {
      for (const evidenceHandle of productProvenanceEvidence(store, inputHandle)) {
        expect(productEvidence).toContain(evidenceHandle);
      }
    }

    const publicRow = readRouterOptionsRows(app.emission, store, true).find((row) =>
      row.handles?.productHandle === options.productHandle
    );
    expect(publicRow).toMatchObject({
      activeClass: options.activeClass,
      useEagerLoading: options.useEagerLoading,
      useHref: options.useHref,
      source: expect.any(Object),
      handles: { productHandle: options.productHandle },
    });

    const shared = app.emission.routerOptions.readRouterOptions().filter((candidate) =>
      candidate.activeClass === 'shared-active'
    );
    expect(shared).toHaveLength(2);
    expect(optionStates(shared[0]!).get('activeClass')?.winningContributionProductHandle)
      .toBe(optionStates(shared[1]!).get('activeClass')?.winningContributionProductHandle);
    expect(shared[0]!.appRoot.productHandle).not.toBe(shared[1]!.appRoot.productHandle);
    expect(shared[0]!.registrationProductHandle).not.toBe(shared[1]!.registrationProductHandle);
    expect(shared[0]!.registrationIdentityHandle).not.toBe(shared[1]!.registrationIdentityHandle);
    expect(shared[0]!.configurationValueProductHandle).toBe(shared[1]!.configurationValueProductHandle);
    expect(shared[0]!.configurationValueIdentityHandle).toBe(shared[1]!.configurationValueIdentityHandle);
    expect(store.productDetails.read(RouterProductDetails.RouterOptions, shared[0]!.productHandle)).toBe(shared[0]);
    expect(store.productDetails.read(RouterProductDetails.RouterOptions, shared[1]!.productHandle)).toBe(shared[1]);
  }, 60_000);

  test('retains the last accepted contribution without admitting losing provenance', async () => {
    const fixtureRoot = pressureFixtureRoot('router-configuration-root-ownership');
    const mainFile = path.join(fixtureRoot, 'src/main.ts');
    const original = readFileSync(mainFile, 'utf8');
    const edited = original.replace(
      [
        'RouterConfiguration.customize({',
        "      activeClass: 'first-active',",
        '      useEagerLoading: true,',
        '    })',
      ].join('\n'),
      [
        'RouterConfiguration.customize((options) => {',
        "      options.activeClass = 'first-loser';",
        "      options.activeClass = 'first-active';",
        '      options.useEagerLoading = true;',
        '    })',
      ].join('\n'),
    );
    expect(edited).not.toBe(original);

    const overlay = new MutableProjectSourceOverlay();
    overlay.write(mainFile, edited);
    const inputAuthority = new SemanticRuntimeProjectInputAuthority(
      new NodeSemanticRuntimeProjectInputHost(overlay),
    );
    const runtime = await createSemanticRuntime({
      workspaceRoot: fixtureRoot,
      storeKey: 'contract:router-options-winning-contribution',
      projectInputAuthority: inputAuthority,
    });
    const app = await runtime.openApp();
    const store = runtime.workspace.store;
    const options = requireRouterOptions(app.emission.routerOptions.readRouterOptions(), 'first-active');
    const state = optionStates(options).get('activeClass')!;
    const activeContributions = app.emission.configuration.readConfiguration().optionContributions.filter((contribution) =>
      contribution.optionPath.length === 1
      && contribution.optionPath[0] === 'activeClass'
      && contribution.value.valueKind === ConfigurationOptionValueKind.String
      && (contribution.value.value === 'first-loser' || contribution.value.value === 'first-active')
    );
    expect(activeContributions.map((contribution) =>
      contribution.value.valueKind === ConfigurationOptionValueKind.String ? contribution.value.value : null
    )).toEqual(['first-loser', 'first-active']);
    const losing = activeContributions[0]!;
    const winning = activeContributions[1]!;

    expect(options.activeClass).toBe('first-active');
    expect(options.sourceAddressHandle).not.toBeNull();
    expect(state).toMatchObject({
      stateKind: RouterOptionsFieldStateKind.Configured,
      winningContributionProductHandle: winning.productHandle,
      winningContributionIdentityHandle: winning.identityHandle,
      sourceAddressHandle: winning.value.addressHandle ?? winning.sourceAddressHandle,
    });
    expect(readFieldProvenance(options.fieldProvenance, 'activeClass')).toBe(
      readFieldProvenance(winning.fieldProvenance, 'value')
        ?? productProvenanceHandle(store, winning.productHandle),
    );
    expect(readFieldProvenance(options.fieldProvenance, 'activeClass')).not.toBe(
      readFieldProvenance(losing.fieldProvenance, 'value')
        ?? productProvenanceHandle(store, losing.productHandle),
    );

    const references = new Set(
      store.productDetails.readEntry(options.productHandle)?.references.map((reference) => reference.handle) ?? [],
    );
    expect(references).toContain(winning.productHandle);
    expect(references).not.toContain(losing.productHandle);
    const optionsEvidence = new Set(productProvenanceEvidence(store, options.productHandle));
    for (const handle of productProvenanceEvidence(store, winning.productHandle)) {
      expect(optionsEvidence).toContain(handle);
    }
    for (const handle of productProvenanceEvidence(store, losing.productHandle)) {
      expect(optionsEvidence).not.toContain(handle);
    }
    expect(readRouterOptionsRows(app.emission, store, false).some((row) =>
      row.activeClass === options.activeClass && row.source?.path?.endsWith('src/main.ts') === true
    )).toBe(true);
  }, 60_000);
});

function requireRouterOptions(
  options: readonly RouterOptionsModel[],
  activeClass: string,
): RouterOptionsModel {
  const result = options.find((candidate) => candidate.activeClass === activeClass) ?? null;
  if (result == null) throw new Error(`Expected RouterOptions with activeClass '${activeClass}'.`);
  return result;
}

function optionStates(
  options: RouterOptionsModel,
): ReadonlyMap<RouterOptionsValueField, RouterOptionsModel['fieldStates'][number]> {
  return new Map(options.fieldStates.map((state) => [state.field, state]));
}

function productProvenanceHandle(
  store: KernelStore,
  productHandle: ProductHandle | null,
): ProvenanceHandle | null {
  if (productHandle == null) return null;
  const product = store.read(productHandle);
  return product?.kind === 'materialized-product' ? product.provenanceHandle : null;
}

function productProvenanceEvidence(
  store: KernelStore,
  productHandle: ProductHandle | null,
): readonly EvidenceHandle[] {
  const provenanceHandle = productProvenanceHandle(store, productHandle);
  if (provenanceHandle == null) return [];
  const provenance = store.read(provenanceHandle);
  return provenance?.kind === 'provenance-record' ? provenance.evidenceHandles : [];
}

function pressureFixtureRoot(name: string): string {
  const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
  return path.join(packageRoot, 'fixtures/pressure', name);
}
