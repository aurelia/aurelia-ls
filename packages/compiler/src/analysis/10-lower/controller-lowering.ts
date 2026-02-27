import type { Token } from "parse5";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { BindingCommandConfig, ControllerConfig } from "../../schema/registry.js";
import { getControllerConfig } from "../../schema/registry.js";
import type {
  BindingMode,
  ControllerBindableIR,
  ControllerBranchInfo,
  DOMNode,
  HydrateTemplateControllerIR,
  InstructionIR,
  IteratorBindingIR,
  MultiAttrIR,
  NodeId,
  PropertyBindingIR,
  SourceSpan,
  TemplateOrigin,
  TemplateHostRef,
  TemplateIR,
} from "../../model/ir.js";
import { resolveControllerAttr } from "./element-lowering.js";
import type { ExprTable, P5Element, P5Loc, P5Node, P5Template } from "./lower-shared.js";
import { attrLoc, attrNameLoc, attrValueLoc, parseRepeatTailProps, sourceAttrValue, toBindingSource, toExprRef, toMode, toSpan, tryToInterpIR, type SourceAlignedText } from "./lower-shared.js";
import type { RowCollector } from "./template-builders.js";
import {
  makeWrapperTemplate,
  templateOfElementChildren,
  templateOfElementChildrenWithMap,
  templateOfTemplateContent,
} from "./template-builders.js";
import type { TemplateBuildContext } from "./template-builders.js";
import type { LowerContext, LowerServices } from "./lower-context.js";
import {
  isPromiseBranchName,
  isPromiseParentController,
  planControllerBareValue,
  planControllerBranchInfo,
  resolvePromiseBranchKind,
} from "../shared/controller-decisions.js";

// -----------------------------------------------------------------------------
// Trigger kind helpers
// -----------------------------------------------------------------------------

/**
 * Check if the controller has promise branches (then/catch/pending).
 * This determines whether special branch injection is needed.
 */
function hasPromiseBranches(config: ControllerConfig): boolean {
  return isPromiseParentController(config);
}

// -----------------------------------------------------------------------------
// Prop Builders
// -----------------------------------------------------------------------------

function buildIteratorProps(
  raw: SourceAlignedText,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  propName: string,
  includeTailProps: boolean,
  bindingCommands: Record<string, BindingCommandConfig>
): IteratorBindingIR {
  const forRef = table.add(raw, valueLoc, "IsIterator");
  const forOf = { astId: forRef.id, code: raw, loc: toSpan(valueLoc, table.source) };
  const tailProps = includeTailProps ? toRepeatTailIR(raw, valueLoc, table, bindingCommands) : null;
  return {
    type: "iteratorBinding",
    to: propName,
    forOf,
    props: tailProps,
    loc: toSpan(loc, table.source),
  };
}

function buildLiteralOrBindingProps(
  raw: SourceAlignedText,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  command: string | null,
  bindingCommands: Record<string, BindingCommandConfig>
): PropertyBindingIR {
  // Check if command is a property binding command (bind, one-time, to-view, etc.)
  const isBinding = command !== null && bindingCommands[command]?.kind === "property";
  return {
    type: "propertyBinding",
    to: "value",
    from: isBinding
      ? toExprRef(raw, valueLoc, table, "IsProperty")
      // Synthetic: JSON.stringify wraps the literal — not a source slice.
      : toExprRef(JSON.stringify(raw) as SourceAlignedText, valueLoc, table, "IsProperty"),
    mode: "default",
    loc: toSpan(loc, table.source),
  };
}

/**
 * Build value props for a template controller.
 *
 * For LSP/type-checking purposes, template controllers need expression bindings
 * to resolve scope types. This differs from runtime behavior (which uses
 * SetPropertyInstruction for literals) but is necessary for IDE features.
 *
 * Behavior:
 * 1. With binding command → PropertyBindingIR with resolved mode
 * 2. No command + interpolation → AttributeBindingIR with InterpIR
 * 3. No command + no interpolation → PropertyBindingIR with value as expression
 *    (empty value uses controller name, e.g., `<div if>` → expression "if")
 */
function buildValueProps(
  config: ControllerConfig,
  raw: SourceAlignedText,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  propName: string,
  command: string | null,
  patternMode: BindingMode | null,
  bindingCommands: Record<string, BindingCommandConfig>
): ControllerBindableIR {
  const locSpan = toSpan(loc, table.source);
  const controllerName = config.name;
  // Synthetic fallback: when value is empty, use controller name as expression.
  // The cast is explicit — this text does not come from the source file.
  const exprText = (raw.length === 0 ? controllerName : raw) as SourceAlignedText;
  const bareValue = planControllerBareValue(config);

  // Case 1: Has binding command (e.g., if.bind="expr")
  if (command) {
    return {
      type: "propertyBinding",
      to: propName,
      from: toBindingSource(exprText, valueLoc, table, "IsProperty"),
      mode: toMode(command, patternMode, bindingCommands),
      loc: locSpan,
    };
  }

  // Case 2: No command - check for interpolation
  const interp = tryToInterpIR(raw, valueLoc, table);
  if (interp) {
    return {
      type: "attributeBinding",
      attr: controllerName,
      to: propName,
      from: interp,
      loc: locSpan,
    };
  }

  // Some controllers (for example teleported controllers) treat bare values as
  // literal strings so runtime selectors remain valid.
  // Synthetic: JSON.stringify wraps the value — not a source slice.
  if (raw.length > 0 && bareValue.mode === "literal-string") {
    return {
      type: "propertyBinding",
      to: propName,
      from: toBindingSource(JSON.stringify(raw) as SourceAlignedText, valueLoc, table, "IsProperty"),
      mode: "default",
      loc: locSpan,
    };
  }

  // Case 3: No command, no interpolation → PropertyBinding
  // Treat value as expression for scope resolution (needed for LSP type-checking).
  // Note: Runtime uses SetPropertyInstruction for literals, but we need
  // expression semantics to resolve types in templates like `<div with="obj">`.
  return {
    type: "propertyBinding",
    to: propName,
    from: toBindingSource(exprText, valueLoc, table, "IsProperty"),
    mode: "default",
    loc: locSpan,
  };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function collectControllers(
  el: P5Element,
  lowerCtx: LowerContext,
  nestedTemplates: TemplateIR[],
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  host: TemplateHostRef,
): HydrateTemplateControllerIR[] {
  const { attrParser, table, catalog, services } = lowerCtx;
  const candidates: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; config: ControllerConfig }[] = [];
  for (const a of el.attrs ?? []) {
    const s = attrParser.parse(a.name, a.value ?? "");
    const config = resolveControllerAttr(s, catalog);
    if (config) {
      services.debug.lower("controller.candidate", {
        element: el.nodeName,
        attr: a.name,
        value: a.value,
        controller: config.name,
        trigger: config.trigger.kind,
      });
      candidates.push({ a, s, config });
    }
  }
  if (!candidates.length) return [];

  services.debug.lower("controller.collect", {
    element: el.nodeName,
    count: candidates.length,
    controllers: candidates.map(c => c.config.name),
  });

  const rightmost = candidates[candidates.length - 1];
  if (!rightmost) return [];

  let current = buildRightmostController(el, rightmost, lowerCtx, nestedTemplates, collectRows, ctx, host);

  for (let i = candidates.length - 2; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const { a, s, config } = candidate;
    const loc = attrLoc(el, a.name);
    const tcNameLoc = attrNameLoc(el, a.name, table.sourceText);
    const valueLoc = attrValueLoc(el, a.name, table.sourceText);
    const raw = sourceAttrValue(a, valueLoc, table.sourceText);
    const proto = buildControllerPrototype(a, s, table, loc, valueLoc, config, catalog.bindingCommands, services);

    const branch = planControllerBranchInfo(config, raw, proto.props).branch;

    const nextLayer: HydrateTemplateControllerIR[] = [];
    for (const inner of current) {
      const def = makeWrapperTemplate(inner, nestedTemplates, ctx);
      nextLayer.push({
        type: "hydrateTemplateController",
        res: proto.res,
        def,
        props: proto.props,
        alias: null,
        branch,
        containerless: false,
        loc: toSpan(loc, table.source),
        nameLoc: toSpan(tcNameLoc, table.source),
      });
    }
    current = nextLayer;
  }

  return current;
}

// -----------------------------------------------------------------------------
// Controller Prototype (for non-rightmost controllers)
// -----------------------------------------------------------------------------

type ControllerPrototype = {
  res: string;
  props: ControllerBindableIR[];
};

function buildControllerPrototype(
  a: Token.Attribute,
  s: ReturnType<AttributeParser["parse"]>,
  table: ExprTable,
  loc: P5Loc,
  valueLoc: P5Loc,
  config: ControllerConfig,
  bindingCommands: Record<string, BindingCommandConfig>,
  services: LowerServices,
): ControllerPrototype {
  const raw = sourceAttrValue(a, valueLoc, table.sourceText);
  const name = config.name;
  const trigger = config.trigger;

  services.debug.lower("controller.prototype", {
    name,
    trigger: trigger.kind,
    raw,
    command: s.command,
  });

  switch (trigger.kind) {
    case "marker":
      return { res: name, props: [] };

    case "iterator":
      return {
        res: name,
        props: [buildIteratorProps(raw, valueLoc, loc, table, trigger.prop, !!config.tailProps, bindingCommands)],
      };

    case "branch":
      // Branch controllers (else, case, then, etc.) may have literal or binding values
      // Case has value.bind, else has no value
      if (config.props?.["value"]) {
        return { res: name, props: [buildLiteralOrBindingProps(raw, valueLoc, loc, table, s.command, bindingCommands)] };
      }
      return { res: name, props: [] };

    case "value":
      return {
        res: name,
        props: [buildValueProps(config, raw, valueLoc, loc, table, trigger.prop, s.command, s.mode, bindingCommands)],
      };
  }
}

// -----------------------------------------------------------------------------
// Rightmost Controller (includes template definition)
// -----------------------------------------------------------------------------

function buildRightmostController(
  el: P5Element,
  rightmost: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; config: ControllerConfig },
  lowerCtx: LowerContext,
  nestedTemplates: TemplateIR[],
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  host: TemplateHostRef,
): HydrateTemplateControllerIR[] {
  const { table, catalog } = lowerCtx;
  const { a, s, config } = rightmost;
  const loc = attrLoc(el, a.name);
  const valueLoc = attrValueLoc(el, a.name, table.sourceText);
  const raw = sourceAttrValue(a, valueLoc, table.sourceText);
  const locSpan = toSpan(loc, table.source);
  const name = config.name;

  // Build props based on controller type
  const props = buildPropsForConfig(config, raw, valueLoc, loc, table, s.command, s.mode, catalog.bindingCommands);

  // Promise needs special handling for branch injection
  if (hasPromiseBranches(config)) {
    return buildPromiseController(
      config.name,
      el,
      props as PropertyBindingIR[],
      locSpan,
      lowerCtx,
      nestedTemplates,
      collectRows,
      ctx,
      host,
    );
  }

  // All other controllers just need the template definition
  const def = templateOfElementChildren(
    el,
    lowerCtx,
    nestedTemplates,
    collectRows,
    ctx,
    { kind: "controller", host, controller: name },
  );

  // Build switch branch info for case/default-case controllers
  const branch = planControllerBranchInfo(config, raw, props).branch;

  return [createHydrateInstruction(name, def, props, locSpan, branch)];
}

function buildPropsForConfig(
  config: ControllerConfig,
  raw: SourceAlignedText,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  command: string | null,
  patternMode: BindingMode | null,
  bindingCommands: Record<string, BindingCommandConfig>
): ControllerBindableIR[] {
  const trigger = config.trigger;

  switch (trigger.kind) {
    case "marker":
      return [];
    case "iterator":
      return [buildIteratorProps(raw, valueLoc, loc, table, trigger.prop, !!config.tailProps, bindingCommands)];
    case "branch":
      // Branch controllers (case) may have literal or binding values
      if (config.props?.["value"]) {
        return [buildLiteralOrBindingProps(raw, valueLoc, loc, table, command, bindingCommands)];
      }
      return [];
    case "value":
      return [buildValueProps(config, raw, valueLoc, loc, table, trigger.prop, command, patternMode, bindingCommands)];
  }
}

function createHydrateInstruction(
  res: string,
  def: TemplateIR,
  props: ControllerBindableIR[],
  loc: SourceSpan | null,
  branch: ControllerBranchInfo | null = null
): HydrateTemplateControllerIR {
  return {
    type: "hydrateTemplateController",
    res,
    def,
    props,
    alias: null,
    branch,
    containerless: false,
    loc,
  };
}

function buildPromiseController(
  controllerName: string,
  el: P5Element,
  props: PropertyBindingIR[],
  locSpan: SourceSpan | null,
  lowerCtx: LowerContext,
  nestedTemplates: TemplateIR[],
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
  host: TemplateHostRef,
): HydrateTemplateControllerIR[] {
  const { def, idMap } = templateOfElementChildrenWithMap(
    el,
    lowerCtx,
    nestedTemplates,
    collectRows,
    ctx,
    { kind: "controller", host, controller: controllerName },
  );
  injectPromiseBranchesIntoDef(el, def, idMap, lowerCtx, nestedTemplates, props[0]!, collectRows, ctx);
  return [createHydrateInstruction(controllerName, def, props, locSpan)];
}

// -----------------------------------------------------------------------------
// Repeat Tail Props
// -----------------------------------------------------------------------------

function toRepeatTailIR(
  raw: SourceAlignedText,
  loc: P5Loc,
  table: ExprTable,
  bindingCommands: Record<string, BindingCommandConfig>
): MultiAttrIR[] | null {
  const tail = parseRepeatTailProps(raw, loc, table);
  if (!tail) return null;

  return tail.map((p) => {
    const dotIdx = p.to.lastIndexOf(".");
    let to = p.to;
    let command: string | null = null;

    if (dotIdx > 0) {
      const suffix = p.to.slice(dotIdx + 1);
      // Check if suffix is a property binding command using config lookup
      if (bindingCommands[suffix]?.kind === "property") {
        to = p.to.slice(0, dotIdx);
        command = suffix;
      }
    }

    return {
      type: "multiAttr" as const,
      to,
      command,
      from: p.from,
      value: p.value,
      loc: toSpan(loc, table.source),
    };
  });
}

// -----------------------------------------------------------------------------
// Promise Branch Injection
// -----------------------------------------------------------------------------

function injectPromiseBranchesIntoDef(
  el: P5Element,
  def: TemplateIR,
  idMap: WeakMap<P5Node, NodeId>,
  lowerCtx: LowerContext,
  nestedTemplates: TemplateIR[],
  valueProp: PropertyBindingIR,
  collectRows: RowCollector,
  ctx: TemplateBuildContext,
): void {
  const { attrParser, table, catalog } = lowerCtx;
  const kids =
    el.nodeName.toLowerCase() === "template"
      ? (el as P5Template).content.childNodes ?? []
      : el.childNodes ?? [];

  for (const kid of kids) {
    if (!isElementNode(kid)) continue;

    const branch = detectPromiseBranch(kid, attrParser, catalog);
    if (!branch) continue;

    const target = idMap.get(kid as P5Node);
    if (!target) continue;

    const hostRow = def.rows.find((r) => r.target === target);
    const preservedInstructions = hostRow
      ? hostRow.instructions.filter((ins) => !isBranchMarker(ins) && !isPromiseBranchController(ins, branch.kind))
      : [];

    // Remove branch marker/controller from host row
    if (hostRow) {
      hostRow.instructions = hostRow.instructions.filter((ins) => !isBranchMarker(ins) && !isPromiseBranchController(ins, branch.kind));
      if (preservedInstructions.length > 0) {
        hostRow.instructions = [];
      }
    }

    const branchOrigin: TemplateOrigin = {
      kind: "branch",
      host: { templateId: def.id, nodeId: target },
      branch: branch.kind,
    };

    const branchDef = preservedInstructions.length > 0
      ? templateOfElementChildren(kid as P5Element, lowerCtx, nestedTemplates, collectRows, ctx, branchOrigin)
      : (branch.isTemplate
          ? templateOfTemplateContent(kid as P5Template, lowerCtx, nestedTemplates, collectRows, ctx, branchOrigin)
          : templateOfElementChildren(kid as P5Element, lowerCtx, nestedTemplates, collectRows, ctx, branchOrigin));

    branchDef.origin = branchOrigin;

    for (const row of branchDef.rows) {
      row.instructions = row.instructions.filter((ins) => !isBranchMarker(ins));
    }

    if (preservedInstructions.length > 0) {
      const branchTarget = branchDef.dom.children[0]?.id ?? null;
      if (branchTarget != null) {
        const branchRow = branchDef.rows.find((r) => r.target === branchTarget);
        if (branchRow) {
          branchRow.instructions = preservedInstructions;
        } else {
          branchDef.rows.push({ target: branchTarget, instructions: preservedInstructions });
        }
      }
    }

    const descendants = collectBranchDescendantIds(kid, idMap);
    if (descendants.size > 0) {
      def.rows = def.rows.filter((row) => !descendants.has(row.target));
      stripDomChildren(def.dom, target);
    }

    // Build branch info
    const branchInfo = branch.kind === "pending"
      ? { kind: "pending" as const }
      : { kind: branch.kind, ...(branch.aliasVar != null ? { local: branch.aliasVar } : {}) };

    const branchInstruction: HydrateTemplateControllerIR = {
      type: "hydrateTemplateController",
      res: branch.kind,  // Use actual branch name (then/catch/pending), not "promise"
      def: branchDef,
      props: [valueProp],
      alias: branch.kind === "pending" ? null : branch.kind,
      branch: branchInfo,
      containerless: false,
      loc: toSpan(
        branch.loc ?? (branch.isTemplate ? (kid as P5Template).sourceCodeLocation : (kid as P5Element).sourceCodeLocation),
        table.source
      ),
    };

    if (hostRow) {
      hostRow.instructions.push(branchInstruction);
    } else {
      def.rows.push({
        target,
        instructions: [branchInstruction],
      });
    }
  }
}

type PromiseBranchInfo = {
  kind: "then" | "catch" | "pending";
  aliasVar: string | null;
  loc: P5Loc | null;
  isTemplate: boolean;
};

function detectPromiseBranch(
  kid: P5Element,
  attrParser: AttributeParser,
  catalog: LowerContext["catalog"],
): PromiseBranchInfo | null {
  const isTemplate = kid.nodeName.toLowerCase() === "template";

  for (const a of kid.attrs ?? []) {
    const parsed = attrParser.parse(a.name, a.value ?? "");
    const controller = getControllerConfig(parsed.target) ?? catalog.resources.controllers[parsed.target];
    const kind = resolvePromiseBranchKind(controller);
    if (!kind) continue;
    const raw = (a.value ?? "").trim();
    return {
      kind,
      aliasVar: kind === "pending" ? null : (raw.length ? raw : null),
      loc: attrLoc(kid, a.name),
      isTemplate,
    };
  }

  return null;
}

function isBranchMarker(ins: InstructionIR): boolean {
  if (ins.type === "setAttribute") {
    return isPromiseBranchName(ins.to);
  }
  if (ins.type === "propertyBinding") {
    return isPromiseBranchName(ins.to);
  }
  return false;
}

function isPromiseBranchController(ins: InstructionIR, kind: PromiseBranchInfo["kind"]): boolean {
  if (ins.type !== "hydrateTemplateController") return false;
  return ins.res === kind;
}

function isElementNode(n: P5Node): n is P5Element {
  return "tagName" in n;
}

function collectBranchDescendantIds(
  node: P5Element,
  idMap: WeakMap<P5Node, NodeId>,
): Set<NodeId> {
  const out = new Set<NodeId>();
  const visit = (n: P5Node) => {
    const id = idMap.get(n);
    if (id != null) out.add(id);
    if (isElementNode(n)) {
      const children = n.nodeName.toLowerCase() === "template"
        ? (n as P5Template).content.childNodes ?? []
        : n.childNodes ?? [];
      for (const child of children) visit(child);
    }
  };
  const rootChildren = node.nodeName.toLowerCase() === "template"
    ? (node as P5Template).content.childNodes ?? []
    : node.childNodes ?? [];
  for (const child of rootChildren) visit(child);
  return out;
}

function stripDomChildren(node: DOMNode, target: NodeId): boolean {
  if (node.id === target && (node.kind === "element" || node.kind === "template")) {
    node.children = [];
    return true;
  }
  if (node.kind !== "element" && node.kind !== "template") return false;
  for (const child of node.children ?? []) {
    if (stripDomChildren(child, target)) return true;
  }
  return false;
}
