declare module '*.html' {
  const template: string;
  export default template;
}

declare module '*.css' {
  const css: string;
  export default css;
}

interface Window {
  __localizedFormAssurance?: {
    readonly ready: boolean;
    setLocale(locale: string): Promise<void>;
    stop(): Promise<void>;
  };
}
