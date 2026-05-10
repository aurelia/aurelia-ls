import { BasisKind } from "../basis.js";
import {
  ContinuationKind,
  ContinuationPriority,
  type Continuation,
} from "../continuation.js";
import {
  evidenceArray,
  type Evidence,
} from "../evidence.js";
import type { Inquiry } from "../inquiry.js";
import { LensId } from "../lens.js";
import { LocusKind, type SourceRange } from "../locus.js";
import { NavigationPlane, NavigationRelation } from "../navigation.js";
import { route } from "./framework-support.js";

export interface ProjectionContinuationOptions {
  readonly lens?: LensId;
  readonly filters?: Inquiry["filters"];
  readonly evidence?: Evidence | readonly Evidence[];
  readonly basis?: readonly BasisKind[];
  readonly priority?: ContinuationPriority;
  readonly summary?: string;
}

export interface NextPageContinuationOptions {
  readonly priority?: ContinuationPriority;
  readonly summary?: string;
}

export interface RowContinuationRouteOptions {
  readonly priority?: ContinuationPriority;
  readonly basis?: readonly BasisKind[];
  readonly budget?: Inquiry["budget"];
}

export interface RowEffectContinuationOptions
  extends RowContinuationRouteOptions {
  readonly filters?: Inquiry["filters"];
}

export interface RowCallSiteContinuationOptions
  extends RowContinuationRouteOptions {
  readonly filters?: Inquiry["filters"];
}

/** Stable framework lens/projection endpoint before row-local filters are applied. */
export interface FrameworkRouteEndpointInit {
  /** Stable endpoint id used by route topology rows. */
  readonly id: string;
  /** Lens that owns this endpoint. */
  readonly lens: LensId;
  /** Projection that materializes this endpoint. */
  readonly projection: string;
  /** Optional default locus for route instances that should not inherit caller locus. */
  readonly locus?: Inquiry["locus"];
  /** Compact explanation of the endpoint's semantic role. */
  readonly summary: string;
}

/** Declared target endpoint that can materialize row-local route instances. */
export class FrameworkRouteEndpoint {
  readonly id: string;
  readonly lens: LensId;
  readonly projection: string;
  readonly locus?: Inquiry["locus"];
  readonly summary: string;

  constructor(init: FrameworkRouteEndpointInit) {
    this.id = init.id;
    this.lens = init.lens;
    this.projection = init.projection;
    this.locus = init.locus;
    this.summary = init.summary;
  }

  /** Build a target inquiry while preserving caller subject and budget context. */
  toInquiry(
    inquiry: Inquiry,
    instance: FrameworkRouteInstanceTargetInit = {},
  ): Inquiry {
    return {
      ...inquiry,
      lens: this.lens,
      locus: instance.locus ?? this.locus ?? inquiry.locus,
      projection: this.projection,
      ...(instance.filters === undefined ? {} : { filters: instance.filters }),
      page: undefined,
    };
  }
}

/** Row-local target overrides for one semantic route instance. */
export interface FrameworkRouteInstanceTargetInit {
  /** Target filters computed from the row being navigated. */
  readonly filters?: Inquiry["filters"];
  /** Optional target locus override. */
  readonly locus?: Inquiry["locus"];
}

/** Stable semantic route declaration before row-local identity and filters are applied. */
export interface FrameworkSemanticRouteSpecInit {
  /** Stable domain route id. */
  readonly id: string;
  /** Generic navigation grammar route this domain route follows. */
  readonly navigationSpecId: string;
  /** Declared target endpoint. */
  readonly target: FrameworkRouteEndpoint;
  /** Exact route relation being followed. */
  readonly relation: NavigationRelation;
  /** Basis kinds that support this route. */
  readonly basis: readonly BasisKind[];
  /** Route topology summary, independent from row-local rationale. */
  readonly summary: string;
  /** Default priority for route instances. */
  readonly priority?: ContinuationPriority;
  /** Continuation kind override for unusual semantic routes. */
  readonly kind?: ContinuationKind;
}

/** Row-local instantiation of a declared semantic route. */
export interface FrameworkSemanticRouteInstanceInit
  extends FrameworkRouteInstanceTargetInit {
  /** Answer-local continuation id. */
  readonly id: string;
  /** Agent-facing reason to offer this route for this row. */
  readonly rationale: string;
  /** Optional route-claim summary when it should differ from the declared route summary. */
  readonly routeSummary?: string;
  /** Priority override for this row-local route. */
  readonly priority?: ContinuationPriority;
  /** Continuation kind override for this row-local route. */
  readonly kind?: ContinuationKind;
}

/** Declared framework semantic route topology. */
export class FrameworkSemanticRouteSpec {
  readonly id: string;
  readonly navigationSpecId: string;
  readonly target: FrameworkRouteEndpoint;
  readonly relation: NavigationRelation;
  readonly basis: readonly BasisKind[];
  readonly summary: string;
  readonly priority?: ContinuationPriority;
  readonly kind?: ContinuationKind;

  constructor(init: FrameworkSemanticRouteSpecInit) {
    this.id = init.id;
    this.navigationSpecId = init.navigationSpecId;
    this.target = init.target;
    this.relation = init.relation;
    this.basis = init.basis;
    this.summary = init.summary;
    this.priority = init.priority;
    this.kind = init.kind;
  }

  /** Materialize this declared route as a row-local continuation. */
  continuation(
    inquiry: Inquiry,
    instance: FrameworkSemanticRouteInstanceInit,
    evidence?: Evidence | readonly Evidence[],
  ): Continuation {
    return {
      id: instance.id,
      kind: instance.kind ?? this.kind ?? this.kindFor(inquiry),
      priority: instance.priority ?? this.priority ?? ContinuationPriority.Primary,
      rationale: instance.rationale,
      inquiry: this.target.toInquiry(inquiry, instance),
      ...(evidence === undefined
        ? {}
        : { evidence: Array.isArray(evidence) ? evidence : [evidence] }),
      route: {
        specId: this.navigationSpecId,
        semanticRouteId: this.id,
        plane: NavigationPlane.Semantic,
        relation: this.relation,
        basis: this.basis,
        summary: instance.routeSummary ?? this.summary,
      },
    };
  }

  private kindFor(inquiry: Inquiry): ContinuationKind {
    return this.target.lens === inquiry.lens
      ? ContinuationKind.SwitchProjection
      : ContinuationKind.SwitchLens;
  }
}

export interface FrameworkSemanticRouteBuilderInstanceInit
  extends Omit<FrameworkSemanticRouteInstanceInit, "id"> {}

/** Binds row-local continuation context so call sites only choose route, suffix, and filters. */
export class FrameworkSemanticRouteBuilder {
  readonly #inquiry: Inquiry;
  readonly #idPrefix: string;
  readonly #index: number;
  readonly #evidence?: Evidence | readonly Evidence[];

  constructor(
    inquiry: Inquiry,
    idPrefix: string,
    index: number,
    evidence?: Evidence | readonly Evidence[],
  ) {
    this.#inquiry = inquiry;
    this.#idPrefix = idPrefix;
    this.#index = index;
    this.#evidence = evidence;
  }

  continuation(
    routeSpec: FrameworkSemanticRouteSpec,
    idSuffix: string,
    instance: FrameworkSemanticRouteBuilderInstanceInit,
  ): Continuation {
    return routeSpec.continuation(
      this.#inquiry,
      {
        id: `${this.#idPrefix}:${idSuffix}:${this.#index}`,
        ...instance,
      },
      this.#evidence,
    );
  }
}

/** Binds repeated source/checker inspection moves for one framework answer row. */
export class FrameworkRowContinuationBuilder {
  readonly #inquiry: Inquiry;
  readonly #idPrefix: string;
  readonly #index: number;
  readonly #evidence?: Evidence | readonly Evidence[];

  constructor(
    inquiry: Inquiry,
    idPrefix: string,
    index: number,
    evidence?: Evidence | readonly Evidence[],
  ) {
    this.#inquiry = inquiry;
    this.#idPrefix = idPrefix;
    this.#index = index;
    this.#evidence = evidence;
  }

  /** Inspect exact source text behind this row. */
  source(
    idSuffix: string,
    source: SourceRange,
    rationale: string,
    routeSummary: string,
    options: RowContinuationRouteOptions = {},
  ): Continuation {
    return this.#sourceRangeContinuation({
      idSuffix,
      kind: ContinuationKind.InspectEvidence,
      priority: options.priority ?? ContinuationPriority.Primary,
      lens: LensId.TsSource,
      projection: "text",
      source,
      rationale,
      budget: options.budget,
      plane: NavigationPlane.Inspection,
      relation: NavigationRelation.SourceFor,
      basis: options.basis ?? [BasisKind.SourceText, BasisKind.TypeScriptChecker],
      routeSummary,
    });
  }

  /** Inspect TypeChecker facts for the row source range. */
  typeFacts(
    idSuffix: string,
    source: SourceRange,
    rationale: string,
    routeSummary: string,
    options: RowContinuationRouteOptions = {},
  ): Continuation {
    return this.#sourceRangeContinuation({
      idSuffix,
      kind: ContinuationKind.SwitchLens,
      priority: options.priority ?? ContinuationPriority.Secondary,
      lens: LensId.TsType,
      projection: "facts",
      source,
      rationale,
      budget: options.budget,
      plane: NavigationPlane.Inspection,
      relation: NavigationRelation.TypeFactsFor,
      basis: options.basis ?? [BasisKind.TypeScriptChecker],
      routeSummary,
    });
  }

  /** Inspect exact TypeChecker call-site facts for the row source range. */
  callSites(
    idSuffix: string,
    source: SourceRange,
    rationale: string,
    routeSummary: string,
    options: RowCallSiteContinuationOptions = {},
  ): Continuation {
    return this.#sourceRangeContinuation({
      idSuffix,
      kind: ContinuationKind.SwitchLens,
      priority: options.priority ?? ContinuationPriority.Secondary,
      lens: LensId.TsType,
      projection: "call-sites",
      source,
      rationale,
      filters: options.filters,
      budget: options.budget,
      plane: NavigationPlane.Flow,
      relation: NavigationRelation.CallSitesOf,
      basis: options.basis ?? [BasisKind.TypeScriptChecker, BasisKind.SourceText],
      routeSummary,
    });
  }

  /** Trace static evaluator effects rooted at the row source range. */
  effects(
    idSuffix: string,
    source: SourceRange,
    rationale: string,
    routeSummary: string,
    options: RowEffectContinuationOptions = {},
  ): Continuation {
    return this.#sourceRangeContinuation({
      idSuffix,
      kind: ContinuationKind.SwitchLens,
      priority: options.priority ?? ContinuationPriority.Primary,
      lens: LensId.FrameworkEvaluator,
      projection: "effects",
      source,
      rationale,
      filters: options.filters,
      budget: options.budget,
      plane: NavigationPlane.Semantic,
      relation: NavigationRelation.EffectsOf,
      basis:
        options.basis ?? [
          BasisKind.StaticEvaluator,
          BasisKind.TypeScriptChecker,
          BasisKind.SourceText,
        ],
      routeSummary,
    });
  }

  #sourceRangeContinuation(init: {
    readonly idSuffix: string;
    readonly kind: ContinuationKind;
    readonly priority: ContinuationPriority;
    readonly lens: LensId;
    readonly projection: string;
    readonly source: SourceRange;
    readonly rationale: string;
    readonly filters?: Inquiry["filters"];
    readonly budget?: Inquiry["budget"];
    readonly plane: NavigationPlane;
    readonly relation: NavigationRelation;
    readonly basis: readonly BasisKind[];
    readonly routeSummary: string;
  }): Continuation {
    return {
      id: `${this.#idPrefix}:${init.idSuffix}:${this.#index}`,
      kind: init.kind,
      priority: init.priority,
      rationale: init.rationale,
      inquiry: {
        lens: init.lens,
        locus: { kind: LocusKind.SourceRange, range: init.source },
        projection: init.projection,
        filters: init.filters,
        budget: init.budget ?? this.#inquiry.budget,
      },
      evidence: this.#evidence === undefined ? undefined : evidenceArray(this.#evidence),
      route: route(
        init.plane,
        init.relation,
        init.basis,
        init.routeSummary,
      ),
    };
  }
}

export function projectionContinuation(
  inquiry: Inquiry,
  id: string,
  projection: string,
  rationale: string,
  options: ProjectionContinuationOptions = {},
): Continuation {
  const targetLens = options.lens ?? inquiry.lens;
  return {
    id,
    kind:
      targetLens === inquiry.lens
        ? ContinuationKind.SwitchProjection
        : ContinuationKind.SwitchLens,
    priority: options.priority ?? ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      lens: targetLens,
      projection,
      filters: options.filters ?? inquiry.filters,
      page: undefined,
    },
    evidence: options.evidence === undefined ? undefined : evidenceArray(options.evidence),
    route: route(
      NavigationPlane.Semantic,
      NavigationRelation.ProjectionOf,
      options.basis ?? [BasisKind.AtlasContract],
      options.summary ?? rationale,
    ),
  };
}

export function nextPageContinuation(
  inquiry: Inquiry,
  id: string,
  rationale: string,
  nextOffset: number,
  limit: number,
  options: NextPageContinuationOptions = {},
): Continuation {
  return {
    id,
    kind: ContinuationKind.NextPage,
    priority: options.priority ?? ContinuationPriority.Primary,
    rationale,
    inquiry: {
      ...inquiry,
      page: { size: limit, cursor: String(nextOffset) },
    },
    route: route(
      NavigationPlane.Addressing,
      NavigationRelation.NextPageOf,
      [],
      options.summary ?? rationale,
    ),
  };
}
