import { customAttribute } from '@aurelia/runtime-html';

@customAttribute('availability-badge')
export class AvailabilityBadge {
  readonly label = 'Available';
}
