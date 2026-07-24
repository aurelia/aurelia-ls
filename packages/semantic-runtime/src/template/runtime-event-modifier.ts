/**
 * Built-in modifier tokens registered by runtime-html's EventModifierRegistration.
 *
 * This is the framework-default vocabulary. Custom IModifiedEventHandlerCreator and IKeyMapping registrations
 * can replace or extend the effective app domain, so consumers must retain that registration boundary as open.
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

const universalEventModifiers = [
  RuntimeEventModifierName.Prevent,
  RuntimeEventModifierName.Stop,
] as const;

const mouseEventModifiers = [
  ...universalEventModifiers,
  RuntimeEventModifierName.Left,
  RuntimeEventModifierName.Middle,
  RuntimeEventModifierName.Right,
  RuntimeEventModifierName.Control,
  RuntimeEventModifierName.Alt,
  RuntimeEventModifierName.Shift,
  RuntimeEventModifierName.Meta,
] as const;

const keyboardEventModifiers = [
  ...universalEventModifiers,
  RuntimeEventModifierName.Control,
  RuntimeEventModifierName.Alt,
  RuntimeEventModifierName.Shift,
  RuntimeEventModifierName.Meta,
  RuntimeEventModifierName.Escape,
  RuntimeEventModifierName.Enter,
  RuntimeEventModifierName.Space,
  RuntimeEventModifierName.Tab,
  ...defaultKeyboardCharacterModifiers(),
] as const;

function defaultKeyboardCharacterModifiers(): readonly string[] {
  const lowerCaseLetters = Array.from(
    { length: 26 },
    (_, index) => String.fromCharCode(97 + index),
  );
  const upperCaseCodes = Array.from(
    { length: 26 },
    (_, index) => String(65 + index),
  );
  const lowerCaseCodes = Array.from(
    { length: 26 },
    (_, index) => String(97 + index),
  );
  // Framework docs and source comments promise A-Z/a-z. The vendored runtime's length 25 is an off-by-one bug;
  // tooling models the intended range so `z`, `90`, and `122` remain authorable after the runtime correction.
  return [...lowerCaseLetters, ...upperCaseCodes, ...lowerCaseCodes];
}

/** Read the built-in modifier vocabulary selected by runtime-html for an event name. */
export function builtInRuntimeEventModifierNames(
  eventName: string,
): readonly string[] {
  switch (eventName) {
    case 'click':
    case 'mousedown':
    case 'mousemove':
    case 'mouseup':
    case 'dblclick':
    case 'contextmenu':
      return mouseEventModifiers;
    case 'keydown':
    case 'keyup':
      return keyboardEventModifiers;
    default:
      return universalEventModifiers;
  }
}
