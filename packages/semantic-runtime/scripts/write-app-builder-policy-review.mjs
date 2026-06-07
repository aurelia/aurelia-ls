import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS,
  APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS,
  AppBuilderOntologyRowKind,
  AppBuilderRecommendationStatus,
  AppBuilderSourceLoweringRequestFieldRequirementKind,
  appBuilderSourceLoweringRequestFieldSummary,
  appBuilderSourceLoweringRequestFieldsForTarget,
  appBuilderRecommendationPolicyRows,
  appBuilderRecommendationPolicySummary,
} from '../out/index.js';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const workspaceRoot = path.resolve(packageRoot, '../..');
const outputPath = process.argv[2] == null
  ? path.join(workspaceRoot, '.temp/app-builder-recommendation-defaulting-policy-review-2026-06-03.md')
  : path.resolve(process.argv[2]);

const policyRows = appBuilderRecommendationPolicyRows(APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS);
const summary = appBuilderRecommendationPolicySummary(policyRows);

await writeFile(outputPath, appBuilderPolicyReviewMarkdown(), 'utf8');
console.log(`wrote ${path.relative(workspaceRoot, outputPath)} (${policyRows.length} row(s))`);

function appBuilderPolicyReviewMarkdown() {
  return [
    '# App-Builder Recommendation Defaulting Policy Review - 2026-06-03',
    '',
    'This rolling scratchpad is the operator-reviewable policy artifact requested after the source-lowering authority interview. It now separates recommendation posture from applicability and evidence so flat labels such as `contextual` and `source-backed` do not masquerade as complete policy.',
    '',
    '## Current Decision Shape',
    '',
    '- `recommendationStatus`: the current policy posture, not the full context graph.',
    '- `defaultingCandidate`: a central policy projection from `packages/semantic-runtime/src/app-builder/policy/defaulting-candidate-policy.ts`. It means a local fallback candidate for a selected policy axis, ontology family, or target context, not a blank-slate default and not proof that the row is always selected. Active candidates carry a reviewable scope and rationale row.',
    '- `applicability`: the existing ontology input graph plus targeted conditions that say when a row can honestly apply.',
    '- `evidence`: multi-lane grounding; old `source-backed` authority is now treated as migration evidence that needs sharper provenance when pressure reaches it.',
    '- Blank-slate/starter defaulting profiles remain absent and should stay separate from local defaulting-candidate policy.',
    '',
    '## Summary',
    '',
    'Generated from the compiled policy projection. Re-run `pnpm --filter @aurelia-ls/semantic-runtime policy:app-builder-review` after app-builder ontology or policy changes.',
    '',
    `- Rows: ${summary.rowCount}`,
    `- Defaulting candidates: ${summary.defaultingCandidateCount}`,
    `- Source-lowering implemented rows: ${summary.sourceLoweringImplementedCount}`,
    `- Rows requiring explicit input: ${summary.explicitInputCount}`,
    '',
    '### Recommendation Status Counts',
    '',
    markdownCountTable('status', recommendationStatuses(), summary.recommendationStatusCounts),
    '',
    '### Applicability Kind Counts',
    '',
    markdownCountTable(
      'applicability',
      APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS,
      summary.applicabilityKindCounts,
      'condition rows',
    ),
    '',
    '### Evidence Kind Counts',
    '',
    markdownCountTable(
      'evidence',
      APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS,
      summary.evidenceKindCounts,
      'evidence rows',
    ),
    '',
    '## Defaulting Candidate Policy Rows',
    '',
    'These rows explain why a target is allowed to appear as a local defaulting candidate after caller intent, project facts, or target-scoped decision bundles have narrowed the context. They are not blank-slate defaults.',
    '',
    markdownDefaultingCandidatePolicyRows(policyRows),
    '',
    '## Rows Without Explicit Input',
    '',
    'These rows can be reported, derived, or absence-reported without caller payloads. Review this section carefully: a row appearing here should not mean app-builder silently invents domain, styling, source, or business decisions.',
    '',
    markdownPolicyRows(policyRows.filter((row) => !row.requiresExplicitInput)),
    '',
    '## Source-Lowering Rows Without Explicit Input',
    '',
    'This is the high-risk subset of the previous table. Executable source-lowering rows should normally require explicit caller, policy, decision-bundle, or app-fact input before source is emitted.',
    '',
    markdownPolicyRows(policyRows.filter((row) => row.sourceLoweringImplemented && !row.requiresExplicitInput)),
    '',
    '## Contextual Defaulting Candidate Rows',
    '',
    'These rows are local fallback candidates even though their recommendation posture is contextual. They should only become useful after caller intent, project facts, selected target rows, or decision-bundle scope has narrowed the context.',
    '',
    markdownPolicyRows(policyRows.filter((row) =>
      row.defaultingCandidate && row.recommendationStatus !== AppBuilderRecommendationStatus.Recommendable
    )),
    '',
    '## Control Pattern Canary Rows',
    '',
    markdownPolicyRows(controlCanaryRows()),
    '',
    '## Collection Presentation Pattern Canary Rows',
    '',
    markdownPolicyRows(collectionPresentationRows()),
    '',
    '## Focused Review Rows',
    '',
    markdownPolicyRows(focusedReviewRows()),
    '',
    '## Focused Review Row Details',
    '',
    'This section expands the same focused rows so broad lanes such as `input-dependency x2` remain reviewable without turning the compact tables into a context graph.',
    '',
    markdownPolicyRowDetails(focusedReviewRows()),
    '',
    '## TBD Evidence Rows',
    '',
    'These rows are intentionally visible unresolved evidence frontiers. They should stay small, named, and reviewable; if this table grows, either sharpen evidence into a concrete lane or record the unresolved frontier explicitly.',
    '',
    markdownPolicyRows(tbdEvidenceRows()),
    '',
    markdownPolicyRowDetails(tbdEvidenceRows()),
    '',
    '## Focused Source-Lowering Request Fields',
    '',
    'These fields are per-call source-lowering request properties after durable input/readiness has passed. They are review-visible so policy/defaulting work can see what concrete lowering calls still need without treating them as hidden defaults or durable input facets.',
    '',
    markdownSourceLoweringRequestFieldRows(focusedReviewRows()),
    '',
    '## Contextual Source-Lowering Policy Satisfaction Candidates',
    '',
    'These rows are executable today but have a contextual recommendation posture. The table is still a review projection, but source-lowering preflight now exposes a first-ring `policySatisfaction` row: exact target selection satisfies the gate, while broad/default target sets keep contextual rows from reporting `canRequestSourceLowering=true`.',
    '',
    markdownPolicySatisfactionCandidateRows(policySatisfactionCandidateRows()),
    '',
    '## Review Canaries',
    '',
    '- `contextual` is no longer expected to carry meaning by itself. Review the applicability lanes and input facet references before deciding whether a row is appropriate.',
    '- `source-backed` is intentionally decomposed into evidence lanes. The current projection has zero `legacy-source-backed-authority` evidence rows; if that count returns, treat it as a regression canary or an intentionally new unresolved source-backed row that needs immediate sharpening.',
    '- Native number input is recommendable; numeric constraints are applicability context, not a reason to make the control arbitrary.',
    '- Native date input, single select, and multi-select are recommendable field-kind defaults once the domain field/value-set facts are supplied; they should stay aligned with `appBuilderDomainFieldControlId`.',
    '- Native range, radio-group, and checkbox-list remain contextual because they are alternative interaction choices that need explicit selection beyond the ordinary field-kind fallback.',
    '- Field group and form message remain contextual because they depend on a selected form/field/message context.',
    '- AppSection is contextual and source-lowering implemented. It is a composition boundary over explicit child choices, not a blank-slate starter default.',
    '- Rows without explicit input are not equally risky. The source-lowering subset should stay empty unless a future row has a reviewed deterministic source-output reason.',
    '- `class-binding` is a framework styling mechanism row. It may be a local fallback for state-dependent hooks, but concrete generated classes/data attributes must still come from selected patterns or explicit `VisualClassHooks` input.',
    '- `package-tooling` is not a styling mechanism row. CSS Modules and other style mechanisms may require project tooling facts, but tooling belongs to SourcePlan/project-tooling readiness or capability evidence, not the styling-mechanism value space.',
    '- `defaultingCandidate` rows are local fallbacks for selected policy, ontology-family, or target contexts. They are not blank-slate starter defaults and do not select anything without caller policy or explicit decision-bundle input.',
    '',
    '## 2026-06-04 Target-Scoped Defaulting Note',
    '',
    'Decision bundles now preserve target scope onto supplied-input expansion rows. This gives recommendation/defaulting work a first concrete policy-satisfaction carrier without inventing a standalone policy engine: a caller can group an explicit choice, scope it to one ontology target, and let input-readiness, preflight, invocation, composition, and SourcePlan preview all filter through the same target-aware supplied-input helpers.',
    '',
    'Review implication:',
    '',
    '- `targetRefs` on supplied inputs are explicit scope, not inferred taste.',
    '- Target-global inputs remain possible, but lowerers with a selected target should not spend unfiltered request inputs.',
    '- Future policy/defaulting rows should prefer this contract/facet/readiness path before adding a larger recommendation-specific satisfaction mechanism.',
    '- Contextual source-lowering rows use explicit target selection as the current first-ring satisfaction source; saved policy, named profiles, or richer decision-bundle semantics should be added only when pressure proves the shape.',
    '',
  ].join('\n');
}

function recommendationStatuses() {
  return [
    AppBuilderRecommendationStatus.Recommendable,
    AppBuilderRecommendationStatus.Contextual,
    AppBuilderRecommendationStatus.Deferred,
    AppBuilderRecommendationStatus.AvoidByDefault,
    AppBuilderRecommendationStatus.AnalysisOnly,
    AppBuilderRecommendationStatus.ToBeDetermined,
  ];
}

function markdownCountTable(label, keys, counts, countLabel = 'rows') {
  return [
    `| ${label} | ${countLabel} |`,
    '| --- | --- |',
    ...keys.map((key) => `| ${key} | ${counts[key] ?? 0} |`),
  ].join('\n');
}

function markdownPolicyRows(rows) {
  if (rows.length === 0) {
    return '(none)';
  }
  return [
    '| domain | kind | id | title | posture | defaulting candidate? | applicability | evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => [
      row.targetRef.domain,
      row.targetRef.kind,
      `\`${row.targetRef.id}\``,
      markdownCell(row.title),
      row.recommendationStatus,
      row.defaultingCandidate ? 'yes' : 'no',
      summarizedKinds(row.applicability.map((applicability) => applicability.kind)),
      summarizedKinds(row.evidence.map((evidence) => evidence.kind)),
    ].map(markdownCell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function markdownDefaultingCandidatePolicyRows(rows) {
  const candidateRows = rows.filter((row) => row.defaultingCandidate);
  if (candidateRows.length === 0) {
    return '(none)';
  }
  return [
    '| target | title | posture | scope | rationale |',
    '| --- | --- | --- | --- | --- |',
    ...candidateRows.map((row) => [
      refLabel(row.targetRef),
      row.title,
      row.recommendationStatus,
      row.defaultingCandidatePolicy?.scope ?? '(missing)',
      row.defaultingCandidatePolicy?.summary ?? '(missing)',
    ].map(markdownCell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function markdownPolicyRowDetails(rows) {
  return [
    '| target | applicability details | evidence details |',
    '| --- | --- | --- |',
    ...rows.map((row) => [
      refLabel(row.targetRef),
      markdownDetailLines(row.applicability.map(formatApplicabilityDetail)),
      markdownDetailLines(row.evidence.map(formatEvidenceDetail)),
    ].map(markdownCell).join(' | ')).map((line) => `| ${line} |`),
  ].join('\n');
}

function markdownSourceLoweringRequestFieldRows(rows) {
  const sourceRows = rows
    .map((row) => ({
      row,
      fields: appBuilderSourceLoweringRequestFieldsForTarget(row.targetRef),
    }))
    .filter((entry) => entry.fields.length > 0);
  if (sourceRows.length === 0) {
    return '(none)';
  }
  return [
    '| target | surfaces | required request fields | conditional request fields | optional request fields |',
    '| --- | --- | --- | --- | --- |',
    ...sourceRows.map(({ row, fields }) => {
      const summary = appBuilderSourceLoweringRequestFieldSummary(fields);
      return [
        refLabel(row.targetRef),
        markdownDetailLines(summary.surfaces.map((surface) =>
          `${surface.surfaceKind}: required=${surface.requiredCount}, conditional=${surface.conditionalCount}, optional=${surface.optionalCount}`
        )),
        requestFieldNamesForKind(fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Required),
        requestFieldNamesForKind(fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Conditional),
        requestFieldNamesForKind(fields, AppBuilderSourceLoweringRequestFieldRequirementKind.Optional),
      ].map(markdownCell).join(' | ');
    }).map((line) => `| ${line} |`),
  ].join('\n');
}

function markdownPolicySatisfactionCandidateRows(rows) {
  if (rows.length === 0) {
    return '(none)';
  }
  return [
    '| target | title | defaulting candidate? | explicit input? | applicability lanes | request-field surfaces | policy-satisfaction note |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => {
      const fields = appBuilderSourceLoweringRequestFieldsForTarget(row.targetRef);
      const requestSummary = appBuilderSourceLoweringRequestFieldSummary(fields);
      return [
        refLabel(row.targetRef),
        row.title,
        row.defaultingCandidate ? 'yes' : 'no',
        row.requiresExplicitInput ? 'yes' : 'no',
        summarizedKinds(row.applicability.map((applicability) => applicability.kind)),
        markdownDetailLines(requestSummary.surfaces.map((surface) =>
          `${surface.surfaceKind}: required=${surface.requiredCount}, conditional=${surface.conditionalCount}, optional=${surface.optionalCount}`
        )),
        policySatisfactionNote(row),
      ].map(markdownCell).join(' | ');
    }).map((line) => `| ${line} |`),
  ].join('\n');
}

function summarizedKinds(kinds) {
  const counts = new Map();
  for (const kind of kinds) {
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([kind, count]) => count === 1 ? kind : `${kind} x${count}`)
    .join(', ');
}

function markdownDetailLines(lines) {
  return lines.length === 0 ? '(none)' : lines.join('<br>');
}

function requestFieldNamesForKind(fields, requirementKind) {
  const names = fields
    .filter((field) => field.requirementKind === requirementKind)
    .map((field) => `${field.requestFieldName} [${field.surfaceKind}]`);
  return markdownDetailLines(names);
}

function formatApplicabilityDetail(applicability) {
  return [
    applicability.kind,
    applicability.targetRef == null ? '' : ` -> ${refLabel(applicability.targetRef)}`,
    applicability.inputFacetIds == null ? '' : ` [facets: ${applicability.inputFacetIds.join(', ')}]`,
    `: ${applicability.summary}`,
  ].join('');
}

function formatEvidenceDetail(evidence) {
  return [
    evidence.kind,
    evidence.targetRef == null ? '' : ` -> ${refLabel(evidence.targetRef)}`,
    `: ${evidence.summary}`,
  ].join('');
}

function refLabel(ref) {
  return `${ref.domain}/${ref.kind}:${ref.id}`;
}

function controlCanaryRows() {
  return policyRows.filter((row) => row.targetRef.kind === AppBuilderOntologyRowKind.ControlPattern);
}

function collectionPresentationRows() {
  return policyRows.filter((row) =>
    row.targetRef.kind === AppBuilderOntologyRowKind.ApplicationPattern
    && [
      'collection-list',
      'collection-card',
      'collection-table',
      'native-submit-form',
      'loading-empty-error-state',
      'app-section',
      'router-backed-list-detail',
    ].includes(row.targetRef.id)
  );
}

function focusedReviewRows() {
  return policyRows.filter((row) =>
    [
      'styling-mechanism',
      'collection-table',
      'collection-list',
      'collection-card',
      'native-submit-form',
      'loading-empty-error-state',
      'app-section',
      'router-backed-list-detail',
      'native-text-input',
      'native-number-input',
      'native-date-input',
      'native-range-input',
      'native-boolean-checkbox',
      'native-checkbox-list',
      'native-radio-group',
      'native-single-select',
      'native-multi-select',
      'native-textarea',
      'native-button',
      'field-group',
      'form-message',
      'rich-combobox',
      'rich-dialog',
      'global-stylesheet',
      'component-stylesheet',
      'css-modules',
      'shadow-dom',
      'class-binding',
      'style-binding',
    ].includes(row.targetRef.id)
  );
}

function tbdEvidenceRows() {
  return policyRows.filter((row) =>
    row.evidence.some((evidence) => evidence.kind === 'tbd')
  );
}

function policySatisfactionCandidateRows() {
  return policyRows.filter((row) =>
    row.sourceLoweringImplemented
    && row.recommendationStatus === AppBuilderRecommendationStatus.Contextual
  );
}

function policySatisfactionNote(row) {
  if (row.defaultingCandidate) {
    return 'Contextual and locally defaultable; requires target-scoped policy/defaulting review before any automatic selection should be trusted.';
  }
  if (row.requiresExplicitInput) {
    return 'Contextual and executable; source payload fields are not enough to prove this target should be selected.';
  }
  return 'Contextual and executable; review whether this is a derived policy row or a missing explicit-selection/input edge.';
}

function markdownCell(value) {
  return String(value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}
