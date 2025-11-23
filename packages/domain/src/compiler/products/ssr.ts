import path from "node:path";
import type { PipelineSession } from "../pipeline/engine.js";
import { normalizePathForId, toSourceFileId, type SourceFileId } from "../model/identity.js";
import type { SsrPlanModule } from "../phases/50-plan/ssr/types.js";
import type { SsrNodeMapping } from "../phases/60-emit/ssr/emit.js";
import { resolveSourceSpan } from "../model/source.js";
import type { SsrMappingArtifact, SsrMappingEntry } from "../../contracts.js";

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
  mapping: SsrMappingArtifact;
}

export function buildSsrProduct(session: PipelineSession, opts: SsrProductOptions): SsrProductResult {
  const plan = session.run("50-plan-ssr");
  const ssrEmit = session.run("60-emit-ssr");

  const dir = path.dirname(opts.templateFilePath);
  const htmlPath = normalizePathForId(path.join(dir, `${opts.baseName}.html`));
  const manifestPath = normalizePathForId(path.join(dir, `${opts.baseName}.json`));
  const templateFile = toSourceFileId(normalizePathForId(opts.templateFilePath));
  const htmlFile = toSourceFileId(htmlPath);
  const manifestFile = toSourceFileId(manifestPath);

  return {
    plan,
    htmlPath,
    htmlText: ssrEmit.html,
    manifestPath,
    manifestText: ssrEmit.manifest,
    mapping: buildSsrMapping(ssrEmit.mappings, {
      template: templateFile,
      html: htmlFile,
      manifest: manifestFile,
    }),
  };
}

function buildSsrMapping(
  entries: readonly SsrNodeMapping[],
  files: { template: SourceFileId; html: SourceFileId; manifest: SourceFileId },
): SsrMappingArtifact {
  const normalized: SsrMappingEntry[] = [];
  for (const entry of entries) {
    const templateSpan = entry.templateSpan ? resolveSourceSpan(entry.templateSpan, files.template) : null;
    const htmlSpan = entry.htmlSpan ? resolveSourceSpan(entry.htmlSpan, files.html) : null;
    const manifestSpan = entry.manifestSpan ? resolveSourceSpan(entry.manifestSpan, files.manifest) : null;
    if (!templateSpan && !htmlSpan && !manifestSpan) continue;
    normalized.push({
      nodeId: entry.nodeId,
      hid: entry.hid,
      templateSpan,
      ...(htmlSpan ? { htmlSpan } : {}),
      ...(manifestSpan ? { manifestSpan } : {}),
    });
  }
  return { kind: "ssr-mapping", entries: normalized };
}
