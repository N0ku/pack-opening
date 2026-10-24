// Custom Elements Manifest: drives Storybook's autodocs and the VS Code HTML/CSS IntelliSense data.
import { readFileSync } from 'node:fs';
import { customElementVsCodePlugin } from 'custom-element-vs-code-integration';

const tokens = JSON.parse(readFileSync('src/styles/generated/tokens.json', 'utf8'));

/** Adds the component tokens (single source: tokens/*.tokens.json) as CSS custom properties. */
const componentTokens = () => ({
  name: 'po-component-tokens',
  packageLinkPhase({ customElementsManifest }) {
    for (const mod of customElementsManifest.modules) {
      for (const declaration of mod.declarations ?? []) {
        if (declaration.tagName !== 'pack-opening') continue;
        // ES private members (#…) are implementation details.
        declaration.members = (declaration.members ?? []).filter((member) => !member.name.startsWith('#'));
        declaration.cssProperties = tokens
          .filter((token) => token.layer === 'component')
          .map((token) => ({
            name: token.name,
            description: token.description || undefined,
            default: typeof token.value === 'string' ? token.value : JSON.stringify(token.value),
          }));
      }
    }
  },
});

export default {
  globs: ['src/element/pack-opening-element.ts'],
  outdir: '.',
  plugins: [
    componentTokens(),
    customElementVsCodePlugin({
      outdir: './dist',
      htmlFileName: 'vscode.html-custom-data.json',
      cssFileName: 'vscode.css-custom-data.json',
      descriptionSrc: 'description',
      hideLogs: true,
    }),
  ],
};
