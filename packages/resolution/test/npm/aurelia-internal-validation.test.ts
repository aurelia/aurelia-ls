/**
 * Aurelia Internal Package Validation Tests
 *
 * Real-world validation against the Aurelia 2 monorepo submodule.
 * Tests cross-package import resolution within a monorepo context.
 *
 * Run with: npm run test:resolution -- --test-name-pattern "aurelia-internal"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { inspect, type InspectionResult, detectMonorepo } from '../../src/npm/index.js';

// Path to aurelia submodule
const AURELIA_ROOT = resolve(import.meta.dirname, '../../../../aurelia');
const AURELIA_PACKAGES = join(AURELIA_ROOT, 'packages');

/**
 * Check if submodule is available and built.
 * The aurelia submodule needs to have its packages built (have src/ directories).
 */
function checkSubmoduleAvailable(): boolean {
  const rootExists = existsSync(AURELIA_ROOT);
  const packagesExist = existsSync(AURELIA_PACKAGES);
  const kernelSrcExists = existsSync(join(AURELIA_PACKAGES, 'kernel/src/index.ts'));
  return rootExists && packagesExist && kernelSrcExists;
}

// =============================================================================
// Monorepo Detection Tests
// =============================================================================

describe('aurelia-internal: monorepo detection', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  it.skipIf(!submoduleAvailable)('detects aurelia monorepo from i18n package', async () => {
    const ctx = await detectMonorepo(join(AURELIA_PACKAGES, 'i18n'));
    expect(ctx).not.toBeNull();
    expect(ctx!.root).toBe(AURELIA_ROOT);

    // Should have detected workspace packages
    expect(ctx!.packages.size).toBeGreaterThan(10);

    // Key packages should be present
    expect(ctx!.packages.has('@aurelia/kernel')).toBe(true);
    expect(ctx!.packages.has('@aurelia/runtime')).toBe(true);
    expect(ctx!.packages.has('@aurelia/runtime-html')).toBe(true);
    expect(ctx!.packages.has('@aurelia/i18n')).toBe(true);
  });

  it.skipIf(!submoduleAvailable)('maps packages to source directories', async () => {
    const ctx = await detectMonorepo(join(AURELIA_PACKAGES, 'kernel'));
    expect(ctx).not.toBeNull();

    const kernel = ctx!.packages.get('@aurelia/kernel');
    expect(kernel).toBeDefined();
    expect(kernel!.srcDir).toBe(join(AURELIA_PACKAGES, 'kernel/src'));

    const runtime = ctx!.packages.get('@aurelia/runtime');
    expect(runtime).toBeDefined();
    expect(runtime!.srcDir).toBe(join(AURELIA_PACKAGES, 'runtime/src'));
  });
});

// =============================================================================
// Cross-Package Resolution Tests
// =============================================================================

describe('aurelia-internal: @aurelia/i18n analysis', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'i18n'));
    }
  });

  it.skipIf(!submoduleAvailable)('discovers files from workspace sibling packages', async () => {
    // i18n imports from @aurelia/kernel, @aurelia/runtime, @aurelia/runtime-html
    // With monorepo support, these should be followed and included in analysis
    expect(result).toBeDefined();

    // Check that gaps don't include cross-package import failures for workspace packages
    const crossPackageGaps = result.gaps.filter(g =>
      g.why.includes('@aurelia/kernel') ||
      g.why.includes('@aurelia/runtime') ||
      g.why.includes('@aurelia/runtime-html')
    );

    // With monorepo support, we should have fewer gaps about workspace packages
    // (some may remain if there are complex re-export chains or type-only imports)
    expect(crossPackageGaps.length).toBeLessThan(10);
  });

  it.skipIf(!submoduleAvailable)('extracts i18n resources', async () => {
    // i18n provides: value converters, binding behaviors, custom attributes
    // Note: The actual resource names like 't' come from variable references
    // (e.g., ValueConverters.translationValueConverterName) which require
    // partial evaluation (Phase 2/3). Convention resolver finds them by class name.
    expect(result.resources.length).toBeGreaterThan(0);

    // Check for known i18n resources (by class name pattern, not final name)
    // The classes are TranslationBindingBehavior → 'translation' via convention
    const hasTranslationBehavior = result.resources.some(r =>
      r.kind === 'binding-behavior' && r.className === 'TranslationBindingBehavior'
    );
    expect(hasTranslationBehavior).toBe(true);

    // TranslationValueConverter
    const hasTranslationConverter = result.resources.some(r =>
      r.kind === 'value-converter' && r.className === 'TranslationValueConverter'
    );
    expect(hasTranslationConverter).toBe(true);

    // DateFormatValueConverter
    const hasDateFormat = result.resources.some(r =>
      r.kind === 'value-converter' && r.className === 'DateFormatValueConverter'
    );
    expect(hasDateFormat).toBe(true);
  });

  it.skipIf(!submoduleAvailable)('discovers resources from workspace sibling packages', async () => {
    // Key verification: monorepo resolution should discover resources from
    // @aurelia/runtime-html which i18n imports. These are NOT defined in i18n.
    // Finding them proves cross-package file discovery works.

    // else is from @aurelia/runtime-html (template controller)
    const hasElse = result.resources.some(r =>
      r.kind === 'custom-attribute' && r.className === 'Else'
    );
    expect(hasElse).toBe(true);

    // promise template controller is from @aurelia/runtime-html
    const hasPromise = result.resources.some(r =>
      r.className === 'PromiseTemplateController'
    );
    expect(hasPromise).toBe(true);

    // sanitize value converter is from @aurelia/runtime-html
    const hasSanitize = result.resources.some(r =>
      r.kind === 'value-converter' && r.className === 'SanitizeValueConverter'
    );
    expect(hasSanitize).toBe(true);
  });

  it.skipIf(!submoduleAvailable)('achieves reasonable confidence', async () => {
    // With full monorepo resolution, we should achieve at least partial confidence
    // (not 'manual' which means analysis failed)
    expect(result.confidence).not.toBe('manual');
  });
});

describe('aurelia-internal: @aurelia/router analysis', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'router'));
    }
  });

  it.skipIf(!submoduleAvailable)('extracts router resources', async () => {
    expect(result).toBeDefined();
    expect(result.resources.length).toBeGreaterThan(0);

    // Check for known router resources
    const hasViewport = result.resources.some(r =>
      r.kind === 'custom-element' && r.name === 'au-viewport'
    );
    expect(hasViewport).toBe(true);
  });

  it.skipIf(!submoduleAvailable)('extracts viewport-custom-element with bindables', async () => {
    const viewport = result.resources.find(r => r.name === 'au-viewport');
    expect(viewport).toBeDefined();
    expect(viewport!.kind).toBe('custom-element');
    expect(viewport!.bindables.length).toBeGreaterThan(0);

    // Should have 'name' bindable
    const hasName = viewport!.bindables.some(b => b.name === 'name');
    expect(hasName).toBe(true);
  });
});

describe('aurelia-internal: @aurelia/kernel analysis', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'kernel'));
    }
  });

  it.skipIf(!submoduleAvailable)('extracts kernel (service-only package)', async () => {
    expect(result).toBeDefined();

    // kernel is primarily services/DI infrastructure, no template resources
    // Should have 0 resources or very few
    expect(result.resources.length).toBeLessThan(3);
  });

  it.skipIf(!submoduleAvailable)('analyzes successfully without errors', async () => {
    // A service-only package may have 'manual' confidence (no resources found)
    // but should not have critical analysis errors
    const criticalGaps = result.gaps.filter(g =>
      g.why.includes('parse-error') ||
      g.why.includes('invalid-package-json')
    );
    expect(criticalGaps).toHaveLength(0);
  });
});

// =============================================================================
// Aggregate Validation
// =============================================================================

describe('aurelia-internal: aggregate', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  it.skipIf(!submoduleAvailable)('analyzes core packages without critical gaps', async () => {
    const corePackages = [
      'kernel',
      'runtime',
      'runtime-html',
      'router',
      'i18n',
    ];

    let totalResources = 0;
    let totalCriticalGaps = 0;

    for (const pkg of corePackages) {
      const result = await inspect(join(AURELIA_PACKAGES, pkg));
      totalResources += result.resources.length;

      // Count gaps that indicate analysis failure (not just missing features)
      const criticalGaps = result.gaps.filter(g =>
        g.why.includes('parse-error') ||
        g.why.includes('invalid-package-json')
      );
      totalCriticalGaps += criticalGaps.length;
    }

    // Should have some resources across all packages
    expect(totalResources).toBeGreaterThan(5);

    // Should have no critical analysis failures
    expect(totalCriticalGaps).toBe(0);
  });
});
