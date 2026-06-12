import { resolve } from 'aurelia';
import { GalleryItemService } from './services/gallery-item-service';

export class ServiceGallery {
  private readonly galleryItemService = resolve(GalleryItemService);

  readonly itemsPromise: ReturnType<GalleryItemService['listGalleryItems']> = this.galleryItemService.listGalleryItems();
}