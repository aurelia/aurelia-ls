import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';

// This is the fixture's convenient manual JIT entry. Authoritative JIT and AOT
// measurements supply their respective plugin presets from the benchmark runner
// while retaining this exact application source and production build options.
export default defineConfig({
  plugins: [aurelia({ useDev: false })],
});
