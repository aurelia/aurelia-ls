import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import {
  aureliaBuildAppFeaturePromptText,
  aureliaInspectAppFeaturePromptText,
  aureliaOrientWorkspacePromptText,
} from './orientation.js';

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
            text: aureliaOrientWorkspacePromptText({ workspaceRoot, projectKey, includeRouter }),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'aurelia_inspect_app_feature',
    {
      title: 'Inspect Aurelia App Feature',
      description: 'Guide an MCP client through read-only semantic-runtime app inspection for a feature or repair task.',
      argsSchema: {
        workspaceRoot: z.string().describe('Absolute workspace root to inspect.'),
        featureGoal: z.string().describe('Short description of the feature, issue, or slice under inspection.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the question.'),
        includeDiagnostics: z.string().optional().describe('Pass true when diagnostics should lead the inspection.'),
      },
    },
    ({ workspaceRoot, featureGoal, includeRouter, includeDiagnostics }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: aureliaInspectAppFeaturePromptText({ workspaceRoot, featureGoal, includeRouter, includeDiagnostics }),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'aurelia_build_app_feature',
    {
      title: 'Build Aurelia App Feature',
      description: 'Guide an MCP client through low-boilerplate Aurelia feature planning, app inspection, and source edits.',
      argsSchema: {
        workspaceRoot: z.string().optional().describe('Absolute workspace root when modifying or inspecting an existing app.'),
        featureGoal: z.string().describe('Short description of the app feature or slice to build.'),
        focus: z.string().optional().describe('Optional task focus such as forms, state, routing, plugins, composition, or diagnostics.'),
        includeRouter: z.string().optional().describe('Pass true when route/viewport facts are part of the feature.'),
        includeDiagnostics: z.string().optional().describe('Pass true when the feature is repairing or extending an existing app with known issues.'),
      },
    },
    ({ workspaceRoot, featureGoal, focus, includeRouter, includeDiagnostics }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: aureliaBuildAppFeaturePromptText({ workspaceRoot, featureGoal, focus, includeRouter, includeDiagnostics }),
          },
        },
      ],
    }),
  );
}
