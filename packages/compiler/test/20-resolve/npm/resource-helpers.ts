import type { AnalyzedResource } from "../../../src/analysis/20-resolve/resolution/npm/types.js";
import { unwrapSourced } from "../../../src/analysis/20-resolve/resolution/25-semantics/sourced.js";

export type BindableView = {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
};

export function resourceKind(resource: AnalyzedResource): string {
  return resource.resource.kind;
}

export function resourceName(resource: AnalyzedResource): string {
  return unwrapSourced(resource.resource.name) ?? "unknown";
}

export function resourceClassName(resource: AnalyzedResource): string {
  return unwrapSourced(resource.resource.className) ?? "unknown";
}

export function resourceSource(resource: AnalyzedResource): string {
  return resource.resource.file ?? "";
}

export function resourceBindables(resource: AnalyzedResource): BindableView[] {
  if (resource.resource.kind === "value-converter" || resource.resource.kind === "binding-behavior") {
    return [];
  }
  const result: BindableView[] = [];
  for (const [key, def] of Object.entries(resource.resource.bindables)) {
    const name = unwrapSourced(def.property) ?? key;
    const attribute = unwrapSourced(def.attribute);
    const mode = unwrapSourced(def.mode);
    const primary = unwrapSourced(def.primary);
    const entry: BindableView = { name };
    if (attribute) entry.attribute = attribute;
    if (mode !== undefined) entry.mode = mode;
    if (primary) entry.primary = true;
    result.push(entry);
  }
  return result;
}
