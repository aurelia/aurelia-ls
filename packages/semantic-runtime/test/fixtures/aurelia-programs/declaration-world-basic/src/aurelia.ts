export function customElement(name: string) {
  return function applyCustomElement(_target: Function): void {
    void name;
  };
}
