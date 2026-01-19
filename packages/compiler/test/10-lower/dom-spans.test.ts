import { describe, expect, it } from "vitest";
import { lowerDocument, spanContainsOffset, type DOMNode, type SourceSpan, type TemplateIR } from "@aurelia-ls/compiler";
import { createCompilerContext, lowerOpts, type TestVector } from "../_helpers/vector-runner.js";

function tagNameOffsets(text: string, tag: string): number[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const open = [...text.matchAll(new RegExp(`<${escaped}\\b`, "g"))].map((m) => m.index! + 1);
  const close = [...text.matchAll(new RegExp(`</${escaped}\\b`, "g"))].map((m) => m.index! + 2);
  return [...open, ...close];
}

function collectTagSpans(templates: readonly TemplateIR[], tag: string): SourceSpan[] {
  const spans: SourceSpan[] = [];
  const walk = (node: DOMNode | null | undefined) => {
    if (!node) return;
    if (node.kind === "element" && node.tag === tag) {
      if (node.tagLoc) spans.push(node.tagLoc);
      if (node.closeTagLoc) spans.push(node.closeTagLoc);
    }
    if (node.kind === "element" || node.kind === "template") {
      for (const child of node.children ?? []) {
        walk(child);
      }
    }
  };
  for (const template of templates) {
    walk(template.dom);
  }
  return spans;
}

function expectOffsetsCovered(spans: readonly SourceSpan[], offsets: readonly number[], label: string): void {
  expect(offsets.length, `No offsets found for ${label}`).toBeGreaterThan(0);
  for (const offset of offsets) {
    const hit = spans.some((span) => spanContainsOffset(span, offset));
    expect(hit, `Missing span for ${label} at offset ${offset}`).toBe(true);
  }
}

describe("Lower (10) DOM tag spans", () => {
  it("keeps tag spans for nested controller templates", () => {
    const markup = [
      `<div if.bind="isOpen">`,
      `  <pulse-dot></pulse-dot>`,
      `  <template repeat.for="item of items">`,
      `    <status-badge></status-badge>`,
      `  </template>`,
      `</div>`,
    ].join("\n");

    const ctx = createCompilerContext({ name: "dom-spans", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));
    expect(ir.templates?.length ?? 0).toBeGreaterThan(1);

    const pulseSpans = collectTagSpans(ir.templates ?? [], "pulse-dot");
    const statusSpans = collectTagSpans(ir.templates ?? [], "status-badge");

    expectOffsetsCovered(pulseSpans, tagNameOffsets(markup, "pulse-dot"), "pulse-dot");
    expectOffsetsCovered(statusSpans, tagNameOffsets(markup, "status-badge"), "status-badge");
  });

  it("keeps tag spans inside template controller elements", () => {
    const markup = [
      `<template if.bind="ready">`,
      `  <info-pill></info-pill>`,
      `</template>`,
    ].join("\n");

    const ctx = createCompilerContext({ name: "dom-spans-template", markup } as TestVector);
    const ir = lowerDocument(markup, lowerOpts(ctx));

    const spans = collectTagSpans(ir.templates ?? [], "info-pill");
    expectOffsetsCovered(spans, tagNameOffsets(markup, "info-pill"), "info-pill");
  });
});
