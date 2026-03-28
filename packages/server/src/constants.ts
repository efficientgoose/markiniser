export const LOCAL_HOST = "127.0.0.1";
export const FRONTEND_DIST_LABEL = "packages/web/dist";
export const FRONTEND_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markiniser API</title>
  </head>
  <body>
    <main>
      <p>Markiniser API is running. Frontend not built yet.</p>
      <p>Run <code>npm run build -w packages/web</code> or use the dev server.</p>
    </main>
  </body>
</html>
`;
