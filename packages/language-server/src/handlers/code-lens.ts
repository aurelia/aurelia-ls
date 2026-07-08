/**
 * CodeLens for Aurelia resource class declarations.
 *
 * Shows bindable count and template usage count on source-backed resource
 * class declarations. The source of truth is semantic-runtime row data; the
 * custom request shape is the VS Code extension's small presentation contract.
 */
import path from "node:path";
import type {
  CodeLens,
  CodeLensParams,
} from "vscode-languageserver/node.js";
import { URI } from "vscode-uri";
import type {
  SemanticBindingBehaviorApplicationRow,
  SemanticResourceDefinitionRow,
  SemanticRuntimeControllerRow,
  SemanticSourceReference,
  SemanticValueConverterApplicationRow,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  logIfSemanticRuntimeRequestAborted,
} from "./request-guard.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";

const CODE_LENS_RESOURCE_KINDS = new Set<string>([
  "custom-element",
  "template-controller",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
]);

const CODE_LENS_KIND_LABELS = new Map<string, string>([
  ["custom-element", "element"],
  ["template-controller", "controller"],
  ["custom-attribute", "attribute"],
  ["value-converter", "converter"],
  ["binding-behavior", "behavior"],
]);

export async function handleCodeLens(
  ctx: ServerContext,
  params: CodeLensParams,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<CodeLens[] | null> {
  try {
    const uri = params.textDocument.uri;
    if (!uri.endsWith(".ts")) return null;

    const doc = ctx.documents.get(uri);
    if (!doc) return null;

    const requested = normalizedFilePath(URI.parse(uri).fsPath);
    const [
      definitionsAnswer,
      controllerAnswer,
      behaviorAnswer,
      converterAnswer,
    ] = await Promise.all([
      ctx.semanticRuntime.resourceDefinitions(guard),
      ctx.semanticRuntime.runtimeControllers(guard),
      ctx.semanticRuntime.bindingBehaviorApplications(guard),
      ctx.semanticRuntime.valueConverterApplications(guard),
    ]);

    const controllers = controllerAnswer.value.rows;
    const bindingBehaviors = behaviorAnswer.value.rows;
    const valueConverters = converterAnswer.value.rows;
    const text = doc.getText();
    const lenses: CodeLens[] = [];

    for (const definition of definitionsAnswer.value.rows) {
      if (!isCodeLensResourceDefinition(definition)) {
        continue;
      }
      const resourceFile = filePathForSource(ctx.workspaceRoot, definition.targetSource ?? definition.source);
      if (resourceFile == null || normalizedFilePath(resourceFile) !== requested) {
        continue;
      }
      const className = definition.targetName ?? definition.name;
      if (className == null) {
        continue;
      }
      const classPattern = new RegExp(`\\bclass\\s+${escapeRegExp(className)}\\b`);
      const match = classPattern.exec(text);
      if (!match) {
        continue;
      }

      const pos = doc.positionAt(match.index);
      const usageCount = templateUsageCount(definition, controllers, bindingBehaviors, valueConverters);
      const title = codeLensTitle(definition, usageCount);
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

    return lenses.length > 0
      ? lenses.sort((left, right) => left.range.start.line - right.range.start.line)
      : null;
  } catch (e) {
    if (logIfSemanticRuntimeRequestAborted(ctx, "codeLens", e, params.textDocument.uri)) {
      return null;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`[codeLens] failed for ${params.textDocument.uri}: ${message}`);
    return null;
  }
}

function isCodeLensResourceDefinition(
  definition: SemanticResourceDefinitionRow,
): definition is SemanticResourceDefinitionRow & { readonly name: string } {
  return definition.name != null && CODE_LENS_RESOURCE_KINDS.has(definition.resourceKind);
}

function codeLensTitle(
  definition: SemanticResourceDefinitionRow & { readonly name: string },
  usageCount: number,
): string {
  const kindLabel = CODE_LENS_KIND_LABELS.get(definition.resourceKind) ?? definition.resourceKind;
  const parts: string[] = [];
  const bindableCount = definition.bindables.length;
  if (bindableCount > 0) {
    parts.push(`${bindableCount} bindable${bindableCount === 1 ? "" : "s"}`);
  }
  if (usageCount > 0) {
    parts.push(`used in ${usageCount} template${usageCount === 1 ? "" : "s"}`);
  } else {
    parts.push("no template usages");
  }
  return `$(symbol-class) ${kindLabel}: ${parts.join(" · ")}`;
}

function templateUsageCount(
  definition: SemanticResourceDefinitionRow & { readonly name: string },
  controllers: readonly SemanticRuntimeControllerRow[],
  bindingBehaviors: readonly SemanticBindingBehaviorApplicationRow[],
  valueConverters: readonly SemanticValueConverterApplicationRow[],
): number {
  switch (definition.resourceKind) {
    case "custom-element":
    case "custom-attribute":
    case "template-controller":
      return countDistinctSourcePaths(
        controllers
          .filter((row) =>
            row.definitionName === definition.name
            && (row.definitionKind === definition.resourceKind || row.controllerName === definition.name)
          )
          .map((row) => row.source),
      );
    case "binding-behavior":
      return countDistinctSourcePaths(
        bindingBehaviors
          .filter((row) => row.behaviorName === definition.name)
          .map((row) => row.source),
      );
    case "value-converter":
      return countDistinctSourcePaths(
        valueConverters
          .filter((row) => row.converterName === definition.name)
          .map((row) => row.source),
      );
    default:
      return 0;
  }
}

function countDistinctSourcePaths(sources: readonly (SemanticSourceReference | null)[]): number {
  const keys = new Set<string>();
  for (const source of sources) {
    const key = sourceReferencePath(source) ?? source?.label ?? null;
    if (key != null) {
      keys.add(key);
    }
  }
  return keys.size;
}

function filePathForSource(
  workspaceRoot: string | null,
  source: SemanticSourceReference | null,
): string | undefined {
  const sourcePath = sourceReferencePath(source);
  if (sourcePath == null) {
    return undefined;
  }
  if (sourcePath.startsWith("file://")) {
    return URI.parse(sourcePath).fsPath;
  }
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  return workspaceRoot == null ? sourcePath : path.resolve(workspaceRoot, sourcePath);
}

function sourceReferencePath(source: SemanticSourceReference | null): string | null {
  if (source == null) {
    return null;
  }
  return source.path ?? sourceReferencePath(source.anchor ?? null);
}

function normalizedFilePath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
