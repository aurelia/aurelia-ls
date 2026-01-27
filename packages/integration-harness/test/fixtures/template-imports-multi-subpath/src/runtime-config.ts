import type { IContainer } from "@aurelia/kernel";
import { HighlightAttribute, UserCard } from "../../../../../../packages/compiler/test/20-link/npm/fixtures/multi-class/src/index.js";
import { SubCard } from "../../../../../../packages/compiler/test/20-link/npm/fixtures/multi-class/src/subpath/index.js";

export const MultiClassRuntimeConfiguration = {
  register(container: IContainer) {
    container.register(UserCard, HighlightAttribute, SubCard);
  },
};
