import type {
  SemanticAppDiagnosticRow,
  SemanticDiagnosticPresentationGroup,
  SemanticDiagnosticPresentationRelation,
  SemanticDiagnosticPresentationResult,
  SemanticDiagnosticPresentationRole,
  SemanticDiagnosticPresentationRow,
  SemanticDiagnosticPresentationWithheldRow,
  SemanticTemplateCursorDiagnosticSeverity,
} from './contracts.js';
import { SemanticDiagnosticRelationKind } from './contracts.js';
import { ResourceFrameworkErrorCode } from '../resources/framework-error-code.js';
import { ResourceIssueKind } from '../resources/resource-issue.js';
import { sameTypeSystemSourcePath } from '../type-system/source-file-path.js';

interface PresentationInputRow {
  readonly index: number;
  readonly rowId: string;
  readonly row: SemanticAppDiagnosticRow;
}

interface RelatedPresentationInput {
  readonly input: PresentationInputRow;
  readonly relation: SemanticDiagnosticPresentationRelation;
}

type TemplateTypeRelationship = 'missing-member' | 'binding-assignment';
type ResourceDecoratorCheckerRelationship =
  | 'bindable-class-configuration'
  | 'bindable-symbol-name'
  | 'slotted-member-usage';

const severityRank: Record<SemanticTemplateCursorDiagnosticSeverity, number> = {
  error: 3,
  warning: 2,
  information: 1,
};

export function appDiagnosticPresentation(
  rows: readonly SemanticAppDiagnosticRow[],
  complete: boolean,
): SemanticDiagnosticPresentationResult {
  const inputRows = rows.map((row, index): PresentationInputRow => ({
    index,
    rowId: diagnosticRowId(index, row),
    row,
  }));
  const groupedRows = subjectGroups(inputRows);
  const consumed = new Set<number>();
  const groups: SemanticDiagnosticPresentationGroup[] = [];
  const withheld: SemanticDiagnosticPresentationWithheldRow[] = [];
  const relatedByPrimaryIndex = diagnosticRelationInputs(inputRows);

  for (const primary of inputRows) {
    const related = relatedByPrimaryIndex.get(primary.index) ?? [];
    if (consumed.has(primary.index) || related.length === 0) {
      continue;
    }
    const unconsumed = related.filter((candidate) => !consumed.has(candidate.input.index));
    if (unconsumed.length === 0) {
      continue;
    }
    let group = presentationGroup(
      `relation:${primary.rowId}`,
      primary.row.subject,
      primary,
      [],
      null,
    );
    for (const candidate of unconsumed) {
      group = appendPresentationRows(group, [candidate.input], candidate.relation);
    }
    groups.push(group);
    consumed.add(primary.index);
    for (const candidate of unconsumed) {
      consumed.add(candidate.input.index);
    }
  }

  for (const primary of inputRows.filter((candidate) => isDuplicateRouterConfigurationDiagnostic(candidate.row))) {
    if (consumed.has(primary.index)) {
      continue;
    }
    const related = inputRows.filter((candidate) =>
      candidate.index !== primary.index
      && !consumed.has(candidate.index)
      && isRouterRegistrationResourceConsequence(candidate.row)
      && sameDiagnosticSource(primary.row, candidate.row)
    );
    if (related.length === 0) {
      continue;
    }
    groups.push(presentationGroup(
      `router-registration:${primary.rowId}`,
      null,
      primary,
      related,
      'runtime-consequence',
    ));
    consumed.add(primary.index);
    for (const row of related) {
      consumed.add(row.index);
    }
  }

  for (const primary of inputRows) {
    const relationship = resourceDecoratorSemanticRelationship(primary.row);
    if (relationship == null || consumed.has(primary.index)) {
      continue;
    }
    const checkerEvidence = inputRows.filter((candidate) =>
      !consumed.has(candidate.index)
      && checkerResourceDecoratorRelationship(candidate.row) === relationship
      && resourceDecoratorCheckerSourceMatches(primary.row, candidate.row)
    );
    if (checkerEvidence.length === 0) {
      continue;
    }
    groups.push(presentationGroup(
      `resource-decorator-checker:${relationship}:${primary.rowId}`,
      primary.row.subject,
      primary,
      checkerEvidence,
      'checker-evidence',
    ));
    consumed.add(primary.index);
    for (const row of checkerEvidence) {
      consumed.add(row.index);
    }
  }

  for (const [groupKey, groupRows] of groupedRows) {
    const unknownOwner = groupRows.find((candidate) =>
      !consumed.has(candidate.index) && isTemplateUnknownOwnerOverlayDiagnostic(candidate.row)
    ) ?? null;
    if (unknownOwner == null) {
      continue;
    }
    const related = groupRows
      .filter((candidate) => candidate.index !== unknownOwner.index)
      .filter((candidate) => !consumed.has(candidate.index))
      .filter((candidate) => isTemplateWeakNoMembersDiagnostic(candidate.row));
    if (related.length === 0) {
      continue;
    }
    const group = presentationGroup(
      groupKey,
      unknownOwner.row.subject,
      unknownOwner,
      related,
      'semantic-explanation',
    );
    groups.push(group);
    consumed.add(unknownOwner.index);
    for (const row of related) {
      consumed.add(row.index);
    }
  }

  for (const [groupKey, groupRows] of groupedRows) {
    const missingMembers = groupRows.filter((candidate) =>
      !consumed.has(candidate.index) && isTemplateMissingMemberDiagnostic(candidate.row)
    );
    for (const missingMember of missingMembers) {
      const related = groupRows.filter((candidate) =>
        candidate.index !== missingMember.index
        && !consumed.has(candidate.index)
        && isTemplateMissingMemberAssignmentDiagnostic(candidate.row)
      );
      if (related.length === 0) {
        continue;
      }
      const group = presentationGroup(
        `missing-member-assignment:${groupKey}`,
        missingMember.row.subject,
        missingMember,
        related,
        'same-subject',
      );
      groups.push(group);
      consumed.add(missingMember.index);
      for (const row of related) {
        consumed.add(row.index);
      }
    }
  }

  for (const [groupKey, groupRows] of groupedRows) {
    for (const semanticRow of groupRows) {
      const relationship = semanticTemplateTypeRelationship(semanticRow.row);
      if (relationship == null) {
        continue;
      }
      const checkerEvidence = inputRows.find((candidate) =>
        candidate.index !== semanticRow.index
        && !consumed.has(candidate.index)
        && checkerTemplateTypeRelationship(candidate.row) === relationship
        && sameDiagnosticSource(semanticRow.row, candidate.row)
      ) ?? null;
      if (checkerEvidence == null) {
        continue;
      }

      const existingGroupIndex = groups.findIndex((group) =>
        group.primary.rowIndex === semanticRow.index
        || group.related.some((related) => related.rowIndex === semanticRow.index)
      );
      if (existingGroupIndex < 0) {
        groups.push(presentationGroup(
          `checker-agreement:${relationship}:${groupKey}:${semanticRow.rowId}`,
          semanticRow.row.subject,
          semanticRow,
          [checkerEvidence],
          'checker-evidence',
        ));
      } else {
        groups[existingGroupIndex] = appendPresentationRows(
          groups[existingGroupIndex]!,
          [checkerEvidence],
          'checker-evidence',
        );
      }
      consumed.add(semanticRow.index);
      consumed.add(checkerEvidence.index);
    }
  }

  for (const row of inputRows) {
    if (consumed.has(row.index) || !isContextOnlyWeakOwnerDiagnostic(row.row)) {
      continue;
    }
    withheld.push({
      rowId: row.rowId,
      rowIndex: row.index,
      reason: 'context-only-weak-owner',
    });
    consumed.add(row.index);
  }

  for (const row of inputRows) {
    if (consumed.has(row.index)) {
      continue;
    }
    groups.push(presentationGroup(
      `row:${row.rowId}`,
      row.row.subject,
      row,
      [],
      null,
    ));
  }

  const sortedGroups = groups.sort((left, right) =>
    presentationRowSourceOrder(rows[left.primary.rowIndex] ?? null, rows[right.primary.rowIndex] ?? null)
    || left.groupKey.localeCompare(right.groupKey)
  );
  const contextualCount = sortedGroups.reduce((count, group) => count + group.related.length, 0);
  assertDiagnosticPresentationConservation(rows.length, sortedGroups, withheld);
  return {
    rawRowCount: rows.length,
    primaryCount: sortedGroups.length,
    contextualCount,
    withheldCount: withheld.length,
    complete,
    groups: sortedGroups,
    withheld,
  };
}

function diagnosticRelationInputs(
  rows: readonly PresentationInputRow[],
): ReadonlyMap<number, readonly RelatedPresentationInput[]> {
  const rowByIdentity = new Map<
    NonNullable<SemanticAppDiagnosticRow['diagnosticIdentityHandle']>,
    PresentationInputRow | null
  >();
  for (const row of rows) {
    const identity = row.row.diagnosticIdentityHandle;
    if (identity == null) {
      continue;
    }
    rowByIdentity.set(identity, rowByIdentity.has(identity) ? null : row);
  }

  const relatedByPrimaryIndex = new Map<number, RelatedPresentationInput[]>();
  for (const row of rows) {
    const related = row.row.diagnosticRelations?.flatMap((relation) => {
      const primary = rowByIdentity.get(relation.relatedDiagnosticIdentityHandle) ?? null;
      const presentationRelation = semanticDiagnosticPresentationRelation(relation.relationKind);
      return primary == null || primary.index === row.index || presentationRelation == null
        ? []
        : [{ primary, presentationRelation }];
    }) ?? [];
    if (related.length !== 1) {
      continue;
    }
    const { primary, presentationRelation } = related[0]!;
    let inputs = relatedByPrimaryIndex.get(primary.index);
    if (inputs == null) {
      inputs = [];
      relatedByPrimaryIndex.set(primary.index, inputs);
    }
    inputs.push({ input: row, relation: presentationRelation });
  }
  return relatedByPrimaryIndex;
}

function semanticDiagnosticPresentationRelation(
  relation: SemanticDiagnosticRelationKind | `${SemanticDiagnosticRelationKind}`,
): SemanticDiagnosticPresentationRelation | null {
  switch (relation) {
    case SemanticDiagnosticRelationKind.SameOperationEvidence:
      return 'semantic-explanation';
    case SemanticDiagnosticRelationKind.DerivedConsequence:
      return 'derived-consequence';
    default:
      return null;
  }
}

function isDuplicateRouterConfigurationDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'router'
    && row.diagnosticKind === 'duplicate-router-configuration'
    && row.frameworkErrorCode === 'AUR3168';
}

function isRouterRegistrationResourceConsequence(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'resource'
    && (
      row.diagnosticKind === 'custom-element-already-registered'
      || row.diagnosticKind === 'custom-attribute-already-registered'
    )
    && (row.frameworkErrorCode === 'AUR0153' || row.frameworkErrorCode === 'AUR0154');
}

function resourceDecoratorSemanticRelationship(
  row: SemanticAppDiagnosticRow,
): ResourceDecoratorCheckerRelationship | null {
  if (row.diagnosticDomain !== 'resource' || row.diagnosticAuthority !== 'framework-error-code') {
    return null;
  }
  switch (row.diagnosticKind) {
    case ResourceIssueKind.InvalidBindableDecoratorUsageClassWithoutConfiguration:
      return row.frameworkErrorCode === ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageClassWithoutConfiguration
        ? 'bindable-class-configuration'
        : null;
    case ResourceIssueKind.InvalidBindableDecoratorUsageSymbol:
      return row.frameworkErrorCode === ResourceFrameworkErrorCode.InvalidBindableDecoratorUsageSymbol
        ? 'bindable-symbol-name'
        : null;
    case ResourceIssueKind.SlottedDecoratorInvalidUsage:
      return row.frameworkErrorCode === ResourceFrameworkErrorCode.SlottedDecoratorInvalidUsage
        ? 'slotted-member-usage'
        : null;
    default:
      return null;
  }
}

function checkerResourceDecoratorRelationship(
  row: SemanticAppDiagnosticRow,
): ResourceDecoratorCheckerRelationship | null {
  if (row.diagnosticDomain !== 'typescript' || row.diagnosticAuthority !== 'typescript') {
    return null;
  }
  switch (row.typeScriptDiagnosticCode) {
    case 2769:
      return 'bindable-class-configuration';
    case 1166:
      return 'bindable-symbol-name';
    case 1241:
    case 1270:
      return 'slotted-member-usage';
    default:
      return null;
  }
}

function resourceDecoratorCheckerSourceMatches(
  semanticRow: SemanticAppDiagnosticRow,
  checkerRow: SemanticAppDiagnosticRow,
): boolean {
  const semanticSource = semanticRow.source;
  const checkerSource = checkerRow.source;
  return semanticSource?.path != null
    && checkerSource?.path != null
    && sameTypeSystemSourcePath(semanticSource.path, checkerSource.path)
    && semanticSource.start != null
    && semanticSource.end != null
    && checkerSource.start != null
    && checkerSource.end != null
    && semanticSource.start <= checkerSource.start
    && semanticSource.end >= checkerSource.end;
}

function sameDiagnosticSource(
  left: SemanticAppDiagnosticRow,
  right: SemanticAppDiagnosticRow,
): boolean {
  return sameSourceReference(left.source, right.source);
}

function sameSourceReference(
  left: SemanticAppDiagnosticRow['source'],
  right: SemanticAppDiagnosticRow['source'],
): boolean {
  return left?.path != null
    && right?.path != null
    && sameTypeSystemSourcePath(left.path, right.path)
    && left.start === right?.start
    && left.end === right?.end;
}

function subjectGroups(
  rows: readonly PresentationInputRow[],
): Map<string, PresentationInputRow[]> {
  const groups = new Map<string, PresentationInputRow[]>();
  for (const row of rows) {
    const key = subjectGroupKey(row.row);
    if (key == null) {
      continue;
    }
    let group = groups.get(key);
    if (group == null) {
      group = [];
      groups.set(key, group);
    }
    group.push(row);
  }
  return groups;
}

function presentationGroup(
  groupKey: string,
  subject: SemanticDiagnosticPresentationGroup['subject'],
  primaryInput: PresentationInputRow,
  relatedInputs: readonly PresentationInputRow[],
  relatedRelation: SemanticDiagnosticPresentationRelation | null,
): SemanticDiagnosticPresentationGroup {
  const primary = presentationRow(primaryInput, 'primary', null);
  const related = relatedInputs.map((row) => presentationRow(row, 'contextual', relatedRelation));
  const allRows = [primaryInput, ...relatedInputs];
  return {
    groupKey,
    subject,
    primary,
    related,
    rawRowCount: allRows.length,
    primarySeverity: primaryInput.row.severity,
    maxRawSeverity: maxSeverity(allRows.map((row) => row.row.severity)),
  };
}

function appendPresentationRows(
  group: SemanticDiagnosticPresentationGroup,
  inputs: readonly PresentationInputRow[],
  relation: SemanticDiagnosticPresentationRelation,
): SemanticDiagnosticPresentationGroup {
  return {
    ...group,
    related: [
      ...group.related,
      ...inputs.map((input) => presentationRow(input, 'contextual', relation)),
    ],
    rawRowCount: group.rawRowCount + inputs.length,
    maxRawSeverity: maxSeverity([
      group.maxRawSeverity,
      ...inputs.map((input) => input.row.severity),
    ]),
  };
}

function presentationRow(
  input: PresentationInputRow,
  role: SemanticDiagnosticPresentationRole,
  relation: SemanticDiagnosticPresentationRelation | null,
): SemanticDiagnosticPresentationRow {
  return {
    rowId: input.rowId,
    rowIndex: input.index,
    role,
    relation,
  };
}

function isTemplateUnknownOwnerOverlayDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'typescript'
    && row.diagnosticKind === 'template-expression-typescript-diagnostic'
    && row.missingInputs.includes('typescript:TS18046');
}

function isTemplateWeakNoMembersDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'semantic-authoring-policy'
    && row.diagnosticKind === 'weak-expression-member-owner'
    && row.missingInputs.includes('expression-member-owner-type:no-members');
}

function isContextOnlyWeakOwnerDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'semantic-authoring-policy'
    && row.diagnosticKind === 'weak-expression-member-owner'
    && !row.missingInputs.includes('expression-member-owner-type:missing-slot-type');
}

function isTemplateMissingMemberDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'semantic-authoring-policy'
    && row.diagnosticKind === 'missing-expression-member'
    && row.missingInputs.includes('expression-member:selected-member-missing');
}

function isTemplateMissingMemberAssignmentDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && (
      row.diagnosticKind === 'binding-source-assignment-strictness'
      || row.diagnosticKind === 'binding-source-assignment-runtime-noop'
    )
    && hasAnyMissingInput(row, [
      'binding-source-assignment:scope-slot-missing-typechecker-member',
      'binding-source-assignment:owner-member-not-projected',
      'binding-source-assignment:source-member-declaration-missing',
    ]);
}

function semanticTemplateTypeRelationship(
  row: SemanticAppDiagnosticRow,
): TemplateTypeRelationship | null {
  if (row.diagnosticDomain !== 'template') {
    return null;
  }
  switch (row.diagnosticKind) {
    case 'missing-expression-member':
      return 'missing-member';
    case 'binding-source-assignment-strictness':
    case 'binding-source-assignment-framework-managed':
    case 'binding-source-assignment-runtime-noop':
      return 'binding-assignment';
    default:
      return null;
  }
}

function checkerTemplateTypeRelationship(
  row: SemanticAppDiagnosticRow,
): TemplateTypeRelationship | null {
  if (
    row.diagnosticDomain !== 'template'
    || row.diagnosticAuthority !== 'typescript'
    || row.diagnosticKind !== 'template-expression-typescript-diagnostic'
  ) {
    return null;
  }
  if (hasAnyMissingInput(row, ['typescript:TS2339', 'typescript:TS2551'])) {
    return 'missing-member';
  }
  if (hasAnyMissingInput(row, ['typescript:TS2322', 'typescript:TS2588'])) {
    return 'binding-assignment';
  }
  return null;
}

function hasAnyMissingInput(
  row: SemanticAppDiagnosticRow,
  values: readonly string[],
): boolean {
  return values.some((value) => row.missingInputs.includes(value));
}

function subjectGroupKey(
  row: SemanticAppDiagnosticRow,
): string | null {
  const source = row.subject?.source ?? null;
  if (source?.path == null || source.start == null || source.end == null) {
    return null;
  }
  return [
    row.subject?.subjectKind ?? 'unknown-subject',
    source.path,
    source.start,
    source.end,
  ].join(':');
}

function diagnosticRowId(
  index: number,
  row: SemanticAppDiagnosticRow,
): string {
  return [
    'diagnostic',
    index,
    row.diagnosticDomain,
    row.diagnosticKind,
    row.diagnosticAuthority,
    row.frameworkErrorCode ?? 'no-framework-code',
    row.source?.path ?? 'no-source',
    row.source?.start ?? 'no-start',
    row.source?.end ?? 'no-end',
    row.missingInputs.join('+') || row.missingInput || 'no-missing-input',
  ].join(':');
}

function maxSeverity(
  severities: readonly SemanticTemplateCursorDiagnosticSeverity[],
): SemanticTemplateCursorDiagnosticSeverity {
  return severities.reduce((max, severity) =>
    severityRank[severity] > severityRank[max] ? severity : max
  , 'information');
}

function presentationRowSourceOrder(
  left: SemanticAppDiagnosticRow | null,
  right: SemanticAppDiagnosticRow | null,
): number {
  return (left?.source?.path ?? '').localeCompare(right?.source?.path ?? '')
    || (left?.source?.start ?? 0) - (right?.source?.start ?? 0)
    || (left?.source?.end ?? 0) - (right?.source?.end ?? 0)
    || (left?.diagnosticDomain ?? '').localeCompare(right?.diagnosticDomain ?? '')
    || (left?.diagnosticKind ?? '').localeCompare(right?.diagnosticKind ?? '');
}

function assertDiagnosticPresentationConservation(
  rawRowCount: number,
  groups: readonly SemanticDiagnosticPresentationGroup[],
  withheld: readonly SemanticDiagnosticPresentationWithheldRow[],
): void {
  const claimed = new Set<number>();
  const claim = (rowIndex: number): void => {
    if (rowIndex < 0 || rowIndex >= rawRowCount) {
      throw new Error(`Diagnostic presentation references out-of-range raw row ${rowIndex}.`);
    }
    if (claimed.has(rowIndex)) {
      throw new Error(`Diagnostic presentation references raw row ${rowIndex} more than once.`);
    }
    claimed.add(rowIndex);
  };
  for (const group of groups) {
    claim(group.primary.rowIndex);
    for (const related of group.related) {
      claim(related.rowIndex);
    }
  }
  for (const row of withheld) {
    claim(row.rowIndex);
  }
  if (claimed.size !== rawRowCount) {
    const missing = Array.from({ length: rawRowCount }, (_, index) => index)
      .filter((index) => !claimed.has(index));
    throw new Error(`Diagnostic presentation omitted raw row(s): ${missing.join(', ')}.`);
  }
}
