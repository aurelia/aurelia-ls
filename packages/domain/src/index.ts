export { compileTemplateToOverlay } from "./compiler/facade.js";
export { PRELUDE_TS } from "./prelude.js";

// Export the DI-backed parsers so the server can construct once and reuse.
export { getAureliaParsers } from "./parsers/aurelia.js";

export type { VmReflection } from "./compiler/phases/50-plan/types.js";
