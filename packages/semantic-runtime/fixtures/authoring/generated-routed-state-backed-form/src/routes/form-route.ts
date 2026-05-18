import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
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
  private readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    requestId: string;
    mode?: string;
    tag?: string | readonly string[];
  }>({ includeQueryParams: true });

  get requestId(): string {
    return this.routeParams.requestId;
  }

  get routeMode(): string {
    return this.routeParams.mode ?? 'edit';
  }

  get routeTagCount(): number {
    const tags = this.routeParams.tag;
    if (Array.isArray(tags)) {
      return tags.length;
    }
    return tags == null ? 0 : 1;
  }

}
