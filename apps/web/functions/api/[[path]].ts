interface Env {
  STATUS: { fetch: (request: Request) => Promise<Response> }
}

interface Context {
  request: Request
  env: Env
}

export function onRequestGet({ request, env }: Context): Promise<Response> {
  return env.STATUS.fetch(request)
}
