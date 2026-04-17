#!/usr/bin/env node

import { startHostServiceServer } from './service-server.js';

const endpoint = readRequiredOption(process.argv.slice(2), '--endpoint');

await startHostServiceServer({
  endpoint,
});

function readRequiredOption(
  args: readonly string[],
  flag: string,
): string {
  const index = args.indexOf(flag);
  const value = index === -1 ? undefined : args[index + 1];
  if (!value) {
    throw new Error(`Missing required ${flag} for source-analysis host daemon.`);
  }
  return value;
}
