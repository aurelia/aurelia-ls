import { JSDOM } from "jsdom";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, CustomElement, IPlatform, StandardConfiguration } from "@aurelia/runtime-html";
import type { AotCompileResult } from "@aurelia-ls/ssr";

export interface HydrationContextOptions {
  hostElement?: string;
  title?: string;
  ssrDef?: object;
}

export interface HydrationContext {
  dom: JSDOM;
  window: Window & typeof globalThis;
  document: Document;
  platform: BrowserPlatform;
  host: Element;
}

export interface HydrationResult {
  host: Element;
  document: Document;
  dom: JSDOM;
  vm: Record<string, unknown>;
  appRoot: Awaited<ReturnType<Aurelia["hydrate"]>>;
  html(): string;
  stop(): Promise<void>;
}

export interface ComponentOptions {
  dependencies?: readonly unknown[];
  bindables?: Record<string, unknown>;
}

export function createComponent(
  name: string,
  template: string,
  state: Record<string, unknown> = {},
  Base: new () => Record<string, unknown> = class {} as new () => Record<string, unknown>,
  options: ComponentOptions = {},
): new () => Record<string, unknown> {
  const ComponentClass = class extends Base {
    constructor() {
      super();
      Object.assign(this, cloneState(state));
    }
  } as unknown as new () => Record<string, unknown>;
  const au: Record<string, unknown> = {
    type: "custom-element",
    name,
    template,
  };
  if (options.dependencies?.length) {
    au.dependencies = options.dependencies;
  }
  if (options.bindables) {
    au.bindables = options.bindables;
  }
  (ComponentClass as { $au?: unknown }).$au = au;
  return ComponentClass;
}

export function createHydrationContext(
  ssrHtml: string,
  ssrState: object,
  ssrManifest: object,
  options: HydrationContextOptions = {},
): HydrationContext {
  const {
    hostElement = 'div id="app"',
    title = "Hydration Test",
    ssrDef,
  } = options;

  const hostMatch = hostElement.match(/^([\w-]+)(.*)$/);
  const tagName = hostMatch?.[1] ?? "div";
  const attrs = hostMatch?.[2] ?? "";
  const openTag = `<${tagName}${attrs ? " " + attrs.trim() : ""}>`;
  const closeTag = `</${tagName}>`;

  const scriptContent = [
    `window.__SSR_STATE__ = ${JSON.stringify(ssrState)};`,
    `window.__AU_MANIFEST__ = ${JSON.stringify(ssrManifest)};`,
    ssrDef ? `window.__AU_DEF__ = ${JSON.stringify(ssrDef)};` : "",
  ].filter(Boolean).join("\n    ");

  const html = `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
  ${openTag}${ssrHtml}${closeTag}
  <script>
    ${scriptContent}
  </script>
</body>
</html>`;

  const dom = new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });

  const window = dom.window as unknown as Window & typeof globalThis;
  const document = window.document;
  const platform = new BrowserPlatform(window as any);
  const host = resolveHost(document, hostElement);

  // Ensure DOM globals exist for runtime checks in node-based SSR/hydration tests.
  const globalWindow = globalThis as typeof globalThis & {
    HTMLElement?: typeof window.HTMLElement;
    Element?: typeof window.Element;
    Node?: typeof window.Node;
    Document?: typeof window.Document;
    HTMLInputElement?: typeof window.HTMLInputElement;
    HTMLTextAreaElement?: typeof window.HTMLTextAreaElement;
    HTMLSelectElement?: typeof window.HTMLSelectElement;
    CustomEvent?: typeof window.CustomEvent;
    Event?: typeof window.Event;
  };
  globalWindow.HTMLElement = window.HTMLElement;
  globalWindow.Element = window.Element;
  globalWindow.Node = window.Node;
  globalWindow.Document = window.Document;
  globalWindow.HTMLInputElement = window.HTMLInputElement;
  globalWindow.HTMLTextAreaElement = window.HTMLTextAreaElement;
  globalWindow.HTMLSelectElement = window.HTMLSelectElement;
  globalWindow.CustomEvent = window.CustomEvent;
  globalWindow.Event = window.Event;

  return { dom, window, document, platform, host };
}

export async function hydrateSsr(
  ssrHtml: string,
  state: Record<string, unknown>,
  ssrManifest: object,
  aot: AotCompileResult,
  options: {
    componentName: string;
    hostElement?: string;
    componentClass?: new () => Record<string, unknown>;
    reuseComponentClass?: boolean;
    register?: (container: ReturnType<typeof DI.createContainer>) => void;
    childComponents?: Array<new () => Record<string, unknown>>;
  },
): Promise<HydrationResult> {
  const ctx = createHydrationContext(ssrHtml, state, ssrManifest, {
    hostElement: options.hostElement,
    ssrDef: {
      template: aot.template,
      instructions: aot.instructions,
    },
  });

  const Base = options.componentClass ?? (class {} as new () => Record<string, unknown>);
  const baseAu = (Base as { $au?: Record<string, unknown> }).$au ?? {};
  const reuseComponentClass = Boolean(options.componentClass && options.reuseComponentClass);
  let HydrateComponent: new () => Record<string, unknown>;
  let restoreAu: Record<string, unknown> | undefined;
  if (reuseComponentClass) {
    const baseWithAu = Base as { $au?: Record<string, unknown> };
    restoreAu = baseWithAu.$au;
    baseWithAu.$au = {
      ...baseAu,
      type: "custom-element",
      name: options.componentName,
      template: aot.template,
      instructions: aot.instructions,
      needsCompile: false,
    };
    HydrateComponent = Base;
  } else {
    HydrateComponent = class extends Base {
      static $au = {
        ...baseAu,
        type: "custom-element",
        name: options.componentName,
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    };
  }

  for (const [key, value] of Object.entries(state)) {
    (HydrateComponent as { prototype: Record<string, unknown> }).prototype[key] = cloneValue(value);
  }

  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, ctx.platform),
  );
  if (options.register) {
    options.register(container);
  }
  if (options.childComponents) {
    for (const ChildComponent of options.childComponents) {
      CustomElement.clearDefinition(ChildComponent);
      container.register(ChildComponent);
    }
  }

  CustomElement.clearDefinition(HydrateComponent);
  const au = new Aurelia(container);
  let appRoot: Awaited<ReturnType<Aurelia["hydrate"]>>;
  try {
    appRoot = await au.hydrate({
      host: ctx.host,
      component: HydrateComponent,
      ssrScope: (ssrManifest as { manifest?: object }).manifest,
    });
  } catch (error) {
    ctx.dom.window.close();
    throw error;
  }

  return {
    host: ctx.host,
    document: ctx.document,
    dom: ctx.dom,
    vm: appRoot.controller.viewModel as Record<string, unknown>,
    appRoot,
    html: () => ctx.host.innerHTML,
    stop: async () => {
      await appRoot.deactivate();
      if (reuseComponentClass) {
        const baseWithAu = Base as { $au?: Record<string, unknown> };
        if (restoreAu === undefined) {
          delete baseWithAu.$au;
        } else {
          baseWithAu.$au = restoreAu;
        }
        CustomElement.clearDefinition(Base);
      }
      ctx.dom.window.close();
    },
  };
}

export function countElements(root: Element | Document, selector: string): number {
  return root.querySelectorAll(selector).length;
}

export function getTexts(root: Element | Document, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map(
    (el) => el.textContent?.trim() ?? "",
  );
}

export interface DoubleRenderResult {
  total: number;
  texts: string[];
  textCounts: Record<string, number>;
  hasDuplicates: boolean;
  duplicates: string[];
}

export function checkForDoubleRender(
  root: Element | Document,
  selector: string,
): DoubleRenderResult {
  const elements = root.querySelectorAll(selector);
  const texts = Array.from(elements).map((el) => el.textContent?.trim() ?? "");
  const textCounts: Record<string, number> = {};
  for (const text of texts) {
    textCounts[text] = (textCounts[text] || 0) + 1;
  }
  const duplicates = Object.entries(textCounts)
    .filter(([, count]) => count > 1)
    .map(([text, count]) => `"${text}" appears ${count} times`);
  return {
    total: elements.length,
    texts,
    textCounts,
    hasDuplicates: duplicates.length > 0,
    duplicates,
  };
}

function resolveHost(document: Document, hostElement: string): Element {
  const idMatch = hostElement.match(/\bid=["']([^"']+)["']/);
  if (idMatch) {
    const byId = document.getElementById(idMatch[1]);
    if (byId) return byId;
  }
  const tagMatch = hostElement.match(/^([\w-]+)/);
  if (tagMatch) {
    const byTag = document.querySelector(tagMatch[1]);
    if (byTag) return byTag;
  }
  throw new Error(`Host element "${hostElement}" not found in hydration DOM.`);
}

function cloneState(state: Record<string, unknown>): Record<string, unknown> {
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    cloned[key] = cloneValue(value);
  }
  return cloned;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    return JSON.parse(JSON.stringify(value));
  }
  return value;
}
