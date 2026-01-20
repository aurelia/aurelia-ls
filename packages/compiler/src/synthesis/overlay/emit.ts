import type { OverlayLambdaSegment, OverlayPlanModule } from "./types.js";
import type { ExprId } from "../../model/ir.js";
import { offsetSpan, spanFromBounds, type TextSpan } from "../../model/span.js";
import type { CompileTrace } from "../../shared/index.js";
import { NOOP_TRACE } from "../../shared/index.js";
import { debug } from "../../shared/debug.js";

/**
 * Emit a compact overlay:
 * TS  :  type Alias = <type expr>; __au$access<Alias>(o=>...);
 * JS  :  __au$access((/** @type {<type expr>} *\/ (o)) => ...);
 */
export interface OverlayEmitMappingEntry {
  exprId: ExprId;
  span: TextSpan;
  segments?: readonly OverlayEmitSegment[] | undefined;
}

export interface OverlayEmitSegment {
  kind: "member";
  path: string;
  span: TextSpan;
}

export interface OverlayEmitResult {
  text: string;
  mapping: OverlayEmitMappingEntry[];
}

export function emitOverlay(
  plan: OverlayPlanModule,
  { isJs, trace }: { isJs: boolean; trace?: CompileTrace },
): OverlayEmitResult {
  const t = trace ?? NOOP_TRACE;

  return t.span("overlay.emit", () => {
    t.setAttributes({
      "overlay.emit.isJs": isJs,
      "overlay.emit.templateCount": plan.templates.length,
    });

    debug.overlay("emit.start", {
      isJs,
      templateCount: plan.templates.length,
    });

    const out: string[] = [];
    const mapping: OverlayEmitMappingEntry[] = [];
    let offset = 0; // track length of out.join("\n") as we build

    // Helpers to make value converters / binding behaviors TS-safe.
    const helpers = isJs
      ? [
          "/** @template T @param {T} value @returns {T} */ const __au_vc = (value, _name, ..._args) => value;",
          "/** @template T @param {T} value @returns {T} */ const __au_bb = (value, _name, ..._args) => value;",
        ]
      : [
          "function __au_vc<T>(value: T, _name?: string, ..._args: unknown[]): T { return value; }",
          "function __au_bb<T>(value: T, _name?: string, ..._args: unknown[]): T { return value; }",
        ];
    for (const line of helpers) {
      out.push(line);
      offset += line.length + 1;
    }

    let totalFrames = 0;
    let totalLambdas = 0;

    for (const template of plan.templates) {
      debug.overlay("emit.template", {
        name: template.vmType?.alias ?? "anonymous",
        frameCount: template.frames.length,
      });
      if (template.vmType?.alias && template.vmType?.typeExpr) {
        if (!isJs) {
          const aliasLine = `type ${template.vmType.alias} = ${template.vmType.typeExpr};`;
          out.push(aliasLine);
          offset += aliasLine.length + 1;
        } else {
          const aliasLine = `/** @typedef {${template.vmType.typeExpr}} ${template.vmType.alias} */`;
          out.push(aliasLine);
          offset += aliasLine.length + 1;
        }
      }
      for (const f of template.frames) {
        totalFrames++;
        debug.overlay("emit.frame", {
          frameId: f.frame,
          typeName: f.typeName,
          lambdaCount: f.lambdas.length,
        });
        if (!isJs) {
          out.push(`type ${f.typeName} = ${f.typeExpr};`);
          offset += out[out.length - 1]!.length + 1;
          const typeRef = f.frame === 0 ? f.typeExpr : f.typeName;
          for (const l of f.lambdas) {
            totalLambdas++;
            const line = `__au$access<${typeRef}>(${l.lambda});`;
            let lambdaStart = line.indexOf(l.lambda);
            if (lambdaStart < 0) lambdaStart = line.indexOf("(") + 1; // fallback to first paren
            const start = offset + lambdaStart;
            const span = spanFromBounds(start, start + l.lambda.length);
            mapping.push({ exprId: l.exprId, span, segments: mapSegments(l.segments, start) });
            out.push(line);
            offset += line.length + 1;
          }
        } else {
          // JS flavor: JSDoc on the arrow function parameter (supported by TS checkJs).
          const withJSDocParam = (lambda: string) => {
            const idx = lambda.indexOf("=>");
            const head = lambda.slice(0, idx).trim();  // "o"
            const tail = lambda.slice(idx).trim();     // "=> <expr>"
            return `/** @param {${f.typeExpr}} ${head} */ (${head}) ${tail}`;
          };
          for (const l of f.lambdas) {
            totalLambdas++;
            const lambdaWithDoc = withJSDocParam(l.lambda);
            const line = `__au$access(${lambdaWithDoc});`;
            let lambdaStart = line.indexOf(lambdaWithDoc);
            if (lambdaStart < 0) lambdaStart = line.indexOf("(") + 1;
            const start = offset + lambdaStart;
            const shift = computeSegmentShift(l.lambda, lambdaWithDoc, l.exprSpan);
            const span = spanFromBounds(start, start + lambdaWithDoc.length);
            mapping.push({ exprId: l.exprId, span, segments: mapSegments(l.segments, start, shift) });
            out.push(line);
            offset += line.length + 1;
          }
        }
      }
    }

    t.setAttributes({
      "overlay.emit.frameCount": totalFrames,
      "overlay.emit.lambdaCount": totalLambdas,
      "overlay.emit.mappingCount": mapping.length,
    });

    const text = `${out.join("\n")}\n`;
    return { text, mapping };
  });
}

function mapSegments(segments: readonly OverlayLambdaSegment[] | undefined, lambdaStart: number, spanShift = 0): OverlayEmitSegment[] | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.map((s) => ({
    kind: "member",
    path: s.path,
    span: offsetSpan(s.span, lambdaStart + spanShift),
  }));
}

function computeSegmentShift(original: string, withDoc: string, exprSpan: TextSpan): number {
  const originalExprStart = exprSpan.start;
  const newExprStart = arrowBodyStart(withDoc);
  return newExprStart - originalExprStart;
}

function arrowBodyStart(lambda: string): number {
  const arrow = lambda.indexOf("=>");
  if (arrow < 0) return 0;
  let idx = arrow + 2;
  while (idx < lambda.length) {
    const ch = lambda.charCodeAt(idx);
    if (ch === 32 /* space */ || ch === 9 /* tab */ || ch === 10 /* \n */ || ch === 13 /* \r */) {
      idx += 1;
      continue;
    }
    break;
  }
  return idx;
}

/* -----------------------------------------------------------------------------
 * Optional file-oriented wrapper (helps callers keep filenames & EOLs consistent)
 * --------------------------------------------------------------------------- */

/**
 * Options for file emission.
 * - eol: line ending to use in the output (default: '\n')
 * - banner: optional banner comment at the top of the file
 * - filename: suggested filename (auto-chosen when omitted)
 * - trace: optional trace for instrumentation
 */
export interface EmitOptions {
  eol?: "\n" | "\r\n";
  banner?: string;
  filename?: string;
  trace?: CompileTrace;
}

export interface EmitResult {
  /** Suggested filename for the overlay artifact (purely informational). */
  filename: string;
  /** Full overlay text. */
  text: string;
  /** Overlay mapping (exprId -> overlay range) for TTC features. */
  mapping: OverlayEmitMappingEntry[];
}

/**
 * Emit an overlay file (text + suggested filename).
 * The extension defaults to `.ts` for TS mode, `.js` for JS mode.
 */
export function emitOverlayFile(
  plan: OverlayPlanModule,
  opts: EmitOptions & { isJs: boolean }
): EmitResult {
  const eol = opts.eol ?? "\n";
  const { text, mapping } = emitOverlay(plan, { isJs: opts.isJs, trace: opts.trace });
  const adjustedMapping = eol === "\n" ? mapping : adjustMappingForEol(mapping, text, eol);
  const body = text.replace(/\n/g, eol);
  const banner = opts.banner ? `${opts.banner}${eol}` : "";
  const ext = opts.isJs ? ".js" : ".ts";
  const filename = (opts.filename ?? "__au.ttc.overlay") + ext;
  // TS variant: make the file a module to isolate top-level type aliases across overlays.
  const moduleFooter = opts.isJs ? "" : `${eol}export {}${eol}`;
  const bannerShift = banner.length;
  const shiftedMapping = bannerShift === 0
    ? adjustedMapping
    : adjustedMapping.map((m) => ({
      exprId: m.exprId,
      span: offsetSpan(m.span, bannerShift),
      segments: m.segments?.map((seg) => ({ ...seg, span: offsetSpan(seg.span, bannerShift) })),
    }));
  return { filename, text: `${banner}${body}${moduleFooter}`, mapping: shiftedMapping };
}

function adjustMappingForEol(mapping: OverlayEmitMappingEntry[], text: string, eol: "\n" | "\r\n"): OverlayEmitMappingEntry[] {
  if (eol === "\n") return mapping;
  // Each '\n' expands to two chars in the emitted text; precompute prefix counts.
  const prefixNewlines = new Array<number>(text.length + 1);
  let count = 0;
  prefixNewlines[0] = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* '\n' */) count++;
    prefixNewlines[i + 1] = count;
  }
  const adjust = (span: TextSpan): TextSpan => {
    const extraStart = prefixNewlines[span.start]!;
    const extraEnd = prefixNewlines[span.end]!;
    return spanFromBounds(span.start + extraStart, span.end + extraEnd);
  };
  return mapping.map((m) => ({
    exprId: m.exprId,
    span: adjust(m.span),
    segments: m.segments?.map((seg) => ({ ...seg, span: adjust(seg.span) })),
  }));
}
