declare module '*.html' { const template: string; export default template; }

interface Window {
  __compilerHooksAssurance?: { readonly ready: boolean; stop(): Promise<void> };
}
