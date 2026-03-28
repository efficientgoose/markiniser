#!/usr/bin/env node

const { Command } = require("commander");

const program = new Command();

program
  .name("markiniser")
  .option("-p, --port <port>", "Override the configured port", (value) => Number.parseInt(value, 10))
  .option("-c, --config <path>", "Path to a config file");

program.parse(process.argv);

const options = program.opts();

async function main() {
  const [{ createCore, loadConfig }, { createServer }, path] = await Promise.all([
    import("@markiniser/core"),
    import("@markiniser/server"),
    import("node:path")
  ]);

  const config = await loadConfig({
    configPath: options.config,
    port: options.port
  });
  const core = await createCore(config);
  const initialScan = await core.scanner.scan();
  await core.watcher.start();

  const server = await createServer({
    core,
    frontendDistPath: path.resolve(process.cwd(), "packages/web/dist"),
    onWarning(message) {
      console.warn(message);
    }
  });

  const shutdown = async (signal) => {
    await Promise.allSettled([server.close(), core.watcher.stop()]);
    console.log(`\nShutting down Markiniser (${signal})`);
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  await server.listen({
    host: "127.0.0.1",
    port: config.port
  });

  console.log(`Markiniser running at http://127.0.0.1:${config.port}`);
  console.log(`Indexed ${initialScan.files.length} markdown files`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
