#!/usr/bin/env node

const { Command } = require("commander");

const program = new Command();

program
  .name("markiniser")
  .option("-p, --port <port>", "Override the configured port", (value) => Number.parseInt(value, 10))
  .option("-c, --config <path>", "Path to a config file")
  .option("--no-open", "Do not open the app in a browser automatically")
  .option("--no-watch", "Disable live file watching");

program.parse(process.argv);

const options = program.opts();

async function main() {
  const [{ createCore, loadConfig }, { createServer, createWatcherSupervisor, openBrowser, startWatcherInBackground }, path] = await Promise.all([
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
  const watcherSupervisor = createWatcherSupervisor({
    watcher: core.watcher,
    onWarning(message) {
      console.warn(message);
    }
  });

  const server = await createServer({
    core,
    frontendDistPath: path.resolve(process.cwd(), "packages/web/dist"),
    onWarning(message) {
      console.warn(message);
    }
  });

  const shutdown = async (signal) => {
    await Promise.allSettled([server.close(), watcherSupervisor.stop()]);
    console.log(`\nShutting down Markiniser (${signal})`);
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  const appUrl = `http://127.0.0.1:${config.port}`;

  await server.listen({
    host: "127.0.0.1",
    port: config.port
  });

  console.log(`Markiniser running at ${appUrl}`);
  console.log(`Indexed ${initialScan.files.length} markdown files`);

  if (options.open) {
    openBrowser(appUrl, {
      onWarning(message) {
        console.warn(message);
      }
    });
  }

  if (options.watch) {
    startWatcherInBackground(watcherSupervisor, (message) => {
      console.warn(message);
    });
  } else {
    console.warn("[warn] File watching disabled via --no-watch");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
