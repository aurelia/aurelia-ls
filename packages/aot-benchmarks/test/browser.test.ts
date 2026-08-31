import { createHash } from 'node:crypto';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

const launch = vi.fn(async () => ({
  version: () => '151.0.8123.4',
  close: vi.fn(async () => {}),
}));

vi.mock('playwright', () => ({ chromium: { launch } }));

const {
  BENCHMARK_CHROME_ENVIRONMENT_VARIABLE,
  conventionalChromeSearchPlan,
  resolveBenchmarkBrowserDriverIdentity,
  resolveBenchmarkBrowserIdentity,
  resolveBenchmarkChromeExecutable,
} = await import('../src/browser.js');
const {
  BENCHMARK_BROWSER_FLAGS,
  BENCHMARK_BROWSER_VIEWPORT,
} = await import('../src/tachometer.js');

const temporaryRoots: string[] = [];

afterEach(async () => {
  launch.mockClear();
  await Promise.all(temporaryRoots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('benchmark Chrome identity', () => {
  test('uses the explicit benchmark Chrome path and refuses to fall back when it is invalid', async () => {
    const binary = await fakeChrome('explicit chrome');
    await expect(resolveBenchmarkChromeExecutable({
      environment: { [BENCHMARK_CHROME_ENVIRONMENT_VARIABLE]: binary },
    })).resolves.toBe(await real(binary));

    await expect(resolveBenchmarkChromeExecutable({
      environment: { [BENCHMARK_CHROME_ENVIRONMENT_VARIABLE]: `${binary}.missing` },
    })).rejects.toThrow(/does not name an executable file/u);
    await expect(resolveBenchmarkChromeExecutable({
      environment: { [BENCHMARK_CHROME_ENVIRONMENT_VARIABLE]: '' },
    })).rejects.toThrow(/set but empty/u);
  });

  test('defines conventional Google Chrome paths and commands per platform', () => {
    expect(conventionalChromeSearchPlan('win32', {
      ProgramFiles: 'C:\\Program Files',
      'ProgramFiles(x86)': 'C:\\Program Files (x86)',
      LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local',
    }, 'C:\\Users\\test')).toEqual({
      paths: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\test\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      ],
      commands: ['chrome.exe'],
    });
    expect(conventionalChromeSearchPlan('darwin', {}, '/Users/test')).toEqual({
      paths: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Users/test/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      ],
      commands: [],
    });
    expect(conventionalChromeSearchPlan('linux', {}, '/home/test')).toEqual({
      paths: [
        '/opt/google/chrome/chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
      ],
      commands: ['google-chrome-stable', 'google-chrome'],
    });
  });

  test('launches and identifies the exact hashed binary with the Tachometer browser envelope', async () => {
    const content = 'exact chrome executable';
    const binary = await fakeChrome(content);
    const resolved = await resolveBenchmarkBrowserIdentity({
      environment: { [BENCHMARK_CHROME_ENVIRONMENT_VARIABLE]: binary },
    });

    expect(resolved.executablePath).toBe(await real(binary));
    expect(resolved.identity).toEqual({
      name: 'chrome',
      version: '151.0.8123.4',
      executableSha256: createHash('sha256').update(content).digest('hex'),
      flags: BENCHMARK_BROWSER_FLAGS,
      viewport: BENCHMARK_BROWSER_VIEWPORT,
      headless: true,
    });
    expect(launch).toHaveBeenCalledWith({
      executablePath: await real(binary),
      headless: true,
      args: [...BENCHMARK_BROWSER_FLAGS],
    });
  });

  test('fails clearly for an unsupported platform instead of using Playwright browser fallback', async () => {
    await expect(resolveBenchmarkChromeExecutable({
      environment: {},
      platform: 'aix',
      homeDirectory: '/home/test',
    })).rejects.toThrow(/No installed Google Chrome executable.*AURELIA_AOT_BENCHMARK_CHROME/us);
    expect(launch).not.toHaveBeenCalled();
  });

  test('fingerprints the pinned ChromeDriver and refuses a browser-major mismatch', async () => {
    const identity = await resolveBenchmarkBrowserDriverIdentity({
      repositoryRoot: path.resolve(import.meta.dirname, '../../..'),
      browserVersion: '151.0.8123.4',
    });
    expect(identity).toMatchObject({
      name: 'chromedriver',
      version: expect.stringMatching(/^151\.0\.5\/151\./u),
      entry: { sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) },
    });
    await expect(resolveBenchmarkBrowserDriverIdentity({
      repositoryRoot: path.resolve(import.meta.dirname, '../../..'),
      browserVersion: '152.0.1.2',
    })).rejects.toThrow(/does not support recorded Chrome/u);
  });
});

async function fakeChrome(content: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'aot-benchmark-browser-'));
  temporaryRoots.push(root);
  const binary = path.join(root, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
  await writeFile(binary, content);
  if (process.platform !== 'win32') await chmod(binary, 0o755);
  return binary;
}

async function real(value: string): Promise<string> {
  const { realpath } = await import('node:fs/promises');
  return realpath(value);
}
