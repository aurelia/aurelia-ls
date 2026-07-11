import { customElement } from '@aurelia/runtime-html';
import type {
  INavigationOptions,
  IRouteConfig,
  IRouteViewModel,
  NavigationInstruction,
  Params,
  RouteNode,
} from '@aurelia/router';
import template from './hook-route.html';

@customElement({
  name: 'hook-route',
  template,
})
export class HookRoute implements IRouteViewModel {
  public readonly child: HookRoute = this;
  public readonly entries = [0];

  public readonly helper = {
    loading(): void {},
    attached(): void {},
  };

  public getRouteConfig(): IRouteConfig {
    return { routes: [] };
  }

  public canLoad(
    _params: Params,
    _next: RouteNode,
    _current: RouteNode | null,
    _options: INavigationOptions,
  ): boolean | NavigationInstruction | NavigationInstruction[] {
    return true;
  }

  public loading(
    _params: Params,
    _next: RouteNode,
    _current: RouteNode | null,
    _options: INavigationOptions,
  ): void {}

  public loaded(
    _params: Params,
    _next: RouteNode,
    _current: RouteNode | null,
    _options: INavigationOptions,
  ): void {}

  public canUnload(
    _next: RouteNode | null,
    _current: RouteNode,
    _options: INavigationOptions,
  ): boolean {
    return true;
  }

  public unloading(
    _next: RouteNode | null,
    _current: RouteNode,
    _options: INavigationOptions,
  ): void {}

  public hydrating(): void {}

  public attached(): void {}

  public load(): void {}

  public unload(): void {}

  public detached(): void {}

  public unbound(): void {}

  public activated(): void {}
}
