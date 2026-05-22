import type { AuthoringOperationKind } from './ontology.js';
import type { AuthoringProjectToolingPlan } from './package-tooling.js';

/** Source language family for an authoring edit artifact. */
export type AuthoringSourceLanguage =
  | 'typescript'
  | 'html'
  | 'json'
  | 'css'
  | 'text';

/** App-topology role a source file plays after the edit is applied. */
export type AuthoringSourceFileRole =
  | 'entrypoint'
  | 'root-component'
  | 'component'
  | 'template'
  | 'component-style'
  | 'global-style'
  | 'state-model'
  | 'domain-model'
  | 'service'
  | 'project-config'
  | 'other';

/** File-level edit shape before a host resolves conflicts or formatting. */
export type AuthoringSourceEditKind =
  | 'create'
  | 'replace'
  | 'upsert';

/** Who owns the concrete text in this source plan. */
export type AuthoringSourceTextAuthority =
  /** Semantic-runtime produced this as canonical recipe output. */
  | 'semantic-runtime-recipe'
  /** Semantic-runtime produced this as a complete reference instantiation of a reusable pattern. */
  | 'semantic-runtime-reference-instantiation'
  /** The host or AI must produce the concrete text from semantic contracts. */
  | 'host-owned'
  /** A human/operator supplied the exact text. */
  | 'operator-supplied';

/** Conflict policy is explicit so edit application never hides overwrite behavior. */
export type AuthoringSourceConflictPolicy =
  | 'must-not-exist'
  | 'replace-generated-file'
  | 'host-decides';

/** Formatting policy is explicit because semantic-runtime should not silently own project style. */
export type AuthoringSourceFormattingPolicy =
  | 'recipe-baseline'
  | 'host-formatter'
  | 'operator-decides';

/** Package/build policy remains separate from source files. */
export type AuthoringPackageToolingPolicy =
  | 'not-modeled'
  | 'host-owned'
  | 'recipe-baseline';

/** How recipe-owned source text relates to the caller's actual domain model. */
export type AuthoringSourceDomainModelPolicy =
  /** The source text is an app-shell or framework pattern with no meaningful sample domain nouns. */
  | 'domain-neutral'
  /** The source text already reflects caller-supplied domain identity and can be used as a domain-specific start. */
  | 'caller-applied'
  /** The source text is a complete reference instantiation; callers should rename/remap its sample domain. */
  | 'reference-instantiation'
  /** The host or AI must provide the concrete domain model before source text should be emitted as app code. */
  | 'host-domain-required';

/** Who owns presentation decisions such as layout, spacing, density, and visual tokens. */
export type AuthoringSourceStylePolicy =
  /** No authored style surface is present. */
  | 'none'
  /** Only structural style needed to make the framework/API pattern readable is modeled. */
  | 'structural-baseline'
  /** Concrete CSS is a reference fixture/example and should be adapted or replaced by the host. */
  | 'reference-presentation'
  /** The host owns all visual styling decisions. */
  | 'host-owned';

/** What kind of artifact this source pattern should be treated as by public authoring clients. */
export type AuthoringSourcePatternRole =
  /** Public recipe output that is intended to be a recommendable starting point for app source. */
  | 'recommendable-recipe'
  /** Focused reusable capability example that should be merged into another recipe rather than scaffolded wholesale. */
  | 'pattern-reference'
  /** Complete concrete scenario used for transfer/verification; adapt nouns, data, and presentation before app use. */
  | 'scenario-reference'
  /** Dense analyzer-pressure artifact; useful for semantic-runtime coverage but not a public authoring recommendation. */
  | 'stress-fixture';

/** How concrete records/defaults inside a source pattern relate to caller data. */
export type AuthoringSourceDataPolicy =
  /** No seed data or mock records are part of the pattern. */
  | 'none'
  /** Data shape is a service/state contract and caller data should arrive through that boundary. */
  | 'service-contract'
  /** Small generated seed records follow caller source parameters and exist only to make the starter runnable. */
  | 'starter-sample-data'
  /** Small synthetic records are included only to make the scenario runnable and analyzable. */
  | 'synthetic-reference-data'
  /** Caller or host must provide the data shape before source should be emitted as application code. */
  | 'caller-supplied';

/** Why the source text has its current verbosity/density. */
export type AuthoringSourceCodeEconomyPolicy =
  /** Code is intended to be terse production-style Aurelia. */
  | 'production-terse'
  /** Code is explicit for teaching or transfer and may be trimmed in a real app. */
  | 'teaching-explicit'
  /** Code is complete enough to reopen and verify a scenario end-to-end. */
  | 'reference-complete'
  /** Code is deliberately dense to pressure semantic-runtime rather than to model user-facing style. */
  | 'pressure-rich';

/** Public client action for source text carried by a source pattern. */
export type AuthoringSourcePatternUsePolicy =
  /** The concrete source is intended to be used as the caller's starting scaffold. */
  | 'apply-as-source-start'
  /** The concrete source proves a scenario, but caller-domain code must adapt nouns, data, copy, and presentation. */
  | 'adapt-before-emitting'
  /** The concrete source is a companion capability reference; merge relevant pieces into a primary plan. */
  | 'merge-selectively'
  /** The concrete source is semantic-runtime pressure only and should not be emitted as user app code. */
  | 'analysis-pressure-only';

/** Reusable adaptation slot exposed by a source pattern. */
export type AuthoringSourcePatternParameterKind =
  /** Primary domain class or aggregate that the reference instantiation names concretely. */
  | 'domain-entity'
  /** Caller-owned member/field schema for forms, tables, cards, details, validation, and derived labels. */
  | 'field-schema'
  /** Collection, option set, action set, or repeated domain surface that must move with the entity model. */
  | 'domain-collection'
  /** Scalar identity used for current-object selection independent of any router involvement. */
  | 'selection-identity'
  /** Route path/query/fragment identity that must stay aligned with router config and route-context reads. */
  | 'route-identity'
  /** User-visible labels, titles, and navigation copy that belong to the caller's feature vocabulary. */
  | 'feature-copy'
  /** Inline records or defaults included to make the reference instantiation runnable and analyzable. */
  | 'sample-data'
  /** CSS, layout names, or visual tokens included as reference presentation rather than recipe ontology. */
  | 'presentation';

/** Expected caller value shape for a source-pattern parameter. */
export type AuthoringSourcePatternParameterValueShape =
  /** Human domain noun phrase such as "Support Ticket"; recipe code may derive identifiers from it. */
  | 'domain-title'
  /** Lower/upper source identifier member, variable, method, property, or scalar ID name. */
  | 'source-member-name'
  /** Router path text such as "support-tickets" or "support-tickets/:supportTicketId". */
  | 'route-path'
  /** Router parameter identifier such as "supportTicketId". */
  | 'route-parameter-name'
  /** User-visible route title or navigation label. */
  | 'route-title'
  /** Comma-separated static route section labels such as "Account, Billing, API Keys". */
  | 'route-section-list'
  /** Comma-separated workflow/wizard step labels such as "Details, Billing, Review". */
  | 'workflow-step-list'
  /** Semicolon-separated named workflow section fields such as `Shipping: address; Payment: payment method select`. */
  | 'workflow-section-field-schema-list'
  /** Comma-separated field/control descriptors that still need a recipe-owned schema model before full source rewriting. */
  | 'field-schema-list'
  /** Semicolon-separated option groups such as `roles: admin, editor; permissions: read, write`. */
  | 'option-schema-list'
  /** Human summary of option sets, repeated collections, or domain-owned action groups. */
  | 'domain-collection-summary'
  /** Human-visible copy or label text owned by the caller's feature vocabulary. */
  | 'copy-text'
  /** Human summary of synthetic records or defaults included only to make a reference instantiation runnable. */
  | 'sample-data-summary'
  /** Human summary of CSS/layout/tokens that should be adapted to the host design surface. */
  | 'presentation-summary'
  /** Deliberately loose value used while a more specific source-pattern parameter is being designed. */
  | 'freeform-summary';

/** Reusable semantic source-pattern capability that may appear in many recipes or fixtures. */
export type AuthoringSourcePatternModuleKind =
  /** Root app source, entrypoint, root component, or external template shell. */
  | 'app-shell'
  /** Convention-based resource admission instead of explicit component metadata. */
  | 'resource-convention'
  /** RouterConfiguration, route config, navigation links, or au-viewport shell wiring. */
  | 'router-admission'
  /** RouteContext, route parameters, query values, fragments, or route-owned selection handoff. */
  | 'route-context'
  /** DI-resolved state/service/model boundary visible to templates or components. */
  | 'di-boundary'
  /** Ordinary class state composed from child state/model instances. */
  | 'state-composition'
  /** Service/repository boundary owned by state for loading or submission side effects. */
  | 'service-boundary'
  /** Caller domain model, entity type, value object, or derived domain getter. */
  | 'domain-model'
  /** Native input/select/checked/matcher/value binding channels. */
  | 'form-value-channel'
  /** Search, filter, sort, pagination, or selection controls over a collection. */
  | 'collection-controls'
  /** Repeated rows/cards/lists and item-scope template-controller handoff. */
  | 'list-rendering'
  /** Scalar or object identity boundary for selecting a current domain item. */
  | 'selection-boundary'
  /** Parent-to-child custom-element handoff through bindables, capture/spread, or local object APIs. */
  | 'component-boundary'
  /** If/repeat/switch/promise template-controller semantics intentionally exercised by source. */
  | 'template-controller'
  /** Class/style binding channels, not broad design-system ownership. */
  | 'style-binding'
  /** Plugin configuration such as i18n, validation-html, router, or state. */
  | 'plugin-integration'
  /** Dynamic component/template/model composition through au-compose. */
  | 'dynamic-composition'
  /** @aurelia/state store, action, and state binding-command semantics. */
  | 'state-store';

export interface AuthoringSourcePatternModule {
  readonly key: string;
  readonly kind: AuthoringSourcePatternModuleKind;
  readonly title: string;
  readonly summary: string;
}

/** Parameter cluster that should be considered together when adapting a reference instantiation. */
export interface AuthoringSourcePatternAdaptationGroup {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly parameterKeys: readonly string[];
}

/** How far semantic-runtime can currently carry a source-pattern parameter into emitted artifacts. */
export type AuthoringSourcePatternParameterApplicationPolicy =
  /** The parameter is a marker for AI/host adaptation; semantic-runtime does not rewrite source for it yet. */
  | 'advisory-only'
  /** The parameter has a recipe-owned source application that changes generated source text. */
  | 'source-text-input';

/** Outcome for a caller-supplied source-pattern value on a recipe-plan request. */
export type AuthoringSourcePatternParameterApplicationState =
  /** The value matched a parameter whose policy lets semantic-runtime apply it to this source plan. */
  | 'applied-to-source-plan'
  /** The value matched a source-applicable parameter, but the built source plan did not reflect the requested value. */
  | 'not-applied-to-source-plan'
  /** The value matched an advisory marker; the host/AI must adapt concrete source manually. */
  | 'advisory-only'
  /** The value named no parameter on the selected source pattern. */
  | 'unknown-parameter';

export interface AuthoringSourcePatternParameter {
  readonly key: string;
  readonly kind: AuthoringSourcePatternParameterKind;
  readonly applicationPolicy: AuthoringSourcePatternParameterApplicationPolicy;
  readonly valueShape: AuthoringSourcePatternParameterValueShape;
  readonly title: string;
  readonly defaultValue: string | null;
  readonly summary: string;
}

export interface AuthoringSourcePatternParameterValue {
  readonly key: string;
  readonly value: string;
}

/** Reusable source pattern metadata, separate from a particular fixture/default instantiation. */
export class AuthoringSourcePattern {
  readonly kind = 'authoring-source-pattern' as const;

  constructor(
    readonly key: string,
    readonly title: string,
    readonly summary: string,
    readonly role: AuthoringSourcePatternRole,
    readonly domainModelPolicy: AuthoringSourceDomainModelPolicy,
    readonly stylePolicy: AuthoringSourceStylePolicy,
    readonly dataPolicy: AuthoringSourceDataPolicy,
    readonly codeEconomyPolicy: AuthoringSourceCodeEconomyPolicy,
    readonly adaptationNotes: readonly string[],
    readonly parameters: readonly AuthoringSourcePatternParameter[] = [],
    readonly modules: readonly AuthoringSourcePatternModule[] = [],
    readonly adaptationGroups: readonly AuthoringSourcePatternAdaptationGroup[] = [],
  ) {}
}

export function sourcePatternUsePolicy(
  pattern: Pick<AuthoringSourcePattern, 'role' | 'domainModelPolicy' | 'stylePolicy' | 'dataPolicy' | 'codeEconomyPolicy'>,
): AuthoringSourcePatternUsePolicy {
  if (pattern.role === 'stress-fixture' || pattern.codeEconomyPolicy === 'pressure-rich') {
    return 'analysis-pressure-only';
  }
  if (pattern.role === 'pattern-reference') {
    return 'merge-selectively';
  }
  if (
    pattern.role === 'scenario-reference'
    || pattern.domainModelPolicy === 'reference-instantiation'
    || pattern.stylePolicy === 'reference-presentation'
    || pattern.dataPolicy === 'synthetic-reference-data'
    || pattern.codeEconomyPolicy === 'reference-complete'
  ) {
    return 'adapt-before-emitting';
  }
  return 'apply-as-source-start';
}

export function sourcePatternUseSummary(
  pattern: Pick<AuthoringSourcePattern, 'role' | 'domainModelPolicy' | 'stylePolicy' | 'dataPolicy' | 'codeEconomyPolicy'>,
): string {
  switch (sourcePatternUsePolicy(pattern)) {
    case 'apply-as-source-start':
      return 'Concrete source is a recommendable starting scaffold unless an existing app already owns that structure.';
    case 'adapt-before-emitting':
      return 'Concrete source is transfer material; adapt caller domain names, data defaults, copy, and presentation before emitting app code.';
    case 'merge-selectively':
      return 'Concrete source is a companion capability reference; merge only the relevant modules and semantic promises into the primary plan.';
    case 'analysis-pressure-only':
      return 'Concrete source is analyzer pressure and should not be emitted as public app code.';
  }
}

export function recipeSourcePattern(
  key: string,
  title: string,
  summary: string,
  domainModelPolicy: AuthoringSourceDomainModelPolicy,
  stylePolicy: AuthoringSourceStylePolicy,
  adaptationNotes: readonly string[] = [],
  parameters: readonly AuthoringSourcePatternParameter[] = [],
  modules: readonly AuthoringSourcePatternModule[] = [],
  adaptationGroups: readonly AuthoringSourcePatternAdaptationGroup[] = [],
  role: AuthoringSourcePatternRole = 'recommendable-recipe',
  dataPolicy: AuthoringSourceDataPolicy = 'none',
  codeEconomyPolicy: AuthoringSourceCodeEconomyPolicy = 'production-terse',
): AuthoringSourcePattern {
  return new AuthoringSourcePattern(
    key,
    title,
    summary,
    role,
    domainModelPolicy,
    stylePolicy,
    dataPolicy,
    codeEconomyPolicy,
    adaptationNotes,
    parameters,
    modules,
    adaptationGroups,
  );
}

export function domainNeutralSourcePattern(
  key: string,
  title: string,
  summary: string,
  stylePolicy: AuthoringSourceStylePolicy,
  adaptationNotes: readonly string[] = [],
  parameters: readonly AuthoringSourcePatternParameter[] = [],
  modules: readonly AuthoringSourcePatternModule[] = [],
  adaptationGroups: readonly AuthoringSourcePatternAdaptationGroup[] = [],
): AuthoringSourcePattern {
  return recipeSourcePattern(
    key,
    title,
    summary,
    'domain-neutral',
    stylePolicy,
    adaptationNotes,
    parameters,
    modules,
    adaptationGroups,
    'recommendable-recipe',
    'none',
    'production-terse',
  );
}

export function referenceInstantiationSourcePattern(
  key: string,
  title: string,
  summary: string,
  adaptationNotes: readonly string[],
  stylePolicy: AuthoringSourceStylePolicy = 'reference-presentation',
  parameters: readonly AuthoringSourcePatternParameter[] = [],
  modules: readonly AuthoringSourcePatternModule[] = [],
  adaptationGroups: readonly AuthoringSourcePatternAdaptationGroup[] = [],
): AuthoringSourcePattern {
  return recipeSourcePattern(
    key,
    title,
    summary,
    'reference-instantiation',
    stylePolicy,
    adaptationNotes,
    parameters,
    modules,
    adaptationGroups,
    'scenario-reference',
    'synthetic-reference-data',
    'reference-complete',
  );
}

export function sourcePatternParameter(
  key: string,
  kind: AuthoringSourcePatternParameterKind,
  title: string,
  defaultValue: string | null,
  summary: string,
  applicationPolicy: AuthoringSourcePatternParameterApplicationPolicy = 'advisory-only',
  valueShape: AuthoringSourcePatternParameterValueShape = defaultSourcePatternParameterValueShape(kind),
): AuthoringSourcePatternParameter {
  return {
    key,
    kind,
    applicationPolicy,
    valueShape,
    title,
    defaultValue,
    summary,
  };
}

function defaultSourcePatternParameterValueShape(
  kind: AuthoringSourcePatternParameterKind,
): AuthoringSourcePatternParameterValueShape {
  switch (kind) {
    case 'domain-entity':
      return 'domain-title';
    case 'selection-identity':
      return 'source-member-name';
    case 'route-identity':
      return 'route-path';
    case 'field-schema':
      return 'field-schema-list';
    case 'domain-collection':
      return 'domain-collection-summary';
    case 'feature-copy':
      return 'copy-text';
    case 'sample-data':
      return 'sample-data-summary';
    case 'presentation':
      return 'presentation-summary';
  }
}

export function sourcePatternModule(
  key: string,
  kind: AuthoringSourcePatternModuleKind,
  title: string,
  summary: string,
): AuthoringSourcePatternModule {
  return {
    key,
    kind,
    title,
    summary,
  };
}

export function sourcePatternAdaptationGroup(
  key: string,
  title: string,
  summary: string,
  parameterKeys: readonly string[],
): AuthoringSourcePatternAdaptationGroup {
  return {
    key,
    title,
    summary,
    parameterKeys,
  };
}

/** Concrete file text, when the authoring layer can produce it without another policy decision. */
export class AuthoringSourceText {
  readonly kind = 'authoring-source-text' as const;

  constructor(
    readonly text: string,
    readonly authority: AuthoringSourceTextAuthority,
  ) {}
}

/** Policy envelope for applying a source edit plan. */
export class AuthoringSourceEditPolicy {
  readonly kind = 'authoring-source-edit-policy' as const;

  constructor(
    readonly conflictPolicy: AuthoringSourceConflictPolicy,
    readonly formattingPolicy: AuthoringSourceFormattingPolicy,
    readonly packageToolingPolicy: AuthoringPackageToolingPolicy,
  ) {}
}

/** One file-level source artifact requested by an authoring plan. */
export class AuthoringSourceFileEdit {
  readonly kind = 'authoring-source-file-edit' as const;

  constructor(
    readonly path: string,
    readonly role: AuthoringSourceFileRole,
    readonly language: AuthoringSourceLanguage,
    readonly editKind: AuthoringSourceEditKind,
    readonly operationKind: AuthoringOperationKind | null,
    readonly text: AuthoringSourceText | null,
  ) {}
}

/** Source edit plan paired with a semantic authoring plan. */
export class AuthoringSourceEditPlan {
  readonly kind = 'authoring-source-edit-plan' as const;

  constructor(
    readonly rootDir: string,
    readonly policy: AuthoringSourceEditPolicy,
    readonly files: readonly AuthoringSourceFileEdit[],
    /** Structured package/typecheck artifacts that are applied beside app source, when the recipe owns them. */
    readonly projectTooling: AuthoringProjectToolingPlan | null = null,
    /** Pattern/default-instantiation metadata so clients do not mistake sample domains for recipe ontology. */
    readonly pattern: AuthoringSourcePattern | null = null,
  ) {}

  get hasCompleteFileText(): boolean {
    return this.files.every((file) => file.text != null)
      && (this.projectTooling?.hasCompleteFileText ?? true);
  }
}

export function recipeSourceEditPolicy(
  packageToolingPolicy: AuthoringPackageToolingPolicy = 'not-modeled',
): AuthoringSourceEditPolicy {
  return new AuthoringSourceEditPolicy(
    'must-not-exist',
    'recipe-baseline',
    packageToolingPolicy,
  );
}

export function recipeSourceFile(
  path: string,
  role: AuthoringSourceFileRole,
  language: AuthoringSourceLanguage,
  operationKind: AuthoringOperationKind,
  text: string,
  textAuthority: AuthoringSourceTextAuthority = 'semantic-runtime-recipe',
): AuthoringSourceFileEdit {
  return new AuthoringSourceFileEdit(
    path,
    role,
    language,
    'create',
    operationKind,
    new AuthoringSourceText(text, textAuthority),
  );
}

export function referenceInstantiationSourceFiles(
  files: readonly AuthoringSourceFileEdit[],
): readonly AuthoringSourceFileEdit[] {
  return files.map((file) => sourceFileWithTextAuthority(
    file,
    'semantic-runtime-reference-instantiation',
  ));
}

export function sourceFileWithTextAuthority(
  file: AuthoringSourceFileEdit,
  textAuthority: AuthoringSourceTextAuthority,
): AuthoringSourceFileEdit {
  return new AuthoringSourceFileEdit(
    file.path,
    file.role,
    file.language,
    file.editKind,
    file.operationKind,
    file.text == null
      ? null
      : new AuthoringSourceText(file.text.text, textAuthority),
  );
}
