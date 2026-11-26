// A multi-page pack's routes beyond "/" (ROUTES in site/page.mjs). This
// function has NO custom path on purpose: a function with one is not reachable
// at its default URL, and the routes arrive here through netlify.toml rewrites
// (scripts/gen-netlify-toml.mjs writes them; a pack-owned toml lists them by hand):
//
//   [[redirects]]
//     from = "/about"
//     to = "/.netlify/functions/page"
//     status = 200
//
// The function reads the original request URL, so lib/render.mjs matches the
// route and renders it exactly as render.mjs renders "/".

import { renderRoute } from './lib/render.mjs';

export default (req) => renderRoute(req);
