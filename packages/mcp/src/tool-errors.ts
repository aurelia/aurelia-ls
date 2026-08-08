import {
  ManagedSemanticWorkspaceDisposedError,
  ManagedSemanticWorkspaceOperationStaleError,
  ManagedSemanticWorkspaceReentrantOperationError,
  isSemanticRuntimeAnalysisCurrentnessError,
  semanticRuntimeAnalysisCurrentnessFailure,
  type SemanticRuntimeAnalysisCurrentnessFailure,
} from '@aurelia-ls/semantic-runtime';

export interface SerializedAureliaMcpError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly reason?: string;
  readonly currentnessKind?: string | null;
  readonly previousSourceWorldRevision?: string;
  readonly nextSourceWorldRevision?: string;
  readonly analysisBasisRevision?: string | null;
  readonly changedReadKeys?: readonly string[];
  readonly changedFacets?: readonly string[];
  readonly changedSemanticFactKeys?: readonly string[];
  readonly analysisCurrentness?: SemanticRuntimeAnalysisCurrentnessFailure;
  readonly action?: string;
  readonly retryable?: boolean;
  readonly retryAction?: 'reissue-tool';
}

export function serializeAureliaMcpError(error: unknown): SerializedAureliaMcpError {
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      reason: error.reason,
      currentnessKind: error.currentnessKind,
      previousSourceWorldRevision: error.previousSourceWorldRevision,
      nextSourceWorldRevision: error.nextSourceWorldRevision,
      analysisBasisRevision: error.analysisBasisRevision,
      changedReadKeys: error.changedReadKeys,
      changedFacets: error.changedFacets,
      changedSemanticFactKeys: error.changedSemanticFactKeys,
      ...(error.analysisCurrentness == null
        ? {}
        : { analysisCurrentness: error.analysisCurrentness }),
      retryable: true,
      retryAction: 'reissue-tool',
    };
  }
  if (isSemanticRuntimeAnalysisCurrentnessError(error)) {
    const currentness = semanticRuntimeAnalysisCurrentnessFailure(error);
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      reason: error.reason,
      changedReadKeys: currentness.changedReadKeys,
      changedFacets: currentness.changedFacets,
      changedSemanticFactKeys: currentness.changedSemanticFactKeys,
      analysisCurrentness: currentness,
      retryable: true,
      retryAction: 'reissue-tool',
    };
  }
  if (error instanceof ManagedSemanticWorkspaceDisposedError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      retryable: false,
    };
  }
  if (error instanceof ManagedSemanticWorkspaceReentrantOperationError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      action: error.action,
      retryable: false,
    };
  }
  if (error instanceof Error) {
    const code = readStringProperty(error, 'code');
    const action = readStringProperty(error, 'action');
    return {
      name: error.name,
      message: error.message,
      ...(code == null ? {} : { code }),
      ...(action == null ? {} : { action }),
    };
  }
  return {
    name: 'Error',
    message: String(error),
  };
}

export function aureliaMcpErrorResult(error: unknown) {
  const serialized = serializeAureliaMcpError(error);
  return {
    isError: true as const,
    structuredContent: {
      tool: 'aurelia_mcp_error',
      generatedAt: new Date().toISOString(),
      workspaceRoot: null,
      workspaceDescriptor: null,
      value: {
        error: serialized,
      },
    },
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: serialized }, null, 2),
      },
    ],
  };
}

function readStringProperty(value: object, key: string): string | null {
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : null;
}
