import { readFrameworkDiscoverySeedIndex } from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import type { Inquiry } from "../inquiry.js";
import { pageOffset, rowLimit } from "../paging.js";
import {
  bindingAdmissionContinuations,
  bindingEffectContinuations,
  bindingProductContinuations,
  bindingSetupContinuations,
  controllerCreationContinuations,
  hydrationFlowContinuations,
  instructionDispatchContinuations,
  instructionSlotContinuations,
  renderConsequenceContinuations,
  renderingRelationshipContinuations,
  syntaxProductContinuations,
} from "./framework-rendering-continuations.js";
import { renderingSummaryContinuations } from "./framework-summary-continuations.js";
import type {
  FrameworkBindingAdmissionRow,
  FrameworkBindingEffectRow,
  FrameworkBindingProductRow,
  FrameworkBindingSetupRow,
  FrameworkControllerCreationRow,
  FrameworkInstructionSlotRow,
  FrameworkInstructionDispatchRow,
  FrameworkRenderingValue,
  FrameworkSyntaxProductRow,
} from "./framework-entities.js";
import {
  evidenceForBindingAdmission,
  evidenceForBindingEffect,
  evidenceForBindingProduct,
  evidenceForBindingSetup,
  evidenceForControllerCreation,
  evidenceForHydrationFlow,
  evidenceForInstructionDispatch,
  evidenceForInstructionSlot,
  evidenceForRenderingTypeFact,
  evidenceForSyntaxProduct,
} from "./framework-evidence.js";
import {
  filtersFromInquiry,
  type FrameworkDiscoveryFilters,
} from "./framework-filters.js";
import {
  readFrameworkBindingAdmissions,
  readFrameworkBindingEffects,
  readFrameworkBindingProducts,
  readFrameworkBindingSetups,
  readFrameworkControllerCreations,
  readFrameworkHydrationFlow,
  readFrameworkHydrationFlowRows,
  readFrameworkInstructionDispatches,
  readFrameworkInstructionSlots,
  readFrameworkRenderingSyntaxProducts,
} from "./framework-rendering-graph.js";
import type {
  FrameworkHydrationFlowFilters,
  FrameworkHydrationFlowRead,
  FrameworkHydrationFlowRow,
} from "./framework-rendering-hydration-flow.js";
import {
  readFrameworkRenderConsequenceRead,
  readFrameworkRenderConsequenceRows,
  type FrameworkRenderConsequenceFilters,
  type FrameworkRenderConsequenceRead,
  type FrameworkRenderConsequenceRow,
} from "./framework-rendering-consequences.js";
import {
  bindingAdmissionSummaryRow,
  bindingProductSummaryRow,
  controllerCreationSummaryRow,
  instructionDispatchSummaryRow,
  instructionSlotSummaryRow,
  syntaxProductSummaryRow,
} from "./framework-rendering-public-rows.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipRow,
  type FrameworkRenderingRelationshipFilters,
} from "./framework-rendering-relationships.js";
import {
  checkerBasis,
  countBy,
  sourceIndexBasis,
} from "./framework-support.js";
import { PagedRowFamily } from "../paged-row-family.js";
import { stringFiltersFromRecord } from "./lens-filter-utils.js";

class FrameworkRenderingQueryContext {
  readonly projection: string;
  readonly filters: FrameworkDiscoveryFilters;
  readonly hydrationFilters: FrameworkHydrationFlowFilters;
  readonly consequenceFilters: FrameworkRenderConsequenceFilters;
  readonly relationshipFilters: FrameworkRenderingRelationshipFilters;
  readonly seedIndex: ReturnType<typeof readFrameworkDiscoverySeedIndex>;
  readonly limit: number;
  readonly offset: number;

  constructor(
    readonly inquiry: Inquiry,
    readonly sourceProject: SourceProject,
  ) {
    this.projection = inquiry.projection ?? "summary";
    this.filters = filtersFromInquiry(inquiry);
    this.hydrationFilters = {
      ...this.filters,
      ...hydrationAxisFiltersFromInquiry(inquiry),
    };
    this.consequenceFilters = {
      ...this.filters,
      ...relationshipAxisFiltersFromInquiry(inquiry),
      ...consequenceAxisFiltersFromInquiry(inquiry),
    };
    this.relationshipFilters = {
      ...this.filters,
      ...relationshipAxisFiltersFromInquiry(inquiry),
    };
    this.seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
    this.limit = rowLimit(inquiry);
    this.offset = pageOffset(inquiry);
  }
}

const SYNTAX_PRODUCT_ROW_FAMILY =
  new PagedRowFamily<FrameworkSyntaxProductRow>({
    id: "framework.rendering:syntax-products",
    rowLabel: "Aurelia framework syntax product row(s)",
    evidenceForRow: evidenceForSyntaxProduct,
    continuationsForPage: syntaxProductContinuations,
  });

const INSTRUCTION_SLOT_ROW_FAMILY =
  new PagedRowFamily<FrameworkInstructionSlotRow>({
    id: "framework.rendering:instruction-slots",
    rowLabel: "Aurelia framework instruction slot row(s)",
    evidenceForRow: evidenceForInstructionSlot,
    continuationsForPage: instructionSlotContinuations,
  });

const INSTRUCTION_DISPATCH_ROW_FAMILY =
  new PagedRowFamily<FrameworkInstructionDispatchRow>({
    id: "framework.rendering:instruction-dispatches",
    rowLabel: "Aurelia framework instruction dispatch row(s)",
    evidenceForRow: evidenceForInstructionDispatch,
    continuationsForPage: instructionDispatchContinuations,
  });

const CONTROLLER_CREATION_ROW_FAMILY =
  new PagedRowFamily<FrameworkControllerCreationRow>({
    id: "framework.rendering:controller-creations",
    rowLabel: "Aurelia framework controller creation row(s)",
    evidenceForRow: evidenceForControllerCreation,
    continuationsForPage: controllerCreationContinuations,
  });

const HYDRATION_FLOW_ROW_FAMILY =
  new PagedRowFamily<FrameworkHydrationFlowRow>({
    id: "framework.rendering:hydration-flow",
    rowLabel: "Aurelia framework hydration-flow corridor row(s)",
    evidenceForRow: evidenceForHydrationFlow,
    continuationsForPage: hydrationFlowContinuations,
  });

const RENDER_CONSEQUENCE_ROW_FAMILY =
  new PagedRowFamily<FrameworkRenderConsequenceRow>({
    id: "framework.rendering:render-consequences",
    rowLabel: "Aurelia framework renderer consequence row(s)",
    evidenceForRow: evidenceForRenderingTypeFact,
    continuationsForPage: renderConsequenceContinuations,
  });

function hydrationFlowSummary(
  read: FrameworkHydrationFlowRead,
  pageRowCount: number,
): string {
  if (read.mode === "overview") {
    return `Returned ${pageRowCount} of ${read.rows.length} hydration/runtime rendering overview row(s); ${read.totalRowCount} total source-backed corridor row(s) are available through filters.`;
  }
  return `Returned ${pageRowCount} of ${read.rows.length} filtered hydration/runtime rendering corridor row(s); ${read.totalRowCount} total source-backed row(s).`;
}

function renderConsequenceSummary(
  read: FrameworkRenderConsequenceRead,
  pageRowCount: number,
): string {
  if (read.mode === "overview") {
    return `Returned ${pageRowCount} of ${read.rows.length} compact renderer consequence overview row(s); ${read.totalRowCount} total consequence row(s) are available through filters.`;
  }
  return `Returned ${pageRowCount} of ${read.rows.length} filtered compact renderer consequence row(s); ${read.totalRowCount} total consequence row(s).`;
}

const BINDING_PRODUCT_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingProductRow>({
    id: "framework.rendering:binding-products",
    rowLabel: "Aurelia framework binding product row(s)",
    evidenceForRow: evidenceForBindingProduct,
    continuationsForPage: bindingProductContinuations,
  });

const BINDING_ADMISSION_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingAdmissionRow>({
    id: "framework.rendering:binding-admissions",
    rowLabel: "Aurelia framework binding admission row(s)",
    evidenceForRow: evidenceForBindingAdmission,
    continuationsForPage: bindingAdmissionContinuations,
  });

const BINDING_EFFECT_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingEffectRow>({
    id: "framework.rendering:binding-effects",
    rowLabel: "Aurelia framework binding effect row(s)",
    evidenceForRow: evidenceForBindingEffect,
    continuationsForPage: bindingEffectContinuations,
  });

const BINDING_SETUP_ROW_FAMILY =
  new PagedRowFamily<FrameworkBindingSetupRow>({
    id: "framework.rendering:binding-setups",
    rowLabel: "Aurelia framework binding setup row(s)",
    evidenceForRow: evidenceForBindingSetup,
    continuationsForPage: bindingSetupContinuations,
  });

const RENDERING_RELATIONSHIP_ROW_FAMILY =
  new PagedRowFamily<FrameworkRenderingRelationshipRow>({
    id: "framework.rendering:relationships",
    rowLabel: "Aurelia framework rendering relationship row(s)",
    evidenceForRow: evidenceForRenderingTypeFact,
    continuationsForPage: renderingRelationshipContinuations,
  });

/** Answer framework.rendering inquiries from rendering/resource/binding indexes over the hot source project. */
export function answerFrameworkRendering(
  /** Inquiry being answered. */
  inquiry: Inquiry,
  /** Hot source project owned by the daemon. */
  sourceProject: SourceProject,
): Answer<FrameworkRenderingValue> {
  return new FrameworkRenderingAnswerer(inquiry, sourceProject).answer();
}

class FrameworkRenderingAnswerer {
  readonly #inquiry: Inquiry;
  readonly #sourceProject: SourceProject;

  constructor(inquiry: Inquiry, sourceProject: SourceProject) {
    this.#inquiry = inquiry;
    this.#sourceProject = sourceProject;
  }

  answer(): Answer<FrameworkRenderingValue> {
    const context = new FrameworkRenderingQueryContext(
      this.#inquiry,
      this.#sourceProject,
    );
    const {
      inquiry,
      sourceProject,
      projection,
      filters,
      seedIndex,
      limit,
      offset,
      relationshipFilters,
      hydrationFilters,
      consequenceFilters,
    } = context;
    const basis = [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)];

    if (projection === "syntax-products") {
      const syntaxProducts = readFrameworkRenderingSyntaxProducts(
        sourceProject,
        filters,
      );
      return SYNTAX_PRODUCT_ROW_FAMILY.answer({
        inquiry,
        rows: syntaxProducts,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          syntaxProductCount: syntaxProducts.length,
          syntaxProducts: page.rows.map(syntaxProductSummaryRow),
        }),
      });
    }

    if (projection === "instruction-slots") {
      const instructionSlots = readFrameworkInstructionSlots(
        sourceProject,
        filters,
      );
      return INSTRUCTION_SLOT_ROW_FAMILY.answer({
        inquiry,
        rows: instructionSlots,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          instructionSlotCount: instructionSlots.length,
          instructionSlots: page.rows.map(instructionSlotSummaryRow),
        }),
      });
    }

    if (projection === "instruction-dispatches") {
      const instructionDispatches = readFrameworkInstructionDispatches(
        sourceProject,
        filters,
      );
      return INSTRUCTION_DISPATCH_ROW_FAMILY.answer({
        inquiry,
        rows: instructionDispatches,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          instructionDispatchCount: instructionDispatches.length,
          instructionDispatches: page.rows.map(instructionDispatchSummaryRow),
        }),
      });
    }

    if (projection === "controller-creations") {
      const controllerCreations = readFrameworkControllerCreations(
        sourceProject,
        filters,
      );
      return CONTROLLER_CREATION_ROW_FAMILY.answer({
        inquiry,
        rows: controllerCreations,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          controllerCreationCount: controllerCreations.length,
          recursiveDispatchCount: controllerCreations.reduce(
            (total, row) => total + row.recursiveDispatchCalls.length,
            0,
          ),
          controllerCreations: page.rows.map(controllerCreationSummaryRow),
        }),
      });
    }

    if (projection === "hydration-flow") {
      const hydrationFlow = readFrameworkHydrationFlow(
        sourceProject,
        hydrationFilters,
      );
      return HYDRATION_FLOW_ROW_FAMILY.answer({
        inquiry,
        rows: hydrationFlow.rows,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          hydrationFlowCount: hydrationFlow.rows.length,
          hydrationFlowMode: hydrationFlow.mode,
          hydrationFlowTotalCount: hydrationFlow.totalRowCount,
          hydrationFlowOverviewCount: hydrationFlow.overviewRowCount,
          hydrationStages: countBy(hydrationFlow.rows, (row) => row.stage),
          hydrationOperations: countBy(hydrationFlow.rows, (row) => row.operation),
          hydrationTargetKinds: countBy(hydrationFlow.rows, (row) => row.targetKind),
          hydrationFlow: page.rows,
        }),
        summary: (page) => hydrationFlowSummary(hydrationFlow, page.rows.length),
      });
    }

    if (projection === "render-consequences") {
      const renderConsequences = readFrameworkRenderConsequenceRead(
        sourceProject,
        consequenceFilters,
      );
      return RENDER_CONSEQUENCE_ROW_FAMILY.answer({
        inquiry,
        rows: renderConsequences.rows,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          renderConsequenceCount: renderConsequences.rows.length,
          renderConsequenceMode: renderConsequences.mode,
          renderConsequenceTotalCount: renderConsequences.totalRowCount,
          renderConsequenceOverviewCount: renderConsequences.overviewRowCount,
          renderConsequenceKinds: countBy(
            renderConsequences.rows,
            (row) => row.consequenceKind,
          ),
          renderConsequenceMechanisms: countBy(
            renderConsequences.rows,
            (row) => row.mechanism,
          ),
          renderConsequencePhases: countBy(
            renderConsequences.rows,
            (row) => row.phase,
          ),
          renderConsequences: page.rows,
        }),
        summary: (page) =>
          renderConsequenceSummary(renderConsequences, page.rows.length),
      });
    }

    if (projection === "binding-products") {
      const bindingProducts = readFrameworkBindingProducts(
        sourceProject,
        filters,
      );
      return BINDING_PRODUCT_ROW_FAMILY.answer({
        inquiry,
        rows: bindingProducts,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          bindingProductCount: bindingProducts.length,
          bindingProducts: page.rows.map(bindingProductSummaryRow),
        }),
      });
    }

    if (projection === "binding-admissions") {
      const bindingAdmissions = readFrameworkBindingAdmissions(
        sourceProject,
        filters,
      );
      return BINDING_ADMISSION_ROW_FAMILY.answer({
        inquiry,
        rows: bindingAdmissions,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          bindingAdmissionCount: bindingAdmissions.length,
          bindingAdmissions: page.rows.map(bindingAdmissionSummaryRow),
        }),
      });
    }

    if (projection === "binding-effects") {
      const bindingEffects = readFrameworkBindingEffects(
        sourceProject,
        filters,
      );
      return BINDING_EFFECT_ROW_FAMILY.answer({
        inquiry,
        rows: bindingEffects,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          bindingEffectCount: bindingEffects.length,
          bindingEffects: page.rows,
        }),
      });
    }

    if (projection === "binding-setups") {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      return BINDING_SETUP_ROW_FAMILY.answer({
        inquiry,
        rows: bindingSetups,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          bindingSetupCount: bindingSetups.length,
          bindingSetups: page.rows,
        }),
      });
    }

    if (projection === "relationships") {
      const renderingRelationships = readFrameworkRenderingRelationships(
        sourceProject,
        relationshipFilters,
      );
      return RENDERING_RELATIONSHIP_ROW_FAMILY.answer({
        inquiry,
        rows: renderingRelationships,
        limit,
        offset,
        basis,
        value: (page) => ({
          seedVersion: seedIndex.seedVersion,
          renderingRelationshipCount: renderingRelationships.length,
          relationshipRelations: countBy(
            renderingRelationships,
            (row) => row.relation,
          ),
          relationshipMechanisms: countBy(
            renderingRelationships,
            (row) => row.mechanism,
          ),
          relationshipPhases: countBy(
            renderingRelationships,
            (row) => row.phase,
          ),
          renderingRelationships: page.rows,
        }),
      });
    }

    const syntaxProducts = readFrameworkRenderingSyntaxProducts(
      sourceProject,
      filters,
    );
    const instructionSlots = readFrameworkInstructionSlots(
      sourceProject,
      filters,
    );
    const instructionDispatches = readFrameworkInstructionDispatches(
      sourceProject,
      filters,
    );
    const controllerCreations = readFrameworkControllerCreations(
      sourceProject,
      filters,
    );
    const bindingProducts = readFrameworkBindingProducts(
      sourceProject,
      filters,
    );
    const hydrationFlow = readFrameworkHydrationFlowRows(
      sourceProject,
      hydrationFilters,
    );
    const bindingAdmissions = readFrameworkBindingAdmissions(
      sourceProject,
      filters,
    );
    const bindingEffects = readFrameworkBindingEffects(sourceProject, filters);
    const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
    const renderingRelationships = readFrameworkRenderingRelationships(
      sourceProject,
      relationshipFilters,
    );
    const renderConsequences = readFrameworkRenderConsequenceRows(
      sourceProject,
      consequenceFilters,
    );
    return createAnswer(
      inquiry,
      OutcomeKind.Hit,
      `Framework rendering index has ${hydrationFlow.length} hydration-flow corridor row(s), ${renderConsequences.length} compact renderer consequence row(s), ${syntaxProducts.length} syntax product(s), ${instructionSlots.length} instruction slot(s), ${instructionDispatches.length} instruction dispatch edge(s), ${controllerCreations.length} controller creation flow(s), ${bindingProducts.length} binding product(s), ${bindingAdmissions.length} admission edge(s), ${bindingEffects.length} binding effect(s), ${bindingSetups.length} binding setup override(s), and ${renderingRelationships.length} rendering relationship row(s).`,
      {
        value: {
          seedVersion: seedIndex.seedVersion,
          syntaxProductCount: syntaxProducts.length,
          instructionSlotCount: instructionSlots.length,
          instructionDispatchCount: instructionDispatches.length,
          controllerCreationCount: controllerCreations.length,
          hydrationFlowCount: hydrationFlow.length,
          renderConsequenceCount: renderConsequences.length,
          recursiveDispatchCount: controllerCreations.reduce(
            (total, row) => total + row.recursiveDispatchCalls.length,
            0,
          ),
          bindingProductCount: bindingProducts.length,
          bindingAdmissionCount: bindingAdmissions.length,
          bindingEffectCount: bindingEffects.length,
          bindingSetupCount: bindingSetups.length,
          renderingRelationshipCount: renderingRelationships.length,
          relationshipRelations: countBy(
            renderingRelationships,
            (row) => row.relation,
          ),
          relationshipMechanisms: countBy(
            renderingRelationships,
            (row) => row.mechanism,
          ),
          relationshipPhases: countBy(
            renderingRelationships,
            (row) => row.phase,
          ),
          hydrationStages: countBy(hydrationFlow, (row) => row.stage),
          hydrationOperations: countBy(hydrationFlow, (row) => row.operation),
          hydrationTargetKinds: countBy(hydrationFlow, (row) => row.targetKind),
          renderConsequenceKinds: countBy(
            renderConsequences,
            (row) => row.consequenceKind,
          ),
          renderConsequenceMechanisms: countBy(
            renderConsequences,
            (row) => row.mechanism,
          ),
          renderConsequencePhases: countBy(
            renderConsequences,
            (row) => row.phase,
          ),
        },
        basis,
        evidence: [
          ...syntaxProducts.slice(0, 2).map(evidenceForSyntaxProduct),
          ...renderConsequences
            .slice(0, 2)
            .map(evidenceForRenderingTypeFact),
          ...controllerCreations
            .slice(0, 2)
            .map(evidenceForControllerCreation),
          ...hydrationFlow.slice(0, 2).map(evidenceForHydrationFlow),
          ...bindingProducts.slice(0, 2).map(evidenceForBindingProduct),
          ...renderingRelationships
            .slice(0, 2)
            .map(evidenceForRenderingTypeFact),
          ...bindingSetups.slice(0, 2).map(evidenceForBindingSetup),
        ],
        continuations: renderingSummaryContinuations(inquiry),
      },
    );
  }
}

function relationshipAxisFiltersFromInquiry(
  inquiry: Inquiry,
): Pick<FrameworkRenderingRelationshipFilters, "relation" | "mechanism" | "phase"> {
  return {
    ...relationshipAxisFiltersFromRecord(inquiry.subject),
    ...relationshipAxisFiltersFromRecord(inquiry.filters),
  };
}

function hydrationAxisFiltersFromInquiry(
  inquiry: Inquiry,
): Partial<FrameworkHydrationFlowFilters> {
  return {
    ...hydrationAxisFiltersFromRecord(inquiry.subject),
    ...hydrationAxisFiltersFromRecord(inquiry.filters),
  };
}

function consequenceAxisFiltersFromInquiry(
  inquiry: Inquiry,
): Pick<FrameworkRenderConsequenceFilters, "consequenceKind"> {
  return {
    ...consequenceAxisFiltersFromRecord(inquiry.subject),
    ...consequenceAxisFiltersFromRecord(inquiry.filters),
  };
}

function hydrationAxisFiltersFromRecord(
  value: unknown,
): Partial<FrameworkHydrationFlowFilters> {
  return stringFiltersFromRecord<FrameworkHydrationFlowFilters>(value, [
    "hydrationStage",
    "operation",
    "targetKind",
    "ownerName",
    "methodName",
    "targetName",
  ]);
}

function consequenceAxisFiltersFromRecord(
  value: unknown,
): Pick<FrameworkRenderConsequenceFilters, "consequenceKind"> {
  return stringFiltersFromRecord<Pick<FrameworkRenderConsequenceFilters, "consequenceKind">>(
    value,
    ["consequenceKind"],
  );
}

function relationshipAxisFiltersFromRecord(
  value: unknown,
): Pick<FrameworkRenderingRelationshipFilters, "relation" | "mechanism" | "phase"> {
  return stringFiltersFromRecord<Pick<FrameworkRenderingRelationshipFilters, "relation" | "mechanism" | "phase">>(
    value,
    ["relation", "mechanism", "phase"],
  );
}
