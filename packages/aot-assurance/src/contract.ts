import type { PluginOption } from 'vite';

export type AssuranceLane = 'jit' | 'aot';
export type AssuranceScenario = 'g0' | 'hello-world';

export type EmissionFalsifier =
  | 'mutate-instruction'
  | 'restore-needs-compile'
  | 'drop-nested-definition';

export interface AotAdapterRequest {
  readonly fixtureRoot: string;
  readonly sourceRoot: string;
  readonly entryHtml: string;
  readonly falsifier?: EmissionFalsifier;
}

/**
 * Narrow integration seam implemented by the build-only AOT adapter. The
 * returned plugins are the complete AOT preset, including any conventions
 * bridge it needs. The assurance package deliberately does not assemble that
 * semantic pipeline itself.
 */
export interface AotAssuranceAdapter {
  readonly plugins: PluginOption;
  readEvidence(moduleGraph: readonly RenderedModuleEvidence[]): Promise<AotBuildEvidence>;
  dispose?(): Promise<void> | void;
}

export interface AotAssuranceAdapterModule {
  createAotAssuranceAdapter(request: AotAdapterRequest): Promise<AotAssuranceAdapter> | AotAssuranceAdapter;
}

export interface AotArtifactReceipt {
  readonly generation: string;
  readonly sourceId: string;
  readonly moduleId: string;
  readonly definitionName: string;
  readonly needsCompile: false;
  readonly sourceMap: {
    readonly generatedFile: string;
    readonly sources: readonly string[];
  };
}

export interface AotBuildEvidence {
  /** There must be exactly one semantic application analysis for this build. */
  readonly analysisCount: number;
  readonly artifacts: readonly AotArtifactReceipt[];
}

export interface RenderedModuleEvidence {
  readonly chunkFile: string;
  readonly moduleId: string;
  readonly renderedLength: number;
  readonly renderedExports: readonly string[];
}

export interface RuntimeProbeSnapshot {
  readonly compilerCompile: number;
  readonly compilerCompileSpread: number;
  readonly compilerNullTemplateBypass: number;
  readonly parserParse: number;
}

export interface DomAttributeTranscript {
  readonly name: string;
  readonly value: string;
}

export type DomNodeTranscript =
  | {
    readonly kind: 'element';
    readonly name: string;
    readonly namespace: string | null;
    readonly attributes: readonly DomAttributeTranscript[];
    readonly children: readonly DomNodeTranscript[];
  }
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'comment'; readonly value: string };

export interface LiveElementTranscript {
  readonly id: string;
  readonly value?: string;
  readonly checked?: boolean;
  readonly selectedIndex?: number;
}

interface ApplicationObservationBase {
  readonly live: readonly LiveElementTranscript[];
  readonly focus: string | null;
}

export interface G0ApplicationObservation extends ApplicationObservationBase {
  readonly kind: 'g0';
  readonly dom: readonly DomNodeTranscript[];
  readonly model: unknown;
  readonly events: readonly string[];
  readonly browserStructure: {
    readonly parentId: string | null;
    readonly nextElementId: string | null;
  };
  readonly svgNamespace: string | null;
}

export interface HelloWorldApplicationObservation extends ApplicationObservationBase {
  readonly kind: 'hello-world';
  readonly model: HelloWorldObservation;
}

export type ApplicationObservation = G0ApplicationObservation | HelloWorldApplicationObservation;

export interface CheckpointTranscript {
  readonly label: string;
  readonly observation: ApplicationObservation;
}

export interface SemanticTranscript {
  readonly checkpoints: readonly CheckpointTranscript[];
  readonly teardownEvents: readonly string[] | null;
  readonly console: readonly string[];
  readonly pageErrors: readonly string[];
}

export interface LaneTranscript {
  readonly lane: AssuranceLane;
  readonly semantic: SemanticTranscript;
  readonly probes: RuntimeProbeSnapshot | null;
}

export interface LaneBuildReceipt {
  readonly lane: AssuranceLane;
  readonly durationMs: number;
  readonly moduleGraph: readonly RenderedModuleEvidence[];
}

export interface AssuranceReceipt {
  readonly scenario: AssuranceScenario;
  readonly fixture: string;
  readonly builds: readonly [LaneBuildReceipt, LaneBuildReceipt];
  readonly transcripts: readonly [LaneTranscript, LaneTranscript];
  readonly aot: AotBuildEvidence;
}

export interface HelloWorldCardObservation {
  readonly label: string;
  readonly description: string;
  readonly sku: string;
  readonly stockText: string;
  readonly selected: boolean;
  readonly progressWidth: string;
  readonly svgLabel: string | null;
  readonly svgNamespace: string | null;
  readonly circleStrokeWidth: string;
  readonly foreignObjectWidth: string;
  readonly foreignObjectHtmlNamespace: string | null;
}

export interface HelloWorldObservation {
  readonly heading: string;
  readonly searchValue: string;
  readonly onlyInStock: boolean;
  readonly headerProgress: string;
  readonly preview: {
    readonly classes: readonly string[];
    readonly title: string | null;
    readonly displayTone: string | null;
    readonly name: string;
    readonly description: string;
    readonly stockLabel: string;
    readonly badgeClasses: readonly string[];
    readonly badgeText: string;
  };
  readonly cards: readonly HelloWorldCardObservation[];
  readonly emptyMessage: string | null;
}
