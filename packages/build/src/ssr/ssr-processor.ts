/**
 * SSR Post-Render Processor
 *
 * Wraps Aurelia's SSR post-render processing with additional options
 * for manifest delivery (embedding in HTML).
 *
 * The core marker stripping is delegated to `@aurelia/runtime-html`'s
 * `processSSROutput` to ensure perfect parity with client hydration.
 */

import {
  processSSROutput as aureliaProcessSSROutput,
  type IHydrationManifest,
} from "@aurelia/runtime-html";

/* global Element, HTMLCollection */

/* =============================================================================
 * Re-exported Types from Aurelia Runtime
 * ============================================================================= */

/**
 * Hydration manifest with optional element paths.
 * Re-exported from @aurelia/runtime-html for convenience.
 */
export type HydrationManifest = IHydrationManifest;

/* =============================================================================
 * Build Package Options & Types
 * ============================================================================= */

/**
 * Options for SSR output processing.
 */
export interface SSRProcessOptions {
  /**
   * Strip `au-hid` attributes and use path-based element identification.
   * When true, `elementPaths` will be added to the manifest.
   * Default: false
   */
  stripMarkers?: boolean;

  /**
   * How to deliver the hydration manifest to the client.
   * - 'embedded': Insert as <script type="application/json" id="__AU_MANIFEST__">
   * - 'separate': Return manifest separately (caller handles delivery)
   * - 'both': Embed in HTML AND return separately
   * Default: 'separate'
   */
  manifestDelivery?: "embedded" | "separate" | "both";

  /**
   * ID for the embedded manifest script tag.
   * Only used when manifestDelivery is 'embedded' or 'both'.
   * Default: '__AU_MANIFEST__'
   */
  manifestScriptId?: string;
}

/**
 * Result of SSR output processing.
 */
export interface SSRProcessResult {
  /** HTML output (clean if stripMarkers=true) */
  html: string;

  /** Hydration manifest (with elementPaths if stripMarkers=true) */
  manifest: HydrationManifest;
}

/* =============================================================================
 * Main API
 * ============================================================================= */

/**
 * Process SSR output to optionally strip markers and compute element paths.
 *
 * This wraps Aurelia's `processSSROutput` with additional options for
 * manifest delivery. When `stripMarkers: true`, delegates to the runtime
 * implementation to ensure parity with client hydration.
 *
 * @param host - The host element containing rendered content
 * @param manifest - The initial hydration manifest from rendering
 * @param options - Processing options
 * @returns Processed HTML and augmented manifest
 *
 * @example
 * ```typescript
 * // After Aurelia renders...
 * const result = processSSROutput(host, initialManifest, {
 *   stripMarkers: true,
 *   manifestDelivery: 'embedded',
 * });
 *
 * // result.html is clean (no au-hid attributes)
 * // result.manifest includes elementPaths for client hydration
 * ```
 */
export function processSSROutput(
  host: Element,
  manifest: HydrationManifest,
  options: SSRProcessOptions = {},
): SSRProcessResult {
  const {
    stripMarkers = false,
    manifestDelivery = "separate",
    manifestScriptId = "__AU_MANIFEST__",
  } = options;

  let resultHtml: string;
  let resultManifest: HydrationManifest;

  if (stripMarkers) {
    // Use Aurelia's implementation for marker stripping and path computation
    const auResult = aureliaProcessSSROutput(host, manifest);
    resultHtml = auResult.html;
    resultManifest = auResult.manifest;
  } else {
    // No processing - just extract HTML
    resultHtml = host.innerHTML;
    resultManifest = { ...manifest };
  }

  // Handle manifest embedding (our additional feature)
  if (manifestDelivery === "embedded" || manifestDelivery === "both") {
    embedManifest(host, resultManifest, manifestScriptId);
    // Re-extract HTML after embedding
    resultHtml = host.innerHTML;
  }

  return {
    html: resultHtml,
    manifest: resultManifest,
  };
}

/* =============================================================================
 * Path Computation Utilities
 * ============================================================================= */

/**
 * Compute element paths for all `au-hid` marked elements.
 *
 * Each path is an array of child indices from the root to the target element.
 * For example, `[0, 2, 1]` means: root.children[0].children[2].children[1]
 *
 * @param root - The root element to search within
 * @returns Map of target index to element path
 */
export function computeElementPaths(root: Element): Record<number, number[]> {
  const elementPaths: Record<number, number[]> = {};

  const auHidElements = root.querySelectorAll("[au-hid]");
  for (const el of auHidElements) {
    const targetId = parseInt(el.getAttribute("au-hid")!, 10);
    const path = computePath(root, el);
    elementPaths[targetId] = path;
  }

  return elementPaths;
}

/**
 * Compute the child-index path from root to target element.
 *
 * @param root - The root element (path is relative to this)
 * @param target - The target element to compute path for
 * @returns Array of child indices from root to target
 *
 * @example
 * ```html
 * <div id="root">
 *   <span></span>
 *   <div>
 *     <p></p>
 *     <a id="target"></a>
 *   </div>
 * </div>
 * ```
 * computePath(root, target) => [1, 1]
 * // root.children[1].children[1] = <a id="target">
 */
export function computePath(root: Element, target: Element): number[] {
  const path: number[] = [];
  let current: Element | null = target;

  // Walk up from target to root, recording child indices
  while (current && current !== root && current.parentElement) {
    const parent: Element = current.parentElement;
    const index = getChildIndex(parent, current);
    path.unshift(index);
    current = parent;
  }

  return path;
}

/**
 * Get the index of a child element within its parent's children collection.
 *
 * Note: Uses `children` (elements only), not `childNodes` (all nodes).
 * This matches how paths will be resolved on the client.
 */
function getChildIndex(parent: Element, child: Element): number {
  const children: HTMLCollection = parent.children;
  for (let i = 0; i < children.length; i++) {
    if (children[i] === child) {
      return i;
    }
  }
  // Should never happen if child is actually a child of parent
  throw new Error("Child element not found in parent");
}

/* =============================================================================
 * Marker Stripping
 * ============================================================================= */

/**
 * Remove all `au-hid` attributes from elements within root.
 *
 * @param root - The root element to process
 */
export function stripAuHidAttributes(root: Element): void {
  const auHidElements = root.querySelectorAll("[au-hid]");
  for (const el of auHidElements) {
    el.removeAttribute("au-hid");
  }
}

/* =============================================================================
 * Manifest Embedding
 * ============================================================================= */

/**
 * Embed the hydration manifest as a script tag within the host element.
 *
 * The manifest is serialized as JSON in a script tag with type="application/json".
 * This is a common pattern for delivering structured data alongside SSR HTML.
 *
 * @param host - The host element to embed manifest in
 * @param manifest - The hydration manifest to embed
 * @param scriptId - ID for the script tag
 */
export function embedManifest(
  host: Element,
  manifest: HydrationManifest,
  scriptId: string,
): void {
  const doc = host.ownerDocument;
  if (!doc) return;

  // Check if manifest script already exists
  const existing = host.querySelector(`#${scriptId}`);
  if (existing) {
    existing.textContent = JSON.stringify(manifest);
    return;
  }

  // Create and append manifest script
  const script = doc.createElement("script");
  script.type = "application/json";
  script.id = scriptId;
  script.textContent = JSON.stringify(manifest);
  host.appendChild(script);
}

/* =============================================================================
 * Path Resolution (for testing/validation)
 * ============================================================================= */

/**
 * Resolve an element by its path from root.
 *
 * This is provided for testing/validation. The actual client-side
 * implementation is in Aurelia runtime's `_collectTargets()` method.
 *
 * @param root - The root element to start from
 * @param path - Array of child indices
 * @returns The resolved element
 */
export function resolvePath(root: Element, path: number[]): Element {
  let node: Element = root;
  for (const index of path) {
    const child = node.children[index];
    if (!child) {
      throw new Error(`Invalid path: no child at index ${index}`);
    }
    node = child;
  }
  return node;
}

/* =============================================================================
 * DOM Property to HTML Attribute Sync for SSR
 * ============================================================================= */

/**
 * Sync DOM properties to HTML attributes for SSR serialization.
 *
 * **Why this is needed:**
 * When Aurelia binds to DOM properties (e.g., `value.bind`, `checked.bind`),
 * it sets the JavaScript property, not the HTML attribute. This is correct
 * for client-side rendering, but when we serialize to HTML via `innerHTML`,
 * only attributes appear in the output—properties are lost.
 *
 * This function bridges that gap by syncing property values to attributes
 * before serialization. This is a standard SSR pattern used by React, Vue,
 * and other frameworks.
 *
 * **What gets synced:**
 * 1. Boolean attributes (checked, disabled, selected, readonly, etc.)
 * 2. Value attributes (input.value, textarea.value)
 * 3. Selected state (select options)
 *
 * @param root - The root element containing rendered content
 *
 * @example
 * ```typescript
 * // After Aurelia renders...
 * await au.start();
 *
 * // Sync properties to attributes for serialization
 * syncPropertiesForSSR(host);
 *
 * // Now innerHTML reflects the true state
 * const html = host.innerHTML;
 * // <input type="checkbox" checked> (not just <input type="checkbox">)
 * // <input type="text" value="John"> (not just <input type="text">)
 * ```
 */
export function syncPropertiesForSSR(root: Element): void {
  // 1. Sync boolean attributes
  syncBooleanProps(root);

  // 2. Sync value properties on inputs and textareas
  syncValueProps(root);

  // 3. Sync selected state on select elements
  syncSelectState(root);
}

/**
 * HTML boolean attributes that need property-to-attribute sync.
 */
const BOOLEAN_ATTRIBUTES: ReadonlyArray<{
  attr: string;
  selector: string;
  prop: string;
}> = [
  // Form elements
  { attr: "checked", selector: 'input[type="checkbox"], input[type="radio"]', prop: "checked" },
  { attr: "selected", selector: "option", prop: "selected" },
  { attr: "disabled", selector: "button, input, select, textarea, optgroup, option, fieldset", prop: "disabled" },
  { attr: "readonly", selector: "input, textarea", prop: "readOnly" },
  { attr: "required", selector: "input, select, textarea", prop: "required" },
  { attr: "multiple", selector: "input, select", prop: "multiple" },

  // Other boolean attributes
  { attr: "hidden", selector: "*", prop: "hidden" },
  { attr: "autofocus", selector: "button, input, select, textarea", prop: "autofocus" },
  { attr: "open", selector: "details, dialog", prop: "open" },
];

/**
 * Sync boolean DOM properties to HTML attributes.
 */
function syncBooleanProps(root: Element): void {
  for (const { attr, selector, prop } of BOOLEAN_ATTRIBUTES) {
    const elements = root.querySelectorAll(selector);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as Element & Record<string, unknown>;
      const propValue = el[prop];

      if (propValue === true) {
        if (!el.hasAttribute(attr)) {
          el.setAttribute(attr, "");
        }
      } else if (propValue === false) {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      }
    }
  }
}

/**
 * Sync value properties on input and textarea elements.
 *
 * When `value.bind` is used, Aurelia sets the `value` property.
 * We need to sync this to the `value` attribute for SSR serialization.
 */
function syncValueProps(root: Element): void {
  // Input elements (except checkbox/radio which use checked, not value)
  const inputs = root.querySelectorAll(
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"])'
  );
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i] as HTMLInputElement;
    const value = input.value;
    if (value !== "") {
      input.setAttribute("value", value);
    } else if (input.hasAttribute("value")) {
      // If value is empty string but attribute exists, keep it
      // (might be intentionally empty)
    }
  }

  // Textarea elements
  const textareas = root.querySelectorAll("textarea");
  for (let i = 0; i < textareas.length; i++) {
    const textarea = textareas[i] as HTMLTextAreaElement;
    const value = textarea.value;
    // For textarea, the value is the text content, not an attribute
    if (value !== "" && textarea.textContent !== value) {
      textarea.textContent = value;
    }
  }
}

/**
 * Sync selected state on select elements.
 *
 * When the selected option changes via property, we need to update
 * the `selected` attribute on the appropriate option element.
 */
function syncSelectState(root: Element): void {
  const selects = root.querySelectorAll("select");
  for (let i = 0; i < selects.length; i++) {
    const select = selects[i] as HTMLSelectElement;
    const options = select.options;

    for (let j = 0; j < options.length; j++) {
      const option = options[j] as HTMLOptionElement | undefined;
      if (option == null) continue;

      if (option.selected) {
        if (!option.hasAttribute("selected")) {
          option.setAttribute("selected", "");
        }
      } else {
        if (option.hasAttribute("selected")) {
          option.removeAttribute("selected");
        }
      }
    }
  }
}
