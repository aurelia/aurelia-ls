import { defineProductDetailSlot } from '../kernel/product-details.js';
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
  TypeMember: defineProductDetailSlot<CheckerTypeMember>(
    KernelVocabulary.TypeSystem.TypeMember.key,
    'type-system.type-member',
    'Type-system member projection visible on a type shape.',
  ),
} as const;
