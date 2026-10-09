# Design studio

The source of the asset review page (spade marks, icon alternates and card
backs). The drawings live in `logos.js`, `icon-alts.js` and `backs.js`; `build.js` combines them with the app's own
icons, themes and art into `studio.html`:

    node design/studio/build.js

The built page is not committed. Once variants are picked, the chosen
drawings here are the ones to copy into the app (icons into `src/icons`,
the spade into `src/components/common/Logo.tsx`).
