import type { Token } from "parse5";
import type { AttributeParser } from "../../parsing/attribute-parser.js";
import type { Semantics } from "../../language/registry.js";
import type {
  HydrateTemplateControllerIR,
  InstructionIR,
  IteratorBindingIR,
  MultiAttrIR,
  PropertyBindingIR,
  TemplateIR,
  NodeId,
  SourceSpan,
} from "../../model/ir.js";
import { resolveControllerAttr } from "./element-lowering.js";
import type { ControllerName } from "./element-lowering.js";
import type { ExprTable, P5Element, P5Loc, P5Node, P5Template } from "./lower-shared.js";
import { attrLoc, attrValueLoc, findAttr, parseRepeatTailProps, toExprRef, toSpan } from "./lower-shared.js";
import type { RowCollector } from "./template-builders.js";
import {
  makeWrapperTemplate,
  templateOfElementChildren,
  templateOfElementChildrenWithMap,
  templateOfTemplateContent,
} from "./template-builders.js";

// -----------------------------------------------------------------------------
// Controller Configuration Table
// -----------------------------------------------------------------------------

type ControllerConfig =
  | { kind: "marker" }
  | { kind: "iterator" }
  | { kind: "literalOrBinding" }
  | { kind: "property"; propName: string; promiseBranches?: boolean };

const CONTROLLER_CONFIG: Record<ControllerName, ControllerConfig> = {
  repeat: { kind: "iterator" },
  else: { kind: "marker" },
  case: { kind: "literalOrBinding" },
  "default-case": { kind: "marker" },
  promise: { kind: "property", propName: "value", promiseBranches: true },
  switch: { kind: "property", propName: "value" },
  if: { kind: "property", propName: "value" },
  with: { kind: "property", propName: "value" },
  portal: { kind: "property", propName: "target" },
};

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

function buildPropertyProps(
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  propName: string,
  controllerName: ControllerName
): PropertyBindingIR {
  const exprText = raw.length === 0 ? controllerName : raw;
  return {
    type: "propertyBinding",
    to: propName,
    from: toExprRef(exprText, valueLoc, table, "IsProperty"),
    mode: "default",
    loc: toSpan(loc, table.source),
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
  const candidates: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; kind: ControllerName }[] = [];
  for (const a of el.attrs ?? []) {
    const s = attrParser.parse(a.name, a.value ?? "");
    const kind = resolveControllerAttr(s, sem);
    if (kind) candidates.push({ a, s, kind });
  }
  if (!candidates.length) return [];

  const rightmost = candidates[candidates.length - 1];
  if (!rightmost) return [];

  let current = buildRightmostController(el, rightmost, attrParser, table, nestedTemplates, sem, collectRows);

  for (let i = candidates.length - 2; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const { a, s, kind } = candidate;
    const loc = attrLoc(el, a.name);
    const valueLoc = attrValueLoc(el, a.name, table.sourceText);
    const proto = buildControllerPrototype(a, s, table, loc, valueLoc, kind);

    const nextLayer: HydrateTemplateControllerIR[] = [];
    for (const inner of current) {
      const def = makeWrapperTemplate(inner, nestedTemplates);
      nextLayer.push({
        type: "hydrateTemplateController",
        res: proto.res,
        def,
        props: proto.props,
        alias: null,
        branch: null,
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
  res: ControllerName;
  props: (PropertyBindingIR | IteratorBindingIR)[];
};

function buildControllerPrototype(
  a: Token.Attribute,
  s: ReturnType<AttributeParser["parse"]>,
  table: ExprTable,
  loc: P5Loc,
  valueLoc: P5Loc,
  kind: ControllerName
): ControllerPrototype {
  const raw = a.value ?? "";
  const config = CONTROLLER_CONFIG[kind];

  switch (config.kind) {
    case "marker":
      return { res: kind, props: [] };

    case "iterator":
      return { res: kind, props: [buildIteratorProps(raw, valueLoc, loc, table)] };

    case "literalOrBinding":
      return { res: kind, props: [buildLiteralOrBindingProps(raw, valueLoc, loc, table, s.command)] };

    case "property":
      return { res: kind, props: [buildPropertyProps(raw, valueLoc, loc, table, config.propName, kind)] };
  }
}

// -----------------------------------------------------------------------------
// Rightmost Controller (includes template definition)
// -----------------------------------------------------------------------------

function buildRightmostController(
  el: P5Element,
  rightmost: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]>; kind: ControllerName },
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector
): HydrateTemplateControllerIR[] {
  const { a, s, kind } = rightmost;
  const loc = attrLoc(el, a.name);
  const valueLoc = attrValueLoc(el, a.name, table.sourceText);
  const raw = a.value ?? "";
  const config = CONTROLLER_CONFIG[kind];
  const locSpan = toSpan(loc, table.source);

  // Build props based on controller type
  const props = buildPropsForConfig(config, raw, valueLoc, loc, table, s.command, kind);

  // Promise needs special handling for branch injection
  if (config.kind === "property" && config.promiseBranches) {
    return buildPromiseController(el, props as PropertyBindingIR[], locSpan, attrParser, table, nestedTemplates, sem, collectRows);
  }

  // All other controllers just need the template definition
  const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
  return [createHydrateInstruction(kind, def, props, locSpan)];
}

function buildPropsForConfig(
  config: ControllerConfig,
  raw: string,
  valueLoc: P5Loc,
  loc: P5Loc,
  table: ExprTable,
  command: string | null,
  kind: ControllerName
): (PropertyBindingIR | IteratorBindingIR)[] {
  switch (config.kind) {
    case "marker":
      return [];
    case "iterator":
      return [buildIteratorProps(raw, valueLoc, loc, table)];
    case "literalOrBinding":
      return [buildLiteralOrBindingProps(raw, valueLoc, loc, table, command)];
    case "property":
      return [buildPropertyProps(raw, valueLoc, loc, table, config.propName, kind)];
  }
}

function createHydrateInstruction(
  res: ControllerName,
  def: TemplateIR,
  props: (PropertyBindingIR | IteratorBindingIR)[],
  loc: SourceSpan | null
): HydrateTemplateControllerIR {
  return {
    type: "hydrateTemplateController",
    res,
    def,
    props,
    alias: null,
    branch: null,
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
          res: "promise",
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
