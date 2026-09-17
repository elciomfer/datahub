import Fastify from "fastify";
import { createClient } from "redis";

import Bucket from "./utils/bucket.ts";

function example<T>(value: T): T {
  try {
    if (value) {
      return value;
    }
    return value;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error(String(error));
  }
}

const fastify = Fastify();

const redis = createClient();

const bucket = new Bucket(redis, 10, 5000);

fastify.addHook("onRequest", async (request, reply) => {
  const allowed = await bucket.consume(request.ip);
  if (!allowed) {
    reply.code(429).send({ error: "Too many requests" });
  }
});

fastify.get("/", async (request, reply) => {
  reply.send({ message: "ok" });
});

fastify.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
  const { id } = request.params;
  reply.send(example(id));
});

fastify.post<{ Body: { data: unknown } }>("/", async (request, reply) => {
  const { data } = request.body;
  reply.send(example(data));
});

const startup = async () => {
  try {
    //
    await redis.connect();

    //
    await fastify.listen({ port: 3000 });
  } catch (error) {
    //
    redis.destroy();

    //
    fastify.log.error(error);
    process.exit(1);
  }
};

startup();
