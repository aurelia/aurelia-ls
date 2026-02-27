import type { LinkedInstruction, LinkedRow } from "@aurelia-ls/compiler/analysis/20-link/types.js";
import type { TemplateIR } from "@aurelia-ls/compiler/model/ir.js";
import { spanContainsOffset, spanLength, type SourceSpan } from "@aurelia-ls/compiler/model/span.js";
import { analyzeAttributeName, type AttributeParser } from "@aurelia-ls/compiler/parsing/attribute-parser.js";
import type { TemplateSyntaxRegistry } from "@aurelia-ls/compiler/schema/types.js";
import type { DomIndex } from "./template-dom.js";
import { findAttrForSpan, findDomNode } from "./template-dom.js";

type HostKind = "custom" | "native" | "none";

type LinkedInstructionWithProps = LinkedInstruction & {
  props?: readonly LinkedInstruction[];
};

export type TemplateInstructionHit<TOwner = unknown> = {
  instruction: LinkedInstruction;
  loc: SourceSpan;
  len: number;
  hostTag?: string;
  hostKind?: HostKind;
  owner?: TOwner | null;
  attrName?: string | null;
  attrNameSpan?: SourceSpan | null;
};

type ResolveInstructionOwnerArgs<TOwner> = {
  row: LinkedRow;
  instruction: LinkedInstruction;
  parentInstruction: LinkedInstruction | null;
};

type CollectInstructionHitOptions<TOwner> = {
  resolveOwner?: (args: ResolveInstructionOwnerArgs<TOwner>) => TOwner | null;
};

function instructionHost(row: LinkedRow): { hostTag?: string; hostKind?: HostKind } {
  return row.node.kind === "element"
    ? {
      hostTag: row.node.tag,
      hostKind: row.node.custom ? "custom" : row.node.native ? "native" : "none",
    }
    : {};
}

function instructionChildren(instruction: LinkedInstruction): readonly LinkedInstruction[] {
  if (
    instruction.kind !== "hydrateElement"
    && instruction.kind !== "hydrateAttribute"
    && instruction.kind !== "hydrateTemplateController"
  ) {
    return [];
  }
  return (instruction as LinkedInstructionWithProps).props ?? [];
}

export function collectInstructionHits<TOwner = unknown>(
  templates: readonly { rows: readonly LinkedRow[] }[],
  irTemplates: readonly TemplateIR[],
  domIndex: DomIndex,
  options: CollectInstructionHitOptions<TOwner> = {},
): TemplateInstructionHit<TOwner>[] {
  const hits: TemplateInstructionHit<TOwner>[] = [];
  const { resolveOwner } = options;
  for (let ti = 0; ti < templates.length; ti += 1) {
    const template = templates[ti];
    const irTemplate = irTemplates[ti];
    if (!template || !irTemplate) continue;
    for (const row of template.rows ?? []) {
      const host = instructionHost(row);
      const domNode = findDomNode(domIndex, ti, row.target);
      const addHit = (instruction: LinkedInstruction, parentInstruction: LinkedInstruction | null) => {
        const loc = instruction.loc ?? null;
        if (!loc) return;
        const attr = domNode && (domNode.kind === "element" || domNode.kind === "template")
          ? findAttrForSpan(domNode, loc)
          : null;
        const owner = resolveOwner
          ? resolveOwner({ row, instruction, parentInstruction })
          : null;
        hits.push({
          instruction,
          loc,
          len: spanLength(loc),
          hostTag: host.hostTag,
          hostKind: host.hostKind,
          ...(owner != null ? { owner } : {}),
          attrName: attr?.name ?? null,
          attrNameSpan: attr?.nameLoc ?? null,
        });
      };
      for (const instruction of row.instructions ?? []) {
        addHit(instruction, null);
        for (const child of instructionChildren(instruction)) {
          addHit(child, instruction);
        }
      }
    }
  }
  return hits;
}

export function findInstructionHitsAtOffset<TOwner = unknown>(
  templates: readonly { rows: readonly LinkedRow[] }[],
  irTemplates: readonly TemplateIR[],
  domIndex: DomIndex,
  offset: number,
  options: CollectInstructionHitOptions<TOwner> = {},
): TemplateInstructionHit<TOwner>[] {
  const hits = collectInstructionHits(templates, irTemplates, domIndex, options);
  const filtered = hits.filter((hit) => spanContainsOffset(hit.loc, offset));
  filtered.sort((a, b) => a.len - b.len);
  return filtered;
}

type AttributeAnalysisLike = {
  targetSpan?: { start: number; end: number } | null;
  syntax: {
    target?: string | null;
    command?: string | null;
  };
};

export function attributeTargetNameFromAnalysis(
  attrName: string | null,
  analysis: AttributeAnalysisLike | null | undefined,
): string | null {
  if (!attrName) return null;
  if (!analysis) return attrName;
  if (analysis.targetSpan) {
    return attrName.slice(analysis.targetSpan.start, analysis.targetSpan.end);
  }
  const target = analysis.syntax.target?.trim();
  if (target && attrName.includes(target)) return target;
  if (analysis.syntax.command) return null;
  return attrName;
}

export function attributeTargetNameFromSyntax(
  attrName: string | null,
  syntax: { syntax: TemplateSyntaxRegistry; parser: AttributeParser },
): string | null {
  if (!attrName) return null;
  const analysis = analyzeAttributeName(attrName, syntax.syntax, syntax.parser);
  return attributeTargetNameFromAnalysis(attrName, analysis);
}

type ExpressionNameLike = string | { name: string; span?: SourceSpan } | null | undefined;

export type ExpressionAstLike = {
  $kind?: string;
  span?: SourceSpan;
  name?: ExpressionNameLike;
  expression?: unknown;
  object?: unknown;
  func?: unknown;
  args?: readonly unknown[];
  left?: unknown;
  right?: unknown;
  condition?: unknown;
  yes?: unknown;
  no?: unknown;
  target?: unknown;
  value?: unknown;
  key?: unknown;
  parts?: readonly unknown[];
  expressions?: readonly unknown[];
  elements?: readonly unknown[];
  values?: readonly unknown[];
  body?: unknown;
  params?: readonly unknown[];
  declaration?: unknown;
  iterable?: unknown;
};

function isExpressionAstLike(value: unknown): value is ExpressionAstLike {
  return !!value && typeof value === "object" && "$kind" in value;
}

export function collectExpressionAstChildren(node: ExpressionAstLike): ExpressionAstLike[] {
  const children: ExpressionAstLike[] = [];
  const push = (child?: unknown) => {
    if (isExpressionAstLike(child)) children.push(child);
  };

  push(node.expression);
  push(node.object);
  push(node.func);
  push(node.left);
  push(node.right);
  push(node.condition);
  push(node.yes);
  push(node.no);
  push(node.target);
  push(node.value);
  push(node.key);
  push(node.declaration);
  push(node.iterable);
  push(node.body);
  if (node.args) node.args.forEach(push);
  if (node.parts) node.parts.forEach(push);
  if (node.expressions) node.expressions.forEach(push);
  if (node.elements) node.elements.forEach(push);
  if (node.values) node.values.forEach(push);
  if (node.params) node.params.forEach(push);

  const patternDefault = node as ExpressionAstLike & { default?: unknown };
  if (patternDefault.default) push(patternDefault.default);

  return children;
}

function readExpressionResourceName(node: ExpressionAstLike): { name: string; span: SourceSpan } | null {
  const name = node.name;
  if (!name) return null;
  if (typeof name === "string") {
    return node.span ? { name, span: node.span } : null;
  }
  const span = name.span ?? node.span ?? null;
  if (!span) return null;
  return { name: name.name, span };
}

function findExpressionResourceNameInAst(
  node: ExpressionAstLike | null | undefined,
  offset: number,
  kind: "ValueConverter" | "BindingBehavior",
): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === kind) {
    const ident = readExpressionResourceName(node);
    if (ident?.span && spanContainsOffset(ident.span, offset)) {
      return ident.name;
    }
  }
  for (const child of collectExpressionAstChildren(node)) {
    const hit = findExpressionResourceNameInAst(child, offset, kind);
    if (hit) return hit;
  }
  return null;
}

export function findExpressionResourceAtOffset<TExprId>(
  exprTable: readonly { id: TExprId; ast: unknown }[],
  offset: number,
  kind: "ValueConverter" | "BindingBehavior",
): { name: string; exprId: TExprId } | null {
  for (const entry of exprTable) {
    const hit = findExpressionResourceNameInAst(entry.ast as ExpressionAstLike, offset, kind);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

export function findValueConverterAtOffset<TExprId>(
  exprTable: readonly { id: TExprId; ast: unknown }[],
  offset: number,
): { name: string; exprId: TExprId } | null {
  return findExpressionResourceAtOffset(exprTable, offset, "ValueConverter");
}

export function findBindingBehaviorAtOffset<TExprId>(
  exprTable: readonly { id: TExprId; ast: unknown }[],
  offset: number,
): { name: string; exprId: TExprId } | null {
  return findExpressionResourceAtOffset(exprTable, offset, "BindingBehavior");
}

function collectExpressionResourceNameSpansInAst(
  node: ExpressionAstLike | null | undefined,
  kind: "ValueConverter" | "BindingBehavior",
  name: string,
  spans: SourceSpan[],
): void {
  if (!node || !node.$kind) return;
  if (node.$kind === kind) {
    const ident = readExpressionResourceName(node);
    if (ident?.span && ident.name === name) {
      spans.push({
        start: ident.span.start,
        end: ident.span.end,
        ...(ident.span.file ? { file: ident.span.file } : {}),
      });
    }
  }
  for (const child of collectExpressionAstChildren(node)) {
    collectExpressionResourceNameSpansInAst(child, kind, name, spans);
  }
}

export function collectExpressionResourceNameSpans(
  exprTable: readonly { ast: unknown }[],
  kind: "ValueConverter" | "BindingBehavior",
  name: string,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const entry of exprTable) {
    collectExpressionResourceNameSpansInAst(entry.ast as ExpressionAstLike, kind, name, spans);
  }
  return spans;
}
