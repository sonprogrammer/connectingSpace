import { bindings, defineConfig, defineWorker } from 'cf/config';

export default defineConfig({
  worker: defineWorker({
    name: 'connecting-space-web',
    entrypoint: 'vinext/server/fetch-handler',
    compatibilityDate: '2026-11-24',
    assets: {
      notFoundHandling: 'none',
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
