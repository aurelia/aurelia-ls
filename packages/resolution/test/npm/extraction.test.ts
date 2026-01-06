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
  type ExtractedResource,
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

      // At least one gap should be about dynamic registration
      const dynamicGap = result.gaps.find(
        g => g.why.kind === 'dynamic-value' || g.why.kind === 'function-return'
      );
      expect(dynamicGap).toBeDefined();

      // Suggestion should mention explicit config
      expect(dynamicGap!.suggestion).toMatch(/thirdParty|explicit|manual/i);
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
      // TypeScript path uses 'typescript' format in source evidence
      expect(result.value.resources[0]!.source.format).toBe('typescript');
    });

    it('uses ES2022 when preferSource is false', async () => {
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.confidence).toBe('high');
      expect(result.value.resources).toHaveLength(1);
      // ES2022 path uses 'javascript' format in source evidence
      expect(result.value.resources[0]!.source.format).toBe('javascript');
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
      expect(result.value.resources[0]!.source.file).toContain('tooltip');
    });

    it('follows re-export chains in ES2022 compiled output', async () => {
      // Same test for ES2022 path
      const result = await analyzePackage(fixturePath, { preferSource: false });

      expect(result.value.resources).toHaveLength(1);
      expect(result.value.resources[0]!.name).toBe('tooltip');
      expect(result.value.resources[0]!.source.file).toContain('tooltip');
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
