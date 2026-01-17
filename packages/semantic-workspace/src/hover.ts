import {
  debug,
  isDebugEnabled,
  type BindingCommandConfig,
  type ExprId,
  type LinkedInstruction,
  type LinkedRow,
  type NodeId,
  type SourceSpan,
  type TemplateCompilation,
  spanContainsOffset,
  spanLength,
} from "@aurelia-ls/compiler";

export interface TemplateHoverDetails {
  readonly lines: string[];
  readonly span?: SourceSpan;
  readonly exprId?: ExprId;
  readonly nodeId?: NodeId;
}

type BindingCommands = Readonly<Record<string, BindingCommandConfig>>;

export function collectTemplateHover(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  bindingCommands?: BindingCommands | null;
}): TemplateHoverDetails | null {
  const { compilation, text, offset } = options;
  const bindingCommands = options.bindingCommands ?? {};
  const debugEnabled = isDebugEnabled("workspace");
  if (debugEnabled) {
    const previewStart = Math.max(0, offset - 40);
    const previewEnd = Math.min(text.length, offset + 40);
    debug.workspace("hover.start", {
      offset,
      preview: text.slice(previewStart, previewEnd),
      bindingCommandCount: Object.keys(bindingCommands).length,
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
    const exprSpan = compilation.exprSpans.get(expr.exprId) ?? expr.span;
    const pathAtOffset = exprSpan ? expressionPathAtOffset(text, exprSpan, offset) : null;
    const label = chooseExpressionLabel(pathAtOffset, expr.memberPath)
      ?? expressionTextFromSpan(text, exprSpan)
      ?? "expression";
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

  const instructionHits = findInstructionsAtOffset(compilation.linked.templates, offset);
  if (debugEnabled) {
    debug.workspace("hover.instructions", {
      hitCount: instructionHits.length,
      kinds: instructionHits.map((hit) => hit.instruction.kind),
    });
  }
  if (instructionHits.length) {
    const [primary] = instructionHits;
    if (primary) {
      span = span ?? primary.loc;
    }
    for (const hit of instructionHits) {
      applyInstructionHover(hit.instruction, hit.loc, {
        text,
        addLine,
        bindingCommands,
        hostTag: hit.hostTag,
        hostKind: hit.hostKind,
        debugEnabled,
      });
    }

    if (primary) {
      const attrName = readAttributeName(text, primary.loc);
      const command = attrName ? commandFromAttribute(attrName, bindingCommands) : null;
      if (command) addLine("Binding Command", command);
    }
  }

  const converterHit = findValueConverterAtOffset(compilation.exprTable, text, offset);
  if (debugEnabled) {
    debug.workspace("hover.converter", { hit: !!converterHit, name: converterHit?.name });
  }
  if (converterHit) {
    exprId = exprId ?? converterHit.exprId;
    addLine("Value Converter", converterHit.name);
  }

  const behaviorHit = findBindingBehaviorAtOffset(compilation.exprTable, text, offset);
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
};

function findInstructionsAtOffset(
  templates: readonly { rows: readonly LinkedRow[] }[],
  offset: number,
): InstructionHit[] {
  const hits: InstructionHit[] = [];
  const addHit = (
    instruction: LinkedInstruction,
    host: { hostTag?: string; hostKind?: "custom" | "native" | "none" },
  ) => {
    const loc = instruction.loc ?? null;
    if (!loc) return;
    if (!spanContainsOffset(loc, offset)) return;
    hits.push({ instruction, loc, len: spanLength(loc), hostTag: host.hostTag, hostKind: host.hostKind });
  };
  for (const template of templates) {
    for (const row of template.rows ?? []) {
      const host: { hostTag?: string; hostKind?: "custom" | "native" | "none" } =
        row.node.kind === "element"
          ? {
            hostTag: row.node.tag,
            hostKind: row.node.custom ? "custom" : row.node.native ? "native" : "none",
          }
          : {};
      for (const instruction of row.instructions ?? []) {
        addHit(instruction, host);
        if (instruction.kind === "hydrateElement" || instruction.kind === "hydrateAttribute" || instruction.kind === "hydrateTemplateController") {
          for (const prop of instruction.props ?? []) {
            addHit(prop, host);
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
  ctx: {
    text: string;
    addLine: (label: string, value: string) => void;
    bindingCommands: BindingCommands;
    hostTag?: string;
    hostKind?: "custom" | "native" | "none";
    debugEnabled?: boolean;
  },
): void {
  switch (instruction.kind) {
    case "hydrateAttribute": {
      const resolvedName = instruction.res?.def.name ?? null;
      if (resolvedName) {
        ctx.addLine("Custom Attribute", resolvedName);
        break;
      }
      const attrName = readAttributeName(ctx.text, loc);
      const fallbackName = attributeBaseName(attrName, ctx.bindingCommands);
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

  const attrName = readAttributeName(ctx.text, loc);
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

function readAttributeName(text: string, loc: SourceSpan): string | null {
  const raw = text.slice(loc.start, loc.end);
  const eq = raw.indexOf("=");
  const name = (eq === -1 ? raw : raw.slice(0, eq)).trim();
  return name.length ? name : null;
}

function attributeBaseName(attrName: string | null, bindingCommands: BindingCommands): string | null {
  if (!attrName) return null;
  if (attrName.startsWith(":") || attrName.startsWith("@")) return attrName;
  const parts = attrName.split(".");
  if (parts.length < 2) return attrName;
  const command = parts[parts.length - 1];
  if (!command) return attrName;
  return bindingCommands[command] ? parts.slice(0, -1).join(".") : attrName;
}

function commandFromAttribute(attrName: string, bindingCommands: BindingCommands): string | null {
  if (attrName.startsWith(":") && bindingCommands["bind"]) return "bind";
  if (attrName.startsWith("@") && bindingCommands["trigger"]) return "trigger";
  const parts = attrName.split(".");
  if (parts.length < 2) return null;
  const command = parts[parts.length - 1];
  if (!command) return null;
  return bindingCommands[command] ? command : null;
}

type ExpressionAst = {
  $kind: string;
  span?: SourceSpan;
  name?: string;
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
  value?: ExpressionAst;
  key?: ExpressionAst;
  parts?: ExpressionAst[];
  expressions?: ExpressionAst[];
  declaration?: ExpressionAst;
  iterable?: ExpressionAst;
  ancestor?: number;
};

function findValueConverterAtOffset(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: ExprId } | null {
  for (const entry of exprTable) {
    const hit = findConverterInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findBindingBehaviorAtOffset(
  exprTable: readonly { id: ExprId; ast: unknown }[],
  text: string,
  offset: number,
): { name: string; exprId: ExprId } | null {
  for (const entry of exprTable) {
    const hit = findBehaviorInAst(entry.ast as ExpressionAst, text, offset);
    if (hit) return { name: hit, exprId: entry.id };
  }
  return null;
}

function findConverterInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "ValueConverter" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "|", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildren(node, text, offset, findConverterInAst);
}

function findBehaviorInAst(node: ExpressionAst | null | undefined, text: string, offset: number): string | null {
  if (!node || !node.$kind) return null;
  if (node.$kind === "BindingBehavior" && node.name && node.span) {
    const start = findPipeOrAmpName(text, node.span, "&", node.name);
    if (start !== -1 && offset >= start && offset < start + node.name.length) {
      return node.name;
    }
  }
  return walkAstChildren(node, text, offset, findBehaviorInAst);
}

function walkAstChildren(
  node: ExpressionAst,
  text: string,
  offset: number,
  finder: (node: ExpressionAst, text: string, offset: number) => string | null,
): string | null {
  const queue: (ExpressionAst | null | undefined)[] = [];
  queue.push(node.expression, node.object, node.func, node.left, node.right, node.condition, node.yes, node.no, node.target, node.value, node.key, node.declaration, node.iterable);
  if (node.args) queue.push(...node.args);
  if (node.parts) queue.push(...node.parts);
  if (node.expressions) queue.push(...node.expressions);
  for (const child of queue) {
    if (!child) continue;
    const hit = finder(child, text, offset);
    if (hit) return hit;
  }
  return null;
}

function findPipeOrAmpName(text: string, span: SourceSpan, separator: "|" | "&", name: string): number {
  const searchText = text.slice(span.start, span.end);
  const sepIndex = searchText.lastIndexOf(separator);
  if (sepIndex === -1) return -1;
  const afterSep = searchText.slice(sepIndex + 1);
  const whitespaceLen = afterSep.match(/^\s*/)?.[0].length ?? 0;
  const nameStart = span.start + sepIndex + 1 + whitespaceLen;
  const candidate = text.slice(nameStart, nameStart + name.length);
  return candidate === name ? nameStart : -1;
}

function expressionTextFromSpan(text: string, span: SourceSpan | null | undefined): string | null {
  if (!span) return null;
  const raw = text.slice(span.start, span.end).trim();
  if (!raw) return null;
  if (raw.startsWith("${") && raw.endsWith("}")) {
    const inner = raw.slice(2, -1).trim();
    return inner || raw;
  }
  return raw;
}

function expressionPathAtOffset(text: string, span: SourceSpan, offset: number): string | null {
  if (offset < span.start || offset > span.end) return null;
  const exprText = text.slice(span.start, span.end);
  const localOffset = Math.max(0, Math.min(offset - span.start, exprText.length));
  let start = localOffset;
  while (start > 0 && isPathChar(exprText.charCodeAt(start - 1))) start -= 1;
  let end = localOffset;
  while (end < exprText.length && isPathChar(exprText.charCodeAt(end))) end += 1;
  let candidate = exprText.slice(start, end).trim();
  if (!candidate) return null;
  candidate = candidate.replace(/^[.\[]+|[.\]]+$/g, "");
  return candidate || null;
}

function chooseExpressionLabel(primary: string | null | undefined, secondary: string | null | undefined): string | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary ?? null;
  return primary.length >= secondary.length ? primary : secondary;
}

function isPathChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || code === 95 /* _ */
    || code === 36 /* $ */
    || code === 46 /* . */
    || code === 91 /* [ */
    || code === 93 /* ] */
  );
}

function looksLikeCustomElementTag(tag: string): boolean {
  return tag.includes("-");
}
