import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ['.cloudflare/**', '.vinext/**', 'dist/**'],
  },
];

export default eslintConfig;
