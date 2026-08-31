/* eslint-disable */
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

import fs from 'node:fs';
import path from 'node:path';
import { parseFlags } from 'tachometer/lib/flags.js';
import { makeConfig } from 'tachometer/lib/config.js';
import { Server } from 'tachometer/lib/server.js';
import {
  installGitDependency,
  makeServerPlans,
  prepareVersionDirectory,
} from 'tachometer/lib/versions.js';
import { manualMode } from 'tachometer/lib/manual.js';
import { Runner } from 'tachometer/lib/runner.js';

const npmCache = process.env.AURELIA_AOT_BENCHMARK_NPM_CACHE;
if (npmCache == null || npmCache.length === 0) {
  throw new Error('AURELIA_AOT_BENCHMARK_NPM_CACHE must identify the run-owned Tachometer cache.');
}
process.env.npm_config_cache = npmCache;
process.env.NPM_CONFIG_CACHE = npmCache;
fs.mkdirSync(npmCache, { recursive: true });

async function main(argv) {
  const opts = parseFlags(argv);
  const config = await makeConfig(opts);
  const { plans, gitInstalls } = await makeServerPlans(
    config.root,
    opts['npm-install-dir'],
    config.benchmarks,
  );
  await Promise.all(
    gitInstalls.map(install => installGitDependency(install, config.forceCleanNpmInstall)),
  );
  const servers = new Map();
  const preparations = [];
  for (const { npmInstalls, mountPoints, specs } of plans) {
    preparations.push(...npmInstalls.map(install => prepareVersionDirectory(
      install,
      config.forceCleanNpmInstall,
      config.npmrc,
    )));
    preparations.push((async () => {
      const server = await Server.start({
        host: opts.host,
        ports: opts.port,
        root: config.root,
        npmInstalls,
        mountPoints,
        resolveBareModules: config.resolveBareModules,
        cache: config.mode !== 'manual',
      });
      for (const spec of specs) servers.set(spec, server);
    })());
  }
  await Promise.all(preparations);
  if (config.mode === 'manual') {
    await manualMode(config, servers);
    return;
  }
  const runner = new Runner(config, servers);
  try {
    return await runner.run();
  } finally {
    await Promise.all([...new Set(servers.values())].map(server => server.close()));
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
