declare module '*.html' { const template: string; export default template; }

interface Window {
  __ordinaryHooksAssurance?: {
    readonly ready: boolean;
    stop(): Promise<void>;
  };
}
