import { defineConfig } from 'vite';

const external = ['react', 'react-dom', 'react/jsx-runtime', 'vue', 'animejs'];

/**
 * `vite`                   dev sandbox (index.html)
 * `vite build`             ESM entries: element, React, Vue, magic (frameworks and animejs stay external)
 * `vite build -m iife`     one script for <script> tags, which registers <pack-opening>
 * `vite build -m iife-magic` the magic effects for <script> tags, animejs included
 */
export default defineConfig(({ mode }) => ({
  build:
    mode === 'iife'
      ? {
          emptyOutDir: false,
          sourcemap: true,
          lib: { entry: 'src/index.ts', name: 'PackOpening', formats: ['iife'], fileName: () => 'pack-opening.iife.js' },
        }
      : mode === 'iife-magic'
        ? {
            emptyOutDir: false,
            sourcemap: true,
            lib: {
              entry: 'src/magic/index.ts',
              name: 'PackOpeningMagic',
              formats: ['iife'],
              fileName: () => 'pack-opening-magic.iife.js',
            },
          }
        : {
            sourcemap: true,
            lib: {
              entry: { index: 'src/index.ts', react: 'src/react/index.ts', vue: 'src/vue/index.ts', magic: 'src/magic/index.ts' },
              formats: ['es'],
            },
            rollupOptions: { external },
          },
}));
