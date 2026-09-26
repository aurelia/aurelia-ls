declare module '*.html' { const template: string; export default template; }

interface Window {
  __ceCompositionAssurance?: {
    readonly ready: boolean;
    stop(): Promise<void>;
  };
}
