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
  let current: HydrateTemplateControllerIR[] = buildBaseInstructionsForRightmost(
    el,
    rightmost,
    attrParser,
    table,
    nestedTemplates,
    sem,
    collectRows,
    rightmost.kind
  );

  for (let i = candidates.length - 2; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const { a, s, kind } = candidate;
    const loc = attrLoc(el, a.name);
    const valueLoc = attrValueLoc(el, a.name, table.sourceText);
    const prototypes = buildControllerPrototypes(el, a, s, attrParser, table, loc, valueLoc, sem, kind);

    const nextLayer: HydrateTemplateControllerIR[] = [];
    for (const proto of prototypes) {
      for (const inner of current) {
        const def = makeWrapperTemplate(inner, nestedTemplates);
        nextLayer.push({
          type: "hydrateTemplateController",
          res: proto.res,
          def,
          props: proto.props,
          alias: proto.alias ?? null,
          branch: null,
          containerless: false,
          loc: toSpan(loc, table.source),
        });
      }
    }
    current = nextLayer;
  }

  return current;
}

type ControllerPrototype = {
  res: "repeat" | "with" | "if" | "switch" | "promise" | "portal" | "else" | "case" | "default-case";
  props: (PropertyBindingIR | IteratorBindingIR)[];
  alias?: "then" | "catch" | "case" | "default" | null;
};

function buildBaseInstructionsForRightmost(
  el: P5Element,
  rightmost: { a: Token.Attribute; s: ReturnType<AttributeParser["parse"]> },
  attrParser: AttributeParser,
  table: ExprTable,
  nestedTemplates: TemplateIR[],
  sem: Semantics,
  collectRows: RowCollector,
  kind: ControllerName
): HydrateTemplateControllerIR[] {
  const { a } = rightmost;
  const loc = attrLoc(el, a.name);
  const valueLoc = attrValueLoc(el, a.name, table.sourceText);
  const raw = a.value ?? "";

  if (kind === "repeat") {
    const forRef = table.add(raw, valueLoc, "IsIterator");
    const forOf = { astId: forRef.id, code: raw, loc: toSpan(valueLoc, table.source) };
    const tailProps: MultiAttrIR[] | null = toRepeatTailIR(raw, valueLoc, table);
    const iter: IteratorBindingIR = {
      type: "iteratorBinding",
      to: "items",
      forOf,
      props: tailProps,
      loc: toSpan(loc, table.source),
    };
    const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
    return [
      {
        type: "hydrateTemplateController",
        res: "repeat",
        def,
        props: [iter],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  // `else` is a linking controller with no value binding - just a marker attribute
  if (kind === "else") {
    const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
    return [
      {
        type: "hydrateTemplateController",
        res: "else",
        def,
        props: [],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  // `case` has a value binding for the case expression
  // case="foo" means literal "foo", case.bind="foo" means expression foo
  if (kind === "case") {
    const { s } = rightmost;
    const isBinding = s.command === "bind";
    const valueProp: PropertyBindingIR = {
      type: "propertyBinding",
      to: "value",
      from: isBinding
        ? toExprRef(raw, valueLoc, table, "IsProperty")
        : toExprRef(JSON.stringify(raw), valueLoc, table, "IsProperty"), // Literal as quoted string
      mode: "default",
      loc: toSpan(loc, table.source),
    };
    const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
    return [
      {
        type: "hydrateTemplateController",
        res: "case",
        def,
        props: [valueProp],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  // `default-case` is a linking controller with no value binding
  if (kind === "default-case") {
    const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
    return [
      {
        type: "hydrateTemplateController",
        res: "default-case",
        def,
        props: [],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  const controller = kind;
  const exprText = raw.length === 0 ? controller : raw;
  // Portal uses 'target' as primary bindable; others use 'value'
  const propName = controller === "portal" ? "target" : "value";
  const valueProp: PropertyBindingIR = {
    type: "propertyBinding",
    to: propName,
    from: toExprRef(exprText, valueLoc, table, "IsProperty"),
    mode: "default",
    loc: toSpan(loc, table.source),
  };

  if (controller === "promise") {
    const { def, idMap } = templateOfElementChildrenWithMap(
      el,
      attrParser,
      table,
      nestedTemplates,
      sem,
      collectRows
    );
    injectPromiseBranchesIntoDef(
      el,
      def,
      idMap,
      attrParser,
      table,
      nestedTemplates,
      sem,
      valueProp,
      collectRows
    );
    return [
      {
        type: "hydrateTemplateController",
        res: "promise",
        def,
        props: [valueProp],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  if (controller === "switch") {
    // Switch's children (case/default-case) are processed as standalone controllers
    // via collectControllers, similar to how else works for if
    const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
    return [
      {
        type: "hydrateTemplateController",
        res: "switch",
        def,
        props: [valueProp],
        alias: null,
        branch: null,
        containerless: false,
        loc: toSpan(loc, table.source),
      },
    ];
  }

  const def = templateOfElementChildren(el, attrParser, table, nestedTemplates, sem, collectRows);
  return [
    {
      type: "hydrateTemplateController",
      res: controller,
      def,
      props: [valueProp],
      alias: null,
      branch: null,
      containerless: false,
      loc: toSpan(loc, table.source),
    },
  ];
}

function buildControllerPrototypes(
  _el: P5Element,
  a: Token.Attribute,
  s: ReturnType<AttributeParser["parse"]>,
  _attrParser: AttributeParser,
  table: ExprTable,
  loc: P5Loc,
  valueLoc: P5Loc,
  _sem: Semantics,
  kind: ControllerName
): ControllerPrototype[] {
  const raw = a.value ?? "";

  if (kind === "repeat") {
    const forRef = table.add(raw, valueLoc, "IsIterator");
    const forOf = { astId: forRef.id, code: raw, loc: toSpan(valueLoc, table.source) };
    const tailProps: MultiAttrIR[] | null = toRepeatTailIR(raw, valueLoc, table);
    const iter: IteratorBindingIR = {
      type: "iteratorBinding",
      to: "items",
      forOf,
      props: tailProps,
      loc: toSpan(loc, table.source),
    };
    return [{ res: "repeat", props: [iter] }];
  }

  // `else` is a linking controller with no value binding
  if (kind === "else") {
    return [{ res: "else", props: [] }];
  }

  // `case` has a value binding (the case expression)
  if (kind === "case") {
    const raw = a.value ?? "";
    const valueProp: PropertyBindingIR = {
      type: "propertyBinding",
      to: "value",
      from: toExprRef(raw, valueLoc, table, "IsProperty"),
      mode: "default",
      loc: toSpan(loc, table.source),
    };
    return [{ res: "case", props: [valueProp] }];
  }

  // `default-case` is like else - no value binding
  if (kind === "default-case") {
    return [{ res: "default-case", props: [] }];
  }

  const controller = kind;
  const exprText = raw.length === 0 ? controller : raw;
  // Portal uses 'target' as primary bindable; others use 'value'
  const propName = controller === "portal" ? "target" : "value";
  const valueProp: PropertyBindingIR = {
    type: "propertyBinding",
    to: propName,
    from: toExprRef(exprText, valueLoc, table, "IsProperty"),
    mode: "default",
    loc: toSpan(loc, table.source),
  };

  if (controller === "promise" || controller === "switch") {
    return [{ res: controller, props: [valueProp] }];
  }
  return [{ res: controller, props: [valueProp] }];
}

function toRepeatTailIR(
  raw: string,
  loc: P5Loc,
  table: ExprTable
): MultiAttrIR[] | null {
  const tail = parseRepeatTailProps(raw, loc, table);
  if (!tail) return null;
  return tail.map((p) => {
    // Handle key.bind syntax: split "key.bind" into to="key", command="bind"
    const dotIdx = p.to.lastIndexOf(".");
    let to = p.to;
    let command: string | null = null;
    if (dotIdx > 0) {
      const suffix = p.to.slice(dotIdx + 1);
      if (suffix === "bind" || suffix === "one-time" || suffix === "to-view" || suffix === "from-view" || suffix === "two-way") {
        to = p.to.slice(0, dotIdx);
        command = suffix;
      }
    }
    return {
      type: "multiAttr",
      to,
      command,
      from: p.from,
      value: p.value,
      loc: toSpan(loc, table.source),
    };
  });
}

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

  const isBranchMarker = (ins: InstructionIR) => {
    if (ins.type === "setAttribute") {
      return ins.to === "then" || ins.to === "catch" || ins.to === "pending";
    }
    if (ins.type === "propertyBinding") {
      return ins.to === "then" || ins.to === "catch" || ins.to === "pending";
    }
    if (ins.type === "attributeBinding") {
      return ins.attr === "then" || ins.attr === "catch" || ins.attr === "pending" ||
             ins.to === "then" || ins.to === "catch" || ins.to === "pending";
    }
    return false;
  };

  for (const kid of kids) {
    if (!isElementNode(kid)) continue;

    const isTpl = kid.nodeName.toLowerCase() === "template";
    let branchKind: "then" | "catch" | "pending" | null = null;
    let aliasVar: string | null = null;
    let branchAttrLoc: P5Loc | null | undefined = null;

    if (isTpl) {
      const thenAttr = findAttr(kid, "then");
      const catchAttr = findAttr(kid, "catch");
      const pendingAttr = findAttr(kid, "pending");
      if (thenAttr) {
        branchKind = "then";
        aliasVar = (thenAttr.value?.length ? thenAttr.value : "then") ?? "then";
        branchAttrLoc = (kid as P5Template).sourceCodeLocation;
      } else if (catchAttr) {
        branchKind = "catch";
        aliasVar = (catchAttr.value?.length ? catchAttr.value : "catch") ?? "catch";
        branchAttrLoc = (kid as P5Template).sourceCodeLocation;
      } else if (pendingAttr) {
        branchKind = "pending";
        // pending does NOT create an alias - it has no value to pass
        aliasVar = null;
        branchAttrLoc = (kid as P5Template).sourceCodeLocation;
      }
    } else {
      for (const a of (kid as P5Element).attrs ?? []) {
        const parsed = attrParser.parse(a.name, a.value ?? "");
        if (parsed.target === "then" || parsed.target === "catch" || parsed.target === "pending") {
          branchKind = parsed.target;
          // pending does NOT create an alias
          aliasVar = branchKind === "pending" ? null : ((a.value?.length ? a.value : branchKind) ?? branchKind);
          branchAttrLoc = attrLoc(kid as P5Element, a.name);
          break;
        }
      }
    }

    if (!branchKind) continue;

    const target = idMap.get(kid as P5Node);
    if (!target) continue;

    const hostRow = def.rows.find((r) => r.target === target);
    if (hostRow) {
      hostRow.instructions = hostRow.instructions.filter((ins) => !isBranchMarker(ins));
    }

    const branchDef = isTpl
      ? templateOfTemplateContent(kid as P5Template, attrParser, table, nestedTemplates, sem, collectRows)
      : templateOfElementChildren(kid as P5Element, attrParser, table, nestedTemplates, sem, collectRows);

    for (const row of branchDef.rows) {
      row.instructions = row.instructions.filter((ins) => !isBranchMarker(ins));
    }

    // Build branch info - pending has no local alias, then/catch do
    const branch = branchKind === "pending"
      ? { kind: "pending" as const }
      : { kind: branchKind, local: aliasVar ?? branchKind };

    def.rows.push({
      target,
      instructions: [
        {
          type: "hydrateTemplateController",
          res: "promise",
          def: branchDef,
          props: [valueProp],
          alias: branchKind === "pending" ? null : branchKind, // pending is not an alias
          branch,
          containerless: false,
          loc: toSpan(
            branchAttrLoc ??
              (isTpl ? (kid as P5Template).sourceCodeLocation : (kid as P5Element).sourceCodeLocation),
            table.source
          ),
        },
      ],
    });
  }
}

function isElementNode(n: P5Node): n is P5Element {
  return "tagName" in n;
}
