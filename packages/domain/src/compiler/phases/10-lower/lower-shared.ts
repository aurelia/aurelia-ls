import type { DefaultTreeAdapterMap, Token } from "parse5";

import type {
  AnyBindingExpression,
  BindingMode,
  ExprId,
  ExprRef,
  ExprTableEntry,
  InterpIR,
  SourceSpan,
  BadExpression,
} from "../../model/ir.js";
import type { ExpressionParseContext, ExpressionType, IExpressionParser } from "../../../parsers/expression-api.js";
import { extractInterpolationSegments } from "../../../parsers/lsp-expression-parser.js";
import { DomIdAllocator, deterministicStringId } from "../../model/identity.js";
import type { SourceFile } from "../../model/source.js";
import { spanFromOffsets } from "../../model/source.js";
import { spanFromBounds } from "../../model/span.js";
import { provenanceFromSpan } from "../../model/origin.js";
export { DomIdAllocator } from "../../model/identity.js";

export type P5Node = DefaultTreeAdapterMap["childNode"];
export type P5Element = DefaultTreeAdapterMap["element"];
export type P5Text = DefaultTreeAdapterMap["textNode"];
export type P5Template = DefaultTreeAdapterMap["template"];
export type P5Loc =
  | Token.ElementLocation
  | DefaultTreeAdapterMap["textNode"]["sourceCodeLocation"]
  | null
  | undefined;

export function isElement(n: P5Node): n is P5Element {
  return (n as P5Element).tagName != null;
}

export function isText(n: P5Node): n is P5Text {
  return n.nodeName === "#text";
}

export function isComment(n: P5Node): n is DefaultTreeAdapterMap["commentNode"] {
  return n.nodeName === "#comment";
}

export class ExprTable {
  public entries: ExprTableEntry[] = [];
  private readonly seen = new Map<string, ExprId>();

  public constructor(
    private readonly parser: IExpressionParser,
    public readonly source: SourceFile,
  ) {}

  public add(code: string, loc: P5Loc | null, expressionType: ExpressionType): ExprRef {
    const start = loc?.startOffset ?? 0;
    const end = loc?.endOffset ?? 0;
    const key = `${this.source.hashKey}|${start}|${end}|${expressionType}|${code}`;
    const baseSpan = spanFromOffsets(loc, this.source);
    const context: ExpressionParseContext | undefined = baseSpan ? { baseSpan } : undefined;

    let id = this.seen.get(key);
    if (!id) {
      id = deterministicStringId<"ExprId">("expr", key);

      let ast: AnyBindingExpression;

      try {
        ast = this.parser.parse(code, expressionType, context);
      } catch (e: unknown) {
        const span: SourceSpan = baseSpan ?? spanFromBounds(0, code.length);
        const bad: BadExpression = {
          $kind: "BadExpression",
          span,
          text: code,
          message: e instanceof Error ? e.message : String(e),
          origin: baseSpan ? provenanceFromSpan("parse", span) : null,
        };
        ast = bad;
      }

      this.entries.push({ id, expressionType, ast } as ExprTableEntry);
      this.seen.set(key, id);
    }

    return { id, code, loc: toSpan(loc, this.source) };
  }
}

export function toMode(cmd: string | null, rawName?: string): BindingMode {
  if (cmd === "one-time") return "oneTime";
  if (cmd === "to-view") return "toView";
  if (cmd === "from-view") return "fromView";
  if (cmd === "two-way") return "twoWay";
  // AttrParser maps ':' shorthand to command 'bind'; preserve authored intent.
  if (rawName?.startsWith(":")) return "toView";
  return "default";
}

export function camelCase(n: string): string {
  return n.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

export function attrLoc(el: P5Element, attrName: string): P5Loc | null {
  const loc = el.sourceCodeLocation;
  const attrLocTable = loc?.attrs;
  return (attrLocTable?.[attrName] ?? loc) ?? null;
}

export function toBindingSource(
  val: string,
  loc: P5Loc,
  table: ExprTable,
  exprKind: Exclude<ExpressionType, "Interpolation" | "IsIterator">
): ExprRef {
  return toExprRef(val, loc, table, exprKind);
}

export function toInterpIR(
  text: string,
  loc: P5Loc | null,
  table: ExprTable
): InterpIR {
  const split = extractInterpolationSegments(text);
  const parts = split ? split.parts : [text];
  const exprs: ExprRef[] = [];

  if (split) {
    const locStart = loc?.startOffset ?? 0;
    for (const { span, code } of split.expressions) {
      const exprLoc: P5Loc | null = loc
        ? { ...loc, startOffset: locStart + span.start, endOffset: locStart + span.end }
        : null;
      exprs.push(table.add(code, exprLoc, "IsProperty"));
    }
  }

  return { kind: "interp", parts, exprs, loc: toSpan(loc, table.source) };
}

export function toExprRef(
  code: string,
  loc: P5Loc | null,
  table: ExprTable,
  parseKind: ExpressionType
): ExprRef {
  return table.add(code, loc, parseKind);
}

export function parseRepeatTailProps(
  raw: string,
  loc: P5Loc,
  table: ExprTable
): { to: string; from: ExprRef; value: string }[] | null {
  const semi = raw.indexOf(";");
  if (semi < 0) return null;
  const tail = raw.slice(semi + 1).trim();
  if (!tail) return null;
  const m = /^([^:]+):\s*(.+)$/.exec(tail);
  if (!m) return null;
  const to = m[1]!.trim();
  const val = m[2]!.trim();
  const from = toExprRef(val, loc, table, "IsProperty");
  return [{ to, from, value: val }];
}

export function toSpan(loc: P5Loc | null, source: SourceFile): SourceSpan | null {
  return spanFromOffsets(loc, source);
}

export function findAttr(el: P5Element, name: string): Token.Attribute | undefined {
  return (el.attrs ?? []).find((a) => a.name === name);
}
