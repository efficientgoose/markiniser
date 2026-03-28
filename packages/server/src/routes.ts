import type { Core, FlatFile } from "@markiniser/core";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { RootConfigController } from "./rootConfig.js";

function decodePathParam(pathValue: string): string {
  return decodeURIComponent(pathValue);
}

function mapFileAccessError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof Error) {
    if (error.message.includes("allowed roots")) {
      return { statusCode: 403, message: error.message };
    }
    if (error.message.includes("markdown")) {
      return { statusCode: 400, message: error.message };
    }
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { statusCode: 404, message: "File not found." };
    }
  }

  return { statusCode: 500, message: "Internal server error." };
}

function toIndexedFile(file: FlatFile) {
  return {
    path: file.path,
    name: file.name,
    content: file.content,
    size: file.size,
    lastModified: file.lastModified
  };
}

export async function registerRoutes(app: FastifyInstance, core: Core): Promise<void> {
  app.get(
    "/api/files",
    {
      schema: {
        response: {
          200: Type.Object({
            tree: Type.Array(Type.Any())
          })
        }
      }
    },
    async () => ({
      tree: core.getTree()
    })
  );

  app.get<{ Params: { path: string } }>(
    "/api/files/:path",
    {
      schema: {
        params: Type.Object({
          path: Type.String()
        })
      }
    },
    async (request, reply) => {
      const filePath = decodePathParam(request.params.path);

      try {
        const [content, metadata] = await Promise.all([
          core.fileAccess.read(filePath),
          core.fileAccess.getMetadata(filePath)
        ]);

        return {
          content,
          name: metadata.name,
          path: metadata.path,
          lastModified: metadata.lastModified,
          size: metadata.size
        };
      } catch (error) {
        const mappedError = mapFileAccessError(error);
        return reply.status(mappedError.statusCode).send({
          error: mappedError.message
        });
      }
    }
  );

  app.put<{ Params: { path: string }; Body: { content: string } }>(
    "/api/files/:path",
    {
      schema: {
        params: Type.Object({
          path: Type.String()
        }),
        body: Type.Object({
          content: Type.String()
        })
      }
    },
    async (request, reply) => {
      const filePath = decodePathParam(request.params.path);

      try {
        await core.fileAccess.write(filePath, request.body.content);
        const metadata = await core.fileAccess.getMetadata(filePath);
        core.indexer.removeFromIndex(metadata.path);
        core.indexer.addToIndex(
          toIndexedFile({
            ...metadata,
            content: request.body.content
          })
        );
        await core.scanner.scan();

        return {
          success: true,
          lastModified: metadata.lastModified
        };
      } catch (error) {
        const mappedError = mapFileAccessError(error);
        return reply.status(mappedError.statusCode).send({
          error: mappedError.message
        });
      }
    }
  );

  app.get<{ Querystring: { q?: string } }>(
    "/api/search",
    {
      schema: {
        querystring: Type.Object({
          q: Type.Optional(Type.String())
        }),
        response: {
          200: Type.Object({
            results: Type.Array(
              Type.Object({
                path: Type.String(),
                name: Type.String(),
                snippet: Type.String(),
                score: Type.Number()
              })
            ),
            count: Type.Number()
          })
        }
      }
    },
    async (request) => {
      const query = request.query.q?.trim() ?? "";
      if (!query) {
        return {
          results: [],
          count: 0
        };
      }

      const results = core.indexer.search(query);
      return {
        results,
        count: results.length
      };
    }
  );
}

function mapRootConfigError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof Error) {
    if (
      error.message.includes("absolute path") ||
      error.message.includes("does not exist") ||
      error.message.includes("directory")
    ) {
      return { statusCode: 400, message: error.message };
    }

    if (
      error.message.includes("writable config") ||
      error.message.includes("cannot be updated automatically")
    ) {
      return { statusCode: 409, message: error.message };
    }
  }

  return { statusCode: 500, message: "Internal server error." };
}

export async function registerRootConfigRoutes(
  app: FastifyInstance,
  rootConfigController: RootConfigController
): Promise<void> {
  app.get("/api/config", async () => ({
    roots: rootConfigController.getRoots()
  }));

  app.post("/api/config/root/browse", async (_request, reply) => {
    try {
      return {
        path: await rootConfigController.browseForRoot()
      };
    } catch (error) {
      const mappedError = mapRootConfigError(error);
      return reply.status(mappedError.statusCode).send({
        error: mappedError.message
      });
    }
  });

  app.put<{ Body: { path: string } }>(
    "/api/config/root",
    {
      schema: {
        body: Type.Object({
          path: Type.String()
        })
      }
    },
    async (request, reply) => {
      try {
        return await rootConfigController.setPrimaryRoot(request.body.path);
      } catch (error) {
        const mappedError = mapRootConfigError(error);
        return reply.status(mappedError.statusCode).send({
          error: mappedError.message
        });
      }
    }
  );
}
