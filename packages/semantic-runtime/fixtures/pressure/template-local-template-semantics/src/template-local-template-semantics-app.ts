import { customElement } from '@aurelia/runtime-html';
import { OwnerBadge } from './owner-badge';
import template from './template-local-template-semantics-app.html';

export interface LocalTemplateEntry {
  label: string;
}

@customElement({
  name: 'template-local-template-semantics-app',
  template,
  dependencies: [OwnerBadge],
})
export class TemplateLocalTemplateSemanticsApp {
  oneTimeValue = 'one-time';
  toViewValue = 'to-view';
  fromViewValue = 'from-view';
  twoWayValue = 'two-way';
  defaultValue = 'default';
  camelCaseValue = 'camel-case';
  ownerSummary = 'owner-scope';
  entries: LocalTemplateEntry[] = [
    { label: 'first' },
    { label: 'second' },
  ];
}
