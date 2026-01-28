import {
  analyzeAttributeName,
  createAttributeParserFromRegistry,
  debug,
  isDebugEnabled,
  type AttributeParser,
  type DOMNode,
  type ExprId,
  type LinkedInstruction,
  type LinkedRow,
  type NodeId,
  type SourceSpan,
  type TemplateCompilation,
  type TemplateIR,
  type TemplateSyntaxRegistry,
  spanContainsOffset,
  spanLength,
} from "@aurelia-ls/compiler";
import { buildDomIndex, findAttrForSpan, findDomNode } from "./template-dom.js";

export interface TemplateHoverDetails {
  readonly lines: string[];
  readonly span?: SourceSpan;
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
}

export function collectTemplateHover(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  syntax?: TemplateSyntaxRegistry | null;
  attrParser?: AttributeParser;
}): TemplateHoverDetails | null {
  const { compilation, text, offset } = options;
  const syntax = options.syntax ?? null;
  const attrParser = syntax ? (options.attrParser ?? createAttributeParserFromRegistry(syntax)) : null;
  const debugEnabled = isDebugEnabled("workspace");
  if (debugEnabled) {
    const previewStart = Math.max(0, offset - 40);
    const previewEnd = Math.min(text.length, offset + 40);
    debug.workspace("hover.start", {
      offset,
      preview: text.slice(previewStart, previewEnd),
      bindingCommandCount: Object.keys(syntax?.bindingCommands ?? {}).length,
      templateCount: compilation.linked.templates.length,
      exprTableCount: compilation.exprTable.length,
    });
  }
  const lines: string[] = [];
  const seen = new Set<string>();
  let span: SourceSpan | undefined;
  let exprId: ExprId | undefined;
  let nodeId: NodeId | undefined;

  const addLine = (label: string, value: string) => {
    const line = `**${label}:** ${value}`;
    if (seen.has(line)) return;
    seen.add(line);
    lines.push(line);
  };

  const expr = compilation.query.exprAt(offset);
  if (debugEnabled) {
    debug.workspace("hover.expr", {
      hit: !!expr,
      exprId: expr?.exprId,
      memberPath: expr?.memberPath,
      span: expr?.span,
    });
  }
  if (expr) {
    exprId = expr.exprId;
    span = span ?? expr.span;
    const exprAst = findExpressionAst(compilation.exprTable ?? [], expr.exprId);
    const pathAtOffset = exprAst ? expressionLabelAtOffset(exprAst, offset) : null;
    const label = chooseExpressionLabel(pathAtOffset, expr.memberPath) ?? "expression";
    addLine("Expression", label);
  }

  const controller = compilation.query.controllerAt(offset);
  if (debugEnabled) {
    debug.workspace("hover.controller", {
      hit: !!controller,
      kind: controller?.kind,
      span: controller?.span,
    });
  }
  if (controller) {
    span = span ?? controller.span;
    addLine("Template Controller", controller.kind);
  }

  const node = compilation.query.nodeAt(offset);
  if (node) {
    nodeId = node.id;
    span = span ?? node.span;
    const row = findRow(compilation.linked.templates, node.templateIndex, node.id);
    if (debugEnabled) {
      debug.workspace("hover.node", {
        hit: true,
        nodeId: node.id,
        hostKind: node.hostKind,
        templateIndex: node.templateIndex,
        rowKind: row?.node.kind,
        tag: row?.node.kind === "element" ? row.node.tag : null,
        custom: row?.node.kind === "element" ? row.node.custom?.def.name : null,
        native: row?.node.kind === "element" ? row.node.native?.def.tag : null,
      });
    }
    if (row?.node.kind === "element") {
      const tag = row.node.tag;
      if (row.node.custom?.def) {
        addLine("Custom Element", row.node.custom.def.name);
      } else if (row.node.native?.def) {
        addLine("HTML Element", tag);
      } else if (looksLikeCustomElementTag(tag)) {
        addLine("Custom Element", tag);
      } else {
        addLine("HTML Element", tag);
      }
    }
  } else if (debugEnabled) {
    debug.workspace("hover.node", { hit: false });
  }

  const domIndex = buildDomIndex(compilation.ir.templates ?? []);
  const instructionHits = findInstructionsAtOffset(
    compilation.linked.templates,
    compilation.ir.templates ?? [],
    domIndex,
    offset
  );
  if (debugEnabled) {
    debug.workspace("hover.instructions", {
      hitCount: instructionHits.length,
      kinds: instructionHits.map((hit) => hit.instruction.kind),
    });
  }
  if (instructionHits.length) {
    const [primary] = instructionHits;
    if (primary) {
      // Instruction span is more specific than node span — prefer it.
      span = primary.loc;
    }
    for (const hit of instructionHits) {
      applyInstructionHover(hit.instruction, hit.loc, hit.attrName ?? null, {
        addLine,
        syntax,
        attrParser,
        hostTag: hit.hostTag,
        hostKind: hit.hostKind,
        debugEnabled,
      });
    }

    if (primary) {
      const attrName = primary.attrName ?? null;
      const command = attrName ? commandFromAttribute(attrName, syntax, attrParser) : null;
      if (command) addLine("Binding Command", command);
    }
  }

  const converterHit = findValueConverterAtOffset(compilation.exprTable, offset);
  if (debugEnabled) {
    debug.workspace("hover.converter", { hit: !!converterHit, name: converterHit?.name });
  }
  if (converterHit) {
    exprId = exprId ?? converterHit.exprId;
    addLine("Value Converter", converterHit.name);
  }

  const behaviorHit = findBindingBehaviorAtOffset(compilation.exprTable, offset);
  if (debugEnabled) {
    debug.workspace("hover.behavior", { hit: !!behaviorHit, name: behaviorHit?.name });
  }
  if (behaviorHit) {
    exprId = exprId ?? behaviorHit.exprId;
    addLine("Binding Behavior", behaviorHit.name);
  }

  if (lines.length === 0) {
    if (debugEnabled) {
      debug.workspace("hover.empty", { offset });
    }
    return null;
  }
  if (debugEnabled) {
    debug.workspace("hover.result", { lineCount: lines.length, exprId, nodeId, span });
  }
  return { lines, span, exprId, nodeId };
}

export function mergeHoverContents(detailLines: readonly string[], base?: string | null): string | null {
  const blocks: string[] = [];
  const seen = new Set<string>();
  for (const line of detailLines) {
    if (seen.has(line)) continue;
    seen.add(line);
    blocks.push(line);
  }
  if (base) {
    if (!seen.has(base)) blocks.push(base);
  }
  return blocks.length ? blocks.join("\n\n") : null;
}

type InstructionHit = {
  instruction: LinkedInstruction;
  loc: SourceSpan;
  len: number;
  hostTag?: string;
  hostKind?: "custom" | "native" | "none";
  attrName?: string | null;
  attrNameSpan?: SourceSpan | null;
};

function findInstructionsAtOffset(
  templates: readonly { rows: readonly LinkedRow[] }[],
  irTemplates: readonly TemplateIR[],
  domIndex: ReturnType<typeof buildDomIndex>,
  offset: number,
): InstructionHit[] {
  const hits: InstructionHit[] = [];
  const addHit = (
    instruction: LinkedInstruction,
    host: { hostTag?: string; hostKind?: "custom" | "native" | "none" },
    node: DOMNode | null,
  ) => {
    const loc = instruction.loc ?? null;
    if (!loc) return;
    if (!spanContainsOffset(loc, offset)) return;
    const attr = node && (node.kind === "element" || node.kind === "template") ? findAttrForSpan(node, loc) : null;
    hits.push({
      instruction,
      loc,
      len: spanLength(loc),
      hostTag: host.hostTag,
      hostKind: host.hostKind,
      attrName: attr?.name ?? null,
      attrNameSpan: attr?.nameLoc ?? null,
    });
  };
  for (let ti = 0; ti < templates.length; ti += 1) {
    const template = templates[ti];
    const irTemplate = irTemplates[ti];
    if (!template || !irTemplate) continue;
    for (const row of template.rows ?? []) {
      const domNode = findDomNode(domIndex, ti, row.target);
      const host: { hostTag?: string; hostKind?: "custom" | "native" | "none" } =
        row.node.kind === "element"
          ? {
            hostTag: row.node.tag,
            hostKind: row.node.custom ? "custom" : row.node.native ? "native" : "none",
          }
          : {};
      for (const instruction of row.instructions ?? []) {
        addHit(instruction, host, domNode);
        if (instruction.kind === "hydrateElement" || instruction.kind === "hydrateAttribute" || instruction.kind === "hydrateTemplateController") {
          for (const prop of instruction.props ?? []) {
            addHit(prop, host, domNode);
          }
        }
      }
    }
  }
  hits.sort((a, b) => a.len - b.len);
  return hits;
}

function findRow(
  templates: readonly { rows: readonly LinkedRow[] }[],
  templateIndex: number,
  nodeId: NodeId,
): LinkedRow | null {
  const template = templates[templateIndex];
  if (!template) return null;
  return template.rows.find((row) => row.target === nodeId) ?? null;
}

function applyInstructionHover(
  instruction: LinkedInstruction,
  loc: SourceSpan,
  attrName: string | null,
  ctx: {
    addLine: (label: string, value: string) => void;
    syntax: TemplateSyntaxRegistry | null;
    attrParser: AttributeParser | null;
    hostTag?: string;
    hostKind?: "custom" | "native" | "none";
    debugEnabled?: boolean;
  },
): void {
  const analysis = attrName && ctx.syntax && ctx.attrParser
    ? analyzeAttributeName(attrName, ctx.syntax, ctx.attrParser)
    : null;

  switch (instruction.kind) {
    case "hydrateAttribute": {
      const resolvedName = instruction.res?.def.name ?? null;
      if (resolvedName) {
        ctx.addLine("Custom Attribute", resolvedName);
        break;
      }
      const fallbackName = attributeTargetName(attrName, analysis);
      if (fallbackName && ctx.debugEnabled) {
        debug.workspace("hover.fallback.custom-attribute", {
          attrName,
          fallback: fallbackName,
        });
      }
      if (fallbackName) ctx.addLine("Custom Attribute", fallbackName);
      break;
    }
    case "propertyBinding":
    case "attributeBinding": {
      const target = instruction.target as { kind?: string; reason?: string } | null | undefined;
      let line = describeBindableTarget(target, instruction.to);
      if (!line && target?.kind === "unknown") {
        line = describeBindableFallback(instruction.to, ctx.hostTag, ctx.hostKind);
        if (line && ctx.debugEnabled) {
          debug.workspace("hover.fallback.bindable", {
            name: instruction.to,
            hostTag: ctx.hostTag,
            hostKind: ctx.hostKind,
            reason: target.reason ?? null,
          });
        }
      }
      if (line) ctx.addLine("Bindable", line);
      break;
    }
    case "listenerBinding":
      ctx.addLine("Event", instruction.to);
      break;
    case "hydrateTemplateController":
      ctx.addLine("Template Controller", instruction.res);
      break;
    case "translationBinding":
      ctx.addLine("Translation", "t");
      break;
    default:
      break;
  }

  if (!attrName) return;
  if (instruction.kind === "setAttribute" || instruction.kind === "attributeBinding") {
    ctx.addLine("Attribute", attrName);
  }
}

function describeBindableTarget(target: { kind?: string } | null | undefined, to?: string): string | null {
  if (!target || typeof target !== "object" || !("kind" in target)) return null;
  switch (target.kind) {
    case "element.bindable": {
      const t = target as { bindable: { name: string }; element: { def: { name: string } } };
      return `${t.bindable.name} (component: ${t.element.def.name})`;
    }
    case "element.nativeProp": {
      const name = to ?? "unknown";
      return `${name} (html)`;
    }
    case "attribute.bindable": {
      const t = target as { bindable: { name: string }; attribute: { def: { name: string } } };
      return `${t.bindable.name} (attribute: ${t.attribute.def.name})`;
    }
    case "controller.prop": {
      const t = target as { bindable: { name: string }; controller: { res: string } };
      return `${t.bindable.name} (controller: ${t.controller.res})`;
    }
    case "attribute": {
      const t = target as { attr: string };
      return `${t.attr} (html)`;
    }
    default:
      return null;
  }
}

function describeBindableFallback(
  name: string,
  hostTag?: string,
  hostKind?: "custom" | "native" | "none",
): string | null {
  if (!name) return null;
  if (hostKind === "custom" || (hostTag && looksLikeCustomElementTag(hostTag))) {
    return `${name} (component: ${hostTag ?? "unknown"})`;
  }
  if (hostKind === "native") {
    return `${name} (html)`;
  }
  return name;
}

function attributeTargetName(
  attrName: string | null,
  analysis: ReturnType<typeof analyzeAttributeName> | null,
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

function commandFromAttribute(
  attrName: string,
  syntax: TemplateSyntaxRegistry | null,
  attrParser: AttributeParser | null,
): string | null {
  if (!syntax || !attrParser) return null;
  const analysis = analyzeAttributeName(attrName, syntax, attrParser);
  if (!analysis.commandSpan) return null;
  return analysis.syntax.command ?? null;
}

type IdentifierAst = {
  $kind: "Identifier";
  span: SourceSpan;
  name: string;
};

type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: IdentifierAst;
  expression?: ExpressionAst;
  object?: ExpressionAst;
  func?: ExpressionAst;
  args?: ExpressionAst[];
  left?: ExpressionAst;
  right?: ExpressionAst;
  condition?: ExpressionAst;
  yes?: ExpressionAst;
  no?: ExpressionAst;
  target?: ExpressionAst;
  value?: unknown;
  key?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  elements?: ExpressionAst[];
  values?: ExpressionAst[];
  body?: ExpressionAst;
  params?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
  ancestor?: number;
  optional?: boolean;
};

function findValueConverterAtOffset(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  offset: number,
): { name: string; exprId: ExprId } | null {
  for (const entry of exprTable) {
    const hit = findConverterInAst(entry.ast as ExpressionAst, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findBindingBehaviorAtOffset(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  offset: number,
): { name: string; exprId: ExprId } | null {
  for (const entry of exprTable) {
    const hit = findBehaviorInAst(entry.ast as ExpressionAst, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findConverterInAst(node: ExpressionAst | null | undefined, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "ValueConverter" && node.name?.span) {
    if (spanContainsOffset(node.name.span, offset)) return node.name.name;
  }
  return walkAstChildren(node, offset, findConverterInAst);
}

function findBehaviorInAst(node: ExpressionAst | null | undefined, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "BindingBehavior" && node.name?.span) {
    if (spanContainsOffset(node.name.span, offset)) return node.name.name;
  }
  return walkAstChildren(node, offset, findBehaviorInAst);
}

function walkAstChildren(
  node: ExpressionAst,
  offset: number,
  finder: (node: ExpressionAst, offset: number) => string | null,
): string | null {
  for (const child of collectAstChildren(node)) {
    const hit = finder(child, offset);
    if (hit) return hit;
  }
  return null;
}

function findExpressionAst(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  exprId: ExprId,
): ExpressionAst | null {
  for (const entry of exprTable) {
    if (entry.id === exprId) return entry.ast as ExpressionAst;
  }
  return null;
}

function expressionLabelAtOffset(ast: ExpressionAst, offset: number): string | null {
  const hit = findLabelAst(ast, offset);
  if (!hit) return null;
  return renderExpressionLabel(hit);
}

function findLabelAst(node: ExpressionAst | null | undefined, offset: number): ExpressionAst | null {
  if (!node || !node.span || !spanContainsOffset(node.span, offset)) return null;
  const children = collectAstChildren(node);
  for (const child of children) {
    const hit = findLabelAst(child, offset);
    if (hit) return hit;
  }
  return isLabelCandidate(node) ? node : null;
}

function collectAstChildren(node: ExpressionAst): ExpressionAst[] {
  const children: ExpressionAst[] = [];
  const push = (child?: unknown) => {
    if (isExpressionAst(child)) children.push(child);
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

  const patternDefault = node as ExpressionAst & { default?: ExpressionAst };
  if (patternDefault.default) children.push(patternDefault.default);

  return children;
}

function isExpressionAst(value: unknown): value is ExpressionAst {
  return !!value && typeof value === "object" && "$kind" in (value as { $kind: unknown });
}

function isLabelCandidate(node: ExpressionAst): boolean {
  switch (node.$kind) {
    case "AccessScope":
    case "AccessMember":
    case "AccessKeyed":
    case "AccessGlobal":
    case "AccessThis":
    case "AccessBoundary":
    case "CallScope":
    case "CallMember":
    case "CallGlobal":
    case "CallFunction":
    case "ValueConverter":
    case "BindingBehavior":
      return true;
    default:
      return false;
  }
}

function renderExpressionLabel(node: ExpressionAst): string | null {
  switch (node.$kind) {
    case "AccessScope": {
      const name = node.name?.name ?? null;
      return renderScopedName(node.ancestor, name);
    }
    case "AccessMember": {
      return renderMemberName(node.object, node.name?.name ?? null);
    }
    case "AccessKeyed": {
      return renderKeyedName(node.object, node.key);
    }
    case "AccessGlobal":
      return node.name?.name ?? null;
    case "AccessThis":
      return renderThisName(node.ancestor);
    case "AccessBoundary":
      return "this";
    case "CallScope": {
      const name = node.name?.name ?? null;
      return renderScopedName(node.ancestor, name);
    }
    case "CallMember": {
      return renderMemberName(node.object, node.name?.name ?? null);
    }
    case "CallGlobal":
      return node.name?.name ?? null;
    case "CallFunction":
      return node.func ? renderExpressionLabel(node.func) : null;
    case "ValueConverter":
    case "BindingBehavior":
      return node.name?.name ?? null;
    default:
      return null;
  }
}

function renderScopedName(ancestor: number | undefined, name: string | null): string | null {
  if (!name) return null;
  const prefix = renderAncestorPrefix(ancestor ?? 0);
  return prefix ? `${prefix}.${name}` : name;
}

function renderThisName(ancestor: number | undefined): string {
  const count = ancestor ?? 0;
  if (count <= 0) return "$this";
  return renderAncestorPrefix(count);
}

function renderAncestorPrefix(count: number): string {
  if (count <= 0) return "";
  return Array.from({ length: count }, () => "$parent").join(".");
}

function renderMemberName(object: ExpressionAst | null | undefined, name: string | null): string | null {
  if (!name) return null;
  const base = object ? renderExpressionLabel(object) : null;
  return base ? `${base}.${name}` : name;
}

function renderKeyedName(object: ExpressionAst | null | undefined, key: ExpressionAst | null | undefined): string | null {
  const base = object ? renderExpressionLabel(object) : null;
  if (!base) return null;
  const keyLabel = renderKeyLabel(key) ?? "?";
  return `${base}[${keyLabel}]`;
}

function renderKeyLabel(node: ExpressionAst | null | undefined): string | null {
  if (!node) return null;
  switch (node.$kind) {
    case "PrimitiveLiteral":
      return formatLiteral(node.value);
    case "AccessScope":
    case "AccessMember":
    case "AccessKeyed":
    case "AccessGlobal":
    case "AccessThis":
    case "AccessBoundary":
    case "CallScope":
    case "CallMember":
    case "CallGlobal":
    case "CallFunction":
      return renderExpressionLabel(node);
    default:
      return null;
  }
}

function formatLiteral(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

function chooseExpressionLabel(primary: string | null | undefined, secondary: string | null | undefined): string | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary ?? null;
  return primary.length >= secondary.length ? primary : secondary;
}

function looksLikeCustomElementTag(tag: string): boolean {
  return tag.includes("-");
}
