import type { IActionHandler } from '@aurelia/state';

export interface GalleryState {
  readonly items: readonly { readonly id: number; readonly label: string }[];
  readonly title: string;
}

export const initialGalleryState: GalleryState = {
  items: [
    { id: 1, label: 'Alpha' },
    { id: 2, label: 'Beta' },
  ],
  title: 'Gallery',
};

export const usersGalleryState: GalleryState = {
  items: [
    { id: 3, label: 'Gamma' },
  ],
  title: 'Users',
};

export const galleryStateHandler: IActionHandler<GalleryState> = (state, action) => {
  const typedAction = readGalleryAction(action);
  switch (typedAction?.type) {
    case 'activate':
      return state;
    default:
      return state;
  }
};

function readGalleryAction(action: unknown): { readonly type: 'activate' } | null {
  return action != null && typeof action === 'object' && (action as { readonly type?: unknown }).type === 'activate'
    ? { type: 'activate' }
    : null;
}
