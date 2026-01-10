/**
 * Pattern Matching (Layer 4)
 *
 * Domain-specific pattern matchers for Aurelia plugin analysis.
 * Built on top of the value model (Layers 1-3).
 *
 * Patterns:
 * - IRegistry detection: Objects with `register(container)` method
 * - Register body analysis: Extract resources from `container.register(...)` calls
 * - Factory return analysis: Resolve `createConfig()` to its return value
 */

// Re-export IRegistry detection from value/types (already implemented there)
export {
  isRegistryShape,
  getRegisterMethod,
  hasMethod,
} from '../../analysis/value/types.js';

// Re-export register body analysis
export {
  extractRegisterBodyResources,
  isContainerRegisterCall,
  isRegistrationPattern,
} from './register-body.js';

export type { RegisterBodyContext } from './register-body.js';

// Re-export factory analysis
export {
  analyzeFactoryCall,
  mightBeFactoryCall,
  tryResolveAsFactory,
} from './factory.js';

export type { FactoryAnalysisResult } from './factory.js';
