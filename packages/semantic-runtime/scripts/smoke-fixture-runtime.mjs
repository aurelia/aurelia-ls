import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const workspaceRequire = createRequire(path.join(workspaceRoot, 'package.json'));
const { chromium } = workspaceRequire('playwright');
const defaultFixtureRoot = path.join(packageRoot, 'fixtures/app-builder');
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aurelia-ls-fixture-runtime-'));

const start = Number(process.env.FIXTURE_RUNTIME_START ?? process.env.SMOKE_START ?? 0);
const limitValue = process.env.FIXTURE_RUNTIME_LIMIT ?? process.env.SMOKE_LIMIT;
const limit = limitValue == null ? Number.POSITIVE_INFINITY : Number(limitValue);
const keepTemp = process.env.FIXTURE_RUNTIME_KEEP_TEMP === '1';

const requestedRootSpecs = process.argv.slice(2);
const fixtureRootSpecs = requestedRootSpecs.length === 0
  ? [defaultFixtureRoot]
  : await Promise.all(requestedRootSpecs.map(resolveRequestedRoot));

try {
  const fixtureRoots = (await discoverRunnableFixtureRoots(fixtureRootSpecs)).slice(start, start + limit);
  const results = [];
  for (const fixtureRoot of fixtureRoots) {
    results.push(await smokeFixtureRuntime(fixtureRoot));
  }

  const failures = results.filter((result) => !result.ok);
  const summary = {
    ok: failures.length === 0,
    tempRoot: slash(tempRoot),
    start,
    limit: Number.isFinite(limit) ? limit : null,
    fixtureCount: results.length,
    failures,
    fixtures: results,
  };
  if (failures.length > 0) {
    console.error(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(summary, null, 2));
  }
} finally {
  if (!keepTemp && process.exitCode !== 1) {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function discoverRunnableFixtureRoots(rootSpecs) {
  const discovered = [];
  for (const root of rootSpecs) {
    await collectRunnableFixtureRoots(root, discovered);
  }
  return discovered.sort();
}

async function collectRunnableFixtureRoots(root, discovered) {
  const packageJson = await readJsonIfExists(path.join(root, 'package.json'));
  const hasRuntimeShape = packageJson?.scripts?.check != null
    && packageJson.scripts?.build != null
    && await fileExists(path.join(root, 'index.html'));
  if (hasRuntimeShape) {
    discovered.push(root);
    return;
  }
  for (const entry of await readdirIfExists(root)) {
    if (entry.isDirectory()) {
      await collectRunnableFixtureRoots(path.join(root, entry.name), discovered);
    }
  }
}

async function smokeFixtureRuntime(fixtureRoot) {
  const fixtureName = slash(path.relative(packageRoot, fixtureRoot));
  const copiedRoot = await copyFixture(fixtureRoot);
  const install = runShell('pnpm install --silent --no-frozen-lockfile', copiedRoot, 180_000);
  if (!install.ok) {
    return failedFixture(fixtureName, 'install', install, copiedRoot);
  }
  const check = runShell('pnpm check', copiedRoot, 120_000);
  if (!check.ok) {
    return failedFixture(fixtureName, 'check', check, copiedRoot);
  }
  const build = runShell('pnpm build', copiedRoot, 120_000);
  if (!build.ok) {
    return failedFixture(fixtureName, 'build', build, copiedRoot);
  }
  const render = await renderFixture(copiedRoot);
  if (!render.ok) {
    return failedFixture(fixtureName, 'render', render, copiedRoot);
  }
  return {
    fixture: fixtureName,
    ok: true,
    copiedRoot: slash(copiedRoot),
    render: {
      bodyTextLength: render.bodyTextLength,
      bodyHtmlLength: render.bodyHtmlLength,
    },
  };
}

async function copyFixture(fixtureRoot) {
  const copiedRoot = path.join(tempRoot, safeFileName(path.relative(packageRoot, fixtureRoot)));
  await rm(copiedRoot, { recursive: true, force: true });
  await cp(fixtureRoot, copiedRoot, { recursive: true });
  return copiedRoot;
}

async function renderFixture(root) {
  const fixtureRequire = createRequire(path.join(root, 'package.json'));
  const { createServer } = await import(pathToFileURL(fixtureRequire.resolve('vite')).href);
  const server = await createServer({
    root,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
      hmr: false,
    },
  });
  const errors = [];
  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    const port = typeof address === 'object' && address != null ? address.port : null;
    if (port == null) {
      throw new Error('Vite server did not expose a port.');
    }
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console:${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      errors.push(`pageerror:${error.message}`);
    });
    await page.goto(`http://127.0.0.1:${port}/`, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });
    await page.waitForTimeout(500);
    const bodyText = (await page.locator('body').innerText({ timeout: 5_000 })).trim();
    const bodyHtmlLength = await page.locator('body').evaluate((body) => body.innerHTML.length);
    if (bodyText.length === 0 || bodyHtmlLength < 10) {
      errors.push(`blank-or-thin-render:text=${bodyText.length}:html=${bodyHtmlLength}`);
    }
    return {
      ok: errors.length === 0,
      bodyTextLength: bodyText.length,
      bodyHtmlLength,
      errors,
    };
  } finally {
    if (browser != null) {
      await browser.close();
    }
    await server.close();
  }
}

function runShell(command, cwd, timeout) {
  const shellCommand = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const shellArgs = process.platform === 'win32' ? ['/d', '/c', command] : ['-c', command];
  const result = spawnSync(shellCommand, shellArgs, {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    ok: result.status === 0,
    command,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout?.slice(-4_000) ?? '',
    stderr: result.stderr?.slice(-4_000) ?? '',
  };
}

function failedFixture(fixture, phase, detail, copiedRoot) {
  return {
    fixture,
    ok: false,
    copiedRoot: slash(copiedRoot),
    phase,
    detail,
  };
}

async function resolveRequestedRoot(arg) {
  if (path.isAbsolute(arg)) {
    return path.resolve(arg);
  }
  const candidates = [
    path.resolve(packageRoot, arg),
    path.resolve(workspaceRoot, arg),
    path.resolve(process.cwd(), arg),
  ];
  for (const candidate of candidates) {
    if (await directoryExists(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function directoryExists(dirPath) {
  try {
    await readdir(dirPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') {
      return false;
    }
    throw error;
  }
}

async function readdirIfExists(dirPath) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function safeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, '__');
}

function slash(value) {
  return value.replace(/\\/g, '/');
}
