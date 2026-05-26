import type { AppBuilderAureliaLoweringSelection } from './aurelia-lowering-option.js';
import type { SourcePatternUsePolicy } from '../source-plan/source-plan.js';

/** Size and ambition of the source seed the caller wants to generate. */
export enum AppBuilderSeedScale {
  /** Smallest useful runnable source; optimized for learning and very low token use. */
  Minimal = 'minimal',
  /** Clean starter that can grow without immediately refactoring its first boundaries. */
  Starter = 'starter',
  /** Production-shaped foundation with explicit state/service/domain seams. */
  ProductionFoundation = 'production-foundation',
  /** Large-app foundation with feature boundaries, routing, domain composition, and extension seams. */
  LargeAppFoundation = 'large-app-foundation',
}

/** How data should enter the generated starter. */
export enum AppBuilderDataPosture {
  /** No domain data beyond static text or shell state. */
  NoData = 'no-data',
  /** Small inline seed data for a runnable starter without pretending to be real integration. */
  SampleData = 'sample-data',
  /** App-owned in-memory state as the first source of truth. */
  InMemoryState = 'in-memory-state',
  /** Service boundary with local stub implementation and real async/loading shape. */
  ServiceStub = 'service-stub',
  /** External API boundary expected to be supplied or adapted by the caller. */
  RealApiBoundary = 'real-api-boundary',
}

/** Depth of app/domain architecture the starter should introduce. */
export enum AppBuilderArchitectureDepth {
  /** One component/view-model owns the useful behavior. */
  SingleComponent = 'single-component',
  /** DI-resolved state class owns app state without a separate service layer. */
  StateClass = 'state-class',
  /** Ordinary domain classes and composed state are modeled explicitly. */
  DomainComposition = 'domain-composition',
  /** State/domain model delegates loading or submission to a service boundary. */
  ServiceBacked = 'service-backed',
  /** Plugin-backed state or infrastructure participates in the source shape. */
  PluginBacked = 'plugin-backed',
}

/** Routing ambition used for menu bias; concrete area navigation lives in Aurelia lowering. */
export enum AppBuilderRoutingDepth {
  /** No router; app starts at a single component tree. */
  None = 'none',
  /** Top-level route table with one app-shell viewport. */
  SimpleRoutes = 'simple-routes',
  /** Multiple route-driven feature areas may introduce child routes or nested viewports. */
  NestedRoutes = 'nested-routes',
}

/** Presentation amount the source seed is allowed to include. */
export enum AppBuilderPresentationPosture {
  /** Functional source with minimal styling and no reference presentation. */
  UnstyledFunctional = 'unstyled-functional',
  /** Small amount of generic polish that should not define the app domain. */
  BasicPolished = 'basic-polished',
  /** Dense operational UI shape for repeated work and scanning. */
  OperationalDense = 'operational-dense',
  /** Rich example presentation that belongs to fixtures or explicit demo requests. */
  ReferenceDemo = 'reference-demo',
}

/** File and boundary economy for the generated starter. */
export enum AppBuilderCodeEconomy {
  /** Fewest files that still express the requested behavior clearly. */
  FewestFiles = 'fewest-files',
  /** Default balance between low token use and scalable ownership boundaries. */
  Balanced = 'balanced',
  /** More explicit files/classes because future growth matters more than initial compactness. */
  ExplicitBoundaries = 'explicit-boundaries',
}

/** Stable profile for shaping the generated seed before intent-specific choices are offered. */
export enum AppBuilderSeedProfileId {
  /** Tiny runnable starter with minimal architecture and minimal data. */
  MinimalRunnable = 'minimal-runnable',
  /** Default clean Aurelia starter with enough structure to grow. */
  CleanStarter = 'clean-starter',
  /** Starter with state/domain/service seams and realistic async behavior. */
  ServiceBackedFoundation = 'service-backed-foundation',
  /** Larger app foundation for multiple features and explicit long-term boundaries. */
  LargeAppFoundation = 'large-app-foundation',
}

/** Axis bundle used by menus and lowering policy before app-specific domain slots are supplied. */
export interface AppBuilderSeedProfileAxes {
  readonly scale: AppBuilderSeedScale;
  readonly dataPosture: AppBuilderDataPosture;
  readonly architectureDepth: AppBuilderArchitectureDepth;
  readonly routingDepth: AppBuilderRoutingDepth;
  readonly presentationPosture: AppBuilderPresentationPosture;
  readonly codeEconomy: AppBuilderCodeEconomy;
}

/** Profile descriptor that turns "how big/deep should the seed be?" into typed menu policy. */
export interface AppBuilderSeedProfileDescriptor {
  readonly id: AppBuilderSeedProfileId;
  readonly title: string;
  readonly summary: string;
  readonly axes: AppBuilderSeedProfileAxes;
  readonly sourcePolicy: SourcePatternUsePolicy;
  readonly defaultAureliaLowering: AppBuilderAureliaLoweringSelection;
}
