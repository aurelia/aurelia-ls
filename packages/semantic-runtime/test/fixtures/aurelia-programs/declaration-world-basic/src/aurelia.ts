export function customElement(
  _definition: string | { readonly name: string }
) {
  return function applyCustomElement(_target: Function): void {};
}

export const CustomElement = {
  define<TDefinition extends { readonly name: string }, TType>(
    definition: TDefinition,
    type: TType
  ): TType {
    void definition;
    return type;
  }
} as const;
