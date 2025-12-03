/**
 * SSR Post-Render Processor
 *
 * Processes SSR output to optionally strip `au-hid` markers and compute
 * path-based element identification for clean HTML delivery.
 *
 * This aligns with industry standards (React 16+, Vue, Svelte) where
 * per-element hydration attributes are not present in delivered HTML.
 * Comment markers (<!--au:N-->, <!--au-start-->, <!--au-end-->) remain
 * as they are universally acceptable and necessary for render locations.
 */

/* global Element, HTMLCollection */

/* =============================================================================
 * Types
 * ============================================================================= */

/**
 * Hydration manifest with optional element paths.
 *
 * When `elementPaths` is present, the client runtime can locate element
 * targets by walking the DOM tree instead of querying for `au-hid` attributes.
 */
export interface HydrationManifest {
  /** Total number of targets in the global index space */
  targetCount: number;

  /** Controller entries keyed by render location's target index */
  controllers?: Record<number, ControllerManifest>;

  /**
   * Element paths for path-based target resolution.
   * Maps target index to array of child indices from root.
   * Only present when `stripMarkers: true`.
   */
  elementPaths?: Record<number, number[]>;
}

export interface ControllerManifest {
  /** Controller type (e.g., 'repeat', 'if', 'switch') */
  type?: string;
  /** View manifests for this controller */
  views: ViewManifest[];
}

export interface ViewManifest {
  /** Global target indices for bindings in this view */
  targets: number[];
  /** Number of DOM root nodes (defaults to 1) */
  nodeCount?: number;
}

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
 * This function should be called after Aurelia renders to the host element
 * but before extracting the HTML string for delivery to the client.
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

  // Start with the provided manifest
  let augmentedManifest: HydrationManifest = { ...manifest };

  // If stripping markers, compute paths and remove au-hid attributes
  if (stripMarkers) {
    const elementPaths = computeElementPaths(host);
    augmentedManifest = {
      ...augmentedManifest,
      elementPaths,
    };
    stripAuHidAttributes(host);
  }

  // Handle manifest embedding
  if (manifestDelivery === "embedded" || manifestDelivery === "both") {
    embedManifest(host, augmentedManifest, manifestScriptId);
  }

  // Extract HTML
  const html = host.innerHTML;

  return {
    html,
    manifest: augmentedManifest,
  };
}

/* =============================================================================
 * Path Computation
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

  // Find all elements with au-hid attribute
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
 * Path Resolution (for reference - actual impl goes in runtime)
 * ============================================================================= */

/**
 * Resolve an element by its path from root.
 *
 * This is a reference implementation. The actual implementation
 * will be in the Aurelia runtime's `_collectTargets()` method.
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
