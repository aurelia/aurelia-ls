declare global {
  const __AOT_ASSURANCE_LANE__: 'jit' | 'aot';

  interface Window {
    __localTemplatesAssurance?: {
      lane: 'jit' | 'aot';
      ready: boolean;
      stop(): Promise<void>;
    };
  }
}

export {};
