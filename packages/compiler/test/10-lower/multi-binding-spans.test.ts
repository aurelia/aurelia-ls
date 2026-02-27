/**
 * Unit tests for multi-binding expression span computation.
 *
 * These tests verify that when an attribute uses multi-binding syntax
 * (e.g., "prop1.bind: expr1; prop2.bind: expr2"), each expression
 * has a span that points to its actual location in the source, not
 * the full attribute value.
 */

import path from "node:path";
import { describe, test, expect } from "vitest";
import { lowerDocument } from "../../out/analysis/10-lower/lower.js";
import { toSourceFileId } from "../../out/model/identity.js";
import type { ExprRef, InstructionIR } from "../../out/model/ir.js";
import { createCompilerContext, lowerOpts, type TestVector } from "../_helpers/vector-runner.js";

// Semantics override for `load` custom attribute with bindables
const loadAttrSemantics = {
  resources: {
    attributes: {
      load: {
        kind: "attribute" as const,
        name: "load",
        bindables: {
          route: { name: "route", mode: "toView" as const, primary: true },
          params: { name: "params", mode: "toView" as const },
          context: { name: "context", mode: "toView" as const },
          attribute: { name: "attribute", mode: "toView" as const },
          active: { name: "active", mode: "twoWay" as const },
        },
      },
    },
  },
};

// Helper to extract expression refs from instructions
function collectExprRefs(instructions: InstructionIR[]): ExprRef[] {
  const refs: ExprRef[] = [];
  const walk = (instr: InstructionIR) => {
    // Property bindings have a `from` with ExprRef
    if ("from" in instr && instr.from && typeof instr.from === "object") {
      const from = instr.from as { id?: string; code?: string; loc?: unknown; refs?: ExprRef[] };
      if (from.id && from.code && from.loc) {
        refs.push(from as ExprRef);
      }
      // Also check for interpolation refs
      if (from.refs && Array.isArray(from.refs)) {
        refs.push(...from.refs);
      }
    }
    // Recurse into nested instructions
    if ("instructions" in instr && Array.isArray(instr.instructions)) {
      for (const child of instr.instructions as InstructionIR[]) {
        walk(child);
      }
    }
    // Recurse into hydrateAttribute props
    if ("props" in instr && Array.isArray(instr.props)) {
      for (const prop of instr.props as InstructionIR[]) {
        walk(prop);
      }
    }
  };
  for (const instr of instructions) {
    walk(instr);
  }
  return refs;
}

// Helper to extract all expression refs from templates
function collectAllExprRefs(ir: ReturnType<typeof lowerDocument>): ExprRef[] {
  const refs: ExprRef[] = [];
  for (const template of ir.templates ?? []) {
    for (const row of template.rows ?? []) {
      refs.push(...collectExprRefs(row.instructions));
    }
  }
  return refs;
}

describe("Multi-binding expression spans (10-lower)", () => {
  test("each expression in multi-binding has its own span", () => {
    // The attribute value starts after 'load="' - we need to calculate the exact offset
    // Markup: <a load="route.bind: currentRoute; params.bind: routeParams"></a>
    //         0123456789...
    const markup = `<a load="route.bind: currentRoute; params.bind: routeParams"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-spans", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    // We expect 2 expression refs: "currentRoute" and "routeParams"
    expect(refs.length).toBeGreaterThanOrEqual(2);

    const currentRouteRef = refs.find(r => r.code === "currentRoute");
    const routeParamsRef = refs.find(r => r.code === "routeParams");

    expect(currentRouteRef).toBeTruthy();
    expect(routeParamsRef).toBeTruthy();

    // Verify spans are different (not both pointing to full attribute)
    expect(currentRouteRef!.loc?.start).not.toBe(routeParamsRef!.loc?.start);

    // Calculate expected offsets:
    // <a load="route.bind: currentRoute; params.bind: routeParams">
    // 0        9          21          33 35         47          59
    // The attribute value starts at offset 9 (after '<a load="')
    // "route.bind: currentRoute" - currentRoute starts at 21 (9 + 12 chars for "route.bind: ")
    // "params.bind: routeParams" - routeParams starts at 48 (35 + 13 chars for "params.bind: ")

    const attrValueStart = markup.indexOf('route.bind');
    const currentRouteStart = markup.indexOf('currentRoute');
    const routeParamsStart = markup.indexOf('routeParams');

    // Verify the expression spans point to the actual expression locations
    expect(currentRouteRef!.loc!.start).toBe(currentRouteStart);
    expect(currentRouteRef!.loc!.end).toBe(currentRouteStart + "currentRoute".length);

    expect(routeParamsRef!.loc!.start).toBe(routeParamsStart);
    expect(routeParamsRef!.loc!.end).toBe(routeParamsStart + "routeParams".length);
  });

  test("whitespace in multi-binding is properly trimmed from spans", () => {
    // Extra whitespace around values
    const markup = `<a load="  route.bind  :  current  ;  params.bind  :  data  "></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-whitespace", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    const currentRef = refs.find(r => r.code === "current");
    const dataRef = refs.find(r => r.code === "data");

    expect(currentRef).toBeTruthy();
    expect(dataRef).toBeTruthy();

    // Verify spans point to trimmed expressions, not including surrounding whitespace
    const currentStart = markup.indexOf('current');
    const dataStart = markup.indexOf('data');

    expect(currentRef!.loc!.start).toBe(currentStart);
    expect(currentRef!.loc!.end).toBe(currentStart + "current".length);

    expect(dataRef!.loc!.start).toBe(dataStart);
    expect(dataRef!.loc!.end).toBe(dataStart + "data".length);
  });

  test("member access expression in multi-binding has correct span", () => {
    // Expression with member access
    const markup = `<a load="route.bind: config.path; params.bind: user.data"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-member", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    const configPathRef = refs.find(r => r.code === "config.path");
    const userDataRef = refs.find(r => r.code === "user.data");

    expect(configPathRef).toBeTruthy();
    expect(userDataRef).toBeTruthy();

    const configPathStart = markup.indexOf('config.path');
    const userDataStart = markup.indexOf('user.data');

    expect(configPathRef!.loc!.start).toBe(configPathStart);
    expect(configPathRef!.loc!.end).toBe(configPathStart + "config.path".length);

    expect(userDataRef!.loc!.start).toBe(userDataStart);
    expect(userDataRef!.loc!.end).toBe(userDataStart + "user.data".length);
  });

  test("three expressions in multi-binding all have distinct spans", () => {
    const markup = `<a load="route.bind: a; params.bind: b; context.bind: c"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-three", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    const aRef = refs.find(r => r.code === "a");
    const bRef = refs.find(r => r.code === "b");
    const cRef = refs.find(r => r.code === "c");

    expect(aRef).toBeTruthy();
    expect(bRef).toBeTruthy();
    expect(cRef).toBeTruthy();

    // All starts should be different
    const starts = [aRef!.loc!.start, bRef!.loc!.start, cRef!.loc!.start];
    expect(new Set(starts).size).toBe(3);

    // Verify exact positions
    expect(aRef!.loc!.start).toBe(markup.indexOf(': a') + 2);
    expect(bRef!.loc!.start).toBe(markup.indexOf(': b') + 2);
    expect(cRef!.loc!.start).toBe(markup.indexOf(': c') + 2);
  });

  test("interpolation in multi-binding has correct span", () => {
    // Interpolation: route: products/${id}
    const markup = `<a load="route: products/\${id}; attribute: href"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-interp", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    // For interpolations, the expression refs are inside InterpIR.exprs array
    const interpRefs: ExprRef[] = [];
    for (const t of ir.templates ?? []) {
      for (const row of t.rows ?? []) {
        for (const instr of row.instructions) {
          if ("props" in instr && Array.isArray(instr.props)) {
            for (const prop of instr.props as { type: string; from?: { kind?: string; exprs?: ExprRef[] } }[]) {
              if (prop.type === "attributeBinding" && prop.from?.kind === "interp" && prop.from.exprs) {
                interpRefs.push(...prop.from.exprs);
              }
            }
          }
        }
      }
    }

    // The interpolation should have an expression ref for "id"
    const idRef = interpRefs.find(r => r.code === "id");
    expect(idRef).toBeTruthy();

    // The span should point to "id" within the interpolation
    const idStart = markup.indexOf('${id}') + 2; // After "${"
    expect(idRef!.loc!.start).toBe(idStart);
    expect(idRef!.loc!.end).toBe(idStart + "id".length);
  });

  test("complex expression in multi-binding preserves full span", () => {
    // Object literal expression
    const markup = `<a load="route: home; params.bind: {id: 1, name: 'test'}"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-complex", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    // Find the object literal expression
    const objRef = refs.find(r => r.code?.includes("{id:"));
    expect(objRef).toBeTruthy();

    // The span should cover the full object literal
    const objStart = markup.indexOf("{id:");
    expect(objRef!.loc!.start).toBe(objStart);
  });

  test("expression refs are stored directly with absolute spans", () => {
    // This test verifies that expression refs contain absolute spans (file positions)
    // that can be used for hover, go-to-definition, etc.
    const markup = `<a load="route.bind: expr1; params.bind: expr2"></a>`;

    const ctx = createCompilerContext({ name: "multi-binding-absolute", markup, semOverrides: loadAttrSemantics } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const refs = collectAllExprRefs(ir);

    const expr1Ref = refs.find(r => r.code === "expr1");
    const expr2Ref = refs.find(r => r.code === "expr2");

    expect(expr1Ref).toBeTruthy();
    expect(expr2Ref).toBeTruthy();

    // Verify refs contain canonical file information for absolute spans.
    const expectedFile = toSourceFileId(path.resolve(process.cwd(), "mem.html"));
    expect(expr1Ref!.loc!.file).toBe(expectedFile);
    expect(expr2Ref!.loc!.file).toBe(expectedFile);

    // Verify spans are absolute (matching source positions)
    const expr1Start = markup.indexOf("expr1");
    const expr2Start = markup.indexOf("expr2");

    expect(expr1Ref!.loc!.start).toBe(expr1Start);
    expect(expr2Ref!.loc!.start).toBe(expr2Start);
  });
});
