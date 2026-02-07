/**
 * Convention-based custom element (no explicit @customElement decorator).
 *
 * This class becomes a custom element "cortex-devices" because:
 * 1. It imports a template from './cortex-devices.html'
 * 2. The class name "CortexDevices" matches the file name "cortex-devices.ts"
 *
 * This is the same pattern used by the real cortex-device-list app.
 */
import template from "./cortex-devices.html";

export class CortexDevices {
  private isDarkTheme = false;

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
  }
}
