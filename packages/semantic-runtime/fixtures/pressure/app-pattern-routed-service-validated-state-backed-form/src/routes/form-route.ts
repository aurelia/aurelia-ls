import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { StateBackedForm } from '../components/state-backed-form';
import { AppState } from '../state/app-state';
import template from './form-route.html';

@customElement({
  name: 'form-route',
  template,
  dependencies: [StateBackedForm],
})
export class FormRoute {
  readonly state = resolve(AppState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    requestId: string;
    mode?: string;
    tag?: string | readonly string[];
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });

  get routeTagCount(): number {
    const tags = this.routeParams.tag;
    if (Array.isArray(tags)) {
      return tags.length;
    }
    return tags == null ? 0 : 1;
  }

  binding(): void {
    void this.state.loadRequests();
  }
}
