import { defineProductDetailSlot } from '../kernel/product-details.js';
import { defineHotDetailSlot } from '../kernel/hot-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from './type-shape.js';

/** Typed detail slots for type-system products used by expression and template inquiry. */
export const TypeSystemProductDetails = {
  TypeShape: defineProductDetailSlot<CheckerTypeShape>(
    KernelVocabulary.TypeSystem.TypeShape.key,
    'type-system.type-shape',
    'Type-system type projection with optional hot checker carrier and member details.',
  ),
} as const;

/** Hot TypeChecker details whose lifetime is owned by a projected type shape or query claim. */
export const TypeSystemHotDetails = {
  TypeMember: defineHotDetailSlot<CheckerTypeMember>(
    'type-system.type-member',
    'Hot type-system member projection visible on a type shape; usually not a durable kernel product.',
  ),
} as const;
