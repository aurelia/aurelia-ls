export type PackageId = 'runtime-html' | 'template-compiler';

/**
 * Pure marker decorator that lets au-mcp correlate new analysis substrate boundaries with the Aurelia runtime.
 *
 * Keep this catalog small while the compiler model is being rebuilt. Old mirror-era placements should not be
 * treated as semantic ground truth for new producers.
 */
export function auLink(id: 'runtime-html:CustomElementDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:CustomAttributeDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:ValueConverterDefinition'): ClassDecorator;
export function auLink(id: 'runtime-html:BindingBehaviorDefinition'): ClassDecorator;
export function auLink(id: 'template-compiler:BindingCommandDefinition'): ClassDecorator;
export function auLink(id: 'template-compiler:AttributePattern'): ClassDecorator;
export function auLink(_id: `${PackageId}:${string}`): ClassDecorator {
  return function <TFunction extends Function>(_target: TFunction): void {
    // Marker only.
  };
}
