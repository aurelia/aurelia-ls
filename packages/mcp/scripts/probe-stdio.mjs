import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const fixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-minimal-app');
const stateBackedFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/authoring/generated-state-backed-form');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['out/server.js'],
  cwd: packageRoot,
});
const client = new Client({ name: 'au-mcp-probe', version: '0.0.0' });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const outputSchemaCount = tools.tools.filter((tool) => tool.outputSchema != null).length;
  const readOnlyToolCount = tools.tools.filter((tool) => tool.annotations?.readOnlyHint === true).length;
  const cacheTool = tools.tools.find((tool) => tool.name === 'aurelia_clear_analysis_cache');
  const catalog = await client.callTool({
    name: 'aurelia_authoring_catalog',
    arguments: { catalogView: 'overview' },
  });
  const appQueryCatalog = await client.callTool({
    name: 'aurelia_app_query_catalog',
    arguments: { group: 'router' },
  });
  const workspaceOverview = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: fixtureWorkspaceRoot, projectDiscovery: 'single-root' },
  });
  const workspaceOverviewWithProjectRows = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: fixtureWorkspaceRoot, projectDiscovery: 'single-root', projectPage: { size: 1 } },
  });
  const templateCompletions = await client.callTool({
    name: 'aurelia_template_completions',
    arguments: {
      workspaceRoot: stateBackedFixtureWorkspaceRoot,
      projectDiscovery: 'single-root',
      cursor: { filePath: 'src/components/state-backed-form.html', line: 2, character: 43 },
      page: { size: 3 },
    },
  });
  const cacheOverview = await client.callTool({
    name: 'aurelia_analysis_cache_overview',
    arguments: {},
  });
  const recipePlan = await client.callTool({
    name: 'aurelia_authoring_recipe_plan',
    arguments: { recipeKey: 'state-backed-form' },
  });
  const recipePlanResourceLinks = recipePlan.content.filter((block) => block.type === 'resource_link').length;
  const resources = await client.listResources();
  const recipeResource = await client.readResource({ uri: 'aurelia://authoring/recipes' });
  const appQueryResource = await client.readResource({ uri: 'aurelia://semantic-runtime/app-queries' });
  const recipeResourceText = recipeResource.contents[0]?.text;
  const recipeResourceValue = typeof recipeResourceText === 'string'
    ? JSON.parse(recipeResourceText)
    : null;
  const appQueryResourceText = appQueryResource.contents[0]?.text;
  const appQueryResourceValue = typeof appQueryResourceText === 'string'
    ? JSON.parse(appQueryResourceText)
    : null;
  const prompts = await client.listPrompts();
  const orientPrompt = await client.getPrompt({
    name: 'aurelia_orient_workspace',
    arguments: { workspaceRoot: '.' },
  });

  console.log('au-mcp stdio probe');
  console.log(`- tools: ${tools.tools.length}`);
  console.log(`- output schemas: ${outputSchemaCount}`);
  console.log(`- read-only tool annotations: ${readOnlyToolCount}`);
  console.log(`- cache tool idempotent: ${cacheTool?.annotations?.idempotentHint === true ? 'yes' : 'no'}`);
  console.log(`- catalog: ${catalog.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- app query catalog: ${appQueryCatalog.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- workspace overview: ${workspaceOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- workspace project rows: ${workspaceOverviewWithProjectRows.structuredContent?.value?.page?.returnedRows ?? 'missing row count'}`);
  console.log(`- template completions: ${templateCompletions.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- cache overview: ${cacheOverview.structuredContent?.value?.summary ?? 'missing structured summary'}`);
  console.log(`- recipe plan resource links: ${recipePlanResourceLinks}`);
  console.log(`- resources: ${resources.resources.length}`);
  console.log(`- recipe resource contents: ${recipeResource.contents.length}`);
  console.log(`- recipe resource summary: ${recipeResourceValue?.summary ?? 'missing summary'}`);
  console.log(`- app query resource summary: ${appQueryResourceValue?.summary ?? 'missing summary'}`);
  console.log(`- prompts: ${prompts.prompts.length}`);
  console.log(`- orient prompt messages: ${orientPrompt.messages.length}`);

  if (
    tools.tools.length === 0
    || outputSchemaCount !== tools.tools.length
    || readOnlyToolCount !== tools.tools.length - 1
    || cacheTool?.annotations?.readOnlyHint !== false
    || cacheTool.annotations?.idempotentHint !== true
    || cacheTool.annotations?.destructiveHint !== false
    || cacheTool.annotations?.openWorldHint !== false
    || typeof appQueryCatalog.structuredContent?.value?.summary !== 'string'
    || typeof workspaceOverview.structuredContent?.value?.summary !== 'string'
    || workspaceOverview.structuredContent.value.page?.returnedRows !== 0
    || workspaceOverviewWithProjectRows.structuredContent?.value?.page?.returnedRows !== 1
    || typeof templateCompletions.structuredContent?.value?.summary !== 'string'
    || typeof templateCompletions.structuredContent.value.outcome !== 'string'
    || typeof cacheOverview.structuredContent?.value?.summary !== 'string'
    || typeof cacheOverview.structuredContent?.value?.totalSessions !== 'number'
    || cacheOverview.structuredContent.value.totalSessions < 1
    || recipePlanResourceLinks === 0
    || recipeResource.contents.length === 0
    || typeof recipeResourceValue?.summary !== 'string'
    || appQueryResource.contents.length === 0
    || typeof appQueryResourceValue?.summary !== 'string'
    || prompts.prompts.length === 0
    || orientPrompt.messages.length === 0
  ) {
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
