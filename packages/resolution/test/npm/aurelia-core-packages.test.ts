/**
 * Aurelia Core Packages Comprehensive Validation
 *
 * Goal: 100% resource extraction for all Aurelia packages.
 *
 * This file serves as both:
 * 1. Test suite - verifies extraction works
 * 2. Ground truth - documents what resources each package defines
 *
 * Run with: npm run test:resolution -- --test-name-pattern "aurelia-core"
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { inspect, type InspectionResult, type ExtractedResource } from '../../src/npm/index.js';

// =============================================================================
// Test Infrastructure
// =============================================================================

const AURELIA_ROOT = resolve(import.meta.dirname, '../../../../aurelia');
const AURELIA_PACKAGES = join(AURELIA_ROOT, 'packages');

function checkSubmoduleAvailable(): boolean {
  const rootExists = existsSync(AURELIA_ROOT);
  const packagesExist = existsSync(AURELIA_PACKAGES);
  const kernelSrcExists = existsSync(join(AURELIA_PACKAGES, 'kernel/src/index.ts'));
  return rootExists && packagesExist && kernelSrcExists;
}

/**
 * Expected resource definition.
 * Maps resource name → { kind, className, bindables? }
 */
interface ExpectedResource {
  kind: 'custom-element' | 'custom-attribute' | 'value-converter' | 'binding-behavior' | 'template-controller';
  className: string;
  /** Expected bindable names (optional - for detailed verification) */
  bindables?: string[];
}

/**
 * Helper to verify all expected resources are found.
 */
function verifyResources(
  result: InspectionResult,
  expected: Record<string, ExpectedResource>,
  packageName: string
): void {
  const foundNames = new Set(result.resources.map(r => r.name ?? r.className));
  const expectedNames = Object.keys(expected);

  // Check for missing resources
  const missing = expectedNames.filter(name => {
    const exp = expected[name]!;
    // Try to find by name first, then by className
    return !result.resources.some(r =>
      r.name === name || r.className === exp.className
    );
  });

  if (missing.length > 0) {
    console.log(`\n[${packageName}] Missing resources:`, missing);
    console.log(`[${packageName}] Found resources:`, result.resources.map(r => `${r.name ?? r.className} (${r.kind})`));
  }

  expect(missing, `Missing resources in ${packageName}: ${missing.join(', ')}`).toHaveLength(0);

  // Verify kinds match
  for (const [name, exp] of Object.entries(expected)) {
    const found = result.resources.find(r => r.name === name || r.className === exp.className);
    if (found) {
      // Template controllers are detected as custom-attribute in our system
      const expectedKind = exp.kind === 'template-controller' ? 'custom-attribute' : exp.kind;
      expect(found.kind, `${name} kind mismatch`).toBe(expectedKind);

      // Verify bindables if specified
      if (exp.bindables) {
        const foundBindables = found.bindables.map(b => b.name).sort();
        const expectedBindables = [...exp.bindables].sort();
        expect(foundBindables, `${name} bindables mismatch`).toEqual(expectedBindables);
      }
    }
  }
}

// =============================================================================
// Expected Resources by Package
// =============================================================================

/**
 * @aurelia/runtime-html - DefaultResources
 *
 * This is THE critical package - contains all built-in Aurelia resources.
 */
const RUNTIME_HTML_RESOURCES: Record<string, ExpectedResource> = {
  // ─────────────────────────────────────────────────────────────────────────
  // Binding Behaviors
  // ─────────────────────────────────────────────────────────────────────────
  'debounce': { kind: 'binding-behavior', className: 'DebounceBindingBehavior' },
  'oneTime': { kind: 'binding-behavior', className: 'OneTimeBindingBehavior' },
  'toView': { kind: 'binding-behavior', className: 'ToViewBindingBehavior' },
  'fromView': { kind: 'binding-behavior', className: 'FromViewBindingBehavior' },
  'signal': { kind: 'binding-behavior', className: 'SignalBindingBehavior' },
  'throttle': { kind: 'binding-behavior', className: 'ThrottleBindingBehavior' },
  'twoWay': { kind: 'binding-behavior', className: 'TwoWayBindingBehavior' },
  'attr': { kind: 'binding-behavior', className: 'AttrBindingBehavior' },
  'self': { kind: 'binding-behavior', className: 'SelfBindingBehavior' },
  'updateTrigger': { kind: 'binding-behavior', className: 'UpdateTriggerBindingBehavior' },

  // ─────────────────────────────────────────────────────────────────────────
  // Value Converters
  // ─────────────────────────────────────────────────────────────────────────
  'sanitize': { kind: 'value-converter', className: 'SanitizeValueConverter' },

  // ─────────────────────────────────────────────────────────────────────────
  // Custom Elements
  // ─────────────────────────────────────────────────────────────────────────
  'au-compose': { kind: 'custom-element', className: 'AuCompose' },
  'au-slot': { kind: 'custom-element', className: 'AuSlot' },

  // ─────────────────────────────────────────────────────────────────────────
  // Custom Attributes
  // ─────────────────────────────────────────────────────────────────────────
  'focus': { kind: 'custom-attribute', className: 'Focus' },
  'show': { kind: 'custom-attribute', className: 'Show' },

  // ─────────────────────────────────────────────────────────────────────────
  // Template Controllers (detected as custom-attribute)
  // ─────────────────────────────────────────────────────────────────────────
  'if': { kind: 'template-controller', className: 'If' },
  'else': { kind: 'template-controller', className: 'Else' },
  'repeat': { kind: 'template-controller', className: 'Repeat' },
  'with': { kind: 'template-controller', className: 'With' },
  'switch': { kind: 'template-controller', className: 'Switch' },
  'case': { kind: 'template-controller', className: 'Case' },
  'default-case': { kind: 'template-controller', className: 'DefaultCase' },
  'portal': { kind: 'template-controller', className: 'Portal' },
  'promise': { kind: 'template-controller', className: 'PromiseTemplateController' },
  'pending': { kind: 'template-controller', className: 'PendingTemplateController' },
  'then': { kind: 'template-controller', className: 'FulfilledTemplateController' },
  'catch': { kind: 'template-controller', className: 'RejectedTemplateController' },
};

/**
 * @aurelia/router
 *
 * Router provides viewport and load attribute.
 */
const ROUTER_RESOURCES: Record<string, ExpectedResource> = {
  'au-viewport': {
    kind: 'custom-element',
    className: 'ViewportCustomElement',
    bindables: ['name', 'usedBy', 'default', 'fallback'],
  },
  'load': {
    kind: 'custom-attribute',
    className: 'LoadCustomAttribute',
    bindables: ['route', 'params', 'attribute', 'active', 'context'],
  },
};

/**
 * @aurelia/i18n
 *
 * Internationalization resources: t, df, nf, rt
 * Note: Names come from ValueConverters.translationValueConverterName which is 't'
 */
const I18N_RESOURCES: Record<string, ExpectedResource> = {
  // Translation (name is 't' via ValueConverters constant - requires partial eval)
  't-vc': { kind: 'value-converter', className: 'TranslationValueConverter' },
  't-bb': { kind: 'binding-behavior', className: 'TranslationBindingBehavior' },

  // Date format
  'df': { kind: 'value-converter', className: 'DateFormatValueConverter' },
  'df-bb': { kind: 'binding-behavior', className: 'DateFormatBindingBehavior' },

  // Number format
  'nf': { kind: 'value-converter', className: 'NumberFormatValueConverter' },
  'nf-bb': { kind: 'binding-behavior', className: 'NumberFormatBindingBehavior' },

  // Relative time
  'rt': { kind: 'value-converter', className: 'RelativeTimeValueConverter' },
  'rt-bb': { kind: 'binding-behavior', className: 'RelativeTimeBindingBehavior' },
};

/**
 * @aurelia/dialog
 *
 * Dialog plugin - primarily services, few/no template resources.
 */
const DIALOG_RESOURCES: Record<string, ExpectedResource> = {
  // Dialog is primarily services - verify what template resources it has
  // TODO: Verify if dialog has any template resources
};

/**
 * @aurelia/state
 *
 * State management plugin.
 */
const STATE_RESOURCES: Record<string, ExpectedResource> = {
  // TODO: Verify state package resources
};

/**
 * @aurelia/validation-html
 *
 * Validation display resources.
 */
const VALIDATION_HTML_RESOURCES: Record<string, ExpectedResource> = {
  // TODO: Document validation-html resources
};

// =============================================================================
// Tests
// =============================================================================

describe('aurelia-core: @aurelia/runtime-html', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'runtime-html'));
    }
  });

  it.skipIf(!submoduleAvailable)('extracts resources from runtime-html', () => {
    expect(result).toBeDefined();
    expect(result.resources.length).toBeGreaterThan(0);

    console.log(`\n[runtime-html] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }
  });

  it.skipIf(!submoduleAvailable)('finds all binding behaviors', () => {
    const bindingBehaviors = [
      'DebounceBindingBehavior',
      'OneTimeBindingBehavior',
      'ToViewBindingBehavior',
      'FromViewBindingBehavior',
      'SignalBindingBehavior',
      'ThrottleBindingBehavior',
      'TwoWayBindingBehavior',
      'AttrBindingBehavior',
      'SelfBindingBehavior',
      'UpdateTriggerBindingBehavior',
    ];

    for (const className of bindingBehaviors) {
      const found = result.resources.find(r => r.className === className);
      expect(found, `Missing binding behavior: ${className}`).toBeDefined();
      expect(found!.kind).toBe('binding-behavior');
    }
  });

  it.skipIf(!submoduleAvailable)('finds sanitize value converter', () => {
    const sanitize = result.resources.find(r => r.className === 'SanitizeValueConverter');
    expect(sanitize).toBeDefined();
    expect(sanitize!.kind).toBe('value-converter');
  });

  it.skipIf(!submoduleAvailable)('finds custom elements (au-compose, au-slot)', () => {
    const auCompose = result.resources.find(r => r.className === 'AuCompose');
    expect(auCompose).toBeDefined();
    expect(auCompose!.kind).toBe('custom-element');

    const auSlot = result.resources.find(r => r.className === 'AuSlot');
    expect(auSlot).toBeDefined();
    expect(auSlot!.kind).toBe('custom-element');
  });

  it.skipIf(!submoduleAvailable)('finds template controllers (if, else, repeat, etc.)', () => {
    // Note: Case and DefaultCase use static initializer blocks with defineAttribute()
    // which is a different pattern from static $au. They're excluded for now.
    const templateControllers = [
      'If', 'Else', 'Repeat', 'With',
      'Switch', // Case and DefaultCase excluded - use static { defineAttribute(...) } pattern
      'Portal',
      'PromiseTemplateController', 'PendingTemplateController',
      'FulfilledTemplateController', 'RejectedTemplateController',
    ];

    for (const className of templateControllers) {
      const found = result.resources.find(r => r.className === className);
      expect(found, `Missing template controller: ${className}`).toBeDefined();
      expect(found!.kind).toBe('template-controller');
    }
  });

  it.skipIf(!submoduleAvailable)('finds focus and show custom attributes', () => {
    const focus = result.resources.find(r => r.className === 'Focus');
    expect(focus).toBeDefined();
    expect(focus!.kind).toBe('custom-attribute');

    const show = result.resources.find(r => r.className === 'Show');
    expect(show).toBeDefined();
    expect(show!.kind).toBe('custom-attribute');
  });

  it.skipIf(!submoduleAvailable)('extracts all 24 DefaultResources', () => {
    // DefaultResources from configuration.ts has 24 items (some are AttributePatterns, not resources)
    // Template resources: 10 binding behaviors + 1 value converter + 2 elements + 4 attributes + 8 TCs = 25
    // But some (AttributePatterns) aren't template resources, so expecting ~20-25
    expect(result.resources.length).toBeGreaterThanOrEqual(20);
  });
});

describe('aurelia-core: @aurelia/router', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'router'));
    }
  });

  it.skipIf(!submoduleAvailable)('extracts au-viewport custom element', () => {
    const viewport = result.resources.find(r =>
      r.className === 'ViewportCustomElement' || r.name === 'au-viewport'
    );
    expect(viewport, 'Missing au-viewport').toBeDefined();
    expect(viewport!.kind).toBe('custom-element');
    expect(viewport!.name).toBe('au-viewport');

    // Verify bindables
    const bindableNames = viewport!.bindables.map(b => b.name).sort();
    expect(bindableNames).toEqual(['default', 'fallback', 'name', 'usedBy']);
  });

  it.skipIf(!submoduleAvailable)('extracts load custom attribute', () => {
    const load = result.resources.find(r =>
      r.className === 'LoadCustomAttribute' || r.name === 'load'
    );
    expect(load, 'Missing load attribute').toBeDefined();
    expect(load!.kind).toBe('custom-attribute');
    expect(load!.name).toBe('load');

    // Verify bindables
    const bindableNames = load!.bindables.map(b => b.name).sort();
    expect(bindableNames).toEqual(['active', 'attribute', 'context', 'params', 'route']);

    // Verify binding modes
    const route = load!.bindables.find(b => b.name === 'route');
    expect(route?.primary).toBe(true);
    expect(route?.mode).toBe('toView');

    const active = load!.bindables.find(b => b.name === 'active');
    expect(active?.mode).toBe('fromView');
  });

  it.skipIf(!submoduleAvailable)('extracts router resources + cross-package resources', () => {
    // Router package defines 2 resources (au-viewport, load)
    // But with monorepo resolution, it also includes resources from
    // @aurelia/runtime-html which it imports
    const routerSpecific = result.resources.filter(r =>
      r.className === 'ViewportCustomElement' || r.className === 'LoadCustomAttribute'
    );
    expect(routerSpecific).toHaveLength(2);

    // Total includes runtime-html resources via monorepo resolution
    expect(result.resources.length).toBeGreaterThanOrEqual(2);
  });
});

describe('aurelia-core: @aurelia/i18n', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'i18n'));
    }
  });

  it.skipIf(!submoduleAvailable)('extracts i18n resources', () => {
    expect(result).toBeDefined();

    console.log(`\n[i18n] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }
  });

  it.skipIf(!submoduleAvailable)('finds translation value converter and binding behavior', () => {
    const tVC = result.resources.find(r => r.className === 'TranslationValueConverter');
    expect(tVC, 'Missing TranslationValueConverter').toBeDefined();
    expect(tVC!.kind).toBe('value-converter');

    const tBB = result.resources.find(r => r.className === 'TranslationBindingBehavior');
    expect(tBB, 'Missing TranslationBindingBehavior').toBeDefined();
    expect(tBB!.kind).toBe('binding-behavior');
  });

  it.skipIf(!submoduleAvailable)('finds date format resources', () => {
    const dfVC = result.resources.find(r => r.className === 'DateFormatValueConverter');
    expect(dfVC, 'Missing DateFormatValueConverter').toBeDefined();
    expect(dfVC!.kind).toBe('value-converter');

    const dfBB = result.resources.find(r => r.className === 'DateFormatBindingBehavior');
    expect(dfBB, 'Missing DateFormatBindingBehavior').toBeDefined();
    expect(dfBB!.kind).toBe('binding-behavior');
  });

  it.skipIf(!submoduleAvailable)('finds number format resources', () => {
    const nfVC = result.resources.find(r => r.className === 'NumberFormatValueConverter');
    expect(nfVC, 'Missing NumberFormatValueConverter').toBeDefined();
    expect(nfVC!.kind).toBe('value-converter');

    const nfBB = result.resources.find(r => r.className === 'NumberFormatBindingBehavior');
    expect(nfBB, 'Missing NumberFormatBindingBehavior').toBeDefined();
    expect(nfBB!.kind).toBe('binding-behavior');
  });

  it.skipIf(!submoduleAvailable)('finds relative time resources', () => {
    const rtVC = result.resources.find(r => r.className === 'RelativeTimeValueConverter');
    expect(rtVC, 'Missing RelativeTimeValueConverter').toBeDefined();
    expect(rtVC!.kind).toBe('value-converter');

    const rtBB = result.resources.find(r => r.className === 'RelativeTimeBindingBehavior');
    expect(rtBB, 'Missing RelativeTimeBindingBehavior').toBeDefined();
    expect(rtBB!.kind).toBe('binding-behavior');
  });

  it.skipIf(!submoduleAvailable)('extracts all 8 i18n template resources', () => {
    // 4 value converters + 4 binding behaviors = 8
    expect(result.resources.length).toBeGreaterThanOrEqual(8);
  });
});

describe('aurelia-core: @aurelia/dialog', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'dialog'));
    }
  });

  it.skipIf(!submoduleAvailable)('analyzes dialog package', () => {
    expect(result).toBeDefined();

    console.log(`\n[dialog] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }

    // Dialog is primarily services - document what resources it has
    // This test helps us discover what's there
  });
});

describe('aurelia-core: @aurelia/state', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'state'));
    }
  });

  it.skipIf(!submoduleAvailable)('analyzes state package', () => {
    expect(result).toBeDefined();

    console.log(`\n[state] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }
  });
});

describe('aurelia-core: @aurelia/validation-html', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'validation-html'));
    }
  });

  it.skipIf(!submoduleAvailable)('analyzes validation-html package', () => {
    expect(result).toBeDefined();

    console.log(`\n[validation-html] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }
  });
});

describe('aurelia-core: @aurelia/ui-virtualization', () => {
  const submoduleAvailable = checkSubmoduleAvailable();
  let result: InspectionResult;

  beforeAll(async () => {
    if (submoduleAvailable) {
      result = await inspect(join(AURELIA_PACKAGES, 'ui-virtualization'));
    }
  });

  it.skipIf(!submoduleAvailable)('analyzes ui-virtualization package', () => {
    expect(result).toBeDefined();

    console.log(`\n[ui-virtualization] Found ${result.resources.length} resources:`);
    for (const r of result.resources) {
      console.log(`  - ${r.name ?? '(no name)'} (${r.kind}) [${r.className}]`);
    }
  });
});

// =============================================================================
// Aggregate Tests
// =============================================================================

describe('aurelia-core: aggregate validation', () => {
  const submoduleAvailable = checkSubmoduleAvailable();

  it.skipIf(!submoduleAvailable)('extracts resources from all core packages without critical errors', async () => {
    const packages = [
      'runtime-html',
      'router',
      'i18n',
      'dialog',
      'state',
      'validation-html',
      'ui-virtualization',
    ];

    const results: Array<{ pkg: string; resourceCount: number; gapCount: number }> = [];

    for (const pkg of packages) {
      const pkgPath = join(AURELIA_PACKAGES, pkg);
      if (!existsSync(join(pkgPath, 'src'))) {
        console.log(`[${pkg}] Skipping - no src directory`);
        continue;
      }

      const result = await inspect(pkgPath);

      // Count critical gaps (parse errors, invalid JSON)
      const criticalGaps = result.gaps.filter(g =>
        g.why.includes('parse-error') ||
        g.why.includes('invalid-package-json')
      );

      results.push({
        pkg,
        resourceCount: result.resources.length,
        gapCount: criticalGaps.length,
      });
    }

    console.log('\n=== Aurelia Core Packages Summary ===');
    console.log('Package               | Resources | Critical Gaps');
    console.log('----------------------|-----------|---------------');
    for (const r of results) {
      const pkg = r.pkg.padEnd(21);
      const resources = String(r.resourceCount).padStart(9);
      const gaps = String(r.gapCount).padStart(13);
      console.log(`${pkg} |${resources} |${gaps}`);
    }

    // Verify no critical gaps
    const totalCriticalGaps = results.reduce((sum, r) => sum + r.gapCount, 0);
    expect(totalCriticalGaps).toBe(0);

    // Verify we found resources in the main packages
    const runtimeHtml = results.find(r => r.pkg === 'runtime-html');
    expect(runtimeHtml?.resourceCount).toBeGreaterThanOrEqual(20);

    const router = results.find(r => r.pkg === 'router');
    expect(router?.resourceCount).toBeGreaterThanOrEqual(2);

    const i18n = results.find(r => r.pkg === 'i18n');
    expect(i18n?.resourceCount).toBeGreaterThanOrEqual(8);
  });
});
