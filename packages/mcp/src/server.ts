#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  AURELIA_MCP_SERVER_NAME,
  AURELIA_MCP_SERVER_VERSION,
} from './tool-contracts.js';
import { AURELIA_MCP_SERVER_INSTRUCTIONS } from './orientation.js';
import { registerAureliaSemanticRuntimePrompts } from './prompts.js';
import { registerAureliaSemanticRuntimeResources } from './resources.js';
import { AureliaMcpSemanticRuntimeAdapter } from './runtime-adapter.js';
import { registerAureliaSemanticRuntimeTools } from './tools.js';

const server = new McpServer({
  name: AURELIA_MCP_SERVER_NAME,
  version: AURELIA_MCP_SERVER_VERSION,
}, {
  instructions: AURELIA_MCP_SERVER_INSTRUCTIONS,
});
const adapter = new AureliaMcpSemanticRuntimeAdapter();

registerAureliaSemanticRuntimePrompts(server);
registerAureliaSemanticRuntimeResources(server);
registerAureliaSemanticRuntimeTools(server, adapter);

let shutdown: Promise<void> | null = null;

server.server.onclose = () => {
  void disposeAdapter().catch(reportShutdownError);
};
process.once('SIGINT', requestShutdown);
process.once('SIGTERM', requestShutdown);
process.stdin.once('end', requestShutdown);

await server.connect(new StdioServerTransport());

function requestShutdown(): void {
  void shutdownServer().catch(reportShutdownError);
}

function shutdownServer(): Promise<void> {
  if (shutdown != null) {
    return shutdown;
  }
  shutdown = (async () => {
    try {
      await server.close();
    } finally {
      await disposeAdapter();
    }
  })();
  return shutdown;
}

let adapterDisposal: Promise<void> | null = null;

function disposeAdapter(): Promise<void> {
  adapterDisposal ??= adapter.dispose();
  return adapterDisposal;
}

function reportShutdownError(error: unknown): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  process.stderr.write(`Aurelia MCP shutdown failed: ${message}\n`);
  process.exitCode = 1;
}
