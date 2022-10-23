import { parse } from 'regexparam'

export interface Handler {
  (params: Record<string, string>, hash: string): void
}

export interface RouterOptions {
  on404?: Handler
}

export interface GoOptions {
  replace?: boolean
  title?: string
  data?: unknown
  force?: boolean
}

interface Route {
  handler: Handler
  keys: string[]
  pattern: RegExp
}

const validHash = (hash: string): void => {
  if (!hash.startsWith('#/') && hash !== '') {
    throw new Error('hash must begin with #/')
  }
}

// Router once mounted will listen to history events and dispatch them to the
// registered handlers.
export default class Router {
  private on404?: Handler
  private routes: Route[] = []

  constructor({ on404 }: RouterOptions = {}) {
    this.on404 = on404
  }

  // Navigates to the specified hash. This is a minor convenience over the built
  // in pushState and replaceState methods.
  go(
    hash: string,
    { replace, title, data, force }: GoOptions = { replace: false },
  ): void {
    validHash(hash)
    if (!force && location.hash === hash) {
      return
    }
    const method = replace ? 'replaceState' : 'pushState'
    history[method](data, title ?? document.title, hash)
    this.dispatch(hash)
  }

  // Register a pattern and the corresponding handler.
  on(pattern: string, handler: Handler): this {
    validHash(pattern)
    pattern = pattern.substring(1) // drop leading # for regexparam
    this.routes.push({
      ...parse(pattern),
      handler,
    })
    return this
  }

  // Dispatch the handler for the given hash (or the current one if
  // unspecified).
  dispatch(hash = location.hash): void {
    validHash(hash)
    const original = hash
    const qmark = hash.indexOf('?')
    if (qmark > -1) {
      hash = hash.slice(0, qmark)
    }
    hash = hash.substring(1) // drop leading # for regexparam
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i]
      const matches = route.pattern.exec(hash)
      if (!matches) {
        continue
      }
      const params: Record<string, string> = {}
      route.keys.forEach((name, idx) => {
        params[name] = matches[idx + 1]
      })
      route.handler(params, original)
      return
    }
    if (this.on404) {
      this.on404({}, original)
    }
  }

  // Mount the Router and start listening to events. Does an initial replace and
  // dispatch to the given hash, the current hash if one is set, or falling back
  // to #/. Returns a function that can be invoked to unmount the Router.
  mount(hash = location.hash): { (): void } {
    const run = () => this.dispatch()
    window.addEventListener('popstate', run)
    window.addEventListener('pushstate', run)
    window.addEventListener('replacestate', run)
    this.go(hash, { replace: true, force: true })
    return () => {
      window.removeEventListener('popstate', run)
      window.removeEventListener('pushstate', run)
      window.removeEventListener('replacestate', run)
    }
  }
}
