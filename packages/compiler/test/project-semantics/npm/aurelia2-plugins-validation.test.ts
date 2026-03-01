/**
 * aurelia2-plugins Validation Tests
 *
 * Real-world validation against the aurelia2-plugins monorepo submodule.
 * Tests extraction of Aurelia resources from community plugins.
 *
 * Run with: pnpm -w test:vitest -- packages/compiler/test/project-semantics --testNamePattern "aurelia2-plugins"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import type { InspectionResult } from '../../../src/project-semantics/npm/index.js';
import { inspectCached as inspect } from '../_helpers/npm-analysis-cache.js';

// Path to aurelia2-plugins submodule
const PLUGINS_ROOT = resolve(import.meta.dirname, '../../../../../aurelia2-plugins/packages');

/**
 * Check if submodule is available - skip tests if not.
 */
function checkSubmoduleAvailable(): boolean {
  return existsSync(PLUGINS_ROOT);
}

// =============================================================================
// Packages using re-export pattern (extraction works)
// =============================================================================

describe('aurelia2-plugins: re-export pattern', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  describe.skipIf(!submoduleAvailable)('aurelia2-table', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-table'));
    });

    it('extracts 4 resources with high confidence', () => {
      expect(result.resources).toHaveLength(4);
      expect(result.confidence).toBe('high');
      const hasEntryPointGap = result.gaps.some(g => g.why.includes('Entry point not found'));
      expect(hasEntryPointGap).toBe(false);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('finds aurelia-table custom attribute with 8 bindables', () => {
      const aureliaTable = result.resources.find(r => r.name === 'aurelia-table');
      expect(aureliaTable).toBeDefined();
      expect(aureliaTable!.kind).toBe('custom-attribute');
      expect(aureliaTable!.className).toBe('AureliaTableCustomAttribute');
      expect(aureliaTable!.evidence).toBe('decorator'); // WP 1.10: should be decorator, not convention
      // 8 declared + implicit 'value' (defaultProperty defaults to 'value')
      expect(aureliaTable!.bindables).toHaveLength(9);

      // Verify specific bindables exist
      const bindableNames = aureliaTable!.bindables.map(b => b.name).sort();
      expect(bindableNames).toEqual([
        'api', 'currentPage', 'data', 'dataSource',
        'displayData', 'filters', 'pageSize', 'totalItems', 'value'
      ]);
    });

    it('correctly identifies twoWay binding modes', () => {
      const aureliaTable = result.resources.find(r => r.name === 'aurelia-table')!;
      const twoWayBindables = aureliaTable.bindables.filter(b => b.mode === 'twoWay');

      // displayData, currentPage, totalItems, api should be twoWay
      expect(twoWayBindables).toHaveLength(4);
      const twoWayNames = twoWayBindables.map(b => b.name).sort();
      expect(twoWayNames).toEqual(['api', 'currentPage', 'displayData', 'totalItems']);
    });

    it('finds aut-sort custom attribute', () => {
      const autSort = result.resources.find(r => r.name === 'aut-sort');
      expect(autSort).toBeDefined();
      expect(autSort!.kind).toBe('custom-attribute');
      // 3 declared + implicit 'value' (defaultProperty defaults to 'value')
      expect(autSort!.bindables.map(b => b.name).sort()).toEqual(['custom', 'default', 'key', 'value']);
    });

    it('finds aut-select custom attribute with row twoWay', () => {
      const autSelect = result.resources.find(r => r.name === 'aut-select');
      expect(autSelect).toBeDefined();
      expect(autSelect!.kind).toBe('custom-attribute');

      const row = autSelect!.bindables.find(b => b.name === 'row');
      expect(row?.mode).toBe('twoWay');
    });

    it('finds aut-pagination custom element', () => {
      const autPagination = result.resources.find(r => r.name === 'aut-pagination');
      expect(autPagination).toBeDefined();
      expect(autPagination!.kind).toBe('custom-element');
      expect(autPagination!.bindables.length).toBeGreaterThanOrEqual(10);

      const currentPage = autPagination!.bindables.find(b => b.name === 'currentPage');
      expect(currentPage?.mode).toBe('twoWay');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-google-maps', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-google-maps'));
    });

    it('extracts google-map custom element with high confidence', () => {
      expect(result.resources).toHaveLength(1);
      expect(result.confidence).toBe('high');
      expect(result.gaps.length).toBeGreaterThan(0);

      const googleMap = result.resources[0]!;
      expect(googleMap.name).toBe('google-map');
      expect(googleMap.kind).toBe('custom-element');
      expect(googleMap.className).toBe('GoogleMaps');
    });

    it('extracts 16 bindables', () => {
      const googleMap = result.resources[0]!;
      expect(googleMap.bindables).toHaveLength(16);

      // Verify key bindables exist
      const names = googleMap.bindables.map(b => b.name);
      expect(names).toContain('longitude');
      expect(names).toContain('latitude');
      expect(names).toContain('zoom');
      expect(names).toContain('markers');
      expect(names).toContain('drawEnabled');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-google-places', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-google-places'));
    });

    it('extracts google-places custom attribute', () => {
      expect(result.resources).toHaveLength(1);

      const places = result.resources[0]!;
      expect(places.name).toBe('google-places');
      expect(places.kind).toBe('custom-attribute');
    });

    it('finds 10 bindables with correct modes', () => {
      const places = result.resources[0]!;
      expect(places.bindables).toHaveLength(10);

      // place is primary and fromView
      const place = places.bindables.find(b => b.name === 'place');
      expect(place?.primary).toBe(true);
      expect(place?.mode).toBe('fromView');

      // autocomplete is fromView
      const autocomplete = places.bindables.find(b => b.name === 'autocomplete');
      expect(autocomplete?.mode).toBe('fromView');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-notification', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-notification'));
    });

    it('extracts au-notification-host custom element', () => {
      expect(result.resources).toHaveLength(1);

      const host = result.resources[0]!;
      expect(host.name).toBe('au-notification-host');
      expect(host.kind).toBe('custom-element');
      expect(host.bindables).toHaveLength(3);
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-forms', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-forms'));
    });

    it('extracts 2 resources', () => {
      expect(result.resources).toHaveLength(2);
    });

    it('finds au-form custom element', () => {
      const auForm = result.resources.find(r => r.name === 'au-form');
      expect(auForm).toBeDefined();
      expect(auForm!.kind).toBe('custom-element');
      expect(auForm!.bindables.length).toBe(5);

      const form = auForm!.bindables.find(b => b.name === 'form');
      expect(form?.mode).toBe('twoWay');
    });

    it('finds au-field custom attribute with primary bindable', () => {
      const auField = result.resources.find(r => r.name === 'au-field');
      expect(auField).toBeDefined();
      expect(auField!.kind).toBe('custom-attribute');

      const name = auField!.bindables.find(b => b.name === 'name');
      expect(name?.primary).toBe(true);

      const value = auField!.bindables.find(b => b.name === 'value');
      expect(value?.mode).toBe('twoWay');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-query', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-query'));
    });

    it('extracts 2 resources (element + binding-behavior)', () => {
      expect(result.resources).toHaveLength(2);

      const element = result.resources.find(r => r.kind === 'custom-element');
      expect(element?.name).toBe('au-query');

      const behavior = result.resources.find(r => r.kind === 'binding-behavior');
      expect(behavior?.name).toBe('query');
    });

    it('au-query has primary and twoWay bindables', () => {
      const auQuery = result.resources.find(r => r.name === 'au-query')!;

      const query = auQuery.bindables.find(b => b.name === 'query');
      expect(query?.primary).toBeUndefined();

      const queryResult = auQuery.bindables.find(b => b.name === 'result');
      expect(queryResult?.mode).toBe('twoWay');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-router-extras', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-router-extras'));
    });

    it('extracts au-breadcrumbs custom element', () => {
      expect(result.resources).toHaveLength(1);

      const breadcrumbs = result.resources[0]!;
      expect(breadcrumbs.name).toBe('au-breadcrumbs');
      expect(breadcrumbs.kind).toBe('custom-element');
      expect(breadcrumbs.bindables).toHaveLength(1);
      expect(breadcrumbs.bindables[0]!.name).toBe('items');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-storage', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-storage'));
    });

    it('extracts persist custom attribute', () => {
      expect(result.resources).toHaveLength(1);

      const persist = result.resources[0]!;
      expect(persist.name).toBe('persist');
      expect(persist.kind).toBe('custom-attribute');
      expect(persist.bindables).toHaveLength(5);
    });

    it('has key as primary and value as twoWay', () => {
      const persist = result.resources[0]!;

      const key = persist.bindables.find(b => b.name === 'key');
      expect(key?.primary).toBe(true);

      const value = persist.bindables.find(b => b.name === 'value');
      expect(value?.mode).toBe('twoWay');
    });
  });
});

// =============================================================================
// Packages using configuration pattern (extraction not yet supported)
// These packages use IRegistry pattern: classes imported into arrays,
// registered via container.register(), but NOT re-exported directly.
// =============================================================================

describe('aurelia2-plugins: configuration pattern (aspirational)', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  /**
   * aurelia2-bootstrap: Factory Configuration Pattern
   *
   * Classes are imported and stored in DefaultComponents array,
   * registered via factory function, but not re-exported.
   *
   * Requires: array element tracing, factory function analysis,
   * spread resolution, convention inference for undecorated classes.
   */
  describe.skipIf(!submoduleAvailable)('aurelia2-bootstrap', () => {
    let result: InspectionResult;

    beforeAll(async () => {
      result = await inspect(join(PLUGINS_ROOT, 'aurelia2-bootstrap'));
    });

    it('extracts 21 resources from DefaultComponents array', async () => {
      // Phase 3: Factory pattern analysis finds all 21 template resources
      expect(result.resources).toHaveLength(21);

      // Key resources that should be found:
      const names = result.resources.map(r => r.name);
      expect(names).toContain('aubs-accordion');
      expect(names).toContain('aubs-modal');
      expect(names).toContain('aubs-tooltip');
      expect(names).toContain('aubs-pagination');
    });

    it('detects factory configuration pattern', async () => {
      expect(result.configurations).toHaveLength(1);
      expect(result.configurations[0]!.exportName).toBe('BootstrapConfiguration');
      expect(result.configurations[0]!.isFactory).toBe(true);
    });

    it('links configuration to all 21 class registrations', async () => {
      const config = result.configurations[0]!;
      expect(config.registers).toHaveLength(21);

      // All registers should be class names (strings) in inspect output
      expect(config.registers.every(r => typeof r === 'string')).toBe(true);

      // Verify key classes are registered
      expect(config.registers).toContain('AubsAccordionCustomElement');
      expect(config.registers).toContain('AubsModalCustomAttribute');
      expect(config.registers).toContain('AubsTooltipCustomAttribute');
    });

    it('uses convention inference for classes without decorators', async () => {
      // AubsModalCustomAttribute has no @customAttribute decorator
      // but should be detected via naming convention
      const modal = result.resources.find(r => r.className === 'AubsModalCustomAttribute');
      expect(modal).toBeDefined();
      expect(modal!.evidence).toBe('convention');
    });
  });

  /**
   * aurelia2-outclick: Configuration Object Pattern
   *
   * Class is imported but only used in DefaultComponents array,
   * exported as configuration object with register() method.
   *
   * Requires: IRegistry detection, register() body analysis,
   * array spread resolution, import following.
   */
  describe.skipIf(!submoduleAvailable)('aurelia2-outclick', () => {
    it('extracts outclick custom attribute from configuration', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-outclick'));

      expect(result.resources).toHaveLength(1);

      const outclick = result.resources[0]!;
      expect(outclick.name).toBe('outclick');
      expect(outclick.kind).toBe('custom-attribute');
    });

    it('finds primary bindable', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-outclick'));

      const outclick = result.resources[0]!;
      const fn = outclick.bindables.find(b => b.name === 'fn');
      expect(fn?.primary).toBe(true);
    });

    it('extracts configuration export', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-outclick'));

      expect(result.configurations).toHaveLength(1);
      expect(result.configurations[0]!.exportName).toBe('AureliaOutclick');
      expect(result.configurations[0]!.isFactory).toBe(false);
    });
  });

  /**
   * aurelia2-froala-editor: Factory Function Pattern
   *
   * Configuration exported as factory function call result.
   * Array contains both DI tokens and resource classes.
   *
   * Requires: factory call tracing, DI token filtering.
   */
  describe.skipIf(!submoduleAvailable)('aurelia2-froala-editor', () => {
    it('extracts froala-editor custom element', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-froala-editor'));

      // Should find FroalaEditor but NOT IFroalaConfig (which is a DI token)
      expect(result.resources).toHaveLength(1);

      const editor = result.resources[0]!;
      expect(editor.name).toBe('froala-editor');
      expect(editor.kind).toBe('custom-element');
    });

    it('identifies factory pattern configuration', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-froala-editor'));

      expect(result.configurations).toHaveLength(1);
      expect(result.configurations[0]!.exportName).toBe('FroalaConfiguration');
      expect(result.configurations[0]!.isFactory).toBe(true);
    });

    it('filters out DI interface tokens', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-froala-editor'));

      // IFroalaConfig should NOT appear as a resource
      const config = result.resources.find(r => r.name.includes('config'));
      expect(config).toBeUndefined();
    });
  });
});

// =============================================================================
// Packages with no template resources (services only)
// =============================================================================

describe('aurelia2-plugins: services only', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  describe.skipIf(!submoduleAvailable)('aurelia2-auth', () => {
    it('reports 1 resource (AuthFilterValueConverter)', async () => {
      // aurelia2-auth has one template resource: AuthFilterValueConverter
      // (the rest are services/DI infrastructure)
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-auth'));

      expect(result.resources).toHaveLength(1);

      const authFilter = result.resources[0]!;
      expect(authFilter.kind).toBe('value-converter');
      expect(authFilter.name).toBe('auth-filter');
      expect(authFilter.className).toBe('AuthFilterValueConverter');
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-cookie', () => {
    it('reports 0 resources (services only)', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-cookie'));

      expect(result.resources).toHaveLength(0);
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-google-analytics', () => {
    it('reports 0 resources (services only)', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-google-analytics'));

      expect(result.resources).toHaveLength(0);
    });
  });

  describe.skipIf(!submoduleAvailable)('aurelia2-hooks', () => {
    it('reports 0 resources (services only)', async () => {
      const result = await inspect(join(PLUGINS_ROOT, 'aurelia2-hooks'));

      expect(result.resources).toHaveLength(0);
    });
  });
});

// =============================================================================
// Aggregate validation
// =============================================================================

describe('aurelia2-plugins: aggregate', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  it.skipIf(!submoduleAvailable)('extracts resources from 8/16 packages using re-export pattern', async () => {
    const workingPackages = [
      'aurelia2-table',
      'aurelia2-google-maps',
      'aurelia2-google-places',
      'aurelia2-notification',
      'aurelia2-forms',
      'aurelia2-query',
      'aurelia2-router-extras',
      'aurelia2-storage',
    ];

    let totalResources = 0;
    for (const pkg of workingPackages) {
      const result = await inspect(join(PLUGINS_ROOT, pkg));
      totalResources += result.resources.length;
    }

    // Should find at least 13 resources across these packages:
    // table(4) + maps(1) + places(1) + notification(1) + forms(2) + query(2) + router(1) + storage(1)
    expect(totalResources).toBeGreaterThanOrEqual(13);
  });
});
