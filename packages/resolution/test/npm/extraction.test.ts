/**
 * NPM Package Extraction Tests
 *
 * Aspirational tests describing expected behavior for npm-analysis.
 * These tests define success criteria from npm-analysis-impl-plan.md.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  analyzePackage,
  type AnalysisResult,
  type PackageAnalysis,
} from '../../src/npm/index.js';

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
      expect(tooltip.kind).toBe('custom-attribute');
      expect(tooltip.name).toBe('tooltip');
      expect(tooltip.className).toBe('TooltipCustomAttribute');

      // Verify bindables
      expect(tooltip.bindables).toHaveLength(3);

      const content = tooltip.bindables.find(b => b.name === 'content');
      expect(content).toBeDefined();
      expect(content!.primary).toBe(true);

      const position = tooltip.bindables.find(b => b.name === 'position');
      expect(position).toBeDefined();
      expect(position!.primary).toBeFalsy();

      const visible = tooltip.bindables.find(b => b.name === 'visible');
      expect(visible).toBeDefined();
    });

    it('extracts from ES2022 compiled output', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      // ES2022 decorators preserve metadata - should still be high confidence
      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);

      const tooltip = result.value.resources[0]!;
      expect(tooltip.name).toBe('tooltip');

      // Should still find primary bindable from decorator call
      const content = tooltip.bindables.find(b => b.name === 'content');
      expect(content?.primary).toBe(true);
    });

    it('detects package as Aurelia-related', async () => {
      const { isAureliaPackage } = await import('../../src/npm/index.js');
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

      const names = result.value.resources.map(r => r.name).sort();
      expect(names).toEqual(['action-button', 'info-card']);
    });

    it('extracts resources from nested barrel directories', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // ActionButton
      const actionButton = result.value.resources.find(r => r.name === 'action-button');
      expect(actionButton).toBeDefined();
      expect(actionButton!.kind).toBe('custom-element');
      expect(actionButton!.className).toBe('ActionButton');
      expect(actionButton!.bindables).toHaveLength(2);
      expect(actionButton!.bindables.map(b => b.name).sort()).toEqual(['disabled', 'label']);

      // InfoCard
      const infoCard = result.value.resources.find(r => r.name === 'info-card');
      expect(infoCard).toBeDefined();
      expect(infoCard!.kind).toBe('custom-element');
      expect(infoCard!.className).toBe('InfoCard');
      expect(infoCard!.bindables).toHaveLength(2);
      expect(infoCard!.bindables.map(b => b.name).sort()).toEqual(['content', 'title']);
    });

    it('follows the full import chain', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // The chain is: src/index.ts → src/components/index.ts → src/components/*.ts
      // If both resources were found, the full chain was followed
      expect(result.value.resources).toHaveLength(2);
      expect(result.confidence).toBe('high');

      // Source files should be in the components directory (proves chain was followed)
      const sources = result.value.resources.map(r => r.source);
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

      const names = result.value.resources.map(r => r.name).sort();
      expect(names).toEqual(['highlight', 'user-card']);
    });

    it('associates bindables with correct class', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      // UserCard should have name and avatar bindables
      const userCard = result.value.resources.find(r => r.name === 'user-card');
      expect(userCard).toBeDefined();
      expect(userCard!.className).toBe('UserCard');
      expect(userCard!.kind).toBe('custom-element');
      expect(userCard!.bindables).toHaveLength(2);
      expect(userCard!.bindables.map(b => b.name).sort()).toEqual(['avatar', 'name']);

      // HighlightAttribute should have color bindable (with primary: true)
      const highlight = result.value.resources.find(r => r.name === 'highlight');
      expect(highlight).toBeDefined();
      expect(highlight!.className).toBe('HighlightAttribute');
      expect(highlight!.kind).toBe('custom-attribute');
      expect(highlight!.bindables).toHaveLength(1);
      expect(highlight!.bindables[0]!.name).toBe('color');
      expect(highlight!.bindables[0]!.primary).toBe(true);
    });

    it('TypeScript extraction also works with multi-class files', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // Should find the same resources from TypeScript source
      expect(result.value.resources).toHaveLength(2);
      const names = result.value.resources.map(r => r.name).sort();
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

      const names = result.value.resources.map(r => r.name).sort();
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

      const dataGrid = result.value.resources.find(r => r.name === 'data-grid');
      expect(dataGrid).toBeDefined();

      // Should have 4 bindables
      expect(dataGrid!.bindables).toHaveLength(4);

      // 'data' should be two-way
      const data = dataGrid!.bindables.find(b => b.name === 'data');
      expect(data).toBeDefined();
      // BindingMode.twoWay = 6 in Aurelia
      expect(data!.mode).toBeDefined();

      // grid-sort should have primary bindable
      const gridSort = result.value.resources.find(r => r.name === 'grid-sort');
      const key = gridSort!.bindables.find(b => b.name === 'key');
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

      const names = result.value.resources.map(r => r.name).sort();
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
      const modal = result.value.resources.find(r => r.name === 'modal');
      expect(modal).toBeDefined();
      expect(modal!.kind).toBe('custom-element');
      expect(modal!.className).toBe('ModalCustomElement');
      expect(modal!.bindables).toHaveLength(3);
      expect(modal!.bindables.map(b => b.name).sort()).toEqual(['isOpen', 'size', 'title']);

      // Custom attribute
      const tooltip = result.value.resources.find(r => r.name === 'tooltip');
      expect(tooltip).toBeDefined();
      expect(tooltip!.kind).toBe('custom-attribute');
      expect(tooltip!.className).toBe('TooltipCustomAttribute');
      expect(tooltip!.bindables).toHaveLength(2);
      const primaryBindable = tooltip!.bindables.find(b => b.primary);
      expect(primaryBindable?.name).toBe('text');

      // Value converter
      const currency = result.value.resources.find(r => r.name === 'currency');
      expect(currency).toBeDefined();
      expect(currency!.kind).toBe('value-converter');
      expect(currency!.className).toBe('CurrencyValueConverter');
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

      const names = result.value.resources.map(r => r.name).sort();
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
      const card = result.value.resources.find(r => r.name === 'card');
      expect(card).toBeDefined();
      expect(card!.kind).toBe('custom-element');
      expect(card!.className).toBe('CardCustomElement');
      expect(card!.bindables).toHaveLength(3);
      expect(card!.bindables.map(b => b.name).sort()).toEqual(['subtitle', 'title', 'variant']);

      const badge = result.value.resources.find(r => r.name === 'badge');
      expect(badge).toBeDefined();
      expect(badge!.kind).toBe('custom-element');
      expect(badge!.className).toBe('BadgeCustomElement');
      expect(badge!.bindables).toHaveLength(2);
      const primaryBadge = badge!.bindables.find(b => b.primary);
      expect(primaryBadge?.name).toBe('value');

      // Custom attribute
      const icon = result.value.resources.find(r => r.name === 'icon');
      expect(icon).toBeDefined();
      expect(icon!.kind).toBe('custom-attribute');
      expect(icon!.className).toBe('IconCustomAttribute');
      expect(icon!.bindables).toHaveLength(2);
      const primaryIcon = icon!.bindables.find(b => b.primary);
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

      const names = result.value.resources.map(r => r.name).sort();
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
      const widget = result.value.resources.find(r => r.name === 'my-widget');
      expect(widget).toBeDefined();
      expect(widget!.kind).toBe('custom-element');
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
      expect(result.value.resources[0]!.source.endsWith('.ts')).toBe(true);
    });

    it('uses ES2022 when preferSource is false', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);
      // ES2022 path should use a .js source file
      expect(result.value.resources[0]!.source.endsWith('.js')).toBe(true);
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
      expect(tsTooltip.name).toBe(es2022Tooltip.name);
      expect(tsTooltip.className).toBe(es2022Tooltip.className);
      expect(tsTooltip.kind).toBe(es2022Tooltip.kind);

      // Same bindables discovered
      expect(tsTooltip.bindables.length).toBe(es2022Tooltip.bindables.length);
    });

    it('deduplicates resources by className when strategies overlap', async () => {
      // When both strategies run and find the same class,
      // the orchestrator should deduplicate to avoid duplicates
      const result = await analyzePackage(fixturePath);

      // Should have exactly 1 tooltip, not 2
      expect(result.value.resources).toHaveLength(1);
      expect(result.value.resources[0]!.className).toBe('TooltipCustomAttribute');
    });

    it('follows re-export chains in TypeScript source', async () => {
      // The simple-decorated fixture uses re-exports:
      // index.ts → tooltip.ts
      // The orchestrator should follow this chain
      const result = await analyzePackage(fixturePath, { preferSource: true });

      // Should find the tooltip despite it being re-exported
      expect(result.value.resources).toHaveLength(1);
      expect(result.value.resources[0]!.name).toBe('tooltip');

      // Source should reference the actual file, not the entry point
      expect(result.value.resources[0]!.source).toContain('tooltip');
    });

    it('follows re-export chains in ES2022 compiled output', async () => {
      // Same test for ES2022 path
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.value.resources).toHaveLength(1);
      expect(result.value.resources[0]!.name).toBe('tooltip');
      expect(result.value.resources[0]!.source).toContain('tooltip');
    });
  });
});

// ===========================================================================
// Real-world validation (skip by default, run manually)
// ===========================================================================

describe.skip('real-world validation', () => {
  const AURELIA2_PLUGINS = resolve(import.meta.dirname, '../../../../aurelia2-plugins/packages');

  it('aurelia2-table extracts correctly', async () => {
    const result = await analyzePackage(resolve(AURELIA2_PLUGINS, 'aurelia2-table'));

    expect(result.confidence).toBeOneOf(['exact', 'high']);
    expect(result.value.resources).toHaveLength(4);

    const names = result.value.resources.map(r => r.name).sort();
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

    const googleMap = result.value.resources.find(r => r.name === 'google-map');
    expect(googleMap).toBeDefined();

    // Should handle 20+ bindables
    expect(googleMap!.bindables.length).toBeGreaterThanOrEqual(20);
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
