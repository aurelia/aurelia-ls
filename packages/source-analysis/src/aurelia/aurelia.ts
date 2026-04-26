import {
  ContainerWorldRef,
  type RegistrationRef,
  type SourceNodeRef,
  type SymbolRef,
} from './refs.js';
import { AppRoot, type AppRootConfig } from './app-root.js';
import { Container } from './container.js';
import { auLink } from './au-link.js';

export interface AureliaAppConfig extends AppRootConfig {}

@auLink('runtime-html:Aurelia', true)
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
