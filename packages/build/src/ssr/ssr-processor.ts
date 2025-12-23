/**
 * SSR Post-Render Processor
 *
 * Handles SSR output processing including marker stripping.
 * Manifest recording is handled by @aurelia/runtime-html (recordManifest).
 */

/* global Element, HTMLCollection */

/* =============================================================================
 * Build Package Options & Types
 * ============================================================================= */

/**
 * Options for SSR output processing.
 */
export interface SSRProcessOptions {
  /**
   * Strip `<au-m>` marker elements from the output HTML.
   * Default: false
   */
  stripMarkers?: boolean;
}

/**
 * Result of SSR output processing.
 */
export interface SSRProcessResult {
  /** HTML output (clean if stripMarkers=true) */
  html: string;
}

/* =============================================================================
 * Main API
 * ============================================================================= */

/**
 * Process SSR output to optionally strip markers.
 *
 * @param host - The host element containing rendered content
 * @param options - Processing options
 * @returns Processed HTML
 *
 * @example
 * ```typescript
 * // After Aurelia renders...
 * const result = processSSROutput(host, { stripMarkers: true });
 * // result.html is clean (no <au-m> markers)
 * ```
 */
export function processSSROutput(
  host: Element,
  options: SSRProcessOptions = {},
): SSRProcessResult {
  const { stripMarkers = false } = options;

  if (stripMarkers) {
    stripAuMarkers(host);
  }

  return { html: host.innerHTML };
}



/* =============================================================================
 * Marker Stripping
 * ============================================================================= */

/**
 * Remove all `<au-m>` marker elements from within root.
 *
 * @param root - The root element to process
 */
export function stripAuMarkers(root: Element): void {
  const markers = root.querySelectorAll("au-m");
  for (const el of markers) {
    el.remove();
  }
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
