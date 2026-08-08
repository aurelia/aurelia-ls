import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ManagedSemanticWorkspaceOperationStaleError,
  SemanticRuntimeAnalysisCurrentnessError,
} from '@aurelia-ls/semantic-runtime';
import { aureliaMcpErrorResult, serializeAureliaMcpError } from '../src/tool-errors.js';

const clients: Client[] = [];
const servers: McpServer[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  await Promise.allSettled(servers.splice(0).map((server) => server.close()));
});

describe('Aurelia MCP managed-operation errors', () => {
  it('preserves typed stale currentness and explicit client retry guidance', () => {
    expect(serializeAureliaMcpError(staleError())).toEqual({
      name: 'ManagedSemanticWorkspaceOperationStaleError',
      message: 'Workspace changed during MCP projection.',
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-basis-changed',
      currentnessKind: null,
      previousSourceWorldRevision: 'source:before',
      nextSourceWorldRevision: 'source:before',
      analysisBasisRevision: 'analysis:before',
      changedReadKeys: ['source:src/my-app.html'],
      changedFacets: ['authored-source'],
      changedSemanticFactKeys: [],
      retryable: true,
      retryAction: 'reissue-tool',
    });
  });

  it('serializes nominal internal analysis currentness as explicit reissue guidance', () => {
    expect(serializeAureliaMcpError(analysisCurrentnessError())).toMatchObject({
      name: 'ManagedSemanticWorkspaceOperationStaleError',
      code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
      reason: 'analysis-currentness-changed',
      previousSourceWorldRevision: 'source:same',
      nextSourceWorldRevision: 'source:same',
      analysisBasisRevision: null,
      changedSemanticFactKeys: ['semantic-domain:semantic-read'],
      analysisCurrentness: {
        code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
        reason: 'query-answer-lease-changed',
        answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
        changedSemanticFactKeys: ['semantic-domain:semantic-read'],
      },
      retryable: true,
      retryAction: 'reissue-tool',
    });
  });

  it('does not infer retryability from currentness-shaped properties on an ordinary error', () => {
    const error = Object.assign(new Error('mapping failed'), {
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
      reason: 'query-answer-lease-changed',
    });

    expect(serializeAureliaMcpError(error)).toEqual({
      name: 'Error',
      message: 'mapping failed',
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
    });
  });

  it('recognizes a direct nominal analysis-currentness error without relying on its properties', () => {
    const error = new SemanticRuntimeAnalysisCurrentnessError({
      message: 'Computation inputs changed.',
      reason: 'computation-inputs-changed',
      changedReadKeys: ['project-input:file-content:C:/workspace/src/main.ts'],
      changedFacets: ['file-content'],
      changedSemanticFactKeys: [
        'project-compiler-options-environment:project-compiler-options-environment',
      ],
    });

    expect(serializeAureliaMcpError(error)).toMatchObject({
      name: 'SemanticRuntimeAnalysisCurrentnessError',
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
      reason: 'computation-inputs-changed',
      changedReadKeys: ['project-input:file-content:C:/workspace/src/main.ts'],
      changedFacets: ['file-content'],
      changedSemanticFactKeys: [
        'project-compiler-options-environment:project-compiler-options-environment',
      ],
      analysisCurrentness: {
        code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
        reason: 'computation-inputs-changed',
        changedSemanticFactKeys: [
          'project-compiler-options-environment:project-compiler-options-environment',
        ],
      },
      retryable: true,
      retryAction: 'reissue-tool',
    });
  });

  it('survives an actual SDK tool call with an incompatible success output schema', async () => {
    const server = new McpServer({ name: 'typed-error-test', version: '0' });
    servers.push(server);
    server.registerTool('managed-stale', {
      inputSchema: {},
      outputSchema: {
        tool: z.string(),
        generatedAt: z.string(),
        workspaceRoot: z.string().nullable(),
        workspaceDescriptor: z.unknown().nullable(),
        value: z.unknown(),
      },
    }, async () => aureliaMcpErrorResult(staleError()));

    const client = new Client({ name: 'typed-error-client', version: '0' });
    clients.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await client.listTools();

    const result = await client.callTool({ name: 'managed-stale', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      tool: 'aurelia_mcp_error',
      value: {
        error: {
          code: 'SEMANTIC_RUNTIME_OPERATION_STALE',
          reason: 'analysis-basis-changed',
          retryable: true,
          retryAction: 'reissue-tool',
        },
      },
    });
  });
});

function staleError(): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message: 'Workspace changed during MCP projection.',
    reason: 'analysis-basis-changed',
    currentnessKind: null,
    previousSourceWorldRevision: 'source:before',
    nextSourceWorldRevision: 'source:before',
    analysisBasisRevision: 'analysis:before',
    changedReadKeys: ['source:src/my-app.html'],
    changedFacets: ['authored-source'],
    changedSemanticFactKeys: [],
  });
}

function analysisCurrentnessError(): ManagedSemanticWorkspaceOperationStaleError {
  return new ManagedSemanticWorkspaceOperationStaleError({
    message: 'Analysis changed during MCP projection.',
    reason: 'analysis-currentness-changed',
    currentnessKind: null,
    previousSourceWorldRevision: 'source:same',
    nextSourceWorldRevision: 'source:same',
    analysisBasisRevision: null,
    changedReadKeys: [],
    changedFacets: [],
    changedSemanticFactKeys: ['semantic-domain:semantic-read'],
    analysisCurrentness: {
      code: 'SEMANTIC_RUNTIME_ANALYSIS_CURRENTNESS_CHANGED',
      reason: 'query-answer-lease-changed',
      message: 'Query answer lease changed.',
      answerLeaseKind: 'semantic-runtime-analysis-receipt/1',
      invalidGenerationKeys: [],
      changedReadKeys: [],
      changedFacets: [],
      changedSemanticFactKeys: ['semantic-domain:semantic-read'],
    },
  });
}
