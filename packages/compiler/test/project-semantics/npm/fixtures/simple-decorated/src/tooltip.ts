import { customAttribute, bindable } from 'aurelia';

/**
 * A simple tooltip attribute.
 * Test fixture demonstrating basic decorator usage.
 */
@customAttribute({ name: 'tooltip', defaultProperty: 'content' })
export class TooltipCustomAttribute {
  /** The tooltip content - primary bindable */
  @bindable()
  content: string = '';

  /** Position of the tooltip */
  @bindable()
  position: 'top' | 'bottom' | 'left' | 'right' = 'top';

  /** Whether the tooltip is currently visible */
  @bindable()
  visible: boolean = false;
}
