import type {
  SemanticRuntimeLspGeneration,
  SemanticRuntimeLspOperation,
} from "../../src/runtime/semantic-runtime-session.js";

export const testAnalysisGeneration: SemanticRuntimeLspGeneration = {
  requestEpoch: 0,
  workspaceGeneration: 0,
  sourceWorldRevision: "semantic-source-world:test",
  fingerprint: "semantic-runtime:test",
};

interface TestOperationOverrides {
  readonly documents?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export function createTestOperation(
  overrides: TestOperationOverrides = {},
): SemanticRuntimeLspOperation {
  const { documents, ...operationOverrides } = overrides;
  return {
    generation: testAnalysisGeneration,
    documents: {
      openDocument: () => null,
      ensureProgramDocument: () => null,
      lookupDocumentSnapshot: () => null,
      lookupWorkspaceDocumentSnapshot: () => null,
      lookupText: () => null,
      ...documents,
    },
    deferEffect: () => {},
    workspaceSummary: unsupportedTestOperationMethod,
    authoredSourceOwnership: unsupportedTestOperationMethod,
    nativeProjectConfigurations: unsupportedTestOperationMethod,
    projectConfigurationDiagnostics: unsupportedTestOperationMethod,
    templateCompletions: unsupportedTestOperationMethod,
    appDiagnostics: unsupportedTestOperationMethod,
    templateCursorInfo: unsupportedTestOperationMethod,
    templateReferences: unsupportedTestOperationMethod,
    templateRename: unsupportedTestOperationMethod,
    templateRenameFromTypeScript: unsupportedTestOperationMethod,
    templateCodeActions: unsupportedTestOperationMethod,
    resourceDefinitions: unsupportedTestOperationMethod,
    resourceInventory: unsupportedTestOperationMethod,
    projectsOwningDocument: unsupportedTestOperationMethod,
    templateResourceAvailability: unsupportedTestOperationMethod,
    appTopology: unsupportedTestOperationMethod,
    templateInlayHints: unsupportedTestOperationMethod,
    templateSemanticTokens: unsupportedTestOperationMethod,
    templateFoldingRanges: unsupportedTestOperationMethod,
    ...operationOverrides,
  } as unknown as SemanticRuntimeLspOperation;
}

function unsupportedTestOperationMethod(): never {
  throw new Error("Test semantic-runtime LSP operation method was not configured.");
}

export const testOperation = createTestOperation();

interface LegacyHandlerTestContext {
  readonly semanticRuntime?: Readonly<Record<string, unknown>>;
  readonly openDocument?: (uri: string) => unknown;
  readonly ensureProgramDocument?: (uri: string) => unknown;
  readonly lookupDocumentSnapshot?: (uri: string) => unknown;
  readonly lookupWorkspaceDocumentSnapshot?: (uri: string) => unknown;
  readonly lookupText?: (uri: string) => string | null;
  readonly logger?: Readonly<Record<string, ((message: string) => void) | undefined>>;
  readonly connection?: {
    readonly sendNotification?: (method: string, params: unknown) => unknown;
  };
}

/** Adapt existing handler-test fakes while production source reads move onto an operation. */
export function createContextTestOperation(
  ctx: LegacyHandlerTestContext,
): SemanticRuntimeLspOperation {
  return createTestOperation({
    ...ctx.semanticRuntime,
    documents: {
      openDocument: (uri: string) => ctx.openDocument?.(uri) ?? null,
      ensureProgramDocument: (uri: string) => ctx.ensureProgramDocument?.(uri) ?? null,
      lookupDocumentSnapshot: (uri: string) => ctx.lookupDocumentSnapshot?.(uri) ?? null,
      lookupWorkspaceDocumentSnapshot: (uri: string) =>
        ctx.lookupWorkspaceDocumentSnapshot?.(uri)
        ?? ctx.lookupDocumentSnapshot?.(uri)
        ?? textSnapshot(uri, ctx.lookupText?.(uri) ?? null),
      lookupText: (uri: string) => ctx.lookupText?.(uri) ?? null,
    },
    deferEffect: (effect: unknown) => publishTestEffect(ctx, effect),
  });
}

function textSnapshot(uri: string, text: string | null): unknown {
  if (text == null) return null;
  return {
    uri,
    languageId: uri.toLowerCase().endsWith(".ts") ? "typescript" : "html",
    version: null,
    text,
  };
}

function publishTestEffect(ctx: LegacyHandlerTestContext, effect: unknown): void {
  if (effect == null || typeof effect !== "object" || !("kind" in effect)) return;
  if (effect.kind === "log" && "level" in effect && "message" in effect) {
    const level = String(effect.level);
    const message = String(effect.message);
    ctx.logger?.[level]?.(message);
    return;
  }
  if (effect.kind === "show-message" && "type" in effect && "message" in effect) {
    ctx.connection?.sendNotification?.("window/showMessage", {
      type: effect.type,
      message: String(effect.message),
    });
  }
}
