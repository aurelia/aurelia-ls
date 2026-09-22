import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

import type { AssuranceReceipt, AssuranceScenario, EmissionFalsifier } from './contract.js';
import { runBrowserBatch, type BrowserBatchResult } from './browser.js';
import { ProductionBuildBatch } from './build.js';
import {
  assertAotBuildEvidence,
  assertProbePolicy,
  assertSemanticParity,
} from './evidence.js';
import { assertG0Expectations } from './g0-expectations.js';
import {
  assertHelloWorldBuildEvidence,
  assertHelloWorldExpectations,
} from './hello-world-expectations.js';
import {
  assertLocalTemplatesBuildEvidence,
  assertLocalTemplatesExpectations,
} from './local-templates-expectations.js';
import {
  assertRoutedStorefrontBuildEvidence,
  assertRoutedStorefrontExpectations,
} from './routed-storefront-expectations.js';
import {
  assertStateBackedFormBuildEvidence,
  assertStateBackedFormExpectations,
} from './state-backed-form-expectations.js';
import {
  assertProjectsAndMilestonesBuildEvidence,
  assertProjectsAndMilestonesExpectations,
} from './projects-and-milestones-expectations.js';
import {
  assertBuiltInControllersBuildEvidence,
  assertBuiltInControllersExpectations,
} from './built-in-controllers-scenario.js';
import {
  assertBrowserRecoveryBuildEvidence,
  assertBrowserRecoveryExpectations,
} from './browser-recovery-scenario.js';
import {
  assertExplicitShadowBuildEvidence,
  assertExplicitShadowExpectations,
} from './explicit-shadow-scenario.js';
import {
  assertCompilerHooksBuildEvidence,
  assertCompilerHooksExpectations,
  assertStrictCompilerHooksBuildEvidence,
} from './compiler-hooks-scenario.js';
import { StaticBuildServer } from './server.js';
import { assertCompatibleHooksBuildEvidence, assertCompatibleHooksExpectations } from './compatible-hooks-scenario.js';
import { assertContentAttributesBuildEvidence, assertContentAttributesExpectations } from './content-attributes-scenario.js';
import { assertContentMovesBuildEvidence, assertContentMovesExpectations } from './content-moves-scenario.js';
import { assertOrdinaryHooksBuildEvidence, assertOrdinaryHooksExpectations } from './ordinary-hooks-scenario.js';

export interface RunAssuranceOptions {
  readonly adapterSpecifier: string;
  readonly scenario?: AssuranceScenario;
  readonly fixtureRoot?: string;
  readonly receiptPath?: string;
  readonly keepOutput?: boolean;
  readonly falsifier?: EmissionFalsifier;
}

export async function runAssurance(options: RunAssuranceOptions): Promise<AssuranceReceipt> {
  const scenario = options.scenario ?? 'g0';
  const fixtureRoot = options.fixtureRoot ?? defaultFixtureRoot(scenario);
  const builds = await ProductionBuildBatch.create({
    adapterSpecifier: options.adapterSpecifier,
    fixtureRoot,
    keepOutput: options.keepOutput === true,
    falsifier: options.falsifier,
    runtimeParserProbe: scenario === 'g0',
    compilationMode: scenario === 'compatible-hooks' || scenario === 'compiler-hooks' ? 'compatible' : 'strict',
  });
  const jitServer = new StaticBuildServer(builds.jitOutDir);
  const aotServer = new StaticBuildServer(builds.aotOutDir);
  let browserBatch: BrowserBatchResult | undefined;

  try {
    assertAotBuildEvidence(builds.aotEvidence);
    const jitUrl = await jitServer.start();
    const aotUrl = await aotServer.start();
    browserBatch = await runBrowserBatch(jitUrl, aotUrl, scenario);

    assertScenarioBuildEvidence(scenario, builds.aotEvidence);
    assertScenarioBrowserEvidence(scenario, browserBatch);

    const receipt: AssuranceReceipt = {
      scenario,
      fixture: basename(fixtureRoot),
      builds: [builds.jitReceipt, builds.aotReceipt],
      transcripts: [browserBatch.jit, browserBatch.aot],
      aot: builds.aotEvidence,
    };
    if (options.receiptPath !== undefined) {
      const receiptPath = resolve(options.receiptPath);
      await mkdir(dirname(receiptPath), { recursive: true });
      await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    }
    return receipt;
  } finally {
    await browserBatch?.browser.close();
    await Promise.allSettled([jitServer.close(), aotServer.close()]);
    await builds.close();
  }
}

export function assertScenarioBuildEvidence(
  scenario: AssuranceScenario,
  evidence: AssuranceReceipt['aot'],
): void {
  if (scenario === 'hello-world') assertHelloWorldBuildEvidence(evidence);
  else if (scenario === 'local-templates') assertLocalTemplatesBuildEvidence(evidence);
  else if (scenario === 'built-in-controllers') assertBuiltInControllersBuildEvidence(evidence);
  else if (scenario === 'browser-recovery') assertBrowserRecoveryBuildEvidence(evidence);
  else if (scenario === 'explicit-shadow') assertExplicitShadowBuildEvidence(evidence);
  else if (scenario === 'compiler-hooks') assertCompilerHooksBuildEvidence(evidence);
  else if (scenario === 'strict-compiler-hooks') assertStrictCompilerHooksBuildEvidence(evidence);
  else if (scenario === 'ordinary-hooks') assertOrdinaryHooksBuildEvidence(evidence);
  else if (scenario === 'compatible-hooks') assertCompatibleHooksBuildEvidence(evidence);
  else if (scenario === 'content-attributes') assertContentAttributesBuildEvidence(evidence);
  else if (scenario === 'content-moves') assertContentMovesBuildEvidence(evidence);
  else if (scenario === 'routed-storefront') assertRoutedStorefrontBuildEvidence(evidence);
  else if (scenario === 'state-backed-form') assertStateBackedFormBuildEvidence(evidence);
  else if (scenario === 'projects-and-milestones') assertProjectsAndMilestonesBuildEvidence(evidence);
}

export function assertScenarioBrowserEvidence(
  scenario: AssuranceScenario,
  browserBatch: BrowserBatchResult,
): void {
    if (scenario === 'g0') {
      assertG0Expectations(browserBatch.jit);
      assertG0Expectations(browserBatch.aot);
      assertProbePolicy(browserBatch.jit, browserBatch.aot);
    } else if (scenario === 'hello-world') {
      assertHelloWorldExpectations(browserBatch.jit);
      assertHelloWorldExpectations(browserBatch.aot);
    } else if (scenario === 'local-templates') {
      assertLocalTemplatesExpectations(browserBatch.jit);
      assertLocalTemplatesExpectations(browserBatch.aot);
    } else if (scenario === 'built-in-controllers') {
      assertBuiltInControllersExpectations(browserBatch.jit);
      assertBuiltInControllersExpectations(browserBatch.aot);
    } else if (scenario === 'browser-recovery') {
      assertBrowserRecoveryExpectations(browserBatch.jit);
      assertBrowserRecoveryExpectations(browserBatch.aot);
    } else if (scenario === 'explicit-shadow') {
      assertExplicitShadowExpectations(browserBatch.jit);
      assertExplicitShadowExpectations(browserBatch.aot);
    } else if (scenario === 'compiler-hooks' || scenario === 'strict-compiler-hooks') {
      assertCompilerHooksExpectations(browserBatch.jit);
      assertCompilerHooksExpectations(browserBatch.aot);
    } else if (scenario === 'ordinary-hooks') {
      assertOrdinaryHooksExpectations(browserBatch.jit);
      assertOrdinaryHooksExpectations(browserBatch.aot);
    } else if (scenario === 'compatible-hooks') {
      assertCompatibleHooksExpectations(browserBatch.jit);
      assertCompatibleHooksExpectations(browserBatch.aot);
    } else if (scenario === 'content-attributes') {
      assertContentAttributesExpectations(browserBatch.jit);
      assertContentAttributesExpectations(browserBatch.aot);
    } else if (scenario === 'content-moves') {
      assertContentMovesExpectations(browserBatch.jit);
      assertContentMovesExpectations(browserBatch.aot);
    } else if (scenario === 'routed-storefront') {
      assertRoutedStorefrontExpectations(browserBatch.jit);
      assertRoutedStorefrontExpectations(browserBatch.aot);
    } else if (scenario === 'state-backed-form') {
      assertStateBackedFormExpectations(browserBatch.jit);
      assertStateBackedFormExpectations(browserBatch.aot);
    } else {
      assertProjectsAndMilestonesExpectations(browserBatch.jit);
      assertProjectsAndMilestonesExpectations(browserBatch.aot);
    }
    assertSemanticParity(browserBatch.jit.semantic, browserBatch.aot.semantic);
}

function defaultFixtureRoot(scenario: AssuranceScenario): string {
  const packageRoot = resolve(import.meta.dirname, '..');
  switch (scenario) {
    case 'g0':
      return resolve(packageRoot, 'fixtures', 'g0');
    case 'hello-world':
      return resolve(packageRoot, '..', '..', 'fixtures', 'hello-world');
    case 'local-templates':
      return resolve(packageRoot, 'fixtures', 'local-templates');
    case 'built-in-controllers':
      return resolve(packageRoot, '..', 'semantic-runtime', 'fixtures', 'pressure', 'template-controller-built-ins');
    case 'browser-recovery':
      return resolve(packageRoot, 'fixtures', 'browser-recovery');
    case 'explicit-shadow':
      return resolve(packageRoot, 'fixtures', 'explicit-shadow');
    case 'compiler-hooks':
      return resolve(packageRoot, 'fixtures', 'compiler-hooks');
    case 'strict-compiler-hooks':
      return resolve(packageRoot, 'fixtures', 'strict-compiler-hooks');
    case 'ordinary-hooks':
      return resolve(packageRoot, 'fixtures', 'ordinary-hooks');
    case 'compatible-hooks':
      return resolve(packageRoot, 'fixtures', 'compatible-hooks');
    case 'content-attributes':
      return resolve(packageRoot, 'fixtures', 'content-attributes');
    case 'content-moves':
      return resolve(packageRoot, 'fixtures', 'content-moves');
    case 'routed-storefront':
      return resolve(
        packageRoot,
        '..',
        'semantic-runtime',
        'fixtures',
        'pressure',
        'app-pattern-routed-catalog-storefront',
      );
    case 'state-backed-form':
      return resolve(
        packageRoot,
        '..',
        'semantic-runtime',
        'fixtures',
        'pressure',
        'app-pattern-state-backed-form',
      );
    case 'projects-and-milestones':
      return resolve(packageRoot, '..', '..', 'fixtures', 'projects-and-milestones');
  }
}
