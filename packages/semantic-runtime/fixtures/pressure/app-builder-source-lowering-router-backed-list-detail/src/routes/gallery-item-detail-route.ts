import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { GalleryItemBrowseState } from '../gallery-item-browse-state';
import { GalleryItem } from '../gallery-item';

export class GalleryItemDetailRoute {
  readonly state = resolve(GalleryItemBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    itemId: string;
  }>();

  get galleryItem(): GalleryItem | null {
    return this.state.findGalleryItem(this.routeParams.itemId);
  }
}