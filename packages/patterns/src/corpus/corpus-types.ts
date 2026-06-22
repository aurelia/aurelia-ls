export type CorpusFileKind = 'markdown' | 'image' | 'other';

export interface CorpusFile {
  readonly relativePath: string;
  readonly kind: CorpusFileKind;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface DocsCorpus {
  readonly rootDir: string;
  readonly files: readonly CorpusFile[];
  readonly markdownDocuments: readonly MarkdownDocument[];
  readonly navigation: GitBookNavigation;
}

export interface GitBookNavigation {
  readonly nodes: readonly NavigationNode[];
  readonly targetPaths: readonly string[];
  readonly missingTargets: readonly string[];
  readonly duplicateTargets: readonly DuplicateNavigationTarget[];
  readonly orphanMarkdownPaths: readonly string[];
}

export interface NavigationNode {
  readonly nodeId: string;
  readonly order: number;
  readonly depth: number;
  readonly title: string;
  readonly targetPath?: string;
  readonly targetAnchor?: string;
  readonly parentTitles: readonly string[];
}

export interface DuplicateNavigationTarget {
  readonly targetPath: string;
  readonly nodeIds: readonly string[];
}

export interface MarkdownDocument {
  readonly documentId: string;
  readonly relativePath: string;
  readonly title?: string;
  readonly frontmatterRaw?: string;
  readonly navigationNodes: readonly NavigationNode[];
  readonly sections: readonly MarkdownSection[];
  readonly codeFences: readonly CodeFence[];
  readonly directives: readonly GitBookDirective[];
}

export interface MarkdownSection {
  readonly sectionId: string;
  readonly heading?: string;
  readonly headingDepth: number;
  readonly headingPath: readonly string[];
  readonly startLine: number;
  readonly endLine: number;
  readonly codeFenceIds: readonly string[];
  readonly prose: string;
}

export interface CodeFence {
  readonly fenceId: string;
  readonly sectionId: string;
  readonly languageRaw: string;
  readonly language: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly code: string;
  readonly title?: string;
}

export interface GitBookDirective {
  readonly directiveId: string;
  readonly name: string;
  readonly attrs: string;
  readonly line: number;
}

export type SourceUnitRole =
  | 'template'
  | 'component-or-resource'
  | 'service-or-di'
  | 'route-config'
  | 'bootstrap'
  | 'test'
  | 'style'
  | 'command'
  | 'config'
  | 'markdown'
  | 'unlabeled'
  | 'typescript-snippet';

export type AffordanceSignalStrength = 'strong' | 'medium' | 'weak';

export interface AffordanceSignal {
  readonly name: string;
  readonly strength: AffordanceSignalStrength;
  readonly reason: string;
}

export interface SourceUnit {
  readonly sourceUnitId: string;
  readonly documentPath: string;
  readonly sectionId: string;
  readonly codeFenceId: string;
  readonly language: string;
  readonly role: SourceUnitRole;
  readonly title?: string;
  readonly sourceText: string;
  readonly signals: readonly AffordanceSignal[];
}

export type ExampleCompleteness =
  | 'complete-copyable'
  | 'complete-with-companions'
  | 'multi-section-recipe'
  | 'template-only'
  | 'typeScript-only'
  | 'style-only'
  | 'support-only'
  | 'partial-snippet';

export type EvidenceDisposition =
  | 'primary-grounding'
  | 'supporting-grounding'
  | 'capability-reference'
  | 'non-default'
  | 'excluded'
  | 'caution';

export interface SourceCompanionGroup {
  readonly groupId: string;
  readonly documentPath: string;
  readonly sectionId: string;
  readonly heading?: string;
  readonly headingPath: readonly string[];
  readonly sourceUnitIds: readonly string[];
  readonly roles: readonly SourceUnitRole[];
  readonly languages: readonly string[];
  readonly fileNameCandidates: readonly string[];
  readonly signalNames: readonly string[];
  readonly completeness: ExampleCompleteness;
  readonly disposition: EvidenceDisposition;
  readonly dispositionReasons: readonly string[];
}

export interface DocumentExampleSet {
  readonly exampleSetId: string;
  readonly documentPath: string;
  readonly rootSectionId: string;
  readonly rootHeading?: string;
  readonly rootHeadingPath: readonly string[];
  readonly childSectionIds: readonly string[];
  readonly sourceCompanionGroupIds: readonly string[];
  readonly roles: readonly SourceUnitRole[];
  readonly languages: readonly string[];
  readonly fileNameCandidates: readonly string[];
  readonly signalNames: readonly string[];
  readonly completeness: ExampleCompleteness;
  readonly disposition: EvidenceDisposition;
  readonly dispositionReasons: readonly string[];
}

export interface DocumentSemanticIndex {
  readonly documentPath: string;
  readonly sourceUnits: readonly SourceUnit[];
  readonly sourceCompanionGroups: readonly SourceCompanionGroup[];
  readonly exampleSets: readonly DocumentExampleSet[];
}

export interface CorpusSemanticIndex {
  readonly sourceUnits: readonly SourceUnit[];
  readonly sourceCompanionGroups: readonly SourceCompanionGroup[];
  readonly exampleSets: readonly DocumentExampleSet[];
  readonly dispositionCounts: Readonly<Record<EvidenceDisposition, number>>;
  readonly completenessCounts: Readonly<Record<ExampleCompleteness, number>>;
}
