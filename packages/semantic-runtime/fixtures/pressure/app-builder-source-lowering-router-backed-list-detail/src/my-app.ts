import { route } from '@aurelia/router';
import { GalleryItemListRoute } from './routes/gallery-item-list-route';
import { GalleryItemDetailRoute } from './routes/gallery-item-detail-route';

@route({
  title: 'Aurelia Source Gallery Router Gallery',
  routes: [
    {
      path: '',
      redirectTo: 'items',
    },
    {
      id: 'items',
      path: 'items',
      component: GalleryItemListRoute,
      title: 'Items',
      viewport: 'main',
      routes: [
        {
          id: 'gallery-item-detail',
          path: ':itemId',
          component: GalleryItemDetailRoute,
          title: 'Item Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
})
export class MyApp {}