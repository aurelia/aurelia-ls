import { resolve } from '@aurelia/kernel';
import { customElement } from '@aurelia/runtime-html';
import { IRouteContext } from '@aurelia/router';
import template from './detail-route.html';

@customElement({
  name: 'detail-route',
  template,
})
export class DetailRoute {
  private readonly routeParams = resolve(IRouteContext).getRouteParameters<{ id: string }>();
  private readonly parentFirstParams = resolve(IRouteContext).getRouteParameters<{ id: string }, 'parent-first'>({
    mergeStrategy: 'parent-first',
  });
  private readonly appendParams = resolve(IRouteContext).getRouteParameters<{ id: readonly string[] }, 'append'>({
    mergeStrategy: 'append',
  });
  private readonly byRouteParams = resolve(IRouteContext).getRouteParameters<{ id: Record<string, string> }, 'by-route'>({
    mergeStrategy: 'by-route',
  });
  private readonly queryParams = resolve(IRouteContext).getRouteParameters<{
    id: string;
    mode: string;
    tag: readonly string[];
  }>({
    includeQueryParams: true,
  });

  get activeId(): string {
    return this.routeParams.id
      || this.parentFirstParams.id
      || this.appendParams.id[0]
      || this.byRouteParams.id.detail
      || this.queryParams.mode
      || this.queryParams.tag[0];
  }
}
