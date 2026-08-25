import type {
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { RuntimeWatcherReference } from '../template/runtime-watcher.js';
import type { RuntimeObservedDependencyOccurrence } from './runtime-observed-dependency.js';

/** Expression read collected by a controller-owned watcher execution path. */
export class RuntimeWatcherObservedDependency {
  constructor(
    readonly productHandle: ProductHandle,
    readonly identityHandle: IdentityHandle,
    readonly watcher: RuntimeWatcherReference,
    readonly expressionProductHandle: ProductHandle | null,
    readonly occurrence: RuntimeObservedDependencyOccurrence,
  ) {}
}
