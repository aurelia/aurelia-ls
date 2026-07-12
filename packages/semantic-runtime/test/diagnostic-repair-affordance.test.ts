import { describe, expect, test } from "vitest";
import {
  DiagnosticActionChangeDomain,
  DiagnosticActionKind,
  DiagnosticActionPlanKind,
  DiagnosticActionPlanReadiness,
  DiagnosticRepairActionability,
  DiagnosticSuggestionActionKind,
  DiagnosticSuggestionActionTargetKind,
  DiagnosticSuggestionKind,
  diagnosticRepairAffordanceForSuggestion,
  type DiagnosticSuggestion,
} from "../src/index.js";

type RepairExpectation = {
  readonly suggestionKind: DiagnosticSuggestionKind;
  readonly actionKind: DiagnosticSuggestionActionKind;
  readonly targetKind: DiagnosticSuggestionActionTargetKind;
  readonly repairActionKind: DiagnosticActionKind;
  readonly planKind: DiagnosticActionPlanKind;
  readonly changeDomain: DiagnosticActionChangeDomain;
  readonly readiness: DiagnosticActionPlanReadiness;
};

const expectations: readonly RepairExpectation[] = [
  repairExpectation(
    DiagnosticSuggestionKind.RegisterResource,
    DiagnosticSuggestionActionKind.RegisterResource,
    DiagnosticSuggestionActionTargetKind.Resource,
    DiagnosticActionKind.RegisterResource,
    DiagnosticActionPlanKind.ResourceRegistration,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.RegisterDiService,
    DiagnosticSuggestionActionKind.RegisterService,
    DiagnosticSuggestionActionTargetKind.Service,
    DiagnosticActionKind.RegisterService,
    DiagnosticActionPlanKind.ServiceRegistration,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.ResolveRuntimeBoundary,
    DiagnosticSuggestionActionKind.DeclareRuntimeBoundary,
    DiagnosticSuggestionActionTargetKind.RuntimeBoundary,
    DiagnosticActionKind.ResolveRuntimeBoundary,
    DiagnosticActionPlanKind.RuntimeBoundaryDeclaration,
    DiagnosticActionChangeDomain.RuntimePolicy,
    DiagnosticActionPlanReadiness.RuntimeIntentRequired,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.DeclareExplicitMember,
    DiagnosticSuggestionActionKind.DeclareMember,
    DiagnosticSuggestionActionTargetKind.Expression,
    DiagnosticActionKind.DeclareMissingMember,
    DiagnosticActionPlanKind.SourceMemberDeclaration,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.DeclareScopeSlotType,
    DiagnosticSuggestionActionKind.DeclareScopeSlot,
    DiagnosticSuggestionActionTargetKind.ScopeSlot,
    DiagnosticActionKind.DeclareScopeSlotType,
    DiagnosticActionPlanKind.TemplateScopeSlotTyping,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.ReplaceAnyOwner,
    DiagnosticSuggestionActionKind.ReplaceOwnerType,
    DiagnosticSuggestionActionTargetKind.OwnerType,
    DiagnosticActionKind.StrengthenOwnerType,
    DiagnosticActionPlanKind.SourceOwnerTypeStrengthening,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.AlignAssignmentType,
    DiagnosticSuggestionActionKind.ChangeMemberType,
    DiagnosticSuggestionActionTargetKind.OwnerType,
    DiagnosticActionKind.AlignAssignmentType,
    DiagnosticActionPlanKind.SourceAssignmentTypeAlignment,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.MakeSourceWritable,
    DiagnosticSuggestionActionKind.ChangeMemberMutability,
    DiagnosticSuggestionActionTargetKind.OwnerType,
    DiagnosticActionKind.MakeSourceWritable,
    DiagnosticActionPlanKind.SourceWriteabilityAlignment,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.MakeMethodTrackable,
    DiagnosticSuggestionActionKind.ConfigureObserver,
    DiagnosticSuggestionActionTargetKind.ObserverConfig,
    DiagnosticActionKind.ConfigureObserver,
    DiagnosticActionPlanKind.ObservationConfiguration,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.GuardNullishExpression,
    DiagnosticSuggestionActionKind.RewriteExpression,
    DiagnosticSuggestionActionTargetKind.Expression,
    DiagnosticActionKind.RewriteExpression,
    DiagnosticActionPlanKind.TemplateExpressionRewrite,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.FixRouterInstruction,
    DiagnosticSuggestionActionKind.RewriteExpression,
    DiagnosticSuggestionActionTargetKind.Expression,
    DiagnosticActionKind.RewriteRouterInstruction,
    DiagnosticActionPlanKind.RouterInstructionRewrite,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.FixTemplateSyntax,
    DiagnosticSuggestionActionKind.RewriteTemplateSyntax,
    DiagnosticSuggestionActionTargetKind.TemplateSyntax,
    DiagnosticActionKind.RewriteTemplateSyntax,
    DiagnosticActionPlanKind.TemplateSyntaxRewrite,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.RegisterFrameworkCapability,
    DiagnosticSuggestionActionKind.RegisterFrameworkCapability,
    DiagnosticSuggestionActionTargetKind.FrameworkCapability,
    DiagnosticActionKind.RegisterFrameworkCapability,
    DiagnosticActionPlanKind.FrameworkCapabilityRegistration,
    DiagnosticActionChangeDomain.AppSource,
    DiagnosticActionPlanReadiness.SourceEditPolicyOpen,
  ),
  repairExpectation(
    DiagnosticSuggestionKind.InspectOwnerType,
    DiagnosticSuggestionActionKind.InspectOwnerType,
    DiagnosticSuggestionActionTargetKind.OwnerType,
    DiagnosticActionKind.InspectTypeSurface,
    DiagnosticActionPlanKind.ManualInspection,
    DiagnosticActionChangeDomain.Inspection,
    DiagnosticActionPlanReadiness.InspectionRequired,
  ),
];

describe("diagnostic repair affordance", () => {
  test.each(expectations)(
    "classifies $actionKind without suggestion-kind fallthrough",
    (expected) => {
      const affordance = diagnosticRepairAffordanceForSuggestion(
        suggestionFor(expected),
      );

      expect(affordance).toEqual({
        actionKind: expected.repairActionKind,
        planKind: expected.planKind,
        changeDomain: expected.changeDomain,
        readiness: expected.readiness,
        targetSourceCoverage: "all",
        actionability:
          expected.changeDomain === DiagnosticActionChangeDomain.Inspection
            ? DiagnosticRepairActionability.Manual
            : DiagnosticRepairActionability.Guided,
      });
      expect(affordance).not.toHaveProperty("editPlanState");
      expect(affordance).not.toHaveProperty("applicationKind");
    },
  );

  test("classifies a diagnostic without a suggestion as manual inspection", () => {
    expect(diagnosticRepairAffordanceForSuggestion(null)).toEqual({
      actionKind: DiagnosticActionKind.InspectTypeSurface,
      planKind: DiagnosticActionPlanKind.ManualInspection,
      changeDomain: DiagnosticActionChangeDomain.Inspection,
      readiness: DiagnosticActionPlanReadiness.InspectionRequired,
      targetSourceCoverage: "not-applicable",
      actionability: DiagnosticRepairActionability.Manual,
    });
  });
});

function repairExpectation(
  suggestionKind: DiagnosticSuggestionKind,
  actionKind: DiagnosticSuggestionActionKind,
  targetKind: DiagnosticSuggestionActionTargetKind,
  repairActionKind: DiagnosticActionKind,
  planKind: DiagnosticActionPlanKind,
  changeDomain: DiagnosticActionChangeDomain = DiagnosticActionChangeDomain.AppSource,
  readiness: DiagnosticActionPlanReadiness = DiagnosticActionPlanReadiness.ReadyToPlan,
): RepairExpectation {
  return {
    suggestionKind,
    actionKind,
    targetKind,
    repairActionKind,
    planKind,
    changeDomain,
    readiness,
  };
}

function suggestionFor(
  expected: RepairExpectation,
): DiagnosticSuggestion<object> {
  return {
    suggestionKind: expected.suggestionKind,
    actionKind: expected.actionKind,
    actionTarget: {
      targetKind: expected.targetKind,
      source: {},
      memberName: "subject",
      typeDisplay: null,
    },
    summary: "Repair the subject.",
    targetMemberName: "subject",
    ownerTypeDisplay: null,
    valueTypeDisplay: null,
    valueTypeSource: null,
  };
}
