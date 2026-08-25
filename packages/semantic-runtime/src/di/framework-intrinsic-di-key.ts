/** Framework DI keys whose identity exists independently of any app-authored registration or hydration site. */
export const enum FrameworkIntrinsicDiKey {
  /** Current/requesting Aurelia container installed by every modeled container. */
  IContainer = 'IContainer',
  /** Current Aurelia application facade installed by the facade constructor. */
  IAurelia = 'IAurelia',
  /** Current app root exposed through the facade constructor's shared InstanceProvider. */
  IAppRoot = 'IAppRoot',
  /** Host DOM node made available while hydrating a controller. */
  INode = 'INode',
  /** Current runtime controller made available during hydration. */
  IController = 'IController',
  /** Current hydration instruction made available during hydration. */
  IInstruction = 'IInstruction',
  /** Render location made available to controller/rendering behavior. */
  IRenderLocation = 'IRenderLocation',
  /** Nested view factory made available to template-controller activation. */
  IViewFactory = 'IViewFactory',
  /** Slot projection metadata made available to custom-element hydration. */
  IAuSlotsInfo = 'IAuSlotsInfo',
  /** Parent hydration context made available to custom-element hydration. */
  IHydrationContext = 'IHydrationContext',
  /** Current route context installed in a routed component container. */
  IRouteContext = 'IRouteContext',
  /** Context-local router facade installed in a routed component container. */
  IContextRouter = 'IContextRouter',
  /** Template compiler service installed by runtime-html's default component registrations. */
  ITemplateCompiler = 'ITemplateCompiler',
  /** Runtime repeat-handler extension point consumed by RepeatableHandlerResolver. */
  IRepeatableHandler = 'IRepeatableHandler',
}

export const frameworkIntrinsicDiKeys: readonly FrameworkIntrinsicDiKey[] = [
  FrameworkIntrinsicDiKey.IContainer,
  FrameworkIntrinsicDiKey.IAurelia,
  FrameworkIntrinsicDiKey.IAppRoot,
  FrameworkIntrinsicDiKey.INode,
  FrameworkIntrinsicDiKey.IController,
  FrameworkIntrinsicDiKey.IInstruction,
  FrameworkIntrinsicDiKey.IRenderLocation,
  FrameworkIntrinsicDiKey.IViewFactory,
  FrameworkIntrinsicDiKey.IAuSlotsInfo,
  FrameworkIntrinsicDiKey.IHydrationContext,
  FrameworkIntrinsicDiKey.IRouteContext,
  FrameworkIntrinsicDiKey.IContextRouter,
  FrameworkIntrinsicDiKey.ITemplateCompiler,
  FrameworkIntrinsicDiKey.IRepeatableHandler,
];

export function frameworkIntrinsicDiKeyLocal(key: FrameworkIntrinsicDiKey): string {
  return `di-key:interface:${key}`;
}

export function frameworkIntrinsicDiKeyForName(name: string): FrameworkIntrinsicDiKey | null {
  return frameworkIntrinsicDiKeys.find((key) => key === name) ?? null;
}
