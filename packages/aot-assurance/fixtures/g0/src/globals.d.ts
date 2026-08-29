import type { RuntimeProbeSnapshot } from '../../../src/contract.js';

declare global {
  const __AOT_ASSURANCE_LANE__: 'jit' | 'aot';

  interface Window {
    __aotAssurance?: {
      lane: 'jit' | 'aot';
      ready: boolean;
      events: string[];
      readModel(): unknown;
      readProbes(): RuntimeProbeSnapshot;
      stop(): Promise<void>;
    };
  }
}

export {};
