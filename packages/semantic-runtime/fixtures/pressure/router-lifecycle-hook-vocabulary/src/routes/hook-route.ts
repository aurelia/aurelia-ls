import { customElement } from '@aurelia/runtime-html';
import type {
  INavigationOptions,
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

  public load(): void {}
}
