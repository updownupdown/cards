import {
  LAUNCH_INTRO_ID,
  LAUNCH_INTRO_NAME_ID,
  LAUNCH_INTRO_SPADE_ID,
  LAUNCH_SPADE_CENTRED_CLASS,
  NAME_GAP,
  NAME_SIZE,
  SPADE_FILL,
  SPADE_HEIGHT,
  SPADE_PATH,
  SPADE_VIEWBOX,
  SPLASH_BACKGROUND,
  SPLASH_SPADE,
} from "@/components/common/launch-lockup";
import { FontWeight } from "@/styles/styles";
import { ScrollViewStyleReset } from "expo-router/html";
import { SITE_URL } from "@/utils/share-win";
import type { ReactNode } from "react";

// Web-only root HTML template for Expo Router static rendering.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Solitarius</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta
          name="description"
          content="A collection of solo playing card games."
        />
        {/* Link previews, so a shared win shows the logo beside its link. */}
        <meta property="og:site_name" content="Solitarius" />
        <meta property="og:title" content="Solitarius" />
        <meta
          property="og:description"
          content="A collection of solo playing card games."
        />
        <meta property="og:image" content={`${SITE_URL}/icon-512.png`} />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="application-name" content="Solitarius" />
        <meta name="apple-mobile-web-app-title" content="Solitarius" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        {/* The splash's black, matching the manifest's background_color. The
            launch intro eases it into the current screen's colour, which the
            theme-color effect in _layout keeps up after. */}
        <meta name="theme-color" content={SPLASH_BACKGROUND} />
        <meta
          name="msapplication-navbutton-color"
          content={SPLASH_BACKGROUND}
        />
        <script dangerouslySetInnerHTML={{ __html: launchLayout }} />
        <style dangerouslySetInnerHTML={{ __html: launchStyle }} />
        <meta name="color-scheme" content="dark" />
        <link rel="manifest" href="./manifest.json" />
        <link rel="icon" href="./favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: swBootstrap }} />
        <ScrollViewStyleReset />
      </head>
      <body>
        {/* The launch intro, painted before the app loads, which then eases
            it into the colour theme and takes it away (LaunchIntro). */}
        <div id={LAUNCH_INTRO_ID} aria-hidden="true">
          <svg
            id={LAUNCH_INTRO_SPADE_ID}
            viewBox={SPADE_VIEWBOX}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={SPADE_PATH} fill="currentColor" />
          </svg>
          <div id={LAUNCH_INTRO_NAME_ID}>Solitarius</div>
        </div>
        <noscript>
          <style>{`#${LAUNCH_INTRO_ID}{display:none}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}

const swBootstrap = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    var hadController = !!navigator.serviceWorker.controller;
    var refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // Only reload for genuine updates, not the first-ever install.
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then(function (registration) {
        var promoteWaiting = function () {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        promoteWaiting();

        registration.addEventListener('updatefound', function () {
          var installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promoteWaiting();
            }
          });
        });

        var checkForUpdates = function () {
          registration.update().catch(function () {});
        };

        // Poll periodically and whenever the app regains focus so installed
        // users automatically receive new content.
        setInterval(checkForUpdates, 60 * 60 * 1000);
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') checkForUpdates();
        });
      })
      .catch(function () {});
  });
}
`;

/**
 * The installed Android web app opens on Chrome's splash, which centres the
 * spade (the manifest's icon), so there the intro centres the spade and hangs
 * the name under it. Elsewhere it centres the whole lockup, like the native
 * splash. Runs before the first paint.
 */
const launchLayout = `
try {
  var android = /Android/i.test(navigator.userAgent);
  if (android && matchMedia("(display-mode: standalone)").matches) {
    document.documentElement.classList.add("${LAUNCH_SPADE_CENTRED_CLASS}");
  }
} catch (error) {}
`;

/** The launch lockup's geometry (launch-lockup.ts), in CSS px. */
const px = (value: number) => `${Math.round(value * 100) / 100}px`;
const spadeBox = SPADE_HEIGHT / SPADE_FILL;
/** How far the lockup's centre sits below the spade's. */
const lockupShift = (NAME_GAP + NAME_SIZE) / 2;
const launchStyle = `
#${LAUNCH_INTRO_ID} {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  overflow: hidden;
  background-color: ${SPLASH_BACKGROUND};
  user-select: none;
  -webkit-user-select: none;
}
#${LAUNCH_INTRO_SPADE_ID} {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  width: ${px(spadeBox)};
  height: ${px(spadeBox)};
  margin: ${px(-spadeBox / 2 - lockupShift)} 0 0 ${px(-spadeBox / 2)};
  color: ${SPLASH_SPADE};
}
#${LAUNCH_INTRO_NAME_ID} {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  margin-top: ${px(SPADE_HEIGHT / 2 + NAME_GAP - lockupShift)};
  height: ${px(NAME_SIZE)};
  font: 500 ${px(NAME_SIZE)}/${px(NAME_SIZE)} "${FontWeight[500]}", sans-serif;
  text-align: center;
  white-space: nowrap;
  color: ${SPLASH_SPADE};
}
.${LAUNCH_SPADE_CENTRED_CLASS} #${LAUNCH_INTRO_SPADE_ID} {
  margin-top: ${px(-spadeBox / 2)};
}
.${LAUNCH_SPADE_CENTRED_CLASS} #${LAUNCH_INTRO_NAME_ID} {
  margin-top: ${px(SPADE_HEIGHT / 2 + NAME_GAP)};
}
`;
