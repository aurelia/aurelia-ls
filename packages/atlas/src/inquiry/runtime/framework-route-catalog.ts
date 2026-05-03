import { BasisKind } from "../basis.js";
import { LensId } from "../lens.js";
import { RepoRootLocus } from "../locus.js";
import { NavigationRelation } from "../navigation.js";
import {
  FrameworkRouteEndpoint,
  FrameworkSemanticRouteSpec,
} from "./framework-continuation-core.js";

const SOURCE_CHECKER_BASIS = [
  BasisKind.SourceText,
  BasisKind.TypeScriptChecker,
] as const;

const CHECKER_BASIS = [BasisKind.TypeScriptChecker] as const;

const ADMISSION_BASIS = [
  BasisKind.StaticEvaluator,
  BasisKind.TypeScriptChecker,
] as const;

/** Declared framework lens/projection endpoints used by semantic route specs. */
export const FrameworkRouteEndpoints = {
  AdmissionRelationships: new FrameworkRouteEndpoint({
    id: "framework.endpoint.admission.relationships",
    lens: LensId.FrameworkAdmission,
    projection: "relationships",
    summary: "Normalized framework admission relationship rows.",
  }),
  AdmissionWorldFormation: new FrameworkRouteEndpoint({
    id: "framework.endpoint.admission.world-formation",
    lens: LensId.FrameworkAdmission,
    projection: "world-formation",
    summary: "Framework admission world-formation rows.",
  }),
  AdmissionFlow: new FrameworkRouteEndpoint({
    id: "framework.endpoint.admission.flow",
    lens: LensId.FrameworkAdmission,
    projection: "flow",
    summary: "Framework configuration admission flow rollups.",
  }),
  CompilerInstructionProducts: new FrameworkRouteEndpoint({
    id: "framework.endpoint.compiler.instruction-products",
    lens: LensId.FrameworkCompiler,
    projection: "instruction-products",
    summary: "Compiler instruction product rows.",
  }),
  CompilerCompileFlow: new FrameworkRouteEndpoint({
    id: "framework.endpoint.compiler.compile-flow",
    lens: LensId.FrameworkCompiler,
    projection: "compile-flow",
    summary: "TemplateCompiler compile-flow stage rows.",
  }),
  DiProviders: new FrameworkRouteEndpoint({
    id: "framework.endpoint.di.providers",
    lens: LensId.FrameworkDi,
    projection: "providers",
    summary: "DI provider and registration atoms.",
  }),
  DiscoveryAppTasks: new FrameworkRouteEndpoint({
    id: "framework.endpoint.discovery.app-tasks",
    lens: LensId.FrameworkDiscovery,
    projection: "app-tasks",
    summary: "Framework AppTask entity catalog rows.",
  }),
  DiscoveryObservers: new FrameworkRouteEndpoint({
    id: "framework.endpoint.discovery.observers",
    lens: LensId.FrameworkDiscovery,
    projection: "observers",
    summary: "Framework observer-system entity catalog rows.",
  }),
  DiscoveryResourceCarriers: new FrameworkRouteEndpoint({
    id: "framework.endpoint.discovery.resource-carriers",
    lens: LensId.FrameworkDiscovery,
    projection: "resource-carriers",
    summary: "Framework resource carrier catalog rows.",
  }),
  LifecycleAppTasks: new FrameworkRouteEndpoint({
    id: "framework.endpoint.lifecycle.app-tasks",
    lens: LensId.FrameworkLifecycle,
    projection: "app-tasks",
    summary: "Lifecycle AppTask execution rows.",
  }),
  LifecycleControllerCalls: new FrameworkRouteEndpoint({
    id: "framework.endpoint.lifecycle.controller-calls",
    lens: LensId.FrameworkLifecycle,
    projection: "controller-calls",
    summary: "Controller lifecycle call rows.",
  }),
  MaterializationInstantiations: new FrameworkRouteEndpoint({
    id: "framework.endpoint.materialization.instantiations",
    lens: LensId.FrameworkMaterialization,
    projection: "instantiations",
    summary: "DI key materialization and instantiation rows.",
  }),
  MaterializationResourceInstantiations: new FrameworkRouteEndpoint({
    id: "framework.endpoint.materialization.resource-instantiations",
    lens: LensId.FrameworkMaterialization,
    projection: "resource-instantiations",
    summary: "Resource runtime/compiler/evaluator materialization rows.",
  }),
  ObservationEntities: new FrameworkRouteEndpoint({
    id: "framework.endpoint.observation.entities",
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection: "entities",
    summary: "Observer and reactivity entity rows.",
  }),
  ObservationBindingLookups: new FrameworkRouteEndpoint({
    id: "framework.endpoint.observation.binding-lookups",
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection: "binding-lookups",
    summary: "Binding-to-observer lookup rows owned by the observation lens.",
  }),
  ObservationBindingSetups: new FrameworkRouteEndpoint({
    id: "framework.endpoint.observation.binding-setups",
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection: "binding-setups",
    summary: "Binding observation setup rows owned by the observation lens.",
  }),
  ObservationFlowEntityLinks: new FrameworkRouteEndpoint({
    id: "framework.endpoint.observation.flow-entity-links",
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection: "flow-entity-links",
    summary: "Observation subsystem flow-to-entity link rows.",
  }),
  ObservationFlowSites: new FrameworkRouteEndpoint({
    id: "framework.endpoint.observation.flow-sites",
    lens: LensId.FrameworkObservation,
    locus: RepoRootLocus,
    projection: "flow-sites",
    summary: "Observation subsystem flow site rows.",
  }),
  RenderingBindingAdmissions: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.binding-admissions",
    lens: LensId.FrameworkRendering,
    projection: "binding-admissions",
    summary: "Rendering binding admission rows.",
  }),
  RenderingBindingEffects: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.binding-effects",
    lens: LensId.FrameworkRendering,
    projection: "binding-effects",
    summary: "Rendering binding lifecycle and observer effect rows.",
  }),
  RenderingBindingProducts: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.binding-products",
    lens: LensId.FrameworkRendering,
    projection: "binding-products",
    summary: "Rendering binding product rows.",
  }),
  RenderingBindingSetups: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.binding-setups",
    lens: LensId.FrameworkRendering,
    projection: "binding-setups",
    summary: "Rendering binding observation setup rows.",
  }),
  RenderingControllerCreations: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.controller-creations",
    lens: LensId.FrameworkRendering,
    projection: "controller-creations",
    summary: "Renderer child-controller creation rows.",
  }),
  RenderingHydrationFlow: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.hydration-flow",
    lens: LensId.FrameworkRendering,
    projection: "hydration-flow",
    summary: "Compact hydration/runtime rendering corridor rows.",
  }),
  RenderingRenderConsequences: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.render-consequences",
    lens: LensId.FrameworkRendering,
    projection: "render-consequences",
    summary: "Compact runtime consequences reached by renderer dispatch.",
  }),
  RenderingInstructionDispatches: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.instruction-dispatches",
    lens: LensId.FrameworkRendering,
    projection: "instruction-dispatches",
    summary: "Renderer instruction dispatch rows.",
  }),
  RenderingInstructionSlots: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.instruction-slots",
    lens: LensId.FrameworkRendering,
    projection: "instruction-slots",
    summary: "Compiler instruction slot rows.",
  }),
  RenderingRelationships: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.relationships",
    lens: LensId.FrameworkRendering,
    projection: "relationships",
    summary: "Normalized rendering relationship rows.",
  }),
  RenderingSyntaxProducts: new FrameworkRouteEndpoint({
    id: "framework.endpoint.rendering.syntax-products",
    lens: LensId.FrameworkRendering,
    projection: "syntax-products",
    summary: "Rendering syntax product rows.",
  }),
} as const;

/** Declared framework semantic route topology. */
export const FrameworkSemanticRoutes = {
  AdmissionToDiProviders: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.di-providers",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.DiProviders,
    relation: NavigationRelation.ProvenanceOf,
    basis: ADMISSION_BASIS,
    summary: "Admission rows can navigate back to DI provider atoms.",
  }),
  AdmissionToDiscoveryAppTasks: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.discovery-app-tasks",
    navigationSpecId: "framework.admission.flow",
    target: FrameworkRouteEndpoints.DiscoveryAppTasks,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: CHECKER_BASIS,
    summary: "Admission rows can navigate to AppTask catalog rows.",
  }),
  AdmissionToDiscoveryResourceCarriers: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.discovery-resource-carriers",
    navigationSpecId: "framework.admission.flow",
    target: FrameworkRouteEndpoints.DiscoveryResourceCarriers,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: CHECKER_BASIS,
    summary: "Admission rows can navigate to resource carrier catalog rows.",
  }),
  AdmissionToLifecycleAppTasks: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.lifecycle-app-tasks",
    navigationSpecId: "framework.admission.flow",
    target: FrameworkRouteEndpoints.LifecycleAppTasks,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary: "Admission rows can navigate to lifecycle AppTask execution rows.",
  }),
  AdmissionToMaterializationInstantiations: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.materialization-instantiations",
    navigationSpecId: "framework.admission.flow",
    target: FrameworkRouteEndpoints.MaterializationInstantiations,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary: "Admission rows can navigate to DI key materialization rows.",
  }),
  AdmissionToMaterializationResourceInstantiations:
    new FrameworkSemanticRouteSpec({
      id: "framework.route.admission.materialization-resource-instantiations",
      navigationSpecId: "framework.admission.flow",
      target: FrameworkRouteEndpoints.MaterializationResourceInstantiations,
      relation: NavigationRelation.FrameworkFlowOf,
      basis: ADMISSION_BASIS,
      summary: "Admission rows can navigate to resource materialization rows.",
    }),
  AdmissionToRelationships: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission.relationships",
    navigationSpecId: "framework.admission.flow",
    target: FrameworkRouteEndpoints.AdmissionRelationships,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary: "Admission rows can navigate to owned admission relationships.",
  }),
  AdmissionFlowToCompilerInstructionProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.admission-flow.compiler-instruction-products",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.CompilerInstructionProducts,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary:
      "JIT compiler corridor rollups can navigate to TemplateCompiler instruction production rows.",
  }),
  CompilerToAdmissionJitFlow: new FrameworkSemanticRouteSpec({
    id: "framework.route.compiler.admission-jit-flow",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.AdmissionFlow,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary:
      "Compiler rows can navigate back to the StandardConfiguration JIT compiler flow corridor.",
  }),
  CompilerToRenderingControllerCreations: new FrameworkSemanticRouteSpec({
    id: "framework.route.compiler.rendering-controller-creations",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingControllerCreations,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Compiler instruction rows can navigate to renderer controller creation rows for produced instructions.",
  }),
  CompilerToRenderingHydrationFlow: new FrameworkSemanticRouteSpec({
    id: "framework.route.compiler.rendering-hydration-flow",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingHydrationFlow,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Compiler rows can navigate to the hydration/runtime rendering corridor that consumes compiled definitions and instruction rows.",
  }),
  CompilerToRenderingInstructionDispatches: new FrameworkSemanticRouteSpec({
    id: "framework.route.compiler.rendering-instruction-dispatches",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingInstructionDispatches,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Compiler instruction rows can navigate to renderer dispatch rows that consume produced instructions.",
  }),
  LifecycleToDiscoveryAppTasks: new FrameworkSemanticRouteSpec({
    id: "framework.route.lifecycle.discovery-app-tasks",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.DiscoveryAppTasks,
    relation: NavigationRelation.ProvenanceOf,
    basis: CHECKER_BASIS,
    summary: "Lifecycle AppTask rows can navigate back to AppTask catalog rows.",
  }),
  LifecycleToMaterializationResourceInstantiations:
    new FrameworkSemanticRouteSpec({
      id: "framework.route.lifecycle.materialization-resource-instantiations",
      navigationSpecId: "semantic.provenance",
      target: FrameworkRouteEndpoints.MaterializationResourceInstantiations,
      relation: NavigationRelation.ProvenanceOf,
      basis: CHECKER_BASIS,
      summary:
        "Lifecycle resource sites can navigate back to resource materialization rows.",
    }),
  LifecycleToRenderingControllerCreations: new FrameworkSemanticRouteSpec({
    id: "framework.route.lifecycle.rendering-controller-creations",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.RenderingControllerCreations,
    relation: NavigationRelation.ProvenanceOf,
    basis: CHECKER_BASIS,
    summary:
      "Lifecycle child-controller activation can navigate back to rendering creation rows.",
  }),
  LifecycleToRenderingRelationships: new FrameworkSemanticRouteSpec({
    id: "framework.route.lifecycle.rendering-relationships",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.RenderingRelationships,
    relation: NavigationRelation.ProvenanceOf,
    basis: CHECKER_BASIS,
    summary:
      "Lifecycle child-controller activation can navigate back to rendering relationship rows.",
  }),
  ObservationToEntities: new FrameworkSemanticRouteSpec({
    id: "framework.route.observation.entities",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.ObservationEntities,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Observation flow rows can navigate to observer entity rows.",
  }),
  ObservationToFlowEntityLinks: new FrameworkSemanticRouteSpec({
    id: "framework.route.observation.flow-entity-links",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.ObservationFlowEntityLinks,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Observation entity or lookup rows can navigate to flow-to-entity links.",
  }),
  ObservationToFlowSites: new FrameworkSemanticRouteSpec({
    id: "framework.route.observation.flow-sites",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.ObservationFlowSites,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Observation lookup rows can navigate to subsystem flow sites.",
  }),
  RenderingToBindingAdmissions: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.binding-admissions",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingBindingAdmissions,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to binding admission rows.",
  }),
  RenderingToBindingEffects: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.binding-effects",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingBindingEffects,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to binding effect rows.",
  }),
  RenderingToBindingProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.binding-products",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingBindingProducts,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to binding product rows.",
  }),
  RenderingToBindingSetups: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.binding-setups",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingBindingSetups,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to binding setup rows.",
  }),
  RenderingToCompilerInstructionProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.compiler-instruction-products",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.CompilerInstructionProducts,
    relation: NavigationRelation.ProvenanceOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering instruction rows can navigate back to compiler instruction products that produce the consumed instruction.",
  }),
  RenderingToCompilerCompileFlow: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.compiler-compile-flow",
    navigationSpecId: "semantic.provenance",
    target: FrameworkRouteEndpoints.CompilerCompileFlow,
    relation: NavigationRelation.ProvenanceOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Hydration/rendering rows can navigate back to TemplateCompiler compile-flow rows that produce compiled definitions and instruction rows.",
  }),
  RenderingToControllerCreations: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.controller-creations",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingControllerCreations,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering relationship rows can navigate to controller creation rows.",
  }),
  RenderingToHydrationFlow: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.hydration-flow",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingHydrationFlow,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Detailed rendering rows can navigate back to the compact hydration/runtime rendering corridor.",
  }),
  RenderingToRenderConsequences: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.render-consequences",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingRenderConsequences,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Hydration and detailed rendering rows can navigate to compact renderer consequence rows before opening heavy detail families.",
  }),
  RenderingToDiscoveryObservers: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.discovery-observers",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.DiscoveryObservers,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering observation rows can navigate to observer catalog rows.",
  }),
  RenderingToObservationBindingLookups: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.observation-binding-lookups",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.ObservationBindingLookups,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering observer lookup relationships can enter observation-owned binding lookup rows.",
  }),
  RenderingToObservationBindingSetups: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.observation-binding-setups",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.ObservationBindingSetups,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering observation setup relationships can enter observation-owned binding setup rows.",
  }),
  RenderingToInstructionDispatches: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.instruction-dispatches",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingInstructionDispatches,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering relationship rows can navigate to instruction dispatch rows.",
  }),
  RenderingToInstructionSlots: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.instruction-slots",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingInstructionSlots,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to instruction slot rows.",
  }),
  RenderingToLifecycleControllerCalls: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.lifecycle-controller-calls",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.LifecycleControllerCalls,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary:
      "Rendering child-controller rows can navigate to lifecycle controller call rows.",
  }),
  RenderingToSyntaxProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.rendering.syntax-products",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingSyntaxProducts,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: SOURCE_CHECKER_BASIS,
    summary: "Rendering relationship rows can navigate to syntax product rows.",
  }),
  ResourceToAdmissionWorldFormation: new FrameworkSemanticRouteSpec({
    id: "framework.route.resource.admission-world-formation",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.AdmissionWorldFormation,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: ADMISSION_BASIS,
    summary:
      "Resource convergence rows can navigate to admission world-formation rows.",
  }),
  ResourceToCompilerInstructionProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.resource.compiler-instruction-products",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.CompilerInstructionProducts,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: CHECKER_BASIS,
    summary:
      "Resource convergence rows can navigate to compiler instruction products.",
  }),
  ResourceToRenderingSyntaxProducts: new FrameworkSemanticRouteSpec({
    id: "framework.route.resource.rendering-syntax-products",
    navigationSpecId: "framework.flow",
    target: FrameworkRouteEndpoints.RenderingSyntaxProducts,
    relation: NavigationRelation.FrameworkFlowOf,
    basis: CHECKER_BASIS,
    summary: "Resource convergence rows can navigate to syntax product rows.",
  }),
  ResourceToMaterializationResourceInstantiations:
    new FrameworkSemanticRouteSpec({
      id: "framework.route.resource.materialization-resource-instantiations",
      navigationSpecId: "framework.flow",
      target: FrameworkRouteEndpoints.MaterializationResourceInstantiations,
      relation: NavigationRelation.FrameworkFlowOf,
      basis: CHECKER_BASIS,
      summary:
        "Resource catalog rows can navigate to resource materialization rows.",
    }),
} as const;

export const FRAMEWORK_ROUTE_ENDPOINTS: readonly FrameworkRouteEndpoint[] =
  Object.values(FrameworkRouteEndpoints);

export const FRAMEWORK_SEMANTIC_ROUTE_SPECS: readonly FrameworkSemanticRouteSpec[] =
  Object.values(FrameworkSemanticRoutes);

const routeSpecsByPropertyName = new Map(
  Object.entries(FrameworkSemanticRoutes).map(([propertyName, routeSpec]) => [
    propertyName,
    routeSpec,
  ]),
);

/** Resolve a route spec from the property name used in source. */
export function frameworkSemanticRouteSpecByPropertyName(
  propertyName: string,
): FrameworkSemanticRouteSpec | null {
  return routeSpecsByPropertyName.get(propertyName) ?? null;
}
