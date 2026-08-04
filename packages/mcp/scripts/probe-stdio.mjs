import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  expectedPatternCatalogCount,
  patternReleaseSentinels,
} from './pattern-sentinels.mjs';

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
  assert(toolNames.has('aurelia_project_configurations'), 'project configurations tool is registered');
  assert(toolNames.has('aurelia_app_overview'), 'app overview tool is registered');
  assert(toolNames.has('aurelia_app_query_catalog'), 'app query catalog tool is registered');
  assert(toolNames.has('aurelia_pattern_menu'), 'pattern menu tool is registered');
  assert(toolNames.has('aurelia_pattern_example'), 'pattern example tool is registered');
  assert(toolNames.has('aurelia_docs_search'), 'bundled docs search tool is registered');
  assert(toolNames.has('aurelia_docs_fetch'), 'bundled docs fetch tool is registered');
  assert(toolNames.has('aurelia_app_query'), 'generic app query tool is registered');
  assert(toolNames.has('aurelia_app_query_batch'), 'app query batch tool is registered');
  assert(toolNames.has('aurelia_diagnostic_overview'), 'diagnostic overview tool is registered');
  assert(toolNames.has('aurelia_template_diagnostics'), 'template diagnostics tool is registered');
  assert(!toolNames.has('aurelia_authoring_recipe_plan'), 'legacy authoring recipe-plan tool is retired');
  assert(!toolNames.has('aurelia_app_building_guidance'), 'legacy app-building guidance tool is retired');
  assert(!toolNames.has('aurelia_authoring_orientation'), 'legacy authoring orientation tool is retired');
  assert(!toolNames.has('aurelia_app_builder_catalog'), 'legacy app-builder catalog tool is retired');
  assert(!toolNames.has('aurelia_app_builder_query'), 'legacy app-builder query tool is retired');

  assert(promptNames.has('aurelia_orient_workspace'), 'orientation prompt is registered');
  assert(promptNames.has('aurelia_inspect_app_feature'), 'feature inspection prompt is registered');
  assert(promptNames.has('aurelia_build_app_feature'), 'feature build prompt is registered');
  assert(!promptNames.has('aurelia_plan_authoring_recipe'), 'legacy authoring recipe prompt is retired');

  assert(resourceUris.has('aurelia://semantic-runtime/app-queries'), 'app query catalog resource is registered');
  assert(resourceUris.has('aurelia://patterns/menu'), 'pattern menu resource is registered');
  assert(resourceUris.has('aurelia://docs/index'), 'bundled docs index resource is registered');
  assert(!resourceUris.has('aurelia://authoring/catalog'), 'legacy authoring catalog resource is retired');
  assert(!resourceUris.has('aurelia://semantic-runtime/app-builder'), 'legacy app-builder catalog resource is retired');

  const queryCatalog = await client.callTool({
    name: 'aurelia_app_query_catalog',
    arguments: {},
  });
  assert(structuredSummary(queryCatalog).includes('query'), 'query catalog returned semantic-runtime summary text');

  const patternMenu = await client.callTool({
    name: 'aurelia_pattern_menu',
    arguments: { query: 'form' },
  });
  const patternItems = structuredValue(patternMenu)?.items;
  assert(Array.isArray(patternItems) && patternItems.some((item) => item.patternId === 'form.native-submit'), 'pattern menu returned searchable pattern rows');

  const fullPatternMenu = await client.callTool({
    name: 'aurelia_pattern_menu',
    arguments: {},
  });
  const fullPatternItems = structuredValue(fullPatternMenu)?.items;
  assert(
    Array.isArray(fullPatternItems) && fullPatternItems.length === expectedPatternCatalogCount,
    `pattern menu exposed the guarded ${expectedPatternCatalogCount}-pattern catalog`,
  );
  assert(
    Buffer.byteLength(JSON.stringify(fullPatternItems), 'utf8') < 20_000,
    'pattern menu stayed compact for first-choice MCP lookup',
  );

  const expandedPatternMenu = await client.callTool({
    name: 'aurelia_pattern_menu',
    arguments: { query: 'slot' },
  });
  const expandedPatternItems = structuredValue(expandedPatternMenu)?.items;
  assert(
    Array.isArray(expandedPatternItems) && expandedPatternItems.some((item) => item.patternId === 'component.slotted-layout'),
    'pattern menu returned newly admitted slotted layout pattern rows',
  );

  const patternExample = await client.callTool({
    name: 'aurelia_pattern_example',
    arguments: { patternId: 'component.local-collection' },
  });
  const patternExampleValue = structuredValue(patternExample);
  assert(patternExampleValue?.patternId === 'component.local-collection', 'pattern example returned the requested curated pattern');
  assert(
    Array.isArray(patternExampleValue?.support?.followUp)
      && patternExampleValue.support.followUp.some((row) => row.tool === 'aurelia_diagnostic_overview')
      && patternExampleValue.support.followUp.some((row) => row.queryKind === 'binding-data-flow-summary'),
    'pattern example returned semantic-runtime follow-up hints',
  );
  await verifyLatestPatternTranche(client);

  const docsSearch = await client.callTool({
    name: 'aurelia_docs_search',
    arguments: { query: 'route parameters loading', page: { size: 5 } },
  });
  const docsSearchValue = structuredValue(docsSearch);
  assert(
    Array.isArray(docsSearchValue?.items) && docsSearchValue.items.some((item) => item.documentPath === 'router/route-parameters.md'),
    'docs search returned router route-parameter docs for a route-parameter query',
  );
  assert(
    docsSearchValue.items.every((item) => !item.documentPath.startsWith('router-direct/')),
    'docs search excludes router-direct from public search results',
  );
  const docsSearchItem = docsSearchValue.items.find((item) => item.documentPath === 'router/route-parameters.md') ?? docsSearchValue.items[0];
  const docsFetch = await client.callTool({
    name: 'aurelia_docs_fetch',
    arguments: {
      documentPath: docsSearchItem.documentPath,
      sectionAnchor: docsSearchItem.sectionAnchor,
      maxChars: 4000,
    },
  });
  const docsFetchValue = structuredValue(docsFetch);
  assert(docsFetchValue?.documentPath === docsSearchItem.documentPath, 'docs fetch returned the requested docs document');
  assert(Array.isArray(docsFetchValue?.sections) && docsFetchValue.sections.length >= 1, 'docs fetch returned at least one section');
  assert(Array.isArray(docsFetchValue?.availableSections) && docsFetchValue.availableSections.length >= 1, 'docs fetch returned section navigation summaries');

  const workspaceOverview = await client.callTool({
    name: 'aurelia_workspace_overview',
    arguments: { workspaceRoot: minimalFixtureWorkspaceRoot },
  });
  assert(structuredValue(workspaceOverview) != null, 'workspace overview returned structured content');

  const projectConfigurations = await client.callTool({
    name: 'aurelia_project_configurations',
    arguments: { workspaceRoot: minimalFixtureWorkspaceRoot, sourceFilePaths: [] },
  });
  assert(Array.isArray(structuredValue(projectConfigurations)?.rows), 'project configurations returned structured rows');

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
  assert(orientPromptText.includes('aurelia_docs_search'), 'orientation prompt names bundled docs search');
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
  assert(buildPromptText.includes('aurelia_pattern_menu'), 'build prompt names pattern menu for fresh feature shape');
  assert(buildPromptText.includes('support.followUp'), 'build prompt tells clients to use pattern follow-up hints after adaptation');
  assert(buildPromptText.includes('aurelia_docs_fetch'), 'build prompt names bundled docs fetch for framework docs context');
  assert(buildPromptText.includes('typescript-diagnostic-summary'), 'build prompt reminds clients to re-run TypeScript diagnostics');
  assert(!buildPromptText.includes('aurelia_authoring'), 'build prompt avoids legacy authoring tools');
  assert(!buildPromptText.includes('aurelia_app_builder'), 'build prompt avoids legacy app-builder tools');

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

async function verifyLatestPatternTranche(client) {
  for (const sentinel of patternReleaseSentinels) {
    const menu = await client.callTool({
      name: 'aurelia_pattern_menu',
      arguments: { query: sentinel.query },
    });
    const menuItems = structuredValue(menu)?.items;
    assert(
      Array.isArray(menuItems) && menuItems.some((item) => item.patternId === sentinel.patternId),
      `pattern menu query "${sentinel.query}" returned ${sentinel.patternId}`,
    );

    const example = await client.callTool({
      name: 'aurelia_pattern_example',
      arguments: { patternId: sentinel.patternId },
    });
    const value = structuredValue(example);
    assert(value?.patternId === sentinel.patternId, `pattern example returned ${sentinel.patternId}`);
    assertPatternSupport(value, sentinel);
  }
}

function assertPatternSupport(value, sentinel) {
  const followUp = value?.support?.followUp;
  assert(Array.isArray(followUp) && followUp.length > 0, `${sentinel.patternId} returned support.followUp hints`);
  assert(followUp.length <= 3, `${sentinel.patternId} support.followUp stayed compact`);
  for (const tool of sentinel.followUpTools) {
    assert(followUp.some((row) => row.tool === tool), `${sentinel.patternId} returned ${tool} follow-up`);
  }
  for (const queryKind of sentinel.followUpQueryKinds ?? []) {
    assert(
      followUp.some((row) => row.tool === 'aurelia_app_query' && row.queryKind === queryKind),
      `${sentinel.patternId} returned ${queryKind} follow-up`,
    );
  }

  const refs = value?.support?.refs ?? [];
  const refUrls = refs.map((ref) => ref.url);
  for (const docsRef of sentinel.docsRefs) {
    assert(refUrls.some((url) => url.includes(docsRef)), `${sentinel.patternId} returned docs ref ${docsRef}`);
  }
  assert(!JSON.stringify(value).includes('aurelia_app_builder'), `${sentinel.patternId} avoids retired app-builder vocabulary`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Probe assertion failed: ${message}`);
  }
}
