import type ts from 'typescript';
import type { OpenSeamKindKey } from '../kernel/vocabulary.js';
import type { RegistrationAdmissionObservation } from '../registration/registration-observation.js';
import type { AppTaskCallbackKind, AppTaskSlot } from './app-task.js';
import type {
  ConfigurationOptionContributionKind,
  ConfigurationOptionValueKind,
} from './configuration-option.js';
import type {
  ConfigurationSequenceKind,
  ConfigurationStepKind,
} from './configuration-sequence.js';

export const enum ConfigurationCarrierKind {
  /** `new Aurelia(...)` or an equivalent facade constructor path. */
  AureliaConstructor = 'aurelia-constructor',
  /** Static quick-start facade call such as `Aurelia.app(...)`. */
  AureliaStaticApp = 'aurelia-static-app',
  /** Static quick-start registration call such as `Aurelia.register(...)`. */
  AureliaStaticRegister = 'aurelia-static-register',
  /** Instance app-root admission call such as `au.app(...)`. */
  AureliaAppCall = 'aurelia-app-call',
  /** Instance app registration call such as `au.register(...)`. */
  AureliaRegisterCall = 'aurelia-register-call',
  /** Direct container registration call such as `container.register(...)`. */
  ContainerRegisterCall = 'container-register-call',
  /** AppTask slot factory call such as `AppTask.creating(...)`. */
  AppTaskFactoryCall = 'app-task-factory-call',
  /** Configuration customization call such as `StandardConfiguration.customize(...)`. */
  CustomizeCall = 'customize-call',
  /** Builder-style configuration method such as `StateDefaultConfiguration.init(...)` or `.withStore(...)`. */
  BuilderMethodCall = 'builder-method-call',
}

/** Explicit unresolved pressure from configuration recognition. */
export class ConfigurationRecognitionOpen {
  constructor(
    /** Kernel seam vocabulary key for the unresolved configuration pressure. */
    readonly openKind: OpenSeamKindKey,
    /** Short explanation suitable for IDE/tooling projections. */
    readonly summary: string,
    /** Source node where the unresolved pressure appeared. */
    readonly node: ts.Node,
  ) {}
}

/** Source-level resource/component target observed in an app-root config. */
export class ConfigurationTargetObservation {
  constructor(
    /** Best local name, literal preview, or property name for the target. */
    readonly localName: string | null,
    /** Source node that produced the target expression. */
    readonly node: ts.Node,
    /** Whether the node is an actual declaration/name site rather than only a reference expression. */
    readonly isDeclaration: boolean,
  ) {}
}

/** Source-level app-root config before kernel product materialization. */
export class AppRootConfigObservation {
  constructor(
    /** Expression that produced the root configuration. */
    readonly sourceNode: ts.Expression,
    /** Host expression or element locator, when directly visible. */
    readonly hostExpression: ts.Expression | null,
    /** Root component expression, when directly visible. */
    readonly component: ConfigurationTargetObservation | null,
    /** Actionless-form override, when the value closes to a boolean literal. */
    readonly allowActionlessForm: boolean | null,
    /** Strict-binding override, when the value closes to a boolean literal. */
    readonly strictBinding: boolean | null,
    /** SSR scope expression, preserved as a source address until a narrower model exists. */
    readonly ssrScopeExpression: ts.Expression | null,
    /** Unresolved config fields that should remain visible. */
    readonly openSeams: readonly ConfigurationRecognitionOpen[] = [],
  ) {}
}

/** Source-level callback value without executing or retaining the function object. */
export class ConfigurationCallbackObservation {
  constructor(
    /** Best local callback name, if source syntax exposes one. */
    readonly localName: string | null,
    /** Source node for the callback expression or declaration. */
    readonly node: ts.Node,
    /** Whether the callback has a declaration/name site. */
    readonly isDeclaration: boolean,
  ) {}
}

/** Source-level AppTask definition before kernel product materialization. */
export class AppTaskObservation {
  constructor(
    /** Lifecycle slot selected by `AppTask.*(...)`. */
    readonly slot: AppTaskSlot,
    /** Runtime callback lane selected by AppTask overload shape. */
    readonly callbackKind: AppTaskCallbackKind,
    /** DI key expression resolved before callback invocation, if any. */
    readonly keyExpression: ts.Expression | null,
    /** Callback expression supplied to the task factory. */
    readonly callback: ConfigurationCallbackObservation | null,
    /** Full `AppTask.*(...)` call. */
    readonly sourceNode: ts.CallExpression,
    /** Unresolved task fields that should remain visible. */
    readonly openSeams: readonly ConfigurationRecognitionOpen[] = [],
  ) {}
}

/** Source-level value for a configuration option contribution. */
export class ConfigurationOptionValueObservation {
  constructor(
    /** Classified value lane before kernel product materialization. */
    readonly valueKind: ConfigurationOptionValueKind,
    /** Expression that produced this option value, when present. */
    readonly node: ts.Expression | null,
    /** Closed primitive value for boolean, string, number, or null lanes. */
    readonly primitive: boolean | string | number | null = null,
    /** Closed string elements for the string-array lane. */
    readonly stringValues: readonly string[] = [],
    /** Local name or expression preview for traces. */
    readonly localName: string | null = null,
  ) {}
}

/** Source-backed option contribution before convergence folds precedence. */
export class ConfigurationOptionContributionObservation {
  constructor(
    /** Source lane that produced the contribution. */
    readonly contributionKind: ConfigurationOptionContributionKind,
    /** Runtime option path, such as `coercingOptions.enableCoercion`. */
    readonly optionPath: readonly string[],
    /** Observed value for the option path. */
    readonly value: ConfigurationOptionValueObservation,
    /** Source node for the property, argument, assignment, or builder call. */
    readonly sourceNode: ts.Node,
    /** Unresolved option pressure that should remain visible. */
    readonly openSeams: readonly ConfigurationRecognitionOpen[] = [],
  ) {}
}

/** One ordered configuration action or observation before kernel materialization. */
export class ConfigurationStepObservation {
  constructor(
    /** Source carrier lane that produced this observation. */
    readonly carrierKind: ConfigurationCarrierKind,
    /** Normalized step lane this observation is expected to materialize. */
    readonly stepKind: ConfigurationStepKind,
    /** Full carrier node, used for primary evidence and source order. */
    readonly sourceNode: ts.Node,
    /** Best local receiver name for traces while identity is open. */
    readonly receiverLocalName: string | null,
    /** App-root config produced or selected by this step. */
    readonly appRootConfig: AppRootConfigObservation | null = null,
    /** AppTasks produced, registered, or selected by this step. */
    readonly appTasks: readonly AppTaskObservation[] = [],
    /** Option contributions produced by this step. */
    readonly optionContributions: readonly ConfigurationOptionContributionObservation[] = [],
    /** Registration admissions offered by this step before DI spending. */
    readonly registrationAdmissions: readonly RegistrationAdmissionObservation[] = [],
    /** Unresolved points that must stay visible to later consumers. */
    readonly openSeams: readonly ConfigurationRecognitionOpen[] = [],
  ) {}
}

/** Ordered configuration flow observed in one evaluated source module. */
export class ConfigurationSequenceObservation {
  constructor(
    /** Sequence lane observed from source and static evaluation. */
    readonly sequenceKind: ConfigurationSequenceKind,
    /** Source node that owns the sequence; currently the source file or a carrier declaration. */
    readonly sourceNode: ts.Node,
    /** Local source name used only for traces while sequence identity is still open. */
    readonly localName: string | null,
    /** Ordered steps observed for this sequence. */
    readonly steps: readonly ConfigurationStepObservation[],
    /** Unresolved sequence-level pressure. */
    readonly openSeams: readonly ConfigurationRecognitionOpen[] = [],
  ) {}
}
