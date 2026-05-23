export interface TagChoice {
  readonly id: string;
  readonly label: string;
}

export class FormState {
  quantity = 2;
  contextualQuantity = 4;
  fallbackQuantity = 3;
  modeFromViewText = 'from-view';
  modeTwoWayText = 'two-way';
  readonly flags = [false, true];
  readonly itemNames = ['i-0', 'i-1', 'i-2'];
  readonly tags: TagChoice[] = [
    { id: 'expedite', label: 'Expedite' },
    { id: 'gift', label: 'Gift wrap' },
  ];
  readonly selectedByTagId: Record<string, boolean> = {
    expedite: false,
    gift: true,
  };
}
