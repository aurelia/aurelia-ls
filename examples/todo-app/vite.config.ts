import { defineConfig } from 'vite';
import aurelia from '@aurelia/vite-plugin';
import { aureliaSSR } from '@aurelia-ls/build/vite';

// Custom HTML shell for SSR with hydration support
// <!--ssr-state--> is replaced with serialized state for client hydration
const ssrShell = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aurelia Todo (SSR)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="/">
  <script type="module" src="/src/main.ts"></script>
</head>
<body>
  <my-app><!--ssr-outlet--></my-app>
  <!--ssr-state-->
</body>
</html>`;

export default defineConfig({
  server: {
    open: !process.env.CI,
    port: 9000,
  },
  esbuild: {
    target: 'es2022'
  },
  resolve: {
    conditions: ['development'],
  },
  plugins: [
    aurelia({
      useDev: true,
    }),
    aureliaSSR({
      entry: './src/my-app.html',
      stripMarkers: false, // Keep markers for client hydration (path-based hydration not yet complete)
      htmlShell: ssrShell,
      state: () => ({
        title: 'Todo App (SSR)',
        newTodoText: '',
        filter: 'all',
        todos: [
          { id: 1, text: 'Learn Aurelia', completed: true },
          { id: 2, text: 'Build awesome app', completed: false },
          { id: 3, text: 'Deploy to production', completed: false },
          { id: 4, text: 'Server-side rendered!', completed: false },
        ],
        get activeTodos() {
          return this.todos.filter((t: { completed: boolean }) => !t.completed).length;
        },
        get completedTodos() {
          return this.todos.filter((t: { completed: boolean }) => t.completed).length;
        },
        get filteredTodos() {
          switch (this.filter) {
            case 'active':
              return this.todos.filter((t: { completed: boolean }) => !t.completed);
            case 'completed':
              return this.todos.filter((t: { completed: boolean }) => t.completed);
            default:
              return this.todos;
          }
        },
      }),
    }),
  ],
});
