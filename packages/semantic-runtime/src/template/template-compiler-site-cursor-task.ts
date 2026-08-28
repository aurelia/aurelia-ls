import type {
  TemplateCompilerNodeOccurrence,
  TemplateCompilerParentOccurrence,
} from './template-compiler-occurrence.js';
import { TemplateCompilerOccurrenceEdgeKind } from './template-compiler-occurrence.js';
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

export const enum TemplateCompilerSiteCursorContextTaskState {
  Drained = 'drained',
  Stopped = 'stopped',
}

export const enum TemplateCompilerSiteCursorTaskStopKind {
  StructuralFrontier = 'structural-frontier',
  TerminalFrontier = 'terminal-frontier',
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

/** One exact event-to-context ownership edge in total cursor order. */
export class TemplateCompilerSiteCursorContextEventBinding {
  constructor(
    readonly ordinal: number,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly event: TemplateCompilerSiteCursorEvent,
  ) {
    if (
      !context.isModuleConstructed()
      || !Number.isSafeInteger(ordinal)
      || ordinal < 0
      || event.ordinal !== ordinal
    ) {
      throw new Error('Compiler cursor event binding lost context or ordinal authority.');
    }
  }
}

/** Event-time visit selected from one immutable container-child snapshot. */
export class TemplateCompilerSiteCursorNodeVisit {
  readonly #authority: object;

  constructor(
    authority: object,
    readonly parent: TemplateCompilerParentOccurrence,
    readonly children: readonly TemplateCompilerNodeOccurrence[],
    readonly node: TemplateCompilerNodeOccurrence,
    readonly parentOrdinal: number,
    readonly capturedSuccessor: TemplateCompilerNodeOccurrence | null,
  ) {
    if (
      authority !== cursorTaskAuthority
      || !Number.isSafeInteger(parentOrdinal)
      || parentOrdinal < 0
      || children[parentOrdinal] !== node
      || (children[parentOrdinal + 1] ?? null) !== capturedSuccessor
    ) {
      throw new Error('Compiler cursor node visit lost captured parent, ordinal, or successor authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }
}

/** Immutable historical position in one previously validated container snapshot. */
export class TemplateCompilerSiteCursorFrameSnapshot {
  readonly #authority: object;
  readonly children: readonly TemplateCompilerNodeOccurrence[];

  constructor(
    authority: object,
    readonly parent: TemplateCompilerParentOccurrence,
    children: readonly TemplateCompilerNodeOccurrence[],
    readonly nextOrdinal: number,
  ) {
    this.children = [...children];
    if (
      authority !== cursorTaskAuthority
      || !Number.isSafeInteger(nextOrdinal)
      || nextOrdinal < 0
      || nextOrdinal > this.children.length
    ) {
      throw new Error('Compiler cursor frame snapshot lost parent or next-ordinal authority.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  readRemainingChildren(): readonly TemplateCompilerNodeOccurrence[] {
    return this.children.slice(this.nextOrdinal);
  }
}

/** Immutable terminal state of one logical cursor context task. */
export class TemplateCompilerSiteCursorContextTaskSnapshot {
  readonly #authority: object;
  readonly remainingFrames: readonly TemplateCompilerSiteCursorFrameSnapshot[];

  constructor(
    authority: object,
    readonly context: TemplateCompilerSiteCursorContextReference,
    readonly state: TemplateCompilerSiteCursorContextTaskState,
    remainingFrames: readonly TemplateCompilerSiteCursorFrameSnapshot[],
    readonly lastVisit: TemplateCompilerSiteCursorNodeVisit | null,
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
    readonly stopKind: TemplateCompilerSiteCursorTaskStopKind | null,
  ) {
    this.remainingFrames = [...remainingFrames];
    const drained = state === TemplateCompilerSiteCursorContextTaskState.Drained;
    const stopped = state === TemplateCompilerSiteCursorContextTaskState.Stopped;
    const activeFrame = this.remainingFrames.at(-1) ?? null;
    const frameChainIsExact = this.remainingFrames.every((frame, index) => {
      if (index === 0) return true;
      const parentFrame = this.remainingFrames[index - 1]!;
      return parentFrame.nextOrdinal > 0
        && parentFrame.children[parentFrame.nextOrdinal - 1] === frame.parent;
    });
    const visitMatchesActiveFrame = activeFrame == null
      ? true
      : lastVisit == null
        ? this.remainingFrames.length === 1 && activeFrame.nextOrdinal === 0
        : lastVisit.parent === activeFrame.parent
          && lastVisit.children.length === activeFrame.children.length
          && lastVisit.children.every((child, ordinal) => child === activeFrame.children[ordinal])
          && activeFrame.nextOrdinal > 0
          && activeFrame.children[activeFrame.nextOrdinal - 1] === lastVisit.node
          && lastVisit.parentOrdinal === activeFrame.nextOrdinal - 1;
    const structuralFrontierIsExact = stopKind !== TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
      || (
        frontier != null
        && this.remainingFrames.length > 0
        && lastVisit?.node === frontier.node
        && lastVisit.capturedSuccessor === frontier.capturedSuccessor
      );
    if (
      authority !== cursorTaskAuthority
      || !context.isModuleConstructed()
      || drained === stopped
      || (drained && (frontier != null || stopKind != null || this.remainingFrames.length > 0))
      || (stopped && (frontier == null || stopKind == null))
      || (stopKind === TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
        && !isStructuralContextFrontier(frontier))
      || (stopKind === TemplateCompilerSiteCursorTaskStopKind.TerminalFrontier
        && isStructuralContextFrontier(frontier))
      || this.remainingFrames.some((frame) => !frame.isModuleConstructed())
      || !frameChainIsExact
      || !visitMatchesActiveFrame
      || !structuralFrontierIsExact
    ) {
      throw new Error('Compiler cursor context task lost drained/frontier frame authority.');
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
  readonly #contextByEvent: ReadonlyMap<TemplateCompilerSiteCursorEvent, TemplateCompilerSiteCursorContextReference>;

  constructor(
    authority: object,
    readonly rootContext: TemplateCompilerSiteCursorContextReference,
    contexts: readonly TemplateCompilerSiteCursorContextTaskSnapshot[],
    events: readonly TemplateCompilerSiteCursorEvent[],
    eventBindings: readonly TemplateCompilerSiteCursorContextEventBinding[],
    readonly frontier: TemplateCompilerSiteCursorFrontier | null,
  ) {
    this.contexts = [...contexts];
    this.events = [...events];
    this.eventBindings = [...eventBindings];
    this.#contextByEvent = new Map(this.eventBindings.map((binding) => [binding.event, binding.context] as const));
    const rootTask = this.contexts.length === 1 ? this.contexts[0] : null;
    if (
      authority !== cursorTaskAuthority
      || !rootContext.isModuleConstructed()
      || rootContext.contextKind !== TemplateCompilerSiteCursorContextKind.Root
      || rootContext.parent !== null
      || rootTask?.isModuleConstructed() !== true
      || rootTask?.context !== rootContext
      || rootTask.frontier !== frontier
      || this.events.length !== this.eventBindings.length
      || this.#contextByEvent.size !== this.events.length
      || this.eventBindings.some((binding, ordinal) =>
        binding.ordinal !== ordinal
        || binding.event !== this.events[ordinal]
        || binding.event.ordinal !== ordinal
        || binding.context !== rootContext
      )
      || (frontier == null
        ? rootTask?.state !== TemplateCompilerSiteCursorContextTaskState.Drained
        : rootTask?.state !== TemplateCompilerSiteCursorContextTaskState.Stopped
          || this.events.at(-1) !== frontier
          || this.#contextByEvent.get(frontier) !== rootContext)
    ) {
      throw new Error('Compiler cursor task snapshot lost context, event, or frontier ownership.');
    }
    this.#authority = authority;
  }

  isModuleConstructed(): boolean {
    return this.#authority === cursorTaskAuthority;
  }

  contextForEvent(event: TemplateCompilerSiteCursorEvent): TemplateCompilerSiteCursorContextReference | null {
    return this.#contextByEvent.get(event) ?? null;
  }
}

class TemplateCompilerSiteCursorMutableFrame {
  readonly children: readonly TemplateCompilerNodeOccurrence[];
  nextOrdinal = 0;

  constructor(readonly parent: TemplateCompilerParentOccurrence, children: readonly TemplateCompilerNodeOccurrence[]) {
    this.children = [...children];
    const captured = parent.readChildren();
    if (
      captured.length !== this.children.length
      || this.children.some((child, ordinal) =>
        child !== captured[ordinal]
        || child.parent !== parent
        || child.parentEdgeKind !== TemplateCompilerOccurrenceEdgeKind.Child
      )
    ) {
      throw new Error('Compiler cursor frame requires one exact captured parent-child sequence.');
    }
  }

  snapshot(): TemplateCompilerSiteCursorFrameSnapshot {
    return new TemplateCompilerSiteCursorFrameSnapshot(
      cursorTaskAuthority,
      this.parent,
      this.children,
      this.nextOrdinal,
    );
  }
}

class TemplateCompilerSiteCursorEventLog {
  private readonly events: TemplateCompilerSiteCursorEvent[] = [];
  private readonly bindings: TemplateCompilerSiteCursorContextEventBinding[] = [];

  append(context: TemplateCompilerSiteCursorContextReference, event: TemplateCompilerSiteCursorEvent): void {
    if (event.ordinal !== this.events.length) {
      throw new Error(`Compiler cursor event ${event.ordinal} does not continue total event order.`);
    }
    this.events.push(event);
    this.bindings.push(new TemplateCompilerSiteCursorContextEventBinding(
      this.bindings.length,
      context,
      event,
    ));
  }

  replaceTerminal(
    expected: TemplateCompilerSiteCursorEvent,
    replacement: TemplateCompilerSiteCursorEvent,
  ): void {
    const ordinal = this.events.length - 1;
    const binding = this.bindings[ordinal] ?? null;
    if (
      ordinal < 0
      || this.events[ordinal] !== expected
      || binding?.event !== expected
      || replacement.ordinal !== ordinal
    ) {
      throw new Error('Compiler cursor terminal event replacement lost event or context authority.');
    }
    this.events[ordinal] = replacement;
    this.bindings[ordinal] = new TemplateCompilerSiteCursorContextEventBinding(
      ordinal,
      binding.context,
      replacement,
    );
  }

  snapshot(): {
    readonly events: readonly TemplateCompilerSiteCursorEvent[];
    readonly bindings: readonly TemplateCompilerSiteCursorContextEventBinding[];
  } {
    return { events: [...this.events], bindings: [...this.bindings] };
  }
}

/** Session-owned task/frame/event state retained until the whole root cursor finishes exactly once. */
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

  private readonly frames: TemplateCompilerSiteCursorMutableFrame[] = [];
  private readonly eventLog = new TemplateCompilerSiteCursorEventLog();
  private lastVisit: TemplateCompilerSiteCursorNodeVisit | null = null;
  private started = false;
  private finished = false;

  private constructor(readonly rootContext: TemplateCompilerSiteCursorContextReference) {}

  startRoot(parent: TemplateCompilerParentOccurrence, children: readonly TemplateCompilerNodeOccurrence[]): void {
    if (this.started || this.finished || this.frames.length > 0) {
      throw new Error('Compiler cursor root context task can start exactly once.');
    }
    this.started = true;
    this.frames.push(new TemplateCompilerSiteCursorMutableFrame(parent, children));
  }

  pushRootFrame(parent: TemplateCompilerParentOccurrence, children: readonly TemplateCompilerNodeOccurrence[]): void {
    if (!this.started || this.finished || this.frames.length === 0) {
      throw new Error('Compiler cursor child frame requires one active root context task.');
    }
    this.frames.push(new TemplateCompilerSiteCursorMutableFrame(parent, children));
  }

  nextRootVisit(): TemplateCompilerSiteCursorNodeVisit | null {
    if (!this.started || this.finished) {
      throw new Error('Compiler cursor root task is not active.');
    }
    while (this.frames.length > 0) {
      const frame = this.frames[this.frames.length - 1]!;
      if (frame.nextOrdinal >= frame.children.length) {
        this.frames.pop();
        continue;
      }
      const parentOrdinal = frame.nextOrdinal++;
      const node = frame.children[parentOrdinal]!;
      const visit = new TemplateCompilerSiteCursorNodeVisit(
        cursorTaskAuthority,
        frame.parent,
        frame.children,
        node,
        parentOrdinal,
        frame.children[parentOrdinal + 1] ?? null,
      );
      this.lastVisit = visit;
      return visit;
    }
    return null;
  }

  appendRootEvent(event: TemplateCompilerSiteCursorEvent): void {
    if (this.finished) throw new Error('Compiler cursor task session is already finished.');
    this.eventLog.append(this.rootContext, event);
  }

  replaceTerminalRootEvent(
    expected: TemplateCompilerSiteCursorEvent,
    replacement: TemplateCompilerSiteCursorEvent,
  ): void {
    if (this.finished) throw new Error('Compiler cursor task session is already finished.');
    this.eventLog.replaceTerminal(expected, replacement);
  }

  finish(frontier: TemplateCompilerSiteCursorFrontier | null): TemplateCompilerSiteCursorTaskSessionSnapshot {
    if (!this.started || this.finished) {
      throw new Error('Compiler cursor task session can finish exactly once after root start.');
    }
    const state = frontier == null
      ? TemplateCompilerSiteCursorContextTaskState.Drained
      : TemplateCompilerSiteCursorContextTaskState.Stopped;
    const stopKind = frontier == null
      ? null
      : isStructuralContextFrontier(frontier)
        ? TemplateCompilerSiteCursorTaskStopKind.StructuralFrontier
        : TemplateCompilerSiteCursorTaskStopKind.TerminalFrontier;
    if (state === TemplateCompilerSiteCursorContextTaskState.Drained && this.frames.length > 0) {
      throw new Error('Drained compiler cursor root task still retains traversal frames.');
    }
    const task = new TemplateCompilerSiteCursorContextTaskSnapshot(
      cursorTaskAuthority,
      this.rootContext,
      state,
      this.frames.map((frame) => frame.snapshot()),
      this.lastVisit,
      frontier,
      stopKind,
    );
    const eventLog = this.eventLog.snapshot();
    const snapshot = new TemplateCompilerSiteCursorTaskSessionSnapshot(
      cursorTaskAuthority,
      this.rootContext,
      [task],
      eventLog.events,
      eventLog.bindings,
      frontier,
    );
    this.finished = true;
    return snapshot;
  }
}

function isStructuralContextFrontier(frontier: TemplateCompilerSiteCursorFrontier | null): boolean {
  return frontier?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeTemplateController
    || frontier?.frontierKind === TemplateCompilerSiteCursorFrontierKind.AfterAttributesBeforeProjection;
}
