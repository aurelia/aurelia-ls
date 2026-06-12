import {
  BindableBindingMode,
  BindableSetterKind,
} from './bindable-definition.js';
import { bindableAttributeNameForProperty } from './bindable-attribute.js';

/** Framework-owned bindable metadata for one built-in resource target. */
export interface BuiltInResourceBindableDescriptor {
  /** Runtime property name on the built-in resource view-model. */
  readonly name: string;
  /** Authored template attribute name that maps to the runtime property. */
  readonly attribute: string;
  /** Conventional change-callback name used by Aurelia bindable metadata. */
  readonly callback: string;
  /** Binding mode declared by the framework for this built-in bindable. */
  readonly mode: BindableBindingMode;
  /** Setter strategy declared by the framework for this built-in bindable. */
  readonly setterKind: BindableSetterKind;
  /** Framework setter target name when the bindable has an explicit setter function. */
  readonly setterName: string | null;
}

interface BuiltInResourceBindableInput {
  readonly name: string;
  readonly attribute?: string;
  readonly callback?: string;
  readonly mode?: BindableBindingMode;
  readonly setterKind?: BindableSetterKind;
  readonly setterName?: string;
}

/** Built-in custom-element bindables keyed by framework target class name. */
export function builtInElementBindableDescriptors(
  targetName: string,
): readonly BuiltInResourceBindableDescriptor[] {
  switch (targetName) {
    case 'AuCompose':
      return bindableDescriptors([
        { name: 'template' },
        { name: 'component' },
        { name: 'model' },
        { name: 'scopeBehavior', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.scopeBehavior.set' },
        { name: 'composing', mode: BindableBindingMode.FromView },
        { name: 'composition', mode: BindableBindingMode.FromView },
        { name: 'tag' },
        { name: 'flushMode', setterKind: BindableSetterKind.Function, setterName: 'AuCompose.flushMode.set' },
      ]);
    case 'AuSlot':
      return bindableDescriptors([
        { name: 'expose' },
        { name: 'slotchange' },
      ]);
    case 'ViewportCustomElement':
      return bindableDescriptors([
        { name: 'name' },
        { name: 'usedBy' },
        { name: 'default' },
        { name: 'fallback' },
      ]);
    case 'ValidationContainerCustomElement':
      return bindableDescriptors([
        { name: 'controller' },
        { name: 'errors' },
      ]);
    default:
      return [];
  }
}

/** Built-in custom-attribute bindables keyed by framework target class name. */
export function builtInAttributeBindableDescriptors(
  targetName: string,
): readonly BuiltInResourceBindableDescriptor[] {
  switch (targetName) {
    case 'If':
      return bindableDescriptors([
        { name: 'value' },
        { name: 'cache', setterKind: BindableSetterKind.Function, setterName: 'If.cache.set' },
      ]);
    case 'Repeat':
      return bindableDescriptors([{ name: 'items' }]);
    case 'VirtualRepeat':
      return bindableDescriptors([
        { name: 'local' },
        { name: 'items' },
      ]);
    case 'With':
    case 'Switch':
    case 'PromiseTemplateController':
    case 'Show':
      return bindableDescriptors([{ name: 'value' }]);
    case 'PendingTemplateController':
      return bindableDescriptors([{ name: 'value', mode: BindableBindingMode.ToView }]);
    case 'FulfilledTemplateController':
    case 'RejectedTemplateController':
      return bindableDescriptors([{ name: 'value', mode: BindableBindingMode.FromView }]);
    case 'Case':
    case 'DefaultCase':
      return bindableDescriptors([
        { name: 'value' },
        {
          name: 'fallThrough',
          mode: BindableBindingMode.OneTime,
          setterKind: BindableSetterKind.Function,
          setterName: `${targetName}.fallThrough.set`,
        },
      ]);
    case 'Portal':
      return bindableDescriptors([
        { name: 'target' },
        { name: 'position' },
        { name: 'activated' },
        { name: 'activating' },
        { name: 'callbackContext' },
        { name: 'renderContext', callback: 'targetChanged' },
        { name: 'strict' },
        { name: 'deactivated' },
        { name: 'deactivating' },
      ]);
    case 'Focus':
      return bindableDescriptors([{ name: 'value', mode: BindableBindingMode.TwoWay }]);
    case 'LoadCustomAttribute':
      return bindableDescriptors([
        { name: 'route' },
        { name: 'params' },
        { name: 'attribute' },
        { name: 'active', mode: BindableBindingMode.FromView },
        { name: 'context' },
      ]);
    case 'HrefCustomAttribute':
      return bindableDescriptors([{ name: 'value' }]);
    case 'ValidationErrorsCustomAttribute':
      return bindableDescriptors([
        { name: 'controller' },
        { name: 'errors', mode: BindableBindingMode.TwoWay },
      ]);
    case 'Else':
    default:
      return [];
  }
}

/** Default bindable property used by built-in custom-attribute shorthand values. */
export function builtInDefaultProperty(targetName: string): string {
  switch (targetName) {
    case 'Repeat':
    case 'VirtualRepeat':
      return 'items';
    case 'Portal':
      return 'target';
    case 'LoadCustomAttribute':
      return 'route';
    case 'ValidationErrorsCustomAttribute':
      return 'errors';
    default:
      return 'value';
  }
}

/** Whether a built-in custom attribute rejects inline multi-binding syntax. */
export function builtInNoMultiBindings(targetName: string): boolean {
  switch (targetName) {
    case 'HrefCustomAttribute':
      return true;
    default:
      return false;
  }
}

/** Find the authored attribute name for one built-in resource bindable. */
export function builtInResourceBindableAttribute(
  targetName: string,
  bindableName: string,
): string {
  const bindable = [
    ...builtInElementBindableDescriptors(targetName),
    ...builtInAttributeBindableDescriptors(targetName),
  ].find((candidate) => candidate.name === bindableName);
  return bindable?.attribute ?? bindableAttributeNameForProperty(bindableName);
}

function bindableDescriptors(
  inputs: readonly BuiltInResourceBindableInput[],
): readonly BuiltInResourceBindableDescriptor[] {
  return inputs.map((input) => ({
    name: input.name,
    attribute: input.attribute ?? bindableAttributeNameForProperty(input.name),
    callback: input.callback ?? `${input.name}Changed`,
    mode: input.mode ?? BindableBindingMode.ToView,
    setterKind: input.setterKind ?? BindableSetterKind.Default,
    setterName: input.setterName ?? null,
  }));
}
