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
      DB: bindings.d1({
        id: '49000000-0000-4000-8000-000000000049',
        name: 'connecting-space-local',
        dev: { remote: false },
      }),
    },
  }),
});
