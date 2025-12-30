import type { Token } from "parse5";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { ControllerConfig, Semantics } from "../../language/registry.js";
import type {
  ControllerBindableIR,
  ControllerBranchInfo,
  ExprRef,
  HydrateTemplateControllerIR,
  InstructionIR,
  IteratorBindingIR,
  MultiAttrIR,
  NodeId,
  PropertyBindingIR,
  SourceSpan,
  TemplateIR,
} from "../../model/ir.js";
import { resolveControllerAttr } from "./element-lowering.js";
import type { ExprTable, P5Element, P5Loc, P5Node, P5Template } from "./lower-shared.js";
import { attrLoc, attrValueLoc, findAttr, parseRepeatTailProps, toBindingSource, toExprRef, toMode, toSpan, tryToInterpIR } from "./lower-shared.js";
import type { RowCollector } from "./template-builders.js";
import {
  makeWrapperTemplate,
  templateOfElementChildren,
  templateOfElementChildrenWithMap,
  templateOfTemplateContent,
} from "./template-builders.js";

// -----------------------------------------------------------------------------
// Trigger kind helpers
// -----------------------------------------------------------------------------

/**
 * Check if the controller has promise branches (then/catch/pending).
 * This determines whether special branch injection is needed.
 */
function hasPromiseBranches(config: ControllerConfig): boolean {
  return config.branches?.names.includes("then") ?? false;
}

/**
 * Type guard to check if a BindingSourceIR is an ExprRef (not InterpIR).
 */
function isExprRef(source: PropertyBindingIR["from"]): source is ExprRef {
  return !("kind" in source && source.kind === "interp");
}

/**
 * Build switch branch info for case/default-case controllers.
 * Returns null for non-switch-branch controllers.
 *
 * CONFIG-DRIVEN: Uses trigger.kind to distinguish case vs default:
 * - trigger.kind="branch" with linksTo="switch" → case (has expr)
 * - trigger.kind="marker" with linksTo="switch" → default (no expr)
 */
function buildSwitchBranchInfo(
  config: ControllerConfig,
  props: ControllerBindableIR[]
): ControllerBranchInfo | null {
  // Only handle switch branch controllers
  if (config.linksTo !== "switch") return null;

  // Config-driven: branch trigger = case (has expression value)
  if (config.trigger.kind === "branch") {
    const valueProp = props.find(
      (p): p is PropertyBindingIR => p.type === "propertyBinding" && p.to === "value"
    );
    if (valueProp && isExprRef(valueProp.from)) {
      return { kind: "case", expr: valueProp.from };
    }
    // Fallback: branch controller without value (shouldn't happen but be defensive)
    return null;
  }

  // Config-driven: marker trigger = default (no expression)
  if (config.trigger.kind === "marker") {
    return { kind: "default" };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Prop Builders
// -----------------------------------------------------------------------------

function buildIteratorProps(
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable
): IteratorBindingIR {
  const forRef = table.add(raw, valueLoc, "IsIterator");
  const forOf = { astId: forRef.id, code: raw, loc: toSpan(valueLoc, table.source) };
  const tailProps = toRepeatTailIR(raw, valueLoc, table);
  return {
    type: "iteratorBinding",
    to: "items",
    forOf,
    props: tailProps,
    loc: toSpan(loc, table.source),
  };
}

function buildLiteralOrBindingProps(
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  command: string | null
): PropertyBindingIR {
  const isBinding = command === "bind";
  return {
    type: "propertyBinding",
    to: "value",
    from: isBinding
      ? toExprRef(raw, valueLoc, table, "IsProperty")
      : toExprRef(JSON.stringify(raw), valueLoc, table, "IsProperty"),
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
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  propName: string,
  controllerName: string,
  command: string | null
): ControllerBindableIR {
  const locSpan = toSpan(loc, table.source);
  const exprText = raw.length === 0 ? controllerName : raw;

  // Case 1: Has binding command (e.g., if.bind="expr")
  if (command) {
    return {
      type: "propertyBinding",
      to: propName,
      from: toBindingSource(exprText, valueLoc, table, "IsProperty"),
      mode: toMode(command, controllerName),
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
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): HydrateTemplateControllerIR[] {
  const candidates: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; config: ControllerConfig }[] = [];
  for (const a of el.attrs ?? []) {
    const s = attrParser.parse(a.name, a.value ?? "");
    const config = resolveControllerAttr(s, sem);
    if (config) candidates.push({ a, s, config });
  }
  if (!candidates.length) return [];

  const rightmost = candidates[candidates.length - 1];
  if (!rightmost) return [];

  let current = buildRightmostController(el, rightmost, attrParser, table, nestedTemplates, sem, collectRows);

  for (let i = candidates.length - 2; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const { a, s, config } = candidate;
    const loc = attrLoc(el, a.name);
    const valueLoc = attrValueLoc(el, a.name, table.sourceText);
    const proto = buildControllerPrototype(a, s, table, loc, valueLoc, config);

    // Build switch branch info for case/default-case controllers
    const branch = buildSwitchBranchInfo(config, proto.props);

    const nextLayer: HydrateTemplateControllerIR[] = [];
    for (const inner of current) {
      const def = makeWrapperTemplate(inner, nestedTemplates);
      nextLayer.push({
        type: "hydrateTemplateController",
        res: proto.res,
        def,
        props: proto.props,
        alias: null,
        branch,
        containerless: false,
        loc: toSpan(loc, table.source),
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
  config: ControllerConfig
): ControllerPrototype {
  const raw = a.value ?? "";
  const name = config.name;
  const trigger = config.trigger;

  switch (trigger.kind) {
    case "marker":
      return { res: name, props: [] };

    case "iterator":
      return { res: name, props: [buildIteratorProps(raw, valueLoc, loc, table)] };

    case "branch":
      // Branch controllers (else, case, then, etc.) may have literal or binding values
      // Case has value.bind, else has no value
      if (config.props?.["value"]) {
        return { res: name, props: [buildLiteralOrBindingProps(raw, valueLoc, loc, table, s.command)] };
      }
      return { res: name, props: [] };

    case "value":
      return { res: name, props: [buildValueProps(raw, valueLoc, loc, table, trigger.prop, name, s.command)] };
  }
}

// -----------------------------------------------------------------------------
// Rightmost Controller (includes template definition)
// -----------------------------------------------------------------------------

function buildRightmostController(
  el: P5Element,
  rightmost: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; config: ControllerConfig },
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): HydrateTemplateControllerIR[] {
  const { a, s, config } = rightmost;
  const loc = attrLoc(el, a.name);
  const valueLoc = attrValueLoc(el, a.name, table.sourceText);
  const raw = a.value ?? "";
  const locSpan = toSpan(loc, table.source);
  const name = config.name;

  // Build props based on controller type
  const props = buildPropsForConfig(config, raw, valueLoc, loc, table, s.command);

  // Promise needs special handling for branch injection
  if (hasPromiseBranches(config)) {
    return buildPromiseController(el, props as PropertyBindingIR[], locSpan, attrParser, table, nestedTemplates, sem, collectRows);
  }

  // All other controllers just need the template definition
  const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);

  // Build switch branch info for case/default-case controllers
  const branch = buildSwitchBranchInfo(config, props);

  return [createHydrateInstruction(name, def, props, locSpan, branch)];
}

function buildPropsForConfig(
  config: ControllerConfig,
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  command: string | null
): ControllerBindableIR[] {
  const trigger = config.trigger;
  const name = config.name;

  switch (trigger.kind) {
    case "marker":
      return [];
    case "iterator":
      return [buildIteratorProps(raw, valueLoc, loc, table)];
    case "branch":
      // Branch controllers (case) may have literal or binding values
      if (config.props?.["value"]) {
        return [buildLiteralOrBindingProps(raw, valueLoc, loc, table, command)];
      }
      return [];
    case "value":
      return [buildValueProps(raw, valueLoc, loc, table, trigger.prop, name, command)];
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
  el: P5Element,
  props: PropertyBindingIR[],
  locSpan: SourceSpan | null,
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): HydrateTemplateControllerIR[] {
  const { def, idMap } = templateOfElementChildrenWithMap(el, attrParser, table, nestedTemplates, sem, collectRows);
  injectPromiseBranchesIntoDef(el, def, idMap, attrParser, table, nestedTemplates, sem, props[0]!, collectRows);
  return [createHydrateInstruction("promise", def, props, locSpan)];
}

// -----------------------------------------------------------------------------
// Repeat Tail Props
// -----------------------------------------------------------------------------

function toRepeatTailIR(raw: string, loc: P5Loc, table: ExprTable): MultiAttrIR[] | null {
  const tail = parseRepeatTailProps(raw, loc, table);
  if (!tail) return null;

  return tail.map((p) => {
    const dotIdx = p.to.lastIndexOf(".");
    let to = p.to;
    let command: string | null = null;

    if (dotIdx > 0) {
      const suffix = p.to.slice(dotIdx + 1);
      if (["bind", "one-time", "to-view", "from-view", "two-way"].includes(suffix)) {
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
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  valueProp: PropertyBindingIR,
  collectRows: RowCollector
): void {
  const kids =
    el.nodeName.toLowerCase() === "template"
      ? (el as P5Template).content.childNodes ?? []
      : el.childNodes ?? [];

  for (const kid of kids) {
    if (!isElementNode(kid)) continue;

    const branch = detectPromiseBranch(kid, attrParser);
    if (!branch) continue;

    const target = idMap.get(kid as P5Node);
    if (!target) continue;

    // Remove branch marker from host row
    const hostRow = def.rows.find((r) => r.target === target);
    if (hostRow) {
      hostRow.instructions = hostRow.instructions.filter((ins) => !isBranchMarker(ins));
    }

    // Build branch definition
    const branchDef = branch.isTemplate
      ? templateOfTemplateContent(kid as P5Template, attrParser, table, nestedTemplates, sem, collectRows)
      : templateOfElementChildren(kid as P5Element, attrParser, table, nestedTemplates, sem, collectRows);

    for (const row of branchDef.rows) {
      row.instructions = row.instructions.filter((ins) => !isBranchMarker(ins));
    }

    // Build branch info
    const branchInfo = branch.kind === "pending"
      ? { kind: "pending" as const }
      : { kind: branch.kind, local: branch.aliasVar ?? branch.kind };

    def.rows.push({
      target,
      instructions: [
        {
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
        },
      ],
    });
  }
}

type PromiseBranchInfo = {
  kind: "then" | "catch" | "pending";
  aliasVar: string | null;
  loc: P5Loc | null;
  isTemplate: boolean;
};

function detectPromiseBranch(kid: P5Element, attrParser: AttributeParser): PromiseBranchInfo | null {
  const isTemplate = kid.nodeName.toLowerCase() === "template";

  if (isTemplate) {
    const thenAttr = findAttr(kid, "then");
    if (thenAttr) {
      return {
        kind: "then",
        aliasVar: thenAttr.value?.length ? thenAttr.value : "then",
        loc: (kid as P5Template).sourceCodeLocation,
        isTemplate: true,
      };
    }

    const catchAttr = findAttr(kid, "catch");
    if (catchAttr) {
      return {
        kind: "catch",
        aliasVar: catchAttr.value?.length ? catchAttr.value : "catch",
        loc: (kid as P5Template).sourceCodeLocation,
        isTemplate: true,
      };
    }

    const pendingAttr = findAttr(kid, "pending");
    if (pendingAttr) {
      return {
        kind: "pending",
        aliasVar: null,
        loc: (kid as P5Template).sourceCodeLocation,
        isTemplate: true,
      };
    }

    return null;
  }

  // Non-template element
  for (const a of kid.attrs ?? []) {
    const parsed = attrParser.parse(a.name, a.value ?? "");
    if (parsed.target === "then" || parsed.target === "catch" || parsed.target === "pending") {
      return {
        kind: parsed.target,
        aliasVar: parsed.target === "pending" ? null : (a.value?.length ? a.value : parsed.target),
        loc: attrLoc(kid, a.name),
        isTemplate: false,
      };
    }
  }

  return null;
}

function isBranchMarker(ins: InstructionIR): boolean {
  if (ins.type === "setAttribute") {
    return ins.to === "then" || ins.to === "catch" || ins.to === "pending";
  }
  if (ins.type === "propertyBinding") {
    return ins.to === "then" || ins.to === "catch" || ins.to === "pending";
  }
  return false;
}

function isElementNode(n: P5Node): n is P5Element {
  return "tagName" in n;
}
