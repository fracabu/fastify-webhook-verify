import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/providers/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  treeshake: true,
  splitting: false,
  minify: false,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
});
