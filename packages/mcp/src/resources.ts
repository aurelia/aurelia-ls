import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import process from 'node:process';
import {
  type SemanticAuthoringCatalogViewKind,
} from '@aurelia-ls/semantic-runtime';
import { AureliaMcpSemanticRuntimeAdapter } from './runtime-adapter.js';

export function registerAureliaSemanticRuntimeResources(
  server: McpServer,
  adapter: AureliaMcpSemanticRuntimeAdapter = new AureliaMcpSemanticRuntimeAdapter(),
): void {
  registerCatalogResource(
    server,
    adapter,
    'aurelia_authoring_catalog_overview',
    'aurelia://authoring/catalog',
    'Aurelia Authoring Catalog Overview',
    'Compact overview of semantic-runtime authoring capabilities, recipes, taste axes, and product-open reasons.',
    'overview',
  );
  registerCatalogResource(
    server,
    adapter,
    'aurelia_authoring_recipes',
    'aurelia://authoring/recipes',
    'Aurelia Authoring Recipes',
    'Recipe contracts, preferences, expected effects, and source-plan metadata without concrete source text.',
    'recipes',
  );
  registerCatalogResource(
    server,
    adapter,
    'aurelia_authoring_operations',
    'aurelia://authoring/operations',
    'Aurelia Authoring Operations',
    'Authoring operation families, actions, target kinds, and product-open reason hints.',
    'operations',
  );
  registerStaticJsonResource(
    server,
    'aurelia_app_query_catalog',
    'aurelia://semantic-runtime/app-queries',
    'Aurelia App Query Catalog',
    'Supported semantic-runtime app query kinds and their locus, paging, detail, and router-product affordances.',
    async () => (await adapter.appQueryCatalog({ workspaceRoot: process.cwd() })).value,
  );
}

function registerCatalogResource(
  server: McpServer,
  adapter: AureliaMcpSemanticRuntimeAdapter,
  name: string,
  uri: string,
  title: string,
  description: string,
  catalogView: Exclude<SemanticAuthoringCatalogViewKind, 'full'>,
): void {
  registerStaticJsonResource(
    server,
    name,
    uri,
    title,
    description,
    async () => (await adapter.authoringCatalog({
      workspaceRoot: process.cwd(),
      catalogView,
    })).value,
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
