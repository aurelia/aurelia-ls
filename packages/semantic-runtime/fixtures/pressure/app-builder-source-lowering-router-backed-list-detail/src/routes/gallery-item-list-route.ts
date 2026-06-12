import { resolve } from 'aurelia';
import { GalleryItemBrowseState } from '../gallery-item-browse-state';

export class GalleryItemListRoute {
  readonly state = resolve(GalleryItemBrowseState);
}