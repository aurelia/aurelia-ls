import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  LOCKED_BASELINE_PROMOTION_SCENARIO_IDS,
  LOCKED_TARGETED_SCENARIO_IDS,
  assertLockedPerformancePortfolio,
  createLockedPerformancePortfolio,
  lockedPerformanceScenarioManifest,
} from '../src/portfolio.js';

const workspaceRoot = path.resolve(import.meta.dirname, '../../..');

describe('locked performance portfolio', () => {
  test('joins the complete baseline sequence and bounded targeted sequence', () => {
    const portfolio = createLockedPerformancePortfolio(workspaceRoot);
    expect(portfolio.manifest).toBe(lockedPerformanceScenarioManifest);
    expect(portfolio.runtimeScenarios).toHaveLength(20);
    expect(LOCKED_BASELINE_PROMOTION_SCENARIO_IDS).toEqual(
      portfolio.manifest.scenarios.map(scenario => scenario.scenarioId),
    );
    expect(LOCKED_TARGETED_SCENARIO_IDS).toEqual([
      'simple-activation-render-10k',
      'simple-empty-to-10k-rerender',
      'simple-member-update-1k',
      'realistic-activation-render-1k',
      'realistic-keyed-refresh-1k',
      'realistic-mixed-reconciliation-1k',
      'realistic-heap-lifecycle-500',
      'keyed-create-1k',
      'keyed-update-tenth-10k',
      'keyed-select-1k',
      'keyed-swap-1k',
      'keyed-remove-1k',
      'storefront-activation-render-500',
      'storefront-badge-filter-500',
      'storefront-list-to-detail-500',
      'storefront-heap-lifecycle-500',
    ]);
    expect(() => assertLockedPerformancePortfolio(portfolio)).not.toThrow();
  });

  test('names the keyed-table core and public-full presets exactly', () => {
    const portfolio = createLockedPerformancePortfolio(workspaceRoot);
    expect(portfolio.keyedTablePresets.opticsCore).toEqual([
      'keyed-create-1k',
      'keyed-update-tenth-10k',
      'keyed-select-1k',
      'keyed-swap-1k',
      'keyed-remove-1k',
    ]);
    expect(portfolio.keyedTablePresets.opticsPublicFull).toEqual([
      'keyed-create-1k',
      'keyed-replace-1k',
      'keyed-update-tenth-10k',
      'keyed-select-1k',
      'keyed-swap-1k',
      'keyed-remove-1k',
      'keyed-create-10k',
      'keyed-append-1k-to-10k',
      'keyed-clear-10k',
    ]);
  });

  test('joins all runtime and production size/closure build applications in stable order', () => {
    const portfolio = createLockedPerformancePortfolio(workspaceRoot);
    expect(portfolio.applications.map(application => [
      application.id,
      application.role,
      application.headlineSize,
    ])).toEqual([
      ['app-repeat-view', 'runtime', true],
      ['app-repeat-realistic', 'runtime', true],
      ['keyed-table-optics', 'runtime', true],
      ['routed-storefront-benchmark', 'runtime', false],
      ['hello-world', 'size-closure', true],
      ['state-backed-form', 'size-closure', true],
      ['projects-and-milestones', 'size-closure', true],
      ['routed-storefront', 'size-closure', true],
    ]);
    expect(createLockedPerformancePortfolio(workspaceRoot)).toEqual(portfolio);
  });

  test('rejects scenario-order and shared-source-identity drift', () => {
    const orderDrift = structuredClone(createLockedPerformancePortfolio(workspaceRoot)) as any;
    orderDrift.manifest.scenarios.reverse();
    expect(() => assertLockedPerformancePortfolio(orderDrift)).toThrow(/runtime descriptors and manifest/u);

    const sourceDrift = structuredClone(createLockedPerformancePortfolio(workspaceRoot)) as any;
    sourceDrift.manifest.scenarios[1].authoredSources = structuredClone(
      sourceDrift.manifest.scenarios[1].authoredSources,
    );
    sourceDrift.manifest.scenarios[1].authoredSources[0].sha256 = 'f'.repeat(64);
    expect(() => assertLockedPerformancePortfolio(sourceDrift)).toThrow(/divergent authored-source identity/u);
  });

  test('rejects application and preset drift rather than silently widening the portfolio', () => {
    const applicationDrift = structuredClone(createLockedPerformancePortfolio(workspaceRoot)) as any;
    applicationDrift.applications.push(applicationDrift.applications[0]);
    expect(() => assertLockedPerformancePortfolio(applicationDrift)).toThrow(/locked build applications/u);

    const presetDrift = structuredClone(createLockedPerformancePortfolio(workspaceRoot)) as any;
    presetDrift.keyedTablePresets.opticsCore.push('keyed-create-10k');
    expect(() => assertLockedPerformancePortfolio(presetDrift)).toThrow(/optics-core preset/u);
  });
});
