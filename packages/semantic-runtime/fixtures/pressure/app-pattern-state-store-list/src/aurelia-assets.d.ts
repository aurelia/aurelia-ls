declare module '*.html' {
  const template: string;
  export default template;
}

declare module '*.css' {
  const css: string;
  export default css;
}

interface Window {
  __stateStoreListAssurance?: {
    readonly ready: boolean;
    stop(): Promise<void>;
  };
}
