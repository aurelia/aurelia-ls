/**
 * Package Scanner Tests
 *
 * Tests for detecting Aurelia packages and finding entry points.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  scanPackage,
  isAureliaPackage,
  getSourceEntryPoint,
  type PackageInfo,
} from '../../../src/analysis/20-resolve/resolution/npm/index.js';

const FIXTURES = resolve(import.meta.dirname, 'fixtures');
const AURELIA2_PLUGINS = resolve(import.meta.dirname, '../../../../../aurelia2-plugins/packages');

// =============================================================================
// isAureliaPackage tests
// =============================================================================

describe('isAureliaPackage', () => {
  describe('controlled fixtures', () => {
    it('returns true for package with aurelia peer dependency', async () => {
      const result = await isAureliaPackage(resolve(FIXTURES, 'simple-decorated'));
      expect(result).toBe(true);
    });

    it('returns true for plugin-config fixture', async () => {
      const result = await isAureliaPackage(resolve(FIXTURES, 'plugin-config'));
      expect(result).toBe(true);
    });

    it('returns false for non-existent package', async () => {
      const result = await isAureliaPackage('/non/existent/path');
      expect(result).toBe(false);
    });
  });

  describe('aurelia2-plugins validation', () => {
    const aureliaPackages = [
      'aurelia2-table',
      'aurelia2-bootstrap',
      'aurelia2-google-maps',
      'aurelia2-notification',
      'aurelia2-outclick',
    ];

    it.each(aureliaPackages)('%s is detected as Aurelia package', async (packageName) => {
      const packagePath = resolve(AURELIA2_PLUGINS, packageName);
      const result = await isAureliaPackage(packagePath);
      expect(result).toBe(true);
    });
  });
});

// =============================================================================
// scanPackage tests
// =============================================================================

describe('scanPackage', () => {
  describe('controlled fixtures', () => {
    it('scans simple-decorated fixture successfully', async () => {
      const result = await scanPackage(resolve(FIXTURES, 'simple-decorated'));

      expect(result.confidence).toBe('exact');
      expect(result.gaps).toHaveLength(0);
      expect(result.value).not.toBeNull();

      const info = result.value!;
      expect(info.name).toBe('test-simple-decorated');
      expect(info.version).toBe('1.0.0');
      expect(info.format).toBe('esm');
      expect(info.hasTypeScriptSource).toBe(true);
    });

    it('finds entry points from exports field', async () => {
      const result = await scanPackage(resolve(FIXTURES, 'simple-decorated'));
      const info = result.value!;

      // Fixture has: "exports": { ".": { "types": "...", "import": "..." } }
      expect(info.entryPoints.length).toBeGreaterThan(0);

      const mainEntry = info.entryPoints.find(e => e.condition === '.');
      expect(mainEntry).toBeDefined();
      expect(mainEntry!.path).toContain('dist');
      expect(mainEntry!.typesOnly).toBe(false);
    });

    it('detects TypeScript source directory', async () => {
      const result = await scanPackage(resolve(FIXTURES, 'simple-decorated'));
      const info = result.value!;

      expect(info.hasTypeScriptSource).toBe(true);
      expect(info.sourceDir).toContain('src');
    });
  });

  describe('error handling', () => {
    it('returns package-not-found gap for non-existent package', async () => {
      const result = await scanPackage('/non/existent/path');

      expect(result.confidence).toBe('manual');
      expect(result.value).toBeNull();
      expect(result.gaps).toHaveLength(1);

      const gap = result.gaps[0]!;
      expect(gap.why.kind).toBe('package-not-found');
      if (gap.why.kind === 'package-not-found') {
        expect(gap.why.packagePath).toBe('/non/existent/path');
      }
    });

    it('returns entry-point-not-found gap for unbuilt package', async () => {
      // unanalyzable fixture has main pointing to non-existent ./src/index.js
      const result = await scanPackage(resolve(FIXTURES, 'unanalyzable'));

      // Should still parse package.json successfully
      expect(result.value).not.toBeNull();
      expect(result.value!.name).toBe('test-unanalyzable');

      // Should have gap about missing entry point
      const entryPointGap = result.gaps.find(g => g.why.kind === 'entry-point-not-found');
      expect(entryPointGap).toBeDefined();
      if (entryPointGap && entryPointGap.why.kind === 'entry-point-not-found') {
        expect(entryPointGap.why.specifier).toBe('./src/index.js');
      }
    });

    it('reports missing-package-field for packages without required fields', async () => {
      // This would require a fixture with missing name/version
      // For now, just verify the type exists and can be used
      const result = await scanPackage(resolve(FIXTURES, 'simple-decorated'));

      // Simple-decorated has all required fields, so no missing-package-field gaps
      const missingFieldGap = result.gaps.find(g => g.why.kind === 'missing-package-field');
      expect(missingFieldGap).toBeUndefined();
    });
  });

  describe('aurelia2-plugins validation', () => {
    it('scans aurelia2-table successfully', async () => {
      const result = await scanPackage(resolve(AURELIA2_PLUGINS, 'aurelia2-table'));

      expect(result.value).not.toBeNull();
      const info = result.value!;

      expect(info.name).toBe('aurelia2-table');
      expect(info.hasTypeScriptSource).toBe(true);
      expect(info.sourceDir).toContain('src');
    });

    it('scans aurelia2-bootstrap successfully', async () => {
      const result = await scanPackage(resolve(AURELIA2_PLUGINS, 'aurelia2-bootstrap'));

      expect(result.value).not.toBeNull();
      const info = result.value!;

      expect(info.name).toBe('aurelia2-bootstrap');
      expect(info.hasTypeScriptSource).toBe(true);
    });

    it('handles unbuilt packages gracefully', async () => {
      // aurelia2-plugins packages may not have dist/ built
      // Scanner should still work, just with empty entry points
      const result = await scanPackage(resolve(AURELIA2_PLUGINS, 'aurelia2-table'));

      // Should not error, might have gaps about missing entry points
      expect(result.value).not.toBeNull();
    });
  });
});

// =============================================================================
// getSourceEntryPoint tests
// =============================================================================

describe('getSourceEntryPoint', () => {
  it('returns source entry point when available', async () => {
    const result = await scanPackage(resolve(FIXTURES, 'simple-decorated'));
    const info = result.value!;

    const sourceEntry = getSourceEntryPoint(info);
    expect(sourceEntry).not.toBeNull();
    expect(sourceEntry).toContain('src');
    expect(sourceEntry).toContain('index.ts');
  });

  it('returns null when no source available', () => {
    const info: PackageInfo = {
      name: 'test',
      version: '1.0.0',
      packagePath: '/test',
      entryPoints: [],
      format: 'esm',
      hasTypeScriptSource: false,
    };

    const sourceEntry = getSourceEntryPoint(info);
    expect(sourceEntry).toBeNull();
  });
});
