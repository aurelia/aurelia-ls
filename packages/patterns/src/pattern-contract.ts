export interface AureliaPatternMenuItem {
  readonly patternId: string;
  readonly title: string;
  readonly summary: string;
}

export interface AureliaPatternExample {
  readonly patternId: string;
  readonly title: string;
  readonly guidance: PatternGuidance;
  readonly source: PatternSourcePayload;
  readonly adaptation: PatternAdaptationPayload;
  readonly support: PatternSupportPayload;
}

export interface PatternGuidance {
  readonly summary: string;
  readonly whenToUse: readonly string[];
  readonly whenNotToUse: readonly string[];
}

export interface PatternSourcePayload {
  readonly files: readonly PatternSourceFile[];
}

export interface PatternSourceFile {
  readonly path: string;
  readonly language: string;
  readonly contents: string;
}

export interface PatternAdaptationPayload {
  readonly assumptions: readonly PatternAssumption[];
  readonly handoffNotes: readonly PatternHandoffNote[];
}

export interface PatternAssumption {
  readonly summary: string;
}

export interface PatternHandoffNote {
  readonly summary: string;
  readonly action: string;
}

export interface PatternSupportPayload {
  readonly refs?: readonly PatternReference[];
  readonly followUp?: readonly PatternFollowUp[];
}

export interface PatternReference {
  readonly title: string;
  readonly url: string;
}

export interface PatternFollowUp {
  readonly tool: PatternSemanticRuntimeTool;
  readonly reason: string;
  readonly queryKind?: string;
}

export type PatternSemanticRuntimeTool =
  | 'aurelia_app_query'
  | 'aurelia_diagnostic_overview'
  | 'aurelia_router_overview'
  | 'aurelia_template_diagnostics';
