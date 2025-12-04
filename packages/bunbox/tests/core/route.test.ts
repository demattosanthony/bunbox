import { describe, expect, test } from "bun:test";
import { route, json, error, defineMiddleware } from "../../src/core/route";
import type { BunboxRequest } from "../../src/core/types";

const createRequest = (
  overrides: Partial<BunboxRequest> = {}
): BunboxRequest => {
  const base = {
    params: {},
    query: {},
    body: undefined,
  };
  return { ...base, ...overrides } as BunboxRequest;
};

describe("json helper", () => {
  test("defaults to 200 JSON response", async () => {
    const response = json({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ ok: true });
  });

  test("supports ResponseInit overrides", async () => {
    const response = json(
      { ok: true },
      { status: 202, headers: { "X-Test": "1" } }
    );
    expect(response.status).toBe(202);
    expect(response.headers.get("X-Test")).toBe("1");
  });
});

describe("error helper", () => {
  test("wraps message with 400 status", async () => {
    const response = error("bad");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "bad" });
  });

  test("allows custom status codes", () => {
    const response = error("missing", 404);
    expect(response.status).toBe(404);
  });
});

describe("route builder", () => {
  const nameSchema = {
    parse(value: unknown) {
      if (typeof (value as { name?: unknown }).name !== "string") {
        throw new Error("name required");
      }
      return value as { name: string };
    },
  };

  const paramsSchema = {
    parse(value: unknown) {
      if (typeof (value as { id?: unknown }).id !== "string") {
        throw new Error("id required");
      }
      return value as { id: string };
    },
  };

  const querySchema = {
    parse(value: unknown) {
      if (typeof (value as { q?: unknown }).q !== "string") {
        throw new Error("q required");
      }
      return value as { q: string };
    },
  };

  test("serializes plain object results", async () => {
    const handler = route.handle(() => ({ hello: "world" }));
    const response = await handler(createRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hello: "world" });
  });

  test("supports returning custom Response", async () => {
    const handler = route.handle(() => new Response("ok", { status: 201 }));
    const response = await handler(createRequest());
    expect(response.status).toBe(201);
    expect(await response.text()).toBe("ok");
  });

  test("validates params, query, and body", async () => {
    const handler = route
      .params(paramsSchema)
      .query(querySchema)
      .body(nameSchema)
      .handle(({ params, query, body }) => ({
        id: params.id,
        search: query.q,
        greeting: `Hello ${body.name}`,
      }));

    const response = await handler(
      createRequest({
        params: { id: "1" },
        query: { q: "test" },
        body: { name: "Ada" },
      })
    );

    expect(await response.json()).toEqual({
      id: "1",
      search: "test",
      greeting: "Hello Ada",
    });
  });

  test("merges middleware-returned context", async () => {
    const handler = route
      .use(() => ({ user: { id: "42" } }))
      .use((ctx) => ({ audit: `user:${ctx.user.id}` }))
      .handle(({ user, audit }) => ({ userId: user.id, audit }));

    const response = await handler(createRequest());
    expect(await response.json()).toEqual({ userId: "42", audit: "user:42" });
  });

  test("tolerates middleware side effects without return value", async () => {
    let invoked = false;
    const handler = route
      .use(() => {
        invoked = true;
      })
      .handle(() => ({ ok: true }));

    const response = await handler(createRequest());
    expect(invoked).toBe(true);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("exposes ctx.json helper", async () => {
    const handler = route.handle((ctx) => ctx.json({ ok: true }, 202));
    const response = await handler(createRequest());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
  });

  test("works with readonly request properties from server", async () => {
    // Simulate how the server creates BunboxRequest with readonly properties
    const mockReq = new Request("http://localhost/test");
    const bunboxReq = Object.create(mockReq, {
      params: { value: { id: "123" }, writable: false, enumerable: true },
      query: { value: { filter: "all" }, writable: false, enumerable: true },
      body: {
        value: { name: "Test" },
        writable: false,
        enumerable: true,
      },
    }) as BunboxRequest;

    const handler = route.handle(({ params, query, body }) => ({
      params,
      query,
      body,
    }));

    const response = await handler(bunboxReq);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      params: { id: "123" },
      query: { filter: "all" },
      body: { name: "Test" },
    });
  });
});

describe("middleware early exit", () => {
  test("middleware can return Response to short-circuit", async () => {
    const handler = route
      .use(() => new Response("blocked", { status: 403 }))
      .handle(() => ({ never: "reached" }));

    const response = await handler(createRequest());
    expect(response.status).toBe(403);
    expect(await response.text()).toBe("blocked");
  });

  test("middleware can return error() for early exit", async () => {
    const handler = route
      .use(() => error("Unauthorized", 401))
      .handle(() => ({ never: "reached" }));

    const response = await handler(createRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("handler runs when middleware returns context", async () => {
    const handler = route
      .use(() => ({ authorized: true }))
      .handle((ctx) => ({ authorized: ctx.authorized }));

    const response = await handler(createRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: true });
  });

  test("first middleware returning Response stops chain", async () => {
    let secondCalled = false;
    const handler = route
      .use(() => error("stopped", 400))
      .use(() => {
        secondCalled = true;
        return { second: true };
      })
      .handle(() => ({ ok: true }));

    const response = await handler(createRequest());
    expect(response.status).toBe(400);
    expect(secondCalled).toBe(false);
  });

  test("conditional early exit based on request", async () => {
    const mockReq = new Request("http://localhost/test", {
      headers: { Authorization: "Bearer token" },
    });
    // Properly spread the request properties so headers is accessible
    const bunboxReq = {
      ...mockReq,
      headers: mockReq.headers,
      params: {},
      query: {},
      body: null,
    } as unknown as BunboxRequest;

    const auth = defineMiddleware((ctx) => {
      const token = ctx.headers.get("Authorization");
      if (!token) {
        return error("No token", 401);
      }
      return { token };
    });

    const handler = route.use(auth).handle((ctx) => ({ token: ctx.token }));

    const response = await handler(bunboxReq);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: "Bearer token" });
  });

  test("conditional early exit when auth missing", async () => {
    const mockReq = new Request("http://localhost/test");
    const bunboxReq = {
      ...mockReq,
      headers: mockReq.headers,
      params: {},
      query: {},
      body: null,
    } as unknown as BunboxRequest;

    const auth = defineMiddleware((ctx) => {
      const token = ctx.headers.get("Authorization");
      if (!token) {
        return error("No token", 401);
      }
      return { token };
    });

    const handler = route.use(auth).handle((ctx) => ({ token: ctx.token }));

    const response = await handler(bunboxReq);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "No token" });
  });
});

describe("defineMiddleware helper", () => {
  test("defineMiddleware creates valid middleware", async () => {
    const addUser = defineMiddleware(() => ({
      user: { id: "123", name: "Test" },
    }));

    const handler = route.use(addUser).handle((ctx) => ({ user: ctx.user }));

    const response = await handler(createRequest());
    expect(await response.json()).toEqual({
      user: { id: "123", name: "Test" },
    });
  });

  test("defineMiddleware supports async functions", async () => {
    const asyncMiddleware = defineMiddleware(async () => {
      await Promise.resolve();
      return { async: true };
    });

    const handler = route
      .use(asyncMiddleware)
      .handle((ctx) => ({ async: ctx.async }));

    const response = await handler(createRequest());
    expect(await response.json()).toEqual({ async: true });
  });

  test("defineMiddleware can return Response", async () => {
    const earlyExit = defineMiddleware(() => {
      return new Response("early", { status: 418 });
    });

    const handler = route.use(earlyExit).handle(() => ({ never: "called" }));

    const response = await handler(createRequest());
    expect(response.status).toBe(418);
    expect(await response.text()).toBe("early");
  });
});
