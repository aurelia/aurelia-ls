/**
 * CodeLens for Aurelia resource class declarations.
 *
 * Shows bindable count and template usage count on custom element,
 * custom attribute, and value converter class declarations in .ts files.
 * Click navigates to template usages via the references provider.
 */
import type {
  CodeLens,
  CodeLensParams,
} from "vscode-languageserver/node.js";
import { canonicalDocumentUri } from "@aurelia-ls/compiler/program/paths.js";
import type { ServerContext } from "../context.js";

export function handleCodeLens(
  ctx: ServerContext,
  params: CodeLensParams,
): CodeLens[] | null {
  try {
    const uri = params.textDocument.uri;

    // Only provide CodeLens for .ts files
    if (!uri.endsWith(".ts")) return null;

    const canonical = canonicalDocumentUri(uri);
    const snapshot = ctx.workspace.snapshot();
    const catalog = snapshot.catalog;
    const referentialIndex = ctx.workspace.referentialIndex;

    const lenses: CodeLens[] = [];

    // Find resources whose source file matches this document
    const categories = [
      { entries: catalog.resources.elements, kind: "custom-element", kindLabel: "element" },
      { entries: catalog.resources.attributes, kind: "custom-attribute", kindLabel: "attribute" },
      { entries: catalog.resources.valueConverters, kind: "value-converter", kindLabel: "converter" },
      { entries: catalog.resources.bindingBehaviors, kind: "binding-behavior", kindLabel: "behavior" },
    ] as const;

    for (const { entries, kind, kindLabel } of categories) {
      for (const [name, res] of Object.entries(entries)) {
        if (!res.file) continue;
        const resUri = canonicalDocumentUri(res.file).uri;
        if (resUri !== canonical.uri) continue;

        // Find the class declaration line in the document
        const doc = ctx.documents.get(uri);
        if (!doc) continue;

        const className = res.className ?? name;
        const text = doc.getText();
        const classPattern = new RegExp(`\\bclass\\s+${escapeRegExp(className)}\\b`);
        const match = classPattern.exec(text);
        if (!match) continue;

        const pos = doc.positionAt(match.index);

        // Get bindable count
        const bindables = (res as { bindables?: Record<string, unknown> }).bindables;
        const bindableCount = bindables ? Object.keys(bindables).length : 0;

        // Get usage count from referential index
        const resourceKey = `${kind}:${name}`;
        const refs = referentialIndex.getReferencesForResource(resourceKey);
        const templateRefs = refs.filter((r): r is import("@aurelia-ls/compiler").TextReferenceSite => r.kind === "text" && r.domain === "template");
        const uniqueTemplates = new Set(templateRefs.map((r) => r.file));
        const usageCount = uniqueTemplates.size;

        // Build title
        const parts: string[] = [];
        if (bindableCount > 0) parts.push(`${bindableCount} bindable${bindableCount === 1 ? "" : "s"}`);
        if (usageCount > 0) {
          parts.push(`used in ${usageCount} template${usageCount === 1 ? "" : "s"}`);
        } else {
          parts.push("no template usages");
        }
        const title = `$(symbol-class) ${kindLabel}: ${parts.join(" · ")}`;

        lenses.push({
          range: {
            start: { line: pos.line, character: 0 },
            end: { line: pos.line, character: 0 },
          },
          command: usageCount > 0
            ? {
                title,
                command: "editor.action.findReferences",
                arguments: [uri, pos],
              }
            : { title, command: "" },
        });
      }
    }

    return lenses.length > 0 ? lenses : null;
  } catch (e) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[codeLens] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
