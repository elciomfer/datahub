import Fastify from "fastify";
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

const bucket = new Bucket(10, 1000);

fastify.addHook("onRequest", async (request, reply) => {
  if (!bucket.consume()) {
    reply.code(429).send({ error: "Too many requests" });
  }
});

fastify.get("/", async (request, reply) => {
  reply.send({
    capacity: bucket.capacity,
    consumed: bucket.consumed,
    interval: bucket.interval,
    refilled: bucket.refilled,
  });
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
    await fastify.listen({ port: 3000 });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

startup();
