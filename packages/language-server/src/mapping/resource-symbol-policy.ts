import {
  SemanticRuntimeAnswerCoverage,
  SemanticRuntimeAnswerResult,
  SemanticRuntimeAnswerSelection,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceDefinitionRow,
  type SemanticRuntimeAnswer,
} from "@aurelia-ls/semantic-runtime";
import { SymbolKind } from "vscode-languageserver/node";

/**
 * Native symbols describe authored declarations, so every currently modeled
 * Aurelia resource kind projects as the class that owns the definition.
 * Keeping this as an exhaustive record makes a taxonomy addition a compile
 * error instead of a silently omitted Outline/workspace-symbol family.
 */
const RESOURCE_SYMBOL_KIND = {
  "custom-element": SymbolKind.Class,
  "custom-attribute": SymbolKind.Class,
  "template-controller": SymbolKind.Class,
  "value-converter": SymbolKind.Class,
  "binding-behavior": SymbolKind.Class,
  "binding-command": SymbolKind.Class,
  "attribute-pattern": SymbolKind.Class,
} satisfies Readonly<Record<SemanticResourceDefinitionRow["resourceKind"], SymbolKind>>;

export function resourceSymbolKind(
  definition: SemanticResourceDefinitionRow,
): SymbolKind {
  return RESOURCE_SYMBOL_KIND[definition.resourceKind];
}

export function resourceSymbolName(
  definition: SemanticResourceDefinitionRow,
): string | null {
  return definition.targetName ?? definition.name;
}

export function resourceSymbolDetail(
  definition: SemanticResourceDefinitionRow,
): string {
  const patterns = definition.patterns.map((pattern) => pattern.pattern).join(", ");
  const publicSurface = definition.name ?? (patterns.length === 0 ? null : patterns);
  return publicSurface == null
    ? definition.resourceKind
    : `${definition.resourceKind}: ${publicSurface}`;
}

export function resourceSymbolQueryTerms(
  definition: SemanticResourceDefinitionRow,
): readonly string[] {
  return [
    definition.targetName,
    definition.name,
    definition.key,
    definition.resourceKind,
    ...definition.aliases.map((alias) => alias.name),
    ...definition.patterns.map((pattern) => pattern.pattern),
  ].filter((value): value is string => value != null && value.length > 0);
}

/** Native symbol responses have no channel for partial or non-answer state. */
export function resourceSymbolAnswerFailure(
  answer: SemanticRuntimeAnswer<SemanticResourceDefinitionsResult>,
): string | null {
  if (answer.result !== SemanticRuntimeAnswerResult.Answered) {
    return `semantic runtime returned result=${answer.result}`;
  }
  if (answer.selection !== SemanticRuntimeAnswerSelection.NotApplicable) {
    return `semantic runtime returned selection=${answer.selection}`;
  }
  if (answer.coverage !== SemanticRuntimeAnswerCoverage.Complete) {
    return `semantic runtime returned coverage=${answer.coverage}`;
  }
  return null;
}
