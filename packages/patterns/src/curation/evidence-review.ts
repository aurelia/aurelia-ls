import type {
  DocumentExampleSet,
  DocsCorpus,
  EvidenceDisposition,
  ExampleCompleteness,
  MarkdownDocument,
  SourceCompanionGroup,
  SourceUnit
} from '../corpus/corpus-types.js';
import { sourceUnitForSourceText, sourceUnitsForDocument } from '../corpus/source-units.js';
import { buildCorpusSemanticIndex } from '../corpus/semantic-index.js';
import { officialAureliaDocsUrl } from '../corpus/docs-reference.js';
import type { AureliaPatternExample } from '../pattern-contract.js';
import type { PatternAdmissionRecord } from './admission-records.js';

export interface PatternEvidenceProfile {
  readonly admission: PatternAdmissionRecord;
  readonly documents: readonly PatternEvidenceDocumentConfig[];
  readonly requiredEvidence: readonly PatternEvidenceRequirement[];
  readonly metadataDraft: PatternMetadataDraft;
}

export interface PatternEvidenceDocumentConfig {
  readonly relativePath: string;
  readonly role: string;
  readonly curationNote: string;
}

export interface PatternEvidenceRequirement {
  readonly key: string;
  readonly signalNames: readonly string[];
}

export interface PatternEvidenceReport {
  readonly patternId: string;
  readonly title: string;
  readonly admissionSummary: string;
  readonly requiredEvidence: readonly PatternEvidenceCheck[];
  readonly sourceDocuments: readonly PatternDocumentEvidence[];
  readonly semanticReview: PatternSemanticCorpusReview;
  readonly proposedMetadata: PatternMetadataDraft;
  readonly catalogReview?: CatalogPatternReview;
}

export interface PatternEvidenceCheck {
  readonly key: string;
  readonly satisfied: boolean;
  readonly documents: readonly string[];
}

export interface PatternDocumentEvidence {
  readonly relativePath: string;
  readonly title: string;
  readonly role: string;
  readonly present: boolean;
  readonly sourceUnitCount: number;
  readonly signalNames: readonly string[];
  readonly deferredSignalNames: readonly string[];
  readonly curationNote: string;
}

export interface PatternMetadataDraft {
  readonly summary: string;
  readonly whenToUse: readonly string[];
  readonly whenNotToUse: readonly string[];
  readonly assumptions: readonly string[];
  readonly handoffNotes: readonly string[];
}

export interface PatternSemanticCorpusReview {
  readonly sourceCompanionGroupCount: number;
  readonly documentExampleSetCount: number;
  readonly dispositionCounts: Readonly<Partial<Record<EvidenceDisposition, number>>>;
  readonly completenessCounts: Readonly<Partial<Record<ExampleCompleteness, number>>>;
  readonly exampleSetHighlights: readonly PatternExampleSetHighlight[];
  readonly cautionMessages: readonly string[];
}

export interface PatternExampleSetHighlight {
  readonly documentPath: string;
  readonly rootHeading?: string;
  readonly completeness: ExampleCompleteness;
  readonly disposition: EvidenceDisposition;
  readonly fileNameCandidates: readonly string[];
  readonly signalNames: readonly string[];
}

export interface CatalogPatternReview {
  readonly patternId: string;
  readonly status: 'pass' | 'warn';
  readonly messages: readonly string[];
}

export function analyzePatternEvidence(
  corpus: DocsCorpus,
  profile: PatternEvidenceProfile,
  pattern?: AureliaPatternExample
): PatternEvidenceReport {
  const documentsByPath = new Map(corpus.markdownDocuments.map((document) => [document.relativePath, document]));
  const documentEvidence = profile.documents.map((config) =>
    analyzeConfiguredDocument(config, documentsByPath.get(config.relativePath), profile.admission)
  );
  const requiredEvidence = profile.requiredEvidence.map((requirement) =>
    evidenceCheck(documentEvidence, requirement)
  );
  const semanticReview = buildPatternSemanticCorpusReview(corpus, profile);

  return {
    patternId: profile.admission.patternId,
    title: profile.admission.title,
    admissionSummary: profile.admission.admissionSummary,
    requiredEvidence,
    sourceDocuments: documentEvidence,
    semanticReview,
    proposedMetadata: profile.metadataDraft,
    ...(pattern !== undefined
      ? { catalogReview: reviewCatalogPattern(pattern, profile, requiredEvidence) }
      : {})
  };
}

export function formatPatternEvidenceReport(report: PatternEvidenceReport): string {
  const lines: string[] = [
    `# ${report.title} Evidence Report`,
    '',
    `Pattern ID: \`${report.patternId}\``,
    '',
    report.admissionSummary,
    '',
    '## Required Evidence',
    ''
  ];

  for (const check of report.requiredEvidence) {
    const mark = check.satisfied ? 'yes' : 'no';
    lines.push(`- ${check.key}: ${mark} (${check.documents.join(', ') || 'no docs'})`);
  }

  lines.push('', '## Source Documents', '');
  for (const document of report.sourceDocuments) {
    const present = document.present ? 'present' : 'missing';
    lines.push(`- \`${document.relativePath}\` (${document.role}, ${present})`);
    lines.push(`  - signals: ${document.signalNames.join(', ') || 'none'}`);
    if (document.deferredSignalNames.length > 0) {
      lines.push(`  - deferred pressure: ${document.deferredSignalNames.join(', ')}`);
    }
    lines.push(`  - note: ${document.curationNote}`);
  }

  lines.push('', '## Semantic Corpus Review', '');
  lines.push(`Source companion groups: ${report.semanticReview.sourceCompanionGroupCount}`);
  lines.push(`Document example sets: ${report.semanticReview.documentExampleSetCount}`);
  lines.push(`Evidence dispositions: ${formatCounts(report.semanticReview.dispositionCounts)}`);
  lines.push(`Completeness: ${formatCounts(report.semanticReview.completenessCounts)}`);

  if (report.semanticReview.exampleSetHighlights.length > 0) {
    lines.push('', 'Example set highlights:');
    for (const exampleSet of report.semanticReview.exampleSetHighlights) {
      const heading = exampleSet.rootHeading !== undefined ? ` ${exampleSet.rootHeading}` : '';
      const files = exampleSet.fileNameCandidates.join(', ') || 'unnamed files';
      const signals = exampleSet.signalNames.slice(0, 8).join(', ') || 'no signals';
      lines.push(
        `- \`${exampleSet.documentPath}\`${heading}: ${exampleSet.completeness}, ${exampleSet.disposition}; files: ${files}; signals: ${signals}`
      );
    }
  }

  if (report.semanticReview.cautionMessages.length > 0) {
    lines.push('', 'Curation cautions:');
    for (const message of report.semanticReview.cautionMessages) {
      lines.push(`- ${message}`);
    }
  }

  lines.push('', '## Proposed Metadata', '');
  lines.push(`Summary: ${report.proposedMetadata.summary}`, '');
  lines.push('When to use:');
  for (const item of report.proposedMetadata.whenToUse) {
    lines.push(`- ${item}`);
  }
  lines.push('', 'When not to use:');
  for (const item of report.proposedMetadata.whenNotToUse) {
    lines.push(`- ${item}`);
  }
  lines.push('', 'Assumptions:');
  for (const item of report.proposedMetadata.assumptions) {
    lines.push(`- ${item}`);
  }
  lines.push('', 'Handoff notes:');
  for (const item of report.proposedMetadata.handoffNotes) {
    lines.push(`- ${item}`);
  }

  if (report.catalogReview !== undefined) {
    lines.push('', '## Catalog Review', '');
    lines.push(`Status: ${report.catalogReview.status}`);
    for (const message of report.catalogReview.messages) {
      lines.push(`- ${message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function buildPatternSemanticCorpusReview(
  corpus: DocsCorpus,
  profile: PatternEvidenceProfile
): PatternSemanticCorpusReview {
  const sourceDocumentPaths = new Set(profile.admission.sourceDocumentPaths);
  const semanticIndex = buildCorpusSemanticIndex(corpus);
  const sourceCompanionGroups = semanticIndex.sourceCompanionGroups.filter((group) =>
    sourceDocumentPaths.has(group.documentPath)
  );
  const exampleSets = semanticIndex.exampleSets.filter((exampleSet) =>
    sourceDocumentPaths.has(exampleSet.documentPath)
  );
  const cautionMessages = semanticCautionMessages(sourceCompanionGroups, exampleSets);

  return {
    sourceCompanionGroupCount: sourceCompanionGroups.length,
    documentExampleSetCount: exampleSets.length,
    dispositionCounts: countReviewValues(sourceCompanionGroups, exampleSets, 'disposition'),
    completenessCounts: countReviewValues(sourceCompanionGroups, exampleSets, 'completeness'),
    exampleSetHighlights: exampleSets.slice(0, 5).map((exampleSet) => ({
      documentPath: exampleSet.documentPath,
      ...(exampleSet.rootHeading !== undefined ? { rootHeading: exampleSet.rootHeading } : {}),
      completeness: exampleSet.completeness,
      disposition: exampleSet.disposition,
      fileNameCandidates: exampleSet.fileNameCandidates,
      signalNames: exampleSet.signalNames
    })),
    cautionMessages
  };
}

function semanticCautionMessages(
  sourceCompanionGroups: readonly SourceCompanionGroup[],
  exampleSets: readonly DocumentExampleSet[]
): readonly string[] {
  const messages: string[] = [];
  const items = [...sourceCompanionGroups, ...exampleSets];
  const excludedCount = items.filter((item) => item.disposition === 'excluded').length;
  const capabilityCount = items.filter((item) => item.disposition === 'capability-reference').length;
  const nonDefaultCount = items.filter((item) => item.disposition === 'non-default').length;
  const multiSectionCount = exampleSets.filter((item) => item.completeness === 'multi-section-recipe').length;

  if (excludedCount > 0) {
    messages.push(`${excludedCount} excluded evidence item(s) detected; keep them out of public pattern defaults.`);
  }
  if (capabilityCount > 0) {
    messages.push(`${capabilityCount} capability-reference item(s) detected; docs support the mechanism but do not decide recommendation order.`);
  }
  if (nonDefaultCount > 0) {
    messages.push(`${nonDefaultCount} non-default item(s) detected; review handoff notes before promoting source.`);
  }
  if (multiSectionCount > 0) {
    messages.push(`${multiSectionCount} multi-section recipe example set(s) detected; curate smaller public bundles instead of copying whole recipes by default.`);
  }

  return messages;
}

function countReviewValues<
  TKey extends 'disposition' | 'completeness',
  TValue extends (SourceCompanionGroup | DocumentExampleSet)[TKey]
>(
  sourceCompanionGroups: readonly SourceCompanionGroup[],
  exampleSets: readonly DocumentExampleSet[],
  key: TKey
): Readonly<Partial<Record<TValue, number>>> {
  const counts = new Map<TValue, number>();
  for (const item of [...sourceCompanionGroups, ...exampleSets]) {
    const value = item[key] as TValue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right))) as Partial<Record<TValue, number>>;
}

function formatCounts(counts: Readonly<Record<string, number | undefined>>): string {
  const entries = Object.entries(counts).filter(([, count]) => count !== undefined && count > 0);
  if (entries.length === 0) {
    return 'none';
  }
  return entries.map(([key, count]) => `${key}=${count}`).join(', ');
}

function analyzeConfiguredDocument(
  config: PatternEvidenceDocumentConfig,
  document: MarkdownDocument | undefined,
  admission: PatternAdmissionRecord
): PatternDocumentEvidence {
  if (document === undefined) {
    return {
      relativePath: config.relativePath,
      title: config.relativePath,
      role: config.role,
      present: false,
      sourceUnitCount: 0,
      signalNames: [],
      deferredSignalNames: [],
      curationNote: config.curationNote
    };
  }

  const sourceUnits = sourceUnitsForDocument(document);
  const signalNames = uniqueSignals(sourceUnits);
  const deferredSignalNames = signalNames.filter((signal) => admission.deferredSignals.includes(signal));

  return {
    relativePath: config.relativePath,
    title: document.title ?? config.relativePath,
    role: config.role,
    present: true,
    sourceUnitCount: sourceUnits.length,
    signalNames,
    deferredSignalNames,
    curationNote: config.curationNote
  };
}

function evidenceCheck(
  documentEvidence: readonly PatternDocumentEvidence[],
  requirement: PatternEvidenceRequirement
): PatternEvidenceCheck {
  const documents = documentEvidence
    .filter((document) => requirement.signalNames.some((signal) => document.signalNames.includes(signal)))
    .map((document) => document.relativePath);
  return {
    key: requirement.key,
    satisfied: documents.length > 0,
    documents
  };
}

function reviewCatalogPattern(
  pattern: AureliaPatternExample,
  profile: PatternEvidenceProfile,
  requiredEvidence: readonly PatternEvidenceCheck[]
): CatalogPatternReview {
  const messages: string[] = [];
  const sourceUnits = pattern.source.files.map((file) =>
    sourceUnitForSourceText(file.contents, file.language, file.path)
  );
  const signalNames = uniqueSignals(sourceUnits);
  const hasTs = pattern.source.files.some((file) => file.language === 'ts' || file.language === 'typescript');
  const hasHtml = pattern.source.files.some((file) => file.language === 'html');

  if (pattern.patternId !== profile.admission.patternId) {
    messages.push(`Pattern id differs from admission record: ${pattern.patternId}`);
  }
  if (!hasTs || !hasHtml) {
    messages.push('Curated source should contain both TypeScript and HTML files.');
  }
  for (const signal of profile.admission.expectedSignals) {
    if (!signalNames.includes(signal)) {
      messages.push(`Curated source is missing expected signal: ${signal}`);
    }
  }
  for (const signal of profile.admission.deferredSignals) {
    if (signalNames.includes(signal)) {
      messages.push(`Curated source contains deferred first-slice signal: ${signal}`);
    }
  }
  for (const check of requiredEvidence) {
    if (!check.satisfied) {
      messages.push(`Corpus evidence missing for ${check.key}.`);
    }
  }
  if (pattern.support.refs === undefined || pattern.support.refs.length === 0) {
    messages.push('Curated pattern has no support refs.');
  } else {
    const refUrls = new Set(pattern.support.refs.map((ref) => ref.url));
    for (const ref of pattern.support.refs) {
      if (!ref.url.startsWith('https://docs.aurelia.io/')) {
        messages.push(`Support ref is not an official Aurelia docs URL: ${ref.url}`);
      }
      if (ref.url.toLowerCase().includes('router-direct')) {
        messages.push(`Support ref points at permanently excluded router-direct docs: ${ref.url}`);
      }
    }
    for (const supportRefPath of profile.admission.supportRefPaths) {
      const expectedUrl = officialAureliaDocsUrl(supportRefPath);
      if (!refUrls.has(expectedUrl)) {
        messages.push(`Curated pattern is missing support ref for admission path ${supportRefPath}: ${expectedUrl}`);
      }
    }
  }

  if (messages.length === 0) {
    messages.push('Curated catalog entry matches the admission record and corpus evidence.');
  }

  return {
    patternId: pattern.patternId,
    status: messages.length === 1 && messages[0]!.startsWith('Curated catalog entry') ? 'pass' : 'warn',
    messages
  };
}

function uniqueSignals(sourceUnits: readonly Pick<SourceUnit, 'signals'>[]): readonly string[] {
  return Array.from(new Set(sourceUnits.flatMap((unit) => unit.signals.map((signal) => signal.name)))).sort();
}
