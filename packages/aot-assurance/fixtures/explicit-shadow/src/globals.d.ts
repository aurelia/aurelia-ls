declare module '*.html' { const template: string; export default template; }

interface Window {
  __explicitShadowAssurance?: {
    readonly ready: boolean;
    stop(): Promise<void>;
  };
}
