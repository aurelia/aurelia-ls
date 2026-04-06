export function customElement(
  _definition: string | { readonly name: string }
) {
  return function applyCustomElement(_target: Function): void {};
}
