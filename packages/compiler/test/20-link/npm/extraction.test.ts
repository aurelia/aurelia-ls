/**
 * NPM Package Extraction Tests
 *
 * Aspirational tests describing expected behavior for npm-analysis.
 * These tests define success criteria from npm-analysis-impl-plan.md.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import type { AnalysisResult, PackageAnalysis } from '../../../src/analysis/20-link/resolution/npm/index.js';
import { analyzePackageCached as analyzePackage } from '../_helpers/npm-analysis-cache.js';
import {
  resourceBindables,
  resourceClassName,
  resourceKind,
  resourceName,
  resourceSource,
} from './resource-helpers.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');

describe('npm extraction', () => {
  // ===========================================================================
  // Phase 1: Direct decorated exports
  // ===========================================================================

  describe('simple-decorated fixture', () => {
    const fixturePath = resolve(FIXTURES, 'simple-decorated');

    it('extracts from TypeScript source', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      expect(result.confidence).toBe('high');
      expect(result.gaps).toHaveLength(0);
      expect(result.value.resources).toHaveLength(1);

      const tooltip = result.value.resources[0]!;
      expect(resourceKind(tooltip)).toBe('custom-attribute');
      expect(resourceName(tooltip)).toBe('tooltip');
      expect(resourceClassName(tooltip)).toBe('TooltipCustomAttribute');

      // Verify bindables
      const bindables = resourceBindables(tooltip);
      expect(bindables).toHaveLength(3);

      const content = bindables.find(b => b.name === 'content');
      expect(content).toBeDefined();
      expect(content!.primary).toBe(true);

      const position = bindables.find(b => b.name === 'position');
      expect(position).toBeDefined();
      expect(position!.primary).toBeFalsy();

      const visible = bindables.find(b => b.name === 'visible');
      expect(visible).toBeDefined();
    });

    it('extracts from ES2022 compiled output', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      // ES2022 decorators preserve metadata - should still be high confidence
      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);

      const tooltip = result.value.resources[0]!;
      expect(resourceName(tooltip)).toBe('tooltip');

      // Should still find primary bindable from decorator call
      const content = resourceBindables(tooltip).find(b => b.name === 'content');
      expect(content?.primary).toBe(true);
    });

    it('detects package as Aurelia-related', async () => {
      const { isAureliaPackage } = await import('../../../src/analysis/20-link/resolution/npm/index.js');
      const result = await isAureliaPackage(fixturePath);
      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // Directory index resolution (Q17)
  // ===========================================================================

  describe('barrel-directory fixture', () => {
    const fixturePath = resolve(FIXTURES, 'barrel-directory');

    it('resolves directory imports to index.ts', async () => {
      // This tests Q17: export * from './components' where ./components is a directory
      const result = await analyzePackage(fixturePath, { preferSource: true });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(2);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['action-button', 'info-card']);
    });

    it('extracts resources from nested barrel directories', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // ActionButton
      const actionButton = result.value.resources.find((r) => resourceName(r) === 'action-button');
      expect(actionButton).toBeDefined();
      expect(resourceKind(actionButton!)).toBe('custom-element');
      expect(resourceClassName(actionButton!)).toBe('ActionButton');
      const actionBindables = resourceBindables(actionButton!);
      expect(actionBindables).toHaveLength(2);
      expect(actionBindables.map(b => b.name).sort()).toEqual(['disabled', 'label']);

      // InfoCard
      const infoCard = result.value.resources.find((r) => resourceName(r) === 'info-card');
      expect(infoCard).toBeDefined();
      expect(resourceKind(infoCard!)).toBe('custom-element');
      expect(resourceClassName(infoCard!)).toBe('InfoCard');
      const infoBindables = resourceBindables(infoCard!);
      expect(infoBindables).toHaveLength(2);
      expect(infoBindables.map(b => b.name).sort()).toEqual(['content', 'title']);
    });

    it('follows the full import chain', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // The chain is: src/index.ts → src/components/index.ts → src/components/*.ts
      // If both resources were found, the full chain was followed
      expect(result.value.resources).toHaveLength(2);
      expect(result.confidence).toBe('high');

      // Source files should be in the components directory (proves chain was followed)
      const sources = result.value.resources.map(resourceSource);
      expect(sources.every(s => s.includes('components'))).toBe(true);
    });
  });

  // ===========================================================================
  // Multi-class files (Q14)
  // ===========================================================================

  describe('multi-class fixture', () => {
    const fixturePath = resolve(FIXTURES, 'multi-class');

    it('extracts all resources from multi-class ES2022 file', async () => {
      // This tests Q14: ES2022 field association should work with multiple classes
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(2);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['highlight', 'user-card']);
    });

    it('associates bindables with correct class', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      // UserCard should have name and avatar bindables
      const userCard = result.value.resources.find((r) => resourceName(r) === 'user-card');
      expect(userCard).toBeDefined();
      expect(resourceClassName(userCard!)).toBe('UserCard');
      expect(resourceKind(userCard!)).toBe('custom-element');
      const userBindables = resourceBindables(userCard!);
      expect(userBindables).toHaveLength(2);
      expect(userBindables.map(b => b.name).sort()).toEqual(['avatar', 'name']);

      // HighlightAttribute should have color bindable (with primary: true)
      const highlight = result.value.resources.find((r) => resourceName(r) === 'highlight');
      expect(highlight).toBeDefined();
      expect(resourceClassName(highlight!)).toBe('HighlightAttribute');
      expect(resourceKind(highlight!)).toBe('custom-attribute');
      const highlightBindables = resourceBindables(highlight!);
      expect(highlightBindables).toHaveLength(1);
      expect(highlightBindables[0]!.name).toBe('color');
      expect(highlightBindables[0]!.primary).toBe(true);
    });

    it('TypeScript extraction also works with multi-class files', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // Should find the same resources from TypeScript source
      expect(result.value.resources).toHaveLength(2);
      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['highlight', 'user-card']);
    });
  });

  // ===========================================================================
  // Phase 2: Plugin configuration pattern
  // ===========================================================================

  describe('plugin-config fixture', () => {
    const fixturePath = resolve(FIXTURES, 'plugin-config');

    it('traces register() body to find resources', async () => {
      const result = await analyzePackage(fixturePath);

      expect(result.confidence).toBeOneOf(['exact', 'high']);
      expect(result.value.resources).toHaveLength(2);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['data-grid', 'grid-sort']);
    });

    it('extracts configuration export', async () => {
      const result = await analyzePackage(fixturePath);

      expect(result.value.configurations).toHaveLength(1);
      expect(result.value.configurations[0]!.exportName).toBe('GridConfiguration');
      expect(result.value.configurations[0]!.isFactory).toBe(false);
    });

    it('extracts bindables with binding modes', async () => {
      const result = await analyzePackage(fixturePath);

      const dataGrid = result.value.resources.find((r) => resourceName(r) === 'data-grid');
      expect(dataGrid).toBeDefined();

      // Should have 4 bindables
      const dataBindables = resourceBindables(dataGrid!);
      expect(dataBindables).toHaveLength(4);

      // 'data' should be two-way
      const data = dataBindables.find(b => b.name === 'data');
      expect(data).toBeDefined();
      // BindingMode.twoWay = 6 in Aurelia
      expect(data!.mode).toBeDefined();

      // grid-sort should have primary bindable
      const gridSort = result.value.resources.find((r) => resourceName(r) === 'grid-sort');
      const key = resourceBindables(gridSort!).find(b => b.name === 'key');
      expect(key?.primary).toBe(true);
    });

    it('links configuration to registered resources', async () => {
      const result = await analyzePackage(fixturePath);

      const config = result.value.configurations[0]!;
      expect(config.registers).toHaveLength(2);
      expect(config.registers.every(r => r.resolved)).toBe(true);
    });
  });

  // ===========================================================================
  // Phase 3: Factory configuration pattern
  // ===========================================================================

  describe('factory-config fixture', () => {
    const fixturePath = resolve(FIXTURES, 'factory-config');

    it('detects factory pattern and extracts resources', async () => {
      const result = await analyzePackage(fixturePath);

      expect(result.confidence).toBeOneOf(['exact', 'high']);
      expect(result.value.resources).toHaveLength(3);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['currency', 'modal', 'tooltip']);
    });

    it('marks configuration as factory-created', async () => {
      const result = await analyzePackage(fixturePath);

      expect(result.value.configurations).toHaveLength(1);
      expect(result.value.configurations[0]!.exportName).toBe('ModalConfiguration');
      expect(result.value.configurations[0]!.isFactory).toBe(true);
    });

    it('extracts all resource types', async () => {
      const result = await analyzePackage(fixturePath);

      // Custom element
      const modal = result.value.resources.find((r) => resourceName(r) === 'modal');
      expect(modal).toBeDefined();
      expect(resourceKind(modal!)).toBe('custom-element');
      expect(resourceClassName(modal!)).toBe('ModalCustomElement');
      const modalBindables = resourceBindables(modal!);
      expect(modalBindables).toHaveLength(3);
      expect(modalBindables.map(b => b.name).sort()).toEqual(['isOpen', 'size', 'title']);

      // Custom attribute
      const tooltip = result.value.resources.find((r) => resourceName(r) === 'tooltip');
      expect(tooltip).toBeDefined();
      expect(resourceKind(tooltip!)).toBe('custom-attribute');
      expect(resourceClassName(tooltip!)).toBe('TooltipCustomAttribute');
      const tooltipBindables = resourceBindables(tooltip!);
      expect(tooltipBindables).toHaveLength(2);
      const primaryBindable = tooltipBindables.find(b => b.primary);
      expect(primaryBindable?.name).toBe('text');

      // Value converter
      const currency = result.value.resources.find((r) => resourceName(r) === 'currency');
      expect(currency).toBeDefined();
      expect(resourceKind(currency!)).toBe('value-converter');
      expect(resourceClassName(currency!)).toBe('CurrencyValueConverter');
    });

    it('links factory configuration to registered resources', async () => {
      const result = await analyzePackage(fixturePath);

      const config = result.value.configurations[0]!;
      expect(config.registers).toHaveLength(3);
      expect(config.registers.every(r => r.resolved)).toBe(true);
    });
  });

  // ===========================================================================
  // Phase 3: Function-local spread targets (WP 3.2)
  // ===========================================================================

  describe('local-spread fixture', () => {
    const fixturePath = resolve(FIXTURES, 'local-spread');

    it('resolves function-local array spread', async () => {
      // This is the key WP 3.2 test case:
      // The `components` array is defined INSIDE the factory function,
      // not at module level. The enhancement in scope.ts collects block
      // bindings to make this resolvable.
      const result = await analyzePackage(fixturePath);

      expect(result.confidence).toBeOneOf(['exact', 'high']);
      expect(result.value.resources).toHaveLength(3);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toEqual(['badge', 'card', 'icon']);
    });

    it('marks configuration as factory-created', async () => {
      const result = await analyzePackage(fixturePath);

      expect(result.value.configurations).toHaveLength(1);
      expect(result.value.configurations[0]!.exportName).toBe('PluginConfiguration');
      expect(result.value.configurations[0]!.isFactory).toBe(true);
    });

    it('extracts resources with correct metadata', async () => {
      const result = await analyzePackage(fixturePath);

      // Custom elements
      const card = result.value.resources.find((r) => resourceName(r) === 'card');
      expect(card).toBeDefined();
      expect(resourceKind(card!)).toBe('custom-element');
      expect(resourceClassName(card!)).toBe('CardCustomElement');
      const cardBindables = resourceBindables(card!);
      expect(cardBindables).toHaveLength(3);
      expect(cardBindables.map(b => b.name).sort()).toEqual(['subtitle', 'title', 'variant']);

      const badge = result.value.resources.find((r) => resourceName(r) === 'badge');
      expect(badge).toBeDefined();
      expect(resourceKind(badge!)).toBe('custom-element');
      expect(resourceClassName(badge!)).toBe('BadgeCustomElement');
      const badgeBindables = resourceBindables(badge!);
      expect(badgeBindables).toHaveLength(2);
      const primaryBadge = badgeBindables.find(b => b.primary);
      expect(primaryBadge?.name).toBe('value');

      // Custom attribute
      const icon = result.value.resources.find((r) => resourceName(r) === 'icon');
      expect(icon).toBeDefined();
      expect(resourceKind(icon!)).toBe('custom-attribute');
      expect(resourceClassName(icon!)).toBe('IconCustomAttribute');
      const iconBindables = resourceBindables(icon!);
      expect(iconBindables).toHaveLength(2);
      const primaryIcon = iconBindables.find(b => b.primary);
      expect(primaryIcon?.name).toBe('name');
    });

    it('links configuration to all registered resources', async () => {
      const result = await analyzePackage(fixturePath);

      const config = result.value.configurations[0]!;
      expect(config.registers).toHaveLength(3);
      expect(config.registers.every(r => r.resolved)).toBe(true);
    });
  });

  // ===========================================================================
  // Edge case: Factory using runtime arguments
  // ===========================================================================

  describe('factory-arguments fixture', () => {
    const fixturePath = resolve(FIXTURES, 'factory-arguments');

    it('reports gap for conditional registration based on runtime arguments', async () => {
      const result = await analyzePackage(fixturePath);

      // The factory uses `options.useAdvanced` which is a runtime value
      // This creates a ternary that we cannot statically evaluate
      // Expected: gap reported for the conditional expression

      // We should get some resources (the ones that can be traced)
      // and potentially gaps for the conditional parts
      expect(result.gaps.length).toBeGreaterThan(0);

      // Should find at least one gap related to conditional or dynamic value
      const relevantGap = result.gaps.find(
        g => g.why.kind === 'conditional-registration' ||
             g.why.kind === 'dynamic-value' ||
             g.why.kind === 'spread-unknown'
      );
      expect(relevantGap).toBeDefined();
    });

    it('extracts directly exported resources even when factory has gaps', async () => {
      const result = await analyzePackage(fixturePath);

      // BasicElement and AdvancedElement are directly exported from index.ts
      // They should be found even if the configuration analysis has gaps
      expect(result.value.resources.length).toBeGreaterThanOrEqual(2);

      const names = result.value.resources.map(resourceName).sort();
      expect(names).toContain('advanced-element');
      expect(names).toContain('basic-element');
    });
  });

  // ===========================================================================
  // Edge case: Nested factory calls
  // ===========================================================================

  describe('nested-factory fixture', () => {
    const fixturePath = resolve(FIXTURES, 'nested-factory');

    it('extracts resources from nested factory pattern', async () => {
      const result = await analyzePackage(fixturePath);

      // The nested factory pattern:
      // createPluginConfig() calls createBaseConfig() which registers MyWidget
      // We should either:
      // 1. Successfully trace through and find MyWidget, OR
      // 2. Report a gap explaining the nested factory limitation

      // At minimum, MyWidget should be found via direct export
      const widget = result.value.resources.find((r) => resourceName(r) === 'my-widget');
      expect(widget).toBeDefined();
      expect(resourceKind(widget!)).toBe('custom-element');
    });

    it('identifies configuration from nested factory', async () => {
      const result = await analyzePackage(fixturePath);

      // Should detect PluginConfiguration as a factory-created config
      expect(result.value.configurations).toHaveLength(1);
      expect(result.value.configurations[0]!.exportName).toBe('PluginConfiguration');
      expect(result.value.configurations[0]!.isFactory).toBe(true);
    });
  });

  // ===========================================================================
  // Graceful degradation
  // ===========================================================================

  describe('unanalyzable fixture', () => {
    const fixturePath = resolve(FIXTURES, 'unanalyzable');

    it('reports gap with actionable suggestion', async () => {
      const result = await analyzePackage(fixturePath);

      // Should degrade gracefully, not throw
      expect(result.confidence).toBe('manual');

      // Should have gaps explaining the problem
      expect(result.gaps.length).toBeGreaterThan(0);

      // At least one gap should be about unanalyzable registration patterns.
      // The fixture contains:
      // - `resources.forEach(r => container.register(r))` - loop pattern
      // - `if (process.env.ENABLE_EXTRAS) { ... }` - conditional registration
      // These produce 'conditional-registration' or 'loop-variable' gaps
      const analysisGap = result.gaps.find(
        g => g.why.kind === 'dynamic-value' ||
             g.why.kind === 'function-return' ||
             g.why.kind === 'conditional-registration' ||
             g.why.kind === 'loop-variable'
      );
      expect(analysisGap).toBeDefined();

      // Gap should have an actionable suggestion
      expect(analysisGap!.suggestion).toBeDefined();
    });

    it('includes location information in gaps', async () => {
      const result = await analyzePackage(fixturePath);

      const gapWithLocation = result.gaps.find(g => g.where !== undefined);
      if (gapWithLocation) {
        expect(gapWithLocation.where!.file).toContain('index');
      }
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('handles non-existent package gracefully', async () => {
      const result = await analyzePackage('/non/existent/path');

      expect(result.confidence).toBe('manual');
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('handles package without Aurelia dependencies', async () => {
      // A package.json exists but no Aurelia resources
      // Should return empty resources, not error
    });
  });

  // ===========================================================================
  // Orchestrator behavior (WP 1.5)
  // ===========================================================================

  describe('orchestrator behavior', () => {
    const fixturePath = resolve(FIXTURES, 'simple-decorated');

    it('uses TypeScript source when preferSource is true (default)', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);
      // TypeScript path should use a .ts source file
      expect(resourceSource(result.value.resources[0]!).endsWith('.ts')).toBe(true);
    });

    it('uses ES2022 when preferSource is false', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);
      // ES2022 path should use a .js source file
      expect(resourceSource(result.value.resources[0]!).endsWith('.js')).toBe(true);
    });

    it('both strategies find the same resource', async () => {
      const tsResult = await analyzePackage(fixturePath, { preferSource: true });
      const es2022Result = await analyzePackage(fixturePath, { preferSource: false });

      // Both should find the tooltip resource
      expect(tsResult.value.resources).toHaveLength(1);
      expect(es2022Result.value.resources).toHaveLength(1);

      const tsTooltip = tsResult.value.resources[0]!;
      const es2022Tooltip = es2022Result.value.resources[0]!;

      // Same resource identity
      expect(resourceName(tsTooltip)).toBe(resourceName(es2022Tooltip));
      expect(resourceClassName(tsTooltip)).toBe(resourceClassName(es2022Tooltip));
      expect(resourceKind(tsTooltip)).toBe(resourceKind(es2022Tooltip));

      // Same bindables discovered
      expect(resourceBindables(tsTooltip).length).toBe(resourceBindables(es2022Tooltip).length);
    });

    it('deduplicates resources by className when strategies overlap', async () => {
      // When both strategies run and find the same class,
      // the orchestrator should deduplicate to avoid duplicates
      const result = await analyzePackage(fixturePath);

      // Should have exactly 1 tooltip, not 2
      expect(result.value.resources).toHaveLength(1);
      expect(resourceClassName(result.value.resources[0]!)).toBe('TooltipCustomAttribute');
    });

    it('follows re-export chains in TypeScript source', async () => {
      // The simple-decorated fixture uses re-exports:
      // index.ts → tooltip.ts
      // The orchestrator should follow this chain
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // Should find the tooltip despite it being re-exported
      expect(result.value.resources).toHaveLength(1);
      expect(resourceName(result.value.resources[0]!)).toBe('tooltip');

      // Source should reference the actual file, not the entry point
      expect(resourceSource(result.value.resources[0]!)).toContain('tooltip');
    });

    it('follows re-export chains in ES2022 compiled output', async () => {
      // Same test for ES2022 path
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.value.resources).toHaveLength(1);
      expect(resourceName(result.value.resources[0]!)).toBe('tooltip');
      expect(resourceSource(result.value.resources[0]!)).toContain('tooltip');
    });
  });
});

// ===========================================================================
// Real-world validation (skip by default, run manually)
// ===========================================================================

describe.skip('real-world validation', () => {
  const AURELIA2_PLUGINS = resolve(import.meta.dirname, '../../../../../aurelia2-plugins/packages');

  it('aurelia2-table extracts correctly', async () => {
    const result = await analyzePackage(resolve(AURELIA2_PLUGINS, 'aurelia2-table'));

    expect(result.confidence).toBeOneOf(['exact', 'high']);
    expect(result.value.resources).toHaveLength(4);

    const names = result.value.resources.map(resourceName).sort();
    expect(names).toContain('aurelia-table');
    expect(names).toContain('aut-sort');
  });

  it('aurelia2-bootstrap extracts with conventions', async () => {
    const result = await analyzePackage(resolve(AURELIA2_PLUGINS, 'aurelia2-bootstrap'));

    // Bootstrap has 22 components, many use convention naming
    expect(result.value.resources.length).toBeGreaterThanOrEqual(20);

    // Should detect factory pattern
    const config = result.value.configurations[0];
    expect(config?.isFactory).toBe(true);
  });

  it('aurelia2-google-maps handles large component', async () => {
    const result = await analyzePackage(resolve(AURELIA2_PLUGINS, 'aurelia2-google-maps'));

    const googleMap = result.value.resources.find((r) => resourceName(r) === 'google-map');
    expect(googleMap).toBeDefined();

    // Should handle 20+ bindables
    expect(resourceBindables(googleMap!).length).toBeGreaterThanOrEqual(20);
  });
});

// ===========================================================================
// Helpers
// ===========================================================================

// Custom matcher for confidence levels
expect.extend({
  toBeOneOf(received: unknown, expected: unknown[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});

declare module 'vitest' {
  interface Assertion {
    toBeOneOf(expected: unknown[]): void;
  }
}
