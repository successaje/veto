import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';

/**
 * The landing page is index.html; the app is app.html and owns /app/* and /r/* client-side.
 * Firebase Hosting does the same rewrite in production (see firebase.json).
 */
const APP_PATH = /^\/(app(\/[^.]*)?|r\/[^./]+)\/?(\?.*)?$/;

function appRoutes(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url && APP_PATH.test(req.url)) req.url = '/app.html';
    next();
  };
  return {
    name: 'veto-app-routes',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

/** A production bundle must never carry an App Check debug token: it would let anyone bypass App Check. */
function assertNoDebugToken(mode: string): void {
  if (mode === 'production' && loadEnv(mode, __dirname, 'VITE_').VITE_APPCHECK_DEBUG_TOKEN) {
    throw new Error(
      'VITE_APPCHECK_DEBUG_TOKEN is set for a production build. Move it to web/.env.development.local.',
    );
  }
}

export default defineConfig(({ mode }) => {
  assertNoDebugToken(mode);
  return {
    plugins: [appRoutes()],
    // The app imports ../shared (attribute vocabulary) and ../eval (fixtures) from outside web/.
    server: { fs: { allow: ['..'] } },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          app: resolve(__dirname, 'app.html'),
          eval: resolve(__dirname, 'eval.html'),
        },
      },
    },
  };
});
