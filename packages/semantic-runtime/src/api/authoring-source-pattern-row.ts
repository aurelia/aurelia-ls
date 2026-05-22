import {
  sourcePatternUsePolicy,
  sourcePatternUseSummary,
  type AuthoringSourcePattern,
} from '../authoring/source-plan.js';
import type {
  SemanticAuthoringSourcePatternAdaptationGroupApplicationPolicy,
  SemanticAuthoringSourcePatternRow,
} from './contracts.js';

export function semanticAuthoringSourcePatternRow(
  pattern: AuthoringSourcePattern | null,
): SemanticAuthoringSourcePatternRow | null {
  if (pattern == null) {
    return null;
  }
  return {
    key: pattern.key,
    title: pattern.title,
    summary: pattern.summary,
    role: pattern.role,
    usePolicy: sourcePatternUsePolicy(pattern),
    useSummary: sourcePatternUseSummary(pattern),
    domainModelPolicy: pattern.domainModelPolicy,
    stylePolicy: pattern.stylePolicy,
    dataPolicy: pattern.dataPolicy,
    codeEconomyPolicy: pattern.codeEconomyPolicy,
    adaptationNotes: pattern.adaptationNotes,
    moduleCount: pattern.modules.length,
    modules: pattern.modules.map((module) => ({
      key: module.key,
      kind: module.kind,
      title: module.title,
      summary: module.summary,
    })),
    parameterCount: pattern.parameters.length,
    parameters: pattern.parameters.map((parameter) => ({
      key: parameter.key,
      kind: parameter.kind,
      applicationPolicy: parameter.applicationPolicy,
      valueShape: parameter.valueShape,
      title: parameter.title,
      defaultValue: parameter.defaultValue,
      summary: parameter.summary,
    })),
    adaptationGroupCount: pattern.adaptationGroups.length,
    adaptationGroups: pattern.adaptationGroups.map((group) => ({
      key: group.key,
      title: group.title,
      summary: group.summary,
      parameterKeys: group.parameterKeys,
      applicationPolicy: sourcePatternAdaptationGroupApplicationPolicy(pattern, group.parameterKeys),
    })),
  };
}

function sourcePatternAdaptationGroupApplicationPolicy(
  pattern: AuthoringSourcePattern,
  parameterKeys: readonly string[],
): SemanticAuthoringSourcePatternAdaptationGroupApplicationPolicy {
  const parametersByKey = new Map(pattern.parameters.map((parameter) => [parameter.key, parameter]));
  let sourceTextInputCount = 0;
  let advisoryOnlyCount = 0;
  for (const key of parameterKeys) {
    const parameter = parametersByKey.get(key);
    if (parameter?.applicationPolicy === 'source-text-input') {
      sourceTextInputCount++;
    } else {
      advisoryOnlyCount++;
    }
  }
  if (sourceTextInputCount > 0 && advisoryOnlyCount > 0) {
    return 'mixed';
  }
  return sourceTextInputCount > 0 ? 'source-text-input' : 'advisory-only';
}
