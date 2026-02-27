import { stableHash } from "@aurelia-ls/compiler/pipeline/hash.js";
import type { ServerContext } from "./context.js";
import { SEMANTIC_TOKENS_LEGEND } from "./handlers/semantic-tokens.js";

export const CAPABILITIES_SCHEMA = "aurelia.capabilities/1" as const;

export const ContractKeys = {
  query: "query",
  refactor: "refactor",
  diagnostics: "diagnostics",
  semanticTokens: "semanticTokens",
  presentation: "presentation",
  mapping: "mapping",
} as const;

export const CustomCapabilityKeys = {
  overlay: "overlay",
  mapping: "mapping",
  queryAtPosition: "queryAtPosition",
  ssr: "ssr",
  diagnostics: "diagnostics",
  dumpState: "dumpState",
} as const;

export const NotificationKeys = {
  overlayReady: "overlayReady",
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
export type CustomCapabilityKey = (typeof CustomCapabilityKeys)[keyof typeof CustomCapabilityKeys];
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

export interface MappingContract {
  version: "mapping/1";
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
    mapping: MappingContract;
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
  custom: Record<CustomCapabilityKey, boolean>;
  notifications: Record<NotificationKey, boolean>;
}

export type CapabilitiesResponse = AureliaCapabilities;

export function buildCapabilities(ctx: ServerContext): CapabilitiesResponse {
  const snapshot = ctx.workspace.snapshot();
  const meta = snapshot.meta;
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
      mapping: { version: "mapping/1" },
    },
    workspace: {
      meta: {
        fingerprint: meta.fingerprint,
        configHash: meta.configHash,
        docCount: meta.docCount,
      },
      artifacts: {
        semantics: true,
        catalog: true,
        syntax: true,
        resourceGraph: true,
        provenance: true,
        semanticSnapshot: Boolean(snapshot.semanticSnapshot),
        apiSurface: Boolean(snapshot.apiSurface),
        featureUsage: Boolean(snapshot.featureUsage),
        registrationPlan: Boolean(snapshot.registrationPlan),
      },
      indexes: {
        resourceIndex: true,
        symbolGraph: Boolean(snapshot.semanticSnapshot?.symbols?.length),
        usageIndex: false,
        scopeIndex: false,
        templateIndex: ctx.workspace.templates.length > 0,
      },
    },
    lsp: {
      optional: {
        documentSymbol: false,
        workspaceSymbol: false,
        documentHighlight: false,
        selectionRange: false,
        linkedEditingRange: false,
        foldingRange: false,
        inlayHint: false,
        codeLens: false,
        documentLink: false,
        callHierarchy: false,
        documentColor: false,
        semanticTokensDelta: false,
      },
    },
    custom: {
      overlay: true,
      mapping: true,
      queryAtPosition: true,
      ssr: false,
      diagnostics: true,
      dumpState: true,
    },
    notifications: {
      overlayReady: true,
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
      mapping: { version: "mapping/1" },
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
        documentSymbol: false,
        workspaceSymbol: false,
        documentHighlight: false,
        selectionRange: false,
        linkedEditingRange: false,
        foldingRange: false,
        inlayHint: false,
        codeLens: false,
        documentLink: false,
        callHierarchy: false,
        documentColor: false,
        semanticTokensDelta: false,
      },
    },
    custom: {
      overlay: false,
      mapping: false,
      queryAtPosition: false,
      ssr: false,
      diagnostics: false,
      dumpState: false,
    },
    notifications: {
      overlayReady: false,
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
