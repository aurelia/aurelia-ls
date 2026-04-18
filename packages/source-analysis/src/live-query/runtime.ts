import {
  createAnalysisViews,
  type AnalysisViews,
} from '../analysis-views.js';
import {
  generateDepsAnalysisFromRuntime,
} from '../deps/analyze.js';
import {
  generateExportsAnalysisFromRuntime,
} from '../exports/analyze.js';
import {
  createRepoSession,
} from '../repo-session.js';
import {
  buildStructuralClaimGraph,
  type StructuralClaimGraphRuntime,
} from '../structural-claim-graph.js';
import {
  scanParsedTsconfigSourceFiles,
  type ParsedTsconfigSourceFileScanResult,
} from '../tsconfig-source-files.js';
import {
  generateTypeRefsAnalysisFromRuntime,
} from '../typerefs/analyze.js';
import type {
  LiveQueryKernel,
  LiveQueryKernelOptions,
  LiveQueryKernelOutputs,
} from './contracts.js';

// TODO: Rewrite deps/typerefs/exports command adapters over this kernel and
// then retire the snapshot-first query scripts. The compatibility scripts
// should not keep owning their own loader/index/UI stacks once this live path
// can answer the needed questions directly.
export function createLiveQueryKernel(
  options: LiveQueryKernelOptions = {},
): LiveQueryKernel {
  const session = createRepoSession(options);

  let sourceFileScan: ParsedTsconfigSourceFileScanResult | undefined;
  let structuralRuntime: StructuralClaimGraphRuntime | undefined;
  let outputs: LiveQueryKernelOutputs | undefined;
  let analysisViews: AnalysisViews | undefined;

  function loadSourceFileScan(): ParsedTsconfigSourceFileScanResult {
    sourceFileScan ??= scanParsedTsconfigSourceFiles(session);
    return sourceFileScan;
  }

  function loadStructuralRuntime(): StructuralClaimGraphRuntime {
    structuralRuntime ??= buildStructuralClaimGraph(session, {
      sourceFileScan: loadSourceFileScan(),
    });
    return structuralRuntime;
  }

  function loadOutputs(): LiveQueryKernelOutputs {
    outputs ??= {
      deps: generateDepsAnalysisFromRuntime(
        session,
        loadStructuralRuntime(),
        loadSourceFileScan(),
      ).output,
      typeRefs: generateTypeRefsAnalysisFromRuntime(
        session,
        loadStructuralRuntime(),
        loadSourceFileScan(),
      ).output,
      exports: generateExportsAnalysisFromRuntime(
        session,
        loadStructuralRuntime(),
      ).output,
    };
    return outputs;
  }

  function loadAnalysisViews(): AnalysisViews {
    const currentOutputs = loadOutputs();
    analysisViews ??= createAnalysisViews({
      source: 'hosted-analysis',
      deps: currentOutputs.deps,
      typeRefs: currentOutputs.typeRefs,
      exports: currentOutputs.exports,
      repoSession: session,
      structuralRuntime: loadStructuralRuntime(),
      sourceFileScan: loadSourceFileScan(),
      repoSourceFiles: session.listRepoSourceFiles(),
    });
    return analysisViews;
  }

  return {
    session,
    loadSourceFileScan,
    loadStructuralRuntime,
    loadOutputs,
    loadAnalysisViews,
  };
}
