import type {
  CorpusSemanticIndex,
  DocumentExampleSet,
  DocumentSemanticIndex,
  DocsCorpus,
  EvidenceDisposition,
  ExampleCompleteness,
  MarkdownDocument,
  MarkdownSection,
  SourceCompanionGroup,
  SourceUnit,
  SourceUnitRole
} from './corpus-types.js';
import { sourceUnitsForDocument } from './source-units.js';

const evidenceDispositions = [
  'primary-grounding',
  'supporting-grounding',
  'capability-reference',
  'non-default',
  'excluded',
  'caution'
] as const satisfies readonly EvidenceDisposition[];

const exampleCompletenessValues = [
  'complete-copyable',
  'complete-with-companions',
  'multi-section-recipe',
  'template-only',
  'typeScript-only',
  'style-only',
  'support-only',
  'partial-snippet'
] as const satisfies readonly ExampleCompleteness[];

const nonDefaultSignals = new Set([
  'callback-bindable',
  'two-way-bindable',
  'from-view-bindable',
  'state-plugin',
  'store-plugin',
  'validation-plugin',
  'i18n-plugin'
]);

const supportRoles = new Set<SourceUnitRole>(['command', 'config', 'markdown']);
const typeScriptRoles = new Set<SourceUnitRole>([
  'component-or-resource',
  'service-or-di',
  'route-config',
  'bootstrap',
  'test',
  'typescript-snippet'
]);

export function buildCorpusSemanticIndex(corpus: DocsCorpus): CorpusSemanticIndex {
  const documentIndexes = corpus.markdownDocuments.map((document) =>
    buildDocumentSemanticIndex(document)
  );
  const sourceUnits = documentIndexes.flatMap((index) => index.sourceUnits);
  const sourceCompanionGroups = documentIndexes.flatMap((index) => index.sourceCompanionGroups);
  const exampleSets = documentIndexes.flatMap((index) => index.exampleSets);

  return {
    sourceUnits,
    sourceCompanionGroups,
    exampleSets,
    dispositionCounts: countByDisposition([...sourceCompanionGroups, ...exampleSets]),
    completenessCounts: countByCompleteness([...sourceCompanionGroups, ...exampleSets])
  };
}

export function buildDocumentSemanticIndex(document: MarkdownDocument): DocumentSemanticIndex {
  const sourceUnits = sourceUnitsForDocument(document);
  const sourceCompanionGroups = buildSourceCompanionGroups(document, sourceUnits);
  const exampleSets = buildDocumentExampleSets(document, sourceCompanionGroups);

  return {
    documentPath: document.relativePath,
    sourceUnits,
    sourceCompanionGroups,
    exampleSets
  };
}

export function buildSourceCompanionGroups(
  document: MarkdownDocument,
  sourceUnits: readonly SourceUnit[] = sourceUnitsForDocument(document)
): readonly SourceCompanionGroup[] {
  const sectionsById = new Map(document.sections.map((section) => [section.sectionId, section]));
  const unitsBySection = new Map<string, SourceUnit[]>();

  for (const unit of sourceUnits) {
    const units = unitsBySection.get(unit.sectionId) ?? [];
    units.push(unit);
    unitsBySection.set(unit.sectionId, units);
  }

  const groups: SourceCompanionGroup[] = [];
  for (const section of document.sections) {
    const units = unitsBySection.get(section.sectionId) ?? [];
    if (units.length === 0) {
      continue;
    }

    const signalNames = unique(units.flatMap((unit) => unit.signals.map((signal) => signal.name)));
    const disposition = classifyEvidenceDisposition(document.relativePath, section, signalNames);
    const fileNameCandidates = unique([
      ...extractFileNameCandidates(section.heading),
      ...units.flatMap((unit) => unit.title !== undefined ? [unit.title] : [])
    ]);
    groups.push({
      groupId: `${document.relativePath}#group-${groups.length + 1}`,
      documentPath: document.relativePath,
      sectionId: section.sectionId,
      ...(section.heading !== undefined ? { heading: section.heading } : {}),
      headingPath: section.headingPath,
      sourceUnitIds: units.map((unit) => unit.sourceUnitId),
      roles: unique(units.map((unit) => unit.role)),
      languages: unique(units.map((unit) => unit.language)),
      fileNameCandidates,
      signalNames,
      completeness: classifyGroupCompleteness(units),
      disposition: disposition.disposition,
      dispositionReasons: disposition.reasons
    });
  }

  return groups;
}

export function buildDocumentExampleSets(
  document: MarkdownDocument,
  sourceCompanionGroups: readonly SourceCompanionGroup[] = buildSourceCompanionGroups(document)
): readonly DocumentExampleSet[] {
  const groupsBySection = new Map(sourceCompanionGroups.map((group) => [group.sectionId, group]));
  const sets: DocumentExampleSet[] = [];

  for (const root of document.sections) {
    if (!isExampleSetRoot(root)) {
      continue;
    }

    const descendantGroups = document.sections
      .filter((section) => section.sectionId !== root.sectionId && hasHeadingPathPrefix(section, root))
      .map((section) => groupsBySection.get(section.sectionId))
      .filter((group): group is SourceCompanionGroup => group !== undefined);

    const directGroup = groupsBySection.get(root.sectionId);
    const groups = directGroup !== undefined ? [directGroup, ...descendantGroups] : descendantGroups;
    if (!isMultiSectionExampleSet(groups)) {
      continue;
    }

    const signalNames = unique(groups.flatMap((group) => group.signalNames));
    const disposition = mergeDispositions(groups.map((group) => group.disposition), groups.flatMap((group) => group.dispositionReasons));

    sets.push({
      exampleSetId: `${document.relativePath}#example-set-${sets.length + 1}`,
      documentPath: document.relativePath,
      rootSectionId: root.sectionId,
      ...(root.heading !== undefined ? { rootHeading: root.heading } : {}),
      rootHeadingPath: root.headingPath,
      childSectionIds: groups.map((group) => group.sectionId),
      sourceCompanionGroupIds: groups.map((group) => group.groupId),
      roles: unique(groups.flatMap((group) => group.roles)),
      languages: unique(groups.flatMap((group) => group.languages)),
      fileNameCandidates: unique(groups.flatMap((group) => group.fileNameCandidates)),
      signalNames,
      completeness: 'multi-section-recipe',
      disposition: disposition.disposition,
      dispositionReasons: disposition.reasons
    });
  }

  return sets;
}

export function classifyEvidenceDisposition(
  documentPath: string,
  section: Pick<MarkdownSection, 'heading' | 'headingPath' | 'prose'>,
  signalNames: readonly string[]
): { disposition: EvidenceDisposition; reasons: readonly string[] } {
  const signals = new Set(signalNames);
  const context = `${documentPath} ${section.heading ?? ''} ${section.headingPath.join(' ')} ${section.prose}`.toLowerCase();
  const reasons: string[] = [];

  if (isRouterDirectDocument(documentPath) || signals.has('router-direct') || context.includes('@aurelia/router-direct')) {
    reasons.push('router-direct is permanently excluded from public Aurelia Patterns.');
    return { disposition: 'excluded', reasons };
  }

  if (
    documentPath.includes('error-messages/') ||
    documentPath.includes('developing-with-ai/') ||
    /incorrect usage|example trigger|migration|troubleshooting/.test(context)
  ) {
    reasons.push('Document context is better treated as caution/reference than direct public pattern source.');
    return { disposition: 'caution', reasons };
  }

  if (signals.has('event-aggregator')) {
    reasons.push('EventAggregator is capability/reference evidence, not the default cross-component pattern.');
    return { disposition: 'capability-reference', reasons };
  }

  const nonDefaultHits = Array.from(nonDefaultSignals).filter((signal) => signals.has(signal));
  if (nonDefaultHits.length > 0) {
    reasons.push(`Non-default or plugin-heavy signal(s): ${nonDefaultHits.join(', ')}.`);
    return { disposition: 'non-default', reasons };
  }

  if (hasPrimaryGroundingSignals(signals)) {
    reasons.push('Core Aurelia/platform signals can ground an admitted pattern after curation.');
    return { disposition: 'primary-grounding', reasons };
  }

  reasons.push('Source is useful support evidence but does not carry enough core source signals by itself.');
  return { disposition: 'supporting-grounding', reasons };
}

function classifyGroupCompleteness(units: readonly SourceUnit[]): ExampleCompleteness {
  const roles = new Set(units.map((unit) => unit.role));
  const hasTemplate = roles.has('template');
  const hasTypeScript = Array.from(roles).some((role) => typeScriptRoles.has(role));
  const hasStyle = roles.has('style');
  const primaryRoleCount = Array.from(roles).filter((role) => !supportRoles.has(role)).length;

  if (hasTemplate && hasTypeScript && hasStyle) {
    return 'complete-copyable';
  }
  if (hasTemplate && hasTypeScript) {
    return 'complete-with-companions';
  }
  if (hasTemplate) {
    return 'template-only';
  }
  if (hasTypeScript) {
    return 'typeScript-only';
  }
  if (hasStyle) {
    return 'style-only';
  }
  if (primaryRoleCount === 0) {
    return 'support-only';
  }
  return 'partial-snippet';
}

function isExampleSetRoot(section: MarkdownSection): boolean {
  const heading = (section.heading ?? '').trim().toLowerCase();
  return /^(code|source|source code|implementation|complete example|complete examples|example|examples)$/.test(heading) ||
    /^complete example\b/.test(heading);
}

function hasHeadingPathPrefix(section: MarkdownSection, root: MarkdownSection): boolean {
  if (section.headingPath.length <= root.headingPath.length) {
    return false;
  }

  return root.headingPath.every((part, index) => section.headingPath[index] === part);
}

function isMultiSectionExampleSet(groups: readonly SourceCompanionGroup[]): boolean {
  if (groups.length < 2) {
    return false;
  }

  const roles = new Set(groups.flatMap((group) => group.roles));
  const hasTemplate = roles.has('template');
  const hasTypeScript = Array.from(roles).some((role) => typeScriptRoles.has(role));
  const filenames = groups.flatMap((group) => group.fileNameCandidates);
  const hasNamedCompanions = filenames.some((name) => /\.(?:ts|js)$/.test(name)) &&
    filenames.some((name) => /\.html$/.test(name));

  return (hasTemplate && hasTypeScript) || hasNamedCompanions;
}

function mergeDispositions(
  dispositions: readonly EvidenceDisposition[],
  reasons: readonly string[]
): { disposition: EvidenceDisposition; reasons: readonly string[] } {
  const order: readonly EvidenceDisposition[] = [
    'excluded',
    'caution',
    'capability-reference',
    'non-default',
    'primary-grounding',
    'supporting-grounding'
  ];
  const dispositionSet = new Set(dispositions);
  const disposition = order.find((candidate) => dispositionSet.has(candidate)) ?? 'supporting-grounding';

  return {
    disposition,
    reasons: unique(reasons)
  };
}

function isRouterDirectDocument(documentPath: string): boolean {
  return /(?:^|\/)router-direct(?:\/|\.md$)/.test(documentPath);
}

function hasPrimaryGroundingSignals(signals: ReadonlySet<string>): boolean {
  return [
    'repeat.for',
    'value.bind',
    'checked.bind',
    'checked.to-view',
    'checked.one-way',
    'submit.trigger',
    'bindable-component',
    'custom-event-dispatch',
    'dependency-injection',
    'resolve-service',
    'class-style-binding',
    'value-converter',
    'focus-binding',
    'debounce-behavior',
    'promise.bind',
    'route-lifecycle',
    'route-parameter-aggregation',
    'route-viewport',
    'router-events'
  ].some((signal) => signals.has(signal));
}

function countByDisposition(
  items: readonly { disposition: EvidenceDisposition }[]
): Readonly<Record<EvidenceDisposition, number>> {
  const counts = Object.fromEntries(evidenceDispositions.map((disposition) => [disposition, 0])) as Record<EvidenceDisposition, number>;
  for (const item of items) {
    counts[item.disposition] += 1;
  }
  return counts;
}

function countByCompleteness(
  items: readonly { completeness: ExampleCompleteness }[]
): Readonly<Record<ExampleCompleteness, number>> {
  const counts = Object.fromEntries(exampleCompletenessValues.map((completeness) => [completeness, 0])) as Record<ExampleCompleteness, number>;
  for (const item of items) {
    counts[item.completeness] += 1;
  }
  return counts;
}

function unique<T extends string>(values: readonly T[]): readonly T[] {
  return Array.from(new Set(values)).sort();
}

function extractFileNameCandidates(text: string | undefined): readonly string[] {
  if (text === undefined) {
    return [];
  }

  return Array.from(text.matchAll(/\b[\w.-]+\.(?:ts|js|html|css|scss|json|yaml)\b/g))
    .map((match) => match[0])
    .sort();
}
