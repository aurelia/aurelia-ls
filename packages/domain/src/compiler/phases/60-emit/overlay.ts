import type { OverlayPlanModule } from "../50-plan/types.js";

/**
 * Emit a compact overlay:
 * TS  :  type Alias = <type expr>; __au$access<Alias>(o=>...);
 * JS  :  __au$access((/** @type {<type expr>} *\/ (o)) => ...);
 */
export function emitOverlay(plan: OverlayPlanModule, { isJs }: { isJs: boolean }): string {
  const out: string[] = [];

  for (const t of plan.templates) {
    for (const f of t.frames) {
      if (!isJs) {
        out.push(`type ${f.typeName} = ${f.typeExpr};`);
        const typeRef = f.frame === 0 ? f.typeExpr : f.typeName;
        for (const l of f.lambdas) {
          out.push(`__au$access<${typeRef}>(${l});`);
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
          out.push(`__au$access(${withJSDocParam(l)});`);
        }
      }
    }
  }

  return `${out.join("\n")}\n`;
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
  const body = emitOverlay(plan, { isJs: opts.isJs }).replace(/\n/g, eol);
  const banner = opts.banner ? `${opts.banner}${eol}` : "";
  const ext = opts.isJs ? ".js" : ".ts";
  const filename = (opts.filename ?? "__au.ttc.overlay") + ext;
  // TS variant: make the file a module to isolate top-level type aliases across overlays.
  const moduleFooter = opts.isJs ? "" : `${eol}export {}${eol}`;
  return { filename, text: `${banner}${body}${moduleFooter}` };
}
