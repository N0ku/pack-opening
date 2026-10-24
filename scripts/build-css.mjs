// Bundles the stylesheets into dist/css: tokens, base, theme, index (all three) and magic (pack-opening/magic).
import { bundle } from 'lightningcss';
import { mkdirSync, writeFileSync } from 'node:fs';

const FILES = {
  'tokens.css': 'src/styles/generated/tokens.css',
  'base.css': 'src/styles/base.css',
  'theme.css': 'src/styles/theme.css',
  'index.css': 'src/styles/index.css',
  'magic.css': 'src/styles/magic.css',
};

mkdirSync('dist/css', { recursive: true });
for (const [name, filename] of Object.entries(FILES)) {
  const { code } = bundle({ filename, minify: false, sourceMap: false });
  writeFileSync(`dist/css/${name}`, code);
  console.log(`dist/css/${name}  ${(code.length / 1024).toFixed(1)} kB`);
}
