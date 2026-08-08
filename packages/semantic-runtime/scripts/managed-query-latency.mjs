import { createHash } from 'node:crypto';
import { fork, spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RESULT_SCHEMA_VERSION = 'semantic-runtime-managed-query-latency/3';
const CHILD_CONFIG_ENV = 'SEMANTIC_RUNTIME_MANAGED_QUERY_LATENCY_CHILD_CONFIG';
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = path.resolve(packageRoot, '../..');
const scriptPath = fileURLToPath(import.meta.url);
const baselineFixtureName = 'resource-registration-local-templates';
const pressureFixtureRoot = path.join(packageRoot, 'fixtures/pressure');
const baselineFixtureRoot = path.join(pressureFixtureRoot, baselineFixtureName);
const baselineProjectKey = 'app';
const resourceInventoryProjections = Object.freeze({
  'historical-rich': Object.freeze({
    name: 'historical-rich',
    includeTypeSurfaces: true,
    note: 'Explicitly preserves the original benchmark workload, including bindable TypeChecker surfaces.',
  }),
  compact: Object.freeze({
    name: 'compact',
    includeTypeSurfaces: false,
    note: 'Measures the compact inventory contract without bindable TypeChecker surfaces.',
  }),
});
const historicalBaseline = Object.freeze({
  resourceInventoryProjection: 'historical-rich',
  typeSurfacesIncluded: true,
  returnedRows: 36,
  exactProjectInputLeaves: 785,
});

try {
  if (process.argv[2] === '--child') {
    await childMain();
  } else {
    await orchestratorMain(process.argv.slice(2));
  }
} catch (error) {
  if (process.argv[2] === '--child' && typeof process.send === 'function') {
    await sendChildMessage({
      kind: 'error',
      error: serializeError(error),
    });
  } else {
    console.error(formatError(error));
  }
  process.exitCode = 1;
}

async function orchestratorMain(args) {
  const options = parseCliOptions(args);
  if (options.help) {
    console.log(usageText());
    return;
  }

  const outputPath = path.resolve(process.cwd(), options.outputPath);
  const projection = readResourceInventoryProjection(options.projection);
  const query = baselineQuery(projection);
  const childConfig = {
    fixtureRoot: baselineFixtureRoot,
    projectKey: baselineProjectKey,
    resourceInventoryProjection: projection.name,
    query,
    warmRuns: options.warmRuns,
  };
  const metadata = await reproducibilityMetadata(options, outputPath);
  const processes = [];
  for (let processIndex = 0; processIndex < options.processes; processIndex += 1) {
    processes.push(await runFreshChild(
      { ...childConfig, lane: 'primary' },
      processIndex,
    ));
  }
  const diagnosticProcess = options.diagnostic
    ? await runFreshChild({ ...childConfig, lane: 'diagnostic' }, null)
    : null;

  const semanticOutcomes = processes.flatMap((entry) => [entry.cold, ...entry.warm])
    .map((entry) => entry.outcome);
  const result = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    benchmark: {
      fixture: {
        name: baselineFixtureName,
        repositoryPath: path.relative(repositoryRoot, baselineFixtureRoot).replaceAll(path.sep, '/'),
        root: baselineFixtureRoot,
      },
      project: {
        topology: 'explicit',
        projectKey: baselineProjectKey,
        rootDir: baselineFixtureRoot,
      },
      resourceInventoryProjection: projection,
      query,
      historicalBaseline,
      processIsolation: 'fresh-sequential-child-processes',
      processes: options.processes,
      warmRunsPerProcess: options.warmRuns,
      timedBoundary: 'await ManagedSemanticWorkspaceSession.run(operation)',
      timedOperation: 'managed ingress, ResourceInventory answer, receipt absorption, result projection, and managed egress',
      routedAnswerProfile: 'opt-in relative checkpoints for routed preflight and the synchronous answer transaction',
      excludedFromTimedBoundary: [
        'session construction',
        'session disposal',
        'cache overview',
        'explicit garbage collection',
        'memory sampling',
        'diagnostic counters',
        'output formatting and printing',
      ],
      diagnosticLane: {
        enabled: options.diagnostic,
        processIsolation: 'one separate fresh child after all primary timing children',
        authority: 'diagnostic-non-authoritative',
        warning: 'Prototype instrumentation changes call cost; use this lane for topology and relative attribution, not latency comparison.',
        exclusiveTimingMeaning: 'inclusive time minus direct instrumented child time; it includes uninstrumented callees',
      },
    },
    reproducibility: metadata,
    summary: summarizeProcesses(processes, options.warmRuns),
    semanticOutcome: summarizeSemanticOutcomes(semanticOutcomes, projection),
    processes,
    diagnostic: diagnosticProcess,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Wrote managed query latency results to ${outputPath}`);
}

async function childMain() {
  if (typeof process.send !== 'function') {
    throw new Error('The managed query latency child must be launched with an IPC channel.');
  }
  const config = parseChildConfig(process.env[CHILD_CONFIG_ENV]);
  const {
    ManagedSemanticWorkspaceSession,
    SemanticAppQueryKind,
  } = await import('../out/index.js');
  const query = {
    ...config.query,
    kind: SemanticAppQueryKind.ResourceInventory,
  };
  const session = new ManagedSemanticWorkspaceSession({
    workspaceRoot: config.fixtureRoot,
    projects: [{
      rootDir: config.fixtureRoot,
      projectKey: config.projectKey,
    }],
  });

  try {
    if (config.lane === 'diagnostic') {
      await runDiagnosticChild(session, query, config.warmRuns);
      return;
    }
    const cold = await measureManagedRun(session, query);
    const warm = [];
    for (let index = 0; index < config.warmRuns; index += 1) {
      warm.push({
        warmRun: index + 1,
        ...await measureManagedRun(session, query),
      });
    }
    await sendChildMessage({
      kind: 'result',
      result: {
        processId: process.pid,
        nodeVersion: process.version,
        cold,
        warm,
      },
    });
  } finally {
    await session.dispose();
  }
}

async function runDiagnosticChild(session, query, warmRuns) {
  const [
    { SemanticRuntime, SemanticApp },
    { SemanticRuntimeProjectInputGeneration },
    { AureliaAppWorldProjectGeneration },
    { SemanticRuntimeAnalysisReceipt },
    { SemanticAnswerTransaction },
    { QueryClaimGraph },
    { CheckerTypeShapeAccess },
  ] = await Promise.all([
    import('../out/api/runtime.js'),
    import('../out/kernel/project-input.js'),
    import('../out/configuration/app-analysis-computation.js'),
    import('../out/api/analysis-receipt.js'),
    import('../out/api/analysis-answer-transaction.js'),
    import('../out/inquiry/query-claim-graph.js'),
    import('../out/type-system/checker-type-shape-access.js'),
  ]);
  const profiler = installDiagnosticProfiler([
    diagnosticTarget(SemanticRuntimeProjectInputGeneration, 'validate'),
    diagnosticTarget(AureliaAppWorldProjectGeneration, 'isCurrent'),
    diagnosticTarget(SemanticRuntimeAnalysisReceipt, 'validate'),
    diagnosticTarget(SemanticAnswerTransaction, 'commit'),
    diagnosticTarget(QueryClaimGraph, 'answer'),
    diagnosticTarget(QueryClaimGraph, 'inspect'),
    diagnosticTarget(QueryClaimGraph, 'readRecentRecords'),
    diagnosticTarget(QueryClaimGraph, 'snapshot'),
    diagnosticTarget(SemanticRuntime, 'planOpenApp'),
    diagnosticTarget(SemanticRuntime, 'readCachedApp'),
    diagnosticTarget(SemanticRuntime, 'openPlannedApp'),
    diagnosticTarget(SemanticRuntime, 'answerRuntimeQuery'),
    diagnosticTarget(SemanticRuntime, 'answerAppQuery'),
    diagnosticTarget(SemanticApp, 'answerRoutedQuery'),
    diagnosticTarget(CheckerTypeShapeAccess, 'memberValueAccess'),
  ]);
  try {
    const cold = await measureDiagnosticManagedRun(session, query, profiler, 'cold');
    const warm = [];
    for (let index = 0; index < warmRuns; index += 1) {
      warm.push({
        warmRun: index + 1,
        ...await measureDiagnosticManagedRun(session, query, profiler, `warm-${index + 1}`),
      });
    }
    await sendChildMessage({
      kind: 'result',
      result: {
        authority: 'diagnostic-non-authoritative',
        warning: 'Inclusive timings include prototype-wrapper overhead and must not be compared with primary latency samples.',
        instrumentation: 'process-local prototype wrappers installed only in this fresh diagnostic child',
        exclusiveTimingMeaning: 'inclusive time minus direct instrumented child time; it includes uninstrumented callees',
        processId: process.pid,
        nodeVersion: process.version,
        cold,
        warm,
      },
    });
  } finally {
    profiler.restore();
  }
}

async function measureManagedRun(session, query) {
  const started = process.hrtime.bigint();
  const measured = await session.run(async ({ runtime }) => {
    const answer = await runtime.answerAppQuery(query);
    return {
      outcome: {
        result: answer.result,
        selection: answer.selection,
        coverage: answer.coverage,
        projectKey: answer.value?.projectKey ?? null,
        typeSurfacesIncluded: answer.value?.typeSurfacesIncluded ?? null,
        returnedRows: Array.isArray(answer.value?.rows) ? answer.value.rows.length : null,
        totalRows: answer.page?.totalRows ?? null,
        pageExhausted: answer.page?.exhausted ?? null,
      },
      routedAnswerProfile: requireRoutedAnswerProfile(answer.profile?.routedAnswer),
    };
  });
  const elapsedNanoseconds = process.hrtime.bigint() - started;
  return {
    milliseconds: roundMilliseconds(Number(elapsedNanoseconds) / 1e6),
    outcome: measured.outcome,
    routedAnswerProfile: measured.routedAnswerProfile,
  };
}

function requireRoutedAnswerProfile(profile) {
  const checkpoints = profile?.checkpoints;
  const entry = checkpoints?.[0];
  const preflightComplete = checkpoints?.[1];
  const answerTransactionComplete = checkpoints?.[2];
  const timings = [
    entry?.elapsedMilliseconds,
    preflightComplete?.elapsedMilliseconds,
    answerTransactionComplete?.elapsedMilliseconds,
    profile?.preflightMilliseconds,
    profile?.answerTransactionMilliseconds,
    profile?.totalMilliseconds,
    profile?.longestUninterruptedMilliseconds,
  ];
  if (
    profile == null
    || !Array.isArray(checkpoints)
    || checkpoints.length !== 3
    || entry?.name !== 'entry'
    || preflightComplete?.name !== 'preflight-complete'
    || answerTransactionComplete?.name !== 'answer-transaction-complete'
    || timings.some((value) => !Number.isFinite(value) || value < 0)
    || entry.elapsedMilliseconds !== 0
    || preflightComplete.elapsedMilliseconds !== profile.preflightMilliseconds
    || answerTransactionComplete.elapsedMilliseconds !== profile.totalMilliseconds
    || preflightComplete.elapsedMilliseconds > answerTransactionComplete.elapsedMilliseconds
    || profile.totalMilliseconds < profile.longestUninterruptedMilliseconds
    || profile.longestUninterruptedMilliseconds !== Math.max(
      profile.preflightMilliseconds,
      profile.answerTransactionMilliseconds,
    )
  ) {
    throw new Error('Managed query latency telemetry requires the routed-answer checkpoint profile.');
  }
  return profile;
}

async function measureDiagnosticManagedRun(session, query, profiler, label) {
  profiler.beginOperation(label);
  let callTopology;
  let measured;
  let measurementFailed = false;
  let measurementFailure;
  try {
    measured = await measureManagedRun(session, query);
  } catch (error) {
    measurementFailed = true;
    measurementFailure = error;
  }
  try {
    callTopology = profiler.endOperation();
  } catch (profilerError) {
    if (measurementFailed) {
      throw measurementFailure;
    }
    throw profilerError;
  }
  if (measurementFailed) {
    throw measurementFailure;
  }
  const rootChildrenInclusiveMilliseconds = roundMilliseconds(callTopology.edges
    .filter((edge) => edge.caller === callTopology.root)
    .reduce((sum, edge) => sum + edge.inclusiveMilliseconds, 0));
  const rootResidualMilliseconds = roundMilliseconds(Math.max(
    0,
    measured.milliseconds - rootChildrenInclusiveMilliseconds,
  ));
  return {
    instrumentedRunMilliseconds: measured.milliseconds,
    outcome: measured.outcome,
    callTopology: {
      ...callTopology,
      rootChildrenInclusiveMilliseconds,
      rootExclusiveMilliseconds: rootResidualMilliseconds,
      rootResidualMilliseconds,
    },
  };
}

function diagnosticTarget(type, method) {
  if (typeof type !== 'function' || type.prototype == null) {
    throw new Error(`Cannot instrument missing diagnostic class for method '${method}'.`);
  }
  return {
    prototype: type.prototype,
    method,
    label: `${type.name}.${method}`,
  };
}

function installDiagnosticProfiler(targets) {
  const targetLabels = targets.map((target) => target.label);
  const restorers = [];
  let activeOperation = null;

  const profiler = {
    beginOperation(label) {
      if (activeOperation != null) {
        throw new Error(`Diagnostic operation '${activeOperation.label}' is still active.`);
      }
      activeOperation = {
        label,
        rootLabel: 'ManagedSemanticWorkspaceSession.run',
        stack: [],
        methods: new Map(targetLabels.map((targetLabel) => [targetLabel, emptyDiagnosticMetric()])),
        edges: new Map(),
        maximumDepth: 0,
        stackErrors: [],
      };
    },
    endOperation() {
      const operation = activeOperation;
      if (operation == null) {
        throw new Error('No diagnostic operation is active.');
      }
      activeOperation = null;
      if (operation.stack.length > 0) {
        operation.stackErrors.push(
          `Operation ended with ${operation.stack.length} unfinished instrumented call(s).`,
        );
        operation.stack.length = 0;
      }
      return diagnosticOperationResult(operation, targetLabels);
    },
    invoke(target, receiver, original, args) {
      const operation = activeOperation;
      if (operation == null) {
        return Reflect.apply(original, receiver, args);
      }
      const caller = operation.stack.at(-1)?.target.label ?? operation.rootLabel;
      const frame = {
        target,
        caller,
        started: process.hrtime.bigint(),
        childInclusiveNanoseconds: 0n,
      };
      operation.stack.push(frame);
      operation.maximumDepth = Math.max(operation.maximumDepth, operation.stack.length);
      let result;
      try {
        result = Reflect.apply(original, receiver, args);
      } catch (error) {
        finishDiagnosticInvocation(operation, frame, true);
        throw error;
      }
      if (result != null && typeof result.then === 'function') {
        return Promise.resolve(result).then(
          (value) => {
            finishDiagnosticInvocation(operation, frame, false);
            return value;
          },
          (error) => {
            finishDiagnosticInvocation(operation, frame, true);
            throw error;
          },
        );
      }
      finishDiagnosticInvocation(operation, frame, false);
      return result;
    },
    restore() {
      for (const restore of restorers.reverse()) {
        restore();
      }
    },
  };

  for (const target of targets) {
    const previousOwnDescriptor = Object.getOwnPropertyDescriptor(target.prototype, target.method);
    const original = target.prototype[target.method];
    if (typeof original !== 'function') {
      throw new Error(`Diagnostic target '${target.label}' is not a callable prototype method.`);
    }
    Object.defineProperty(target.prototype, target.method, {
      configurable: true,
      enumerable: previousOwnDescriptor?.enumerable ?? false,
      writable: true,
      value: function diagnosticMethodWrapper(...args) {
        return profiler.invoke(target, this, original, args);
      },
    });
    restorers.push(() => {
      if (previousOwnDescriptor == null) {
        delete target.prototype[target.method];
      } else {
        Object.defineProperty(target.prototype, target.method, previousOwnDescriptor);
      }
    });
  }
  return profiler;
}

function finishDiagnosticInvocation(operation, frame, failed) {
  const elapsedNanoseconds = process.hrtime.bigint() - frame.started;
  const exclusiveNanoseconds = elapsedNanoseconds >= frame.childInclusiveNanoseconds
    ? elapsedNanoseconds - frame.childInclusiveNanoseconds
    : 0n;
  recordDiagnosticMetric(
    operation.methods.get(frame.target.label),
    elapsedNanoseconds,
    exclusiveNanoseconds,
    failed,
  );
  const edgeKey = `${frame.caller}\0${frame.target.label}`;
  let edge = operation.edges.get(edgeKey);
  if (edge == null) {
    edge = {
      caller: frame.caller,
      callee: frame.target.label,
      metric: emptyDiagnosticMetric(),
    };
    operation.edges.set(edgeKey, edge);
  }
  recordDiagnosticMetric(edge.metric, elapsedNanoseconds, exclusiveNanoseconds, failed);

  const frameIndex = operation.stack.lastIndexOf(frame);
  if (frameIndex !== operation.stack.length - 1) {
    operation.stackErrors.push(
      `Call '${frame.target.label}' completed out of stack order at depth ${frameIndex + 1}.`,
    );
  }
  if (frameIndex >= 0) {
    const parentFrame = operation.stack[frameIndex - 1];
    if (parentFrame != null) {
      parentFrame.childInclusiveNanoseconds += elapsedNanoseconds;
    }
    operation.stack.splice(frameIndex, 1);
  }
}

function emptyDiagnosticMetric() {
  return {
    calls: 0,
    failures: 0,
    inclusiveNanoseconds: 0n,
    exclusiveNanoseconds: 0n,
    minimumNanoseconds: null,
    maximumNanoseconds: 0n,
    minimumExclusiveNanoseconds: null,
    maximumExclusiveNanoseconds: 0n,
  };
}

function recordDiagnosticMetric(metric, elapsedNanoseconds, exclusiveNanoseconds, failed) {
  metric.calls += 1;
  metric.failures += failed ? 1 : 0;
  metric.inclusiveNanoseconds += elapsedNanoseconds;
  metric.exclusiveNanoseconds += exclusiveNanoseconds;
  metric.minimumNanoseconds = metric.minimumNanoseconds == null
    || elapsedNanoseconds < metric.minimumNanoseconds
    ? elapsedNanoseconds
    : metric.minimumNanoseconds;
  metric.maximumNanoseconds = elapsedNanoseconds > metric.maximumNanoseconds
    ? elapsedNanoseconds
    : metric.maximumNanoseconds;
  metric.minimumExclusiveNanoseconds = metric.minimumExclusiveNanoseconds == null
    || exclusiveNanoseconds < metric.minimumExclusiveNanoseconds
    ? exclusiveNanoseconds
    : metric.minimumExclusiveNanoseconds;
  metric.maximumExclusiveNanoseconds = exclusiveNanoseconds > metric.maximumExclusiveNanoseconds
    ? exclusiveNanoseconds
    : metric.maximumExclusiveNanoseconds;
}

function diagnosticOperationResult(operation, targetLabels) {
  return {
    operation: operation.label,
    root: operation.rootLabel,
    maximumInstrumentedDepth: operation.maximumDepth,
    stackErrors: operation.stackErrors,
    methods: targetLabels.map((label) => ({
      label,
      ...diagnosticMetricResult(operation.methods.get(label)),
    })),
    edges: [...operation.edges.values()]
      .map((edge) => ({
        caller: edge.caller,
        callee: edge.callee,
        ...diagnosticMetricResult(edge.metric),
      }))
      .sort((left, right) =>
        right.inclusiveMilliseconds - left.inclusiveMilliseconds
        || left.caller.localeCompare(right.caller)
        || left.callee.localeCompare(right.callee)),
  };
}

function diagnosticMetricResult(metric) {
  return {
    calls: metric.calls,
    failures: metric.failures,
    inclusiveMilliseconds: nanosecondsToMilliseconds(metric.inclusiveNanoseconds),
    exclusiveMilliseconds: nanosecondsToMilliseconds(metric.exclusiveNanoseconds),
    meanInclusiveMilliseconds: metric.calls === 0
      ? 0
      : nanosecondsToMilliseconds(metric.inclusiveNanoseconds / BigInt(metric.calls)),
    meanExclusiveMilliseconds: metric.calls === 0
      ? 0
      : nanosecondsToMilliseconds(metric.exclusiveNanoseconds / BigInt(metric.calls)),
    minimumInclusiveMilliseconds: metric.minimumNanoseconds == null
      ? 0
      : nanosecondsToMilliseconds(metric.minimumNanoseconds),
    maximumInclusiveMilliseconds: nanosecondsToMilliseconds(metric.maximumNanoseconds),
    minimumExclusiveMilliseconds: metric.minimumExclusiveNanoseconds == null
      ? 0
      : nanosecondsToMilliseconds(metric.minimumExclusiveNanoseconds),
    maximumExclusiveMilliseconds: nanosecondsToMilliseconds(metric.maximumExclusiveNanoseconds),
  };
}

function nanosecondsToMilliseconds(value) {
  return roundMilliseconds(Number(value) / 1e6);
}

function runFreshChild(config, processIndex) {
  return new Promise((resolve, reject) => {
    const child = fork(scriptPath, ['--child'], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        [CHILD_CONFIG_ENV]: JSON.stringify(config),
      },
      execArgv: [],
      silent: true,
    });
    const output = createCapturedOutput();
    let childMessage = null;
    child.stdout?.on('data', (chunk) => output.stdout.append(chunk));
    child.stderr?.on('data', (chunk) => output.stderr.append(chunk));
    child.on('message', (message) => {
      childMessage = message;
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const capturedOutput = output.finish();
      if (childMessage?.kind === 'result' && code === 0) {
        resolve({
          lane: config.lane,
          ...(processIndex == null ? {} : { processIndex }),
          ...childMessage.result,
          capturedOutput,
        });
        return;
      }
      const childError = childMessage?.kind === 'error'
        ? formatSerializedError(childMessage.error)
        : `child exited with code ${code ?? 'null'} and signal ${signal ?? 'none'}`;
      const stderr = capturedOutput.stderr.trim();
      reject(new Error(
        `Managed query latency ${config.lane} process${processIndex == null ? '' : ` ${processIndex}`} failed: ${childError}`
        + (stderr.length === 0 ? '' : `\n${stderr}`),
      ));
    });
  });
}

function createCapturedOutput() {
  const limit = 16_384;
  const streams = {
    stdout: { bytes: 0, text: '' },
    stderr: { bytes: 0, text: '' },
  };
  return {
    stdout: { append: (chunk) => appendCapturedOutput(streams.stdout, chunk, limit) },
    stderr: { append: (chunk) => appendCapturedOutput(streams.stderr, chunk, limit) },
    finish: () => ({
      stdoutBytes: streams.stdout.bytes,
      stderrBytes: streams.stderr.bytes,
      stdout: streams.stdout.text,
      stderr: streams.stderr.text,
      truncated: streams.stdout.bytes > Buffer.byteLength(streams.stdout.text)
        || streams.stderr.bytes > Buffer.byteLength(streams.stderr.text),
    }),
  };
}

function appendCapturedOutput(target, chunk, limit) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  target.bytes += bytes.length;
  const retainedBytes = Buffer.byteLength(target.text);
  if (retainedBytes >= limit) {
    return;
  }
  target.text += bytes.subarray(0, limit - retainedBytes).toString('utf8');
}

async function reproducibilityMetadata(options, outputPath) {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const cpuModels = [...new Set(os.cpus().map((cpu) => cpu.model))];
  return {
    repository: {
      root: repositoryRoot,
      commit: gitValue(['rev-parse', 'HEAD']),
      branch: gitValue(['branch', '--show-current']),
      dirty: gitDirty(),
    },
    package: {
      name: packageJson.name,
      version: packageJson.version,
    },
    artifacts: {
      harnessSha256: await fileSha256(scriptPath),
      semanticRuntimeOutSha256: await directorySha256(path.join(packageRoot, 'out')),
      fixtureSha256: await directorySha256(baselineFixtureRoot),
    },
    host: {
      platform: process.platform,
      architecture: process.arch,
      release: os.release(),
      cpuModels,
      logicalCpuCount: os.cpus().length,
      availableParallelism: os.availableParallelism(),
      totalMemoryBytes: os.totalmem(),
    },
    node: {
      version: process.version,
      versions: {
        v8: process.versions.v8,
        uv: process.versions.uv,
      },
      execPath: process.execPath,
      childExecArgv: [],
      nodeOptions: process.env.NODE_OPTIONS ?? null,
    },
    invocation: {
      workingDirectory: process.cwd(),
      outputPath,
      processes: options.processes,
      warmRuns: options.warmRuns,
      diagnostic: options.diagnostic,
      resourceInventoryProjection: options.projection,
    },
  };
}

function summarizeProcesses(processes, warmRuns) {
  const startupProcess = processes[0];
  const remainingProcesses = processes.slice(1);
  return {
    startupWarmupProcess: {
      label: 'process-0-startup-warmup-cohort',
      processIndex: startupProcess.processIndex,
      coldMilliseconds: startupProcess.cold.milliseconds,
      warm: startupProcess.warm.map((run) => ({
        warmRun: run.warmRun,
        milliseconds: run.milliseconds,
      })),
    },
    remainingProcesses: remainingProcesses.length === 0
      ? {
          label: 'process-1-and-later-steady-cohort',
          processIndexes: [],
          note: 'No remaining process samples were requested.',
          cold: null,
          warmAll: null,
          warmByOrdinal: [],
        }
      : {
          label: 'process-1-and-later-steady-cohort',
          processIndexes: remainingProcesses.map((entry) => entry.processIndex),
          ...processCohortStatistics(remainingProcesses, warmRuns),
        },
    allProcesses: {
      label: 'all-primary-processes-including-process-0',
      processIndexes: processes.map((entry) => entry.processIndex),
      ...processCohortStatistics(processes, warmRuns),
    },
  };
}

function processCohortStatistics(processes, warmRuns) {
  return {
    cold: statistics(processes.map((entry) => entry.cold.milliseconds)),
    warmAll: statistics(processes.flatMap((entry) => entry.warm.map((run) => run.milliseconds))),
    warmByOrdinal: Array.from({ length: warmRuns }, (_, index) => ({
      warmRun: index + 1,
      ...statistics(processes.map((entry) => entry.warm[index].milliseconds)),
    })),
    routedAnswer: {
      cold: routedAnswerProfileStatistics(processes.map((entry) => entry.cold.routedAnswerProfile)),
      warmAll: routedAnswerProfileStatistics(
        processes.flatMap((entry) => entry.warm.map((run) => run.routedAnswerProfile)),
      ),
      warmByOrdinal: Array.from({ length: warmRuns }, (_, index) => ({
        warmRun: index + 1,
        ...routedAnswerProfileStatistics(
          processes.map((entry) => entry.warm[index].routedAnswerProfile),
        ),
      })),
    },
  };
}

function routedAnswerProfileStatistics(profiles) {
  return {
    preflight: statistics(profiles.map((profile) => profile.preflightMilliseconds)),
    answerTransaction: statistics(profiles.map((profile) => profile.answerTransactionMilliseconds)),
    longestUninterrupted: statistics(
      profiles.map((profile) => profile.longestUninterruptedMilliseconds),
    ),
  };
}

function statistics(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance = sorted.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / sorted.length;
  const median = percentile(sorted, 0.5);
  const absoluteDeviations = sorted
    .map((value) => Math.abs(value - median))
    .sort((left, right) => left - right);
  return {
    samples: sorted.length,
    minimumMilliseconds: roundMilliseconds(sorted[0]),
    medianMilliseconds: roundMilliseconds(median),
    medianAbsoluteDeviationMilliseconds: roundMilliseconds(percentile(absoluteDeviations, 0.5)),
    meanMilliseconds: roundMilliseconds(mean),
    p95Milliseconds: roundMilliseconds(percentile(sorted, 0.95)),
    maximumMilliseconds: roundMilliseconds(sorted[sorted.length - 1]),
    standardDeviationMilliseconds: roundMilliseconds(Math.sqrt(variance)),
  };
}

function percentile(sorted, fraction) {
  if (sorted.length === 1) {
    return sorted[0];
  }
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] + ((sorted[upper] - sorted[lower]) * weight);
}

function summarizeSemanticOutcomes(outcomes, projection) {
  const encoded = outcomes.map((outcome) => JSON.stringify(outcome));
  const first = outcomes[0] ?? null;
  const matchesHistoricalCardinalityBaseline = first != null
    && first.result === 'answered'
    && first.projectKey === baselineProjectKey
    && first.returnedRows === historicalBaseline.returnedRows
    && first.totalRows === historicalBaseline.returnedRows
    && first.pageExhausted === true;
  const matchesSelectedProjection = first != null
    && first.typeSurfacesIncluded === projection.includeTypeSurfaces;
  return {
    stableAcrossRuns: new Set(encoded).size <= 1,
    matchesHistoricalBaseline: projection.name === historicalBaseline.resourceInventoryProjection
      && matchesHistoricalCardinalityBaseline
      && matchesSelectedProjection,
    matchesHistoricalCardinalityBaseline,
    matchesSelectedProjection,
    observed: first,
    note: 'Exact project-input leaf counts are intentionally not sampled in this unperturbed timing lane; compact projection intentionally does not match the historical rich payload.',
  };
}

function parseCliOptions(args) {
  let outputPath = null;
  let processes = 9;
  let warmRuns = 5;
  let diagnostic = false;
  let projection = 'historical-rich';
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      outputPath = requireCliValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--processes') {
      processes = positiveInteger(requireCliValue(args, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--warm-runs') {
      warmRuns = positiveInteger(requireCliValue(args, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--diagnostic') {
      diagnostic = true;
      continue;
    }
    if (arg === '--projection') {
      projection = requireCliValue(args, index, arg);
      readResourceInventoryProjection(projection);
      index += 1;
      continue;
    }
    throw new Error(`Unknown managed query latency option '${arg}'.\n\n${usageText()}`);
  }
  if (!help && outputPath == null) {
    throw new Error(`--output is required.\n\n${usageText()}`);
  }
  return { outputPath, processes, warmRuns, diagnostic, projection, help };
}

function parseChildConfig(text) {
  if (text == null || text.length === 0) {
    throw new Error(`Missing ${CHILD_CONFIG_ENV}.`);
  }
  const candidate = JSON.parse(text);
  const projection = readResourceInventoryProjection(candidate?.resourceInventoryProjection);
  if (candidate?.fixtureRoot !== baselineFixtureRoot
    || candidate?.projectKey !== baselineProjectKey
    || candidate?.query?.kind !== 'resource-inventory'
    || candidate?.query?.inquiryProfile !== 'mcp-orientation'
    || candidate?.query?.appRetention !== 'retain-app'
    || candidate?.query?.telemetry == null
    || Object.keys(candidate.query.telemetry).length !== 0
    || candidate?.query?.page?.size !== 100
    || candidate?.query?.includeTypeSurfaces !== projection.includeTypeSurfaces
    || (candidate?.lane !== 'primary' && candidate?.lane !== 'diagnostic')) {
    throw new Error('Managed query latency child received a non-baseline benchmark shape.');
  }
  return {
    fixtureRoot: candidate.fixtureRoot,
    projectKey: candidate.projectKey,
    resourceInventoryProjection: projection.name,
    query: candidate.query,
    warmRuns: positiveInteger(candidate.warmRuns, 'warmRuns'),
    lane: candidate.lane,
  };
}

function requireCliValue(args, index, option) {
  const value = args[index + 1];
  if (value == null || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function positiveInteger(value, label) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== String(value)) {
    throw new Error(`${label} must be a positive integer; received '${value}'.`);
  }
  return parsed;
}

function readResourceInventoryProjection(value) {
  if (typeof value !== 'string' || !Object.hasOwn(resourceInventoryProjections, value)) {
    throw new Error(
      `--projection must be 'historical-rich' or 'compact'; received '${value}'.`,
    );
  }
  const projection = resourceInventoryProjections[value];
  return projection;
}

function baselineQuery(projection) {
  return Object.freeze({
    kind: 'resource-inventory',
    inquiryProfile: 'mcp-orientation',
    appRetention: 'retain-app',
    telemetry: Object.freeze({}),
    includeTypeSurfaces: projection.includeTypeSurfaces,
    page: Object.freeze({ size: 100 }),
  });
}

function usageText() {
  return [
    'Managed semantic-runtime ResourceInventory latency harness',
    '',
    'Usage:',
    '  pnpm --filter @aurelia-ls/semantic-runtime profile:managed-query-latency -- --output <file>',
    '',
    'Options:',
    '  -o, --output <file>   Required JSON result path.',
    '  --processes <count>   Fresh sequential primary child processes (default: 9).',
    '  --warm-runs <count>   Warm session.run calls after each cold call (default: 5).',
    '  --projection <kind>   ResourceInventory projection: historical-rich or compact',
    '                        (default: historical-rich).',
    '  --diagnostic          Run one separately isolated, non-authoritative call-topology child.',
    '  -h, --help            Show this help.',
    '',
    `Fixed baseline: ${baselineFixtureName}, explicit project '${baselineProjectKey}',`,
    "ResourceInventory, mcp-orientation, retain-app, page size 100; projection is selected explicitly.",
  ].join('\n');
}

async function fileSha256(fileName) {
  return createHash('sha256').update(await readFile(fileName)).digest('hex');
}

async function directorySha256(rootDir) {
  const hash = createHash('sha256');
  const files = await recursiveFiles(rootDir);
  for (const fileName of files) {
    const relativePath = path.relative(rootDir, fileName).replaceAll(path.sep, '/');
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await readFile(fileName));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function recursiveFiles(rootDir) {
  const files = [];
  const visit = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  };
  await visit(rootDir);
  return files;
}

function gitValue(args) {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.trim() || null : null;
}

function gitDirty() {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout.length > 0 : null;
}

function roundMilliseconds(value) {
  return Math.round(value * 1_000) / 1_000;
}

function sendChildMessage(message) {
  return new Promise((resolve, reject) => {
    process.send(message, (error) => error == null ? resolve() : reject(error));
  });
}

function serializeError(error) {
  return {
    name: error instanceof Error ? error.name : 'Error',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack ?? null : null,
  };
}

function formatSerializedError(error) {
  if (error == null || typeof error !== 'object') {
    return String(error);
  }
  return `${error.name ?? 'Error'}: ${error.message ?? 'unknown child failure'}`;
}

function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
