import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import process from 'node:process';
import { AureliaMcpSemanticRuntimeAdapter } from './runtime-adapter.js';

export function registerAureliaSemanticRuntimeResources(
  server: McpServer,
  adapter: AureliaMcpSemanticRuntimeAdapter = new AureliaMcpSemanticRuntimeAdapter(),
): void {
  registerStaticJsonResource(
    server,
    'aurelia_app_query_catalog',
    'aurelia://semantic-runtime/app-queries',
    'Aurelia App Query Catalog',
    'Supported semantic-runtime app query kinds and their locus, paging, detail, and router-product affordances.',
    async () => (await adapter.appQueryCatalog({ workspaceRoot: process.cwd() })).value,
  );
  registerStaticJsonResource(
    server,
    'aurelia_app_builder_catalog',
    'aurelia://semantic-runtime/app-builder',
    'Aurelia App Builder Catalog',
    'Supported semantic-runtime app-builder query kinds for app-builder ontology/detail reads, recommendation policy, input readiness, source lowering, and opinionated part source lowering.',
    async () => (await adapter.appBuilderCatalog({ workspaceRoot: process.cwd() })).value,
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
