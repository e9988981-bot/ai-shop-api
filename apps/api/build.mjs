#!/usr/bin/env node
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');

await esbuild.build({
  entryPoints: [join(__dirname, 'src/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'esnext',
  outfile: join(__dirname, 'dist/worker.js'),
  external: [],
  alias: {
    '@ai-shop/shared': join(root, 'packages/shared/src/index.ts'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
