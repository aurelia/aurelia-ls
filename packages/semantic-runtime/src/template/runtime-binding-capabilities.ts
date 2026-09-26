import { TemplateBindingMode } from './instruction-ir.js';
import { RuntimeBindingKind, type RuntimeBinding } from './runtime-binding.js';

export const enum RuntimeBindingStateScopeHandoff {
  /** The concrete binding cannot accept the scope supplied by the state behavior. */
  None = 'none',
  /** useScope changes both initial and subsequent expression evaluation. */
  UseScope = 'use-scope',
  /** Initial evaluation uses the bind argument; later reads use the stored scope changed by useScope. */
  AfterInitialEvaluation = 'after-initial-evaluation',
  /** State bindings accept the behavior through useStore rather than useScope. */
  UseStore = 'use-store',
}

/** Concrete native binding capabilities, shared by resource planning and source-scope projection. */
export class RuntimeBindingCapabilities {
  constructor(
    readonly executesAstBind: boolean,
    /** Member presence tested by SignalBindingBehavior.bind, not a guarantee that the callback is meaningful. */
    readonly handlesChange: boolean,
    readonly rateLimit: boolean,
    readonly stateScopeHandoff: RuntimeBindingStateScopeHandoff,
    /** null when the binding does not consult mode; PropertyBinding supplies its instruction mode separately. */
    readonly initialMode: TemplateBindingMode | null,
  ) {}
}

const capabilities: Record<RuntimeBindingKind, RuntimeBindingCapabilities> = {
  [RuntimeBindingKind.Property]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseScope, null),
  [RuntimeBindingKind.Attribute]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.AfterInitialEvaluation, TemplateBindingMode.ToView),
  [RuntimeBindingKind.Let]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseScope, null),
  [RuntimeBindingKind.Listener]: new RuntimeBindingCapabilities(true, false, true, RuntimeBindingStateScopeHandoff.UseScope, null),
  // Each interpolation hole executes through InterpolationPartBinding.
  [RuntimeBindingKind.Interpolation]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseScope, TemplateBindingMode.ToView),
  [RuntimeBindingKind.Ref]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseScope, null),
  [RuntimeBindingKind.Content]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseScope, TemplateBindingMode.ToView),
  [RuntimeBindingKind.Iterate]: new RuntimeBindingCapabilities(true, true, false, RuntimeBindingStateScopeHandoff.AfterInitialEvaluation, null),
  [RuntimeBindingKind.Spread]: new RuntimeBindingCapabilities(false, false, false, RuntimeBindingStateScopeHandoff.None, null),
  [RuntimeBindingKind.SpreadValue]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.AfterInitialEvaluation, null),
  // Translation keys do not astBind; ParameterBinding does, but has neither useScope nor limit.
  [RuntimeBindingKind.Translation]: new RuntimeBindingCapabilities(false, true, true, RuntimeBindingStateScopeHandoff.None, null),
  [RuntimeBindingKind.TranslationParameters]: new RuntimeBindingCapabilities(true, true, false, RuntimeBindingStateScopeHandoff.None, null),
  [RuntimeBindingKind.State]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseStore, TemplateBindingMode.ToView),
  // connectable installs a throwing handleChange stub, so the native signal bind-time presence check passes.
  [RuntimeBindingKind.StateDispatch]: new RuntimeBindingCapabilities(true, true, true, RuntimeBindingStateScopeHandoff.UseStore, null),
};

export function runtimeBindingCapabilities(binding: Pick<RuntimeBinding, 'bindingKind'>): RuntimeBindingCapabilities {
  return capabilities[binding.bindingKind];
}
