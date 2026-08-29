import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { AssuranceReceipt, EmissionFalsifier } from './contract.js';
import { runBrowserBatch, type BrowserBatchResult } from './browser.js';
import { ProductionBuildBatch } from './build.js';
import {
  assertAotBuildEvidence,
  assertProbePolicy,
  assertSemanticParity,
  findRenderedCompilerParserImplementations,
} from './evidence.js';
import { proveLocalFalsifiers } from './falsifiers.js';
import { assertG0Expectations } from './g0-expectations.js';
import { StaticBuildServer } from './server.js';

export interface RunAssuranceOptions {
  readonly adapterSpecifier: string;
  readonly fixtureRoot?: string;
  readonly receiptPath?: string;
  readonly keepOutput?: boolean;
  readonly requireBundleClosure?: boolean;
  readonly falsifier?: EmissionFalsifier;
}

export async function runAssurance(options: RunAssuranceOptions): Promise<AssuranceReceipt> {
  proveLocalFalsifiers();
  const fixtureRoot = options.fixtureRoot ?? resolve(import.meta.dirname, '..', 'fixtures', 'g0');
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
    browserBatch = await runBrowserBatch(jitUrl, aotUrl);

    assertG0Expectations(browserBatch.jit);
    assertG0Expectations(browserBatch.aot);
    assertSemanticParity(browserBatch.jit.semantic, browserBatch.aot.semantic);
    assertProbePolicy(browserBatch.jit, browserBatch.aot);

    const renderedCompilerParserImplementations = findRenderedCompilerParserImplementations(
      builds.aotReceipt.moduleGraph,
    );
    if (options.requireBundleClosure === true && renderedCompilerParserImplementations.length > 0) {
      const modules = renderedCompilerParserImplementations.map(module => module.moduleId).join('\n');
      throw new Error(`AOT rendered compiler/parser implementations:\n${modules}`);
    }

    const receipt: AssuranceReceipt = {
      fixture: 'g0',
      builds: [builds.jitReceipt, builds.aotReceipt],
      transcripts: [browserBatch.jit, browserBatch.aot],
      aot: builds.aotEvidence,
      renderedCompilerParserImplementations,
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
