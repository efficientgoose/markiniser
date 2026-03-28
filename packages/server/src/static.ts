import { access } from "node:fs/promises";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import {
  FRONTEND_DIST_LABEL,
  FRONTEND_FALLBACK_HTML
} from "./constants.js";

export async function registerStaticHandling(
  app: FastifyInstance,
  frontendDistPath: string,
  onWarning: (message: string) => void
): Promise<void> {
  try {
    await access(frontendDistPath);
    await app.register(fastifyStatic, {
      root: frontendDistPath,
      prefix: "/"
    });
    app.get("/", async (_request, reply) => reply.sendFile("index.html"));
    return;
  } catch {
    onWarning(`[warn] Frontend build not found at ${FRONTEND_DIST_LABEL} — serving API only`);
  }

  app.get("/", async (_request, reply) =>
    reply.type("text/html; charset=utf-8").send(FRONTEND_FALLBACK_HTML)
  );
}
