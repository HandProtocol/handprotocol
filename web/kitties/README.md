# Kitty Express

Kitty Express is a portrait-first Three.js rail runner. Players ride as a guest, switch between three rails, jump obstacles, repel raccoon robbers with the emergency litter lever, and choose routes into dynamically restyled KittyVerses.

The current train, conductor, raccoons, props, and rails are lightweight procedural 3D placeholders derived from the forms in the previous Kitty Express showcase. They keep the prototype fast and make it straightforward to replace individual groups with optimized GLB assets later.

## Project files

- `index.html`: accessible game shell and mobile HUD
- `style.css`: portrait layout, controls, overlays, and responsive states
- `game.js`: Three.js scene, cinematic camera, game loop, input, and KittyVerse transitions
- `kitty-express.mp3`: Kitty Express theme music
- `manifest.webmanifest` and `sw.js`: installable PWA metadata and core asset caching
- `package.json`: local project commands and metadata

The playable page lives at `web/kitties/game/index.html` and deploys to `/kitties/game/`. Shared game assets remain in `web/kitties/`. The `/kitties/` and `/games` routes forward to the canonical game route, while `kitties.handprotocol.org` serves the game directly from its root. No build or copy step is required.

## Local development

From this directory:

```bash
npm run dev
```

Open `http://localhost:8000/game/`.

Run the JavaScript syntax check with `npm run check`.

You can also serve the full site from `web/` and open `http://localhost:8000/kitties/game/`.

## Deployment

The live `/kitties/game/` route is password-protected by `netlify/edge-functions/kitties-auth.js`. Its route and Content Security Policy are configured in `netlify.toml`.
