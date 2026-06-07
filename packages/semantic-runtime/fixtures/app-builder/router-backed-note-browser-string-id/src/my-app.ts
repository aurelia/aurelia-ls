import { route } from '@aurelia/router';
import { NoteItemListRoute } from './routes/note-item-list-route';
import { NoteItemDetailRoute } from './routes/note-item-detail-route';

@route({
  title: 'Note Browser',
  routes: [
    {
      path: '',
      redirectTo: 'notes',
    },
    {
      id: 'noteItems',
      path: 'notes',
      component: NoteItemListRoute,
      title: 'Notes',
      viewport: 'main',
      routes: [
        {
          id: 'note-item-detail',
          path: ':noteId',
          component: NoteItemDetailRoute,
          title: 'Note Detail',
          viewport: 'detail',
        },
      ],
    },
  ],
})
export class MyApp {}