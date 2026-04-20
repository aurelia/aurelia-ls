import type {
  ContainerWorldRef,
  SourceNodeRef,
  SymbolRef,
} from './refs.js';
import { Container } from './container.js';

export interface AppRootConfig {
  readonly host: SourceNodeRef | null;
  readonly component: SymbolRef | SourceNodeRef | null;
  readonly container?: Container | null;
  readonly enhance?: boolean;
}

// Mirrors the runtime-html AppRoot role more closely than the previous World
// placeholder did: one root application/controller boundary over a concrete
// container world.
export class AppRoot {
  readonly config: AppRootConfig;
  readonly container: Container;
  readonly handle: ContainerWorldRef;
  readonly host: SourceNodeRef | null;
  readonly component: SymbolRef | SourceNodeRef | null;

  constructor(
    config: AppRootConfig,
    container: Container,
    handle: ContainerWorldRef,
  ) {
    this.config = config;
    this.container = container;
    this.handle = handle;
    this.host = config.host;
    this.component = config.component;
  }
}
