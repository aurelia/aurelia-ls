import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const minimalFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/app-pattern-minimal-app');
const routedFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/app-pattern-routed-state-backed-form');
const formFixtureWorkspaceRoot = path.resolve(packageRoot, '../semantic-runtime/fixtures/pressure/app-pattern-state-backed-form');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['out/server.js'],
  cwd: packageRoot,
});
const client = new Client({ name: 'au-mcp-probe', version: '0.0.0' });

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = new Set(tools.tools.map((tool) => tool.name));
  const prompts = await client.listPrompts();
  const promptNames = new Set(prompts.prompts.map((prompt) => prompt.name));
  const resources = await client.listResources();
  const resourceUris = new Set(resources.resources.map((resource) => resource.uri));

  assert(toolNames.has('aurelia_workspace_overview'), 'workspace overview tool is registered');
  assert(toolNames.has('aurelia_app_overview'), 'app overview tool is registered');
  assert(toolNames.has('aurelia_app_query_catalog'), 'app query catalog tool is registered');
  assert(toolNames.has('aurelia_app_query'), 'generic app query tool is registered');
  assert(toolNames.has('aurelia_app_query_batch'), 'app query batch tool is registered');
  assert(toolNames.has('aurelia_diagnostic_overview'), 'diagnostic overview tool is registered');
  assert(toolNames.has('aurelia_template_diagnostics'), 'template diagnostics tool is registered');
  assert(!toolNames.has('aurelia_authoring_recipe_plan'), 'legacy authoring recipe-plan tool is retired');
  assert(!toolNames.has('aurelia_app_building_guidance'), 'legacy app-building guidance tool is retired');
  assert(!toolNames.has('aurelia_authoring_orientation'), 'legacy authoring orientation tool is retired');

  assert(promptNames.has('aurelia_orient_workspace'), 'orientation prompt is registered');
  assert(promptNames.has('aurelia_inspect_app_feature'), 'feature inspection prompt is registered');
  assert(promptNames.has('aurelia_build_app_feature'), 'feature build prompt is registered');
  assert(!promptNames.has('aurelia_plan_authoring_recipe'), 'legacy authoring recipe prompt is retired');

  assert(resourceUris.has('aurelia://semantic-runtime/app-queries'), 'app query catalog resource is registered');
  assert(!resourceUris.has('aurelia://authoring/catalog'), 'legacy authoring catalog resource is retired');

  const queryCatalog = await client.callTool({
    name: 'aurelia_app_query_catalog',
    arguments: {},
  });
  assert(structuredSummary(queryCatalog).includes('query'), 'query catalog returned semantic-runtime summary text');

  const workspaceOverview = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: minimalFixtureWorkspaceRoot },
  });
  assert(structuredValue(workspaceOverview) != null, 'workspace overview returned structured content');

  const appOverview = await client.callTool({
    name: 'aurelia_app_overview',
    arguments: {
      workspaceRoot: routedFixtureWorkspaceRoot,
      analysisDepth: 'runtime-topology',
      diagnosticPageSize: 2,
      openSeamPageSize: 2,
    },
  });
  assert(structuredSummary(appOverview).includes('app') || structuredSummary(appOverview).includes('App'), 'app overview returned app summary');

  const batch = await client.callTool({
    name: 'aurelia_app_query_batch',
    arguments: {
      workspaceRoot: formFixtureWorkspaceRoot,
      analysisDepth: 'binding-observation',
      queries: [
        { kind: 'binding-value-channel-summary', page: { size: 0 } },
        { kind: 'binding-data-flow-summary', page: { size: 0 } },
        { kind: 'binding-observed-dependency-summary', page: { size: 0 } },
      ],
    },
  });
  const batchValue = structuredValue(batch);
  assert(Array.isArray(batchValue?.rows) && batchValue.rows.length === 3, 'app query batch returned three child answers');

  const diagnostics = await client.callTool({
    name: 'aurelia_diagnostic_overview',
    arguments: {
      workspaceRoot: formFixtureWorkspaceRoot,
      analysisDepth: 'binding-observation',
      diagnosticProjection: 'available-products',
    },
  });
  assert(structuredValue(diagnostics) != null, 'diagnostic overview returned structured content');

  const orientPrompt = await client.getPrompt({
    name: 'aurelia_orient_workspace',
    arguments: { workspaceRoot: formFixtureWorkspaceRoot, includeRouter: 'true' },
  });
  const orientPromptText = promptText(orientPrompt);
  assert(orientPromptText.includes('aurelia_workspace_overview'), 'orientation prompt names workspace overview');
  assert(orientPromptText.includes('aurelia_app_query_batch'), 'orientation prompt names app query batch');
  assert(!orientPromptText.includes('aurelia_authoring'), 'orientation prompt avoids legacy authoring tools');

  const buildPrompt = await client.getPrompt({
    name: 'aurelia_build_app_feature',
    arguments: {
      workspaceRoot: formFixtureWorkspaceRoot,
      featureGoal: 'Add a state-backed settings form',
      includeDiagnostics: 'true',
    },
  });
  const buildPromptText = promptText(buildPrompt);
  assert(buildPromptText.includes('aurelia_app_overview'), 'build prompt names app overview');
  assert(buildPromptText.includes('typescript-diagnostic-summary'), 'build prompt reminds clients to re-run TypeScript diagnostics');
  assert(!buildPromptText.includes('aurelia_authoring'), 'build prompt avoids legacy authoring tools');

  console.log([
    'MCP stdio probe passed.',
    `- tools: ${tools.tools.length}`,
    `- read-only tools: ${tools.tools.filter((tool) => tool.annotations?.readOnlyHint === true).length}`,
    `- prompts: ${prompts.prompts.length}`,
    `- resources: ${resources.resources.length}`,
  ].join('\n'));
} finally {
  await client.close();
}

function structuredValue(result) {
  return result?.structuredContent?.value?.value ?? result?.structuredContent?.value ?? null;
}

function structuredSummary(result) {
  const summary = result?.structuredContent?.value?.summary;
  return typeof summary === 'string' ? summary : '';
}

function promptText(result) {
  return (result.messages ?? []).map((message) => {
    if (message?.content?.type === 'text') {
      return message.content.text;
    }
    return JSON.stringify(message);
  }).join('\n');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Probe assertion failed: ${message}`);
  }
}
