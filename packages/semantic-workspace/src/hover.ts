import {
  analyzeAttributeName,
  createAttributeParserFromRegistry,
  debug,
  isDebugEnabled,
  type AttributeParser,
  type AttrRes,
  type Bindable,
  type BindingMode,
  type DOMNode,
  type ElementRes,
  type ExprId,
  type LinkedInstruction,
  type LinkedRow,
  type MaterializedSemantics,
  type NodeId,
  type SourceSpan,
  type TemplateCompilation,
  type TemplateIR,
  type TemplateSyntaxRegistry,
  type TypeRef,
  type ValueConverterSig,
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

// ── Hover card builder ─────────────────────────────────────────────────
//
// A HoverCard accumulates structured sections that render to markdown
// following the rust-analyzer / TypeScript pattern:
//
//   ```ts
//   (custom element) summary-panel
//   ```
//   ---
//   *@aurelia/router*
//
//   **Bindables:** `route` *(primary)*, `params`, `active`
//
// The signature block (fenced code) is the primary identity.
// Below the separator, metadata lines provide details.

interface HoverCard {
  /** Fenced code block: e.g. `(custom element) summary-panel` */
  signature?: string;
  /** Metadata lines below the separator */
  meta: string[];
}

function renderCard(card: HoverCard): string {
  const blocks: string[] = [];
  if (card.signature) {
    blocks.push("```ts\n" + card.signature + "\n```");
  }
  if (card.meta.length) {
    if (blocks.length) blocks.push("---");
    blocks.push(card.meta.join("\n\n"));
  }
  return blocks.join("\n\n");
}

export function collectTemplateHover(options: {
  compilation: TemplateCompilation;
  text: string;
  offset: number;
  syntax?: TemplateSyntaxRegistry | null;
  attrParser?: AttributeParser;
  semantics?: MaterializedSemantics | null;
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

  const cards: HoverCard[] = [];
  let span: SourceSpan | undefined;
  let exprId: ExprId | undefined;
  let nodeId: NodeId | undefined;

  // ── Expressions ──────────────────────────────────────────────────────
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

    // Type is provided by the base TypeScript hover (getQuickInfo) and merged
    // in workspace.ts — we don't duplicate it here.
    cards.push({ signature: `(expression) ${label}`, meta: [] });
  }

  // ── Template controllers ─────────────────────────────────────────────
  const controller = compilation.query.controllerAt(offset);
  if (debugEnabled) {
    debug.workspace("hover.controller", {
      hit: !!controller,
      kind: controller?.kind,
      span: controller?.span,
    });
  }
  if (controller) {
    // Only capture span here — the full card with bindables, iterator
    // declaration, and contextual locals is built by the instruction
    // section below (hydrateTemplateController case).
    span = span ?? controller.span;
  }

  // ── Custom elements ──────────────────────────────────────────────────
  const node = compilation.query.nodeAt(offset);
  if (node) {
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
      const isCustom = !!row.node.custom?.def || looksLikeCustomElementTag(tag);
      if (isCustom) {
        nodeId = node.id;
        span = span ?? node.span;
        const def = row.node.custom?.def;
        const name = def?.name ?? tag;
        const card: HoverCard = {
          signature: `(custom element) ${name}`,
          meta: [],
        };
        if (def) {
          appendResourceMeta(def, card.meta);
        }
        cards.push(card);
      }
    }
  } else if (debugEnabled) {
    debug.workspace("hover.node", { hit: false });
  }

  // ── Instructions (attributes, bindings, events, controllers) ─────────
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
      span = span ?? primary.loc;
    }
    for (const hit of instructionHits) {
      const instrCards = buildInstructionCards(hit.instruction, hit.attrName ?? null, {
        syntax,
        attrParser,
        hostTag: hit.hostTag,
        hostKind: hit.hostKind,
        debugEnabled,
      });
      cards.push(...instrCards);
    }

    if (primary) {
      const attrName = primary.attrName ?? null;
      const command = attrName ? commandFromAttribute(attrName, syntax, attrParser) : null;
      if (command) {
        cards.push({ signature: `(binding command) ${command}`, meta: [] });
      }
    }
  }

  // ── Value converters ─────────────────────────────────────────────────
  const converterHit = findValueConverterAtOffset(compilation.exprTable, offset);
  if (debugEnabled) {
    debug.workspace("hover.converter", { hit: !!converterHit, name: converterHit?.name });
  }
  if (converterHit) {
    exprId = exprId ?? converterHit.exprId;
    const vcSig = options.semantics?.resources.valueConverters[converterHit.name] ?? null;
    const card: HoverCard = {
      signature: `(value converter) ${converterHit.name}`,
      meta: [],
    };
    if (vcSig) {
      appendConverterMeta(vcSig, card.meta);
    }
    cards.push(card);
  }

  // ── Binding behaviors ────────────────────────────────────────────────
  const behaviorHit = findBindingBehaviorAtOffset(compilation.exprTable, offset);
  if (debugEnabled) {
    debug.workspace("hover.behavior", { hit: !!behaviorHit, name: behaviorHit?.name });
  }
  if (behaviorHit) {
    exprId = exprId ?? behaviorHit.exprId;
    const bbSig = options.semantics?.resources.bindingBehaviors[behaviorHit.name] ?? null;
    const card: HoverCard = {
      signature: `(binding behavior) ${behaviorHit.name}`,
      meta: [],
    };
    if (bbSig) {
      const loc = formatSourceLocation(bbSig.file, bbSig.package);
      if (loc) card.meta.push(`*${loc}*`);
    }
    cards.push(card);
  }

  if (cards.length === 0) {
    if (debugEnabled) {
      debug.workspace("hover.empty", { offset });
    }
    return null;
  }
  if (debugEnabled) {
    debug.workspace("hover.result", { lineCount: cards.length, exprId, nodeId, span });
  }

  // Render all cards, joining with blank line
  const lines = cards.map(renderCard);
  return { lines, span, exprId, nodeId };
}

export function mergeHoverContents(
  detailLines: readonly string[],
  baseTypeInfo?: string | null,
): string | null {
  const blocks: string[] = [];
  const seen = new Set<string>();

  // If we have structured detail and base type info, integrate the type info
  // into the first card (which is typically the expression card) rather than
  // appending it as a disconnected blob.
  if (detailLines.length > 0 && baseTypeInfo) {
    // The base contains "member: type" or TS quickInfo — it's the type
    // signature that should augment (not replace) our structured hover.
    // If our first card already has a code-block signature for the same
    // expression, the base is redundant. Otherwise, append it.
    const first = detailLines[0]!;
    // If the first card already has a fenced code block with type info,
    // skip the base (it would be a duplicate member: type string).
    const firstHasType = first.includes("```") && first.includes(":");
    if (!firstHasType) {
      // Wrap the base type info in a code block for visual consistency
      blocks.push("```ts\n" + baseTypeInfo + "\n```");
      blocks.push("---");
    }
  }

  for (const line of detailLines) {
    if (seen.has(line)) continue;
    seen.add(line);
    blocks.push(line);
  }
  if (!detailLines.length && baseTypeInfo) {
    if (!seen.has(baseTypeInfo)) blocks.push(baseTypeInfo);
  }
  return blocks.length ? blocks.join("\n\n") : null;
}

// ── Instruction card builders ──────────────────────────────────────────

type InstructionHit = {
  instruction: LinkedInstruction;
  loc: SourceSpan;
  len: number;
  hostTag?: string;
  hostKind?: "custom" | "native" | "none";
  attrName?: string | null;
  attrNameSpan?: SourceSpan | null;
};

function buildInstructionCards(
  instruction: LinkedInstruction,
  attrName: string | null,
  ctx: {
    syntax: TemplateSyntaxRegistry | null;
    attrParser: AttributeParser | null;
    hostTag?: string;
    hostKind?: "custom" | "native" | "none";
    debugEnabled?: boolean;
  },
): HoverCard[] {
  const cards: HoverCard[] = [];
  const analysis = attrName && ctx.syntax && ctx.attrParser
    ? analyzeAttributeName(attrName, ctx.syntax, ctx.attrParser)
    : null;

  switch (instruction.kind) {
    case "hydrateAttribute": {
      const resolvedName = instruction.res?.def.name ?? null;
      if (resolvedName) {
        const card: HoverCard = {
          signature: `(custom attribute) ${resolvedName}`,
          meta: [],
        };
        const attrDef = instruction.res?.def;
        if (attrDef) {
          appendResourceMeta(attrDef, card.meta);
        }
        cards.push(card);
        break;
      }
      const fallbackName = attributeTargetName(attrName, analysis);
      if (fallbackName && ctx.debugEnabled) {
        debug.workspace("hover.fallback.custom-attribute", {
          attrName,
          fallback: fallbackName,
        });
      }
      if (fallbackName) {
        cards.push({
          signature: `(custom attribute) ${fallbackName}`,
          meta: [],
        });
      }
      break;
    }
    case "propertyBinding":
    case "attributeBinding": {
      const target = instruction.target as { kind?: string; reason?: string; bindable?: Bindable } | null | undefined;
      const bindableInfo = describeBindableTarget(target, instruction.to);
      if (!bindableInfo && target?.kind === "unknown") {
        const fallback = describeBindableFallback(instruction.to, ctx.hostTag, ctx.hostKind);
        if (fallback && ctx.debugEnabled) {
          debug.workspace("hover.fallback.bindable", {
            name: instruction.to,
            hostTag: ctx.hostTag,
            hostKind: ctx.hostKind,
            reason: (target as { reason?: string }).reason ?? null,
          });
        }
        if (fallback) {
          cards.push(buildBindableCard(fallback, null));
        }
        break;
      }
      if (bindableInfo) {
        const bindable = target?.bindable ?? null;
        cards.push(buildBindableCard(bindableInfo, bindable));
      }
      break;
    }
    case "listenerBinding":
      cards.push({
        signature: `(event) ${instruction.to}`,
        meta: [],
      });
      break;
    case "hydrateTemplateController": {
      const card: HoverCard = {
        signature: `(template controller) ${instruction.res}`,
        meta: [],
      };
      const controllerInst = instruction as {
        controller?: { config?: {
          props?: Record<string, Bindable>;
          injects?: { contextuals?: readonly string[] };
        } };
        props?: readonly { kind?: string; forOf?: { code?: string }; aux?: readonly { name: string }[] }[];
      };

      // Iterator declaration (repeat.for="item of items")
      const iteratorProp = controllerInst.props?.find((p) => p.kind === "iteratorBinding");
      if (iteratorProp?.forOf?.code) {
        card.meta.push(`\`${iteratorProp.forOf.code}\``);
      }

      // Config bindables (if/else value, switch.bind, etc.)
      const tcProps = controllerInst.controller?.config?.props;
      if (tcProps) {
        const bindableList = formatBindableListRich(tcProps);
        if (bindableList) card.meta.push(bindableList);
      }

      // Contextual locals injected by the controller ($index, $first, etc.)
      const contextuals = controllerInst.controller?.config?.injects?.contextuals;
      if (contextuals?.length) {
        card.meta.push(`**Locals:** ${contextuals.map((c) => `\`${c}\``).join(", ")}`);
      }

      cards.push(card);
      break;
    }
    case "translationBinding": {
      // TODO: Load translation resource files (locales/*.json) to resolve keys
      // to actual translated text and validate key existence. This requires a
      // new i18n resource loader subsystem (file discovery, JSON parsing, key indexing).
      const ti = instruction as { keyValue?: string; isExpression: boolean; to: string; from?: { source?: string } };
      const card: HoverCard = { meta: [] };
      if (!ti.isExpression && ti.keyValue) {
        // Literal key: t="greeting.hello" or t="[title]tooltip.msg"
        const { target, namespace, key } = parseTranslationKey(ti.keyValue);
        card.signature = `(translation) ${ti.keyValue}`;
        const details: string[] = [];
        if (namespace) details.push(`**Namespace:** \`${namespace}\``);
        if (key) details.push(`**Key:** \`${key}\``);
        if (target) details.push(`**Target:** \`${target}\``);
        card.meta.push(...details);
      } else if (ti.isExpression) {
        // Dynamic key: t.bind="expr"
        const exprSource = ti.from?.source ?? null;
        card.signature = exprSource
          ? `(translation) t.bind = ${exprSource}`
          : `(translation) t.bind`;
        card.meta.push("*Dynamic key — resolved at runtime*");
      } else {
        card.signature = `(translation) t`;
      }
      if (ti.to) {
        card.meta.push(`**Target attribute:** \`${ti.to}\``);
      }
      cards.push(card);
      break;
    }
    default:
      break;
  }

  // Show "Attribute" line only for attributeBinding
  if (attrName && instruction.kind === "attributeBinding") {
    cards.push({
      signature: `(attribute) ${attrName}`,
      meta: [],
    });
  }

  return cards;
}

function buildBindableCard(description: BindableDescription, bindable: Bindable | null): HoverCard {
  const card: HoverCard = { meta: [] };

  if (description.isNative) {
    // Native HTML property — use different label to avoid confusion with Aurelia bindables
    card.signature = `(property) ${description.name}`;
    if (description.context) {
      card.meta.push(`*${description.context}*`);
    }
  } else {
    // Aurelia bindable — prefer the HTML attribute name (kebab-case) over property name
    const displayName = bindable?.attribute ?? description.name;
    const sigParts = [`(bindable) ${displayName}`];
    if (bindable?.type) {
      const typeStr = formatTypeRef(bindable.type);
      if (typeStr) sigParts[0] += `: ${typeStr}`;
    }
    card.signature = sigParts[0];
    if (description.context) {
      card.meta.push(`*${description.context}*`);
    }
    if (bindable) {
      const mode = formatBindingMode(bindable.mode);
      if (mode) card.meta.push(`**Mode:** \`${mode}\``);
      if (bindable.doc) card.meta.push(bindable.doc);
    }
  }
  return card;
}

// ── Structured bindable description ────────────────────────────────────

interface BindableDescription {
  name: string;
  context?: string;
  isNative: boolean;
}

function describeBindableTarget(target: { kind?: string } | null | undefined, to?: string): BindableDescription | null {
  if (!target || typeof target !== "object" || !("kind" in target)) return null;
  switch (target.kind) {
    case "element.bindable": {
      const t = target as { bindable: { name: string }; element: { def: { name: string } } };
      return { name: t.bindable.name, context: `component: ${t.element.def.name}`, isNative: false };
    }
    case "element.nativeProp": {
      const name = to ?? "unknown";
      return { name, context: "HTML element", isNative: true };
    }
    case "attribute.bindable": {
      const t = target as { bindable: { name: string }; attribute: { def: { name: string } } };
      return { name: t.bindable.name, context: `attribute: ${t.attribute.def.name}`, isNative: false };
    }
    case "controller.prop": {
      const t = target as { bindable: { name: string }; controller: { res: string } };
      return { name: t.bindable.name, context: `controller: ${t.controller.res}`, isNative: false };
    }
    case "attribute": {
      const t = target as { attr: string };
      return { name: t.attr, context: "HTML element", isNative: true };
    }
    default:
      return null;
  }
}

function describeBindableFallback(
  name: string,
  hostTag?: string,
  hostKind?: "custom" | "native" | "none",
): BindableDescription | null {
  if (!name) return null;
  if (hostKind === "custom" || (hostTag && looksLikeCustomElementTag(hostTag))) {
    return { name, context: `component: ${hostTag ?? "unknown"}`, isNative: false };
  }
  if (hostKind === "native") {
    return { name, context: "HTML element", isNative: true };
  }
  return { name, isNative: false };
}

// ── Instruction search ─────────────────────────────────────────────────

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

// ── Formatting helpers ─────────────────────────────────────────────────

function formatSourceLocation(file?: string | null, pkg?: string | null): string | null {
  if (pkg) return pkg;
  if (file) return file;
  return null;
}

function formatBindableListRich(bindables: Readonly<Record<string, Bindable>>): string | null {
  const entries = Object.values(bindables);
  if (entries.length === 0) return null;
  const parts = entries.map((b) => {
    let part = `\`${b.attribute ?? b.name}\``;
    if (b.primary) part += " *(primary)*";
    if (b.mode && b.mode !== "default") part += ` *(${formatBindingModeDisplay(b.mode)})*`;
    return part;
  });
  return `**Bindables:** ${parts.join(", ")}`;
}

function formatBindingMode(mode?: BindingMode | null): string | null {
  if (!mode || mode === "default") return null;
  return formatBindingModeDisplay(mode);
}

const BINDING_MODE_DISPLAY: Record<string, string> = {
  oneTime: "one-time",
  toView: "to-view",
  fromView: "from-view",
  twoWay: "two-way",
};

function formatBindingModeDisplay(mode: string): string {
  return BINDING_MODE_DISPLAY[mode] ?? mode;
}

function formatTypeRef(type?: TypeRef | null): string | null {
  if (!type) return null;
  if (type.kind === "ts") return type.name;
  if (type.kind === "any" || type.kind === "unknown") return null;
  return null;
}

function appendResourceMeta(
  def: ElementRes | AttrRes,
  meta: string[],
): void {
  const loc = formatSourceLocation(def.file, def.package);
  if (loc) meta.push(`*${loc}*`);
  const bindableList = formatBindableListRich(def.bindables);
  if (bindableList) meta.push(bindableList);
  // Command link to show the generated overlay for this template
  meta.push("[$(file-code) Show overlay](command:aurelia.showOverlay)");
}

function appendConverterMeta(
  sig: ValueConverterSig,
  meta: string[],
): void {
  const loc = formatSourceLocation(sig.file, sig.package);
  if (loc) meta.push(`*${loc}*`);
  const inType = formatTypeRef(sig.in);
  const outType = formatTypeRef(sig.out);
  if (inType && outType) {
    meta.push(`**Signature:** \`toView(${inType}): ${outType}\``);
  }
}

// ── Attribute analysis helpers ─────────────────────────────────────────

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

// ── Expression AST helpers ─────────────────────────────────────────────

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

// ── Translation key parsing ─────────────────────────────────────────────

/**
 * Parse an i18n translation key into its components.
 *
 * Aurelia i18n keys follow: `[target]namespace.key` or `namespace.key`
 * - Bracket prefix `[title]` sets the target attribute
 * - Dotted path splits into namespace (first segment) and key (rest)
 */
function parseTranslationKey(raw: string): { target: string | null; namespace: string | null; key: string | null } {
  let target: string | null = null;
  let keyPath = raw;

  // Extract bracket target: [title]namespace.key → target="title", keyPath="namespace.key"
  const bracketMatch = /^\[([^\]]+)\](.*)$/.exec(keyPath);
  if (bracketMatch) {
    target = bracketMatch[1] ?? null;
    keyPath = bracketMatch[2] ?? "";
  }

  // Split dotted path: "greeting.hello" → namespace="greeting", key="hello"
  const dotIndex = keyPath.indexOf(".");
  if (dotIndex >= 0) {
    return {
      target,
      namespace: keyPath.slice(0, dotIndex),
      key: keyPath.slice(dotIndex + 1),
    };
  }

  // No dot: entire string is the key, no namespace
  return { target, namespace: null, key: keyPath || null };
}
