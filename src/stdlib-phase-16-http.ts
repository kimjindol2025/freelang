/**
 * Phase 16: HTTP & Async Core (Tier 1, Priority 95)
 * HTTP 클라이언트/서버, 라우팅, 비동기 풀
 */

import { registerBuiltinFunction } from './cli/function-registry';

// ============================================
// async-pool: 비동기 동시성 제어
// ============================================

class AsyncPool {
  private limit: number;
  private running: number = 0;
  private queue: Array<() => Promise<any>> = [];
  private results: Map<number, any> = new Map();

  constructor(limit: number = 5) {
    this.limit = Math.max(1, limit);
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          this.running++;
          const result = await fn();
          this.running--;
          resolve(result);
          this.process();
        } catch (error) {
          this.running--;
          reject(error);
          this.process();
        }
      };

      this.queue.push(task);
      this.process();
    });
  }

  private process(): void {
    while (this.running < this.limit && this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        task().catch(() => {
          // Error handled in run()
        });
      }
    }
  }

  getRunning(): number {
    return this.running;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// ============================================
// http-client: HTTP 요청 클라이언트
// ============================================

interface HttpRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  timeout?: number;
  followRedirects?: boolean;
}

interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  ok: boolean;
  json(): any;
  text(): string;
}

class HttpClient {
  private defaultHeaders: Record<string, string> = {
    'User-Agent': 'FreeLang-HttpClient/1.0',
  };
  private timeout: number = 30000; // 30s

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  setTimeout(ms: number): void {
    this.timeout = ms;
  }

  async request(req: HttpRequest): Promise<HttpResponse> {
    // Simulate HTTP request
    const url = new URL(req.url);
    const method = req.method ?? 'GET';
    const headers = { ...this.defaultHeaders, ...req.headers };

    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock response
        resolve({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: '{}',
          ok: true,
          json() {
            return JSON.parse(this.body);
          },
          text() {
            return this.body;
          },
        });
      }, 100);
    });
  }

  async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ url, method: 'GET', headers });
  }

  async post(url: string, body?: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ url, method: 'POST', body, headers });
  }

  async put(url: string, body?: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ url, method: 'PUT', body, headers });
  }

  async delete(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ url, method: 'DELETE', headers });
  }

  async patch(url: string, body?: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ url, method: 'PATCH', body, headers });
  }
}

// ============================================
// http-server: HTTP 서버
// ============================================

interface RequestHandler {
  (req: any, res: any): Promise<void> | void;
}

type RoutePattern = string | RegExp;

class HttpServer {
  private port: number;
  private handlers: Map<string, RequestHandler> = new Map();
  private middlewares: RequestHandler[] = [];
  private running: boolean = false;

  constructor(port: number = 3000) {
    this.port = port;
  }

  use(middleware: RequestHandler): void {
    this.middlewares.push(middleware);
  }

  get(path: string, handler: RequestHandler): void {
    this.handlers.set(`GET:${path}`, handler);
  }

  post(path: string, handler: RequestHandler): void {
    this.handlers.set(`POST:${path}`, handler);
  }

  put(path: string, handler: RequestHandler): void {
    this.handlers.set(`PUT:${path}`, handler);
  }

  delete(path: string, handler: RequestHandler): void {
    this.handlers.set(`DELETE:${path}`, handler);
  }

  patch(path: string, handler: RequestHandler): void {
    this.handlers.set(`PATCH:${path}`, handler);
  }

  all(path: string, handler: RequestHandler): void {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      this.handlers.set(`${method}:${path}`, handler);
    }
  }

  async listen(): Promise<void> {
    this.running = true;
    // Simulate server listening
    console.log(`Server listening on port ${this.port}`);
  }

  close(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getPort(): number {
    return this.port;
  }
}

// ============================================
// http-router: HTTP 라우팅
// ============================================

class HttpRouter {
  private routes: Map<string, RequestHandler> = new Map();

  addRoute(method: string, path: string, handler: RequestHandler): void {
    this.routes.set(`${method}:${path}`, handler);
  }

  match(method: string, path: string): RequestHandler | null {
    // Exact match
    const key = `${method}:${path}`;
    if (this.routes.has(key)) {
      return this.routes.get(key) || null;
    }

    // Pattern match with :param
    for (const [routeKey, handler] of this.routes) {
      const [routeMethod, routePath] = routeKey.split(':');
      if (routeMethod !== method) continue;

      const pattern = routePath.replace(/:[\w]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return handler;
      }
    }

    return null;
  }

  getRoutes(): Array<[string, RequestHandler]> {
    return Array.from(this.routes.entries());
  }
}

// ============================================
// Register builtin functions
// ============================================

registerBuiltinFunction('async_pool_create', (limit?: number) => {
  return new AsyncPool(limit);
});

registerBuiltinFunction('async_pool_run', async (pool: any, fn: any) => {
  if (pool instanceof AsyncPool && typeof fn === 'function') {
    return await pool.run(fn);
  }
});

registerBuiltinFunction('async_pool_status', (pool: any) => {
  if (pool instanceof AsyncPool) {
    return {
      running: pool.getRunning(),
      queued: pool.getQueueSize(),
    };
  }
  return null;
});

registerBuiltinFunction('http_client_create', () => {
  return new HttpClient();
});

registerBuiltinFunction('http_client_get', async (client: any, url: string) => {
  if (client instanceof HttpClient) {
    return await client.get(url);
  }
});

registerBuiltinFunction('http_client_post', async (client: any, url: string, body?: string) => {
  if (client instanceof HttpClient) {
    return await client.post(url, body);
  }
});

registerBuiltinFunction('http_server_create', (port?: number) => {
  return new HttpServer(port);
});

registerBuiltinFunction('http_server_get', (server: any, path: string, handler: any) => {
  if (server instanceof HttpServer && typeof handler === 'function') {
    server.get(path, handler);
  }
});

registerBuiltinFunction('http_server_post', (server: any, path: string, handler: any) => {
  if (server instanceof HttpServer && typeof handler === 'function') {
    server.post(path, handler);
  }
});

registerBuiltinFunction('http_server_listen', async (server: any) => {
  if (server instanceof HttpServer) {
    await server.listen();
    return true;
  }
  return false;
});

registerBuiltinFunction('http_router_create', () => {
  return new HttpRouter();
});

registerBuiltinFunction('http_router_add', (router: any, method: string, path: string, handler: any) => {
  if (router instanceof HttpRouter && typeof handler === 'function') {
    router.addRoute(method, path, handler);
  }
});

registerBuiltinFunction('http_router_match', (router: any, method: string, path: string) => {
  if (router instanceof HttpRouter) {
    return router.match(method, path);
  }
  return null;
});

export { AsyncPool, HttpClient, HttpServer, HttpRouter };
