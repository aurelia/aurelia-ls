import path from "node:path";
import { lowerDocument } from "./phases/10-lower/lower.js";
import { resolveHost } from "./phases/20-resolve-host/resolve.js";
import { bindScopes } from "./phases/30-bind/bind.js";
import { typecheck } from "./phases/40-typecheck/typecheck.js";
import { DEFAULT as SEM_DEFAULT } from "./language/registry.js";
import { DEFAULT_SYNTAX, type AttributeParser } from "./language/syntax.js";
import { getExpressionParser } from "../parsers/expression-parser.js";
import type { IExpressionParser } from "../parsers/expression-api.js";
import type { BuildIrOptions } from "./phases/10-lower/lower.js";

export interface CoreCompileOptions {
  html: string;
  templateFilePath: string;
  attrParser?: AttributeParser;
  exprParser?: IExpressionParser;
}

export interface CorePipelineResult {
  ir: ReturnType<typeof lowerDocument>;
  linked: ReturnType<typeof resolveHost>;
  scope: ReturnType<typeof bindScopes>;
  typecheck: ReturnType<typeof typecheck>;
}

/** Run the pure pipeline up to typecheck (10 → 40). */
export function runCorePipeline(opts: CoreCompileOptions): CorePipelineResult {
  const exprParser = opts.exprParser ? opts.exprParser : getExpressionParser();
  const attrParser = opts.attrParser ? opts.attrParser : DEFAULT_SYNTAX;

  const ir = lowerDocument(opts.html, {
    file: opts.templateFilePath,
    name: path.basename(opts.templateFilePath),
    attrParser,
    exprParser,
  } as BuildIrOptions);

  const linked = resolveHost(ir, SEM_DEFAULT);
  const scope = bindScopes(linked);
  const typecheckOut = typecheck(linked);

  return { ir, linked, scope, typecheck: typecheckOut };
}
