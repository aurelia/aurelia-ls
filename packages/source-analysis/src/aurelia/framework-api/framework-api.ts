import type { RegistrationProductionKind } from '../registrations/registration-production.js';

export const FRAMEWORK_API_FAMILY_KINDS = [
  'registration-producer',
  'lifecycle-slot-producer',
  'di-key-factory',
] as const;

export type FrameworkApiFamilyKind =
  typeof FRAMEWORK_API_FAMILY_KINDS[number];

export class FrameworkApiMatcher {
  constructor(
    readonly moduleSpecifier: string,
    readonly exportName: string,
    readonly memberPath: readonly string[] = [],
  ) {}
}

export class FrameworkApi {
  constructor(
    readonly id: string,
    readonly family: FrameworkApiFamilyKind,
    readonly declaredInFile: string,
    readonly declaredModule: string,
    readonly exportName: string,
    readonly memberPath: readonly string[] = [],
    readonly productionKind: RegistrationProductionKind | null = null,
    readonly matchers: readonly FrameworkApiMatcher[] = [],
    readonly note: string | null = null,
  ) {}
}
