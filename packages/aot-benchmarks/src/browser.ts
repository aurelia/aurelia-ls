import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { access, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { chromium } from 'playwright';

import { createBrowserIdentity } from './environment.js';
import {
  BENCHMARK_BROWSER_FLAGS,
  BENCHMARK_BROWSER_VIEWPORT,
} from './tachometer.js';
import type { BrowserIdentity, Sha256 } from './contracts.js';

const execFileAsync = promisify(execFile);

export const BENCHMARK_CHROME_ENVIRONMENT_VARIABLE = 'AURELIA_AOT_BENCHMARK_CHROME' as const;

export interface BenchmarkBrowserResolution {
  readonly executablePath: string;
  readonly identity: BrowserIdentity;
}

export interface ChromeSearchPlan {
  readonly paths: readonly string[];
  readonly commands: readonly string[];
}

export async function resolveBenchmarkBrowserIdentity(options: {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly platform?: typeof process.platform;
  readonly homeDirectory?: string;
} = {}): Promise<BenchmarkBrowserResolution> {
  const executablePath = await resolveBenchmarkChromeExecutable(options);
  const executableSha256 = await hashFile(executablePath);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [...BENCHMARK_BROWSER_FLAGS],
  });
  let version: string;
  try {
    version = browser.version();
  } finally {
    await browser.close();
  }
  if (version.trim().length === 0) throw new Error(`Chrome at "${executablePath}" returned no browser version.`);
  return {
    executablePath,
    identity: createBrowserIdentity({
      name: 'chrome',
      version,
      executableSha256,
      flags: BENCHMARK_BROWSER_FLAGS,
      viewport: BENCHMARK_BROWSER_VIEWPORT,
      headless: true,
    }),
  };
}

export async function resolveBenchmarkChromeExecutable(options: {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly platform?: typeof process.platform;
  readonly homeDirectory?: string;
} = {}): Promise<string> {
  const environment = options.environment ?? process.env;
  const explicit = environment[BENCHMARK_CHROME_ENVIRONMENT_VARIABLE];
  if (explicit !== undefined) {
    if (explicit.trim().length === 0) {
      throw new Error(`${BENCHMARK_CHROME_ENVIRONMENT_VARIABLE} is set but empty.`);
    }
    const resolved = await resolveExecutablePath(explicit);
    if (resolved === null) {
      throw new Error(`${BENCHMARK_CHROME_ENVIRONMENT_VARIABLE} does not name an executable file: ${explicit}`);
    }
    return resolved;
  }

  const platform = options.platform ?? process.platform;
  const plan = conventionalChromeSearchPlan(
    platform,
    environment,
    options.homeDirectory ?? homedir(),
  );
  for (const candidate of plan.paths) {
    const resolved = await resolveExecutablePath(candidate);
    if (resolved !== null) return resolved;
  }
  for (const command of plan.commands) {
    const located = await locateCommand(command, platform);
    if (located === null) continue;
    const resolved = await resolveExecutablePath(located);
    if (resolved !== null) return resolved;
  }

  throw new Error(
    `No installed Google Chrome executable was found for ${platform}. Set `
    + `${BENCHMARK_CHROME_ENVIRONMENT_VARIABLE} to the exact binary path. `
    + `Checked paths: ${plan.paths.join(', ') || '<none>'}; commands: ${plan.commands.join(', ') || '<none>'}.`,
  );
}

export function conventionalChromeSearchPlan(
  platform: typeof process.platform,
  environment: Readonly<Record<string, string | undefined>>,
  homeDirectory: string,
): ChromeSearchPlan {
  if (platform === 'win32') {
    const paths = [
      environment.ProgramFiles,
      environment['ProgramFiles(x86)'],
      environment.LOCALAPPDATA,
    ].filter((root): root is string => typeof root === 'string' && root.length > 0)
      .map(root => path.win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    return { paths: unique(paths), commands: ['chrome.exe'] };
  }
  if (platform === 'darwin') {
    return {
      paths: unique([
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        path.posix.join(homeDirectory, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      ]),
      commands: [],
    };
  }
  if (platform === 'linux') {
    return {
      paths: [
        '/opt/google/chrome/chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
      ],
      commands: ['google-chrome-stable', 'google-chrome'],
    };
  }
  return { paths: [], commands: [] };
}

async function resolveExecutablePath(candidate: string): Promise<string | null> {
  try {
    const resolved = await realpath(path.resolve(candidate));
    await access(resolved, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
    return resolved;
  } catch {
    return null;
  }
}

async function locateCommand(command: string, platform: typeof process.platform): Promise<string | null> {
  const locator = platform === 'win32' ? 'where.exe' : 'which';
  try {
    const { stdout } = await execFileAsync(locator, [command], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const first = stdout.split(/\r?\n/u).map(row => row.trim()).find(Boolean);
    return first ?? null;
  } catch {
    return null;
  }
}

async function hashFile(file: string): Promise<Sha256> {
  const hash = createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('data', chunk => hash.update(chunk));
    stream.once('error', reject);
    stream.once('end', resolve);
  });
  return hash.digest('hex') as Sha256;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
