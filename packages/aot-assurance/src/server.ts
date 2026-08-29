import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { extname, resolve, sep } from 'node:path';

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export class StaticBuildServer {
  private server: Server | undefined;
  public url: string | undefined;

  public constructor(private readonly root: string) {}

  public async start(): Promise<string> {
    if (this.server !== undefined) throw new Error(`server for ${this.root} already started`);
    const rootPrefix = this.root.endsWith(sep) ? this.root : `${this.root}${sep}`;
    const server = createServer((request, response) => {
      void serveFile(this.root, rootPrefix, request, response);
    });
    await new Promise<void>((resolveStarted, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolveStarted());
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      server.close();
      throw new Error('static server did not acquire a TCP port');
    }
    this.server = server;
    this.url = `http://127.0.0.1:${address.port}`;
    return this.url;
  }

  public async close(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    this.url = undefined;
    if (server === undefined) return;
    await new Promise<void>((resolveClosed, reject) => {
      server.close(error => error === undefined ? resolveClosed() : reject(error));
    });
  }
}

async function serveFile(
  root: string,
  rootPrefix: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const file = resolve(root, `.${relative}`);
    if (file !== root && !file.startsWith(rootPrefix)) {
      response.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}
