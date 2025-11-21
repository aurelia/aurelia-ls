import type { OverlayPlanModule } from "../50-plan/types.js";
import type { ExprId } from "../../model/ir.js";

/**
 * Emit a compact overlay:
 * TS  :  type Alias = <type expr>; __au$access<Alias>(o=>...);
 * JS  :  __au$access((/** @type {<type expr>} *\/ (o)) => ...);
 */
export interface OverlayEmitMappingEntry {
  exprId: ExprId;
  start: number;
  end: number;
}

export interface OverlayEmitResult {
  text: string;
  mapping: OverlayEmitMappingEntry[];
}

export function emitOverlay(plan: OverlayPlanModule, { isJs }: { isJs: boolean }): OverlayEmitResult {
  const out: string[] = [];
  const mapping: OverlayEmitMappingEntry[] = [];
  let offset = 0; // track length of out.join("\n") as we build

  for (const t of plan.templates) {
    for (const f of t.frames) {
      if (!isJs) {
        out.push(`type ${f.typeName} = ${f.typeExpr};`);
        offset += out[out.length - 1]!.length + 1;
        const typeRef = f.frame === 0 ? f.typeExpr : f.typeName;
        for (const l of f.lambdas) {
          const line = `__au$access<${typeRef}>(${l.lambda});`;
          const lambdaStart = line.indexOf("(") + 1; // point at lambda start
          const start = offset + lambdaStart;
          const end = start + l.lambda.length;
          mapping.push({ exprId: l.exprId, start, end });
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
          const lambdaWithDoc = withJSDocParam(l.lambda);
          const line = `__au$access(${lambdaWithDoc});`;
          const lambdaStart = line.indexOf("(") + 1;
          const start = offset + lambdaStart;
          const end = start + lambdaWithDoc.length;
          mapping.push({ exprId: l.exprId, start, end });
          out.push(line);
          offset += line.length + 1;
        }
      }
    }
  }

  const text = `${out.join("\n")}\n`;
  return { text, mapping };
}

/* -----------------------------------------------------------------------------
 * Optional file-oriented wrapper (helps callers keep filenames & EOLs consistent)
 * --------------------------------------------------------------------------- */

/**
 * Options for file emission.
 * - eol: line ending to use in the output (default: '\n')
 * - banner: optional banner comment at the top of the file
 * - filename: suggested filename (auto-chosen when omitted)
 */
export interface EmitOptions {
  eol?: "\n" | "\r\n";
  banner?: string;
  filename?: string;
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
  const { text, mapping } = emitOverlay(plan, { isJs: opts.isJs });
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
    : adjustedMapping.map((m) => ({ exprId: m.exprId, start: m.start + bannerShift, end: m.end + bannerShift }));
  return { filename, text: `${banner}${body}${moduleFooter}`, mapping: shiftedMapping };
}

function adjustMappingForEol(mapping: OverlayEmitMappingEntry[], text: string, eol: "\n" | "\r\n"): OverlayEmitMappingEntry[] {
  if (eol === "\n") return mapping;
  // Each '\n' expands to two chars in the emitted text; precompute prefix counts.
  const prefixNewlines: number[] = new Array(text.length + 1);
  let count = 0;
  prefixNewlines[0] = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* '\n' */) count++;
    prefixNewlines[i + 1] = count;
  }
  return mapping.map((m) => {
    const extraStart = prefixNewlines[m.start]!;
    const extraEnd = prefixNewlines[m.end]!;
    return { exprId: m.exprId, start: m.start + extraStart, end: m.end + extraEnd };
  });
}
