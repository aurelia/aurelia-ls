export const sharedConverterSignals = ['catalog-refresh', 'catalog-theme'];

export const runtimeConverterSignals = globalThis.location.hash === ''
  ? []
  : globalThis.location.hash.slice(1).split(',');
