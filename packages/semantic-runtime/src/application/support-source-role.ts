import type { ApplicationFileRole } from './topology.js';

export type ApplicationSupportSourceRole =
  Extract<ApplicationFileRole, 'service-source' | 'state-source' | 'model-source'>;

/** Class-bearing support source role inferred from project-relative path conventions. */
export function supportSourceRoleForPath(path: string): ApplicationSupportSourceRole | null {
  const segments = path.split(/[\\/]/).map((segment) => segment.toLowerCase());
  if (segments.includes('services')) {
    return 'service-source';
  }
  if (segments.includes('state')) {
    return 'state-source';
  }
  if (segments.includes('models')) {
    return 'model-source';
  }
  return null;
}
