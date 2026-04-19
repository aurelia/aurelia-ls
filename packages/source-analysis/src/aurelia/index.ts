export {
  collectDiInterfaceGoldens,
  DI_INTERFACE_LENS_ID,
  type GoldenRecord,
  type GoldenSuite,
  type PackageSummary,
} from './di-interface-goldens.js';

export {
  collectDiInterfaceExports,
  type CollectDiInterfaceExportsOptions,
} from './di-interface-discovery.js';

export {
  API_IDS,
  API_DETECTION_KINDS,
  type ApiDetection,
  type ApiId,
  type ApiDetectionKind,
} from './api-detection-contract.js';

export {
  detectApiCall,
  detectApiExpression,
} from './api-detection.js';

export {
  DI_INTERFACE_SCHEMA_VERSION,
  REGISTRATION_KINDS,
  REGISTRATION_TARGET_MODES,
  type InterfaceRecord,
  type InterfaceSurface,
  type PackageRef,
  type Registration,
  type RegistrationKind,
  type RegistrationTargetMode,
  type SymbolLocation,
} from './di-interface-contract.js';

export {
  REGISTRATION_EFFECT_KINDS,
  REGISTRATION_EFFECT_LOCALITIES,
  REGISTRATION_EFFECT_SCHEMA_VERSION,
  REGISTRATION_OWNER_KINDS,
  type RegistrationEffectKind,
  type RegistrationEffectLocality,
  type RegistrationEffectRecord,
  type RegistrationOwnerKind,
  type RegistrationSurfaceOwner,
} from './registration-effect-contract.js';

export {
  collectRegistrationEffects,
  type CollectRegistrationEffectsOptions,
} from './registration-effect-discovery.js';

export {
  buildRegistrationFromCall,
  extractBuilderRegistration,
  getRegistrationAliasTargetExpression,
  getRegistrationPrimaryExpression,
  getRegistrationTargetExpression,
  getRegistrationValueExpression,
} from './registration-shape.js';

export {
  createLensContext,
  type LensContext,
  type LensOptions,
} from './lens-context.js';
