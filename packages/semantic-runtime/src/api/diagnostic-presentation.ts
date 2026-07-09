import type {
  SemanticAppDiagnosticRow,
  SemanticDiagnosticPresentationGroup,
  SemanticDiagnosticPresentationRelation,
  SemanticDiagnosticPresentationResult,
  SemanticDiagnosticPresentationRole,
  SemanticDiagnosticPresentationRow,
  SemanticTemplateCursorDiagnosticSeverity,
} from './contracts.js';

interface PresentationInputRow {
  readonly index: number;
  readonly rowId: string;
  readonly row: SemanticAppDiagnosticRow;
}

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

  for (const [groupKey, groupRows] of groupedRows) {
    const unknownOwner = groupRows.find((candidate) => isTemplateUnknownOwnerOverlayDiagnostic(candidate.row)) ?? null;
    if (unknownOwner == null) {
      continue;
    }
    const related = groupRows
      .filter((candidate) => candidate.index !== unknownOwner.index)
      .filter((candidate) => isTemplateWeakNoMembersDiagnostic(candidate.row));
    if (related.length === 0) {
      continue;
    }
    const group = presentationGroup(
      groupKey,
      unknownOwner.row.subject ?? null,
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
        missingMember.row.subject ?? null,
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

  for (const row of inputRows) {
    if (consumed.has(row.index)) {
      continue;
    }
    groups.push(presentationGroup(
      `row:${row.rowId}`,
      row.row.subject ?? null,
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
  return {
    rawRowCount: rows.length,
    primaryCount: sortedGroups.length,
    contextualCount,
    complete,
    groups: sortedGroups,
  };
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
    && (row.missingInputs ?? []).includes('typescript:TS18046');
}

function isTemplateWeakNoMembersDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'semantic-authoring-policy'
    && row.diagnosticKind === 'weak-expression-member-owner'
    && (row.missingInputs ?? []).includes('expression-member-owner-type:no-members');
}

function isTemplateMissingMemberDiagnostic(
  row: SemanticAppDiagnosticRow,
): boolean {
  return row.diagnosticDomain === 'template'
    && row.diagnosticAuthority === 'semantic-authoring-policy'
    && row.diagnosticKind === 'missing-expression-member'
    && (row.missingInputs ?? []).includes('expression-member:selected-member-missing');
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

function hasAnyMissingInput(
  row: SemanticAppDiagnosticRow,
  values: readonly string[],
): boolean {
  const missingInputs = row.missingInputs ?? [];
  return values.some((value) => missingInputs.includes(value));
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
    (row.missingInputs ?? []).join('+') || row.missingInput || 'no-missing-input',
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
