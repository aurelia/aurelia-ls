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
registerAureliaSemanticRuntimeResources(server, adapter);
registerAureliaSemanticRuntimeTools(server, adapter);

await server.connect(new StdioServerTransport());
