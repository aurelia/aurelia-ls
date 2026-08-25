import {
  defineHotDetailDescriptor,
  defineProductDetailDescriptor,
} from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { CheckerTypeMember, CheckerTypeShape } from './type-shape.js';

/** Inert occupancy identities for type-system product details. */
export const TypeSystemDetailDescriptors = {
  TypeShape: defineProductDetailDescriptor<CheckerTypeShape>(
    KernelVocabulary.TypeSystem.TypeShape.key,
    'type-system.type-shape',
    'Type-system type projection with optional hot checker carrier and member details.',
  ),
} as const;

/** Inert occupancy identities for hot TypeChecker details owned by projected type shapes. */
export const TypeSystemHotDetailDescriptors = {
  TypeMember: defineHotDetailDescriptor<
    CheckerTypeMember,
    typeof KernelVocabulary.TypeSystem.TypeShape.key
  >(
    KernelVocabulary.TypeSystem.TypeShape.key,
    'type-system.type-member',
    'Hot type-system member projection visible on a type shape; usually not a durable kernel product.',
  ),
} as const;
