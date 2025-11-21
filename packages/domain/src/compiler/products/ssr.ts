import path from "node:path";
import type { PipelineSession } from "../pipeline/engine.js";
import type { SsrPlanModule } from "../phases/50-plan/ssr-types.js";

export interface SsrProductOptions {
  templateFilePath: string;
  baseName: string;
}

export interface SsrProductResult {
  htmlPath: string;
  htmlText: string;
  manifestPath: string;
  manifestText: string;
  plan: SsrPlanModule;
}

export function buildSsrProduct(session: PipelineSession, opts: SsrProductOptions): SsrProductResult {
  const plan = session.run("50-plan-ssr");
  const ssrEmit = session.run("60-emit-ssr");

  const dir = path.dirname(opts.templateFilePath);
  const htmlPath = path.join(dir, `${opts.baseName}.html`);
  const manifestPath = path.join(dir, `${opts.baseName}.json`);

  return {
    plan,
    htmlPath,
    htmlText: ssrEmit.html,
    manifestPath,
    manifestText: ssrEmit.manifest,
  };
}
