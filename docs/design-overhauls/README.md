# Design overhauls

Three clickable prototypes of the whole app (home, game, win, campaign, Tao,
quotes, collection and search), each taking a different route to one
coherent dark look. Open `index.html` for the comparison.

| Page | Direction |
| --- | --- |
| `nocturne.html` | A · The Night Gallery's language across the whole app: one lamp accent, a gallery with a room per category |
| `folio.html` | B · A finely set book: EB Garamond, a star atlas, plates, and a Commonplace Book for the Tao and the quotes |
| `prism.html` | C · The art sets the colour: three tabs, Collect and Search merged into one Library, art card backs |

To view them locally, serve this folder:

```sh
npx http-server docs/design-overhauls -p 8765
```

`data.js` and `art/` are built by `build.mjs` from the gallery mockups'
`games.js` (map positions, links and rewards) and a checkout of the new cover
art branch; `shared.js` holds the fake progress and the drawing helpers the
three pages share. `shots/` holds the screenshots on the overview.
