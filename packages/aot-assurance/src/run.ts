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
import { StaticBuildServer } from './server.js';

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
  });
  const jitServer = new StaticBuildServer(builds.jitOutDir);
  const aotServer = new StaticBuildServer(builds.aotOutDir);
  let browserBatch: BrowserBatchResult | undefined;

  try {
    assertAotBuildEvidence(builds.aotEvidence);
    const jitUrl = await jitServer.start();
    const aotUrl = await aotServer.start();
    browserBatch = await runBrowserBatch(jitUrl, aotUrl, scenario);

    if (scenario === 'g0') {
      assertG0Expectations(browserBatch.jit);
      assertG0Expectations(browserBatch.aot);
      assertProbePolicy(browserBatch.jit, browserBatch.aot);
    } else if (scenario === 'hello-world') {
      assertHelloWorldBuildEvidence(builds.aotEvidence);
      assertHelloWorldExpectations(browserBatch.jit);
      assertHelloWorldExpectations(browserBatch.aot);
    } else if (scenario === 'routed-storefront') {
      assertRoutedStorefrontBuildEvidence(builds.aotEvidence);
      assertRoutedStorefrontExpectations(browserBatch.jit);
      assertRoutedStorefrontExpectations(browserBatch.aot);
    } else if (scenario === 'state-backed-form') {
      assertStateBackedFormBuildEvidence(builds.aotEvidence);
      assertStateBackedFormExpectations(browserBatch.jit);
      assertStateBackedFormExpectations(browserBatch.aot);
    } else {
      assertProjectsAndMilestonesBuildEvidence(builds.aotEvidence);
      assertProjectsAndMilestonesExpectations(browserBatch.jit);
      assertProjectsAndMilestonesExpectations(browserBatch.aot);
    }
    assertSemanticParity(browserBatch.jit.semantic, browserBatch.aot.semantic);

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

function defaultFixtureRoot(scenario: AssuranceScenario): string {
  const packageRoot = resolve(import.meta.dirname, '..');
  switch (scenario) {
    case 'g0':
      return resolve(packageRoot, 'fixtures', 'g0');
    case 'hello-world':
      return resolve(packageRoot, '..', '..', 'fixtures', 'hello-world');
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
