// Fails when a colour or a duration is written by hand in the stylesheets instead of coming from a token.
// (Inspired by ds-tokens-example/scripts/lint-hardcoded.mjs.)
import { readFileSync } from 'node:fs';

const FILES = ['src/styles/base.css', 'src/styles/theme.css', 'src/styles/magic.css'];
const RULES = [
  { name: 'colour', pattern: /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|lch)\(/gi },
  { name: 'duration', pattern: /(?<![\w.-])\d*\.?\d+m?s\b/g },
];

const violations = [];
for (const file of FILES) {
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .split('\n')
    .forEach((line, i) => {
      for (const { name, pattern } of RULES) {
        for (const match of line.matchAll(pattern)) violations.push(`${file}:${i + 1}  ${name} ${match[0]}  →  ${line.trim()}`);
      }
    });
}

if (violations.length) {
  console.error(`${violations.length} hard-coded value(s). Use a token (tokens/*.tokens.json).\n`);
  violations.forEach((v) => console.error(`  ${v}`));
  process.exit(1);
}
console.log('No hard-coded colour or duration: everything comes from the tokens.');
