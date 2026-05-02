import { readFrameworkDiscoverySeedIndex } from "../../framework/index.js";
import type { SourceProject } from "../../source/index.js";
import { OutcomeKind, createAnswer, type Answer } from "../answer.js";
import { clampBudget } from "../budget.js";
import type { Inquiry } from "../inquiry.js";
import {
  bindingAdmissionContinuations,
  bindingEffectContinuations,
  bindingProductContinuations,
  bindingSetupContinuations,
  controllerCreationContinuations,
  instructionDispatchContinuations,
  instructionSlotContinuations,
  renderingRelationshipContinuations,
  renderingSummaryContinuations,
  syntaxProductContinuations,
} from "./framework-continuations.js";
import type { FrameworkRenderingValue } from "./framework-entities.js";
import {
  evidenceForBindingAdmission,
  evidenceForBindingEffect,
  evidenceForBindingProduct,
  evidenceForBindingSetup,
  evidenceForControllerCreation,
  evidenceForInstructionDispatch,
  evidenceForInstructionSlot,
  evidenceForRenderingRelationship,
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
  readFrameworkInstructionDispatches,
  readFrameworkInstructionSlots,
  readFrameworkSyntaxProducts,
} from "./framework-rendering-graph.js";
import {
  readFrameworkRenderingRelationships,
  type FrameworkRenderingRelationshipFilters,
} from "./framework-rendering-relationships.js";
import {
  checkerBasis,
  evidenceLimit,
  pageInfo,
  pageOffset,
  pageRows,
  sourceIndexBasis,
} from "./framework-support.js";

class FrameworkRenderingQueryContext {
  readonly projection: string;
  readonly filters: FrameworkDiscoveryFilters;
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
    this.relationshipFilters = {
      ...this.filters,
      ...relationshipAxisFiltersFromInquiry(inquiry),
    };
    this.seedIndex = readFrameworkDiscoverySeedIndex(sourceProject);
    this.limit = clampBudget(inquiry.budget?.rows, 80, 1_000);
    this.offset = pageOffset(inquiry);
  }
}

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
    } = context;

    if (projection === "syntax-products") {
      const syntaxProducts = readFrameworkSyntaxProducts(
        sourceProject,
        filters,
      );
      const page = pageRows(syntaxProducts, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${syntaxProducts.length} Aurelia framework syntax product row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            syntaxProductCount: syntaxProducts.length,
            syntaxProducts: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForSyntaxProduct),
          page: pageInfo(
            inquiry,
            page.rows.length,
            syntaxProducts.length,
            limit,
            page.nextOffset,
          ),
          continuations: syntaxProductContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "instruction-slots") {
      const instructionSlots = readFrameworkInstructionSlots(
        sourceProject,
        filters,
      );
      const page = pageRows(instructionSlots, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${instructionSlots.length} Aurelia framework instruction slot row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            instructionSlotCount: instructionSlots.length,
            instructionSlots: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForInstructionSlot),
          page: pageInfo(
            inquiry,
            page.rows.length,
            instructionSlots.length,
            limit,
            page.nextOffset,
          ),
          continuations: instructionSlotContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "instruction-dispatches") {
      const instructionDispatches = readFrameworkInstructionDispatches(
        sourceProject,
        filters,
      );
      const page = pageRows(instructionDispatches, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${instructionDispatches.length} Aurelia framework instruction dispatch row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            instructionDispatchCount: instructionDispatches.length,
            instructionDispatches: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForInstructionDispatch),
          page: pageInfo(
            inquiry,
            page.rows.length,
            instructionDispatches.length,
            limit,
            page.nextOffset,
          ),
          continuations: instructionDispatchContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "controller-creations") {
      const controllerCreations = readFrameworkControllerCreations(
        sourceProject,
        filters,
      );
      const page = pageRows(controllerCreations, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${controllerCreations.length} Aurelia framework controller creation row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            controllerCreationCount: controllerCreations.length,
            recursiveDispatchCount: controllerCreations.reduce(
              (total, row) => total + row.recursiveDispatchCalls.length,
              0,
            ),
            controllerCreations: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForControllerCreation),
          page: pageInfo(
            inquiry,
            page.rows.length,
            controllerCreations.length,
            limit,
            page.nextOffset,
          ),
          continuations: controllerCreationContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-products") {
      const bindingProducts = readFrameworkBindingProducts(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingProducts, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingProducts.length} Aurelia framework binding product row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            bindingProductCount: bindingProducts.length,
            bindingProducts: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingProduct),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingProducts.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingProductContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-admissions") {
      const bindingAdmissions = readFrameworkBindingAdmissions(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingAdmissions, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingAdmissions.length} Aurelia framework binding admission row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            bindingAdmissionCount: bindingAdmissions.length,
            bindingAdmissions: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingAdmission),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingAdmissions.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingAdmissionContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-effects") {
      const bindingEffects = readFrameworkBindingEffects(
        sourceProject,
        filters,
      );
      const page = pageRows(bindingEffects, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingEffects.length} Aurelia framework binding effect row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            bindingEffectCount: bindingEffects.length,
            bindingEffects: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingEffect),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingEffects.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingEffectContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "binding-setups") {
      const bindingSetups = readFrameworkBindingSetups(sourceProject, filters);
      const page = pageRows(bindingSetups, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${bindingSetups.length} Aurelia framework binding setup row(s).`,
        {
          value: {
            seedVersion: seedIndex.seedVersion,
            bindingSetupCount: bindingSetups.length,
            bindingSetups: page.rows,
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForBindingSetup),
          page: pageInfo(
            inquiry,
            page.rows.length,
            bindingSetups.length,
            limit,
            page.nextOffset,
          ),
          continuations: bindingSetupContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    if (projection === "relationships") {
      const renderingRelationships = readFrameworkRenderingRelationships(
        sourceProject,
        relationshipFilters,
      );
      const page = pageRows(renderingRelationships, offset, limit);
      return createAnswer(
        inquiry,
        page.rows.length === 0 ? OutcomeKind.Miss : OutcomeKind.Hit,
        `Returned ${page.rows.length} of ${renderingRelationships.length} Aurelia framework rendering relationship row(s).`,
        {
          value: {
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
          },
          basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
          evidence: page.rows
            .slice(0, evidenceLimit(inquiry))
            .map(evidenceForRenderingRelationship),
          page: pageInfo(
            inquiry,
            page.rows.length,
            renderingRelationships.length,
            limit,
            page.nextOffset,
          ),
          continuations: renderingRelationshipContinuations(
            inquiry,
            page.rows,
            page.nextOffset,
            limit,
          ),
        },
      );
    }

    const syntaxProducts = readFrameworkSyntaxProducts(sourceProject, filters);
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
    return createAnswer(
      inquiry,
      OutcomeKind.Hit,
      `Framework rendering index has ${syntaxProducts.length} syntax product(s), ${instructionSlots.length} instruction slot(s), ${instructionDispatches.length} instruction dispatch edge(s), ${controllerCreations.length} controller creation flow(s), ${bindingProducts.length} binding product(s), ${bindingAdmissions.length} admission edge(s), ${bindingEffects.length} binding effect(s), ${bindingSetups.length} binding setup override(s), and ${renderingRelationships.length} rendering relationship row(s).`,
      {
        value: {
          seedVersion: seedIndex.seedVersion,
          syntaxProductCount: syntaxProducts.length,
          instructionSlotCount: instructionSlots.length,
          instructionDispatchCount: instructionDispatches.length,
          controllerCreationCount: controllerCreations.length,
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
        },
        basis: [sourceIndexBasis(sourceProject), checkerBasis(sourceProject)],
        evidence: [
          ...syntaxProducts.slice(0, 2).map(evidenceForSyntaxProduct),
          ...controllerCreations
            .slice(0, 2)
            .map(evidenceForControllerCreation),
          ...bindingProducts.slice(0, 2).map(evidenceForBindingProduct),
          ...renderingRelationships
            .slice(0, 2)
            .map(evidenceForRenderingRelationship),
          ...bindingSetups.slice(0, 2).map(evidenceForBindingSetup),
        ],
        continuations: renderingSummaryContinuations(inquiry),
      },
    );
  }
}

function countBy<TValue>(
  values: readonly TValue[],
  key: (value: TValue) => string,
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const bucket = key(value);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}

function relationshipAxisFiltersFromInquiry(
  inquiry: Inquiry,
): Pick<FrameworkRenderingRelationshipFilters, "relation" | "mechanism" | "phase"> {
  return {
    ...relationshipAxisFiltersFromRecord(inquiry.subject),
    ...relationshipAxisFiltersFromRecord(inquiry.filters),
  };
}

function relationshipAxisFiltersFromRecord(
  value: unknown,
): Pick<FrameworkRenderingRelationshipFilters, "relation" | "mechanism" | "phase"> {
  if (value === null || typeof value !== "object") {
    return {};
  }
  const source = value as Record<string, unknown>;
  return {
    ...stringAxisFilter(source, "relation"),
    ...stringAxisFilter(source, "mechanism"),
    ...stringAxisFilter(source, "phase"),
  };
}

function stringAxisFilter(
  source: Record<string, unknown>,
  key: "relation" | "mechanism" | "phase",
): object {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}
