import { setCustomElementsManifest, type Preview } from '@storybook/web-components-vite';
import { withActions } from 'storybook/actions/decorator';
import manifest from '../custom-elements.json';
import { EVENT_HANDLER_PROPS } from '../src/core/events';
import '../src/styles/index.css';
import '../src/index';
import './preview.css';

setCustomElementsManifest(manifest);

const preview: Preview = {
  parameters: {
    layout: 'centered',
    // Tokens have their own page; kebab-case attributes duplicate the camelCase controls.
    controls: { expanded: true, sort: 'none', exclude: /^(--po-|po-|mode$|enable$|disable$|tear-|card-back$)/ },
    // Every component event shows in the Actions panel.
    actions: { handles: Object.values(EVENT_HANDLER_PROPS) },
    // Every story is audited by axe; a violation fails `npm run test:stories`.
    a11y: { test: 'error' },
    options: {
      storySort: {
        order: ['Introduction', 'Installation', 'Pack opening', 'Features', 'Magic', ['Guide', 'Effects'], 'Views', 'Headless', 'Theming', 'Tokens', 'Accessibility'],
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Colour theme (semantic tokens)',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    withActions,
    (story, { globals }) => {
      document.documentElement.dataset.theme = String(globals.theme ?? 'light');
      return story();
    },
  ],
};

export default preview;
