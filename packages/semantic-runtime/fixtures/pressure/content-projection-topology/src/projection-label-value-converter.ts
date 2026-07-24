import { valueConverter } from 'aurelia';

@valueConverter('projectionLabel')
export class ProjectionLabelValueConverter {
  toView(value: string): string {
    return `[${value}]`;
  }
}
