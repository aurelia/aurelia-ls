import type { Token } from "parse5";
import type { AttributeParser } from "../../language/syntax.js";
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
import { attrLoc, findAttr, parseRepeatTailProps, toExprRef, toSpan } from "./lower-shared.js";
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
    const prototypes = buildControllerPrototypes(el, a, s, attrParser, table, loc, sem, kind);

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
  res: "repeat" | "with" | "if" | "switch" | "promise" | "portal";
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
  const { a, s } = rightmost;
  const loc = attrLoc(el, a.name);
  const raw = a.value ?? "";

  if (kind === "repeat") {
    const forRef = table.add(raw, loc, "IsIterator");
    const forOf = { astId: forRef.id, loc: toSpan(loc, table.source) };
    const tailProps: MultiAttrIR[] | null = toRepeatTailIR(raw, loc, table);
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

  const controller = kind;
  const exprText = raw.length === 0 ? controller : raw;
  const valueProp: PropertyBindingIR = {
    type: "propertyBinding",
    to: "value",
    from: toExprRef(exprText, loc, table, "IsProperty"),
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
    const { def, idMap } = templateOfElementChildrenWithMap(
      el,
      attrParser,
      table,
      nestedTemplates,
      sem,
      collectRows
    );
    injectSwitchBranchesIntoDef(
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
  _sem: Semantics,
  kind: ControllerName
): ControllerPrototype[] {
  const raw = a.value ?? "";

  if (kind === "repeat") {
    const forRef = table.add(raw, loc, "IsIterator");
    const forOf = { astId: forRef.id, loc: toSpan(loc, table.source) };
    const tailProps: MultiAttrIR[] | null = toRepeatTailIR(raw, loc, table);
    const iter: IteratorBindingIR = {
      type: "iteratorBinding",
      to: "items",
      forOf,
      props: tailProps,
      loc: toSpan(loc, table.source),
    };
    return [{ res: "repeat", props: [iter] }];
  }

  const controller = kind;
  const exprText = raw.length === 0 ? controller : raw;
  const valueProp: PropertyBindingIR = {
    type: "propertyBinding",
    to: "value",
    from: toExprRef(exprText, loc, table, "IsProperty"),
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
  return tail.map((p) => ({
    type: "multiAttr",
    to: p.to,
    command: null,
    from: p.from,
    value: p.value,
    loc: toSpan(loc, table.source),
  }));
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
      return ins.to === "then" || ins.to === "catch";
    }
    if (ins.type === "propertyBinding") {
      return ins.to === "then" || ins.to === "catch";
    }
    if (ins.type === "attributeBinding") {
      return ins.attr === "then" || ins.attr === "catch" || ins.to === "then" || ins.to === "catch";
    }
    return false;
  };

  for (const kid of kids) {
    if (!isElementNode(kid)) continue;

    const isTpl = kid.nodeName.toLowerCase() === "template";
    let branchKind: "then" | "catch" | null = null;
    let aliasVar: string | null = null;
    let branchAttrLoc: P5Loc | null | undefined = null;

    if (isTpl) {
      const thenAttr = findAttr(kid, "then");
      const catchAttr = findAttr(kid, "catch");
      if (thenAttr) {
        branchKind = "then";
        aliasVar = (thenAttr.value?.length ? thenAttr.value : "then") ?? "then";
        branchAttrLoc = (kid as P5Template).sourceCodeLocation;
      } else if (catchAttr) {
        branchKind = "catch";
        aliasVar = (catchAttr.value?.length ? catchAttr.value : "catch") ?? "catch";
        branchAttrLoc = (kid as P5Template).sourceCodeLocation;
      }
    } else {
      for (const a of (kid as P5Element).attrs ?? []) {
        const parsed = attrParser.parse(a.name, a.value ?? "");
        if (parsed.target === "then" || parsed.target === "catch") {
          branchKind = parsed.target;
          aliasVar = (a.value?.length ? a.value : branchKind) ?? branchKind;
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

    def.rows.push({
      target,
      instructions: [
        {
          type: "hydrateTemplateController",
          res: "promise",
          def: branchDef,
          props: [valueProp],
          alias: branchKind,
          branch: { kind: branchKind, local: aliasVar ?? branchKind },
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

function injectSwitchBranchesIntoDef(
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
    if (!isElementNode(kid) || kid.nodeName.toLowerCase() !== "template") continue;

    let caseExpr: string | null = null;
    let isDefault = false;

    for (const a of (kid as P5Element).attrs ?? []) {
      const s = attrParser.parse(a.name, a.value ?? "");
      if (s.target === "case") {
        caseExpr = (a.value ?? "").length ? a.value : s.command ? a.value ?? "" : s.rawValue;
      } else if (a.name === "default-case") {
        isDefault = true;
      }
    }

    const target = idMap.get(kid as P5Node);
    if (!target) continue;

    const row = def.rows.find((r) => r.target === target);
    if (row) {
      row.instructions = row.instructions.filter((ins) => {
        if (ins.type === "setAttribute") return ins.to !== "default-case" && ins.to !== "case";
        if (ins.type === "propertyBinding") return ins.to !== "case";
        return true;
      });
    }

    if (caseExpr !== null) {
      const branchDef = templateOfTemplateContent(
        kid as P5Template,
        attrParser,
        table,
        nestedTemplates,
        sem,
        collectRows
      );
      const caseProp: PropertyBindingIR = {
        type: "propertyBinding",
        to: "case",
        from: toExprRef(
          caseExpr,
          (kid as P5Template).sourceCodeLocation,
          table,
          "IsProperty"
        ),
        mode: "default",
        loc: toSpan((kid as P5Template).sourceCodeLocation, table.source),
      };
      def.rows.push({
        target,
        instructions: [
          {
            type: "hydrateTemplateController",
            res: "switch",
            def: branchDef,
            props: [valueProp, caseProp],
            alias: "case",
            branch: {
              kind: "case",
              expr: toExprRef(
                caseExpr,
                (kid as P5Template).sourceCodeLocation,
                table,
                "IsProperty"
              ),
            },
            containerless: false,
            loc: toSpan((kid as P5Template).sourceCodeLocation, table.source),
          },
        ],
      });
      continue;
    }

    if (isDefault) {
      const branchDef = templateOfTemplateContent(
        kid as P5Template,
        attrParser,
        table,
        nestedTemplates,
        sem,
        collectRows
      );
      def.rows.push({
        target,
        instructions: [
          {
            type: "hydrateTemplateController",
            res: "switch",
            def: branchDef,
            props: [valueProp],
            alias: "default",
            branch: { kind: "default" },
            containerless: false,
            loc: toSpan((kid as P5Template).sourceCodeLocation, table.source),
          },
        ],
      });
    }
  }
}

function isElementNode(n: P5Node): n is P5Element {
  return "tagName" in n;
}
