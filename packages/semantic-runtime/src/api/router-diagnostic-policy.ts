import { SourceFileRole } from '../kernel/address.js';
import {
  RouterIssueKind,
  type RouterIssueModel,
} from '../router/model.js';
import type { SemanticTemplateCursorSuggestionRow } from './contracts.js';
import type { SemanticSourceReference } from './source-reference.js';

interface RouterIssueDiagnosticRepairProjection {
  readonly missingInput: string;
  readonly missingInputs: readonly string[];
  readonly suggestion: SemanticTemplateCursorSuggestionRow;
}

/** Project repair intent only when a router failure has a template-authored instruction target. */
export function routerIssueDiagnosticRepairProjection(
  issue: RouterIssueModel,
  source: SemanticSourceReference | null,
): RouterIssueDiagnosticRepairProjection | null {
  if (source?.sourceFileRole !== SourceFileRole.Template) {
    return null;
  }
  const summary = routerIssueRepairSummary(issue.issueKind);
  if (summary == null) {
    return null;
  }
  const missingInput = `router:${issue.issueKind}`;
  return {
    missingInput,
    missingInputs: [missingInput],
    suggestion: {
      suggestionKind: 'fix-router-instruction',
      actionKind: 'rewrite-expression',
      actionTarget: {
        targetKind: 'expression',
        source,
        memberName: null,
        typeDisplay: issue.expected,
      },
      summary,
      targetMemberName: null,
      ownerTypeDisplay: null,
      valueTypeDisplay: issue.expected,
      valueTypeSource: null,
    },
  };
}

function routerIssueRepairSummary(issueKind: RouterIssueKind): string | null {
  switch (issueKind) {
    case RouterIssueKind.InvalidInstruction:
      return 'Use a route string, routeable component, or viewport instruction that Aurelia can materialize.';
    case RouterIssueKind.RouteExpressionUnexpectedSegment:
    case RouterIssueKind.RouteExpressionNotDone:
      return 'Complete the router instruction using valid Aurelia route-expression syntax.';
    case RouterIssueKind.InstructionNoFallback:
      return 'Use a configured route target, or configure a fallback for this route context.';
    case RouterIssueKind.EagerPathGenerationFailed:
      return 'Supply the route parameters required by the target route, or choose a route whose path matches the supplied parameters.';
    case RouterIssueKind.NoAvailableViewportAgent:
      return 'Target a compatible declared viewport, or declare the viewport needed by this routed component.';
    case RouterIssueKind.InvalidRouteConfig:
    case RouterIssueKind.InvalidRouteConfigProperty:
    case RouterIssueKind.UnknownRouteConfigProperty:
    case RouterIssueKind.UnknownRedirectRouteConfigProperty:
    case RouterIssueKind.ChildRouteLazyImportMissingPath:
    case RouterIssueKind.InvalidLazyImport:
    case RouterIssueKind.RouteableComponentNotFound:
    case RouterIssueKind.InstructionUnknownRedirect:
    case RouterIssueKind.RedirectUnexpectedExpressionKind:
      return null;
  }
}
