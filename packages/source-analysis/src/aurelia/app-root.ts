import type {
  ContainerWorldRef,
  SourceNodeRef,
  SymbolRef,
} from './refs.js';
import { Container } from './container.js';
import {
  APP_TASK_SLOT_KINDS,
  AppTaskOpenSeam,
  type AppTaskContribution,
  type AppTaskSlotKind,
} from './app-task.js';
import { ContainerStateCandidate } from './registrations/container-state-candidate.js';
import { ContainerStateClosureBasis } from './registrations/container-state-closure-basis.js';
import { DirectRegisterReferenceMaterializer } from './registrations/direct-register-reference-materializer.js';
import { ContainerStateEntry } from './registrations/container-state-entry.js';
import { ContainerStateMaterializer } from './registrations/container-state-materializer.js';
import type { ContainerStateOpenSeam } from './registrations/container-state-open-seam.js';
import { ContainerStateQualification } from './registrations/container-state-qualification.js';
import { RegistrationIntake } from './registrations/registration-intake.js';
import { RegistrationResolverBasis } from './registrations/registration-resolver-basis.js';
import { RegistrationTransition } from './registrations/registration-transition.js';

export interface AppRootConfig {
  readonly host: SourceNodeRef | null;
  readonly component: SymbolRef | SourceNodeRef | null;
  readonly container?: Container | null;
  readonly enhance?: boolean;
  readonly appTasks?: readonly AppTaskContribution[];
}

export class AppRootStage {
  constructor(
    readonly slot: AppTaskSlotKind,
    readonly tasks: readonly AppTaskContribution[] = [],
    readonly callbackProductions: readonly import('./registrations/configuration-registration-production.js').ConfigurationRegistrationProduction[] = [],
    readonly directRegisterArguments: readonly import('./configurations/configuration-function-analysis.js').RegisterArgument[] = [],
    readonly containerStateEntries: readonly ContainerStateEntry[] = [],
    readonly containerStateOpenSeams: readonly ContainerStateOpenSeam[] = [],
    readonly openSeams: readonly AppTaskOpenSeam[] = [],
    readonly note: string | null = null,
  ) {}
}

// TODO: AppRootStage currently models fixed runtime slot ordering plus known
// AppTask membership/callback ingress only. The callback body consequences now
// live on AppTaskContribution.callback, but AppRoot still does not spend them
// into concrete world/container transitions. Keep that follow-on work with the
// AppTask scanner rather than burying it in AppRoot itself.
export class AppRoot {
  readonly config: AppRootConfig;
  readonly container: Container;
  readonly handle: ContainerWorldRef;
  readonly host: SourceNodeRef | null;
  readonly component: SymbolRef | SourceNodeRef | null;
  readonly stages: readonly AppRootStage[];
  private readonly appTaskContainerStateMaterializer = new ContainerStateMaterializer();
  private readonly directRegisterReferenceMaterializer = new DirectRegisterReferenceMaterializer();

  constructor(
    config: AppRootConfig,
    container: Container,
    handle: ContainerWorldRef,
  ) {
    this.config = config;
    this.container = container;
    this.handle = handle;
    this.host = config.host;
    this.component = config.component;
    this.stages = createStages(
      config.appTasks ?? [],
      this.handle,
      this.appTaskContainerStateMaterializer,
      this.directRegisterReferenceMaterializer,
    );
  }

  findStage(
    slot: AppTaskSlotKind,
  ): AppRootStage | null {
    return this.stages.find((current) => current.slot === slot) ?? null;
  }

  readStagesThrough(
    slot: AppTaskSlotKind | null = null,
  ): readonly AppRootStage[] {
    if (slot == null) {
      return [...this.stages];
    }

    const stageIndex = APP_TASK_SLOT_KINDS.indexOf(slot);
    if (stageIndex < 0) {
      return [];
    }

    return this.stages.slice(0, stageIndex + 1);
  }

  readCumulativeContainerStateEntries(
    slot: AppTaskSlotKind | null = null,
  ): readonly ContainerStateEntry[] {
    return this.readStagesThrough(slot).flatMap((current) => current.containerStateEntries);
  }
}

function createStages(
  appTasks: readonly AppTaskContribution[],
  world: ContainerWorldRef,
  materializer: ContainerStateMaterializer,
  directRegisterReferenceMaterializer: DirectRegisterReferenceMaterializer,
): readonly AppRootStage[] {
  return APP_TASK_SLOT_KINDS.map((slot) => {
    const tasks = appTasks.filter((current) => current.slot === slot);
    const callbackProductions = tasks.flatMap((current) => current.callback?.productions ?? []);
    const directRegisterArguments = tasks.flatMap((current) => current.callback?.directRegisterArguments ?? []);
    const openSeams = tasks.flatMap((current) => current.callback?.openSeams ?? []);
    const candidates = callbackProductions.flatMap((current, index) =>
      materializeStageCandidate(current, slot, world, index, openSeams),
    );
    const callbackState = materializer.materialize(candidates);
    const directRegisterInputs = tasks.flatMap((current, taskIndex) =>
      (current.callback?.directRegisterArguments ?? []).map((argument, argumentIndex) => ({
        id: `${current.id}:direct-register:${taskIndex}:${argumentIndex}`,
        source: argument.source,
        seedKind: argument.seedKind,
        referenceName: argument.referenceName,
        note: argument.note,
      })),
    );
    const directRegisterState = directRegisterInputs.length === 0
      ? { entries: [], openSeams: [] }
      : directRegisterReferenceMaterializer.materialize(
        directRegisterInputs,
        {
          owner: tasks[0]?.contribution.configuration.sourceExport.symbol
            ?? tasks[0]?.contribution.configuration.source
            ?? tasks[0]?.production.producerCall.source
            ?? callbackProductions[0]?.producerCall.source
            ?? directRegisterInputs[0]!.source,
          world,
          intakeKind: 'deferred-parameterized-register',
          transitionClass: 'lifecycle-slot-attachment',
          lookupRegime: 'direct',
          materializationTiming: 'deferred-to-slot',
          currentWorldSensitivity: 'lookup-regime-sensitive',
          topologyHook: 'none',
          closureResiduals: ['lifecycle-gated-activity'],
          contextLabel: `AppTask.${slot}`,
          note: `AppTask.${slot} callback-local direct register(...) consequence.`,
        },
      );

    return new AppRootStage(
      slot,
      tasks,
      callbackProductions,
      directRegisterArguments,
      [
        ...callbackState.entries,
        ...directRegisterState.entries,
      ],
      [
        ...callbackState.openSeams,
        ...directRegisterState.openSeams,
      ],
      openSeams,
      `AppRoot stage ${slot} over fixed runtime-html app-task ordering.`,
    );
  });
}

// TODO: AppRoot stage spending currently materializes per-slot consequence in
// isolation. It does not yet thread cumulative container state from creating ->
// hydrating -> hydrated ... through one mutating root timeline.
//
// TODO: readCumulativeContainerStateEntries(...) preserves per-stage entry
// order and relies on later lookup selection over that ordered overlay. It
// does not yet rematerialize one cumulative root-container state with provider
// execution and mutation-aware overwrite semantics.
//
// TODO: AppTask callback productions only close key/payload for bounded simple
// syntax today. Imported DI keys and helper-built keys still need a deeper
// reference/subject bridge. Callback-local direct container.register(Foo)
// arguments now spend the bounded constructable subset through the same direct-
// register materializer used by controller definition.dependencies, while
// resource-key visibility and richer registry objects remain explicit seams.
function materializeStageCandidate(
  production: import('./registrations/configuration-registration-production.js').ConfigurationRegistrationProduction,
  slot: AppTaskSlotKind,
  world: ContainerWorldRef,
  index: number,
  openSeams: AppTaskOpenSeam[],
): readonly ContainerStateCandidate[] {
  const registration = production.production;
  const key = registration.targetKey;
  if (key == null) {
    openSeams.push(
      new AppTaskOpenSeam(
        'callback-production-key-open',
        registration.source,
        `AppTask.${slot} callback production ${production.apiIngress.api?.id ?? registration.kind} did not close a key-space target under the current bounded registration-argument reader.`,
      ),
    );
    return [];
  }

  const resolverBasis = readStageResolverBasis(registration.kind, registration.source, slot, openSeams);
  if (resolverBasis == null) {
    return [];
  }

  if ((registration.kind === 'singleton' || registration.kind === 'transient') && registration.payload == null) {
    openSeams.push(
      new AppTaskOpenSeam(
        'callback-production-payload-open',
        registration.source,
        `AppTask.${slot} callback production ${production.apiIngress.api?.id ?? registration.kind} still needs a constructable payload before it can close as activation state.`,
      ),
    );
  }

  const intake = new RegistrationIntake(
    `app-task-intake:${slot}:${registration.id}:${index}`,
    'deferred-parameterized-register',
    registration.source,
    registration.owner,
    world,
    [registration],
    `Recovered from AppTask.${slot} callback registration helper.`,
  );
  const transition = new RegistrationTransition(
    `app-task-transition:${slot}:${registration.id}:${index}`,
    intake,
    registration,
    null,
    'lifecycle-slot-attachment',
    `AppTask.${slot} callback consequence enters root container state only when that lifecycle slot runs.`,
  );

  return [
    new ContainerStateCandidate(
      `app-task-candidate:${slot}:${registration.id}:${index}`,
      world,
      key,
      transition,
      resolverBasis,
      new ContainerStateQualification(
        'direct',
        'deferred-to-slot',
        'lookup-regime-sensitive',
        'none',
        `AppTask.${slot} callback consequence is direct lookup state gated on that runtime slot.`,
      ),
      new ContainerStateClosureBasis(
        'statically-closable',
        ['lifecycle-gated-activity'],
        `AppTask.${slot} callback consequence is structurally known, but only becomes active when that slot runs.`,
      ),
      `Derived from AppTask.${slot} callback production ${production.apiIngress.api?.id ?? registration.kind}.`,
    ),
  ];
}

function readStageResolverBasis(
  kind: import('./registrations/registration-production.js').RegistrationProductionKind,
  source: SourceNodeRef,
  slot: AppTaskSlotKind,
  openSeams: AppTaskOpenSeam[],
): RegistrationResolverBasis | null {
  switch (kind) {
    case 'instance':
      return new RegistrationResolverBasis(
        'instance',
        `AppTask.${slot} callback closes as instance publication.`,
      );
    case 'singleton':
      return new RegistrationResolverBasis(
        'singleton',
        `AppTask.${slot} callback closes as singleton activation.`,
      );
    case 'transient':
      return new RegistrationResolverBasis(
        'transient',
        `AppTask.${slot} callback closes as transient activation.`,
      );
    case 'callback':
      return new RegistrationResolverBasis(
        'callback',
        `AppTask.${slot} callback closes as callback-backed activation.`,
      );
    case 'alias':
      return new RegistrationResolverBasis(
        'alias',
        `AppTask.${slot} callback closes as alias linkage.`,
      );
    case 'cached-callback':
      openSeams.push(
        new AppTaskOpenSeam(
          'callback-production-strategy-open',
          source,
          `AppTask.${slot} callback recovered a cached-callback registration, but cache semantics are not yet represented in RegistrationResolverBasis.`,
        ),
      );
      return null;
    case 'defer':
      openSeams.push(
        new AppTaskOpenSeam(
          'callback-production-strategy-open',
          source,
          `AppTask.${slot} callback recovered a defer(...) registration, but parameterized registry consequence is still open in the stage overlay.`,
        ),
      );
      return null;
    default:
      openSeams.push(
        new AppTaskOpenSeam(
          'callback-production-strategy-open',
          source,
          `AppTask.${slot} callback recovered ${kind}, which is not yet spent into a stage-aware resolver basis.`,
        ),
      );
      return null;
  }
}
