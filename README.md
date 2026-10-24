# pack-opening

Design system pour animer l’**ouverture d’un booster de cartes**. On glisse le long du haut du paquet pour le
déchirer, les cartes sortent, on les retourne et on les fait défiler jusqu’au résumé.

- **Une fondation, plusieurs intégrations** : le custom element `<pack-opening>` (HTML pur, CDN, npm) et des wrappers typés **React** et **Vue**.
- **Deux modes** : `auto`, où l’on passe le booster et les cartes en enfants, et `headless`, où l’on écrit son propre markup.
- **Logique, style et HTML séparés** : le TypeScript n’écrit que des attributs d’état et des variables CSS, et toute l’animation est en CSS.
- **Tokens DTCG** en trois couches (core, semantic light/dark, component), construits avec Style Dictionary.
- **Features à la carte** : un preset, puis `enable` / `disable`.
- **Effets magiques optionnels** (`pack-opening/magic`) : particules translucides animées par anime.js, une couleur par effet.
- **Accessible** (WCAG 2.2 AA) : bouton natif, clavier complet, focus géré, annonces, pas de spoiler, `prefers-reduced-motion`.

La documentation complète et le playground sont dans **Storybook** (`npm run storybook`).

## Intégrer

### HTML / CSS / JS sans build

```html
<link rel="stylesheet" href="pack-opening/css/index.css" />
<script src="pack-opening/pack-opening.iife.js"></script>

<pack-opening card-back="img/dos.png" disable="haptics sparks">
  <img data-pack src="img/booster.png" alt="Booster série 1" />
  <img data-card src="img/carte-1.png" alt="Flammèche" />
  <img data-card src="img/carte-2.png" alt="Voltix" data-rarity="rare" data-value="voltix" />
</pack-opening>
```

Voir [examples/html/index.html](examples/html/index.html).

### npm

```js
import 'pack-opening';                // enregistre <pack-opening>
import 'pack-opening/css/index.css'; // tokens + base + thème
```

### React

```tsx
import { PackOpening, PackCard } from 'pack-opening/react';

<PackOpening pack={<img src="/booster.png" alt="" />} cardBack="/dos.png" disable={['sparks']}
  onCardReveal={(card) => console.log(card.name, card.value)}>
  <PackCard rarity="rare" value="voltix"><img src="/c1.png" alt="Voltix" /></PackCard>
</PackOpening>
```

### Vue

```vue
<PackOpening card-back="/dos.png" preset="minimal" :enable="['burst']" @card-reveal="onReveal">
  <template #pack><img src="/booster.png" alt="" /></template>
  <PackCard rarity="legendary" value="astralis"><img src="/c5.png" alt="Astralis" /></PackCard>
</PackOpening>
```

React (≥ 18), Vue (≥ 3.4) et anime.js (≥ 4, pour `pack-opening/magic`) sont des peerDependencies
**optionnelles**. Les deux wrappers rendent la structure eux-mêmes (mode headless sous le capot) : le framework
reste maître de chaque nœud.

## Features

| Preset | Contenu |
| --- | --- |
| `full` (défaut) | Tout est activé (les effets magiques ne tournent qu’avec `pack-opening/magic`). |
| `minimal` | `swipe`, `tap`, `card-swipe`, `skip`, `hint`, `summary` : interactions et guidage, sans effet décoratif. |
| `none` | Rien. On construit avec `enable`. |

Features disponibles : `swipe` · `tap` · `card-swipe` · `skip` · `hint` · `tilt` · `shine` · `sparks` · `burst` ·
`haptics` · `rarity` · `stack` · `depth` · `summary`, et les effets magiques `appear` · `aura` · `trail` · `nova` ·
`dissolve` · `glimmer` · `wake` · `shimmer` (voir plus bas).

`depth` donne du volume au booster et à la pile. Le booster a une épaisseur visible, texturée avec le bord de son
illustration. La pile montre la tranche des cartes, qui s’amincit à chaque carte retirée. Ces bords apparaissent du côté
visible selon la vue (`view`) et l’inclinaison à la souris. L’épaisseur et les couleurs se règlent avec les tokens
`--po-depth-*` ; les coins avec `--po-pack-radius`.

## Vue (`view`)

Le booster est vu **de face** par défaut. `view` accepte un preset ou des coordonnées en degrés, comme une caméra qui
tourne autour du paquet : `x` > 0 montre le côté droit, `y` > 0 le dessus, `z` incline le paquet dans son plan.

```
top-left     top     top-right
left        front        right
bottom-left bottom bottom-right
```

```html
<pack-opening view="top-right">…</pack-opening>
<pack-opening view="20 10 -5">…</pack-opening>   <!-- x y z -->
```

```js
import { VIEW_PRESETS } from 'pack-opening';
el.view = { ...VIEW_PRESETS.right, y: 12 };      // un preset ajusté
```

```tsx
<PackOpening view={{ x: 20, y: 10 }} …>          // React (Vue : :view="{ x: 20, y: 10 }")
```

Les coordonnées sont bornées à ±75° (`x`, `y`) et ±180° (`z`). Une valeur invalide est signalée avec une suggestion
(`top-rigth` → « did you mean "top-right"? ») et le booster reste de face. La même vue s’applique à la pile après
l’ouverture ; le résumé final est toujours de face.

L’ordre de résolution est preset → `enable` → `disable` → `features` (JS). Une faute de frappe affiche un
avertissement avec une suggestion (`sprks` → « did you mean "sparks"? »). Le clavier et les annonces aux lecteurs
d’écran ne sont pas désactivables.

```html
<pack-opening preset="minimal" enable="burst rarity">…</pack-opening>
```

```js
el.options = { features: { sparks: false }, labels: { revealAll: 'Voir tout' } };
```

## API

| Attribut / propriété | Valeurs |
| --- | --- |
| `mode` | `auto` · `headless` |
| `preset` | `full` · `minimal` · `none` |
| `enable`, `disable` | liste de features (chaîne ou tableau en JS) |
| `tear-direction` / `tearDirection` | `any` · `ltr` · `rtl` |
| `tear-threshold` / `tearThreshold` | `0.2` – `1` (défaut `0.75`) |
| `card-back` / `cardBack` | URL du dos. Avec un dos, les cartes sortent face cachée et se retournent au tap. |
| `view` | preset (`front` par défaut, `top`, `bottom`, `left`, `right`, `top-left`…) ou `"x y z"` en degrés ; en JS `{ x, y, z }` |
| `speed` | multiplicateur de vitesse (défaut `1`) |
| `motion` | `auto` (suit `prefers-reduced-motion`) · `reduce` |
| `locale` | `en` · `fr` (défaut : `lang` le plus proche) |
| `fx-color` / `fxColor` | couleur(s) des effets magiques : une couleur CSS ou une liste |
| `options` (JS) | `{ features, labels, fxColors, … }` : l’emporte sur les attributs. En lecture, renvoie les options résolues. |

Méthodes : `open(dir?)`, `next(dir?)`, `revealAll()`, `reset()`, et la propriété `state`
(`idle` → `tearing` → `opening` → `revealing` → `complete`).

Les événements (`CustomEvent` qui remontent le DOM) sont typés dans `HTMLElementEventMap`, et `onXxx` en React /
`@xxx` en Vue :

| Événement | `detail` |
| --- | --- |
| `po-state-change` | `{ state, previous }` |
| `po-tear-start` / `po-tear-progress` / `po-tear-cancel` | `{ direction }` / `{ progress }` / `{ progress }` |
| `po-opened` | `{ total }` |
| `po-card-reveal` | `{ index, total, name, rarity, rarityLabel, card, value }` |
| `po-complete` | `{ cards }` |

## Effets magiques

```js
import 'pack-opening/magic';          // nécessite animejs
import 'pack-opening/css/magic.css';
```

Sans build : `pack-opening-magic.iife.js` (anime.js inclus) après `pack-opening.iife.js`, et `css/magic.css`.

| Feature | Rendu |
| --- | --- |
| `appear` | Le booster est invoqué quand il entre dans l’écran : cercle magique, particules qui convergent, matérialisation. |
| `aura` | Lucioles autour du booster scellé. |
| `trail` | Poussière d’étoiles qui suit la pointe de la découpe. |
| `nova` | Ondes de choc translucides et gerbe d’étoiles à l’arrachage. |
| `dissolve` | Le booster vide se désintègre, les cartes sortent d’un voile lumineux. |
| `glimmer` | Éclat autour d’une carte révélée (couleur de rareté). |
| `wake` | Traînée derrière la carte qui part. |
| `shimmer` | Vague scintillante sur le résumé. |

Chaque effet a sa couleur. Les props l’emportent sur le CSS : `fxColors.<effet>` → `fxColor` / `fx-color` → token
`--po-fx-<effet>-color` → `--po-fx-color`. Une valeur peut être une liste (`['gold', 'white']` ou
`"gold white"`) : chaque particule en prend une. `glimmer` et `wake` prennent la couleur de rareté de la carte,
sauf si `fxColors` en donne une.

```js
el.options = { fxColors: { nova: ['gold', 'white'], trail: 'hotpink' } };
```

```tsx
<PackOpening fxColor="#b968ff" fxColors={{ nova: ['gold', 'white'] }} pack={…}>…</PackOpening>
```

`registerEffect(name, (host) => ({ phase, reveal, leave, … }))` permet de brancher ses propres effets sur la
chorégraphie (guide Storybook « Magic »).

## Style

```
@layer po.tokens, po.base, po.theme;
```

| Fichier | Rôle |
| --- | --- |
| `css/tokens.css` | Variables `--po-*` générées depuis `tokens/` (light, dark via `data-theme` ou `prefers-color-scheme`). |
| `css/base.css` | Mécanique obligatoire : calques, découpe, états, focus. Aucune couleur ni animation. |
| `css/theme.css` | Visuel et chorégraphie (keyframes par `data-phase`). Optionnel et remplaçable. |
| `css/index.css` | Les trois. |
| `css/magic.css` | Calques DOM des effets magiques (cercle, matérialisation, dissolution, voile, reflet). Optionnel. |

Personnaliser, c’est surcharger des tokens (`pack-opening { --po-cut-glow: hotpink }`) ou cibler les parts
(`[data-part="cut"]`) et les états (`[data-state="revealing"]`). Vos styles non layerés l’emportent toujours.
Une étape d’animation que vous supprimez passe simplement instantanément.

## Développement

```bash
npm install
npm run storybook     # documentation + playground (http://localhost:6006)
npm run dev           # bac à sable (index.html)
npm test              # tests unitaires + tests de types
npm run test:browser  # wrappers React et Vue dans Chromium
npm run test:stories  # chaque story : interactions + audit axe (0 violation)
npm run lint:css      # aucune couleur ni durée en dur hors tokens
npm run build         # dist/ : ESM, IIFE, CSS, tokens, types, custom-elements.json, données VS Code
npm run check         # publint + arethetypeswrong
```

```
tokens/             DTCG : core, semantic (light/dark), component
src/core/           moteur headless : types, features, options, labels, machine à états, phases,
                    gestes, effets (registerEffect), a11y (aucune création de DOM, aucun style écrit)
src/magic/          effets magiques : canvas de particules animé par anime.js (entrée pack-opening/magic)
src/dom/render.ts   mode auto : génère les parts depuis les enfants
src/element/        le custom element (attributs ↔ options, propriétés reflétées)
src/react/, src/vue/  wrappers
src/styles/         base.css, theme.css, magic.css (+ tokens générés)
stories/            Storybook : guides MDX, playground, stories par feature, tests d’interaction
```
