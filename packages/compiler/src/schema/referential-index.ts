// Referential Index — workspace-level cross-domain provenance mapping
//
// The third provenance dimension (L1 cross-domain-provenance-mapping.md).
// Epistemic provenance (Sourced<T>) answers "how do we know this value?"
// Positional provenance (SourceSpan) answers "where in the source is this?"
// Referential provenance answers "what refers to what, across both domains?"
//
// The per-template overlay serves forward traversals (template position → entity).
// The referential index serves reverse and lateral traversals (entity → all positions).
// Both must agree (forward-reverse coherence invariant).
//
// L2 reference: models/attractor/l2/types.ts §Referential Index

import type { ExprId, NormalizedPath, NodeId } from "../model/identity.js";
import type { SourceSpan } from "../model/ir.js";
import type { ScopeFrame, ScopeTemplate } from "../model/symbols.js";
import type { ResourceScopeId, SymbolId } from "./types.js";

// ============================================================================
// Reference taxonomy — 20 kinds spanning both domains
// ============================================================================

/**
 * Name form that the same underlying name manifests as across domains.
 * Rename must derive all forms from the input form; find-references must
 * search in the correct form per reference site.
 */
export type NameForm = 'kebab-case' | 'camelCase' | 'PascalCase';

/**
 * Structural classification of a reference site. Determines the edit
 * mechanic for rename and the display grouping for find-references.
 */
export type ReferenceKind =
  // Template domain
  | 'tag-name'                // <my-element>
  | 'close-tag-name'          // </my-element>
  | 'attribute-name'          // my-attr.bind="..."
  | 'as-element-value'        // <div as-element="my-element">
  | 'expression-identifier'   // ${title}, value.bind="count"
  | 'expression-pipe'         // value | myConverter
  | 'expression-behavior'     // value & myBehavior
  | 'local-template-attr'     // <template as-custom-element="name">
  | 'import-element-from'     // <import from="./my-element">
  // Script domain
  | 'decorator-name-property' // @customElement({ name: 'my-el' })
  | 'decorator-string-arg'    // @customElement('my-el')
  | 'static-au-name'          // static $au = { name: 'my-el' }
  | 'define-name'             // CustomElement.define({ name: 'my-el' }, ...)
  | 'import-path'             // import { MyEl } from './my-element'
  | 'dependencies-class'      // dependencies: [MyElement]
  | 'dependencies-string'     // dependencies: ['my-element']
  | 'class-name'              // class MyElement { }
  | 'property-access'         // this.myProp, instance.myProp
  | 'bindable-property'       // @bindable myProp declaration
  | 'bindable-config-key'     // bindables: { myProp: { ... } }
  | 'bindable-callback';      // myPropChanged() { }

// ============================================================================
// Reference sites
// ============================================================================

/**
 * A reference to a named entity in text — carries enough information for
 * both find-references (display) and rename (edit computation).
 *
 * This is the single reference site type across both compiler and workspace
 * layers. The compiler populates structural fields (domain, file, resourceKey,
 * scope/VM provenance). The workspace layer populates entity-linkage fields
 * (symbolId, exprId, nodeId) during reference collection.
 */
export interface TextReferenceSite {
  readonly kind: 'text';
  readonly domain: 'template' | 'script';
  readonly referenceKind: ReferenceKind;
  readonly file: NormalizedPath;
  readonly span: SourceSpan;
  readonly nameForm: NameForm;
  /** Resource key this site refers to (e.g. "custom-element:my-component"). */
  readonly resourceKey: string;
  /** Scope context for rename safety assessment. */
  readonly scopeId?: ResourceScopeId;
  /**
   * For expression-identifier sites: the VM file, class name, and property
   * that this identifier resolves to through the scope chain. Populated at
   * extraction time using scope-qualified resolution — only identifiers that
   * reach the VM binding context (not shadowed by TC-injected scope) carry
   * these fields.
   */
  readonly vmFile?: NormalizedPath;
  readonly vmClassName?: string;
  readonly vmProperty?: string;
  /** Workspace-layer entity linkage: stable content-addressed resource ID. */
  readonly symbolId?: SymbolId;
  /** Workspace-layer entity linkage: expression table index. */
  readonly exprId?: ExprId;
  /** Workspace-layer entity linkage: DOM node identity. */
  readonly nodeId?: NodeId;
}

/**
 * File rename operation — convention-declared resources embed the name in filenames.
 */
export interface FileReferenceSite {
  readonly kind: 'file-rename';
  readonly oldPath: NormalizedPath;
  readonly extension: string;
  readonly resourceKey: string;
}

export type ReferenceSite = TextReferenceSite | FileReferenceSite;

// ============================================================================
// Referential Index interface
// ============================================================================

export interface ReferentialIndex {
  /** Reverse lookup: given a resource key, find all reference sites across both domains. */
  getReferencesForResource(resourceKey: string): ReferenceSite[];

  /** Symbol lookup: given a TS property, find template binding sites. */
  getReferencesForSymbol(file: NormalizedPath, className: string, property: string): ReferenceSite[];

  /** Scope-qualified reverse lookup: references within a specific scope. */
  getReferencesInScope(resourceKey: string, scopeId: ResourceScopeId): ReferenceSite[];

  /**
   * Ingest template-domain reference sites for a single template.
   * Replaces any previous entries for this template path.
   */
  updateFromTemplate(templatePath: NormalizedPath, sites: ReferenceSite[]): void;

  /**
   * Ingest script-domain reference sites for a single source file.
   * Replaces any previous entries for this file path.
   */
  updateFromScript(filePath: NormalizedPath, sites: ReferenceSite[]): void;

  /** Remove all entries for a file (template deleted or TS file removed). */
  removeFile(path: NormalizedPath): void;

  /** All reference sites currently indexed. */
  allSites(): ReferenceSite[];

  /** All resource keys that have at least one reference site. */
  indexedResources(): string[];
}

// ============================================================================
// In-memory implementation
// ============================================================================

export class InMemoryReferentialIndex implements ReferentialIndex {
  /** resource key → reference sites */
  readonly #byResource = new Map<string, ReferenceSite[]>();
  /** file path → reference sites originating from that file */
  readonly #byFile = new Map<NormalizedPath, ReferenceSite[]>();
  /** symbol key ("file:class.property") → reference sites */
  readonly #bySymbol = new Map<string, ReferenceSite[]>();

  getReferencesForResource(resourceKey: string): ReferenceSite[] {
    return this.#byResource.get(resourceKey) ?? [];
  }

  getReferencesForSymbol(file: NormalizedPath, className: string, property: string): ReferenceSite[] {
    const key = symbolKey(file, className, property);
    return this.#bySymbol.get(key) ?? [];
  }

  getReferencesInScope(resourceKey: string, scopeId: ResourceScopeId): ReferenceSite[] {
    const all = this.#byResource.get(resourceKey) ?? [];
    return all.filter(s => s.kind === 'text' && s.scopeId === scopeId);
  }

  updateFromTemplate(templatePath: NormalizedPath, sites: ReferenceSite[]): void {
    this.removeFile(templatePath);
    this.#byFile.set(templatePath, sites);
    for (const site of sites) {
      if (site.kind === 'text' && site.referenceKind === 'expression-identifier') {
        // Expression identifiers are indexed by symbol key for reverse
        // property lookup (getReferencesForSymbol), not by resource key.
        const symKey = symbolKeyFromSite(site);
        if (symKey) addToMapList(this.#bySymbol, symKey, site);
      } else {
        addToMapList(this.#byResource, site.resourceKey, site);
      }
    }
  }

  updateFromScript(filePath: NormalizedPath, sites: ReferenceSite[]): void {
    this.removeFile(filePath);
    this.#byFile.set(filePath, sites);
    for (const site of sites) {
      addToMapList(this.#byResource, site.resourceKey, site);
    }
  }

  removeFile(path: NormalizedPath): void {
    const existing = this.#byFile.get(path);
    if (!existing) return;
    for (const site of existing) {
      if (site.kind === 'text' && site.referenceKind === 'expression-identifier') {
        const symKey = symbolKeyFromSite(site);
        if (symKey) removeFromMapList(this.#bySymbol, symKey, site);
      } else {
        removeFromMapList(this.#byResource, site.resourceKey, site);
      }
    }
    this.#byFile.delete(path);
  }

  allSites(): ReferenceSite[] {
    const result: ReferenceSite[] = [];
    for (const sites of this.#byFile.values()) {
      result.push(...sites);
    }
    return result;
  }

  indexedResources(): string[] {
    return [...this.#byResource.keys()];
  }
}

// ============================================================================
// Extraction — produce ReferenceSite[] from a TemplateCompilation
// ============================================================================

import type { TemplateCompilation } from "../facade.js";
import type { LinkedInstruction, LinkedRow } from "../analysis/20-link/types.js";
import type { FrameId } from "../model/symbols.js";

/**
 * Optional context for expression-identifier extraction. When provided,
 * extractReferenceSites also emits expression-identifier reference sites
 * for VM property references in binding expressions — the scope-correct
 * reverse traversal entries that power getReferencesForSymbol.
 *
 * Per the L2 structural invariant, these entries are the materialized
 * inverse of the forward cursor resolver: only identifiers that resolve
 * through the scope chain to the VM binding context are emitted, not
 * identifiers shadowed by TC-injected scope (iterator locals, let
 * bindings, contextual variables, aliases).
 */
export interface ExpressionExtractionContext {
  /** Resolved path to the component's .ts file (the VM). */
  componentPath: NormalizedPath;
  /** The class name of the component's view-model. */
  className: string;
  /** The resource name (kebab-case) of the owning CE — used for resourceKey. */
  resourceName?: string;
}

/**
 * Extract all resource reference sites from a compiled template.
 *
 * Walks the linked module's rows and instructions, producing a ReferenceSite
 * for every position that references a resource (CE tag, CA attribute, TC
 * attribute, VC pipe, BB ampersand, bindable property, binding command).
 *
 * When `exprContext` is provided, also extracts expression-identifier
 * reference sites for VM property references in binding expressions.
 * Each site is scope-qualified: identifiers shadowed by TC-injected scope
 * variables (repeat iterator, let binding, contextual, alias) are excluded.
 *
 * This is the ingestion function that feeds the referential index after
 * each template compilation.
 */
export function extractReferenceSites(
  templatePath: NormalizedPath,
  compilation: TemplateCompilation,
  exprContext?: ExpressionExtractionContext,
): ReferenceSite[] {
  const sites: ReferenceSite[] = [];

  for (const template of compilation.linked.templates) {
    for (const row of template.rows) {
      // CE tag references
      if (row.node.kind === 'element' && row.node.custom?.def) {
        const def = row.node.custom.def;
        const name = def.name;
        const key = `custom-element:${name}`;
        // Tag name location — use the row's first instruction loc or estimate from IR
        const tagLoc = findTagLoc(compilation, row);
        if (tagLoc) {
          sites.push({
            kind: 'text',
            domain: 'template',
            referenceKind: 'tag-name',
            file: templatePath,
            span: tagLoc,
            nameForm: 'kebab-case',
            resourceKey: key,
          });
        }
      }

      // Walk instructions for CA, TC, binding, VC, BB references
      for (const ins of row.instructions) {
        extractInstructionSites(templatePath, ins, sites);
      }
    }
  }

  // VC/BB references from expression table
  for (const entry of compilation.exprTable) {
    extractExpressionSites(templatePath, entry, sites);
  }

  // Expression-identifier references: VM property references in bindings
  if (exprContext) {
    extractExpressionIdentifierSites(templatePath, compilation, exprContext, sites);
  }

  return sites;
}

function extractInstructionSites(
  templatePath: NormalizedPath,
  ins: LinkedInstruction,
  sites: ReferenceSite[],
): void {
  const loc = (ins as { loc?: SourceSpan | null }).loc;

  switch (ins.kind) {
    case 'hydrateAttribute': {
      if (ins.res?.def && loc) {
        const name = ins.res.def.name;
        sites.push({
          kind: 'text',
          domain: 'template',
          referenceKind: 'attribute-name',
          file: templatePath,
          span: loc,
          nameForm: 'kebab-case',
          resourceKey: `custom-attribute:${name}`,
        });
      }
      // Recurse into props
      for (const prop of ins.props ?? []) {
        extractInstructionSites(templatePath, prop, sites);
      }
      break;
    }
    case 'hydrateTemplateController': {
      if (ins.res && loc) {
        sites.push({
          kind: 'text',
          domain: 'template',
          referenceKind: 'attribute-name',
          file: templatePath,
          span: loc,
          nameForm: 'kebab-case',
          resourceKey: `template-controller:${ins.res}`,
        });
      }
      for (const prop of ins.props ?? []) {
        extractInstructionSites(templatePath, prop, sites);
      }
      break;
    }
    case 'hydrateElement': {
      // Props on CEs are bindable references
      for (const prop of ins.props ?? []) {
        extractInstructionSites(templatePath, prop, sites);
      }
      break;
    }
    case 'propertyBinding':
    case 'attributeBinding':
    case 'stylePropertyBinding': {
      // Binding target is a potential bindable reference if it targets a CE/CA
      if (ins.target && 'kind' in ins.target && loc) {
        const target = ins.target as { kind: string; def?: { name: string }; property?: string };
        if ((target.kind === 'customElement' || target.kind === 'customAttribute') && target.def && target.property) {
          sites.push({
            kind: 'text',
            domain: 'template',
            referenceKind: 'attribute-name',
            file: templatePath,
            span: loc,
            nameForm: 'kebab-case',
            resourceKey: `${target.kind === 'customElement' ? 'custom-element' : 'custom-attribute'}:${target.def.name}:bindable:${target.property}`,
          });
        }
      }
      break;
    }
  }
}

function extractExpressionSites(
  templatePath: NormalizedPath,
  entry: { readonly id: unknown; readonly ast: unknown; readonly span?: SourceSpan },
  sites: ReferenceSite[],
): void {
  // Walk expression AST for VC and BB references
  walkExprAst(entry.ast as ExprAstNode, templatePath, sites);
}

type ExprAstNode = {
  $kind?: string;
  name?: { name?: string; span?: SourceSpan };
  expression?: ExprAstNode;
  expressions?: ExprAstNode[];
};

function walkExprAst(
  node: ExprAstNode | null | undefined,
  templatePath: NormalizedPath,
  sites: ReferenceSite[],
): void {
  if (!node || !node.$kind) return;

  if (node.$kind === 'ValueConverter' && node.name?.name && node.name.span) {
    sites.push({
      kind: 'text',
      domain: 'template',
      referenceKind: 'expression-pipe',
      file: templatePath,
      span: node.name.span,
      nameForm: 'camelCase',
      resourceKey: `value-converter:${node.name.name}`,
    });
  }

  if (node.$kind === 'BindingBehavior' && node.name?.name && node.name.span) {
    sites.push({
      kind: 'text',
      domain: 'template',
      referenceKind: 'expression-behavior',
      file: templatePath,
      span: node.name.span,
      nameForm: 'camelCase',
      resourceKey: `binding-behavior:${node.name.name}`,
    });
  }

  // Recurse
  if (node.expression) walkExprAst(node.expression, templatePath, sites);
  if (node.expressions) {
    for (const sub of node.expressions) walkExprAst(sub, templatePath, sites);
  }
}

function findTagLoc(
  compilation: TemplateCompilation,
  row: LinkedRow,
): SourceSpan | null {
  // Walk the IR DOM tree to find the node with matching ID
  const nodeId = row.target;
  for (const t of compilation.ir.templates) {
    const found = findNodeInDom(t.dom, nodeId);
    if (found) return found;
  }
  return null;
}

interface IrDomNode {
  id?: unknown;
  loc?: SourceSpan | null;
  tagLoc?: SourceSpan | null;
  children?: readonly IrDomNode[];
}

function findNodeInDom(
  node: IrDomNode,
  targetId: unknown,
): SourceSpan | null {
  if (node.id === targetId) return node.tagLoc ?? node.loc ?? null;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInDom(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

// ============================================================================
// Expression-identifier extraction (scope-qualified reverse traversal)
// ============================================================================

/**
 * Extract expression-identifier reference sites from the compiled mapping.
 *
 * For each mapping entry that carries segments with a `path` field (an
 * identifier name in the binding expression), this function checks whether
 * the identifier resolves through the scope chain to the VM binding
 * context. Identifiers shadowed by TC-injected scope (iterator locals,
 * let bindings, contextual variables, aliases) are excluded.
 *
 * This is the scope-qualified reverse traversal described in L1 Boundary 7:
 * the referential index inherits scope-awareness from the forward resolver
 * because extraction runs scope verification at ingestion time.
 */
function extractExpressionIdentifierSites(
  templatePath: NormalizedPath,
  compilation: TemplateCompilation,
  ctx: ExpressionExtractionContext,
  sites: ReferenceSite[],
): void {
  const mapping = compilation.mapping;
  if (!mapping) return;

  // Build a frame lookup from the scope module
  const scopeTemplate = compilation.scope?.templates?.[0];
  const frames = scopeTemplate?.frames;
  const frameMap = new Map<FrameId, ScopeFrame>();
  if (frames) {
    for (const frame of frames) {
      frameMap.set(frame.id, frame);
    }
  }

  // Resource key: expression identifiers are properties on the CE's VM.
  // These sites go into #bySymbol (not #byResource), but need a resourceKey
  // for the TextReferenceSite interface contract.
  const resourceKey = ctx.resourceName
    ? `custom-element:${ctx.resourceName}`
    : `custom-element:${ctx.className}`;

  for (const entry of mapping.entries) {
    if (!entry.segments) continue;

    // Determine the scope frame for this expression
    const frameId = entry.frameId ?? null;

    for (const segment of entry.segments) {
      if (!segment.path || !segment.htmlSpan) continue;

      // Scope check: is this identifier shadowed by a TC-injected scope?
      if (frameId && frameMap.size > 0) {
        if (isShadowedByScope(segment.path, frameId, frameMap)) continue;
      }

      sites.push({
        kind: 'text',
        domain: 'template',
        referenceKind: 'expression-identifier',
        file: templatePath,
        span: segment.htmlSpan,
        nameForm: 'camelCase',
        resourceKey,
        vmFile: ctx.componentPath,
        vmClassName: ctx.className,
        vmProperty: segment.path,
      });
    }
  }
}

/**
 * Check whether an identifier name is shadowed by a scope variable in the
 * chain from the given frame to the root.
 *
 * Walks parent frames looking for any ScopeSymbol whose name matches. If
 * found, the identifier resolves to that scope variable (iterator local,
 * let binding, contextual, alias) rather than the VM binding context.
 *
 * The root frame is the VM binding context — we don't check it because
 * VM properties are NOT scope symbols (they are implicit).
 */
function isShadowedByScope(
  name: string,
  frameId: FrameId,
  frameMap: ReadonlyMap<FrameId, ScopeFrame>,
): boolean {
  let current = frameMap.get(frameId);
  while (current) {
    // Check symbols in this frame
    for (const sym of current.symbols) {
      if (sym.name === name) return true;
    }
    // Check overlay base — 'with' scope creates an overlay where ALL
    // identifiers resolve to the overlay object, not the VM
    if (current.overlay) return true;
    // Walk to parent
    if (current.parent == null) break;
    current = frameMap.get(current.parent);
  }
  return false;
}

// ============================================================================
// Helpers
// ============================================================================

function symbolKey(file: NormalizedPath, className: string, property: string): string {
  return `${file}:${className}.${property}`;
}

function symbolKeyFromSite(site: TextReferenceSite): string | null {
  if (site.vmFile && site.vmClassName && site.vmProperty) {
    return symbolKey(site.vmFile, site.vmClassName, site.vmProperty);
  }
  return null;
}

function addToMapList<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) {
    list.push(value);
  } else {
    map.set(key, [value]);
  }
}

function removeFromMapList<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (!list) return;
  const idx = list.indexOf(value);
  if (idx >= 0) list.splice(idx, 1);
  if (list.length === 0) map.delete(key);
}
