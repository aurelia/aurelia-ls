interface ImportMetaEnv {
  readonly VITE_BINDABLE_ATTRIBUTE?: string;
  readonly VITE_BINDABLE_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
