import type {
  AddressHandle,
  ProvenanceHandle,
} from '../kernel/handles.js';

/**
 * Built-in modifier tokens registered by runtime-html's EventModifierRegistration.
 *
 * Custom IModifiedEventHandlerCreator registrations can replace the effective handler for an event type, so consumers
 * must retain that registration boundary as open even when the default handler's vocabulary is known.
 */
export const enum RuntimeEventModifierName {
  /** Prevent the browser's default action after the listener accepts the event. */
  Prevent = 'prevent',
  /** Stop propagation after the listener accepts the event. */
  Stop = 'stop',
  /** Require the primary mouse button. */
  Left = 'left',
  /** Require the auxiliary mouse button. */
  Middle = 'middle',
  /** Require the secondary mouse button. */
  Right = 'right',
  /** Require the Control modifier key. */
  Control = 'ctrl',
  /** Require the Alt modifier key. */
  Alt = 'alt',
  /** Require the Shift modifier key. */
  Shift = 'shift',
  /** Require the platform Meta modifier key. */
  Meta = 'meta',
  /** Require the Escape key through the default IKeyMapping. */
  Escape = 'escape',
  /** Require the Enter key through the default IKeyMapping. */
  Enter = 'enter',
  /** Require the Space key through the default IKeyMapping. */
  Space = 'space',
  /** Require the Tab key through the default IKeyMapping. */
  Tab = 'tab',
}

/** One effective IKeyMapping entry, including app-authored source when a task replaced or introduced it. */
export class RuntimeKeyMappingEntry {
  constructor(
    /** Modifier spelling consumed by a modified event handler. */
    readonly modifier: string,
    /** Runtime key or meta-property spelling selected by IKeyMapping. */
    readonly runtimeName: string,
    /** Exact app-authored key/value mutation, absent for framework defaults. */
    readonly sourceAddressHandle: AddressHandle | null = null,
    /** Source witness for the app-authored mutation, absent for framework defaults. */
    readonly provenanceHandle: ProvenanceHandle | null = null,
  ) {}
}

/** App-effective IKeyMapping state after statically reached lifecycle-task mutations. */
export class RuntimeKeyMappingConfiguration {
  static readonly frameworkDefault = new RuntimeKeyMappingConfiguration(
    defaultRuntimeMetaMappings(),
    defaultRuntimeKeyMappings(),
    true,
    true,
  );

  constructor(
    /** Effective modifier names mapped to KeyboardEvent/MouseEvent meta-property prefixes. */
    readonly meta: readonly RuntimeKeyMappingEntry[],
    /** Effective modifier names mapped to KeyboardEvent.key values. */
    readonly keys: readonly RuntimeKeyMappingEntry[],
    /** Whether every runtime meta entry is known. */
    readonly metaDomainClosed: boolean,
    /** Whether every runtime key entry is known. */
    readonly keyDomainClosed: boolean,
  ) {}
}

/** One completion-ready modifier name after framework defaults and app-effective key mapping have converged. */
export class RuntimeEventModifierCandidate {
  constructor(
    readonly name: string,
    readonly sourceAddressHandle: AddressHandle | null,
    readonly provenanceHandle: ProvenanceHandle | null,
  ) {}
}

/** Known modifier candidates and closure for the key-mapping fields consulted by one runtime handler family. */
export class RuntimeEventModifierCatalog {
  constructor(
    readonly candidates: readonly RuntimeEventModifierCandidate[],
    readonly keyMappingDomainClosed: boolean,
  ) {}
}

const universalEventModifiers = [
  RuntimeEventModifierName.Prevent,
  RuntimeEventModifierName.Stop,
] as const;

const mouseEventModifiers = [
  ...universalEventModifiers,
  RuntimeEventModifierName.Left,
  RuntimeEventModifierName.Middle,
  RuntimeEventModifierName.Right,
] as const;

/** Read known modifier candidates selected by the handler family and app-effective IKeyMapping. */
export function runtimeEventModifierCatalog(
  eventName: string,
  keyMapping: RuntimeKeyMappingConfiguration = RuntimeKeyMappingConfiguration.frameworkDefault,
): RuntimeEventModifierCatalog {
  const candidates: RuntimeEventModifierCandidate[] = [];
  switch (eventName) {
    case 'click':
    case 'mousedown':
    case 'mousemove':
    case 'mouseup':
    case 'dblclick':
    case 'contextmenu': {
      appendFrameworkModifiers(candidates, mouseEventModifiers);
      appendKeyMappingEntries(candidates, keyMapping.meta);
      return new RuntimeEventModifierCatalog(candidates, keyMapping.metaDomainClosed);
    }
    case 'keydown':
    case 'keyup': {
      appendFrameworkModifiers(candidates, universalEventModifiers);
      appendKeyMappingEntries(candidates, keyMapping.meta);
      appendKeyMappingEntries(candidates, keyMapping.keys);
      return new RuntimeEventModifierCatalog(
        candidates,
        keyMapping.metaDomainClosed && keyMapping.keyDomainClosed,
      );
    }
    default:
      appendFrameworkModifiers(candidates, universalEventModifiers);
      return new RuntimeEventModifierCatalog(candidates, true);
  }
}

function appendFrameworkModifiers(
  candidates: RuntimeEventModifierCandidate[],
  names: readonly RuntimeEventModifierName[],
): void {
  for (const name of names) {
    appendRuntimeEventModifierCandidate(candidates, new RuntimeEventModifierCandidate(name, null, null));
  }
}

function appendKeyMappingEntries(
  candidates: RuntimeEventModifierCandidate[],
  entries: readonly RuntimeKeyMappingEntry[],
): void {
  for (const entry of entries) {
    appendRuntimeEventModifierCandidate(candidates, new RuntimeEventModifierCandidate(
      entry.modifier,
      entry.sourceAddressHandle,
      entry.provenanceHandle,
    ));
  }
}

function appendRuntimeEventModifierCandidate(
  candidates: RuntimeEventModifierCandidate[],
  candidate: RuntimeEventModifierCandidate,
): void {
  const index = candidates.findIndex((current) => current.name === candidate.name);
  if (index < 0) {
    candidates.push(candidate);
    return;
  }
  if (candidate.sourceAddressHandle != null) {
    candidates[index] = candidate;
  }
}

function defaultRuntimeMetaMappings(): readonly RuntimeKeyMappingEntry[] {
  return [
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Control, RuntimeEventModifierName.Control),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Alt, RuntimeEventModifierName.Alt),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Shift, RuntimeEventModifierName.Shift),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Meta, RuntimeEventModifierName.Meta),
  ];
}

function defaultRuntimeKeyMappings(): readonly RuntimeKeyMappingEntry[] {
  const entries = [
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Escape, 'Escape'),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Enter, 'Enter'),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Space, 'Space'),
    new RuntimeKeyMappingEntry(RuntimeEventModifierName.Tab, 'tab'),
  ];
  // RC2's framework key map covers the complete A-Z/a-z range, including `z`, `90`, and `122`.
  for (let index = 0; index < 26; index += 1) {
    const upper = String.fromCharCode(65 + index);
    const lower = String.fromCharCode(97 + index);
    entries.push(
      new RuntimeKeyMappingEntry(String(65 + index), upper),
      new RuntimeKeyMappingEntry(String(97 + index), lower),
      new RuntimeKeyMappingEntry(lower, lower),
    );
  }
  return entries;
}
