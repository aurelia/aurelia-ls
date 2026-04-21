import { Controller, type SyntheticView } from './controller.js';
import type { CompilerAnonymousElementDefinition } from './compiled-template.js';
import type { CompilerConsultedWorld } from './compiler-consulted-world.js';
import type { CompilerChildWorldFormation } from './child-world-formation.js';

export class ViewFactory {
  constructor(
    readonly id: string,
    readonly world: CompilerConsultedWorld,
    readonly definition: CompilerAnonymousElementDefinition,
    readonly worldFormation: CompilerChildWorldFormation | null = null,
    readonly note: string | null = null,
  ) {}

  create(
    parentController?: Controller | null,
  ): SyntheticView {
    // NOTE: runtime synthetic-view creation clones/adopts DOM nodes and then
    // hydrates targets immediately. The clean-room currently creates the
    // controller/view shell first so child-world formation and later recursive
    // realization can stay explicit.
    return Controller.$view(this, parentController ?? null);
  }
}
