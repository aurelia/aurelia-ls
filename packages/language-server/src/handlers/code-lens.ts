/**
 * CodeLens for Aurelia resource class declarations.
 *
 * Shows bindable count and template usage count on source-backed resource
 * class declarations. The source of truth is semantic-runtime row data; the
 * custom request shape is the VS Code extension's small presentation contract.
 */
import type {
  CodeLens,
  CodeLensParams,
} from "vscode-languageserver/node";
import type {
  SemanticBindingBehaviorApplicationRow,
  SemanticResourceDefinitionRow,
  SemanticRuntimeControllerRow,
  SemanticSourceReference,
  SemanticValueConverterApplicationRow,
} from "@aurelia-ls/semantic-runtime";
import {
  canonicalTypeSystemPath,
  semanticExactSourceReference,
} from "@aurelia-ls/semantic-runtime";
import type { ServerContext } from "../context.js";
import {
  semanticSourceOffsetRangeForDocument,
  semanticSourceReferenceFilePath,
  semanticSourceReferencePath,
} from "../mapping/source-locations.js";
import type { SemanticRuntimeLspRequestGuard } from "../runtime/semantic-runtime-session.js";
import { isScriptDocument } from "../utils/document-kind.js";

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
  const uri = params.textDocument.uri;
  const doc = ctx.openDocument(uri);
  if (doc == null || !isScriptDocument(doc)) return null;

  const requestedPath = ctx.documentUris.hostPath(uri);
  if (requestedPath == null) return null;
  const requested = normalizedFilePath(requestedPath);
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
  const lenses: CodeLens[] = [];

  for (const definition of definitionsAnswer.value.rows) {
    if (!isCodeLensResourceDefinition(definition)) {
      continue;
    }
    const targetSource = semanticExactSourceReference(definition.targetSource ?? definition.source);
    const resourceFile = semanticSourceReferenceFilePath(targetSource, ctx.documentUris);
    if (resourceFile == null || normalizedFilePath(resourceFile) !== requested) {
      continue;
    }
    const targetRange = semanticSourceOffsetRangeForDocument(targetSource, doc);
    if (targetRange == null || targetRange.start >= targetRange.end) continue;

    const targetPosition = doc.positionAt(targetRange.start);
    const lensPosition = { line: targetPosition.line, character: 0 };
    const usageCount = templateUsageCount(definition, controllers, bindingBehaviors, valueConverters);
    const title = codeLensTitle(definition, usageCount);
    lenses.push({
      range: {
        start: lensPosition,
        end: lensPosition,
      },
      command: usageCount > 0
        ? {
            title,
            command: "editor.action.findReferences",
            arguments: [uri, targetPosition],
          }
        : { title, command: "" },
    });
  }

  return lenses.length > 0
    ? lenses.sort((left, right) => left.range.start.line - right.range.start.line)
    : null;
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
    const key = semanticSourceReferencePath(source) ?? source?.label ?? null;
    if (key != null) {
      keys.add(key);
    }
  }
  return keys.size;
}

function normalizedFilePath(filePath: string): string {
  return canonicalTypeSystemPath(filePath);
}
