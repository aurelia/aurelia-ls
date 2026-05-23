import type { OverlayAction } from './model';

export class BoundControllerState {
  readonly actions: readonly OverlayAction[] = [
    { id: 'one', label: 'One' },
  ];

  readonly handleAction = (action: OverlayAction): boolean => action.id.length > 0;
}
