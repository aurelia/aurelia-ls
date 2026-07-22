import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import {
  AuthoredSourceTextCache,
  authoredSourceHostPathCandidates,
} from '../kernel/authored-source-text.js';
import type {
  AddressHandle,
  HotDetailHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import type { BindingContextSlot } from '../configuration/scope.js';
import {
  diagnosticRepairAffordanceForSuggestion,
} from '../diagnostic-action/action.js';
import {
  ConfigurationStepKind,
  type ConfigurationStep,
} from '../configuration/configuration-sequence.js';
import {
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  type FrameworkCapabilityDemand,
} from '../framework/capability-demand.js';
import {
  aureliaEntrypointRegistrationExpressionText,
} from '../source-plan/aurelia-entrypoint-source-plan.js';
import {
  aureliaFrameworkRegistrationAdmissionSource,
  type AureliaFrameworkRegistrationAdmissionSource,
} from '../source-plan/aurelia-framework-registration-admission-source.js';
import {
  planAureliaRegisterChainSourceOperation,
  planTypeScriptImportSourceOperations,
  type TypeScriptSourceOperationEdit,
} from '../source-plan/typescript-source-operation.js';
import {
  readSemanticTemplateCursorInfo,
  readSemanticTemplateCompletions,
  readSemanticTemplateDiagnostics,
  readTemplateDiagnosticRows,
} from './template-completion.js';
import { resolveSemanticSourceCursor } from './source-cursor.js';
import {
  compilerWorldLabel,
  describeAddress,
  semanticExactSourceReference,
  semanticSourceReferenceMatchesFilePath,
  semanticSourceReferenceContainsFileOffset,
  sourceReferenceForParserSpan,
  sourceReferenceForTsNode,
} from './source-reference.js';
import {
  answer,
  closureForAnswer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
  toPageRequest,
} from './answer-helpers.js';
import {
  SemanticRuntimeDetail,
  SemanticRuntimeAnswerClosure,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppQuery,
  type SemanticBindingDataFlowRow,
  type SemanticBindingObservedDependencyRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticTemplateCompilationResult,
  type SemanticTemplateCompilationRow,
  type SemanticTemplateCompletionResult,
  SemanticTemplateCodeActionEditKind,
  type SemanticTemplateCodeActionEdits,
  type SemanticTemplateCodeActionEditRow,
  type SemanticTemplateCodeActionRow,
  type SemanticTemplateCodeActionsResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticRow,
  type SemanticTemplateDiagnosticsResult,
  type SemanticTemplateFoldingRangesResult,
  SemanticTemplateInlayHintKind,
  type SemanticTemplateInlayHintRow,
  type SemanticTemplateInlayHintsResult,
  SemanticTemplateBindableDeclarationKind,
  SemanticTemplateBindableAttributeSourceKind,
  SemanticTemplateReferenceKind,
  SemanticTemplateResourceDeclarationKind,
  SemanticTemplateResourceUsageKind,
  type SemanticTemplateReferenceRow,
  type SemanticTemplateReferencesResult,
  SemanticTemplateRenameEditKind,
  type SemanticTemplateRenameEditRow,
  SemanticTemplateRenameStatus,
  type SemanticTemplateRenameResult,
  SemanticTemplateRenameUnavailableReason,
  type SemanticTemplateSemanticTokensResult,
} from './contracts.js';
import {
  readBindingDataFlowRows,
  readBindingObservedDependencyRows,
} from './binding-projections.js';
import {
  readTemplateSemanticTokenRows,
} from './template-semantic-tokens.js';
import {
  readTemplateFoldingRangeRows,
} from './template-folding-ranges.js';
import type {
  SemanticSourceReference,
} from './source-reference.js';
import {
  capturedAttributeSyntaxForDynamicInstruction,
  resourceLocalBindingDataFlows,
  resourceLocalBindingObservedDependencies,
  resourceLocalBindingSourceOperations,
  resourceLocalBindingTargetAccesses,
  resourceLocalBindingTargetOperations,
  resourceLocalBindingValueChannels,
  resourceLocalRuntimeBindings,
  resourceLocalDynamicTemplateInstructions,
  resourceLocalTemplateExpressionParses,
} from '../template/runtime-resource-ownership.js';
import {
  HydrateAttributeInstruction,
  HydrateElementInstruction,
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import {
  HtmlElement,
  htmlElementAttributeOwnersByElementProduct,
} from '../template/html-ir.js';
import {
  BuiltInBindingCommandName,
} from '../template/built-in-syntax.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import { TemplateProductDetails } from '../template/product-details.js';
import { sourceSpanFromBounds } from '../expression/source-span.js';
import { isAureliaExpressionIdentifier } from '../expression/expression-scanner.js';
import { ExpressionParseResultInspector } from '../expression/parse-result-inspection.js';
import { bindableAttributeNameForProperty } from '../resources/bindable-attribute.js';
import type { BindableDefinitionReference } from '../resources/bindable-definition.js';
import {
  ResourceDefinitionKind,
  resourceKindsShareRegistrationIdentity,
} from '../resources/resource-kind.js';
import { TypeSystemHotDetails } from '../type-system/product-details.js';
import { checkerTypeMemberValueSourceAddressHandle } from '../type-system/checker-type-member-source.js';
import {
  findVisibleTemplateResource,
  readVisibleTemplateResourceDefinition,
} from '../template/compiler-resource-lookup.js';
import { TemplateSpecialAttributeName } from '../template/special-attribute-source.js';
import { namedRefTargetController } from '../template/runtime-ref-target.js';
import {
  bindingScopesForTemplateExpressionParse,
  runtimeExpressionBindingsForTemplateExpressionParseInScope,
} from '../template/template-expression-selection.js';
import { runtimeAcceptedBindingExpressionAstForParse } from '../template/expression-parse-projection.js';
import { expressionResourceOccurrences } from '../template/expression-resource-occurrence.js';
import type { GenerationAuthority } from '../kernel/generation-authority.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];
type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

export class SemanticAppTemplateQueries {
  private readonly sourceTextCache: AuthoredSourceTextCache;

  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly generation: GenerationAuthority,
    private readonly store: KernelStore,
    private readonly workspaceRootDir: string,
    private readonly projectRootDir: string,
  ) {
    this.sourceTextCache = new AuthoredSourceTextCache('', emission.project.inputGeneration.host);
  }

  templateCompilations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTemplateCompilationResult> {
    this.requireCurrentGeneration();
    const handles = includeHandles(detail);
    const rows = [
      ...templateCompilationRows(this.store, this.emission.templates.resources, 'app-runtime', handles),
      ...templateCompilationRows(this.store, this.emission.templates.authoringResources, 'authoring', handles),
    ]
      .sort((left, right) =>
        left.definitionName.localeCompare(right.definitionName)
        || left.compilationLane.localeCompare(right.compilationLane)
      );
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} compiled template row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  templateCompletions(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCompletionResult> {
    this.requireCurrentGeneration();
    return readSemanticTemplateCompletions(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      toPageRequest(query.page),
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
  }

  templateCursorInfo(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult> {
    this.requireCurrentGeneration();
    return readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      query.detail ?? SemanticRuntimeDetail.Compact,
      query.diagnosticProjection,
    );
  }

  templateReferences(
    input: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateReferencesResult> {
    this.requireCurrentGeneration();
    const query = this.queryWithResolvedCursor(input);
    const detail = query.detail ?? SemanticRuntimeDetail.Compact;
    const handles = includeHandles(detail);
    const context = this.templateReferenceContextForCursor(query, detail, handles);
    if (context == null) {
      return answer(
        SemanticRuntimeAnswerOutcome.Miss,
        'No source-backed template member is selected at this cursor.',
        {
          displayText: 'No source-backed template member is selected.',
          selectedMemberName: null,
          targetSource: null,
          rows: [],
          candidateRows: [],
        },
      );
    }

    // References and rename share one occurrence set: template rows from the reference context plus
    // TypeScript usages from the same collector rename edits are built from.
    const tsUsageRows = context.includeTypeScriptReferences
      ? typeScriptUsageReferenceRows(
          this.emission,
          context.selectedMemberName,
          context.targetSource,
        )
      : [];
    const allRows = [...uniqueTemplateReferenceRows([...context.rows, ...tsUsageRows])]
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
        || left.referenceKind.localeCompare(right.referenceKind)
      );
    const rows = query.includeDeclaration === true
      ? allRows
      : allRows.filter((row) => row.referenceKind !== SemanticTemplateReferenceKind.Declaration);
    const paged = pageRows(rows, query.page);
    const closure = (context.forceOpen || context.candidateRows.length > 0) && paged.page.nextCursor == null
      ? SemanticRuntimeAnswerClosure.Open
      : closureForAnswer(outcomeForPagedRows(paged), paged.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} template reference row(s).`,
      {
        displayText: `${rows.length} template reference row(s) for ${context.selectedMemberName}.`,
        selectedMemberName: context.selectedMemberName,
        targetSource: context.targetSource,
        rows: paged.rows,
        candidateRows: context.candidateRows,
      },
      paged.page,
      [],
      closure,
    );
  }

  templateRename(
    input: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
    this.requireCurrentGeneration();
    const query = this.queryWithResolvedCursor(input);
    const detail = query.detail ?? SemanticRuntimeDetail.Compact;
    const handles = includeHandles(detail);
    const contexts = this.templateReferenceContexts({ ...query, includeDeclaration: true }, detail, handles);
    const selected = activeTemplateReferenceContext(contexts, query.cursor);
    if (selected == null) {
      const context = contexts[0] ?? null;
      const reason = context == null
        ? SemanticTemplateRenameUnavailableReason.NoSourceBackedMember
        : SemanticTemplateRenameUnavailableReason.CursorNotOnRenameableReference;
      return templateRenameUnavailable(
        reason,
        context == null
          ? 'No source-backed template member is selected at this cursor.'
          : 'The cursor is not on a renameable template reference for the selected member.',
        context?.selectedMemberName ?? null,
        context?.targetSource ?? null,
        null,
      );
    }
    const { context, activeRow, activeSource } = selected;

    if (context.renameSurface === TemplateRenameSurface.UnsupportedResource) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.UnsupportedResourceKind,
        `Resource '${context.selectedMemberName}' is not renameable from this template position.`,
        context.selectedMemberName,
        context.targetSource,
        activeSource,
      );
    }

    if (isResourceRenameSurface(context.renameSurface) && !context.hasAuthoredDeclarationSource) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.ResourceNameHasNoAuthoredSource,
        `Resource name '${context.selectedMemberName}' is convention-derived or otherwise has no authored name token to rename.`,
        context.selectedMemberName,
        context.targetSource,
        activeSource,
      );
    }

    const placeholder = context.selectedMemberName;
    const renameClosure = context.candidateRows.length > 0
      ? SemanticRuntimeAnswerClosure.Open
      : SemanticRuntimeAnswerClosure.Complete;
    const newName = query.newName ?? null;
    if (newName == null) {
      return answer(
        SemanticRuntimeAnswerOutcome.Hit,
        `Rename is available for ${placeholder}.`,
        {
          displayText: `Rename is available for ${placeholder}.`,
          status: SemanticTemplateRenameStatus.Available,
          reason: null,
          selectedMemberName: context.selectedMemberName,
          placeholder,
          targetSource: context.targetSource,
          activeSource,
          edits: [],
          candidateRows: context.candidateRows,
          templateReferenceCount: context.templateUsageRows.length,
          typeScriptReferenceCount: 0,
        },
        null,
        [],
        renameClosure,
      );
    }

    if (!isValidRenameName(newName, context.renameSurface)) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.InvalidNewName,
        invalidRenameNameMessage(newName, context.renameSurface),
        context.selectedMemberName,
        context.targetSource,
        activeSource,
        SemanticTemplateRenameStatus.InvalidName,
      );
    }

    const typeScriptEdits = context.includeTypeScriptReferences
      ? typeScriptReferenceRenameEdits(
          this.emission,
          context.targetSource,
          newName,
        )
      : [];
    if (
      context.includeTypeScriptReferences
      && typeScriptEdits == null
      && sourceReferenceLooksTypeScript(context.targetSource)
    ) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.TypeScriptSymbolUnavailable,
        'The TypeScript symbol for this template member could not be proven in the current Program.',
        context.selectedMemberName,
        context.targetSource,
        activeSource,
      );
    }

    const provenTypeScriptEdits = typeScriptEdits ?? [];
    const bindableConventionCallbackEdits = bindableConventionCallbackRenameEdits(this.emission, context, newName);
    // Reference rows carry authored token sources, so each edit replaces exactly the token.
    const templateEdits = context.rows
      .filter((row) => referenceRowNeedsTemplateRenameEdit(row, context.renameSurface, context.selectedMemberName))
      .map((row) => {
        const editKind = templateRenameEditKindForReferenceRow(row, context.renameSurface);
        const oldText = this.authoredTextForSource(row.source) ?? row.name;
        return templateRenameEditRow(
          editKind,
          row.source,
          oldText,
          templateRenameNewText(row, context.renameSurface, editKind, oldText, newName),
        );
      });
    const typeScriptLikeEdits = [...provenTypeScriptEdits, ...bindableConventionCallbackEdits];
    const edits = [...uniqueTemplateRenameEditRows([...typeScriptLikeEdits, ...templateEdits])]
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
        || left.editKind.localeCompare(right.editKind)
      );

    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Prepared ${edits.length} rename edit(s) for ${placeholder}.`,
      {
        displayText: `${edits.length} rename edit(s) for ${placeholder}.`,
        status: SemanticTemplateRenameStatus.Available,
        reason: null,
        selectedMemberName: context.selectedMemberName,
        placeholder,
        targetSource: context.targetSource,
        activeSource,
        edits,
        candidateRows: context.candidateRows,
        templateReferenceCount: context.templateUsageRows.length,
        typeScriptReferenceCount: typeScriptLikeEdits.length,
      },
      null,
      [],
      renameClosure,
    );
  }

  private authoredTextForSource(source: SemanticSourceReference | null): string | null {
    const exact = semanticExactSourceReference(source);
    if (exact?.path == null || exact.start == null || exact.end == null) {
      return null;
    }
    const authored = this.sourceTextCache.readFirst(authoredSourceHostPathCandidates(
      this.workspaceRootDir,
      this.projectRootDir,
      exact.path,
    ));
    return authored == null || exact.start < 0 || exact.end < exact.start || exact.end > authored.text.length
      ? null
      : authored.text.slice(exact.start, exact.end);
  }

  private queryWithResolvedCursor(query: SemanticAppQuery): SemanticAppQuery {
    if (query.cursor == null || query.cursor.offset != null) {
      return query;
    }
    const resolution = resolveSemanticSourceCursor(
      this.workspaceRootDir,
      this.projectRootDir,
      query.cursor,
      this.emission.project.inputGeneration.host,
    );
    return resolution.cursor == null ? query : { ...query, cursor: resolution.cursor };
  }

  templateRenameFromTypeScript(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
    this.requireCurrentGeneration();
    const detail = query.detail ?? SemanticRuntimeDetail.Compact;
    const handles = includeHandles(detail);
    const context = this.typeScriptReferenceContext(query, handles);
    if (context == null) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.NoSourceBackedMember,
        'No source-backed TypeScript member is selected at this cursor.',
        null,
        null,
        null,
      );
    }

    const placeholder = context.selectedMemberName;
    const propagationClosure = context.candidateRows.length > 0
      ? SemanticRuntimeAnswerClosure.Open
      : SemanticRuntimeAnswerClosure.Complete;
    const newName = query.newName ?? null;
    if (newName == null) {
      return answer(
        SemanticRuntimeAnswerOutcome.Hit,
        `Template rename propagation is available for ${placeholder}.`,
        {
          displayText: `Template rename propagation is available for ${placeholder}.`,
          status: SemanticTemplateRenameStatus.Available,
          reason: null,
          selectedMemberName: context.selectedMemberName,
          placeholder,
          targetSource: context.targetSource,
          activeSource: context.activeSource,
          edits: [],
          candidateRows: context.candidateRows,
          templateReferenceCount: context.templateUsageRows.length,
          typeScriptReferenceCount: 0,
        },
        null,
        [],
        propagationClosure,
      );
    }

    if (!isValidRenameIdentifier(newName)) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.InvalidNewName,
        `Rename target '${newName}' is not a valid TypeScript identifier.`,
        context.selectedMemberName,
        context.targetSource,
        context.activeSource,
        SemanticTemplateRenameStatus.InvalidName,
      );
    }

    const aureliaEdits = context.templateUsageRows
      .filter(referenceRowNeedsTypeScriptRenamePropagationEdit)
      .map((row) =>
        templateRenameEditRow(
          templateRenameFromTypeScriptEditKindForReferenceRow(row),
          row.source,
          row.name,
          templateRenameFromTypeScriptNewText(row, newName),
        )
      );
    const callbackEdits = context.bindableConventionCallbackTargetSources.flatMap((targetSource) =>
      typeScriptReferenceRenameEdits(this.emission, targetSource, `${newName}Changed`) ?? []
    );
    const uniqueEdits = [...uniqueTemplateRenameEditRows([...aureliaEdits, ...callbackEdits])]
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
      );

    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Prepared ${uniqueEdits.length} template rename propagation edit(s) for ${placeholder}.`,
      {
        displayText: `${uniqueEdits.length} template rename propagation edit(s) for ${placeholder}.`,
        status: SemanticTemplateRenameStatus.Available,
        reason: null,
        selectedMemberName: context.selectedMemberName,
        placeholder,
        targetSource: context.targetSource,
        activeSource: context.activeSource,
        edits: uniqueEdits,
        candidateRows: context.candidateRows,
        templateReferenceCount: context.templateUsageRows.length,
        typeScriptReferenceCount: callbackEdits.length,
      },
      null,
      [],
      propagationClosure,
    );
  }

  templateCodeActions(
    input: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult> {
    this.requireCurrentGeneration();
    const query = this.queryWithResolvedCursor(input);
    if (query.cursor == null || query.cursor.offset == null) {
      return answer(
        SemanticRuntimeAnswerOutcome.Miss,
        'Template code actions require a source cursor with an offset.',
        {
          displayText: 'Template code actions require a source cursor.',
          rows: [],
        },
      );
    }
    const cursor = query.cursor;

    const diagnostics = readTemplateDiagnosticRows(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      { filePath: cursor.filePath },
      includeHandles(query.detail ?? SemanticRuntimeDetail.Compact),
      query.diagnosticProjection,
    );
    const actions = uniqueTemplateCodeActionRows(
      diagnostics
        .filter((diagnostic) => diagnosticContainsCursor(diagnostic, cursor))
        .map((diagnostic) => templateCodeActionForDiagnostic(this.store, this.emission, diagnostic))
        .filter((row): row is SemanticTemplateCodeActionRow => row != null),
    );

    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Returned ${actions.length} template code action(s).`,
      {
        displayText: `${actions.length} template code action(s).`,
        rows: actions,
      },
    );
  }

  templateDiagnostics(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult> {
    this.requireCurrentGeneration();
    return readSemanticTemplateDiagnostics(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.sourceFile,
      toPageRequest(query.page),
      query.detail ?? SemanticRuntimeDetail.Compact,
      query.diagnosticProjection,
    );
  }

  templateInlayHints(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateInlayHintsResult> {
    this.requireCurrentGeneration();
    const handles = includeHandles(query.detail ?? SemanticRuntimeDetail.Compact);
    const sourceFile = query.sourceFile?.filePath ?? null;
    const rows = uniqueTemplateInlayHintRows([
      ...this.emission.templates.resources,
      ...this.emission.templates.authoringResources,
    ].flatMap((resource) => templateInlayHintRows(this.store, resource, handles)))
      .filter((row) =>
        sourceFile == null || semanticSourceReferenceMatchesFilePath(row.source, sourceFile)
      )
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
        || left.definitionName.localeCompare(right.definitionName)
        || left.targetProperty.localeCompare(right.targetProperty)
      );
    const paged = pageRows(rows, query.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} template inlay hint row(s).`,
      {
        displayText: `${rows.length} template inlay hint row(s).`,
        rows: paged.rows,
      },
      paged.page,
    );
  }

  templateSemanticTokens(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateSemanticTokensResult> {
    this.requireCurrentGeneration();
    const sourceFile = query.sourceFile?.filePath ?? null;
    const rows = readTemplateSemanticTokenRows(
      this.store,
      this.emission,
      sourceFile,
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
    const paged = pageRows(rows, query.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} template semantic token row(s).`,
      {
        displayText: `${rows.length} template semantic token row(s).`,
        rows: paged.rows,
      },
      paged.page,
    );
  }

  templateFoldingRanges(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateFoldingRangesResult> {
    this.requireCurrentGeneration();
    const sourceFile = query.sourceFile?.filePath ?? null;
    const rows = readTemplateFoldingRangeRows(
      this.store,
      this.emission,
      sourceFile,
      query.detail ?? SemanticRuntimeDetail.Compact,
    );
    const paged = pageRows(rows, query.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} template folding range row(s).`,
      {
        displayText: `${rows.length} template folding range row(s).`,
        rows: paged.rows,
      },
      paged.page,
    );
  }

  templateDiagnosticRows(
    query: SemanticAppQuery,
  ): readonly SemanticTemplateDiagnosticRow[] {
    this.requireCurrentGeneration();
    return readTemplateDiagnosticRows(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.sourceFile,
      (query.detail ?? SemanticRuntimeDetail.Compact) === SemanticRuntimeDetail.Handles,
      query.diagnosticProjection,
    );
  }

  private requireCurrentGeneration(): void {
    this.generation.requireCurrent();
  }

  private templateReferenceContext(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const cursorInfo = readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      // Reference identity joins always require handles; `handles` below still controls answer projection.
      SemanticRuntimeDetail.Handles,
      query.diagnosticProjection,
    );
    const selectedMember = cursorInfo.value.selectedMember;
    const selectedMemberName = cursorInfo.value.selectedMemberName ?? selectedMember?.name ?? null;
    const targetSource = semanticExactSourceReference(
      selectedMember?.declarationSource ?? selectedMember?.source ?? null,
    );
    if (selectedMember == null || selectedMemberName == null || targetSource == null) {
      return null;
    }

    return this.templateReferenceContextForTarget({
      selectedMemberName,
      targetSource,
      targetIdentityHandle: selectedMember.handles?.declarationIdentityHandle ?? null,
      declarationSource: selectedMember.declarationSource ?? selectedMember.source,
      declarationSourceAddressHandle: selectedMember.handles?.declarationSourceAddressHandle
        ?? selectedMember.handles?.sourceAddressHandle
        ?? null,
      renameSurface: TemplateRenameSurface.Member,
      observedTargetSources: this.templateMemberObservedTargetSources(
        selectedMember.handles?.detailHandle ?? null,
        targetSource,
      ),
      bindableAttributeTarget: {
        surface: TemplateRenameSurface.BindableProperty,
        propertyName: selectedMemberName,
        propertyTargetIdentityHandle: selectedMember.handles?.declarationIdentityHandle ?? null,
        propertyTargetSource: targetSource,
        aliasName: null,
        aliasTargetSource: null,
      },
    }, handles);
  }

  private templateMemberObservedTargetSources(
    memberDetailHandle: HotDetailHandle | null,
    targetSource: SemanticSourceReference,
  ): readonly SemanticSourceReference[] {
    const member = memberDetailHandle == null
      ? null
      : this.store.hotDetails.read(TypeSystemHotDetails.TypeMember, memberDetailHandle);
    const valueSource = semanticExactSourceReference(describeAddress(
      this.store,
      member == null ? null : checkerTypeMemberValueSourceAddressHandle(this.store, member),
    ));
    return valueSource == null || sourceReferencesMatchExactSpan(valueSource, targetSource)
      ? [targetSource]
      : [targetSource, valueSource];
  }

  private templateReferenceContexts(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): readonly TemplateReferenceContext[] {
    return [
      // Template-origin first; TypeScript-origin cursors (Find References in a .ts file) fall back to
      // the TypeScript reference context so template usages of a view-model member are reachable from
      // the declaration side too. Reference providers merge client-side, so answering here is safe.
      this.templateReferenceContext(query, detail, handles),
      this.templateBindableAliasReferenceContext(query, detail, handles),
      this.templateBindableReferenceContext(query, detail, handles),
      this.templateResourceReferenceContext(query, handles),
      this.templateReferenceContextFromTypeScript(query, handles),
    ].filter((context): context is TemplateReferenceContext => context != null);
  }

  private templateReferenceContextForCursor(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const contexts = this.templateReferenceContexts(query, detail, handles);
    return activeTemplateReferenceContext(contexts, query.cursor)?.context
      ?? this.templateOpenMemberReferenceContext(query, detail, handles)
      ?? null;
  }

  private templateOpenMemberReferenceContext(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const cursor = query.cursor;
    if (cursor == null || cursor.offset == null) {
      return null;
    }
    const cursorInfo = readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      cursor,
      detail,
      query.diagnosticProjection,
    );
    const selectedMemberName = cursorInfo.value.selectedMemberName;
    if (
      cursorInfo.value.siteKind !== 'expression-member'
      || selectedMemberName == null
      || cursorInfo.value.selectedMember != null
    ) {
      return null;
    }

    const observedRows = readBindingObservedDependencyRows(this.emission, this.store, handles);
    const activeObservedRow = observedRows.find((row) =>
      unprovenObservedMemberRowContainsCursor(row, selectedMemberName, cursor)
    ) ?? null;
    if (activeObservedRow == null) {
      return null;
    }
    const activeSource = semanticExactSourceReference(activeObservedRow.memberTokenSource ?? null);
    if (activeSource == null) {
      return null;
    }
    const activeRow = openMemberTemplateReferenceRowForObservedDependency(
      activeObservedRow,
      selectedMemberName,
      activeSource,
      handles,
    );
    const candidateRows = unprovenSameNameCandidateRows(
      observedRows,
      selectedMemberName,
      activeSource,
      handles,
    ).filter((row) => !sourceReferencesMatchExactSpan(row.source, activeSource));

    return {
      selectedMemberName,
      targetSource: activeSource,
      renameSurface: TemplateRenameSurface.Member,
      includeTypeScriptReferences: false,
      hasAuthoredDeclarationSource: false,
      bindableConventionCallbackTargetSources: [],
      forceOpen: true,
      templateUsageRows: [activeRow],
      candidateRows,
      rows: [activeRow],
    };
  }

  private templateBindableReferenceContext(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const cursorInfo = readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      SemanticRuntimeDetail.Handles,
      query.diagnosticProjection,
    );
    const selectedBindable = cursorInfo.value.selectedBindable;
    const selectedMemberName = selectedBindable?.name ?? null;
    const targetSource = semanticExactSourceReference(
      selectedBindable?.propertySource ?? selectedBindable?.nameSource ?? selectedBindable?.source ?? null,
    );
    if (selectedBindable == null || selectedMemberName == null || targetSource == null) {
      return null;
    }

    return this.templateReferenceContextForTarget({
      selectedMemberName,
      targetSource,
      targetIdentityHandle: selectedBindable.handles?.propertyTargetIdentityHandle ?? null,
      declarationSource: selectedBindable.propertySource
        ?? selectedBindable.nameSource
        ?? selectedBindable.source,
      declarationSourceAddressHandle: selectedBindable.handles?.propertyTargetAddressHandle
        ?? selectedBindable.handles?.nameSourceAddressHandle
        ?? selectedBindable.handles?.sourceAddressHandle
        ?? null,
      renameSurface: TemplateRenameSurface.BindableProperty,
      includeTypeScriptReferences: selectedBindable.propertySource != null,
      bindableAttributeTarget: {
        surface: TemplateRenameSurface.BindableProperty,
        propertyName: selectedMemberName,
        propertyTargetIdentityHandle: selectedBindable.handles?.propertyTargetIdentityHandle ?? null,
        propertyTargetSource: targetSource,
        aliasName: null,
        aliasTargetSource: null,
      },
    }, handles);
  }

  private templateBindableAliasReferenceContext(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const cursorInfo = readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      SemanticRuntimeDetail.Handles,
      query.diagnosticProjection,
    );
    const selectedBindable = cursorInfo.value.selectedBindable;
    const aliasName = selectedBindable?.attribute ?? null;
    const aliasTargetSource = semanticExactSourceReference(selectedBindable?.attributeSource ?? null);
    if (selectedBindable == null || aliasName == null || aliasTargetSource == null) {
      return null;
    }

    const templateUsageRows = bindableAttributeReferenceRows(
      this.store,
      [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
      {
        surface: TemplateRenameSurface.BindableAttributeAlias,
        propertyName: selectedBindable.name,
        propertyTargetIdentityHandle: selectedBindable.handles?.propertyTargetIdentityHandle ?? null,
        propertyTargetSource: semanticExactSourceReference(
          selectedBindable.propertySource ?? selectedBindable.nameSource ?? selectedBindable.source ?? null,
        ),
        aliasName,
        aliasTargetSource,
      },
      handles,
    );
    return templateReferenceContextFromRows({
      selectedMemberName: aliasName,
      targetSource: aliasTargetSource,
      renameSurface: TemplateRenameSurface.BindableAttributeAlias,
      includeTypeScriptReferences: false,
      hasAuthoredDeclarationSource: true,
      declarationRows: [
        templateReferenceDeclarationRow(
          selectedBindable.attributeSource,
          aliasName,
          aliasTargetSource,
          selectedBindable.handles?.attributeSourceAddressHandle ?? null,
          handles,
          null,
          SemanticTemplateBindableDeclarationKind.AttributeAlias,
        ),
      ],
      templateUsageRows,
      candidateRows: [],
    });
  }

  private templateResourceReferenceContext(
    query: SemanticAppQuery,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const cursorInfo = readSemanticTemplateCursorInfo(
      this.store,
      this.workspaceRootDir,
      this.projectRootDir,
      this.emission,
      query.cursor,
      SemanticRuntimeDetail.Handles,
      query.diagnosticProjection,
    );
    const selectedDefinition = cursorInfo.value.selectedDefinition;
    const canonicalName = selectedDefinition?.name ?? selectedDefinition?.targetName ?? null;
    const matchedName = selectedDefinition?.matchedName ?? canonicalName;
    const matchedAlias = canonicalName != null
      && matchedName != null
      && canonicalName.toLowerCase() !== matchedName.toLowerCase()
      && selectedDefinition?.matchedNameSource != null;
    const selectedName = matchedAlias ? matchedName : canonicalName;
    const declarationSource = matchedAlias
      ? selectedDefinition?.matchedNameSource ?? null
      : selectedDefinition?.nameSource ?? selectedDefinition?.targetSource ?? selectedDefinition?.source ?? null;
    const declarationTargetSource = semanticExactSourceReference(declarationSource);
    const targetSource = declarationTargetSource
      ?? semanticExactSourceReference(cursorInfo.value.activeSource);
    if (selectedDefinition == null || selectedName == null || targetSource == null) {
      return null;
    }

    const renameSurface = templateRenameSurfaceForResourceKind(selectedDefinition.resourceKind);
    const sourceAddressHandle = matchedAlias
      ? selectedDefinition.handles?.matchedNameSourceAddressHandle ?? null
      : selectedDefinition.handles?.nameSourceAddressHandle
        ?? selectedDefinition.handles?.targetAddressHandle
        ?? selectedDefinition.handles?.sourceAddressHandle
        ?? null;
    const target: ResourceReferenceTarget = {
      resourceKind: selectedDefinition.resourceKind,
      selectedName,
      targetSource,
      definitionProductHandle: selectedDefinition.handles?.definitionProductHandle ?? null,
      sourceAddressHandle,
    };
    const templateUsageRows = resourceReferenceRows(
      this.store,
      [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
      target,
      handles,
    );
    return templateReferenceContextFromRows({
      selectedMemberName: selectedName,
      targetSource,
      renameSurface,
      includeTypeScriptReferences: false,
      hasAuthoredDeclarationSource: matchedAlias
        ? selectedDefinition.matchedNameSource != null
        : selectedDefinition.nameSource != null,
      declarationRows: declarationTargetSource == null ? [] : [
        templateReferenceDeclarationRow(
          declarationSource,
          selectedName,
          declarationTargetSource,
          target.sourceAddressHandle,
          handles,
          matchedAlias
            ? SemanticTemplateResourceDeclarationKind.AliasName
            : SemanticTemplateResourceDeclarationKind.PrimaryName,
        ),
      ],
      templateUsageRows,
      candidateRows: [],
    });
  }

  private templateReferenceContextForTarget(
    target: TemplateReferenceTarget,
    handles: boolean,
  ): TemplateReferenceContext {
    const bindableEvidence = target.bindableAttributeTarget == null
      ? emptyBindablePropertyReferenceEvidence()
      : this.bindablePropertyReferenceEvidence(
          target.selectedMemberName,
          target.targetIdentityHandle,
          target.targetSource,
          handles,
        );
    const references = this.referenceRowsForTarget(
      target.selectedMemberName,
      target.targetSource,
      target.observedTargetSources ?? [target.targetSource],
      target.targetIdentityHandle,
      target.declarationSourceAddressHandle,
      handles,
    );
    const bindableAttributeRows = target.bindableAttributeTarget != null
      ? bindableAttributeReferenceRows(
          this.store,
          [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
          target.bindableAttributeTarget,
          handles,
        )
      : [];
    const templateUsageRows = uniqueSortedTemplateReferenceRows([
      ...references.templateUsageRows,
      ...bindableAttributeRows,
    ]);
    return templateReferenceContextFromRows({
      selectedMemberName: target.selectedMemberName,
      targetSource: target.targetSource,
      renameSurface: target.renameSurface,
      includeTypeScriptReferences: target.includeTypeScriptReferences ?? true,
      hasAuthoredDeclarationSource: true,
      bindableConventionCallbackTargetSources: bindableEvidence.callbackTargetSources,
      declarationRows: [
        templateReferenceDeclarationRow(
          target.declarationSource,
          target.selectedMemberName,
          target.targetSource,
          target.declarationSourceAddressHandle,
          handles,
        ),
        ...bindableEvidence.metadataDeclarationRows,
      ],
      templateUsageRows,
      candidateRows: references.candidateRows,
    });
  }

  private bindablePropertyReferenceEvidence(
    propertyName: string,
    propertyTargetIdentityHandle: IdentityHandle | null,
    propertyTargetSource: SemanticSourceReference,
    handles: boolean,
  ): BindablePropertyReferenceEvidence {
    const metadataDeclarationRows: SemanticTemplateReferenceRow[] = [];
    const callbackTargetSources: SemanticSourceReference[] = [];
    for (const definition of this.emission.resources.readDefinitions()) {
      if (!('bindables' in definition)) {
        continue;
      }
      for (const bindable of definition.bindables) {
        if (bindable.name !== propertyName) {
          continue;
        }
        const metadataSourceAddressHandle = bindable.nameSourceAddressHandle
          ?? bindable.sourceAddressHandle;
        const metadataSource = semanticExactSourceReference(describeAddress(
          this.store,
          metadataSourceAddressHandle,
        ));
        const effectivePropertyTargetSource = semanticExactSourceReference(describeAddress(
          this.store,
          bindable.propertyTarget?.addressHandle ?? metadataSourceAddressHandle,
        ));
        if (!bindablePropertyTargetMatches(
          bindable.propertyTarget?.identityHandle ?? null,
          effectivePropertyTargetSource,
          propertyTargetIdentityHandle,
          propertyTargetSource,
        )) {
          continue;
        }
        if (!sourceReferencesMatchExactSpan(metadataSource, propertyTargetSource)) {
          metadataDeclarationRows.push(templateReferenceDeclarationRow(
            metadataSource,
            bindable.name,
            propertyTargetSource,
            metadataSourceAddressHandle,
            handles,
            null,
            SemanticTemplateBindableDeclarationKind.PropertyName,
            bindable.propertyTarget?.addressHandle ?? metadataSourceAddressHandle,
          ));
        }
        const callbackTargetSource = bindable.callbackSourceAddressHandle == null
          && bindable.callback === `${bindable.name}Changed`
          ? semanticExactSourceReference(describeAddress(
              this.store,
              bindable.callbackTarget?.addressHandle ?? null,
            ))
          : null;
        if (callbackTargetSource != null) {
          callbackTargetSources.push(callbackTargetSource);
        }
      }
    }
    return {
      metadataDeclarationRows: uniqueSortedTemplateReferenceRows(metadataDeclarationRows),
      callbackTargetSources: uniqueSourceReferences(callbackTargetSources),
    };
  }

  private referenceRowsForTarget(
    selectedMemberName: string,
    targetSource: SemanticSourceReference,
    observedTargetSources: readonly SemanticSourceReference[],
    targetIdentityHandle: IdentityHandle | null,
    targetSourceAddressHandle: AddressHandle | null,
    handles: boolean,
  ): ReferenceRowsForTarget {
    const observedRows = readBindingObservedDependencyRows(this.emission, this.store, handles);
    const observedUsageRows = observedRows
      .filter((row) =>
        row.source != null
        // Only member-declaration routes prove the row observes the selected member; owner-value
        // routes carry the owner's declaration and would match the wrong symbol (e.g. a
        // `shellTone.label` row whose best source is the `shellTone` declaration must not become a
        // usage of `shellTone` itself).
        && row.observedMemberSourceRoute === 'member-declaration'
        && observedTargetSources.some((source) => sourceReferencesMatchExactSpan(row.observedMemberSource, source))
      )
      .map((row) => templateReferenceRowForObservedDependency(row, selectedMemberName, targetSource, handles));
    const assignmentUsageRows = readBindingDataFlowRows(this.emission, this.store, handles)
      .filter((row) =>
        row.sourceAssignmentOccurrenceSource != null
        && row.sourceAssignmentTargetSource != null
        && observedTargetSources.some((source) =>
          sourceReferencesMatchExactSpan(row.sourceAssignmentTargetSource, source)
        )
        && !sourceReferencesMatchExactSpan(row.sourceAssignmentOccurrenceSource, targetSource)
      )
      .map((row) => templateReferenceRowForSourceAssignment(row, selectedMemberName, targetSource, handles));
    const authoredScopeUsageRows = authoredScopeReferenceRowsForTarget(
      this.store,
      [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
      selectedMemberName,
      targetSource,
      observedTargetSources,
      targetIdentityHandle,
      targetSourceAddressHandle,
      handles,
    );
    return {
      templateUsageRows: uniqueSortedTemplateReferenceRows([
        ...observedUsageRows,
        ...assignmentUsageRows,
        ...authoredScopeUsageRows,
      ]),
      candidateRows: unprovenSameNameCandidateRows(observedRows, selectedMemberName, targetSource, handles),
    };
  }

  /** Project the TypeScript-origin reference context into the template-origin context shape. */
  private templateReferenceContextFromTypeScript(
    query: SemanticAppQuery,
    handles: boolean,
  ): TemplateReferenceContext | null {
    const tsContext = this.typeScriptReferenceContext(query, handles);
    if (tsContext == null) {
      return null;
    }
    return templateReferenceContextFromRows({
      selectedMemberName: tsContext.selectedMemberName,
      targetSource: tsContext.targetSource,
      renameSurface: TemplateRenameSurface.Member,
      includeTypeScriptReferences: true,
      hasAuthoredDeclarationSource: true,
      bindableConventionCallbackTargetSources: tsContext.bindableConventionCallbackTargetSources,
      declarationRows: [
        templateReferenceDeclarationRow(
          tsContext.targetSource,
          tsContext.selectedMemberName,
          tsContext.targetSource,
          null,
          handles,
        ),
      ],
      templateUsageRows: tsContext.templateUsageRows,
      candidateRows: tsContext.candidateRows,
    });
  }

  private typeScriptReferenceContext(
    query: SemanticAppQuery,
    handles: boolean,
  ): TypeScriptReferenceContext | null {
    const cursor = query.cursor;
    if (cursor == null) {
      return null;
    }
    const sourceFile = this.emission.typeSystem.readProgramSourceFileByPath(cursor.filePath);
    if (sourceFile == null) {
      return null;
    }
    const offset = cursor.offset ?? offsetForLineAndCharacter(sourceFile, cursor.line, cursor.character);
    const activeIdentifier = identifierAtOffset(sourceFile, offset);
    if (activeIdentifier == null) {
      return null;
    }
    const targetSymbol = this.emission.typeSystem.readProgramAliasedSymbolAtLocation(activeIdentifier);
    if (targetSymbol == null) {
      return null;
    }
    const activeSource = semanticExactSourceReference(sourceReferenceForTsNode(activeIdentifier));
    const targetSources = declarationSourcesForSymbol(targetSymbol);
    const effectiveTargetSources = targetSources.length === 0 && activeSource != null
      ? [activeSource]
      : targetSources;
    const targetSource = effectiveTargetSources[0] ?? activeSource;
    if (targetSource == null) {
      return null;
    }
    const selectedMemberName = activeIdentifier.getText(sourceFile);
    const references = this.referenceRowsForTarget(
      selectedMemberName,
      targetSource,
      effectiveTargetSources,
      null,
      null,
      handles,
    );
    const bindableEvidence = this.bindablePropertyReferenceEvidence(
      selectedMemberName,
      null,
      targetSource,
      handles,
    );
    const bindableAttributeRows = bindableAttributeReferenceRows(
      this.store,
      [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
      {
        surface: TemplateRenameSurface.BindableProperty,
        propertyName: selectedMemberName,
        propertyTargetIdentityHandle: null,
        propertyTargetSource: targetSource,
        aliasName: null,
        aliasTargetSource: null,
      },
      handles,
    );
    return {
      selectedMemberName,
      targetSource,
      activeSource,
      templateUsageRows: uniqueSortedTemplateReferenceRows([
        ...bindableEvidence.metadataDeclarationRows,
        ...references.templateUsageRows,
        ...bindableAttributeRows,
      ]),
      bindableConventionCallbackTargetSources: bindableEvidence.callbackTargetSources,
      candidateRows: references.candidateRows,
    };
  }
}

const enum TemplateRenameSurface {
  Member = 'member',
  BindableProperty = 'bindable-property',
  BindableAttributeAlias = 'bindable-attribute-alias',
  ResourceElement = 'resource-element',
  ResourceAttribute = 'resource-attribute',
  ResourceExpression = 'resource-expression',
  UnsupportedResource = 'unsupported-resource',
}

interface TemplateReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly renameSurface: TemplateRenameSurface;
  readonly includeTypeScriptReferences: boolean;
  readonly hasAuthoredDeclarationSource: boolean;
  readonly bindableConventionCallbackTargetSources: readonly SemanticSourceReference[];
  readonly forceOpen: boolean;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  /** Same-name template usages with unproven provenance; never mixed into proven rows. */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
  readonly rows: readonly SemanticTemplateReferenceRow[];
}

interface TemplateReferenceTarget {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly targetIdentityHandle: IdentityHandle | null;
  readonly declarationSource: SemanticSourceReference | null;
  readonly declarationSourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'];
  readonly renameSurface: TemplateRenameSurface;
  readonly includeTypeScriptReferences?: boolean;
  readonly observedTargetSources?: readonly SemanticSourceReference[];
  readonly bindableAttributeTarget?: BindableAttributeReferenceTarget | null;
}

interface BindableAttributeReferenceTarget {
  readonly surface: TemplateRenameSurface.BindableProperty | TemplateRenameSurface.BindableAttributeAlias;
  readonly propertyName: string;
  readonly propertyTargetIdentityHandle: IdentityHandle | null;
  readonly propertyTargetSource: SemanticSourceReference | null;
  readonly aliasName: string | null;
  readonly aliasTargetSource: SemanticSourceReference | null;
}

interface BindablePropertyReferenceEvidence {
  readonly metadataDeclarationRows: readonly SemanticTemplateReferenceRow[];
  readonly callbackTargetSources: readonly SemanticSourceReference[];
}

function emptyBindablePropertyReferenceEvidence(): BindablePropertyReferenceEvidence {
  return {
    metadataDeclarationRows: [],
    callbackTargetSources: [],
  };
}

function bindablePropertyTargetMatches(
  candidateIdentityHandle: IdentityHandle | null,
  candidateSource: SemanticSourceReference | null,
  targetIdentityHandle: IdentityHandle | null,
  targetSource: SemanticSourceReference | null,
): boolean {
  return (
    candidateIdentityHandle != null
    && targetIdentityHandle != null
    && candidateIdentityHandle === targetIdentityHandle
  ) || sourceReferencesMatchExactSpan(candidateSource, targetSource);
}

function uniqueSourceReferences(
  sources: readonly SemanticSourceReference[],
): readonly SemanticSourceReference[] {
  const seen = new Set<string>();
  const unique: SemanticSourceReference[] = [];
  for (const source of sources) {
    const key = `${source.path ?? ''}:${source.start ?? ''}:${source.end ?? ''}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(source);
  }
  return unique;
}

interface ResourceReferenceTarget {
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`;
  readonly selectedName: string;
  readonly targetSource: SemanticSourceReference;
  readonly definitionProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'];
}

interface ReferenceRowsForTarget {
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}

interface TypeScriptReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly activeSource: SemanticSourceReference | null;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly bindableConventionCallbackTargetSources: readonly SemanticSourceReference[];
  /** Same-name template usages with unproven provenance; never mixed into proven rows. */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}

interface ActiveTemplateReferenceContext {
  readonly context: TemplateReferenceContext;
  readonly activeRow: SemanticTemplateReferenceRow;
  readonly activeSource: SemanticSourceReference;
}

function diagnosticContainsCursor(
  diagnostic: SemanticTemplateDiagnosticRow,
  cursor: NonNullable<SemanticAppQuery['cursor']>,
): boolean {
  return semanticSourceReferenceContainsFileOffset(diagnostic.source, cursor.filePath, cursor.offset);
}

function templateCodeActionForDiagnostic(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnostic: SemanticTemplateDiagnosticRow,
): SemanticTemplateCodeActionRow | null {
  return declareViewModelMemberCodeActionForDiagnostic(store, emission, diagnostic)
    ?? registerFrameworkCapabilityCodeActionForDiagnostic(store, emission, diagnostic);
}

function declareViewModelMemberCodeActionForDiagnostic(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnostic: SemanticTemplateDiagnosticRow,
): SemanticTemplateCodeActionRow | null {
  if (!diagnosticHasViewModelMemberDeclarationPlan(diagnostic)) {
    return null;
  }
  const suggestion = diagnostic.suggestion;

  const memberName = suggestion.targetMemberName ?? suggestion.actionTarget?.memberName ?? diagnostic.selectedMemberName;
  if (memberName == null || !isValidRenameIdentifier(memberName)) {
    return null;
  }

  const actionSource = semanticExactSourceReference(suggestion.actionTarget?.source ?? null);
  const resource = templateResourceForDiagnosticSource(store, emission, actionSource);
  if (resource == null) {
    return null;
  }
  const edit = declareViewModelMemberEdit(store, emission, resource, memberName);
  if (edit == null) {
    return null;
  }

  return {
    title: `Declare member '${memberName}' on ${resource.compilation.definition.target.localName ?? resource.compilation.definition.name}`,
    kind: 'quickfix',
    diagnostics: [diagnostic],
    repair: diagnosticRepairAffordanceForSuggestion(suggestion),
    edits: [edit],
    isPreferred: true,
  };
}

function registerFrameworkCapabilityCodeActionForDiagnostic(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnostic: SemanticTemplateDiagnosticRow,
): SemanticTemplateCodeActionRow | null {
  if (!diagnosticHasFrameworkCapabilityRegistrationPlan(diagnostic)) {
    return null;
  }
  const actionSource = semanticExactSourceReference(diagnostic.suggestion.actionTarget?.source ?? diagnostic.source);
  const resource = templateResourceForDiagnosticSource(store, emission, actionSource);
  if (resource == null) {
    return null;
  }
  const demand = frameworkCapabilityDemandForDiagnostic(store, emission, diagnostic, actionSource);
  if (
    demand == null
    || demand.admissionState !== FrameworkCapabilityAdmissionState.NotAdmitted
    || demand.availabilityState !== FrameworkCapabilityAvailabilityState.EvidenceFound
  ) {
    return null;
  }

  const admission = aureliaFrameworkRegistrationAdmissionSource({
    capability: demand.requiredCapability,
    requiredRegistrationKinds: demand.requiredRegistrationKinds,
    preferredModuleName: demand.recommendedModuleName,
  });
  if (admission == null) {
    return null;
  }
  const edits = frameworkRegistrationAdmissionEdits(store, emission, resource, admission);
  if (edits == null) {
    return null;
  }
  const registrationLabel = admission.registrationExpressions
    .map((expression) => aureliaEntrypointRegistrationExpressionText(expression).trim())
    .filter((expression) => expression.length > 0)
    .join(', ');
  const suggestion = diagnostic.suggestion;
  return {
    title: `Register ${registrationLabel} for ${demand.requiredCapability}`,
    kind: 'quickfix',
    diagnostics: [diagnostic],
    repair: diagnosticRepairAffordanceForSuggestion(suggestion),
    edits,
    isPreferred: true,
  };
}

function diagnosticHasFrameworkCapabilityRegistrationPlan(
  diagnostic: SemanticTemplateDiagnosticRow,
): diagnostic is SemanticTemplateDiagnosticRow & {
  readonly suggestion: NonNullable<SemanticTemplateDiagnosticRow['suggestion']>;
} {
  const suggestion = diagnostic.suggestion;
  return diagnostic.diagnosticKind === 'framework-capability-not-registered'
    && suggestion?.suggestionKind === 'register-framework-capability'
    && suggestion.actionKind === 'register-framework-capability'
    && suggestion.actionTarget?.targetKind === 'framework-capability';
}

function frameworkCapabilityDemandForDiagnostic(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnostic: SemanticTemplateDiagnosticRow,
  actionSource: SemanticSourceReference | null,
): FrameworkCapabilityDemand | null {
  const requiredCapability = diagnostic.suggestion?.targetMemberName ?? diagnostic.missingInput;
  if (requiredCapability == null) {
    return null;
  }
  return emission.capabilityDemands.readDemands().find((demand) => {
    const demandSource = semanticExactSourceReference(describeAddress(store, demand.sourceAddressHandle));
    return demand.requiredCapability === requiredCapability
      && sourceReferencesMatchExactSpan(demandSource, actionSource);
  }) ?? null;
}

function frameworkRegistrationAdmissionEdits(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  resource: TemplateResourceEmission,
  admission: AureliaFrameworkRegistrationAdmissionSource,
): SemanticTemplateCodeActionEdits | null {
  const appStep = appRootStepForTemplateResource(emission, resource, ConfigurationStepKind.AureliaApp);
  const appSource = semanticExactSourceReference(describeAddress(store, appStep?.sourceAddressHandle ?? null));
  if (appSource?.path == null || appSource.start == null || appSource.end == null) {
    return null;
  }
  const sourceFile = emission.typeSystem.readProgramSourceFileByPath(appSource.path);
  if (sourceFile == null) {
    return null;
  }
  const importEdits = planTypeScriptImportSourceOperations(sourceFile, admission.entrypointImports);
  const registerEdit = planAureliaRegisterChainSourceOperation(sourceFile, {
    appCallStart: appSource.start,
    appCallEnd: appSource.end,
    registrationExpressions: admission.registrationExpressions,
  });
  if (registerEdit == null) {
    return null;
  }
  return nonEmptyTemplateCodeActionEdits([
    ...importEdits,
    registerEdit,
  ].map(frameworkRegistrationAdmissionCodeActionEdit));
}

function nonEmptyTemplateCodeActionEdits(
  edits: readonly SemanticTemplateCodeActionEditRow[],
): SemanticTemplateCodeActionEdits | null {
  const first = edits[0];
  return first == null ? null : [first, ...edits.slice(1)];
}

function frameworkRegistrationAdmissionCodeActionEdit(
  edit: TypeScriptSourceOperationEdit,
): SemanticTemplateCodeActionEditRow {
  return {
    editKind: SemanticTemplateCodeActionEditKind.RegisterFrameworkCapability,
    source: {
      kind: edit.editKind,
      label: `${edit.sourceFilePath}@${edit.start}..${edit.end}`,
      path: edit.sourceFilePath,
      start: edit.start,
      end: edit.end,
    },
    oldText: edit.oldText,
    newText: edit.newText,
  };
}

function appRootStepForTemplateResource(
  emission: AureliaAppWorldProjectEmission,
  resource: TemplateResourceEmission,
  stepKind: ConfigurationStepKind,
): ConfigurationStep | null {
  const appRoot = resource.compilation.compilerWorld.world.appRoot;
  if (appRoot?.productHandle == null && appRoot?.identityHandle == null) {
    return null;
  }
  const configuration = emission.configuration.readConfiguration();
  const sequenceProductHandles = new Set<ProductHandle>();
  for (const sequence of configuration.sequences) {
    if (
      (appRoot.productHandle != null && sequence.appRoot?.productHandle === appRoot.productHandle)
      || (appRoot.identityHandle != null && sequence.appRoot?.identityHandle === appRoot.identityHandle)
    ) {
      sequenceProductHandles.add(sequence.productHandle);
    }
  }
  return configuration.steps.find((step) =>
    step.stepKind === stepKind
    && step.sequence?.productHandle != null
    && sequenceProductHandles.has(step.sequence.productHandle)
  ) ?? null;
}

function diagnosticHasViewModelMemberDeclarationPlan(
  diagnostic: SemanticTemplateDiagnosticRow,
): diagnostic is SemanticTemplateDiagnosticRow & {
  readonly suggestion: NonNullable<SemanticTemplateDiagnosticRow['suggestion']>;
} {
  const suggestion = diagnostic.suggestion;
  if (
    diagnostic.diagnosticKind !== 'missing-expression-member'
    || suggestion?.suggestionKind !== 'declare-explicit-member'
    || suggestion.actionKind !== 'declare-member'
    || suggestion.actionTarget?.targetKind !== 'expression'
    || diagnostic.ownerTypeDisplay != null
    || diagnostic.ownerTypeShapeKind != null
    || diagnostic.ownerTypeOrigin != null
  ) {
    return false;
  }

  const diagnosticSource = semanticExactSourceReference(diagnostic.source);
  const actionSource = semanticExactSourceReference(suggestion.actionTarget.source);
  return sourceReferencesMatchExactSpan(diagnosticSource, actionSource)
    && suggestion.actionTarget.memberName === (suggestion.targetMemberName ?? diagnostic.selectedMemberName);
}

function templateResourceForDiagnosticSource(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnosticSource: SemanticSourceReference | null,
): TemplateResourceEmission | null {
  const source = semanticExactSourceReference(diagnosticSource);
  if (source?.path == null || source.start == null || source.end == null) {
    return null;
  }
  for (const resource of [...emission.templates.resources, ...emission.templates.authoringResources]) {
    const templateSource = semanticExactSourceReference(
      describeAddress(
        store,
        resource.compilation.definition.template?.addressHandle ?? resource.compilation.definition.sourceAddressHandle,
      ),
    );
    if (
      templateSource?.path != null
      && templateSource.start != null
      && templateSource.end != null
      && semanticSourceReferenceMatchesFilePath(templateSource, source.path)
      && semanticSourceReferenceMatchesFilePath(source, templateSource.path)
      && source.start >= templateSource.start
      && source.end <= templateSource.end
    ) {
      return resource;
    }
  }
  return null;
}

function declareViewModelMemberEdit(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  resource: TemplateResourceEmission,
  memberName: string,
): SemanticTemplateCodeActionEditRow | null {
  const definition = resource.compilation.definition;
  const className = definition.target.localName;
  if (className == null) {
    return null;
  }
  const definitionSource = semanticExactSourceReference(describeAddress(store, definition.sourceAddressHandle));
  if (definitionSource?.path == null) {
    return null;
  }
  const sourceFile = emission.typeSystem.readProgramSourceFileByPath(definitionSource.path);
  if (sourceFile == null) {
    return null;
  }
  const classDecl = findClassDeclaration(sourceFile, className);
  if (classDecl == null) {
    return null;
  }

  const insertion = classMemberInsertion(sourceFile, classDecl);
  const newText = buildBlockInsertion(
    sourceFile.text,
    insertion.offset,
    `${insertion.indent}${memberName}!: unknown;`,
  );
  return {
    editKind: SemanticTemplateCodeActionEditKind.DeclareViewModelMember,
    source: {
      kind: 'typescript-node',
      label: `${sourceFile.fileName}@${insertion.offset}..${insertion.offset}`,
      path: sourceFile.fileName,
      start: insertion.offset,
      end: insertion.offset,
    },
    oldText: '',
    newText,
  };
}

function findClassDeclaration(
  sourceFile: ts.SourceFile,
  className: string,
): ts.ClassDeclaration | null {
  let found: ts.ClassDeclaration | null = null;
  visit(sourceFile, (node) => {
    if (found != null || !ts.isClassDeclaration(node)) {
      return;
    }
    if (node.name?.text === className) {
      found = node;
    }
  });
  return found;
}

function classMemberInsertion(
  sourceFile: ts.SourceFile,
  classDecl: ts.ClassDeclaration,
): { readonly offset: number; readonly indent: string } {
  const members = [...classDecl.members];
  if (members.length > 0) {
    const last = members[members.length - 1]!;
    return {
      offset: last.getEnd(),
      indent: lineIndentAt(sourceFile.text, last.getStart(sourceFile)),
    };
  }
  return {
    offset: classDecl.members.pos,
    indent: `${lineIndentAt(sourceFile.text, classDecl.getStart(sourceFile))}${detectIndentUnit(sourceFile.text)}`,
  };
}

function buildBlockInsertion(
  text: string,
  offset: number,
  block: string,
): string {
  const newline = detectNewline(text);
  const before = offset > 0 ? text[offset - 1] : '';
  const after = offset < text.length ? text[offset] : '';
  const needsLeading = offset > 0 && before !== '\n' && before !== '\r';
  const needsTrailing = offset < text.length && after !== '\n' && after !== '\r';
  return `${needsLeading ? newline : ''}${block}${needsTrailing ? newline : ''}`;
}

function detectNewline(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function detectIndentUnit(text: string): string {
  const match = /(?:^|\r?\n)([ \t]+)\S/u.exec(text);
  return match?.[1]?.includes('\t') ? '\t' : '  ';
}

function lineIndentAt(text: string, offset: number): string {
  const start = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const match = /^[ \t]*/u.exec(text.slice(start, offset));
  return match?.[0] ?? '';
}

function uniqueTemplateCodeActionRows(
  rows: readonly SemanticTemplateCodeActionRow[],
): readonly SemanticTemplateCodeActionRow[] {
  const indexes = new Map<string, number>();
  const unique: SemanticTemplateCodeActionRow[] = [];
  for (const row of rows) {
    const key = templateCodeActionPlanKey(row);
    const existingIndex = indexes.get(key);
    if (existingIndex != null) {
      const existing = unique[existingIndex]!;
      unique[existingIndex] = {
        ...existing,
        diagnostics: uniqueTemplateCodeActionDiagnostics([
          ...existing.diagnostics,
          ...row.diagnostics,
        ]),
        isPreferred: existing.isPreferred && row.isPreferred,
      };
      continue;
    }
    indexes.set(key, unique.length);
    unique.push(row);
  }
  return unique;
}

function templateCodeActionPlanKey(
  row: SemanticTemplateCodeActionRow,
): string {
  return JSON.stringify([
    row.title,
    row.kind,
    row.repair.actionKind,
    row.repair.planKind,
    row.repair.changeDomain,
    row.repair.readiness,
    row.repair.targetSourceCoverage,
    row.edits.map((edit) => ({
      editKind: edit.editKind,
      path: edit.source?.path ?? null,
      start: edit.source?.start ?? null,
      end: edit.source?.end ?? null,
      oldText: edit.oldText,
      newText: edit.newText,
    })),
  ]);
}

function uniqueTemplateCodeActionDiagnostics(
  diagnostics: readonly SemanticTemplateDiagnosticRow[],
): [SemanticTemplateDiagnosticRow, ...SemanticTemplateDiagnosticRow[]] {
  const seen = new Set<string>();
  const unique: SemanticTemplateDiagnosticRow[] = [];
  for (const diagnostic of diagnostics) {
    const key = templateCodeActionDiagnosticKey(diagnostic);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(diagnostic);
  }
  return [unique[0]!, ...unique.slice(1)];
}

function templateCodeActionDiagnosticKey(
  diagnostic: SemanticTemplateDiagnosticRow,
): string {
  const productHandle = diagnostic.handles?.semanticProductHandle;
  if (productHandle != null) {
    return `product:${productHandle}`;
  }
  return JSON.stringify([
    diagnostic.diagnosticAuthority,
    diagnostic.diagnosticKind,
    diagnostic.frameworkErrorCode,
    diagnostic.source?.path ?? null,
    diagnostic.source?.start ?? null,
    diagnostic.source?.end ?? null,
    diagnostic.subject?.subjectKind ?? null,
    diagnostic.subject?.subjectName ?? null,
    diagnostic.suggestion?.suggestionKind ?? null,
    diagnostic.suggestion?.actionKind ?? null,
  ]);
}

function templateRenameUnavailable(
  reason: SemanticTemplateRenameUnavailableReason,
  summary: string,
  selectedMemberName: string | null,
  targetSource: SemanticSourceReference | null,
  activeSource: SemanticSourceReference | null,
  status: SemanticTemplateRenameStatus = SemanticTemplateRenameStatus.NotAvailable,
): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
  return answer(
    SemanticRuntimeAnswerOutcome.Miss,
    summary,
    {
      displayText: summary,
      status,
      reason,
      selectedMemberName,
      placeholder: selectedMemberName,
      targetSource,
      activeSource,
      edits: [],
      candidateRows: [],
      templateReferenceCount: 0,
      typeScriptReferenceCount: 0,
    },
  );
}

function activeTemplateReferenceContext(
  contexts: readonly TemplateReferenceContext[],
  cursor: SemanticAppQuery['cursor'],
): ActiveTemplateReferenceContext | null {
  for (const context of contexts) {
    const activeRow = activeRenameRow(context.rows, cursor);
    const activeSource = semanticExactSourceReference(activeRow?.source ?? null);
    if (activeRow != null && activeSource != null) {
      return { context, activeRow, activeSource };
    }
  }
  return null;
}

function activeRenameRow(
  rows: readonly SemanticTemplateReferenceRow[],
  cursor: SemanticAppQuery['cursor'],
): SemanticTemplateReferenceRow | null {
  for (const row of rows) {
    if (!referenceRowSupportsRename(row)) {
      continue;
    }
    const source = semanticExactSourceReference(row.source);
    if (source != null && semanticSourceReferenceContainsFileOffset(source, cursor?.filePath, cursor?.offset)) {
      return row;
    }
  }
  return null;
}

function referenceRowSupportsRename(row: SemanticTemplateReferenceRow): boolean {
  return row.referenceKind === SemanticTemplateReferenceKind.Declaration
    || row.referenceKind === SemanticTemplateReferenceKind.TemplateUsage
    || row.referenceKind === SemanticTemplateReferenceKind.ResourceUsage
    || row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute;
}

function referenceRowNeedsTemplateRenameEdit(
  row: SemanticTemplateReferenceRow,
  surface: TemplateRenameSurface,
  selectedMemberName: string,
): boolean {
  if (
    row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
    && isBindablePropertyRenameSurface(surface)
    && row.bindableAttributeSourceKind === SemanticTemplateBindableAttributeSourceKind.ExplicitAlias
  ) {
    return false;
  }
  if (
    row.referenceKind === SemanticTemplateReferenceKind.ResourceUsage
    && isResourceRenameSurface(surface)
    && row.name.toLowerCase() !== selectedMemberName.toLowerCase()
  ) {
    return false;
  }
  return referenceRowSupportsRename(row)
    && (
      row.referenceKind !== SemanticTemplateReferenceKind.Declaration
      || surface === TemplateRenameSurface.ResourceElement
      || surface === TemplateRenameSurface.ResourceAttribute
      || surface === TemplateRenameSurface.ResourceExpression
      || surface === TemplateRenameSurface.BindableAttributeAlias
      || row.bindableDeclarationKind === SemanticTemplateBindableDeclarationKind.PropertyName
      || !sourceReferenceLooksTypeScript(row.targetSource)
    );
}

function isValidRenameName(value: string, surface: TemplateRenameSurface): boolean {
  if (surface === TemplateRenameSurface.ResourceExpression) {
    return isAureliaExpressionIdentifier(value);
  }
  if (isTemplateAddressableResourceRenameSurface(surface) || surface === TemplateRenameSurface.BindableAttributeAlias) {
    return isValidTemplateAddressableResourceName(value);
  }
  return isValidRenameIdentifier(value);
}

function invalidRenameNameMessage(value: string, surface: TemplateRenameSurface): string {
  if (surface === TemplateRenameSurface.BindableAttributeAlias) {
    return `Rename target '${value}' is not a valid Aurelia bindable attribute alias. Use lowercase letters, digits, '_' or '-' because Aurelia resolves template attribute names from lowercased HTML.`;
  }
  if (surface === TemplateRenameSurface.ResourceExpression) {
    return `Rename target '${value}' is not a valid Aurelia expression resource identifier.`;
  }
  return isTemplateAddressableResourceRenameSurface(surface)
    ? `Rename target '${value}' is not a valid Aurelia template resource name. Use lowercase letters, digits, '_' or '-' because Aurelia resolves template element and attribute names from lowercased HTML.`
    : `Rename target '${value}' is not a valid TypeScript identifier.`;
}

function isBindablePropertyRenameSurface(surface: TemplateRenameSurface): boolean {
  return surface === TemplateRenameSurface.Member
    || surface === TemplateRenameSurface.BindableProperty;
}

function isResourceRenameSurface(surface: TemplateRenameSurface): boolean {
  return isTemplateAddressableResourceRenameSurface(surface)
    || surface === TemplateRenameSurface.ResourceExpression;
}

function isTemplateAddressableResourceRenameSurface(surface: TemplateRenameSurface): boolean {
  return surface === TemplateRenameSurface.ResourceElement
    || surface === TemplateRenameSurface.ResourceAttribute;
}

function isValidTemplateAddressableResourceName(value: string): boolean {
  return /^[a-z][0-9a-z_-]*$/u.test(value);
}

function isValidRenameIdentifier(value: string): boolean {
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/u.test(value) && !TYPESCRIPT_RESERVED_IDENTIFIER_WORDS.has(value);
}

const TYPESCRIPT_RESERVED_IDENTIFIER_WORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'as',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
]);

/** One TypeScript identifier occurrence of a selected symbol, shared by references and rename. */
interface TypeScriptReferenceSite {
  readonly source: SemanticSourceReference;
  readonly text: string;
}

/**
 * Enumerate every TypeScript identifier occurrence of the symbol declared at `targetSource`,
 * including the declaration itself. Rename maps these to edits and references maps them to
 * locations, so both lanes see the same occurrence set by construction.
 */
function typeScriptReferenceSites(
  emission: AureliaAppWorldProjectEmission,
  targetSource: SemanticSourceReference,
): readonly TypeScriptReferenceSite[] | null {
  if (targetSource.path == null || targetSource.start == null || targetSource.end == null) {
    return null;
  }
  const sourceFile = emission.typeSystem.readProgramSourceFileByPath(targetSource.path);
  if (sourceFile == null) {
    return null;
  }
  const targetIdentifier = identifierAtExactSpan(sourceFile, targetSource.start, targetSource.end);
  if (targetIdentifier == null) {
    return null;
  }
  const targetSymbol = emission.typeSystem.readProgramAliasedSymbolAtLocation(targetIdentifier);
  if (targetSymbol == null) {
    return null;
  }

  const sites: TypeScriptReferenceSite[] = [];
  for (const projectSourceFile of emission.typeSystem.readProjectProgramSourceFiles()) {
    visit(projectSourceFile, (node) => {
      if (!ts.isIdentifier(node)) {
        return;
      }
      const symbol = emission.typeSystem.readProgramAliasedSymbolAtLocation(node);
      if (!sameTsSymbol(symbol, targetSymbol)) {
        return;
      }
      sites.push({
        source: sourceReferenceForTsNode(node),
        text: node.getText(projectSourceFile),
      });
    });
  }
  return sites.length === 0 ? null : sites;
}

function typeScriptReferenceRenameEdits(
  emission: AureliaAppWorldProjectEmission,
  targetSource: SemanticSourceReference,
  newName: string,
): readonly SemanticTemplateRenameEditRow[] | null {
  const sites = typeScriptReferenceSites(emission, targetSource);
  if (sites == null) {
    return null;
  }
  return uniqueTemplateRenameEditRows(sites.map((site) => templateRenameEditRow(
    SemanticTemplateRenameEditKind.TypeScriptReference,
    site.source,
    site.text,
    newName,
  )));
}

function bindableConventionCallbackRenameEdits(
  emission: AureliaAppWorldProjectEmission,
  context: TemplateReferenceContext,
  newName: string,
): readonly SemanticTemplateRenameEditRow[] {
  if (!isBindablePropertyRenameSurface(context.renameSurface)) {
    return [];
  }
  return uniqueTemplateRenameEditRows(
    context.bindableConventionCallbackTargetSources.flatMap((targetSource) =>
      typeScriptReferenceRenameEdits(emission, targetSource, `${newName}Changed`) ?? []
    ),
  );
}

/** Non-declaration TypeScript usages of the selected symbol as reference rows. */
function typeScriptUsageReferenceRows(
  emission: AureliaAppWorldProjectEmission,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
): readonly SemanticTemplateReferenceRow[] {
  const sites = typeScriptReferenceSites(emission, targetSource) ?? [];
  return sites
    .filter((site) => !sourceReferencesMatchExactSpan(site.source, targetSource))
    .map((site) => ({
      referenceKind: SemanticTemplateReferenceKind.TypeScriptUsage,
      name: site.text.length > 0 ? site.text : selectedMemberName,
      definitionName: null,
      bindingKind: null,
      dependencyKind: null,
      source: semanticExactSourceReference(site.source),
      targetSource,
    }));
}

function templateRenameSurfaceForResourceKind(
  resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`,
): TemplateRenameSurface {
  switch (resourceKind) {
    case ResourceDefinitionKind.CustomElement:
      return TemplateRenameSurface.ResourceElement;
    case ResourceDefinitionKind.CustomAttribute:
    case ResourceDefinitionKind.TemplateController:
      return TemplateRenameSurface.ResourceAttribute;
    case ResourceDefinitionKind.ValueConverter:
    case ResourceDefinitionKind.BindingBehavior:
      return TemplateRenameSurface.ResourceExpression;
    default:
      return TemplateRenameSurface.UnsupportedResource;
  }
}

function declarationSourcesForSymbol(
  symbol: ts.Symbol,
): readonly SemanticSourceReference[] {
  return (symbol.declarations ?? [])
    .map((declaration) => declarationNameNode(declaration) ?? declaration)
    .map((node) => semanticExactSourceReference(sourceReferenceForTsNode(node)))
    .filter((source): source is SemanticSourceReference => source != null);
}

function declarationNameNode(declaration: ts.Declaration): ts.Node | null {
  const named = declaration as ts.Declaration & { readonly name?: ts.Node };
  return named.name ?? null;
}

function offsetForLineAndCharacter(
  sourceFile: ts.SourceFile,
  line: number,
  character: number,
): number {
  return sourceFile.getPositionOfLineAndCharacter(line, character);
}

function identifierAtOffset(
  sourceFile: ts.SourceFile,
  offset: number,
): ts.Identifier | null {
  let best: ts.Identifier | null = null;
  visit(sourceFile, (node) => {
    if (!ts.isIdentifier(node)) {
      return;
    }
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    if (offset < start || offset > end) {
      return;
    }
    if (best == null || (end - start) <= (best.getEnd() - best.getStart(sourceFile))) {
      best = node;
    }
  });
  return best;
}

function identifierAtExactSpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Identifier | null {
  let found: ts.Identifier | null = null;
  visit(sourceFile, (node) => {
    if (found != null || !ts.isIdentifier(node)) {
      return;
    }
    if (node.getStart(sourceFile) === start && node.getEnd() === end) {
      found = node;
    }
  });
  return found;
}

function visit(
  node: ts.Node,
  callback: (node: ts.Node) => void,
): void {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function sameTsSymbol(
  left: ts.Symbol | null,
  right: ts.Symbol,
): boolean {
  if (left == null) {
    return false;
  }
  if (left === right) {
    return true;
  }
  const rightDeclarations = right.declarations ?? [];
  return (left.declarations ?? []).some((leftDeclaration) =>
    rightDeclarations.some((rightDeclaration) =>
      leftDeclaration.getSourceFile().fileName === rightDeclaration.getSourceFile().fileName
      && leftDeclaration.getStart(leftDeclaration.getSourceFile()) === rightDeclaration.getStart(rightDeclaration.getSourceFile())
      && leftDeclaration.getEnd() === rightDeclaration.getEnd()
    )
  );
}

function templateRenameEditRow(
  editKind: SemanticTemplateRenameEditKind,
  source: SemanticSourceReference | null,
  oldText: string | null,
  newText: string,
): SemanticTemplateRenameEditRow {
  return {
    editKind,
    source: semanticExactSourceReference(source),
    oldText,
    newText,
  };
}

function templateRenameNewText(
  row: SemanticTemplateReferenceRow,
  surface: TemplateRenameSurface,
  editKind: SemanticTemplateRenameEditKind,
  oldText: string,
  newName: string,
): string {
  if (
    editKind === SemanticTemplateRenameEditKind.TemplateLocalDeclaration
    && oldText !== row.name
    && oldText === bindableAttributeNameForProperty(row.name)
  ) {
    return bindableAttributeNameForProperty(newName);
  }
  return row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
    && isBindablePropertyRenameSurface(surface)
    ? bindableAttributeNameForProperty(newName)
    : newName;
}

function referenceRowNeedsTypeScriptRenamePropagationEdit(
  row: SemanticTemplateReferenceRow,
): boolean {
  return referenceRowSupportsRename(row)
    && !(
      row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
      && row.bindableAttributeSourceKind === SemanticTemplateBindableAttributeSourceKind.ExplicitAlias
    );
}

function templateRenameFromTypeScriptEditKindForReferenceRow(
  row: SemanticTemplateReferenceRow,
): SemanticTemplateRenameEditKind {
  if (row.bindableDeclarationKind === SemanticTemplateBindableDeclarationKind.PropertyName) {
    return SemanticTemplateRenameEditKind.BindablePropertyDeclaration;
  }
  return row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
    ? SemanticTemplateRenameEditKind.BindableAttribute
    : SemanticTemplateRenameEditKind.TemplateUsage;
}

function templateRenameFromTypeScriptNewText(
  row: SemanticTemplateReferenceRow,
  newName: string,
): string {
  return row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
    ? bindableAttributeNameForProperty(newName)
    : newName;
}

function templateRenameEditKindForReferenceRow(
  row: SemanticTemplateReferenceRow,
  surface: TemplateRenameSurface,
): SemanticTemplateRenameEditKind {
  if (row.referenceKind === SemanticTemplateReferenceKind.ResourceUsage) {
    switch (row.resourceUsageKind) {
      case SemanticTemplateResourceUsageKind.AttributeTarget:
        return SemanticTemplateRenameEditKind.ResourceAttributeTarget;
      case SemanticTemplateResourceUsageKind.AsElementValue:
        return SemanticTemplateRenameEditKind.ResourceAsElementValue;
      case SemanticTemplateResourceUsageKind.ExpressionName:
        return SemanticTemplateRenameEditKind.ResourceExpressionName;
      case SemanticTemplateResourceUsageKind.RefTarget:
        return SemanticTemplateRenameEditKind.ResourceRefTarget;
      case SemanticTemplateResourceUsageKind.ElementTag:
      case null:
      case undefined:
        return SemanticTemplateRenameEditKind.ResourceElementTag;
    }
  }
  if (
    row.referenceKind === SemanticTemplateReferenceKind.Declaration
    && (
      surface === TemplateRenameSurface.ResourceElement
      || surface === TemplateRenameSurface.ResourceAttribute
      || surface === TemplateRenameSurface.ResourceExpression
      || surface === TemplateRenameSurface.BindableAttributeAlias
    )
  ) {
    if (surface === TemplateRenameSurface.BindableAttributeAlias) {
      return SemanticTemplateRenameEditKind.BindableAttributeAliasDeclaration;
    }
    return row.resourceDeclarationKind === SemanticTemplateResourceDeclarationKind.AliasName
      ? SemanticTemplateRenameEditKind.ResourceAliasDeclaration
      : SemanticTemplateRenameEditKind.ResourceNameDeclaration;
  }
  if (row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute) {
    return SemanticTemplateRenameEditKind.BindableAttribute;
  }
  if (row.bindableDeclarationKind === SemanticTemplateBindableDeclarationKind.PropertyName) {
    return SemanticTemplateRenameEditKind.BindablePropertyDeclaration;
  }
  if (!sourceReferenceLooksTypeScript(row.targetSource)) {
    return row.referenceKind === SemanticTemplateReferenceKind.Declaration
      ? SemanticTemplateRenameEditKind.TemplateLocalDeclaration
      : SemanticTemplateRenameEditKind.TemplateLocalUsage;
  }
  return SemanticTemplateRenameEditKind.TemplateUsage;
}

function uniqueTemplateRenameEditRows(
  rows: readonly SemanticTemplateRenameEditRow[],
): readonly SemanticTemplateRenameEditRow[] {
  const seen = new Set<string>();
  const unique: SemanticTemplateRenameEditRow[] = [];
  for (const row of rows) {
    const key = [
      row.source?.path ?? '',
      row.source?.start ?? '',
      row.source?.end ?? '',
      row.newText,
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function templateReferenceContextFromRows(input: {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly renameSurface: TemplateRenameSurface;
  readonly includeTypeScriptReferences: boolean;
  readonly hasAuthoredDeclarationSource: boolean;
  readonly bindableConventionCallbackTargetSources?: readonly SemanticSourceReference[];
  readonly forceOpen?: boolean;
  readonly declarationRows: readonly SemanticTemplateReferenceRow[];
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}): TemplateReferenceContext {
  return {
    selectedMemberName: input.selectedMemberName,
    targetSource: input.targetSource,
    renameSurface: input.renameSurface,
    includeTypeScriptReferences: input.includeTypeScriptReferences,
    hasAuthoredDeclarationSource: input.hasAuthoredDeclarationSource,
    bindableConventionCallbackTargetSources: input.bindableConventionCallbackTargetSources ?? [],
    forceOpen: input.forceOpen ?? false,
    templateUsageRows: input.templateUsageRows,
    candidateRows: input.candidateRows,
    rows: uniqueSortedTemplateReferenceRows([...input.declarationRows, ...input.templateUsageRows]),
  };
}

function templateReferenceDeclarationRow(
  source: SemanticSourceReference | null,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'],
  handles: boolean,
  resourceDeclarationKind: SemanticTemplateResourceDeclarationKind | null = null,
  bindableDeclarationKind: SemanticTemplateBindableDeclarationKind | null = null,
  targetSourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['targetSourceAddressHandle'] = sourceAddressHandle,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.Declaration,
    name: selectedMemberName,
    definitionName: null,
    bindingKind: null,
    dependencyKind: null,
    resourceDeclarationKind,
    bindableDeclarationKind,
    source: semanticExactSourceReference(source),
    targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle: null,
        bindingProductHandle: null,
        sourceAddressHandle,
        targetSourceAddressHandle,
      },
    } : {}),
  };
}

function bindableAttributeReferenceRows(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  target: BindableAttributeReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  const rows: SemanticTemplateReferenceRow[] = [];
  for (const resource of resources) {
    const syntaxByProduct = new Map(resource.compilation.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    const attributeByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    for (const classification of resource.compilation.attributeClassification.classifications) {
      const bindable = classification.bindable?.reference ?? null;
      if (bindable == null || !bindableReferenceMatchesTarget(store, bindable, target)) {
        continue;
      }
      const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const token = syntax == null
        ? null
        : bindableAttributeTokenSource(store, syntax, bindable.attribute);
      const row = token == null
        ? null
        : bindableAttributeReferenceRow(resource, bindable, target, token, handles);
      if (row != null) {
        rows.push(row);
      }
    }
    for (const segment of resource.compilation.bindingCommandLowering.multiBindingSegments) {
      const bindable = segment.bindable?.reference ?? null;
      if (bindable == null || !bindableReferenceMatchesTarget(store, bindable, target)) {
        continue;
      }
      const token = multiBindingSegmentTargetTokenSource(store, segment, bindable.attribute);
      const row = token == null
        ? null
        : bindableAttributeReferenceRow(resource, bindable, target, token, handles);
      if (row != null) {
        rows.push(row);
      }
    }
  }
  return [...uniqueTemplateReferenceRows(rows)]
    .sort((left, right) =>
      (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
      || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    );
}

function bindableReferenceMatchesTarget(
  store: KernelStore,
  bindable: BindableDefinitionReference,
  target: BindableAttributeReferenceTarget,
): boolean {
  if (target.surface === TemplateRenameSurface.BindableAttributeAlias) {
    const aliasSource = semanticExactSourceReference(describeAddress(store, bindable.attributeSourceAddressHandle));
    return target.aliasName != null
      && bindable.attribute.toLowerCase() === target.aliasName.toLowerCase()
      && sourceReferencesMatchExactSpan(aliasSource, target.aliasTargetSource);
  }

  const propertySource = semanticExactSourceReference(describeAddress(
    store,
    bindable.propertyTarget?.addressHandle
      ?? bindable.nameSourceAddressHandle
      ?? bindable.sourceAddressHandle,
  ));
  return bindable.name === target.propertyName
    && bindablePropertyTargetMatches(
      bindable.propertyTarget?.identityHandle ?? null,
      propertySource,
      target.propertyTargetIdentityHandle,
      target.propertyTargetSource,
    );
}

function bindableAttributeReferenceRow(
  resource: TemplateResourceEmission,
  bindable: BindableDefinitionReference,
  target: BindableAttributeReferenceTarget,
  token: { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: AddressHandle | null },
  handles: boolean,
): SemanticTemplateReferenceRow | null {
  const targetSource = target.surface === TemplateRenameSurface.BindableAttributeAlias
    ? target.aliasTargetSource
    : target.propertyTargetSource;
  const targetSourceAddressHandle = target.surface === TemplateRenameSurface.BindableAttributeAlias
    ? bindable.attributeSourceAddressHandle
    : bindable.propertyTarget?.addressHandle
      ?? bindable.nameSourceAddressHandle
      ?? bindable.sourceAddressHandle;
  if (targetSource == null) {
    return null;
  }
  return {
    referenceKind: SemanticTemplateReferenceKind.BindableAttribute,
    name: token.text,
    definitionName: resource.compilation.definition.name,
    bindingKind: null,
    dependencyKind: null,
    bindableAttributeSourceKind: bindableAttributeSourceKind(bindable),
    source: token.source,
    targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle: null,
        bindingProductHandle: null,
        sourceAddressHandle: token.sourceAddressHandle,
        targetSourceAddressHandle,
      },
    } : {}),
  };
}

function bindableAttributeSourceKind(
  bindable: BindableDefinitionReference,
): SemanticTemplateBindableAttributeSourceKind {
  if (bindable.isImplicitDefault) {
    return SemanticTemplateBindableAttributeSourceKind.ImplicitDefault;
  }
  return bindable.attributeSourceAddressHandle == null
    ? SemanticTemplateBindableAttributeSourceKind.DefaultDerived
    : SemanticTemplateBindableAttributeSourceKind.ExplicitAlias;
}

function resourceReferenceRows(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  return uniqueSortedTemplateReferenceRows(resources.flatMap((resource) => [
    ...customElementResourceReferenceRows(store, resource, target, handles),
    ...attributeResourceReferenceRows(store, resource, target, handles),
    ...expressionResourceReferenceRows(store, resource, target, handles),
    ...bindingCommandResourceReferenceRows(store, resource, target, handles),
    ...attributePatternResourceReferenceRows(store, resource, target, handles),
    ...refTargetResourceReferenceRows(store, resource, target, handles),
  ]));
}

function customElementResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  if (target.resourceKind !== ResourceDefinitionKind.CustomElement) {
    return [];
  }
  if (target.definitionProductHandle == null) {
    return [];
  }
  const elementsByProduct = new Map(resource.compilation.html.nodes.flatMap((node) =>
    node instanceof HtmlElement ? [[node.productHandle, node] as const] : []
  ));
  const ownersByElement = htmlElementAttributeOwnersByElementProduct(
    resource.compilation.html.nodes,
    resource.compilation.html.attributes,
  );
  return resource.compilation.compiledTemplate.instructions.flatMap((instruction): readonly SemanticTemplateReferenceRow[] => {
    if (
      !(instruction instanceof HydrateElementInstruction)
      || instruction.definitionProductHandle !== target.definitionProductHandle
    ) {
      return [];
    }
    const element = instruction.node.productHandle == null
      ? null
      : elementsByProduct.get(instruction.node.productHandle) ?? null;
    if (element == null) {
      return [];
    }
    const asElement = ownersByElement.get(element.productHandle)?.attributes.find((attribute) =>
      attribute.rawName.toLowerCase() === TemplateSpecialAttributeName.AsElement
      && attribute.rawValue.length > 0
    ) ?? null;
    if (asElement != null) {
      return [resourceUsageReferenceRow(
        resource,
        target,
        asElement.rawValue,
        describeAddress(store, asElement.valueAddressHandle),
        asElement.valueAddressHandle,
        handles,
        SemanticTemplateResourceUsageKind.AsElementValue,
      )];
    }
    return elementTagNameSources(store, resource, element).map((source) =>
      resourceUsageReferenceRow(
        resource,
        target,
        element.tagName,
        source,
        element.sourceAddressHandle,
        handles,
        SemanticTemplateResourceUsageKind.ElementTag,
      )
    );
  });
}

function attributeResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  if (
    target.resourceKind !== ResourceDefinitionKind.CustomAttribute
    && target.resourceKind !== ResourceDefinitionKind.TemplateController
  ) {
    return [];
  }
  const syntaxByProduct = new Map(resource.compilation.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
  const attributeByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const staticRows = resource.compilation.attributeClassification.classifications.flatMap((classification): readonly SemanticTemplateReferenceRow[] => {
    if (
      classification.resource == null
      || classification.resourceKind == null
      || !resourceKindsShareRegistrationIdentity(classification.resourceKind, target.resourceKind)
      || !visibleResourceMatchesTarget(store, classification.resource, target)
    ) {
      return [];
    }
    const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
    const token = syntax == null
      ? null
      : attributeSyntaxTargetTokenSource(store, syntax);
    return token == null
      ? []
      : [resourceUsageReferenceRow(
          resource,
          target,
          token.text,
          token.source,
          token.sourceAddressHandle,
          handles,
          SemanticTemplateResourceUsageKind.AttributeTarget,
        )];
  });
  const dynamicRows = resourceLocalDynamicTemplateInstructions(store, resource).flatMap((instruction): readonly SemanticTemplateReferenceRow[] => {
    if (
      !(instruction instanceof HydrateAttributeInstruction)
      || instruction.definitionProductHandle == null
      || target.definitionProductHandle == null
      || instruction.definitionProductHandle !== target.definitionProductHandle
    ) {
      return [];
    }
    const syntax = capturedAttributeSyntaxForDynamicInstruction(store, instruction);
    const token = syntax == null ? null : attributeSyntaxTargetTokenSource(store, syntax);
    return token == null
      ? []
      : [resourceUsageReferenceRow(
          resource,
          target,
          token.text,
          token.source,
          token.sourceAddressHandle,
          handles,
          SemanticTemplateResourceUsageKind.AttributeTarget,
        )];
  });
  return [...staticRows, ...dynamicRows];
}

function resourceUsageReferenceRow(
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  name: string,
  source: SemanticSourceReference | null,
  sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'],
  handles: boolean,
  resourceUsageKind: SemanticTemplateResourceUsageKind,
  bindingProductHandle: ProductHandle | null = null,
  expressionProductHandle: ProductHandle | null = null,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.ResourceUsage,
    name,
    definitionName: resource.compilation.definition.name,
    bindingKind: null,
    dependencyKind: null,
    resourceUsageKind,
    source,
    targetSource: target.targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle,
        bindingProductHandle,
        sourceAddressHandle,
        targetSourceAddressHandle: target.sourceAddressHandle,
      },
    } : {}),
  };
}

function expressionResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  if (
    target.resourceKind !== ResourceDefinitionKind.ValueConverter
    && target.resourceKind !== ResourceDefinitionKind.BindingBehavior
  ) {
    return [];
  }
  return resourceLocalTemplateExpressionParses(store, resource).flatMap((parse) => {
    const expression = runtimeAcceptedBindingExpressionAstForParse(parse);
    const source = describeAddress(store, parse.sourceAddressHandle);
    const sourcePath = source?.path;
    if (expression == null || sourcePath == null) {
      return [];
    }
    return expressionResourceOccurrences(expression).flatMap((occurrence) => {
      if (occurrence.resourceKind !== target.resourceKind) {
        return [];
      }
      const visible = findVisibleTemplateResource(
        resource.compilation.compilerWorld.resourceScope,
        occurrence.resourceKind,
        occurrence.expression.name.name,
      );
      if (visible == null || !visibleResourceMatchesTarget(store, visible, target)) {
        return [];
      }
      return [resourceUsageReferenceRow(
        resource,
        target,
        occurrence.expression.name.name,
        sourceReferenceForParserSpan(sourcePath, occurrence.expression.name.span, 'name'),
        null,
        handles,
        SemanticTemplateResourceUsageKind.ExpressionName,
        null,
        parse.productHandle,
      )];
    });
  });
}

function bindingCommandResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  if (target.resourceKind !== ResourceDefinitionKind.BindingCommand) {
    return [];
  }
  return resource.compilation.authoredAttributeSyntaxes.flatMap((syntax): readonly SemanticTemplateReferenceRow[] => {
    if (syntax.command == null) {
      return [];
    }
    const command = findVisibleTemplateResource(
      resource.compilation.compilerWorld.resourceScope,
      ResourceDefinitionKind.BindingCommand,
      syntax.command.toLowerCase(),
    );
    if (command == null || !visibleResourceMatchesTarget(store, command, target)) {
      return [];
    }
    return [resourceUsageReferenceRow(
      resource,
      target,
      syntax.command,
      describeAddress(store, syntax.commandSourceAddressHandle),
      syntax.commandSourceAddressHandle,
      handles,
      SemanticTemplateResourceUsageKind.BindingCommandName,
    )];
  });
}

function attributePatternResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  if (target.resourceKind !== ResourceDefinitionKind.AttributePattern || target.definitionProductHandle == null) {
    return [];
  }
  return resource.compilation.authoredAttributeSyntaxes.flatMap((syntax): readonly SemanticTemplateReferenceRow[] => {
    const compiledPattern = syntax.compiledPatternProductHandle == null
      ? null
      : store.productDetails.read(
          TemplateProductDetails.CompiledAttributePattern,
          syntax.compiledPatternProductHandle,
        );
    const executable = compiledPattern?.executableProductHandle == null
      ? null
      : store.productDetails.read(
          TemplateProductDetails.AttributePatternExecutable,
          compiledPattern.executableProductHandle,
        );
    if (executable?.definitionProductHandle !== target.definitionProductHandle) {
      return [];
    }
    return syntax.patternLiterals.map((literal) => resourceUsageReferenceRow(
      resource,
      target,
      literal.value,
      describeAddress(store, literal.sourceAddressHandle),
      literal.sourceAddressHandle,
      handles,
      SemanticTemplateResourceUsageKind.AttributePatternLiteral,
    ));
  });
}

function refTargetResourceReferenceRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  return resourceLocalBindingSourceOperations(store, resource).flatMap((operation) => {
    const controller = namedRefTargetController(resource.runtimeAnalysis.runtimeRendering, operation);
    if (
      controller?.definitionProductHandle == null
      || target.definitionProductHandle == null
      || controller.definitionProductHandle !== target.definitionProductHandle
    ) {
      return [];
    }
    return [resourceUsageReferenceRow(
      resource,
      target,
      operation.targetName,
      describeAddress(store, operation.sourceAddressHandle),
      operation.sourceAddressHandle,
      handles,
      SemanticTemplateResourceUsageKind.RefTarget,
      operation.binding.productHandle,
    )];
  });
}

function visibleResourceMatchesTarget(
  store: KernelStore,
  resource: TemplateResourceEmission['compilation']['compilerWorld']['resourceScope']['resources'][number],
  target: ResourceReferenceTarget,
): boolean {
  const definition = readVisibleTemplateResourceDefinition(store, resource);
  const definitionSourceAddressHandle = definition == null
    ? null
    : 'nameSourceAddressHandle' in definition
      ? definition.nameSourceAddressHandle
        ?? definition.target.addressHandle
        ?? definition.sourceAddressHandle
      : definition.sourceAddressHandle;
  return resourceIdentityMatchesTarget(
    store,
    resource.resourceKind,
    [resource.name, ...resource.aliases],
    resource.definitionProductHandle,
    definitionSourceAddressHandle,
    target,
  );
}

function resourceIdentityMatchesTarget(
  store: KernelStore,
  resourceKind: ResourceDefinitionKind,
  names: readonly string[],
  definitionProductHandle: ProductHandle | null,
  definitionSourceAddressHandle: AddressHandle | null,
  target: ResourceReferenceTarget,
): boolean {
  if (!resourceKindsShareRegistrationIdentity(resourceKind, target.resourceKind)) {
    return false;
  }
  if (definitionProductHandle != null && target.definitionProductHandle != null) {
    return definitionProductHandle === target.definitionProductHandle;
  }
  const definitionSource = semanticExactSourceReference(describeAddress(store, definitionSourceAddressHandle));
  return sourceReferencesMatchExactSpan(definitionSource, target.targetSource)
    && names.some((name) => name.toLowerCase() === target.selectedName.toLowerCase());
}

function elementTagNameSources(
  store: KernelStore,
  resource: TemplateResourceEmission,
  element: HtmlElement,
): readonly SemanticSourceReference[] {
  return [
    elementTagNameSource(store, resource, element, false),
    elementTagNameSource(store, resource, element, true),
  ].filter((source): source is SemanticSourceReference => source != null);
}

function elementTagNameSource(
  store: KernelStore,
  resource: TemplateResourceEmission,
  element: HtmlElement,
  closing: boolean,
): SemanticSourceReference | null {
  const source = semanticExactSourceReference(describeAddress(store, element.sourceAddressHandle));
  const templateSource = semanticExactSourceReference(describeAddress(store, resource.compilation.unit.templateSource.sourceAddressHandle));
  const markup = resource.compilation.unit.templateSource.markup;
  if (source?.path == null || source.start == null || source.end == null || markup == null) {
    return null;
  }

  const baseStart = templateSource?.start ?? 0;
  const localStart = source.start - baseStart;
  const localEnd = source.end - baseStart;
  if (localStart < 0 || localEnd > markup.length || localStart >= localEnd) {
    return null;
  }

  const nameStart = closing
    ? closingTagNameStart(markup, element.tagName, localStart, localEnd)
    : openingTagNameStart(markup, element.tagName, localStart, localEnd);
  return nameStart == null
    ? null
    : sourceSlice(source, baseStart + nameStart, baseStart + nameStart + element.tagName.length, closing ? 'close-tag-name' : 'tag-name');
}

function openingTagNameStart(
  markup: string,
  tagName: string,
  localStart: number,
  localEnd: number,
): number | null {
  const open = markup.indexOf('<', localStart);
  if (open < localStart || open >= localEnd) {
    return null;
  }
  const nameStart = open + 1;
  return markup.slice(nameStart, nameStart + tagName.length).toLowerCase() === tagName.toLowerCase()
    ? nameStart
    : null;
}

function closingTagNameStart(
  markup: string,
  tagName: string,
  localStart: number,
  localEnd: number,
): number | null {
  const lowerMarkup = markup.toLowerCase();
  const needle = `</${tagName.toLowerCase()}`;
  const close = lowerMarkup.lastIndexOf(needle, localEnd);
  if (close < localStart || close >= localEnd) {
    return null;
  }
  return close + 2;
}

function bindableAttributeTokenSource(
  store: KernelStore,
  syntax: TemplateResourceEmission['compilation']['attributeSyntax']['syntaxes'][number],
  attributeName: string,
): { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'] } | null {
  if (syntax.target.toLowerCase() !== attributeName.toLowerCase()) {
    return null;
  }
  return attributeSyntaxTargetTokenSource(store, syntax);
}

function multiBindingSegmentTargetTokenSource(
  store: KernelStore,
  segment: TemplateResourceEmission['compilation']['bindingCommandLowering']['multiBindingSegments'][number],
  attributeName: string,
): { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: AddressHandle | null } | null {
  const source = semanticExactSourceReference(describeAddress(store, segment.targetSourceAddressHandle));
  if (source == null) {
    return null;
  }
  const rawNameLower = segment.rawName.toLowerCase();
  const attributeLower = attributeName.toLowerCase();
  const targetStart = rawNameLower.indexOf(attributeLower);
  const text = targetStart < 0
    ? attributeName
    : segment.rawName.slice(targetStart, targetStart + attributeName.length);
  return {
    source,
    text,
    sourceAddressHandle: segment.targetSourceAddressHandle,
  };
}

function attributeSyntaxTargetTokenSource(
  store: KernelStore,
  syntax: TemplateResourceEmission['compilation']['attributeSyntax']['syntaxes'][number],
): { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'] } | null {
  const sourceAddressHandle = syntax.targetSourceAddressHandle;
  const source = semanticExactSourceReference(describeAddress(store, sourceAddressHandle));
  if (source == null) {
    return null;
  }
  return {
    source,
    text: syntax.target,
    sourceAddressHandle,
  };
}

function sourceSlice(
  source: SemanticSourceReference,
  start: number,
  end: number,
  role: string,
): SemanticSourceReference | null {
  if (source.path == null) {
    return null;
  }
  return sourceReferenceForParserSpan(
    source.path,
    sourceSpanFromBounds(start, end),
    role,
  );
}

function authoredScopeReferenceRowsForTarget(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  targetSources: readonly SemanticSourceReference[],
  targetIdentityHandle: IdentityHandle | null,
  targetSourceAddressHandle: AddressHandle | null,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  return uniqueSortedTemplateReferenceRows(resources.flatMap((resource) =>
    resourceLocalTemplateExpressionParses(store, resource).flatMap((parse) => {
      if (!ExpressionParseResultInspector.hasCanonicalAst(parse.result)) {
        return [];
      }
      const carrier = semanticExactSourceReference(describeAddress(store, parse.sourceAddressHandle));
      const sourcePath = carrier?.path;
      if (sourcePath == null) {
        return [];
      }
      const scopes = bindingScopesForTemplateExpressionParse(resource, parse);
      if (scopes.length === 0) {
        return [];
      }
      const bindings = scopes.flatMap((scope) =>
        runtimeExpressionBindingsForTemplateExpressionParseInScope(resource, parse, scope)
      );
      const bindingKinds = new Set(bindings.map((binding) => binding.bindingKind));
      const bindingProductHandles = new Set(bindings.map((binding) => binding.productHandle));
      const bindingKind = bindingKinds.size === 1 ? [...bindingKinds][0]! : null;
      const bindingProductHandle = bindingProductHandles.size === 1 ? [...bindingProductHandles][0]! : null;
      return ExpressionParseResultInspector.scopeAccesses(parse.result).flatMap((access): readonly SemanticTemplateReferenceRow[] => {
        if (access.name.name !== selectedMemberName) {
          return [];
        }
        const slots = scopes.map((scope) => scope.locate(access.name.name, access.ancestor).slot);
        if (
          slots.some((slot) => slot == null)
          || !slots.every((slot) => scopeSlotMatchesReferenceTarget(
            store,
            slot!,
            targetSources,
            targetIdentityHandle,
          ))
        ) {
          return [];
        }
        const source = sourceReferenceForParserSpan(sourcePath, access.name.span, 'name', carrier);
        if (sourceReferencesMatchExactSpan(source, targetSource)) {
          return [];
        }
        return [{
          referenceKind: SemanticTemplateReferenceKind.TemplateUsage,
          name: access.name.name,
          definitionName: resource.compilation.definition.name,
          bindingKind,
          dependencyKind: null,
          source,
          targetSource,
          ...(handles ? {
            handles: {
              observedDependencyProductHandle: null,
              expressionProductHandle: parse.productHandle,
              bindingProductHandle,
              sourceAddressHandle: null,
              targetSourceAddressHandle,
            },
          } : {}),
        }];
      });
    })
  ));
}

function scopeSlotMatchesReferenceTarget(
  store: KernelStore,
  slot: BindingContextSlot,
  targetSources: readonly SemanticSourceReference[],
  targetIdentityHandle: IdentityHandle | null,
): boolean {
  if (
    targetIdentityHandle != null
    && slot.targetIdentityHandle != null
    && slot.targetIdentityHandle === targetIdentityHandle
  ) {
    return true;
  }
  const slotSource = semanticExactSourceReference(describeAddress(store, slot.sourceAddressHandle));
  return slotSource != null && targetSources.some((source) => sourceReferencesMatchExactSpan(slotSource, source));
}

function templateReferenceRowForObservedDependency(
  row: SemanticBindingObservedDependencyRow,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): SemanticTemplateReferenceRow {
  // Prefer the authored member-name token over the whole expression span so references highlight
  // and rename edit exactly the token (`searchText`, not `state.items.searchText`).
  const tokenSource = semanticExactSourceReference(row.memberTokenSource ?? null);
  return {
    referenceKind: SemanticTemplateReferenceKind.TemplateUsage,
    name: tokenSource != null
      ? row.memberName ?? row.methodName ?? row.sourceRootName ?? selectedMemberName
      : row.sourceName ?? row.memberName ?? row.methodName ?? selectedMemberName,
    definitionName: row.definitionName,
    bindingKind: row.bindingKind,
    dependencyKind: row.dependencyKind,
    source: tokenSource ?? semanticExactSourceReference(row.source),
    targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: row.handles?.observedDependencyProductHandle ?? null,
        expressionProductHandle: row.handles?.expressionProductHandle ?? null,
        bindingProductHandle: row.handles?.bindingProductHandle ?? null,
        sourceAddressHandle: row.handles?.sourceAddressHandle ?? null,
        targetSourceAddressHandle: row.handles?.observedMemberSourceAddressHandle ?? null,
      },
    } : {}),
  };
}

function templateReferenceRowForSourceAssignment(
  row: SemanticBindingDataFlowRow,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.TemplateUsage,
    name: selectedMemberName,
    definitionName: row.definitionName,
    bindingKind: row.bindingKind,
    dependencyKind: null,
    source: semanticExactSourceReference(row.sourceAssignmentOccurrenceSource),
    targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle: row.handles?.expressionProductHandle ?? null,
        bindingProductHandle: row.handles?.bindingProductHandle ?? null,
        sourceAddressHandle: row.handles?.sourceAddressHandle ?? null,
        targetSourceAddressHandle: row.handles?.sourceAssignmentTargetSourceAddressHandle ?? null,
      },
    } : {}),
  };
}

function openMemberTemplateReferenceRowForObservedDependency(
  row: SemanticBindingObservedDependencyRow,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): SemanticTemplateReferenceRow {
  const referenceRow = templateReferenceRowForObservedDependency(
    row,
    selectedMemberName,
    targetSource,
    handles,
  );
  return referenceRow.handles == null
    ? referenceRow
    : {
        ...referenceRow,
        handles: {
          ...referenceRow.handles,
          targetSourceAddressHandle: null,
        },
      };
}

/**
 * Same-name template usages whose provenance cannot prove a relationship to the selected symbol
 * (owner-value routes on weak, dynamic, keyed, or index-signature-shaped owners). Same-name rows
 * whose member-declaration route points at a DIFFERENT declaration are proven-different symbols and
 * are deliberately not candidates, matching TypeScript's treatment of shadowed names.
 */
function unprovenSameNameCandidateRows(
  observedRows: readonly SemanticBindingObservedDependencyRow[],
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  const rows = observedRows
    .filter((row) =>
      row.source != null
      && row.observedMemberSourceRoute !== 'member-declaration'
      && (row.memberName === selectedMemberName
        || (row.memberName == null && row.sourceName === selectedMemberName))
    )
    .map((row) => templateReferenceRowForObservedDependency(row, selectedMemberName, targetSource, handles));
  return [...uniqueTemplateReferenceRows(rows)]
    .sort((left, right) =>
      (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
      || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    );
}

function unprovenObservedMemberRowContainsCursor(
  row: SemanticBindingObservedDependencyRow,
  selectedMemberName: string,
  cursor: NonNullable<SemanticAppQuery['cursor']>,
): boolean {
  return row.source != null
    && row.observedMemberSourceRoute !== 'member-declaration'
    && row.memberName === selectedMemberName
    && semanticSourceReferenceContainsFileOffset(row.memberTokenSource ?? null, cursor.filePath, cursor.offset);
}

function uniqueTemplateReferenceRows(
  rows: readonly SemanticTemplateReferenceRow[],
): readonly SemanticTemplateReferenceRow[] {
  const seen = new Set<string>();
  const unique: SemanticTemplateReferenceRow[] = [];
  for (const row of rows) {
    const key = [
      row.referenceKind,
      row.source?.path ?? '',
      row.source?.start ?? '',
      row.source?.end ?? '',
      row.targetSource?.path ?? '',
      row.targetSource?.start ?? '',
      row.targetSource?.end ?? '',
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function uniqueSortedTemplateReferenceRows(
  rows: readonly SemanticTemplateReferenceRow[],
): readonly SemanticTemplateReferenceRow[] {
  return [...uniqueTemplateReferenceRows(rows)].sort(compareTemplateReferenceRows);
}

function compareTemplateReferenceRows(
  left: SemanticTemplateReferenceRow,
  right: SemanticTemplateReferenceRow,
): number {
  return (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
    || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    || left.referenceKind.localeCompare(right.referenceKind);
}

function sourceReferencesMatchExactSpan(
  left: SemanticSourceReference | null,
  right: SemanticSourceReference | null,
): boolean {
  const leftExact = semanticExactSourceReference(left);
  const rightExact = semanticExactSourceReference(right);
  return leftExact?.path != null
    && rightExact?.path != null
    && semanticSourceReferenceMatchesFilePath(leftExact, rightExact.path)
    && semanticSourceReferenceMatchesFilePath(rightExact, leftExact.path)
    && leftExact.start === rightExact.start
    && leftExact.end === rightExact.end;
}

function sourceReferenceLooksTypeScript(
  source: SemanticSourceReference | null,
): boolean {
  const path = source?.path?.toLowerCase() ?? '';
  return path.endsWith('.ts')
    || path.endsWith('.tsx')
    || path.endsWith('.js')
    || path.endsWith('.jsx')
    || path.endsWith('.mts')
    || path.endsWith('.cts')
    || path.endsWith('.mjs')
    || path.endsWith('.cjs');
}

function uniqueTemplateInlayHintRows(
  rows: readonly SemanticTemplateInlayHintRow[],
): readonly SemanticTemplateInlayHintRow[] {
  const seen = new Set<string>();
  const unique: SemanticTemplateInlayHintRow[] = [];
  for (const row of rows) {
    const key = [
      row.source?.path ?? '',
      row.source?.start ?? '',
      row.source?.end ?? '',
      row.hintKind,
      row.targetProperty,
      row.authoredMode,
      row.effectiveMode,
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
}

function templateInlayHintRows(
  store: KernelStore,
  resource: TemplateResourceEmission,
  handles: boolean,
): readonly SemanticTemplateInlayHintRow[] {
  const attributesByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
  const nestedSyntaxByProduct = new Map(resource.compilation.bindingCommandLowering.attributeSyntaxes
    .map((syntax) => [syntax.productHandle, syntax]));
  const segmentByBindingSource = new Map<AddressHandle, typeof resource.compilation.bindingCommandLowering.multiBindingSegments[number]>();
  for (const segment of resource.compilation.bindingCommandLowering.multiBindingSegments) {
    const syntax = nestedSyntaxByProduct.get(segment.syntaxProductHandle) ?? null;
    for (const sourceAddressHandle of [segment.sourceAddressHandle, syntax?.sourceAddressHandle ?? null]) {
      if (sourceAddressHandle != null) {
        segmentByBindingSource.set(sourceAddressHandle, segment);
      }
    }
  }
  return resourceLocalRuntimeBindings(store, resource)
    .flatMap((binding): readonly SemanticTemplateInlayHintRow[] => {
      if (!(binding instanceof PropertyBinding)) {
        return [];
      }
      const authoredMode = authoredTemplateBindingMode(binding);
      const effectiveMode = resource.runtimeAnalysis.expressionResourcePlan.effectivePropertyBindingMode(binding);
      if (authoredMode === effectiveMode || effectiveMode === TemplateBindingMode.Default) {
        return [];
      }
      const effectiveModeLabel = templateBindingModeLabel(effectiveMode);
      if (effectiveModeLabel == null) {
        return [];
      }
      const attribute = binding.attribute?.productHandle == null
        ? null
        : attributesByProduct.get(binding.attribute.productHandle) ?? null;
      const segment = binding.sourceAddressHandle == null
        ? null
        : segmentByBindingSource.get(binding.sourceAddressHandle) ?? null;
      const nestedSyntax = segment == null
        ? null
        : nestedSyntaxByProduct.get(segment.syntaxProductHandle) ?? null;
      const sourceAddressHandle = nestedSyntax?.nameSourceAddressHandle ?? attribute?.nameAddressHandle ?? null;
      const source = describeAddress(store, sourceAddressHandle);
      if (source?.start == null || source.end == null) {
        return [];
      }
      const attributeSourceAddressHandle = nestedSyntax?.sourceAddressHandle
        ?? attribute?.sourceAddressHandle
        ?? binding.attribute?.addressHandle
        ?? null;
      return [{
        hintKind: SemanticTemplateInlayHintKind.BindingModeResolution,
        definitionName: resource.compilation.definition.name,
        bindingKind: binding.bindingKind,
        targetProperty: binding.target,
        authoredMode,
        effectiveMode,
        effectiveModeLabel,
        source,
        attributeSource: describeAddress(store, attributeSourceAddressHandle),
        bindingSource: describeAddress(store, binding.sourceAddressHandle),
        ...(handles ? {
          handles: {
            bindingProductHandle: binding.productHandle,
            instructionProductHandle: binding.instructionProductHandle,
            attributeProductHandle: attribute?.productHandle ?? binding.attribute?.productHandle ?? null,
            sourceAddressHandle,
            attributeSourceAddressHandle,
            bindingSourceAddressHandle: binding.sourceAddressHandle,
          },
        } : {}),
      }];
    });
}

function authoredTemplateBindingMode(binding: PropertyBinding): TemplateBindingMode {
  switch (binding.command?.name) {
    case BuiltInBindingCommandName.Bind:
      return TemplateBindingMode.Default;
    case BuiltInBindingCommandName.OneTime:
      return TemplateBindingMode.OneTime;
    case BuiltInBindingCommandName.ToView:
      return TemplateBindingMode.ToView;
    case BuiltInBindingCommandName.FromView:
      return TemplateBindingMode.FromView;
    case BuiltInBindingCommandName.TwoWay:
      return TemplateBindingMode.TwoWay;
    default:
      return binding.bindingMode;
  }
}

function templateBindingModeLabel(mode: TemplateBindingMode): string | null {
  switch (mode) {
    case TemplateBindingMode.OneTime:
      return 'oneTime';
    case TemplateBindingMode.ToView:
      return 'toView';
    case TemplateBindingMode.FromView:
      return 'fromView';
    case TemplateBindingMode.TwoWay:
      return 'twoWay';
    default:
      return null;
  }
}

function templateCompilationRows(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  compilationLane: TemplateCompilationLane,
  handles: boolean,
): readonly SemanticTemplateCompilationRow[] {
  return resources.map((resource): SemanticTemplateCompilationRow => {
    const targetOperations = resourceLocalBindingTargetOperations(store, resource);
    return {
      compilationLane,
      analysisDepth: resource.runtimeAnalysis.analysisDepth,
      definitionName: resource.compilation.definition.name,
      compilerWorld: compilerWorldLabel(store, resource.compilation.compilerWorld),
      templateSourceKind: resource.compilation.unit.templateSource.sourceKind,
      htmlNodes: resource.compilation.html.nodes.length,
      htmlAttributes: resource.compilation.html.attributes.length,
      recoveries: resource.compilation.html.recoveries.length,
      attributeSyntaxes: resource.compilation.authoredAttributeSyntaxes.length,
      classifications: resource.compilation.attributeClassification.classifications.length,
      valueSites: resource.compilation.valueSites.sites.length + resource.compilation.bindingCommandLowering.valueSites.length,
      expressionParses: resource.compilation.valueSites.parses.length
        + resource.compilation.bindingCommandLowering.expressionParses.length,
      bindingCommandLowerings: resource.compilation.bindingCommandLowering.lowerings.length
        + resource.compilation.bindingCommandLowering.multiBindingLowerings.length,
      instructions: resource.compilation.compiledTemplate.instructions.length,
      renderTargets: resource.compilation.compiledTemplate.renderTargets.length,
      runtimeControllers: resource.runtimeAnalysis.readRuntimeControllers().length,
      runtimeChildContainers: resource.runtimeAnalysis.readRuntimeChildContainers().length,
      runtimeChildContextResolverSlots: resource.runtimeAnalysis.readRuntimeChildContextResolverSlots().length,
      runtimeBindings: resourceLocalRuntimeBindings(store, resource).length,
      runtimeTargetOperations: targetOperations.length,
      runtimeRendererTargetOperations: targetOperations.filter((operation) => operation.binding == null).length,
      runtimeBindingTargetAccesses: resourceLocalBindingTargetAccesses(store, resource).length,
      runtimeBindingTargetOperations: targetOperations.filter((operation) => operation.binding != null).length,
      runtimeBindingSourceOperations: resourceLocalBindingSourceOperations(store, resource).length,
      runtimeBindingValueChannels: resourceLocalBindingValueChannels(store, resource).length,
      runtimeBindingDataFlows: resourceLocalBindingDataFlows(store, resource).length,
      runtimeBindingObservedDependencies: resourceLocalBindingObservedDependencies(store, resource).length,
      bindingScopes: resource.runtimeAnalysis.scopes.readScopes().length,
      openSeams: resource.compilation.compiledTemplate.openSeams.length
        + resource.runtimeAnalysis.runtimeRendering.openSeams.length
        + resource.runtimeAnalysis.controllerBind.openSeams.length
        + resource.runtimeAnalysis.bindingValueChannel.openSeams.length
        + resource.runtimeAnalysis.bindingDataFlow.openSeams.length,
      source: describeAddress(
        store,
        resource.compilation.definition.template?.addressHandle ?? resource.compilation.definition.sourceAddressHandle,
      ),
      ...(handles ? {
        handles: {
          definitionProductHandle: resource.compilation.definition.productHandle,
          compilerWorldProductHandle: resource.compilation.compilerWorld.world.productHandle,
          sourceAddressHandle: resource.compilation.definition.template?.addressHandle
            ?? resource.compilation.definition.sourceAddressHandle,
        },
      } : {}),
    };
  });
}
