declare module '*.html' { const template: string; export default template; }

interface Window {
  __browserRecoveryAssurance?: {
    ready: boolean;
    readModel(): { message: string; ignored: string; visible: boolean };
    stop(): Promise<void>;
  };
}
