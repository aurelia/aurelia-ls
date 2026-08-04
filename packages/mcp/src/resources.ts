import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listAureliaPatternMenuItems } from '@aurelia-ls/patterns';
import { readSemanticAppQueryCatalog } from '@aurelia-ls/semantic-runtime';
import { aureliaDocsIndexResourceValue } from './docs-runtime.js';
import {
  AURELIA_MCP_ORIENTATION_RESOURCE_TEXT,
  AURELIA_MCP_ORIENTATION_RESOURCE_URI,
} from './orientation.js';

export function registerAureliaSemanticRuntimeResources(
  server: McpServer,
): void {
  registerStaticTextResource(
    server,
    'aurelia_mcp_orientation',
    AURELIA_MCP_ORIENTATION_RESOURCE_URI,
    'Aurelia MCP Orientation',
    'Golden-path orientation for fresh MCP sessions, including query sequencing, source-file scoping, analysis-depth behavior, and cursor-position guidance.',
    AURELIA_MCP_ORIENTATION_RESOURCE_TEXT,
  );
  registerStaticJsonResource(
    server,
    'aurelia_pattern_menu',
    'aurelia://patterns/menu',
    'Aurelia Pattern Menu',
    'Curated Aurelia Patterns menu rows fetchable by stable patternId; fetched examples include support.followUp semantic-runtime hints.',
    async () => ({ items: listAureliaPatternMenuItems() }),
  );
  registerStaticJsonResource(
    server,
    'aurelia_docs_index',
    'aurelia://docs/index',
    'Aurelia Docs Index',
    'Bundled Aurelia docs corpus summary; search and fetch through aurelia_docs_search and aurelia_docs_fetch.',
    async () => aureliaDocsIndexResourceValue(),
  );
  registerStaticJsonResource(
    server,
    'aurelia_app_query_catalog',
    'aurelia://semantic-runtime/app-queries',
    'Aurelia App Query Catalog',
    'Supported semantic-runtime app query kinds and their locus, paging, detail, and router-product affordances.',
    async () => readSemanticAppQueryCatalog().value,
  );
}

function registerStaticTextResource(
  server: McpServer,
  name: string,
  uri: string,
  title: string,
  description: string,
  text: string,
): void {
  server.registerResource(
    name,
    uri,
    {
      title,
      description,
      mimeType: 'text/markdown',
    },
    async (resourceUri) => ({
      contents: [
        {
          uri: resourceUri.href,
          mimeType: 'text/markdown',
          text,
        },
      ],
    }),
  );
}

function registerStaticJsonResource(
  server: McpServer,
  name: string,
  uri: string,
  title: string,
  description: string,
  read: () => Promise<unknown>,
): void {
  server.registerResource(
    name,
    uri,
    {
      title,
      description,
      mimeType: 'application/json',
    },
    async (resourceUri) => ({
      contents: [
        {
          uri: resourceUri.href,
          mimeType: 'application/json',
          text: JSON.stringify(await read(), null, 2),
        },
      ],
    }),
  );
}
