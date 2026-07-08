import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import type { ProductHandle } from '../kernel/handles.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
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
import {
  compilerWorldLabel,
  describeAddress,
  semanticSourceReferenceMatchesFilePath,
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
  type SemanticBindingObservedDependencyRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticTemplateCompilationResult,
  type SemanticTemplateCompilationRow,
  type SemanticTemplateCompletionResult,
  SemanticTemplateCodeActionEditKind,
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
  SemanticTemplateReferenceKind,
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
  resourceLocalBindingDataFlows,
  resourceLocalBindingObservedDependencies,
  resourceLocalBindingSourceOperations,
  resourceLocalBindingTargetAccesses,
  resourceLocalBindingTargetOperations,
  resourceLocalBindingValueChannels,
  resourceLocalRuntimeBindings,
} from './runtime-resource-ownership.js';
import {
  TemplateBindingMode,
} from '../template/instruction-ir.js';
import { HtmlElement } from '../template/html-ir.js';
import {
  BuiltInBindingCommandName,
} from '../template/built-in-syntax.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import {
  effectivePropertyBindingMode,
} from '../template/runtime-binding-mode-behavior.js';
import { sourceSpanFromBounds } from '../expression/source-span.js';
import { bindableAttributeNameForProperty } from '../resources/bindable-attribute.js';
import {
  ResourceDefinitionKind,
  resourceKindsShareRegistrationIdentity,
} from '../resources/resource-kind.js';

type TemplateResourceEmission = AureliaAppWorldProjectEmission['templates']['resources'][number];
type TemplateCompilationLane = SemanticTemplateCompilationRow['compilationLane'];

export class SemanticAppTemplateQueries {
  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
    private readonly workspaceRootDir: string,
    private readonly projectRootDir: string,
  ) {}

  templateCompilations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTemplateCompilationResult> {
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
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateReferencesResult> {
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
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
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
    const { context, activeSource } = selected;

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
    // Reference rows carry authored token sources, so each edit replaces exactly the token.
    const templateEdits = context.rows
      .filter((row) => referenceRowNeedsTemplateRenameEdit(row, context.renameSurface))
      .map((row) =>
        templateRenameEditRow(
          templateRenameEditKindForReferenceRow(row, context.renameSurface),
          row.source,
          row.name,
          context.renameSurface === TemplateRenameSurface.Bindable
            && row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute
            ? bindableAttributeNameForProperty(newName)
            : newName,
        )
      );
    const edits = [...uniqueTemplateRenameEditRows([...provenTypeScriptEdits, ...templateEdits])]
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
        typeScriptReferenceCount: provenTypeScriptEdits.length,
      },
      null,
      [],
      renameClosure,
    );
  }

  templateRenameFromTypeScript(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
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

    const edits = context.templateUsageRows.map((row) =>
      templateRenameEditRow(
        SemanticTemplateRenameEditKind.TemplateUsage,
        row.source,
        row.name,
        newName,
      )
    );
    const uniqueEdits = [...uniqueTemplateRenameEditRows(edits)]
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
        typeScriptReferenceCount: 0,
      },
      null,
      [],
      propagationClosure,
    );
  }

  templateCodeActions(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateCodeActionsResult> {
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
      detail,
      query.diagnosticProjection,
    );
    const selectedMember = cursorInfo.value.selectedMember;
    const selectedMemberName = cursorInfo.value.selectedMemberName ?? selectedMember?.name ?? null;
    const targetSource = exactSourceReference(selectedMember?.source ?? null);
    if (selectedMember == null || selectedMemberName == null || targetSource == null) {
      return null;
    }

    return this.templateReferenceContextForTarget({
      selectedMemberName,
      targetSource,
      declarationSource: selectedMember.source,
      declarationSourceAddressHandle: selectedMember.handles?.sourceAddressHandle ?? null,
      renameSurface: TemplateRenameSurface.Member,
      includeBindableAttributeRows: true,
    }, handles);
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
      ?? contexts[0]
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
    const activeSource = exactSourceReference(activeObservedRow.memberTokenSource ?? null);
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
      detail,
      query.diagnosticProjection,
    );
    const selectedBindable = cursorInfo.value.selectedBindable;
    const selectedMemberName = selectedBindable?.name ?? null;
    const targetSource = exactSourceReference(selectedBindable?.source ?? null);
    if (selectedBindable == null || selectedMemberName == null || targetSource == null) {
      return null;
    }

    return this.templateReferenceContextForTarget({
      selectedMemberName,
      targetSource,
      declarationSource: selectedBindable.source,
      declarationSourceAddressHandle: selectedBindable.handles?.sourceAddressHandle ?? null,
      renameSurface: TemplateRenameSurface.Bindable,
      includeBindableAttributeRows: true,
    }, handles);
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
    const selectedName = selectedDefinition?.name ?? selectedDefinition?.targetName ?? null;
    const declarationSource = selectedDefinition?.nameSource ?? selectedDefinition?.source ?? null;
    const targetSource = exactSourceReference(declarationSource);
    if (selectedDefinition == null || selectedName == null || targetSource == null) {
      return null;
    }

    const renameSurface = templateRenameSurfaceForResourceKind(selectedDefinition.resourceKind);
    const sourceAddressHandle = selectedDefinition.handles?.nameSourceAddressHandle
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
      hasAuthoredDeclarationSource: selectedDefinition.nameSource != null,
      declarationRow: templateReferenceDeclarationRow(
        declarationSource,
        selectedName,
        targetSource,
        target.sourceAddressHandle,
        handles,
      ),
      templateUsageRows,
      candidateRows: [],
    });
  }

  private templateReferenceContextForTarget(
    target: TemplateReferenceTarget,
    handles: boolean,
  ): TemplateReferenceContext {
    const observed = this.observedReferenceRowsForTarget(
      target.selectedMemberName,
      target.targetSource,
      target.observedTargetSources ?? [target.targetSource],
      handles,
    );
    const bindableAttributeRows = target.includeBindableAttributeRows
      ? bindableAttributeReferenceRows(
          this.store,
          [...this.emission.templates.resources, ...this.emission.templates.authoringResources],
          target.selectedMemberName,
          target.targetSource,
          handles,
        )
      : [];
    const templateUsageRows = uniqueSortedTemplateReferenceRows([
      ...observed.templateUsageRows,
      ...bindableAttributeRows,
    ]);
    return templateReferenceContextFromRows({
      selectedMemberName: target.selectedMemberName,
      targetSource: target.targetSource,
      renameSurface: target.renameSurface,
      includeTypeScriptReferences: true,
      hasAuthoredDeclarationSource: true,
      declarationRow: templateReferenceDeclarationRow(
        target.declarationSource,
        target.selectedMemberName,
        target.targetSource,
        target.declarationSourceAddressHandle,
        handles,
      ),
      templateUsageRows,
      candidateRows: observed.candidateRows,
    });
  }

  private observedReferenceRowsForTarget(
    selectedMemberName: string,
    targetSource: SemanticSourceReference,
    observedTargetSources: readonly SemanticSourceReference[],
    handles: boolean,
  ): ObservedReferenceRowsForTarget {
    const observedRows = readBindingObservedDependencyRows(this.emission, this.store, handles);
    const templateUsageRows = observedRows
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
    return {
      templateUsageRows: uniqueSortedTemplateReferenceRows(templateUsageRows),
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
      declarationRow: templateReferenceDeclarationRow(
        tsContext.targetSource,
        tsContext.selectedMemberName,
        tsContext.targetSource,
        null,
        handles,
      ),
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
    const targetSymbol = canonicalTsSymbol(
      this.emission.typeSystem.checker,
      this.emission.typeSystem.checker.getSymbolAtLocation(activeIdentifier) ?? null,
    );
    if (targetSymbol == null) {
      return null;
    }
    const activeSource = exactSourceReference(sourceReferenceForTsNode(activeIdentifier));
    const targetSources = declarationSourcesForSymbol(targetSymbol);
    const effectiveTargetSources = targetSources.length === 0 && activeSource != null
      ? [activeSource]
      : targetSources;
    const targetSource = effectiveTargetSources[0] ?? activeSource;
    if (targetSource == null) {
      return null;
    }
    const selectedMemberName = activeIdentifier.getText(sourceFile);
    const observed = this.observedReferenceRowsForTarget(
      selectedMemberName,
      targetSource,
      effectiveTargetSources,
      handles,
    );
    return {
      selectedMemberName,
      targetSource,
      activeSource,
      templateUsageRows: observed.templateUsageRows,
      candidateRows: observed.candidateRows,
    };
  }
}

const enum TemplateRenameSurface {
  Member = 'member',
  Bindable = 'bindable',
  ResourceElement = 'resource-element',
  ResourceAttribute = 'resource-attribute',
  UnsupportedResource = 'unsupported-resource',
}

interface TemplateReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly renameSurface: TemplateRenameSurface;
  readonly includeTypeScriptReferences: boolean;
  readonly hasAuthoredDeclarationSource: boolean;
  readonly forceOpen: boolean;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  /** Same-name template usages with unproven provenance; never mixed into proven rows. */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
  readonly rows: readonly SemanticTemplateReferenceRow[];
}

interface TemplateReferenceTarget {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly declarationSource: SemanticSourceReference | null;
  readonly declarationSourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'];
  readonly renameSurface: TemplateRenameSurface;
  readonly observedTargetSources?: readonly SemanticSourceReference[];
  readonly includeBindableAttributeRows: boolean;
}

interface ResourceReferenceTarget {
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`;
  readonly selectedName: string;
  readonly targetSource: SemanticSourceReference;
  readonly definitionProductHandle: ProductHandle | null;
  readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'];
}

interface ObservedReferenceRowsForTarget {
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}

interface TypeScriptReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly activeSource: SemanticSourceReference | null;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  /** Same-name template usages with unproven provenance; never mixed into proven rows. */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}

interface ActiveTemplateReferenceContext {
  readonly context: TemplateReferenceContext;
  readonly activeSource: SemanticSourceReference;
}

function diagnosticContainsCursor(
  diagnostic: SemanticTemplateDiagnosticRow,
  cursor: NonNullable<SemanticAppQuery['cursor']>,
): boolean {
  if (cursor.offset == null) {
    return false;
  }
  const source = exactSourceReference(diagnostic.source);
  return source?.start != null
    && source.end != null
    && semanticSourceReferenceMatchesFilePath(source, cursor.filePath)
    && cursor.offset >= source.start
    && cursor.offset <= source.end;
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

  const actionSource = exactSourceReference(suggestion.actionTarget?.source ?? null);
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
    diagnosticKind: diagnostic.diagnosticKind,
    suggestionKind: suggestion.suggestionKind,
    actionKind: suggestion.actionKind,
    diagnosticSource: exactSourceReference(diagnostic.source),
    actionTarget: suggestion.actionTarget,
    repair: diagnosticRepairAffordanceForSuggestion(suggestion, { editPlanState: 'available' }),
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
  const actionSource = exactSourceReference(diagnostic.suggestion.actionTarget?.source ?? diagnostic.source);
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
  if (edits.length === 0) {
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
    diagnosticKind: diagnostic.diagnosticKind,
    suggestionKind: suggestion.suggestionKind,
    actionKind: suggestion.actionKind,
    diagnosticSource: exactSourceReference(diagnostic.source),
    actionTarget: suggestion.actionTarget,
    repair: diagnosticRepairAffordanceForSuggestion(suggestion, { editPlanState: 'available' }),
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
    const demandSource = exactSourceReference(describeAddress(store, demand.sourceAddressHandle));
    return demand.requiredCapability === requiredCapability
      && sourceReferencesMatchExactSpan(demandSource, actionSource);
  }) ?? null;
}

function frameworkRegistrationAdmissionEdits(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  resource: TemplateResourceEmission,
  admission: AureliaFrameworkRegistrationAdmissionSource,
): readonly SemanticTemplateCodeActionEditRow[] {
  const appStep = appRootStepForTemplateResource(emission, resource, ConfigurationStepKind.AureliaApp);
  const appSource = exactSourceReference(describeAddress(store, appStep?.sourceAddressHandle ?? null));
  if (appSource?.path == null || appSource.start == null || appSource.end == null) {
    return [];
  }
  const sourceFile = emission.typeSystem.readProgramSourceFileByPath(appSource.path);
  if (sourceFile == null) {
    return [];
  }
  const importEdits = planTypeScriptImportSourceOperations(sourceFile, admission.entrypointImports);
  const registerEdit = planAureliaRegisterChainSourceOperation(sourceFile, {
    appCallStart: appSource.start,
    appCallEnd: appSource.end,
    registrationExpressions: admission.registrationExpressions,
  });
  if (registerEdit == null) {
    return [];
  }
  return [
    ...importEdits,
    registerEdit,
  ].map(frameworkRegistrationAdmissionCodeActionEdit);
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

  const diagnosticSource = exactSourceReference(diagnostic.source);
  const actionSource = exactSourceReference(suggestion.actionTarget.source);
  return sourceReferencesMatchExactSpan(diagnosticSource, actionSource)
    && suggestion.actionTarget.memberName === (suggestion.targetMemberName ?? diagnostic.selectedMemberName);
}

function templateResourceForDiagnosticSource(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnosticSource: SemanticSourceReference | null,
): TemplateResourceEmission | null {
  const source = exactSourceReference(diagnosticSource);
  if (source?.path == null || source.start == null || source.end == null) {
    return null;
  }
  for (const resource of [...emission.templates.resources, ...emission.templates.authoringResources]) {
    const templateSource = exactSourceReference(
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
  const definitionSource = exactSourceReference(describeAddress(store, definition.sourceAddressHandle));
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
    oldText: null,
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
  const seen = new Set<string>();
  const unique: SemanticTemplateCodeActionRow[] = [];
  for (const row of rows) {
    const key = [
      row.title,
      row.diagnosticSource?.path ?? '',
      row.diagnosticSource?.start ?? '',
      row.diagnosticSource?.end ?? '',
      row.edits.map((edit) => `${edit.source?.path ?? ''}:${edit.source?.start ?? ''}:${edit.newText}`).join('|'),
    ].join(':');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return unique;
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
    const activeSource = activeRenameSource(context.rows, cursor);
    if (activeSource != null) {
      return { context, activeSource };
    }
  }
  return null;
}

function activeRenameSource(
  rows: readonly SemanticTemplateReferenceRow[],
  cursor: SemanticAppQuery['cursor'],
): SemanticSourceReference | null {
  for (const row of rows) {
    if (!referenceRowSupportsRename(row)) {
      continue;
    }
    const source = exactSourceReference(row.source);
    if (sourceReferenceContainsCursor(source, cursor)) {
      // Usage rows carry authored member-name token sources, so prepareRename ranges are token-granular.
      return source;
    }
  }
  return null;
}

function sourceReferenceContainsCursor(
  source: SemanticSourceReference | null,
  cursor: SemanticAppQuery['cursor'],
): source is SemanticSourceReference {
  return cursor?.offset != null
    && source?.start != null
    && source.end != null
    && semanticSourceReferenceMatchesFilePath(source, cursor.filePath)
    && cursor.offset >= source.start
    && cursor.offset <= source.end;
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
): boolean {
  return referenceRowSupportsRename(row)
    && (
      row.referenceKind !== SemanticTemplateReferenceKind.Declaration
      || surface === TemplateRenameSurface.ResourceElement
      || surface === TemplateRenameSurface.ResourceAttribute
      || !sourceReferenceLooksTypeScript(row.targetSource)
    );
}

function isValidRenameName(value: string, surface: TemplateRenameSurface): boolean {
  return isResourceRenameSurface(surface)
    ? isValidTemplateAddressableResourceName(value)
    : isValidRenameIdentifier(value);
}

function invalidRenameNameMessage(value: string, surface: TemplateRenameSurface): string {
  return isResourceRenameSurface(surface)
    ? `Rename target '${value}' is not a valid Aurelia template resource name. Use lowercase letters, digits, '_' or '-' because Aurelia resolves template element and attribute names from lowercased HTML.`
    : `Rename target '${value}' is not a valid TypeScript identifier.`;
}

function isResourceRenameSurface(surface: TemplateRenameSurface): boolean {
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
  const targetSymbol = canonicalTsSymbol(
    emission.typeSystem.checker,
    emission.typeSystem.checker.getSymbolAtLocation(targetIdentifier) ?? null,
  );
  if (targetSymbol == null) {
    return null;
  }

  const sites: TypeScriptReferenceSite[] = [];
  for (const projectSourceFile of emission.typeSystem.readProjectProgramSourceFiles()) {
    visit(projectSourceFile, (node) => {
      if (!ts.isIdentifier(node)) {
        return;
      }
      const symbol = canonicalTsSymbol(
        emission.typeSystem.checker,
        emission.typeSystem.checker.getSymbolAtLocation(node) ?? null,
      );
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
      source: exactSourceReference(site.source),
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
    default:
      return TemplateRenameSurface.UnsupportedResource;
  }
}

function declarationSourcesForSymbol(
  symbol: ts.Symbol,
): readonly SemanticSourceReference[] {
  return (symbol.declarations ?? [])
    .map((declaration) => declarationNameNode(declaration) ?? declaration)
    .map((node) => exactSourceReference(sourceReferenceForTsNode(node)))
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

function canonicalTsSymbol(
  checker: ts.TypeChecker,
  symbol: ts.Symbol | null,
): ts.Symbol | null {
  if (symbol == null) {
    return null;
  }
  return (symbol.flags & ts.SymbolFlags.Alias) === 0
    ? symbol
    : checker.getAliasedSymbol(symbol);
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
    source: exactSourceReference(source),
    oldText,
    newText,
  };
}

function templateRenameEditKindForReferenceRow(
  row: SemanticTemplateReferenceRow,
  surface: TemplateRenameSurface,
): SemanticTemplateRenameEditKind {
  if (row.referenceKind === SemanticTemplateReferenceKind.ResourceUsage) {
    return surface === TemplateRenameSurface.ResourceAttribute
      ? SemanticTemplateRenameEditKind.ResourceAttributeTarget
      : SemanticTemplateRenameEditKind.ResourceElementTag;
  }
  if (
    row.referenceKind === SemanticTemplateReferenceKind.Declaration
    && (
      surface === TemplateRenameSurface.ResourceElement
      || surface === TemplateRenameSurface.ResourceAttribute
    )
  ) {
    return SemanticTemplateRenameEditKind.ResourceNameDeclaration;
  }
  if (row.referenceKind === SemanticTemplateReferenceKind.BindableAttribute) {
    return SemanticTemplateRenameEditKind.BindableAttribute;
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
  readonly forceOpen?: boolean;
  readonly declarationRow: SemanticTemplateReferenceRow;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}): TemplateReferenceContext {
  return {
    selectedMemberName: input.selectedMemberName,
    targetSource: input.targetSource,
    renameSurface: input.renameSurface,
    includeTypeScriptReferences: input.includeTypeScriptReferences,
    hasAuthoredDeclarationSource: input.hasAuthoredDeclarationSource,
    forceOpen: input.forceOpen ?? false,
    templateUsageRows: input.templateUsageRows,
    candidateRows: input.candidateRows,
    rows: uniqueSortedTemplateReferenceRows([input.declarationRow, ...input.templateUsageRows]),
  };
}

function templateReferenceDeclarationRow(
  source: SemanticSourceReference | null,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'],
  handles: boolean,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.Declaration,
    name: selectedMemberName,
    definitionName: null,
    bindingKind: null,
    dependencyKind: null,
    source: exactSourceReference(source),
    targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle: null,
        bindingProductHandle: null,
        sourceAddressHandle,
        targetSourceAddressHandle: sourceAddressHandle,
      },
    } : {}),
  };
}

function bindableAttributeReferenceRows(
  store: KernelStore,
  resources: readonly TemplateResourceEmission[],
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): readonly SemanticTemplateReferenceRow[] {
  const rows: SemanticTemplateReferenceRow[] = [];
  for (const resource of resources) {
    const syntaxByProduct = new Map(resource.compilation.attributeSyntax.syntaxes.map((syntax) => [syntax.productHandle, syntax]));
    const attributeByProduct = new Map(resource.compilation.html.attributes.map((attribute) => [attribute.productHandle, attribute]));
    for (const classification of resource.compilation.attributeClassification.classifications) {
      const bindable = classification.bindable?.reference ?? null;
      if (bindable == null) {
        continue;
      }
      const defaultAttribute = bindableAttributeNameForProperty(bindable.name);
      if (bindable.attribute !== defaultAttribute) {
        continue;
      }
      const bindableSource = exactSourceReference(describeAddress(store, bindable.sourceAddressHandle));
      if (!sourceReferencesMatchExactSpan(bindableSource, targetSource)) {
        continue;
      }
      const syntax = syntaxByProduct.get(classification.syntaxProductHandle) ?? null;
      const token = syntax == null
        ? null
        : bindableAttributeTokenSource(store, syntax, attributeByProduct, bindable.attribute);
      if (token == null) {
        continue;
      }
      rows.push({
        referenceKind: SemanticTemplateReferenceKind.BindableAttribute,
        name: token.text,
        definitionName: resource.compilation.definition.name,
        bindingKind: null,
        dependencyKind: null,
        source: token.source,
        targetSource,
        ...(handles ? {
          handles: {
            observedDependencyProductHandle: null,
            expressionProductHandle: null,
            bindingProductHandle: null,
            sourceAddressHandle: token.sourceAddressHandle,
            targetSourceAddressHandle: bindable.sourceAddressHandle,
          },
        } : {}),
      });
    }
  }
  return [...uniqueTemplateReferenceRows(rows)]
    .sort((left, right) =>
      (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
      || (left.source?.start ?? -1) - (right.source?.start ?? -1)
    );
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
  const visibleResources = resource.compilation.compilerWorld.resourceScope.resources.filter((candidate) =>
    candidate.resourceKind === ResourceDefinitionKind.CustomElement
    && visibleResourceMatchesTarget(store, candidate, target)
  );
  if (visibleResources.length === 0) {
    return [];
  }
  const names = new Set(visibleResources.flatMap((visible) => [visible.name, ...visible.aliases]).map((name) => name.toLowerCase()));
  return resource.compilation.html.nodes.flatMap((node): readonly SemanticTemplateReferenceRow[] => {
    if (!(node instanceof HtmlElement) || !names.has(node.tagName.toLowerCase())) {
      return [];
    }
    return elementTagNameSources(store, resource, node).map((source) =>
      resourceUsageReferenceRow(
        resource,
        target,
        node.tagName,
        source,
        node.sourceAddressHandle,
        handles,
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
  return resource.compilation.attributeClassification.classifications.flatMap((classification): readonly SemanticTemplateReferenceRow[] => {
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
      : attributeSyntaxTargetTokenSource(store, syntax, attributeByProduct);
    return token == null
      ? []
      : [resourceUsageReferenceRow(
          resource,
          target,
          token.text,
          token.source,
          token.sourceAddressHandle,
          handles,
        )];
  });
}

function resourceUsageReferenceRow(
  resource: TemplateResourceEmission,
  target: ResourceReferenceTarget,
  name: string,
  source: SemanticSourceReference | null,
  sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'],
  handles: boolean,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.ResourceUsage,
    name,
    definitionName: resource.compilation.definition.name,
    bindingKind: null,
    dependencyKind: null,
    source,
    targetSource: target.targetSource,
    ...(handles ? {
      handles: {
        observedDependencyProductHandle: null,
        expressionProductHandle: null,
        bindingProductHandle: null,
        sourceAddressHandle,
        targetSourceAddressHandle: target.sourceAddressHandle,
      },
    } : {}),
  };
}

function visibleResourceMatchesTarget(
  store: KernelStore,
  resource: TemplateResourceEmission['compilation']['compilerWorld']['resourceScope']['resources'][number],
  target: ResourceReferenceTarget,
): boolean {
  if (!resourceKindsShareRegistrationIdentity(resource.resourceKind, target.resourceKind)) {
    return false;
  }
  if (resource.definitionProductHandle != null && target.definitionProductHandle != null) {
    return resource.definitionProductHandle === target.definitionProductHandle;
  }
  const definitionSourceAddressHandle = resource.definition == null
    ? null
    : 'nameSourceAddressHandle' in resource.definition
      ? resource.definition.nameSourceAddressHandle ?? resource.definition.sourceAddressHandle
      : resource.definition.sourceAddressHandle;
  const definitionSource = exactSourceReference(describeAddress(store, definitionSourceAddressHandle));
  return sourceReferencesMatchExactSpan(definitionSource, target.targetSource)
    && [resource.name, ...resource.aliases].some((name) => name.toLowerCase() === target.selectedName.toLowerCase());
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
  const source = exactSourceReference(describeAddress(store, element.sourceAddressHandle));
  const templateSource = exactSourceReference(describeAddress(store, resource.compilation.unit.templateSource.sourceAddressHandle));
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
  attributeByProduct: ReadonlyMap<NonNullable<TemplateResourceEmission['compilation']['html']['attributes'][number]['productHandle']>, TemplateResourceEmission['compilation']['html']['attributes'][number]>,
  attributeName: string,
): { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'] } | null {
  if (syntax.target.toLowerCase() !== attributeName.toLowerCase()) {
    return null;
  }
  return attributeSyntaxTargetTokenSource(store, syntax, attributeByProduct);
}

function attributeSyntaxTargetTokenSource(
  store: KernelStore,
  syntax: TemplateResourceEmission['compilation']['attributeSyntax']['syntaxes'][number],
  attributeByProduct: ReadonlyMap<NonNullable<TemplateResourceEmission['compilation']['html']['attributes'][number]['productHandle']>, TemplateResourceEmission['compilation']['html']['attributes'][number]>,
): { readonly source: SemanticSourceReference; readonly text: string; readonly sourceAddressHandle: NonNullable<SemanticTemplateReferenceRow['handles']>['sourceAddressHandle'] } | null {
  const attribute = syntax.attribute.productHandle == null
    ? null
    : attributeByProduct.get(syntax.attribute.productHandle) ?? null;
  const nameSourceAddressHandle = attribute?.nameAddressHandle ?? syntax.sourceAddressHandle;
  const nameSource = exactSourceReference(describeAddress(store, nameSourceAddressHandle));
  if (nameSource?.path == null || nameSource.start == null) {
    return null;
  }
  const rawNameLower = syntax.rawName.toLowerCase();
  const targetLower = syntax.target.toLowerCase();
  const targetStart = rawNameLower.indexOf(targetLower);
  if (targetStart < 0) {
    return null;
  }
  const start = nameSource.start + targetStart;
  const end = start + syntax.target.length;
  const source = sourceSlice(nameSource, start, end, 'name');
  if (source == null) {
    return null;
  }
  return {
    source,
    text: syntax.rawName.slice(targetStart, targetStart + syntax.target.length),
    sourceAddressHandle: nameSourceAddressHandle,
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

function templateReferenceRowForObservedDependency(
  row: SemanticBindingObservedDependencyRow,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): SemanticTemplateReferenceRow {
  // Prefer the authored member-name token over the whole expression span so references highlight
  // and rename edit exactly the token (`searchText`, not `state.items.searchText`).
  const tokenSource = exactSourceReference(row.memberTokenSource ?? null);
  return {
    referenceKind: SemanticTemplateReferenceKind.TemplateUsage,
    name: tokenSource != null
      ? row.memberName ?? row.methodName ?? row.sourceRootName ?? selectedMemberName
      : row.sourceName ?? row.memberName ?? row.methodName ?? selectedMemberName,
    definitionName: row.definitionName,
    bindingKind: row.bindingKind,
    dependencyKind: row.dependencyKind,
    source: tokenSource ?? exactSourceReference(row.source),
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
    && sourceReferenceContainsCursor(exactSourceReference(row.memberTokenSource ?? null), cursor);
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
  const leftExact = exactSourceReference(left);
  const rightExact = exactSourceReference(right);
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

function exactSourceReference(
  source: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (source == null) {
    return null;
  }
  if (source.start != null && source.end != null) {
    return source;
  }
  return exactSourceReference(source.anchor ?? null);
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
  return resourceLocalRuntimeBindings(store, resource)
    .flatMap((binding): readonly SemanticTemplateInlayHintRow[] => {
      if (!(binding instanceof PropertyBinding)) {
        return [];
      }
      const authoredMode = authoredTemplateBindingMode(binding);
      const effectiveMode = effectivePropertyBindingMode(store, binding, resource.compilation.compilerWorld.resourceScope);
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
      const sourceAddressHandle = attribute?.nameAddressHandle ?? null;
      const source = describeAddress(store, sourceAddressHandle);
      if (source?.start == null || source.end == null) {
        return [];
      }
      const attributeSourceAddressHandle = attribute?.sourceAddressHandle ?? binding.attribute?.addressHandle ?? null;
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
      attributeSyntaxes: resource.compilation.attributeSyntax.syntaxes.length,
      classifications: resource.compilation.attributeClassification.classifications.length,
      valueSites: resource.compilation.valueSites.sites.length + resource.compilation.bindingCommandLowering.valueSites.length,
      expressionParses: resource.compilation.valueSites.parses.length
        + resource.compilation.bindingCommandLowering.expressionParses.length,
      bindingCommandLowerings: resource.compilation.bindingCommandLowering.lowerings.length
        + resource.compilation.bindingCommandLowering.multiBindingLowerings.length,
      instructions: resource.compilation.compiledTemplate.instructions.length,
      renderTargets: resource.compilation.compiledTemplate.renderTargets.length,
      runtimeControllers: resource.runtimeAnalysis.runtimeRendering.controllers.length,
      runtimeChildContainers: resource.runtimeAnalysis.runtimeRendering.childContainers.length,
      runtimeChildContextResolverSlots: resource.runtimeAnalysis.runtimeRendering.childContextResolverSlots.length,
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
