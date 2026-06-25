import type { ServerContext } from "./context.js";
import { SEMANTIC_TOKENS_LEGEND } from "./handlers/semantic-tokens.js";
import { stableHash } from "./utils/stable-hash.js";

export const CAPABILITIES_SCHEMA = "aurelia.capabilities/1" as const;

export const ContractKeys = {
  query: "query",
  refactor: "refactor",
  diagnostics: "diagnostics",
  semanticTokens: "semanticTokens",
  presentation: "presentation",
} as const;

export const NotificationKeys = {
  analysisReady: "analysisReady",
  workspaceChanged: "workspaceChanged",
} as const;

export const OptionalLspKeys = {
  documentSymbol: "documentSymbol",
  workspaceSymbol: "workspaceSymbol",
  documentHighlight: "documentHighlight",
  selectionRange: "selectionRange",
  linkedEditingRange: "linkedEditingRange",
  foldingRange: "foldingRange",
  inlayHint: "inlayHint",
  codeLens: "codeLens",
  documentLink: "documentLink",
  callHierarchy: "callHierarchy",
  documentColor: "documentColor",
  semanticTokensDelta: "semanticTokensDelta",
} as const;

export type ContractKey = (typeof ContractKeys)[keyof typeof ContractKeys];
export type NotificationKey = (typeof NotificationKeys)[keyof typeof NotificationKeys];
export type OptionalLspKey = (typeof OptionalLspKeys)[keyof typeof OptionalLspKeys];

export interface QueryContract {
  version: "query/1";
}

export interface RefactorContract {
  version: "refactor/1";
}

export interface DiagnosticsContract {
  version: "diagnostics/1";
  taxonomy: "diagnostics-taxonomy/1";
}

export interface SemanticTokensContract {
  version: "tokens/1";
  legendHash: string;
}

export interface PresentationContract {
  version: "presentation/1";
}

export interface AureliaCapabilities {
  schema: typeof CAPABILITIES_SCHEMA;
  server: {
    version: string;
    workspaceVersion?: string;
  };
  contracts: {
    query: QueryContract;
    refactor: RefactorContract;
    diagnostics: DiagnosticsContract;
    semanticTokens: SemanticTokensContract;
    presentation: PresentationContract;
  };
  workspace: {
    meta: {
      fingerprint: string;
      configHash: string;
      docCount: number;
    };
    artifacts: {
      semantics: true;
      catalog: true;
      syntax: true;
      resourceGraph: true;
      provenance: true;
      semanticSnapshot: boolean;
      apiSurface: boolean;
      featureUsage: boolean;
      registrationPlan: boolean;
    };
    indexes: {
      resourceIndex: boolean;
      symbolGraph: boolean;
      usageIndex: boolean;
      scopeIndex: boolean;
      templateIndex: boolean;
    };
  };
  lsp: {
    optional: Record<OptionalLspKey, boolean>;
  };
  notifications: Record<NotificationKey, boolean>;
}

export type CapabilitiesResponse = AureliaCapabilities;

export function buildCapabilities(ctx: ServerContext): CapabilitiesResponse {
  const legendHash = computeLegendHash();

  return {
    schema: CAPABILITIES_SCHEMA,
    server: {
      version: resolveServerVersion(),
    },
    contracts: {
      query: { version: "query/1" },
      refactor: { version: "refactor/1" },
      diagnostics: { version: "diagnostics/1", taxonomy: "diagnostics-taxonomy/1" },
      semanticTokens: { version: "tokens/1", legendHash },
      presentation: { version: "presentation/1" },
    },
    workspace: {
      meta: {
        fingerprint: `semantic-runtime:${ctx.workspaceRoot ?? "no-root"}:${ctx.documents.all().length}`,
        configHash: ctx.workspaceRoot ?? "",
        docCount: ctx.documents.all().length,
      },
      artifacts: {
        semantics: true,
        catalog: true,
        syntax: true,
        resourceGraph: true,
        provenance: true,
        semanticSnapshot: true,
        apiSurface: true,
        featureUsage: true,
        registrationPlan: true,
      },
      indexes: {
        resourceIndex: true,
        symbolGraph: true,
        usageIndex: true,
        scopeIndex: true,
        templateIndex: true,
      },
    },
    lsp: {
      optional: {
        documentSymbol: true,
        workspaceSymbol: true,
        documentHighlight: true,
        selectionRange: true,
        linkedEditingRange: true,
        foldingRange: true,
        inlayHint: true,
        codeLens: true,
        documentLink: false,
        callHierarchy: false,
        documentColor: false,
        semanticTokensDelta: false,
      },
    },
    notifications: {
      analysisReady: true,
      workspaceChanged: true,
    },
  };
}

function resolveServerVersion(): string {
  return process.env["AURELIA_LS_VERSION"]
    ?? process.env["npm_package_version"]
    ?? "dev";
}

export function buildCapabilitiesFallback(): CapabilitiesResponse {
  return {
    schema: CAPABILITIES_SCHEMA,
    server: {
      version: resolveServerVersion(),
    },
    contracts: {
      query: { version: "query/1" },
      refactor: { version: "refactor/1" },
      diagnostics: { version: "diagnostics/1", taxonomy: "diagnostics-taxonomy/1" },
      semanticTokens: { version: "tokens/1", legendHash: computeLegendHash() },
      presentation: { version: "presentation/1" },
    },
    workspace: {
      meta: {
        fingerprint: "",
        configHash: "",
        docCount: 0,
      },
      artifacts: {
        semantics: true,
        catalog: true,
        syntax: true,
        resourceGraph: true,
        provenance: true,
        semanticSnapshot: false,
        apiSurface: false,
        featureUsage: false,
        registrationPlan: false,
      },
      indexes: {
        resourceIndex: false,
        symbolGraph: false,
        usageIndex: false,
        scopeIndex: false,
        templateIndex: false,
      },
    },
    lsp: {
      optional: {
        documentSymbol: true,
        workspaceSymbol: true,
        documentHighlight: true,
        selectionRange: true,
        linkedEditingRange: true,
        foldingRange: true,
        inlayHint: true,
        codeLens: true,
        documentLink: false,
        callHierarchy: false,
        documentColor: false,
        semanticTokensDelta: false,
      },
    },
    notifications: {
      analysisReady: false,
      workspaceChanged: false,
    },
  };
}

function computeLegendHash(): string {
  return stableHash({
    tokenTypes: SEMANTIC_TOKENS_LEGEND.tokenTypes,
    tokenModifiers: SEMANTIC_TOKENS_LEGEND.tokenModifiers,
  });
}
