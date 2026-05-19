export * from './core.js';
export { KernelBindingKinds } from './binding-kinds.js';
export { KernelClaimPredicates } from './claim-predicates.js';
export { KernelInstructionKinds } from './instruction-kinds.js';
export { KernelOpenSeamKinds } from './open-seam-kinds.js';
export { KernelProductKinds } from './product-kinds.js';

import { KernelBindingKinds } from './binding-kinds.js';
import { KernelClaimPredicates } from './claim-predicates.js';
import { KernelInstructionKinds } from './instruction-kinds.js';
import { KernelOpenSeamKinds } from './open-seam-kinds.js';
import { KernelProductKinds } from './product-kinds.js';

export const KernelVocabulary = {
  Evaluation: {
    ...KernelOpenSeamKinds.Evaluation,
    ...KernelBindingKinds.Evaluation,
    ...KernelInstructionKinds.Evaluation,
    ...KernelProductKinds.Evaluation,
    ...KernelClaimPredicates.Evaluation,
  },
  TypeSystem: {
    ...KernelOpenSeamKinds.TypeSystem,
    ...KernelBindingKinds.TypeSystem,
    ...KernelInstructionKinds.TypeSystem,
    ...KernelProductKinds.TypeSystem,
    ...KernelClaimPredicates.TypeSystem,
  },
  Resource: {
    ...KernelOpenSeamKinds.Resource,
    ...KernelBindingKinds.Resource,
    ...KernelInstructionKinds.Resource,
    ...KernelProductKinds.Resource,
    ...KernelClaimPredicates.Resource,
  },
  Di: {
    ...KernelOpenSeamKinds.Di,
    ...KernelBindingKinds.Di,
    ...KernelInstructionKinds.Di,
    ...KernelProductKinds.Di,
    ...KernelClaimPredicates.Di,
  },
  Registration: {
    ...KernelOpenSeamKinds.Registration,
    ...KernelBindingKinds.Registration,
    ...KernelInstructionKinds.Registration,
    ...KernelProductKinds.Registration,
    ...KernelClaimPredicates.Registration,
  },
  Configuration: {
    ...KernelOpenSeamKinds.Configuration,
    ...KernelBindingKinds.Configuration,
    ...KernelInstructionKinds.Configuration,
    ...KernelProductKinds.Configuration,
    ...KernelClaimPredicates.Configuration,
  },
  Router: {
    ...KernelOpenSeamKinds.Router,
    ...KernelProductKinds.Router,
  },
  RouteRecognizer: {
    ...KernelProductKinds.RouteRecognizer,
  },
  I18n: {
    ...KernelProductKinds.I18n,
  },
  State: {
    ...KernelProductKinds.State,
  },
  Validation: {
    ...KernelProductKinds.Validation,
  },
  FetchClient: {
    ...KernelProductKinds.FetchClient,
  },
  Dialog: {
    ...KernelProductKinds.Dialog,
  },
  Observation: {
    ...KernelProductKinds.Observation,
    ...KernelClaimPredicates.Observation,
  },
  Compiler: {
    ...KernelOpenSeamKinds.Compiler,
    ...KernelBindingKinds.Compiler,
    ...KernelInstructionKinds.Compiler,
    ...KernelProductKinds.Compiler,
    ...KernelClaimPredicates.Compiler,
  },
  Template: {
    ...KernelOpenSeamKinds.Template,
    ...KernelBindingKinds.Template,
    ...KernelInstructionKinds.Template,
    ...KernelProductKinds.Template,
    ...KernelClaimPredicates.Template,
  },
  Binding: {
    ...KernelOpenSeamKinds.Binding,
    ...KernelBindingKinds.Binding,
    ...KernelInstructionKinds.Binding,
    ...KernelProductKinds.Binding,
    ...KernelClaimPredicates.Binding,
  },
  Instruction: {
    ...KernelOpenSeamKinds.Instruction,
    ...KernelBindingKinds.Instruction,
    ...KernelInstructionKinds.Instruction,
    ...KernelProductKinds.Instruction,
    ...KernelClaimPredicates.Instruction,
  },
} as const;
