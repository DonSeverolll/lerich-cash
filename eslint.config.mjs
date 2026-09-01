import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescriptConfig from 'eslint-config-next/typescript';

/** Flat config nativo do eslint-config-next 16 (sem FlatCompat). */
const config = [
  { ignores: ['.next/**', 'node_modules/**', '.data/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescriptConfig,
];

export default config;
