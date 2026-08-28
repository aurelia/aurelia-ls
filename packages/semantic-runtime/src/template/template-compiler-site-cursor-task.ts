import {
  TemplateCompilerElementOccurrence,
  TemplateCompilerFragmentOccurrence,
  TemplateCompilerOccurrenceEdgeKind,
  type TemplateCompilerNodeOccurrence,
  type TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';
import {
  TemplateCompilerSiteCursorFrontierKind,
  type TemplateCompilerSiteCursorFrontier,
  type TemplateCompilerSiteCursorEvent,
} from './template-compiler-site-cursor-event.js';

const cursorTaskAuthority = {};

export const enum TemplateCompilerSiteCursorContextKind {
  Root = 'root',
  TemplateController = 'template-controller',
  Projection = 'projection',
}

/** State retained by a terminal historical snapshot. Active execution never escapes the session. */
export const enum TemplateCompilerSiteCursorContextTaskState {
  Pending = 'pending',
  Waiting = 'waiting',
  Drained = 'drained',
  Stopped = 'stopped',
}

export const enum TemplateCompilerSiteCursorTaskStopKind {
  StructuralFrontier = 'structural-frontier',
  TerminalFrontier = 'terminal-frontier',
}

export const enum TemplateCompilerSiteCursorWorkKind {
  PhysicalFrame = 'physical-frame',
  LogicalEntrantBand = 'logical-entrant-band',
  StagedElementContinuation = 'staged-element-continuation',
}

export const enum TemplateCompilerSiteCursorSelectionKind {
  PhysicalNode = 'physical-node',
  LogicalEntrant = 'logical-entrant',
  StagedElementContinuation = 'staged-element-continuation',
}

/** Product-free identity of one logical compiler traversal context. */
export class TemplateCompilerSiteCursorContextReference {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly localKey: string,
    readonly ordinal: number,
    readonly contextKind: TemplateCompilerSiteCursorContextKind,
    readonly parent: TemplateCompilerSiteCursorContextReference | null,
  ) {
    if (
      authority !== cursorTaskAuthority
      || localKey.length === 0
      || !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || (contextKind === TemplateCompilerSiteCursorContextKind.Root) !== (parent == null)
    ) {
      throw new Error('Compiler site cursor context lost identity, order, or parent authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** One immutable physical child spine shared by frames and logical source placements. */
export class TemplateCompilerSiteCursorPhysicalChildSequence {
  readonly #authority: object;
  readonly children: readonly TemplateCompilerNodeOccurrence[];

  constructor(
    authority: object,
    readonly parent: TemplateCompilerParentOccurrence,
    children: readonly TemplateCompilerNodeOccurrence[],
  ) {
    this.children = [...children];
    const current = parent.readChildren();
    if (
      authority !== cursorTaskAuthority
      || current.length !== this.children.length
      || this.children.some((child, ordinal) =>
        child !== current[ordinal]
        || child.parent !== parent
        || child.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
      )
    ) {
      throw new Error('Compiler cursor physical sequence requires one exact parent-child snapshot.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Exact physical source placement of one node before logical context redistribution. */
export class TemplateCompilerSiteCursorPhysicalSourcePlacement {
  readonly #authority: object;
  readonly node: TemplateCompilerNodeOccurrence;
  readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null;

  constructor(
    authority: object,
    readonly source: TemplateCompilerSiteCursorPhysicalChildSequence,
    readonly sourceOrdinal: number,
  ) {
    this.node = source.children[sourceOrdinal]!;
    this.capturedSuccessor = source.children[sourceOrdinal + 1] ?? null;
    if (
      authority !== cursorTaskAuthority
      || !source.isModuleConstructed()
      || !Number.isSafeInteger(sourceOrdinal)
      || sourceOrdinal < 0
      || sourceOrdinal >= source.children.length
    ) {
      throw new Error('Compiler cursor physical source placement lost its captured ordinal.');
    }
    this.#authority = authority;
  }

  get parent(): TemplateCompilerParentOccurrence {
    return this.source.parent;
  }

  get children(): readonly TemplateCompilerNodeOccurrence[] {
    return this.source.children;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

export interface TemplateCompilerSiteCursorLogicalEntrantInput {
  readonly source: TemplateCompilerSiteCursorPhysicalChildSequence;
  readonly sourceOrdinal: number;
  /** Owning projection/transition receipt; the task layer retains but never interprets it. */
  readonly authority: object;
}

/** One logical context entrant with both source placement and destination-context order. */
export class TemplateCompilerSiteCursorLogicalEntrantWork {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly physicalSource: TemplateCompilerSiteCursorPhysicalSourcePlacement,
    readonly logicalOrdinal: number,
    readonly logicalSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly entrantAuthority: object,
  ) {
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || !physicalSource.isModuleConstructed()
      || !Number.isSafeInteger(logicalOrdinal)
      || logicalOrdinal < 0
      || entrantAuthority == null
      || typeof entrantAuthority !== 'object'
    ) {
      throw new Error('Compiler cursor logical entrant lost context, source, or logical order authority.');
    }
    this.#authority = authority;
  }

  get node(): TemplateCompilerNodeOccurrence {
    return this.physicalSource.node;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Event-time visit selected from either a physical frame or one logical entrant band. */
export class TemplateCompilerSiteCursorNodeVisit {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly children: readonly TemplateCompilerNodeOccurrence[],
    readonly node: TemplateCompilerNodeOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly logicalOrdinal: number,
    readonly logicalSuccessor: TemplateCompilerNodeOccurrence | null,
    readonly entrantWork: TemplateCompilerSiteCursorLogicalEntrantWork | null,
  ) {
    if (
      authority !== cursorTaskAuthority
      || !Number.isSafeInteger(parentOrdinal)
      || parentOrdinal < 0
      || children[parentOrdinal] !== node
      || (children[parentOrdinal + 1] ?? null) !== capturedSuccessor
      || !Number.isSafeInteger(logicalOrdinal)
      || logicalOrdinal < 0
      || (entrantWork == null
        ? logicalOrdinal !== parentOrdinal || logicalSuccessor !== capturedSuccessor
        : entrantWork.node !== node
          || entrantWork.physicalSource.parent !== parent
          || entrantWork.physicalSource.children !== children
          || entrantWork.physicalSource.sourceOrdinal !== parentOrdinal
          || entrantWork.logicalOrdinal !== logicalOrdinal
          || entrantWork.logicalSuccessor !== logicalSuccessor)
    ) {
      throw new Error('Compiler cursor node visit lost physical or logical placement authority.');
    }
    this.#authority = authority;
  }

  get selectionKind(): TemplateCompilerSiteCursorSelectionKind {
    return this.entrantWork == null
      ? TemplateCompilerSiteCursorSelectionKind.PhysicalNode
      : TemplateCompilerSiteCursorSelectionKind.LogicalEntrant;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Opaque continuation of an element whose pre-context-transition staging has already completed. */
export class TemplateCompilerSiteCursorStagedElementContinuationWork {
  readonly workKind = TemplateCompilerSiteCursorWorkKind.StagedElementContinuation;
  readonly #authority: object;

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly sourceSelection: TemplateCompilerSiteCursorTaskSelection,
    readonly continuation: object,
  ) {
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || !sourceSelection.isModuleConstructed()
      || !contextIsSelfOrDescendant(context, sourceSelection.context)
      || !(sourceSelection.visit.node instanceof TemplateCompilerElementOccurrence)
    ) {
      throw new Error('Compiler cursor staged continuation lost its exact element visit.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  get visit(): TemplateCompilerSiteCursorNodeVisit {
    return this.sourceSelection.visit;
  }

  get sourceContext(): TemplateCompilerSiteCursorContextReference {
    return this.sourceSelection.context;
  }
}

export type TemplateCompilerSiteCursorLogicalWork =
  | TemplateCompilerSiteCursorLogicalEntrantWork
  | TemplateCompilerSiteCursorStagedElementContinuationWork;

/** One scheduler selection with exact context and work provenance. */
export class TemplateCompilerSiteCursorTaskSelection {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly selectionKind: TemplateCompilerSiteCursorSelectionKind,
    readonly visit: TemplateCompilerSiteCursorNodeVisit,
    readonly work: TemplateCompilerSiteCursorLogicalWork | null,
  ) {
    const exact = selectionKind === TemplateCompilerSiteCursorSelectionKind.PhysicalNode
      ? work == null && visit.entrantWork == null
      : selectionKind === TemplateCompilerSiteCursorSelectionKind.LogicalEntrant
        ? work instanceof TemplateCompilerSiteCursorLogicalEntrantWork && visit.entrantWork === work
        : work instanceof TemplateCompilerSiteCursorStagedElementContinuationWork && work.visit === visit;
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || !visit.isModuleConstructed()
      || !exact
      || (work != null && work.context !== context)
    ) {
      throw new Error('Compiler cursor task selection lost context, visit, or work authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Immutable historical position in one previously validated physical frame. */
export class TemplateCompilerSiteCursorFrameSnapshot {
  readonly workKind = TemplateCompilerSiteCursorWorkKind.PhysicalFrame;
  readonly #authority: object;
  readonly children: readonly TemplateCompilerNodeOccurrence[];

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly source: TemplateCompilerSiteCursorPhysicalChildSequence,
    readonly nextOrdinal: number,
  ) {
    this.children = [...source.children];
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || !source.isModuleConstructed()
      || !Number.isSafeInteger(nextOrdinal)
      || nextOrdinal < 0
      || nextOrdinal > this.children.length
    ) {
      throw new Error('Compiler cursor frame snapshot lost parent or next-ordinal authority.');
    }
    this.#authority = authority;
  }

  get parent(): TemplateCompilerParentOccurrence {
    return this.source.parent;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  readRemainingChildren(): readonly TemplateCompilerNodeOccurrence[] {
    return this.children.slice(this.nextOrdinal);
  }
}

/** Immutable historical position in a logical context entrant band. */
export class TemplateCompilerSiteCursorLogicalEntrantBandSnapshot {
  readonly workKind = TemplateCompilerSiteCursorWorkKind.LogicalEntrantBand;
  readonly #authority: object;
  readonly entrants: readonly TemplateCompilerSiteCursorLogicalEntrantWork[];

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    entrants: readonly TemplateCompilerSiteCursorLogicalEntrantWork[],
    readonly nextOrdinal: number,
  ) {
    this.entrants = [...entrants];
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || this.entrants.length === 0
      || new Set(this.entrants.map((entrant) => entrant.node)).size !== this.entrants.length
      || !Number.isSafeInteger(nextOrdinal)
      || nextOrdinal < 0
      || nextOrdinal > this.entrants.length
      || this.entrants.some((entrant, ordinal) =>
        !entrant.isModuleConstructed()
        || entrant.context !== context
        || entrant.logicalOrdinal !== ordinal
        || entrant.logicalSuccessor !== (this.entrants[ordinal + 1]?.node ?? null)
      )
    ) {
      throw new Error('Compiler cursor logical entrant band lost context or contiguous order.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  readRemainingEntrants(): readonly TemplateCompilerSiteCursorLogicalEntrantWork[] {
    return this.entrants.slice(this.nextOrdinal);
  }
}

export type TemplateCompilerSiteCursorWorkSnapshot =
  | TemplateCompilerSiteCursorFrameSnapshot
  | TemplateCompilerSiteCursorLogicalEntrantBandSnapshot
  | TemplateCompilerSiteCursorStagedElementContinuationWork;

/** One exact event-to-context ownership edge in total and context-local cursor order. */
export class TemplateCompilerSiteCursorContextEventBinding {
  constructor(
    readonly ordinal: number,
    readonly contextOrdinal: number,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly event: TemplateCompilerSiteCursorEvent,
    readonly visit: TemplateCompilerSiteCursorNodeVisit | null,
    readonly work: TemplateCompilerSiteCursorLogicalWork | null,
  ) {
    const exactWork = work == null
      ? visit?.entrantWork == null
      : work instanceof TemplateCompilerSiteCursorLogicalEntrantWork
        ? visit?.entrantWork === work
        : visit === work.visit;
    if (
      !context.isModuleConstructed()
      || !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || !Number.isSafeInteger(contextOrdinal)
      || contextOrdinal < 0
      || event.ordinal !== ordinal
      || visit?.isModuleConstructed() === false
      || (work != null && (!work.isModuleConstructed() || work.context !== context))
      || !exactWork
    ) {
      throw new Error('Compiler cursor event binding lost context, ordinal, visit, or work authority.');
    }
  }
}

/** Immutable terminal state of one logical cursor context task. */
export class TemplateCompilerSiteCursorContextTaskSnapshot {
  readonly #authority: object;
  readonly remainingWork: readonly TemplateCompilerSiteCursorWorkSnapshot[];
  readonly remainingFrames: readonly TemplateCompilerSiteCursorFrameSnapshot[];
  readonly remainingEntrantBands: readonly TemplateCompilerSiteCursorLogicalEntrantBandSnapshot[];
  readonly eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[];
  readonly events: readonly TemplateCompilerSiteCursorEvent[];

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly state: TemplateCompilerSiteCursorContextTaskState,
    remainingWork: readonly TemplateCompilerSiteCursorWorkSnapshot[],
    readonly lastVisit: TemplateCompilerSiteCursorNodeVisit | null,
    readonly lastWork: TemplateCompilerSiteCursorLogicalWork | null,
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
    readonly stopKind: TemplateCompilerSiteCursorTaskStopKind | null,
    eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[],
  ) {
    this.remainingWork = [...remainingWork];
    this.remainingFrames = this.remainingWork.filter(
      (work): work is TemplateCompilerSiteCursorFrameSnapshot =>
        work instanceof TemplateCompilerSiteCursorFrameSnapshot,
    );
    this.remainingEntrantBands = this.remainingWork.filter(
      (work): work is TemplateCompilerSiteCursorLogicalEntrantBandSnapshot =>
        work instanceof TemplateCompilerSiteCursorLogicalEntrantBandSnapshot,
    );
    this.eventBindings = [...eventBindings];
    this.events = this.eventBindings.map((binding) => binding.event);
    const drained = state === TemplateCompilerSiteCursorContextTaskState.Drained;
    const stopped = state === TemplateCompilerSiteCursorContextTaskState.Stopped;
    const pending = state === TemplateCompilerSiteCursorContextTaskState.Pending;
    const waiting = state === TemplateCompilerSiteCursorContextTaskState.Waiting;
    const structuralFrontierIsExact = stopKind !== TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
      || (
        frontier != null
        && lastVisit?.node === frontier.node
        && lastVisit.capturedSuccessor === frontier.capturedSuccessor
      );
    const lastWorkIsExact = lastWork == null
      ? lastVisit?.entrantWork == null
      : lastWork instanceof TemplateCompilerSiteCursorLogicalEntrantWork
        ? lastVisit?.entrantWork === lastWork
        : lastVisit === lastWork.visit;
    const remainingWorkChainIsExact = workStackChainIsExact(this.remainingWork, state, lastVisit, lastWork);
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || Number(drained) + Number(stopped) + Number(pending) + Number(waiting) !== 1
      || (drained && (frontier != null || stopKind != null || this.remainingWork.length > 0))
      || (stopped && (frontier == null || stopKind == null))
      || ((pending || waiting) && (frontier != null || stopKind != null))
      || (pending && (lastVisit != null || lastWork != null || this.eventBindings.length > 0))
      || (stopKind === TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
        && !isStructuralContextFrontier(frontier))
      || (stopKind === TemplateCompilerSiteCursorTaskStopKind.TerminalFrontier
        && isStructuralContextFrontier(frontier))
      || this.remainingWork.some((work) => !workIsExactForContext(work, context))
      || lastVisit?.isModuleConstructed() === false
      || (lastWork != null && (!lastWork.isModuleConstructed() || lastWork.context !== context))
      || !lastWorkIsExact
      || !remainingWorkChainIsExact
      || !structuralFrontierIsExact
      || this.eventBindings.some((binding, ordinal) =>
        binding.context !== context || binding.contextOrdinal !== ordinal
      )
    ) {
      throw new Error('Compiler cursor context task lost state, work, event, or frontier authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Immutable terminal snapshot of the cursor task family and its event ownership. */
export class TemplateCompilerSiteCursorTaskSessionSnapshot {
  readonly #authority: object;
  readonly contexts: readonly TemplateCompilerSiteCursorContextTaskSnapshot[];
  readonly events: readonly TemplateCompilerSiteCursorEvent[];
  readonly eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[];
  readonly taskStack: readonly TemplateCompilerSiteCursorContextReference[];
  readonly #contextByEvent: ReadonlyMap<TemplateCompilerSiteCursorEvent, TemplateCompilerSiteCursorContextReference>;
  readonly #bindingByEvent: ReadonlyMap<TemplateCompilerSiteCursorEvent, TemplateCompilerSiteCursorContextEventBinding>;
  readonly #taskByContext: ReadonlyMap<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerSiteCursorContextTaskSnapshot
  >;

  constructor(
    authority: object,
    readonly rootContext: TemplateCompilerSiteCursorContextReference,
    contexts: readonly TemplateCompilerSiteCursorContextTaskSnapshot[],
    events: readonly TemplateCompilerSiteCursorEvent[],
    eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[],
    taskStack: readonly TemplateCompilerSiteCursorContextReference[],
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
  ) {
    this.contexts = [...contexts];
    this.events = [...events];
    this.eventBindings = [...eventBindings];
    this.taskStack = [...taskStack];
    this.#contextByEvent = new Map(this.eventBindings.map((binding) => [binding.event, binding.context] as const));
    this.#bindingByEvent = new Map(this.eventBindings.map((binding) => [binding.event, binding] as const));
    this.#taskByContext = new Map(this.contexts.map((task) => [task.context, task] as const));

    const localKeys = new Set<string>();
    const seenContexts = new Set<TemplateCompilerSiteCursorContextReference>();
    const contextOrderIsExact = this.contexts.every((task, ordinal) => {
      const context = task.context;
      const parentIsEarlier = context.parent == null
        ? context === rootContext && ordinal === 0
        : seenContexts.has(context.parent);
      seenContexts.add(context);
      localKeys.add(context.localKey);
      return task.isModuleConstructed()
        && context.ordinal === ordinal
        && parentIsEarlier;
    });
    const bindingsByContext = new Map<
      TemplateCompilerSiteCursorContextReference,
      TemplateCompilerSiteCursorContextEventBinding[]
    >();
    for (const binding of this.eventBindings) {
      const bucket = bindingsByContext.get(binding.context);
      if (bucket == null) bindingsByContext.set(binding.context, [binding]);
      else bucket.push(binding);
    }
    const eventPartitionIsExact = this.contexts.every((task) =>
      sameObjects(task.eventBindings, bindingsByContext.get(task.context) ?? [])
    );
    const stackSet = new Set(this.taskStack);
    const stackParents = new Set<TemplateCompilerSiteCursorContextReference>();
    const seenStack = new Set<TemplateCompilerSiteCursorContextReference>();
    let stackTreeIsExact = this.taskStack.length === stackSet.size;
    for (const context of this.taskStack) {
      const task = this.#taskByContext.get(context) ?? null;
      if (
        task == null
        || (context.parent != null && !seenStack.has(context.parent))
      ) {
        stackTreeIsExact = false;
      }
      if (context.parent != null) stackParents.add(context.parent);
      seenStack.add(context);
    }
    const terminalTask = this.taskStack.length === 0
      ? null
      : this.#taskByContext.get(this.taskStack[this.taskStack.length - 1]!) ?? null;
    const taskStatesAreExact = this.contexts.every((task) => {
      if (!stackSet.has(task.context)) return task.state === TemplateCompilerSiteCursorContextTaskState.Drained;
      if (task === terminalTask) return task.state === TemplateCompilerSiteCursorContextTaskState.Stopped;
      return task.state === (stackParents.has(task.context)
        ? TemplateCompilerSiteCursorContextTaskState.Waiting
        : TemplateCompilerSiteCursorContextTaskState.Pending);
    });
    if (
      authority !== cursorTaskAuthority
      || !rootContext.isModuleConstructed()
      || rootContext.contextKind !== TemplateCompilerSiteCursorContextKind.Root
      || rootContext.parent !== null
      || this.contexts.length === 0
      || this.contexts[0]?.context !== rootContext
      || this.#taskByContext.size !== this.contexts.length
      || localKeys.size !== this.contexts.length
      || !contextOrderIsExact
      || !eventPartitionIsExact
      || !stackTreeIsExact
      || !taskStatesAreExact
      || this.events.length !== this.eventBindings.length
      || this.#contextByEvent.size !== this.events.length
      || this.#bindingByEvent.size !== this.events.length
      || this.eventBindings.some((binding, ordinal) =>
        binding.ordinal !== ordinal
        || binding.event !== this.events[ordinal]
        || binding.event.ordinal !== ordinal
        || !this.#taskByContext.has(binding.context)
      )
      || (frontier == null
        ? this.taskStack.length !== 0
        : terminalTask?.frontier !== frontier
          || this.events.at(-1) !== frontier
          || this.#contextByEvent.get(frontier) !== terminalTask.context)
    ) {
      throw new Error('Compiler cursor task snapshot lost context tree, scheduler state, or event partition.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  contextForEvent(event: TemplateCompilerSiteCursorEvent): TemplateCompilerSiteCursorContextReference | null {
    return this.#contextByEvent.get(event) ?? null;
  }

  bindingForEvent(event: TemplateCompilerSiteCursorEvent): TemplateCompilerSiteCursorContextEventBinding | null {
    return this.#bindingByEvent.get(event) ?? null;
  }

  taskForContext(
    context: TemplateCompilerSiteCursorContextReference,
  ): TemplateCompilerSiteCursorContextTaskSnapshot | null {
    return this.#taskByContext.get(context) ?? null;
  }
}

class TemplateCompilerSiteCursorMutableFrame {
  readonly workKind = TemplateCompilerSiteCursorWorkKind.PhysicalFrame;
  nextOrdinal = 0;

  constructor(
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly source: TemplateCompilerSiteCursorPhysicalChildSequence,
  ) {}

  nextVisit(): TemplateCompilerSiteCursorNodeVisit | null {
    if (this.nextOrdinal >= this.source.children.length) return null;
    const parentOrdinal = this.nextOrdinal++;
    const node = this.source.children[parentOrdinal]!;
    const successor = this.source.children[parentOrdinal + 1] ?? null;
    return new TemplateCompilerSiteCursorNodeVisit(
      cursorTaskAuthority,
      this.source.parent,
      this.source.children,
      node,
      parentOrdinal,
      successor,
      parentOrdinal,
      successor,
      null,
    );
  }

  snapshot(): TemplateCompilerSiteCursorFrameSnapshot {
    return new TemplateCompilerSiteCursorFrameSnapshot(
      cursorTaskAuthority,
      this.context,
      this.source,
      this.nextOrdinal,
    );
  }
}

class TemplateCompilerSiteCursorMutableLogicalEntrantBand {
  readonly workKind = TemplateCompilerSiteCursorWorkKind.LogicalEntrantBand;
  nextOrdinal = 0;

  constructor(
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly entrants: readonly TemplateCompilerSiteCursorLogicalEntrantWork[],
  ) {}

  nextVisit(): {
    readonly visit: TemplateCompilerSiteCursorNodeVisit;
    readonly work: TemplateCompilerSiteCursorLogicalEntrantWork;
  } | null {
    const work = this.entrants[this.nextOrdinal++] ?? null;
    if (work == null) return null;
    const source = work.physicalSource;
    return {
      work,
      visit: new TemplateCompilerSiteCursorNodeVisit(
        cursorTaskAuthority,
        source.parent,
        source.children,
        source.node,
        source.sourceOrdinal,
        source.capturedSuccessor,
        work.logicalOrdinal,
        work.logicalSuccessor,
        work,
      ),
    };
  }

  snapshot(): TemplateCompilerSiteCursorLogicalEntrantBandSnapshot {
    return new TemplateCompilerSiteCursorLogicalEntrantBandSnapshot(
      cursorTaskAuthority,
      this.context,
      this.entrants,
      this.nextOrdinal,
    );
  }
}

type TemplateCompilerSiteCursorMutableWork =
  | TemplateCompilerSiteCursorMutableFrame
  | TemplateCompilerSiteCursorMutableLogicalEntrantBand
  | TemplateCompilerSiteCursorStagedElementContinuationWork;

const enum TemplateCompilerSiteCursorMutableTaskState {
  Pending = 'pending',
  Active = 'active',
  Waiting = 'waiting',
  Drained = 'drained',
  Stopped = 'stopped',
}

class TemplateCompilerSiteCursorMutableContextTask {
  readonly work: TemplateCompilerSiteCursorMutableWork[] = [];
  lastVisit: TemplateCompilerSiteCursorNodeVisit | null = null;
  lastWork: TemplateCompilerSiteCursorLogicalWork | null = null;
  frontier: TemplateCompilerSiteCursorFrontier | null = null;
  stopKind: TemplateCompilerSiteCursorTaskStopKind | null = null;
  state = TemplateCompilerSiteCursorMutableTaskState.Pending;
  scheduled = false;
  /** One context-root band; additional selected spines require a distinct logical-parent carrier. */
  logicalEntrantsStaged = false;

  constructor(readonly context: TemplateCompilerSiteCursorContextReference) {}

  nextSelection(): TemplateCompilerSiteCursorTaskSelection | null {
    while (this.work.length > 0) {
      const work = this.work[this.work.length - 1]!;
      if (work instanceof TemplateCompilerSiteCursorMutableFrame) {
        const visit = work.nextVisit();
        if (visit == null) {
          this.work.pop();
          continue;
        }
        this.lastVisit = visit;
        this.lastWork = null;
        return new TemplateCompilerSiteCursorTaskSelection(
          cursorTaskAuthority,
          this.context,
          TemplateCompilerSiteCursorSelectionKind.PhysicalNode,
          visit,
          null,
        );
      }
      if (work instanceof TemplateCompilerSiteCursorMutableLogicalEntrantBand) {
        const selected = work.nextVisit();
        if (selected == null) {
          this.work.pop();
          continue;
        }
        this.lastVisit = selected.visit;
        this.lastWork = selected.work;
        return new TemplateCompilerSiteCursorTaskSelection(
          cursorTaskAuthority,
          this.context,
          TemplateCompilerSiteCursorSelectionKind.LogicalEntrant,
          selected.visit,
          selected.work,
        );
      }
      this.work.pop();
      this.lastVisit = work.visit;
      this.lastWork = work;
      return new TemplateCompilerSiteCursorTaskSelection(
        cursorTaskAuthority,
        this.context,
        TemplateCompilerSiteCursorSelectionKind.StagedElementContinuation,
        work.visit,
        work,
      );
    }
    return null;
  }

  snapshot(
    eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[],
  ): TemplateCompilerSiteCursorContextTaskSnapshot {
    return new TemplateCompilerSiteCursorContextTaskSnapshot(
      cursorTaskAuthority,
      this.context,
      publicTaskState(this.state),
      this.work.map(snapshotWork),
      this.lastVisit,
      this.lastWork,
      this.frontier,
      this.stopKind,
      eventBindings,
    );
  }
}

class TemplateCompilerSiteCursorEventLog {
  private readonly events: TemplateCompilerSiteCursorEvent[] = [];
  private readonly bindings: TemplateCompilerSiteCursorContextEventBinding[] = [];
  private readonly bindingsByContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerSiteCursorContextEventBinding[]
  >();

  append(
    context: TemplateCompilerSiteCursorContextReference,
    event: TemplateCompilerSiteCursorEvent,
    selection: TemplateCompilerSiteCursorTaskSelection | null,
  ): void {
    if (event.ordinal !== this.events.length) {
      throw new Error(`Compiler cursor event ${event.ordinal} does not continue total event order.`);
    }
    const contextBindings = this.bindingsByContext.get(context) ?? [];
    const contextOrdinal = contextBindings.length;
    const binding = new TemplateCompilerSiteCursorContextEventBinding(
      this.bindings.length,
      contextOrdinal,
      context,
      event,
      selection?.context === context ? selection.visit : null,
      selection?.context === context ? selection.work : null,
    );
    this.events.push(event);
    this.bindings.push(binding);
    contextBindings.push(binding);
    if (!this.bindingsByContext.has(context)) this.bindingsByContext.set(context, contextBindings);
  }

  replaceTerminal(
    expectedContext: TemplateCompilerSiteCursorContextReference | null,
    expected: TemplateCompilerSiteCursorEvent,
    replacement: TemplateCompilerSiteCursorEvent,
  ): void {
    const ordinal = this.events.length - 1;
    const binding = this.bindings[ordinal] ?? null;
    if (
      ordinal < 0
      || this.events[ordinal] !== expected
      || binding?.event !== expected
      || (expectedContext != null && binding.context !== expectedContext)
      || replacement.ordinal !== ordinal
    ) {
      throw new Error('Compiler cursor terminal event replacement lost event or context authority.');
    }
    const contextBindings = this.bindingsByContext.get(binding.context);
    if (contextBindings?.[binding.contextOrdinal] !== binding) {
      throw new Error('Compiler cursor terminal event replacement lost context-local event order.');
    }
    const replacementBinding = new TemplateCompilerSiteCursorContextEventBinding(
      ordinal,
      binding.contextOrdinal,
      binding.context,
      replacement,
      binding.visit,
      binding.work,
    );
    this.events[ordinal] = replacement;
    this.bindings[ordinal] = replacementBinding;
    contextBindings[binding.contextOrdinal] = replacementBinding;
  }

  snapshot(): {
    readonly events: readonly TemplateCompilerSiteCursorEvent[];
    readonly bindings: readonly TemplateCompilerSiteCursorContextEventBinding[];
  } {
    return { events: [...this.events], bindings: [...this.bindings] };
  }

  bindingsForContext(
    context: TemplateCompilerSiteCursorContextReference,
  ): readonly TemplateCompilerSiteCursorContextEventBinding[] {
    return this.bindingsByContext.get(context) ?? [];
  }
}

/** Session-owned LIFO scheduler for one compiler context family. */
export class TemplateCompilerSiteCursorTaskSession {
  static createRoot(localKey: string): TemplateCompilerSiteCursorTaskSession {
    return new TemplateCompilerSiteCursorTaskSession(new TemplateCompilerSiteCursorContextReference(
      cursorTaskAuthority,
      `${localKey}:cursor-context:root`,
      0,
      TemplateCompilerSiteCursorContextKind.Root,
      null,
    ));
  }

  private readonly tasks: TemplateCompilerSiteCursorMutableContextTask[] = [];
  private readonly tasksByContext = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerSiteCursorMutableContextTask
  >();
  private readonly contextsByLocalKey = new Map<string, TemplateCompilerSiteCursorContextReference>();
  private readonly childrenByParent = new Map<
    TemplateCompilerSiteCursorContextReference,
    TemplateCompilerSiteCursorContextReference[]
  >();
  private readonly nextChildScheduleIndex = new Map<TemplateCompilerSiteCursorContextReference, number>();
  private readonly runnable: TemplateCompilerSiteCursorMutableContextTask[] = [];
  private readonly eventLog = new TemplateCompilerSiteCursorEventLog();
  private currentSelection: TemplateCompilerSiteCursorTaskSelection | null = null;
  private started = false;
  private finished = false;

  private constructor(readonly rootContext: TemplateCompilerSiteCursorContextReference) {
    const rootTask = new TemplateCompilerSiteCursorMutableContextTask(rootContext);
    this.tasks.push(rootTask);
    this.tasksByContext.set(rootContext, rootTask);
    this.contextsByLocalKey.set(rootContext.localKey, rootContext);
    this.childrenByParent.set(rootContext, []);
    this.nextChildScheduleIndex.set(rootContext, 0);
  }

  get currentContext(): TemplateCompilerSiteCursorContextReference | null {
    return this.runnable.at(-1)?.context ?? null;
  }

  capturePhysicalChildren(
    parent: TemplateCompilerParentOccurrence,
    children: readonly TemplateCompilerNodeOccurrence[],
  ): TemplateCompilerSiteCursorPhysicalChildSequence {
    this.requireOpen();
    return new TemplateCompilerSiteCursorPhysicalChildSequence(cursorTaskAuthority, parent, children);
  }

  createChildContext(
    parent: TemplateCompilerSiteCursorContextReference,
    localKey: string,
    contextKind: Exclude<TemplateCompilerSiteCursorContextKind, TemplateCompilerSiteCursorContextKind.Root>,
  ): TemplateCompilerSiteCursorContextReference {
    this.requireOpen();
    if (!this.started || !this.tasksByContext.has(parent) || this.contextsByLocalKey.has(localKey)) {
      throw new Error('Compiler cursor child context requires one live parent and unique local key.');
    }
    const context = new TemplateCompilerSiteCursorContextReference(
      cursorTaskAuthority,
      localKey,
      this.tasks.length,
      contextKind,
      parent,
    );
    const task = new TemplateCompilerSiteCursorMutableContextTask(context);
    this.tasks.push(task);
    this.tasksByContext.set(context, task);
    this.contextsByLocalKey.set(localKey, context);
    this.childrenByParent.get(parent)!.push(context);
    this.childrenByParent.set(context, []);
    this.nextChildScheduleIndex.set(context, 0);
    return context;
  }

  startRoot(parent: TemplateCompilerParentOccurrence, children: readonly TemplateCompilerNodeOccurrence[]): void {
    const rootTask = this.requireTask(this.rootContext);
    if (this.started || this.finished || this.runnable.length > 0 || rootTask.work.length > 0) {
      throw new Error('Compiler cursor root context task can start exactly once.');
    }
    const frame = new TemplateCompilerSiteCursorMutableFrame(
      this.rootContext,
      this.capturePhysicalChildren(parent, children),
    );
    this.started = true;
    rootTask.scheduled = true;
    rootTask.state = TemplateCompilerSiteCursorMutableTaskState.Active;
    rootTask.work.push(frame);
    this.runnable.push(rootTask);
  }

  pushContextFrame(
    context: TemplateCompilerSiteCursorContextReference,
    parent: TemplateCompilerParentOccurrence,
    children: readonly TemplateCompilerNodeOccurrence[],
  ): void {
    const task = this.requireActiveTask(context);
    const selection = this.currentSelection;
    if (
      selection?.context !== context
      || !frameParentFollowsVisit(parent, selection.visit)
    ) {
      throw new Error('Compiler cursor child frame requires the exact current node visit.');
    }
    task.work.push(new TemplateCompilerSiteCursorMutableFrame(
      context,
      this.capturePhysicalChildren(parent, children),
    ));
  }

  pushRootFrame(parent: TemplateCompilerParentOccurrence, children: readonly TemplateCompilerNodeOccurrence[]): void {
    this.pushContextFrame(this.rootContext, parent, children);
  }

  /** Stage the one complete logical root band owned by a generated context. */
  stageContextLogicalEntrantBand(
    context: TemplateCompilerSiteCursorContextReference,
    inputs: readonly TemplateCompilerSiteCursorLogicalEntrantInput[],
  ): readonly TemplateCompilerSiteCursorLogicalEntrantWork[] {
    const task = this.requireTask(context);
    if (task.logicalEntrantsStaged) {
      throw new Error('Compiler cursor context already owns its one complete logical entrant band.');
    }
    if (
      this.finished
      || inputs.length === 0
      || context.contextKind === TemplateCompilerSiteCursorContextKind.Root
      || task.state !== TemplateCompilerSiteCursorMutableTaskState.Pending
      || task.scheduled
    ) {
      throw new Error('Compiler cursor logical entrant band requires one unscheduled pending generated context.');
    }
    const physical = inputs.map((input) => new TemplateCompilerSiteCursorPhysicalSourcePlacement(
      cursorTaskAuthority,
      input.source,
      input.sourceOrdinal,
    ));
    if (new Set(physical.map((source) => source.node)).size !== physical.length) {
      throw new Error('Compiler cursor logical entrant band repeats one source occurrence.');
    }
    const entrants = physical.map((source, logicalOrdinal) => new TemplateCompilerSiteCursorLogicalEntrantWork(
      cursorTaskAuthority,
      context,
      source,
      logicalOrdinal,
      physical[logicalOrdinal + 1]?.node ?? null,
      inputs[logicalOrdinal]!.authority,
    ));
    task.logicalEntrantsStaged = true;
    task.work.push(new TemplateCompilerSiteCursorMutableLogicalEntrantBand(context, entrants));
    return entrants;
  }

  pushStagedElementContinuation(
    context: TemplateCompilerSiteCursorContextReference,
    visit: TemplateCompilerSiteCursorNodeVisit,
    continuation: object,
  ): TemplateCompilerSiteCursorStagedElementContinuationWork {
    this.requireOpen();
    const task = this.requireTask(context);
    const selection = this.currentSelection;
    if (
      selection == null
      || selection.visit !== visit
      || !contextIsSelfOrDescendant(context, selection.context)
      || (task.state !== TemplateCompilerSiteCursorMutableTaskState.Pending
        && task.state !== TemplateCompilerSiteCursorMutableTaskState.Active)
    ) {
      throw new Error('Compiler cursor continuation requires the exact current element visit and destination context.');
    }
    const work = new TemplateCompilerSiteCursorStagedElementContinuationWork(
      cursorTaskAuthority,
      context,
      selection,
      continuation,
    );
    task.work.push(work);
    return work;
  }

  scheduleChildContexts(
    parent: TemplateCompilerSiteCursorContextReference,
    children: readonly TemplateCompilerSiteCursorContextReference[],
  ): void {
    const parentTask = this.requireActiveTask(parent);
    if (children.length === 0) return;
    if (!this.nextChildrenAreExact(parent, children)) {
      throw new Error('Compiler cursor child scheduling diverged from context creation order.');
    }
    let previousOrdinal = -1;
    const childTasks = children.map((context) => {
      const task = this.requireTask(context);
      if (
        context.parent !== parent
        || context.ordinal <= previousOrdinal
        || task.scheduled
        || task.state !== TemplateCompilerSiteCursorMutableTaskState.Pending
      ) {
        throw new Error('Compiler cursor child tasks lost parent, creation order, or pending authority.');
      }
      previousOrdinal = context.ordinal;
      return task;
    });
    this.commitNextChildren(parent, children);
    parentTask.state = TemplateCompilerSiteCursorMutableTaskState.Waiting;
    this.currentSelection = null;
    for (let index = childTasks.length - 1; index >= 0; index--) {
      const task = childTasks[index]!;
      task.scheduled = true;
      this.runnable.push(task);
    }
    childTasks[0]!.state = TemplateCompilerSiteCursorMutableTaskState.Active;
  }

  scheduleChildContext(
    parent: TemplateCompilerSiteCursorContextReference,
    child: TemplateCompilerSiteCursorContextReference,
  ): void {
    this.scheduleChildContexts(parent, [child]);
  }

  /** Schedule a serial generated-context chain whose intermediate contexts are intentionally zero-work. */
  scheduleContextChain(
    parent: TemplateCompilerSiteCursorContextReference,
    contexts: readonly TemplateCompilerSiteCursorContextReference[],
  ): void {
    const parentTask = this.requireActiveTask(parent);
    if (contexts.length === 0) return;
    const tasks = contexts.map((context, index) => {
      const task = this.requireTask(context);
      const expectedParent = index === 0 ? parent : contexts[index - 1]!;
      if (
        context.parent !== expectedParent
        || !this.nextChildrenAreExact(expectedParent, [context])
        || task.scheduled
        || task.state !== TemplateCompilerSiteCursorMutableTaskState.Pending
        || (index < contexts.length - 1 && task.work.length !== 0)
      ) {
        throw new Error('Compiler cursor context chain lost parent order, pending state, or zero-work intermediates.');
      }
      return task;
    });
    contexts.forEach((context, index) => {
      this.commitNextChildren(index === 0 ? parent : contexts[index - 1]!, [context]);
    });
    parentTask.state = TemplateCompilerSiteCursorMutableTaskState.Waiting;
    this.currentSelection = null;
    for (const task of tasks) {
      task.scheduled = true;
      task.state = TemplateCompilerSiteCursorMutableTaskState.Waiting;
      this.runnable.push(task);
    }
    tasks[tasks.length - 1]!.state = TemplateCompilerSiteCursorMutableTaskState.Active;
  }

  next(): TemplateCompilerSiteCursorTaskSelection | null {
    if (!this.started || this.finished) {
      throw new Error('Compiler cursor task session is not active.');
    }
    this.currentSelection = null;
    while (this.runnable.length > 0) {
      const task = this.runnable[this.runnable.length - 1]!;
      if (
        task.state === TemplateCompilerSiteCursorMutableTaskState.Pending
        || task.state === TemplateCompilerSiteCursorMutableTaskState.Waiting
      ) {
        task.state = TemplateCompilerSiteCursorMutableTaskState.Active;
      }
      if (task.state !== TemplateCompilerSiteCursorMutableTaskState.Active) {
        throw new Error('Compiler cursor runnable stack exposed a non-active terminal task.');
      }
      const selected = task.nextSelection();
      if (selected != null) {
        this.currentSelection = selected;
        return selected;
      }
      task.state = TemplateCompilerSiteCursorMutableTaskState.Drained;
      this.runnable.pop();
    }
    return null;
  }

  nextRootVisit(): TemplateCompilerSiteCursorNodeVisit | null {
    const selected = this.next();
    if (selected == null) return null;
    if (
      selected.context !== this.rootContext
      || selected.selectionKind !== TemplateCompilerSiteCursorSelectionKind.PhysicalNode
      || selected.work != null
    ) {
      throw new Error('Compiler cursor root compatibility walk encountered logical context work.');
    }
    return selected.visit;
  }

  appendEvent(event: TemplateCompilerSiteCursorEvent): void {
    const context = this.currentContext ?? (this.started && this.runnable.length === 0 ? this.rootContext : null);
    if (context == null) throw new Error('Compiler cursor event requires one current context task.');
    this.appendContextEvent(context, event);
  }

  appendContextEvent(
    context: TemplateCompilerSiteCursorContextReference,
    event: TemplateCompilerSiteCursorEvent,
  ): void {
    this.requireOpen();
    const task = this.requireTask(context);
    const isCurrent = this.currentContext === context;
    const isDrainedRootTail = context === this.rootContext
      && task.state === TemplateCompilerSiteCursorMutableTaskState.Drained
      && this.runnable.length === 0;
    if (!this.started || (!isCurrent && !isDrainedRootTail)) {
      throw new Error('Compiler cursor event context is not current.');
    }
    this.eventLog.append(context, event, this.currentSelection);
  }

  appendRootEvent(event: TemplateCompilerSiteCursorEvent): void {
    this.appendContextEvent(this.rootContext, event);
  }

  replaceTerminalEvent(
    expected: TemplateCompilerSiteCursorEvent,
    replacement: TemplateCompilerSiteCursorEvent,
  ): void {
    this.requireOpen();
    this.eventLog.replaceTerminal(null, expected, replacement);
  }

  replaceTerminalRootEvent(
    expected: TemplateCompilerSiteCursorEvent,
    replacement: TemplateCompilerSiteCursorEvent,
  ): void {
    this.requireOpen();
    this.eventLog.replaceTerminal(this.rootContext, expected, replacement);
  }

  finish(frontier: TemplateCompilerSiteCursorFrontier | null): TemplateCompilerSiteCursorTaskSessionSnapshot {
    if (!this.started || this.finished) {
      throw new Error('Compiler cursor task session can finish exactly once after root start.');
    }
    const eventLog = this.eventLog.snapshot();
    if (frontier == null) {
      if (
        this.runnable.length > 0
        || this.tasks.some((task) => !task.scheduled || task.state !== TemplateCompilerSiteCursorMutableTaskState.Drained)
      ) {
        throw new Error('Drained compiler cursor task family still retains pending or runnable work.');
      }
    } else {
      const terminalBinding = eventLog.bindings.at(-1) ?? null;
      const terminalTask = terminalBinding == null ? null : this.tasksByContext.get(terminalBinding.context) ?? null;
      if (terminalBinding?.event !== frontier || terminalTask == null) {
        throw new Error('Stopped compiler cursor task family lost terminal frontier ownership.');
      }
      const reviveDrainedRoot =
        terminalTask.state === TemplateCompilerSiteCursorMutableTaskState.Drained
        && terminalTask.context === this.rootContext
        && this.runnable.length === 0;
      if (
        this.tasks.some((task) => !task.scheduled)
        || (!reviveDrainedRoot && (
          terminalTask !== this.runnable.at(-1)
          || terminalTask.state !== TemplateCompilerSiteCursorMutableTaskState.Active
        ))
      ) {
        throw new Error('Compiler cursor frontier has unscheduled contexts or does not belong to the active task.');
      }
      if (reviveDrainedRoot) this.runnable.push(terminalTask);
      terminalTask.state = TemplateCompilerSiteCursorMutableTaskState.Stopped;
      terminalTask.frontier = frontier;
      terminalTask.stopKind = isStructuralContextFrontier(frontier)
        ? TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
        : TemplateCompilerSiteCursorTaskStopKind.TerminalFrontier;
    }
    const snapshots = this.tasks.map((task) => task.snapshot(this.eventLog.bindingsForContext(task.context)));
    const snapshot = new TemplateCompilerSiteCursorTaskSessionSnapshot(
      cursorTaskAuthority,
      this.rootContext,
      snapshots,
      eventLog.events,
      eventLog.bindings,
      this.runnable.map((task) => task.context),
      frontier,
    );
    this.finished = true;
    return snapshot;
  }

  private requireOpen(): void {
    if (this.finished) throw new Error('Compiler cursor task session is already finished.');
  }

  private nextChildrenAreExact(
    parent: TemplateCompilerSiteCursorContextReference,
    children: readonly TemplateCompilerSiteCursorContextReference[],
  ): boolean {
    const created = this.childrenByParent.get(parent);
    const start = this.nextChildScheduleIndex.get(parent);
    return created != null
      && start != null
      && children.length > 0
      && children.every((context, offset) => created[start + offset] === context);
  }

  private commitNextChildren(
    parent: TemplateCompilerSiteCursorContextReference,
    children: readonly TemplateCompilerSiteCursorContextReference[],
  ): void {
    const start = this.nextChildScheduleIndex.get(parent);
    if (start == null || !this.nextChildrenAreExact(parent, children)) {
      throw new Error('Compiler cursor child scheduling diverged from context creation order.');
    }
    this.nextChildScheduleIndex.set(parent, start + children.length);
  }

  private requireTask(
    context: TemplateCompilerSiteCursorContextReference,
  ): TemplateCompilerSiteCursorMutableContextTask {
    const task = this.tasksByContext.get(context) ?? null;
    if (task == null) throw new Error('Compiler cursor context does not belong to this task session.');
    return task;
  }

  private requireActiveTask(
    context: TemplateCompilerSiteCursorContextReference,
  ): TemplateCompilerSiteCursorMutableContextTask {
    this.requireOpen();
    const task = this.requireTask(context);
    if (!this.started || task !== this.runnable.at(-1) || task.state !== TemplateCompilerSiteCursorMutableTaskState.Active) {
      throw new Error('Compiler cursor context task is not active.');
    }
    return task;
  }
}

function publicTaskState(
  state: TemplateCompilerSiteCursorMutableTaskState,
): TemplateCompilerSiteCursorContextTaskState {
  switch (state) {
    case TemplateCompilerSiteCursorMutableTaskState.Pending:
      return TemplateCompilerSiteCursorContextTaskState.Pending;
    case TemplateCompilerSiteCursorMutableTaskState.Waiting:
      return TemplateCompilerSiteCursorContextTaskState.Waiting;
    case TemplateCompilerSiteCursorMutableTaskState.Drained:
      return TemplateCompilerSiteCursorContextTaskState.Drained;
    case TemplateCompilerSiteCursorMutableTaskState.Stopped:
      return TemplateCompilerSiteCursorContextTaskState.Stopped;
    case TemplateCompilerSiteCursorMutableTaskState.Active:
      throw new Error('Active compiler cursor task cannot escape a terminal snapshot.');
  }
}

function snapshotWork(work: TemplateCompilerSiteCursorMutableWork): TemplateCompilerSiteCursorWorkSnapshot {
  if (work instanceof TemplateCompilerSiteCursorMutableFrame) return work.snapshot();
  if (work instanceof TemplateCompilerSiteCursorMutableLogicalEntrantBand) return work.snapshot();
  return work;
}

function workIsExactForContext(
  work: TemplateCompilerSiteCursorWorkSnapshot,
  context: TemplateCompilerSiteCursorContextReference,
): boolean {
  if (work instanceof TemplateCompilerSiteCursorFrameSnapshot) {
    return work.isModuleConstructed() && work.context === context;
  }
  return work.isModuleConstructed() && work.context === context;
}

function workStackChainIsExact(
  work: readonly TemplateCompilerSiteCursorWorkSnapshot[],
  state: TemplateCompilerSiteCursorContextTaskState,
  lastVisit: TemplateCompilerSiteCursorNodeVisit | null,
  lastWork: TemplateCompilerSiteCursorLogicalWork | null,
): boolean {
  for (let index = 1; index < work.length; index++) {
    const current = work[index]!;
    if (!(current instanceof TemplateCompilerSiteCursorFrameSnapshot)) continue;
    const previous = work[index - 1]!;
    const previousNode = previous instanceof TemplateCompilerSiteCursorFrameSnapshot
      ? previous.nextOrdinal === 0 ? null : previous.children[previous.nextOrdinal - 1] ?? null
      : previous instanceof TemplateCompilerSiteCursorLogicalEntrantBandSnapshot
        ? previous.nextOrdinal === 0 ? null : previous.entrants[previous.nextOrdinal - 1]?.node ?? null
        : previous.visit.node;
    if (previousNode == null || !frameParentFollowsNode(current.parent, previousNode)) return false;
  }
  if (state === TemplateCompilerSiteCursorContextTaskState.Pending) {
    return lastVisit == null && lastWork == null;
  }
  const active = work.at(-1) ?? null;
  if (active instanceof TemplateCompilerSiteCursorStagedElementContinuationWork) {
    return active.visit === lastVisit;
  }
  if (lastWork instanceof TemplateCompilerSiteCursorStagedElementContinuationWork) {
    return lastVisit === lastWork.visit;
  }
  if (active instanceof TemplateCompilerSiteCursorFrameSnapshot && lastVisit != null && lastWork == null) {
    return active.nextOrdinal > 0
      && active.parent === lastVisit.parent
      && active.children[active.nextOrdinal - 1] === lastVisit.node;
  }
  if (
    active instanceof TemplateCompilerSiteCursorLogicalEntrantBandSnapshot
    && lastWork instanceof TemplateCompilerSiteCursorLogicalEntrantWork
  ) {
    return active.nextOrdinal > 0
      && active.entrants[active.nextOrdinal - 1] === lastWork
      && lastVisit?.entrantWork === lastWork;
  }
  return true;
}

function contextIsSelfOrDescendant(
  context: TemplateCompilerSiteCursorContextReference,
  ancestor: TemplateCompilerSiteCursorContextReference,
): boolean {
  let current: TemplateCompilerSiteCursorContextReference | null = context;
  while (current != null) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function frameParentFollowsVisit(
  parent: TemplateCompilerParentOccurrence,
  visit: TemplateCompilerSiteCursorNodeVisit,
): boolean {
  return frameParentFollowsNode(parent, visit.node);
}

function frameParentFollowsNode(
  parent: TemplateCompilerParentOccurrence,
  node: TemplateCompilerNodeOccurrence,
): boolean {
  return parent === node
    || (
      parent instanceof TemplateCompilerFragmentOccurrence
      && parent.parent === node
      && parent.parentEdgeKind === TemplateCompilerOccurrenceEdgeKind.TemplateContent
    );
}

function sameObjects(left: readonly object[], right: readonly object[]): boolean {
  return left.length === right.length && left.every((value, ordinal) => value === right[ordinal]);
}

function isStructuralContextFrontier(frontier: TemplateCompilerSiteCursorFrontier | null): boolean {
  return frontier?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController
    || frontier?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection;
}
