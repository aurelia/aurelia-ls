import type {
  SemanticAuthoringSourcePatternAdaptationGroupRow,
  SemanticAuthoringSourcePatternModuleRow,
  SemanticAuthoringSourcePatternParameterRow,
  SemanticAuthoringSourcePatternRow,
} from './contracts.js';

export function semanticAuthoringSourcePatternModuleSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  limit: number,
): string {
  if (pattern.modules.length === 0) {
    return '';
  }
  const moduleSummary = pattern.modules
    .slice()
    .sort(compareSemanticAuthoringSourcePatternModuleDisplay)
    .slice(0, limit)
    .map(semanticAuthoringSourcePatternModuleDisplayText)
    .join(', ');
  const more = pattern.moduleCount > limit
    ? `, +${pattern.moduleCount - limit}`
    : '';
  return `${moduleSummary}${more}`;
}

export function semanticAuthoringSourcePatternParameterSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  limit: number,
): string {
  if (pattern.parameters.length === 0) {
    return '';
  }
  const parameterSummary = pattern.parameters
    .slice()
    .sort(compareSemanticAuthoringSourcePatternParameterDisplay)
    .slice(0, limit)
    .map(semanticAuthoringSourcePatternParameterDisplayText)
    .join(', ');
  const more = pattern.parameterCount > limit
    ? `, +${pattern.parameterCount - limit}`
    : '';
  return `${parameterSummary}${more}`;
}

export function semanticAuthoringSourcePatternAdaptationGroupSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  limit: number,
): string {
  if (pattern.adaptationGroups.length === 0) {
    return '';
  }
  const groupSummary = pattern.adaptationGroups
    .slice()
    .sort(compareSemanticAuthoringSourcePatternAdaptationGroupDisplay)
    .slice(0, limit)
    .map(semanticAuthoringSourcePatternAdaptationGroupDisplayText)
    .join(', ');
  const more = pattern.adaptationGroupCount > limit
    ? `, +${pattern.adaptationGroupCount - limit}`
    : '';
  return `${groupSummary}${more}`;
}

export function semanticAuthoringSourcePatternHostAdaptedSlotSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  limit: number,
): string {
  const hostAdaptedParameters = pattern.parameters.filter((parameter) => parameter.applicationPolicy === 'advisory-only');
  if (hostAdaptedParameters.length === 0) {
    return '';
  }
  const parameterSummary = hostAdaptedParameters
    .slice()
    .sort(compareSemanticAuthoringSourcePatternParameterDisplay)
    .slice(0, limit)
    .map(semanticAuthoringSourcePatternParameterDisplayText)
    .join(', ');
  const more = hostAdaptedParameters.length > limit
    ? `, +${hostAdaptedParameters.length - limit}`
    : '';
  return `${parameterSummary}${more}`;
}

export function semanticAuthoringSourcePatternNeedsCallerAdaptation(
  pattern: SemanticAuthoringSourcePatternRow,
): boolean {
  return pattern.usePolicy !== 'apply-as-source-start';
}

export function semanticAuthoringSourceParameterApplicationsHaveAppliedSourceText(
  applications: readonly { readonly applicationState: string }[],
): boolean {
  return applications.some((application) => application.applicationState === 'applied-to-source-plan');
}

export function semanticAuthoringSourcePatternUseSummary(
  pattern: SemanticAuthoringSourcePatternRow,
  hasAppliedSourceText: boolean,
): string {
  return semanticAuthoringSourcePatternNeedsCallerAdaptation(pattern) && hasAppliedSourceText
    ? 'Concrete source includes applied source-text slots; review host-adapted data, copy, and presentation before emitting app code.'
    : pattern.useSummary;
}

function semanticAuthoringSourcePatternModuleDisplayText(
  module: SemanticAuthoringSourcePatternModuleRow,
): string {
  return `${module.kind}:${module.key}`;
}

function semanticAuthoringSourcePatternParameterDisplayText(
  parameter: SemanticAuthoringSourcePatternParameterRow,
): string {
  const value = parameter.applicationPolicy === 'source-text-input'
    ? parameter.defaultValue ?? parameter.key
    : parameter.key;
  return `${parameter.kind}:${value}{${parameter.valueShape}}${parameter.applicationPolicy === 'source-text-input' ? '*' : ''}`;
}

function semanticAuthoringSourcePatternAdaptationGroupDisplayText(
  group: SemanticAuthoringSourcePatternAdaptationGroupRow,
): string {
  return `${group.key}:${group.applicationPolicy}`;
}

function compareSemanticAuthoringSourcePatternParameterDisplay(
  left: SemanticAuthoringSourcePatternParameterRow,
  right: SemanticAuthoringSourcePatternParameterRow,
): number {
  const leftApplied = left.applicationPolicy === 'source-text-input' ? 1 : 0;
  const rightApplied = right.applicationPolicy === 'source-text-input' ? 1 : 0;
  return rightApplied - leftApplied
    || sourcePatternParameterKindDisplayRank(left.kind) - sourcePatternParameterKindDisplayRank(right.kind)
    || left.key.localeCompare(right.key);
}

function compareSemanticAuthoringSourcePatternModuleDisplay(
  left: SemanticAuthoringSourcePatternModuleRow,
  right: SemanticAuthoringSourcePatternModuleRow,
): number {
  return sourcePatternModuleKindDisplayRank(left.kind) - sourcePatternModuleKindDisplayRank(right.kind)
    || left.key.localeCompare(right.key);
}

function compareSemanticAuthoringSourcePatternAdaptationGroupDisplay(
  left: SemanticAuthoringSourcePatternAdaptationGroupRow,
  right: SemanticAuthoringSourcePatternAdaptationGroupRow,
): number {
  return sourcePatternAdaptationGroupApplicationPolicyDisplayRank(left.applicationPolicy)
    - sourcePatternAdaptationGroupApplicationPolicyDisplayRank(right.applicationPolicy)
    || left.key.localeCompare(right.key);
}

function sourcePatternModuleKindDisplayRank(
  kind: SemanticAuthoringSourcePatternModuleRow['kind'],
): number {
  switch (kind) {
    case 'app-shell':
      return 0;
    case 'resource-convention':
      return 1;
    case 'router-admission':
      return 2;
    case 'route-context':
      return 3;
    case 'plugin-integration':
      return 4;
    case 'di-boundary':
      return 5;
    case 'state-composition':
      return 6;
    case 'service-boundary':
      return 7;
    case 'domain-model':
      return 8;
    case 'selection-boundary':
      return 9;
    case 'component-boundary':
      return 10;
    case 'form-value-channel':
      return 11;
    case 'collection-controls':
      return 12;
    case 'list-rendering':
      return 13;
    case 'template-controller':
      return 14;
    case 'style-binding':
      return 15;
    case 'dynamic-composition':
      return 16;
    case 'state-store':
      return 17;
  }
}

function sourcePatternParameterKindDisplayRank(
  kind: SemanticAuthoringSourcePatternParameterRow['kind'],
): number {
  switch (kind) {
    case 'route-identity':
      return 0;
    case 'selection-identity':
      return 1;
    case 'domain-entity':
      return 2;
    case 'feature-copy':
      return 3;
    case 'field-schema':
      return 4;
    case 'domain-collection':
      return 5;
    case 'sample-data':
      return 6;
    case 'presentation':
      return 7;
  }
}

function sourcePatternAdaptationGroupApplicationPolicyDisplayRank(
  policy: SemanticAuthoringSourcePatternAdaptationGroupRow['applicationPolicy'],
): number {
  switch (policy) {
    case 'source-text-input':
      return 0;
    case 'mixed':
      return 1;
    case 'advisory-only':
      return 2;
  }
}
