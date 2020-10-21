import convert from 'regexparam';

export interface Handler {
  (params: Record<string, string>, hash: string): void;
}

export interface RouterOptions {
  on404?: Handler;
}

export interface GoOptions {
  replace?: boolean;
  title?: string;
  data?: unknown;
  force?: boolean;
}

interface Route {
  handler: Handler;
  keys: string[];
  pattern: RegExp;
}

function cleanP(p: string, dropQuery = false): string {
  p = p.startsWith('#') ? p.slice(1) : p;
  p = p.startsWith('/') ? p : `/${p}`;
  if (dropQuery) {
    const qmark = p.indexOf('?');
    if (qmark > -1) {
      p = p.slice(0, qmark);
    }
  }
  return p;
}

// Router once mounted will listen to history events and dispatch them to the
// registered handlers.
export default class Router {
  private history = history;
  private window = window;
  private on404?: Handler;
  private routes: Route[] = [];

  constructor({ on404 }: RouterOptions = {}) {
    this.on404 = on404;
  }

  // Navigates to the specified hash. This is a minor convenience over the built
  // in pushState and replaceState methods.
  go(
    hash: string,
    { replace, title, data, force }: GoOptions = { replace: false },
  ): void {
    hash = cleanP(hash);
    const hashP = `#${hash}`;
    if (!force && this.window.location.hash === hashP) {
      return;
    }
    const method = replace ? 'replaceState' : 'pushState';
    this.history[method](data, title ?? document.title, hashP);
    this.dispatch(hash);
  }

  // Register a pattern and the corresponding handler.
  on(pattern: string, handler: Handler): this {
    if (pattern.includes('#')) {
      throw new Error('pattern cannot include a #');
    }
    this.routes.push({
      ...convert(pattern),
      handler,
    });
    return this;
  }

  // Dispatch the handler for the given hash (or the current one if
  // unspecified).
  dispatch(hash = window.location.hash): void {
    hash = cleanP(hash, true);
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i];
      const matches = route.pattern.exec(hash);
      if (!matches) {
        continue;
      }
      const params: Record<string, string> = {};
      route.keys.forEach((name, idx) => {
        params[name] = matches[idx + 1];
      });
      route.handler(params, hash);
      return;
    }
    if (this.on404) {
      this.on404({}, hash);
    }
  }

  // Mount the Router and start listening to events. Does an initial dispatch to
  // the given hash (or the current hash if unspecified). Returns a function
  // that can be invoked to unmount the Router.
  mount(hash = window.location.hash): { (): void } {
    const run = () => this.dispatch();
    this.window.addEventListener('popstate', run);
    this.window.addEventListener('pushstate', run);
    this.window.addEventListener('replacestate', run);
    this.dispatch(hash);
    return () => {
      this.window.removeEventListener('popstate', run);
      this.window.removeEventListener('pushstate', run);
      this.window.removeEventListener('replacestate', run);
    };
  }
}
