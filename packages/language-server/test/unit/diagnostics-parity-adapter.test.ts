import { describe, expect, test, vi } from "vitest";
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import { asDocumentUri } from "@aurelia-ls/compiler/program/primitives.js";
import type { ReplayableCommandInvocation } from "@aurelia-ls/semantic-workspace/host/types.js";
import { createDiagnosticsParityAdapter } from "@aurelia-ls/language-server/api";

const testUri = asDocumentUri("file:///app/src/my-app.html");

function createMockContext() {
  const diagnostic = {
    code: "aurelia/unknown-element",
    message: "Unknown custom element.",
    severity: "warning",
    uri: testUri,
    span: { start: 2, end: 8, file: canonicalDocumentUri(testUri).file },
    spec: { category: "gaps", status: "present", surfaces: ["lsp"] },
  };
  const diagnostics = {
    bySurface: new Map([
      ["lsp", [diagnostic]],
    ]),
    suppressed: [],
  };

  return {
    logger: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ensureProgramDocument: vi.fn(() => ({ offsetAt: vi.fn(() => 0) })),
    workspace: {
      diagnostics: vi.fn(() => diagnostics),
      snapshot: vi.fn(() => ({ meta: { fingerprint: "snapshot@1" } })),
    },
  };
}

describe("createDiagnosticsParityAdapter", () => {
  test("normalizes host and adapter diagnostics into a parity-comparable shape", () => {
    const ctx = createMockContext();
    const adapter = createDiagnosticsParityAdapter(ctx as never);
    const invocation = {
      command: "query.diagnostics",
      args: { sessionId: "session-1", uri: testUri },
    } satisfies ReplayableCommandInvocation;

    const adapterResult = adapter.execute(invocation);
    const hostResult = {
      bySurface: {
        lsp: [{
          code: "aurelia/unknown-element",
          message: "Unknown custom element.",
          severity: "warning",
          uri: testUri,
          span: { start: 2, end: 8, file: canonicalDocumentUri(testUri).file },
          spec: { category: "gaps", status: "present", surfaces: ["lsp"] },
        }],
      },
      suppressed: [],
    };
    const normalized = adapter.normalize?.({
      invocation,
      hostResult,
      adapterResult,
    });

    expect(ctx.ensureProgramDocument).toHaveBeenCalledWith(testUri);
    expect(normalized).not.toBeNull();
    expect(normalized?.host).toEqual(normalized?.adapter);
  });

  test("returns unsupported-command marker and no normalization for non-diagnostics commands", () => {
    const ctx = createMockContext();
    const adapter = createDiagnosticsParityAdapter(ctx as never);
    const invocation = {
      command: "query.hover",
      args: { sessionId: "session-1", uri: testUri, position: { line: 0, character: 0 } },
    } satisfies ReplayableCommandInvocation;

    const adapterResult = adapter.execute(invocation);
    const normalized = adapter.normalize?.({
      invocation,
      hostResult: { hover: null },
      adapterResult,
    });

    expect(adapterResult).toEqual({ unsupportedCommand: "query.hover" });
    expect(normalized).toBeNull();
  });
});
