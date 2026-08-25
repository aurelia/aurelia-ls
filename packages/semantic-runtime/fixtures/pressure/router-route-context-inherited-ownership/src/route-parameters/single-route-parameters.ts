import { resolve } from '@aurelia/kernel';
import { IRouteContext } from '@aurelia/router';

export abstract class SingleRouteParameters {
  protected readonly routeParameters = resolve(IRouteContext).getRouteParameters<{ soloId: string }>();
}
