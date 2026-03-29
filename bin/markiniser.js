#!/usr/bin/env node

const { Command } = require("commander");
const { resolve } = require("node:path");
const { pathToFileURL } = require("node:url");
const { version } = require("../package.json");

const program = new Command();

program
  .name("markiniser")
  .option("-p, --port <port>", "Override the configured port", (value) => Number.parseInt(value, 10))
  .option("-c, --config <path>", "Path to a config file")
  .option("--no-open", "Do not open the app in a browser automatically");

program.parse(process.argv);

const options = program.opts();

async function main() {
  const [
    { createCore, ensureCliConfigPath, loadConfigWithDetails },
    { createRootConfigController, createServer, formatStartupBox, openBrowser, pickDirectory },
    { default: ora },
    { default: chalk }
  ] = await Promise.all([
    import(pathToFileURL(resolve(__dirname, "../packages/core/dist/index.js")).href),
    import(pathToFileURL(resolve(__dirname, "../packages/server/dist/index.js")).href),
    import("ora"),
    import("chalk")
  ]);

  const configPath = options.config ?? (await ensureCliConfigPath({ cwd: process.cwd() }));
  const cliAccent = (text) => chalk.hex("#b4befe")(text);
  const startupSpinner = ora({
    text: "Scanning markdown files...",
    color: "blue"
  }).start();

  try {
    const loadedConfig = await loadConfigWithDetails({
      configPath,
      port: options.port
    });
    const config = loadedConfig.config;
    const core = await createCore(config);
    const initialScan = await core.scanner.scan();

    startupSpinner.text = "Starting server...";

    const server = await createServer({
      core,
      frontendDistPath: resolve(__dirname, "../packages/web/dist"),
      onWarning(message) {
        console.warn(message);
      },
      rootConfigController: createRootConfigController({
        core,
        configPath: loadedConfig.sourcePath,
        browseForRoot: async () =>
          pickDirectory({
            onWarning(message) {
              console.warn(message);
            }
          })
      })
    });

    const shutdown = async (signal) => {
      await Promise.allSettled([server.close()]);
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
    const displayUrl = `http://localhost:${config.port}`;

    await server.listen({
      host: "127.0.0.1",
      port: config.port
    });

    startupSpinner.stop();
    console.log(
      cliAccent(
        formatStartupBox({
          version,
          indexedFiles: initialScan.files.length,
          directoryCount: config.roots.length,
          roots: config.roots,
          url: displayUrl
        })
      )
    );

    if (options.open) {
      openBrowser(appUrl, {
        onWarning(message) {
          console.warn(message);
        }
      });
    }
  } catch (error) {
    startupSpinner.fail(
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
