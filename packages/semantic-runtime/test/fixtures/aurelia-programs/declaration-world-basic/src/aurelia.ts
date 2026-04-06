export function customElement(
  _definition: string | {
    readonly name: string;
    readonly template?: string;
    readonly noView?: boolean;
  }
) {
  return function applyCustomElement(_target: Function): void {};
}

export const CustomElement = {
  define<TDefinition extends {
    readonly name: string;
    readonly template?: string;
    readonly noView?: boolean;
  }, TType>(
    definition: TDefinition,
    type: TType
  ): TType {
    void definition;
    return type;
  }
} as const;
