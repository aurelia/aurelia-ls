import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type TachometerOrder = 'jit-aot' | 'aot-jit' | 'jit-jit';

export const BENCHMARK_BROWSER_VIEWPORT = {
  width: 1_024,
  height: 768,
  deviceScaleFactor: 1,
} as const;

export const BENCHMARK_BROWSER_FLAGS = [
  '--enable-precise-memory-info',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--no-sandbox',
] as const;

export interface TachometerMeasurement {
  readonly name: string;
  readonly mode: 'performance' | 'expression';
  readonly entryName?: string;
  readonly expression?: string;
}

export interface TachometerScenarioRequest {
  readonly scenarioId: string;
  readonly browserRoot: string;
  readonly pagePath: string;
  readonly measurements: readonly TachometerMeasurement[];
  readonly order: TachometerOrder;
  readonly resultPath: string;
  readonly configPath: string;
  readonly browserBinary: string;
  readonly sampleSize?: number;
  readonly timeoutMinutes?: number;
  readonly exposeGc?: boolean;
}

export async function writeTachometerScenarioConfig(request: TachometerScenarioRequest): Promise<void> {
  await mkdir(path.dirname(request.configPath), { recursive: true });
  const variants = request.order === 'jit-aot'
    ? ([{ role: 'base', mode: 'jit' }, { role: 'candidate', mode: 'aot' }] as const)
    : request.order === 'aot-jit'
      ? ([{ role: 'base', mode: 'aot' }, { role: 'candidate', mode: 'jit' }] as const)
      : ([{ role: 'base', mode: 'jit' }, { role: 'candidate', mode: 'jit' }] as const);
  const flags = [
    ...(request.exposeGc === true ? ['--js-flags=--expose-gc'] : []),
    ...BENCHMARK_BROWSER_FLAGS,
  ];
  const config = {
    $schema: 'https://raw.githubusercontent.com/Polymer/tachometer/master/config.schema.json',
    root: request.browserRoot,
    ...(request.sampleSize == null ? {} : { sampleSize: request.sampleSize }),
    timeout: request.timeoutMinutes ?? 0.2,
    benchmarks: [{
      browser: {
        name: 'chrome',
        binary: request.browserBinary,
        headless: true,
        windowSize: {
          width: BENCHMARK_BROWSER_VIEWPORT.width,
          height: BENCHMARK_BROWSER_VIEWPORT.height,
        },
        addArguments: flags,
      },
      measurement: request.measurements,
      expand: variants.map(variant => ({
        name: `${request.scenarioId} ${variant.role}`,
        url: `${request.pagePath}${request.pagePath.includes('?') ? '&' : '?'}variant=${variant.role}&buildMode=${variant.mode}&order=${request.order}`,
      })),
    }],
  };
  await writeFile(request.configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function runTachometerScenario(request: TachometerScenarioRequest): Promise<void> {
  await writeTachometerScenarioConfig(request);
  await mkdir(path.dirname(request.resultPath), { recursive: true });
  const script = path.resolve(import.meta.dirname, '..', 'scripts', 'run-tachometer.mjs');
  const npmCache = path.join(path.dirname(request.resultPath), '.npm-cache');
  await spawnChecked(process.execPath, [
    script,
    '--config', request.configPath,
    '--json-file', request.resultPath,
  ], path.resolve(import.meta.dirname, '..'), {
    AURELIA_AOT_BENCHMARK_NPM_CACHE: npmCache,
  });
}

async function spawnChecked(
  command: string,
  args: readonly string[],
  cwd: string,
  environment: Readonly<Record<string, string>>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...environment },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(
        `Command '${command}' exited with ${code == null ? `signal ${signal ?? '<unknown>'}` : `code ${code}`}.`,
      ));
    });
  });
}
