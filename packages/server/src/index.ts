import { resolve } from "node:path";
import cors from "@fastify/cors";
import type { Core } from "@markiniser/core";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyInstance } from "fastify";
import { FRONTEND_DIST_LABEL } from "./constants.js";
import { registerRootConfigRoutes, registerRoutes } from "./routes.js";
export {
  getBrowserOpenCommand,
  openBrowser
} from "./browser.js";
export { formatStartupBox } from "./cliUi.js";
export { pickDirectory } from "./directoryPicker.js";
export { createRootConfigController } from "./rootConfig.js";
import { registerStaticHandling } from "./static.js";
import type { RootConfigController } from "./rootConfig.js";

export interface CreateServerOptions {
  core: Core;
  frontendDistPath?: string;
  onWarning?: (message: string) => void;
  rootConfigController?: RootConfigController;
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function createServer(
  options: CreateServerOptions
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(cors, {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    }
  });

  await registerRoutes(app, options.core);
  if (options.rootConfigController) {
    await registerRootConfigRoutes(app, options.rootConfigController);
  }
  await registerStaticHandling(
    app,
    options.frontendDistPath ?? resolve(process.cwd(), FRONTEND_DIST_LABEL),
    options.onWarning ?? ((message) => console.warn(message))
  );

  return app;
}
