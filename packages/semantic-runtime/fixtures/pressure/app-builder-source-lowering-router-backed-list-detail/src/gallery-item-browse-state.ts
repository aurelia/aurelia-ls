import { GalleryItem } from './gallery-item';

export class GalleryItemBrowseState {
  readonly items: GalleryItem[] = [
    new GalleryItem(1, 'Alpha'),
    new GalleryItem(2, 'Beta'),
  ];

  findGalleryItem(id: string): GalleryItem | null {
    return this.items.find((galleryItem) => String(galleryItem.id) === id) ?? null;
  }
}
