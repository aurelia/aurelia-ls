import {
  runVectorTests,
  getDirname,
  lowerOpts,
  type TestVector,
  type CompilerContext,
} from "../_helpers/vector-runner.js";
import { diffByKey } from "../_helpers/test-utils.js";

import { lowerDocument } from "@aurelia-ls/compiler";

interface DiagIntent {
  code: string;
  messageContains?: string;
}

interface LowerIntent {
  expressions: ExpressionIntent[];
  controllers: ControllerIntent[];
  lets: LetIntent[];
  elements: ElementIntent[];
  attributes: AttributeIntent[];
  diags: DiagIntent[];
}

interface ExpressionIntent {
  kind?: string;
  on?: string;
  command?: string;
  code?: string;
  name?: string;
  toBindingContext?: boolean;
  hasValue?: boolean;
}

interface ControllerIntent {
  name: string;
}

interface LetIntent {
  name: string;
  toBindingContext: boolean;
  hasValue: boolean;
}

interface ElementIntent {
  res: string;
  containerless: boolean;
  props: string[];
}

interface AttributeIntent {
  res: string;
  alias?: string;
  props: string[];
}

interface LowerDiff {
  missingExpressions: string[];
  extraExpressions: string[];
  missingControllers: string[];
  extraControllers: string[];
  missingLets: string[];
  extraLets: string[];
  missingElements: string[];
  extraElements: string[];
  missingAttributes: string[];
  extraAttributes: string[];
  missingDiags: string[];
  extraDiags: string[];
}

type LowerExpect = Partial<LowerIntent>;

runVectorTests<LowerExpect, LowerIntent, LowerDiff>({
  dirname: getDirname(import.meta.url),
  suiteName: "Lower (10)",
  execute: (v: TestVector, ctx: CompilerContext) =>
    reduceIrToLowerIntent(lowerDocument(v.markup, lowerOpts(ctx))),
  compare: compareLowerIntent,
  categories: ["expressions", "controllers", "lets", "elements", "attributes", "diags"],
});

// --- Intent Reduction ---

function modeToCommand(mode: string | undefined): string {
  switch (mode) {
    case "oneTime":
      return "one-time";
    case "toView":
      return "to-view";
    case "fromView":
      return "from-view";
    case "twoWay":
      return "two-way";
    default:
      return "bind";
  }
}

interface BindingSource {
  kind?: string;
  code?: string;
  exprs?: Array<{ code: string }>;
}

function pushFromBindingSource(
  list: ExpressionIntent[],
  kind: string,
  on: string | undefined,
  source: BindingSource | undefined
): void {
  if (!source) return;
  if (source.kind === "interp") {
    for (const e of source.exprs ?? []) list.push({ kind, on, code: e.code });
  } else {
    list.push({ kind, on, code: source.code });
  }
}

interface TemplateIr {
  rows?: Array<{
    instructions?: Instruction[];
  }>;
}

interface Instruction {
  type: string;
  from?: BindingSource;
  to?: string;
  attr?: string;
  mode?: string;
  capture?: boolean;
  toBindingContext?: boolean;
  res?: string;
  alias?: string;
  containerless?: boolean;
  props?: Array<{
    type: string;
    to?: string;
    attr?: string;
    from?: BindingSource;
    mode?: string;
  }>;
  instructions?: Array<{
    type: string;
    to?: string;
    from?: BindingSource;
  }>;
  def?: TemplateIr;
}

function reduceTemplate(t: TemplateIr, out: LowerIntent): void {
  for (const row of t.rows ?? []) {
    for (const ins of row.instructions ?? []) {
      switch (ins.type) {
        case "textBinding":
          pushFromBindingSource(out.expressions, "text", undefined, ins.from);
          break;
        case "attributeBinding":
          if (ins.from && ins.from.kind === "interp") {
            pushFromBindingSource(
              out.expressions,
              "attrInterpolation",
              ins.attr,
              ins.from
            );
          } else {
            out.expressions.push({
              kind: "propCommand",
              command: "bind",
              code: ins.from?.code,
            });
          }
          break;
        case "propertyBinding":
          out.expressions.push({
            kind: "propCommand",
            command: modeToCommand(ins.mode),
            code: ins.from?.kind === "interp" ? undefined : ins.from?.code,
          });
          break;
        case "stylePropertyBinding":
          pushFromBindingSource(
            out.expressions,
            "propCommand",
            undefined,
            ins.from
          );
          out.expressions[out.expressions.length - 1]!.command = "bind";
          break;
        case "listenerBinding":
          out.expressions.push({
            kind: "event",
            on: ins.to,
            command: ins.capture ? "capture" : "trigger",
            code: ins.from?.code,
          });
          break;
        case "refBinding":
          out.expressions.push({
            kind: "ref",
            on: ins.to,
            code: ins.from?.code,
          });
          break;
        case "hydrateLetElement":
          for (const b of ins.instructions ?? []) {
            if (b.type !== "letBinding") continue;
            out.lets.push({
              name: b.to!,
              toBindingContext: ins.toBindingContext === true,
              hasValue: !!b.from,
            });
            if (!b.from) continue;
            if (b.from.kind === "interp") {
              pushFromBindingSource(out.expressions, "letValue", b.to, b.from);
            } else {
              out.expressions.push({
                kind: "letValue",
                on: b.to,
                code: b.from.code,
                command: "bind",
              });
            }
          }
          break;
        case "hydrateTemplateController": {
          const ctrl: ControllerIntent = { name: ins.res! };
          out.controllers.push(ctrl);
          for (const p of ins.props ?? []) {
            if (p.type === "iteratorBinding") {
              out.expressions.push({ kind: "iterator", code: p.forOf?.code });
              // Handle repeat tail props (key.bind, etc.)
              for (const tailProp of p.props ?? []) {
                if (tailProp.type === "multiAttr" && tailProp.command) {
                  out.expressions.push({
                    kind: "propCommand",
                    code: tailProp.from?.code,
                    command: tailProp.command,
                  });
                }
              }
            } else if (p.type === "propertyBinding") {
              const isControllerValue =
                p.to === "value" ||
                (ins.res === "portal" && p.to === "target");
              out.expressions.push({
                kind: isControllerValue ? "controllerValue" : "propCommand",
                code: p.from && p.from.kind !== "interp" ? p.from.code : undefined,
                command: "bind",
              });
            }
          }
          if (ins.def) reduceTemplate(ins.def, out);
          break;
        }
        case "hydrateElement": {
          out.elements.push({
            res: ins.res!,
            containerless: !!ins.containerless,
            props: (ins.props ?? []).map((p) => p.to ?? p.attr ?? ""),
          });
          for (const p of ins.props ?? []) {
            if (p.type === "propertyBinding") {
              out.expressions.push({
                kind: "propCommand",
                code: p.from?.code,
                command: modeToCommand(p.mode),
              });
            } else if (p.type === "attributeBinding") {
              pushFromBindingSource(
                out.expressions,
                "attrInterpolation",
                p.attr,
                p.from
              );
            }
          }
          break;
        }
        case "hydrateAttribute": {
          out.attributes.push({
            res: ins.res!,
            alias: ins.alias,
            props: (ins.props ?? []).map((p) => p.to ?? p.attr ?? ""),
          });
          for (const p of ins.props ?? []) {
            if (p.type === "propertyBinding") {
              out.expressions.push({
                kind: "propCommand",
                code: p.from?.code,
                command: modeToCommand(p.mode),
              });
            } else if (p.type === "attributeBinding") {
              pushFromBindingSource(
                out.expressions,
                "attrInterpolation",
                p.attr,
                p.from
              );
            }
          }
          break;
        }
        case "translationBinding":
          out.expressions.push({
            kind: "translation",
            on: ins.to,
            command: (ins as { isExpression?: boolean }).isExpression ? "t.bind" : "t",
            code: ins.from?.code,
          });
          break;
        default:
          break;
      }
    }
  }
}

interface IrDiag {
  code: string;
  message: string;
}

interface IrModule {
  templates?: TemplateIr[];
  diags?: IrDiag[];
}

function reduceIrToLowerIntent(irModule: IrModule): LowerIntent {
  const out: LowerIntent = {
    expressions: [],
    controllers: [],
    lets: [],
    elements: [],
    attributes: [],
    diags: [],
  };
  const root = irModule.templates?.[0];
  if (root) reduceTemplate(root, out);
  // Reduce diagnostics
  for (const d of irModule.diags ?? []) {
    out.diags.push({ code: d.code });
  }
  return out;
}

// --- Intent Comparison ---

function compareLowerIntent(actual: LowerIntent, expected: Partial<LowerIntent>): LowerDiff {
  const keyExpr = (e: ExpressionIntent) =>
    `${e.kind ?? ""}|${e.on ?? ""}|${e.command ?? ""}|${e.code ?? ""}|${e.name ?? ""}|${e.toBindingContext ? 1 : 0}|${e.hasValue ? 1 : 0}`;
  const keyElem = (e: ElementIntent) =>
    `${e.res ?? ""}|${e.containerless ? 1 : 0}|${(e.props ?? []).join(",")}`;
  const keyAttr = (e: AttributeIntent) =>
    `${e.res ?? ""}|${e.alias ?? ""}|${(e.props ?? []).join(",")}`;
  const keyDiag = (d: DiagIntent) => d.code;

  const { missing: missingExpressions, extra: extraExpressions } = diffByKey(
    actual.expressions,
    expected.expressions,
    keyExpr
  );
  const { missing: missingControllers, extra: extraControllers } = diffByKey(
    actual.controllers,
    expected.controllers,
    keyExpr as (e: ControllerIntent) => string
  );
  const { missing: missingLets, extra: extraLets } = diffByKey(
    actual.lets,
    expected.lets,
    keyExpr as (e: LetIntent) => string
  );
  const { missing: missingElements, extra: extraElements } = diffByKey(
    actual.elements,
    expected.elements,
    keyElem
  );
  const { missing: missingAttributes, extra: extraAttributes } = diffByKey(
    actual.attributes,
    expected.attributes,
    keyAttr
  );
  const { missing: missingDiags, extra: extraDiags } = diffByKey(
    actual.diags,
    expected.diags,
    keyDiag
  );

  return {
    missingExpressions,
    extraExpressions,
    missingControllers,
    extraControllers,
    missingLets,
    extraLets,
    missingElements,
    extraElements,
    missingAttributes,
    extraAttributes,
    missingDiags,
    extraDiags,
  };
}
