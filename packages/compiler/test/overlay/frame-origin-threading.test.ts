import { describe, test, expect } from "vitest";

import type { ExprId, FrameId, FrameOrigin, IrModule, SourceSpan, TextSpan } from "@aurelia-ls/compiler";
import { planOverlay } from "@aurelia-ls/compiler";
import type { OverlayEmitMappingEntry } from "../../src/synthesis/overlay/emit.js";
import type { BuildMappingInputs } from "../../src/synthesis/overlay/mapping.js";
import { buildTemplateMapping } from "../../src/synthesis/overlay/mapping.js";
import type { SourceFile } from "../../src/model/source.js";
import { toSourceFileId } from "../../src/model/identity.js";
import type { LinkModule } from "../../src/analysis/20-link/types.js";
import type { ScopeModule, ScopeTemplate } from "../../src/model/symbols.js";

// -- Helpers --

function fakeSourceFile(text: string): SourceFile {
  return {
    id: toSourceFileId("/test/fake.html"),
    absolutePath: "/test/fake.html",
    normalizedPath: "/test/fake.html" as any,
    text,
    lineStarts: [0],
    toString: () => text,
  } as any;
}

const iteratorOrigin: FrameOrigin = {
  kind: "iterator",
  forOfAstId: "expr:items" as ExprId,
  controller: "repeat",
};

const vmStub = {
  getRootVmTypeExpr() { return "TestVm"; },
  getSyntheticPrefix() { return "__AU_TTC_"; },
};

/**
 * Test pattern BI: planOverlay threads origin from ScopeFrame to FrameOverlayPlan.
 *
 * Constructs a ScopeTemplate with a child frame that has iterator origin,
 * runs it through planOverlay, and verifies the resulting FrameOverlayPlan
 * carries the origin. This exercises the actual plan.ts code path (line 132)
 * that conditionally includes origin on the output plan.
 */
describe("BI: planOverlay threads origin to FrameOverlayPlan", () => {
  const scopeTemplate: ScopeTemplate = {
    name: "test-component",
    frames: [
      {
        id: 0 as FrameId,
        parent: null,
        kind: "root",
        symbols: [],
      },
      {
        id: 1 as FrameId,
        parent: 0 as FrameId,
        kind: "overlay",
        symbols: [{ kind: "iteratorLocal", name: "item" }],
        origin: iteratorOrigin,
      },
    ],
    root: 0 as FrameId,
    exprToFrame: new Map() as any,
  };

  // Minimal LinkModule — planOverlay scans it for listener event types and expr table,
  // but we have no expressions, so empty templates suffice.
  const linked: LinkModule = {
    version: "aurelia-linked@1",
    templates: [],
  };

  const scope: ScopeModule = {
    version: "aurelia-scope@1",
    templates: [scopeTemplate],
  };

  test("child frame with origin produces FrameOverlayPlan with origin", () => {
    const result = planOverlay(linked, scope, { isJs: false, vm: vmStub });

    expect(result.templates).toHaveLength(1);
    const template = result.templates[0]!;

    // Should have 2 frames (root + child)
    expect(template.frames).toHaveLength(2);

    const childPlan = template.frames.find((f) => f.frame === (1 as FrameId));
    expect(childPlan, "child frame plan should exist").toBeTruthy();
    expect(childPlan!.origin).toBeDefined();
    expect(childPlan!.origin!.kind).toBe("iterator");
    expect((childPlan!.origin as Extract<FrameOrigin, { kind: "iterator" }>).controller).toBe("repeat");
  });

  test("root frame without origin produces FrameOverlayPlan without origin", () => {
    const result = planOverlay(linked, scope, { isJs: false, vm: vmStub });

    const rootPlan = result.templates[0]!.frames.find((f) => f.frame === (0 as FrameId));
    expect(rootPlan, "root frame plan should exist").toBeTruthy();
    expect(rootPlan!.origin).toBeUndefined();
  });
});

/**
 * Test pattern BJ: buildTemplateMapping threads frameOrigin from inputs to entries.
 *
 * When frameOrigins is provided in BuildMappingInputs, entries that map to
 * expressions in those frames carry frameOrigin. This tests the mapping.ts
 * code that looks up frame origins by frameId.
 */
describe("BJ: buildTemplateMapping carries frameOrigin", () => {
  test("entries for framed expressions carry frameOrigin", () => {
    const exprId = "expr:item.name" as ExprId;
    const frameId = 1 as FrameId;
    const htmlText = "<template>${item.name}</template>";
    const fallbackFile = fakeSourceFile(htmlText);

    const overlayMapping: OverlayEmitMappingEntry[] = [{
      exprId,
      span: { start: 0, end: 9 } as TextSpan,
    }];

    // Minimal IrModule with a single expression to satisfy buildExprSpanIndex
    const ir: IrModule = {
      version: "aurelia-ir@1",
      templates: [{
        id: "t0" as any,
        children: [],
        expressions: [{
          $kind: "Interpolation",
          id: exprId,
          span: { file: fallbackFile.id, start: 12, end: 21 } as SourceSpan,
          parts: [],
        }],
      }] as any,
    };

    const exprToFrame = new Map<ExprId, FrameId>([[exprId, frameId]]) as any;
    const frameOrigins = new Map<FrameId, FrameOrigin>([[frameId, iteratorOrigin]]);

    const inputs: BuildMappingInputs = {
      overlayMapping,
      ir,
      fallbackFile,
      exprToFrame,
      frameOrigins,
    };

    const result = buildTemplateMapping(inputs);
    const entry = result.mapping.entries.find((e) => e.exprId === exprId);
    expect(entry, "mapping entry for expression should exist").toBeTruthy();
    expect(entry!.frameId).toBe(frameId);
    expect(entry!.frameOrigin).toBeDefined();
    expect(entry!.frameOrigin!.kind).toBe("iterator");
  });

  test("entries without frameOrigins map have no frameOrigin", () => {
    const exprId = "expr:value" as ExprId;
    const htmlText = "<template>${value}</template>";
    const fallbackFile = fakeSourceFile(htmlText);

    const overlayMapping: OverlayEmitMappingEntry[] = [{
      exprId,
      span: { start: 0, end: 5 } as TextSpan,
    }];

    const ir: IrModule = {
      version: "aurelia-ir@1",
      templates: [{
        id: "t0" as any,
        children: [],
        expressions: [{
          $kind: "Interpolation",
          id: exprId,
          span: { file: fallbackFile.id, start: 12, end: 17 } as SourceSpan,
          parts: [],
        }],
      }] as any,
    };

    const inputs: BuildMappingInputs = {
      overlayMapping,
      ir,
      fallbackFile,
    };

    const result = buildTemplateMapping(inputs);
    const entry = result.mapping.entries.find((e) => e.exprId === exprId);
    expect(entry, "mapping entry should exist").toBeTruthy();
    expect(entry!.frameOrigin).toBeUndefined();
  });
});
