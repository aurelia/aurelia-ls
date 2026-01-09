import { describe, it, expect } from "vitest";
import {
  orphansToDiagnostics,
  unresolvedToDiagnostics,
  unresolvedRefsToDiagnostics,
  RES0001_ORPHAN_ELEMENT,
  RES0010_UNANALYZABLE_FUNCTION_CALL,
  RES0021_NOT_A_RESOURCE,
} from "@aurelia-ls/resolution";
import type { OrphanResource, UnresolvedRegistration, UnresolvedResourceInfo } from "@aurelia-ls/resolution";
import { toSourceFileId, type CustomElementDef, type NormalizedPath, type SourceSpan, type Sourced } from "@aurelia-ls/compiler";

// Helper to create a mock source span
function mockSpan(file: NormalizedPath): SourceSpan {
  return {
    file: toSourceFileId(file),
    start: 0,
    end: 10,
  };
}

function sourced<T>(value: T): Sourced<T> {
  return { origin: "source", value };
}

function elementDef(name: string, className: string, file: NormalizedPath): CustomElementDef {
  return {
    kind: "custom-element",
    className: sourced(className),
    name: sourced(name),
    aliases: [],
    containerless: sourced(false),
    shadowOptions: sourced(undefined),
    capture: sourced(false),
    processContent: sourced(false),
    boundary: sourced(true),
    bindables: {},
    dependencies: [],
    file,
  };
}

describe("Diagnostic Conversion Functions", () => {
  describe("orphansToDiagnostics", () => {
    it("converts orphan elements to diagnostics", () => {
      const orphans: OrphanResource[] = [
        {
          resource: elementDef("my-element", "MyElement", "/app/src/my-element.ts" as NormalizedPath),
          definitionSpan: mockSpan("/app/src/my-element.ts" as NormalizedPath),
        },
      ];

      const diagnostics = orphansToDiagnostics(orphans);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe(RES0001_ORPHAN_ELEMENT);
      expect(diagnostics[0].severity).toBe("warning");
      expect(diagnostics[0].message).toContain("my-element");
      expect(diagnostics[0].message).toContain("MyElement");
      expect(diagnostics[0].source).toBe("/app/src/my-element.ts");
    });

    it("filters out orphans from external packages", () => {
      const orphans: OrphanResource[] = [
        {
          resource: elementDef(
            "my-element",
            "MyElement",
            "/node_modules/@aurelia/runtime-html/dist/my-element.ts" as NormalizedPath,
          ),
          definitionSpan: mockSpan("/node_modules/@aurelia/runtime-html/dist/my-element.ts" as NormalizedPath),
        },
        {
          resource: elementDef("user-element", "UserElement", "/app/src/user-element.ts" as NormalizedPath),
          definitionSpan: mockSpan("/app/src/user-element.ts" as NormalizedPath),
        },
      ];

      const diagnostics = orphansToDiagnostics(orphans);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("user-element");
    });
  });

  describe("unresolvedToDiagnostics", () => {
    it("converts unresolved patterns to diagnostics", () => {
      const unresolved: UnresolvedRegistration[] = [
        {
          pattern: { kind: "function-call", functionName: "getPlugins" },
          file: "/app/src/main.ts" as NormalizedPath,
          span: mockSpan("/app/src/main.ts" as NormalizedPath),
          reason: "Cannot statically analyze function call 'getPlugins()'",
        },
      ];

      const diagnostics = unresolvedToDiagnostics(unresolved);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe(RES0010_UNANALYZABLE_FUNCTION_CALL);
      expect(diagnostics[0].severity).toBe("info");
      expect(diagnostics[0].message).toContain("getPlugins");
      expect(diagnostics[0].source).toBe("/app/src/main.ts");
    });

    it("filters out unresolved patterns from external packages", () => {
      const unresolved: UnresolvedRegistration[] = [
        {
          pattern: { kind: "function-call", functionName: "internalSetup" },
          file: "/node_modules/@aurelia/runtime/dist/setup.ts" as NormalizedPath,
          span: mockSpan("/node_modules/@aurelia/runtime/dist/setup.ts" as NormalizedPath),
          reason: "Cannot statically analyze function call",
        },
        {
          pattern: { kind: "function-call", functionName: "userSetup" },
          file: "/app/src/setup.ts" as NormalizedPath,
          span: mockSpan("/app/src/setup.ts" as NormalizedPath),
          reason: "Cannot statically analyze function call 'userSetup()'",
        },
      ];

      const diagnostics = unresolvedToDiagnostics(unresolved);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("userSetup");
    });
  });

  describe("unresolvedRefsToDiagnostics", () => {
    it("converts unresolved resource refs to diagnostics", () => {
      const refs: UnresolvedResourceInfo[] = [
        {
          name: "NotAResource",
          reason: "Identifier 'NotAResource' is not a known Aurelia resource",
          file: "/app/src/my-component.ts" as NormalizedPath,
        },
      ];

      const diagnostics = unresolvedRefsToDiagnostics(refs);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe(RES0021_NOT_A_RESOURCE);
      expect(diagnostics[0].severity).toBe("warning");
      expect(diagnostics[0].message).toBe("Identifier 'NotAResource' is not a known Aurelia resource");
      expect(diagnostics[0].source).toBe("/app/src/my-component.ts");
    });

    it("filters out unresolved refs from external packages", () => {
      const refs: UnresolvedResourceInfo[] = [
        {
          name: "InternalThing",
          reason: "Identifier 'InternalThing' is not a known Aurelia resource",
          file: "/node_modules/@aurelia/runtime-html/dist/something.ts" as NormalizedPath,
        },
        {
          name: "UserThing",
          reason: "Identifier 'UserThing' is not a known Aurelia resource",
          file: "/app/src/my-component.ts" as NormalizedPath,
        },
      ];

      const diagnostics = unresolvedRefsToDiagnostics(refs);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("UserThing");
    });

    it("filters out refs from aurelia submodule", () => {
      const refs: UnresolvedResourceInfo[] = [
        {
          name: "RuntimeInternal",
          reason: "Not a resource",
          file: "/projects/aurelia-ls/aurelia/packages/runtime/src/internal.ts" as NormalizedPath,
        },
      ];

      const diagnostics = unresolvedRefsToDiagnostics(refs);

      expect(diagnostics).toHaveLength(0);
    });

    it("handles empty refs array", () => {
      const diagnostics = unresolvedRefsToDiagnostics([]);

      expect(diagnostics).toHaveLength(0);
    });

    it("handles multiple refs from user code", () => {
      const refs: UnresolvedResourceInfo[] = [
        {
          name: "HelperA",
          reason: "Identifier 'HelperA' is not a known Aurelia resource",
          file: "/app/src/a.ts" as NormalizedPath,
        },
        {
          name: "HelperB",
          reason: "Identifier 'HelperB' is not a known Aurelia resource",
          file: "/app/src/b.ts" as NormalizedPath,
        },
      ];

      const diagnostics = unresolvedRefsToDiagnostics(refs);

      expect(diagnostics).toHaveLength(2);
      expect(diagnostics[0].message).toContain("HelperA");
      expect(diagnostics[1].message).toContain("HelperB");
    });
  });
});
