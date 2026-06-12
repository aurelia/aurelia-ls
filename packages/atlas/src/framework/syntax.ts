/** Source producer lane that exposes a lower-level syntax/runtime product. */
export const enum FrameworkSyntaxProducerKind {
  /** A binding-command class with a build(...) method. */
  BindingCommand = "binding-command",
  /** An IRenderer value registered through the renderer(...) helper. */
  Renderer = "renderer",
  /** A function or method that emits instruction records outside binding-command build(...). */
  InstructionFactory = "instruction-factory",
}

/** Product relation exposed by a framework syntax/runtime producer. */
export const enum FrameworkSyntaxProductKind {
  /** Binding-command build(...) constructs an instruction. */
  BuildsInstruction = "builds-instruction",
  /** Renderer declares the instruction target it handles. */
  HandlesInstruction = "handles-instruction",
  /** Renderer materializes a binding or binding factory call. */
  CreatesBinding = "creates-binding",
  /** Instruction factory emits an instruction record literal. */
  EmitsInstruction = "emits-instruction",
}
