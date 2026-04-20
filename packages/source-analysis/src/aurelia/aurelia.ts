import {
  ContainerWorldRef,
  type RegistrationRef,
  type SourceNodeRef,
  type SymbolRef,
} from './refs.js';
import { AppRoot, type AppRootConfig } from './app-root.js';
import { Container } from './container.js';

export interface AureliaAppConfig extends AppRootConfig {}

// This is the true runtime-shaped root: a root container plus an AppRoot
// construction surface. It is a better clean-room mirror than the previous
// generic World wrapper.
export class Aurelia {
  private rootValue: AppRoot | null = null;
  readonly container: Container;

  constructor(
    container: Container,
  ) {
    this.container = container;
  }

  get root(): AppRoot | null {
    return this.rootValue;
  }

  register(
    ...registrations: readonly RegistrationRef[]
  ): this {
    for (const registration of registrations) {
      this.container.register(registration);
    }
    return this;
  }

  app(
    config: AureliaAppConfig,
  ): AppRoot {
    this.rootValue = this.createAppRoot(config);
    return this.rootValue;
  }

  private createAppRoot(
    config: AureliaAppConfig,
  ): AppRoot {
    const container = config.container ?? this.container.createChild(this.createChildWorld(config.component));
    return new AppRoot(config, container, container.world);
  }

  private createChildWorld(
    owner: SymbolRef | SourceNodeRef | null,
  ): ContainerWorldRef {
    return new ContainerWorldRef(
      `${this.container.world.id}/app-root:${this.nextOwnerId(owner)}`,
      owner,
      this.container.world.id,
    );
  }

  private nextOwnerId(
    owner: SymbolRef | SourceNodeRef | null,
  ): string {
    if (owner == null) {
      return 'anonymous';
    }
    return owner.id.replaceAll(':', '_');
  }
}
