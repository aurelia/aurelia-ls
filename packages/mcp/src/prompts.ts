import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

export function registerAureliaSemanticRuntimePrompts(
  server: McpServer,
): void {
  server.registerPrompt(
    'aurelia_orient_workspace',
    {
      title: 'Orient To Aurelia Workspace',
      description: 'Guide an MCP client through the stable overview tools for an Aurelia workspace or monorepo app.',
      argsSchema: {
        workspaceRoot: z.string().describe('Absolute workspace root to inspect.'),
        projectKey: z.string().optional().describe('Optional project key selected from aurelia_workspace_overview.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the question.'),
      },
    },
    ({ workspaceRoot, projectKey, includeRouter }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Orient to the Aurelia workspace at ${workspaceRoot}.`,
              'Call aurelia_workspace_overview first and use its project shape rows to select the app project.',
              projectKey == null || projectKey.length === 0
                ? 'If multiple app candidates are present, choose the app project from the overview before deeper calls.'
                : `Use projectKey ${projectKey} for deeper app calls unless the overview disproves it.`,
              'Then call aurelia_app_overview with a small diagnostic/open-seam budget and summarize app shape, major diagnostics, open seams, and the next precise tool calls.',
              'If you expect to call several app tools in this session, pass appRetention=retain-app on the first app call and clear or inspect the analysis cache when done; otherwise leave the default dispose-app posture.',
              'For large or dependency-heavy workspaces, start app overview with analysisDepth=runtime-topology and deepen only when binding/type details are needed.',
              'Use aurelia_app_query_catalog before aurelia_app_query when the needed queryKind is not already obvious from a curated tool.',
              includeRouter === 'true'
                ? 'Because routing is in scope, also call aurelia_router_overview with a small rowPageSize and report route, viewport, route-context, and router issue pressure.'
                : 'Call aurelia_router_overview only if the app overview or user task makes route/viewport facts relevant.',
              'Do not ask for Atlas, Work Router, corpus, or legacy-map internals; this MCP surface is the public semantic-runtime shell.',
            ].join(' '),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'aurelia_plan_authoring_recipe',
    {
      title: 'Plan Aurelia Authoring Recipe',
      description: 'Guide an MCP client through read-only authoring catalog and recipe-plan calls.',
      argsSchema: {
        recipeKey: z.string().optional().describe('Optional recipe key such as state-backed-form.'),
        rootDir: z.string().optional().describe('Target root directory to pass to aurelia_authoring_recipe_plan.'),
        appName: z.string().optional().describe('Optional generated app/display name for the recipe plan.'),
      },
    },
    ({ recipeKey, rootDir, appName }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Plan an Aurelia authoring operation through the MCP read-only recipe surface.',
              recipeKey == null || recipeKey.length === 0
                ? 'Start with aurelia_authoring_catalog using catalogView=recipes, choose a fitting recipe key, then call aurelia_authoring_recipe_plan.'
                : `Call aurelia_authoring_recipe_plan for recipeKey ${recipeKey}.`,
              rootDir == null || rootDir.length === 0
                ? 'Use rootDir only when the caller supplied a concrete target directory.'
                : `Use rootDir ${rootDir}.`,
              appName == null || appName.length === 0
                ? 'Use appName only when the caller supplied a desired app name.'
                : `Use appName ${appName}.`,
              'Keep includeText=false unless concrete source text is explicitly needed; summarize intent, preconditions, expected effects, source edit plan, and product-open reasons.',
            ].join(' '),
          },
        },
      ],
    }),
  );
}
