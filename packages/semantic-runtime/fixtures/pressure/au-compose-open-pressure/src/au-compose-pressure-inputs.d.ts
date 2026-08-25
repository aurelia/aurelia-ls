declare module 'au-compose-pressure-inputs' {
  export const runtimeCompositionDefaults: Readonly<Record<string, unknown>>;
  export const externalTemplate: string;
  export const externalModel: { readonly message: string };
  export const externalScopeBehavior: 'auto' | 'scoped';
  export const externalTag: string;
  export const externalFlushMode: 'sync' | 'async';
}
