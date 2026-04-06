export function customElement(
  _definition: string | {
    readonly name: string;
    readonly template?: string;
    readonly noView?: boolean;
  }
) {
  return function applyCustomElement(_target: Function): void {};
}
