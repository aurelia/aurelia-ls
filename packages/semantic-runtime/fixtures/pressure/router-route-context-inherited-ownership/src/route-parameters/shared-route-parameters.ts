import { resolve } from '@aurelia/kernel';
import { IRouteContext } from '@aurelia/router';

export abstract class SharedRouteParameters {
  protected readonly routeParameters = resolve(IRouteContext).getRouteParameters<{ sharedId: string }>();
}
