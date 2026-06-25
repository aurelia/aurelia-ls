import ts from 'typescript';
import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
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
  sourceReferenceForTsNode,
} from './source-reference.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
  toPageRequest,
} from './answer-helpers.js';
import {
  SemanticRuntimeDetail,
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
import {
  BuiltInBindingCommandName,
} from '../template/built-in-syntax.js';
import {
  PropertyBinding,
} from '../template/runtime-binding.js';
import {
  effectivePropertyBindingMode,
} from '../template/runtime-binding-mode-behavior.js';

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
    const context = this.templateReferenceContext(query, detail, handles);
    if (context == null) {
      return answer(
        SemanticRuntimeAnswerOutcome.Miss,
        'No source-backed template member is selected at this cursor.',
        {
          displayText: 'No source-backed template member is selected.',
          selectedMemberName: null,
          targetSource: null,
          rows: [],
        },
      );
    }

    const rows = query.includeDeclaration === true
      ? context.rows
      : context.rows.filter((row) => row.referenceKind !== SemanticTemplateReferenceKind.Declaration);
    const paged = pageRows(rows, query.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} template reference row(s).`,
      {
        displayText: `${rows.length} template reference row(s) for ${context.selectedMemberName}.`,
        selectedMemberName: context.selectedMemberName,
        targetSource: context.targetSource,
        rows: paged.rows,
      },
      paged.page,
    );
  }

  templateRename(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticTemplateRenameResult> {
    const detail = query.detail ?? SemanticRuntimeDetail.Compact;
    const handles = includeHandles(detail);
    const context = this.templateReferenceContext({ ...query, includeDeclaration: true }, detail, handles);
    if (context == null) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.NoSourceBackedMember,
        'No source-backed template member is selected at this cursor.',
        null,
        null,
        null,
      );
    }

    const activeSource = activeRenameSource(context.rows, query.cursor);
    if (activeSource == null) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.CursorNotOnRenameableReference,
        'The cursor is not on a renameable template reference for the selected member.',
        context.selectedMemberName,
        context.targetSource,
        null,
      );
    }

    const placeholder = context.selectedMemberName;
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
          templateReferenceCount: context.templateUsageRows.length,
          typeScriptReferenceCount: 0,
        },
      );
    }

    if (!isValidRenameIdentifier(newName)) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.InvalidNewName,
        `Rename target '${newName}' is not a valid TypeScript identifier.`,
        context.selectedMemberName,
        context.targetSource,
        activeSource,
        SemanticTemplateRenameStatus.InvalidName,
      );
    }

    const typeScriptEdits = typeScriptReferenceRenameEdits(
      this.emission,
      context.targetSource,
      newName,
    );
    if (typeScriptEdits == null) {
      return templateRenameUnavailable(
        SemanticTemplateRenameUnavailableReason.TypeScriptSymbolUnavailable,
        'The TypeScript symbol for this template member could not be proven in the current Program.',
        context.selectedMemberName,
        context.targetSource,
        activeSource,
      );
    }

    const templateEdits = context.templateUsageRows.map((row) =>
      templateRenameEditRow(
        SemanticTemplateRenameEditKind.TemplateUsage,
        row.source,
        row.name,
        newName,
      )
    );
    const edits = [...uniqueTemplateRenameEditRows([...typeScriptEdits, ...templateEdits])]
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
        templateReferenceCount: context.templateUsageRows.length,
        typeScriptReferenceCount: typeScriptEdits.length,
      },
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
          templateReferenceCount: context.templateUsageRows.length,
          typeScriptReferenceCount: 0,
        },
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
        templateReferenceCount: context.templateUsageRows.length,
        typeScriptReferenceCount: 0,
      },
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
        .map((diagnostic) => declareMemberCodeActionForDiagnostic(this.store, this.emission, diagnostic))
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

    const templateUsageRows = readBindingObservedDependencyRows(this.emission, this.store, handles)
      .filter((row) =>
        row.source != null
        && row.observedMemberSourceState === 'source'
        && sourceReferencesMatchExactSpan(row.observedMemberSource, targetSource)
      )
      .map((row) => templateReferenceRowForObservedDependency(row, selectedMemberName, targetSource, handles));
    const declarationRow = templateReferenceDeclarationRow(
      selectedMember.source,
      selectedMemberName,
      targetSource,
      selectedMember.handles?.sourceAddressHandle ?? null,
      handles,
    );
    const rows = [...uniqueTemplateReferenceRows([declarationRow, ...templateUsageRows])]
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
        || left.referenceKind.localeCompare(right.referenceKind)
      );
    return {
      selectedMemberName,
      targetSource,
      templateUsageRows,
      rows,
    };
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
    const templateUsageRows = readBindingObservedDependencyRows(this.emission, this.store, handles)
      .filter((row) =>
        row.source != null
        && row.observedMemberSourceState === 'source'
        && effectiveTargetSources.some((source) => sourceReferencesMatchExactSpan(row.observedMemberSource, source))
      )
      .map((row) => templateReferenceRowForObservedDependency(row, selectedMemberName, targetSource, handles));
    const rows = [...uniqueTemplateReferenceRows(templateUsageRows)]
      .sort((left, right) =>
        (left.source?.path ?? '').localeCompare(right.source?.path ?? '')
        || (left.source?.start ?? -1) - (right.source?.start ?? -1)
      );
    return {
      selectedMemberName,
      targetSource,
      activeSource,
      templateUsageRows: rows,
    };
  }
}

interface TemplateReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
  readonly rows: readonly SemanticTemplateReferenceRow[];
}

interface TypeScriptReferenceContext {
  readonly selectedMemberName: string;
  readonly targetSource: SemanticSourceReference;
  readonly activeSource: SemanticSourceReference | null;
  readonly templateUsageRows: readonly SemanticTemplateReferenceRow[];
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

function declareMemberCodeActionForDiagnostic(
  store: KernelStore,
  emission: AureliaAppWorldProjectEmission,
  diagnostic: SemanticTemplateDiagnosticRow,
): SemanticTemplateCodeActionRow | null {
  const suggestion = diagnostic.suggestion;
  if (suggestion?.actionKind !== 'declare-member') {
    return null;
  }
  if (
    suggestion.suggestionKind !== 'declare-explicit-member'
    && suggestion.suggestionKind !== 'declare-assignable-member'
  ) {
    return null;
  }

  const memberName = suggestion.targetMemberName ?? suggestion.actionTarget?.memberName ?? diagnostic.selectedMemberName;
  if (memberName == null || !isValidRenameIdentifier(memberName)) {
    return null;
  }

  const resource = templateResourceForDiagnosticSource(store, emission, diagnostic.source);
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
    edits: [edit],
    isPreferred: suggestion.suggestionKind === 'declare-explicit-member',
  };
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
      templateReferenceCount: 0,
      typeScriptReferenceCount: 0,
    },
  );
}

function activeRenameSource(
  rows: readonly SemanticTemplateReferenceRow[],
  cursor: SemanticAppQuery['cursor'],
): SemanticSourceReference | null {
  if (cursor == null || cursor.offset == null) {
    return null;
  }
  for (const row of rows) {
    if (row.referenceKind !== SemanticTemplateReferenceKind.TemplateUsage) {
      continue;
    }
    const source = exactSourceReference(row.source);
    if (
      source?.start != null
      && source.end != null
      && semanticSourceReferenceMatchesFilePath(source, cursor.filePath)
      && cursor.offset >= source.start
      && cursor.offset <= source.end
    ) {
      return source;
    }
  }
  return null;
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

function typeScriptReferenceRenameEdits(
  emission: AureliaAppWorldProjectEmission,
  targetSource: SemanticSourceReference,
  newName: string,
): readonly SemanticTemplateRenameEditRow[] | null {
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

  const rows: SemanticTemplateRenameEditRow[] = [];
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
      rows.push(templateRenameEditRow(
        SemanticTemplateRenameEditKind.TypeScriptReference,
        sourceReferenceForTsNode(node),
        node.getText(projectSourceFile),
        newName,
      ));
    });
  }
  return rows.length === 0 ? null : uniqueTemplateRenameEditRows(rows);
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

function templateReferenceRowForObservedDependency(
  row: SemanticBindingObservedDependencyRow,
  selectedMemberName: string,
  targetSource: SemanticSourceReference,
  handles: boolean,
): SemanticTemplateReferenceRow {
  return {
    referenceKind: SemanticTemplateReferenceKind.TemplateUsage,
    name: row.sourceName ?? row.memberName ?? row.methodName ?? selectedMemberName,
    definitionName: row.definitionName,
    bindingKind: row.bindingKind,
    dependencyKind: row.dependencyKind,
    source: exactSourceReference(row.source),
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
