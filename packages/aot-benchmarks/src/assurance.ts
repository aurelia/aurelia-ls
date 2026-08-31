import {
  StaticBuildServer,
  assertAotBuildEvidence,
  assertScenarioBrowserEvidence,
  assertScenarioBuildEvidence,
  runBrowserBatch,
  type AotBuildEvidence,
  type AssuranceScenario,
  type BrowserBatchResult,
} from '@aurelia-ls/aot-assurance';

import type { BenchmarkLaneBuild } from './build.js';

export interface ProductionBuildAssuranceEvidence {
  readonly schemaVersion: 1;
  readonly scenario: AssuranceScenario;
  readonly jit: BrowserBatchResult['jit'];
  readonly aot: BrowserBatchResult['aot'];
}

export async function assertProductionBuildAssurance(request: {
  readonly scenario: AssuranceScenario;
  readonly jit: BenchmarkLaneBuild;
  readonly aot: BenchmarkLaneBuild;
  readonly browserExecutablePath?: string;
  readonly browserArguments?: readonly string[];
}): Promise<ProductionBuildAssuranceEvidence> {
  const evidence = toAssuranceEvidence(request.aot);
  assertAotBuildEvidence(evidence);
  assertScenarioBuildEvidence(request.scenario, evidence);
  const jitServer = new StaticBuildServer(request.jit.outDir);
  const aotServer = new StaticBuildServer(request.aot.outDir);
  let browserBatch: Awaited<ReturnType<typeof runBrowserBatch>> | null = null;
  try {
    const [jitUrl, aotUrl] = await Promise.all([jitServer.start(), aotServer.start()]);
    browserBatch = await runBrowserBatch(jitUrl, aotUrl, request.scenario, {
      executablePath: request.browserExecutablePath,
      args: request.browserArguments,
    });
    assertScenarioBrowserEvidence(request.scenario, browserBatch);
    return {
      schemaVersion: 1,
      scenario: request.scenario,
      jit: browserBatch.jit,
      aot: browserBatch.aot,
    };
  } finally {
    await browserBatch?.browser.close();
    await Promise.allSettled([jitServer.close(), aotServer.close()]);
  }
}

function toAssuranceEvidence(build: BenchmarkLaneBuild): AotBuildEvidence {
  const semantic = build.semanticEvidence;
  const receipt = build.aotReceipt;
  if (build.mode !== 'aot' || semantic == null || receipt == null) {
    throw new Error(`${build.applicationId} has no joined AOT semantic/Vite evidence.`);
  }
  return {
    analysisCount: semantic.analysisCount,
    analysis: semantic.analysis,
    artifacts: semantic.artifacts.map(artifact => {
      const vite = receipt.artifacts.find(candidate =>
        candidate.compilerVariantKey === artifact.compilerVariantKey
      );
      if (vite == null) {
        throw new Error(`Vite receipt omitted semantic artifact '${artifact.sourcePath}'.`);
      }
      return {
        generation: semantic.generation,
        sourceId: artifact.sourcePath,
        moduleId: vite.virtualId,
        definitionName: artifact.definitionName,
        needsCompile: artifact.needsCompile,
        sourceMap: {
          generatedFile: artifact.map.file,
          sources: artifact.map.sources,
        },
      };
    }),
    runtimeConfiguration: {
      mode: semantic.runtimeConfiguration.mode,
      occurrences: semantic.runtimeConfiguration.occurrences.map(occurrence => ({
        carrierKind: occurrence.carrierKind,
        disposition: occurrence.disposition,
      })),
      modules: semantic.runtimeConfiguration.modules.map(module => ({
        moduleSpecifier: module.moduleSpecifier,
        registrations: module.registrations,
      })),
    },
  };
}
