export interface GalleryItemRecord {
  readonly id: number;
  readonly title: string;
  readonly enabled: boolean;
}

export class GalleryItemService {
  private readonly galleryItems: GalleryItemRecord[] = [
    {
      id: 1,
      title: 'Alpha',
      enabled: true,
    },
    {
      id: 2,
      title: 'Beta',
      enabled: false,
    },
  ];

  async listGalleryItems(): Promise<readonly GalleryItemRecord[]> {
    return this.galleryItems;
  }
}
