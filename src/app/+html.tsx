import { GLOBAL_SETTINGS_STORAGE_KEY } from "@/data/storage-keys";
import { COLOR_THEMES, DEFAULT_COLOR_THEME } from "@/styles/themes";
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
        {/* The splash colour, matching the manifest's background_color, until
            the script below swaps in the saved colour theme's. The app
            switches these to the current screen's colour once it mounts (see
            the theme-color effect in _layout). */}
        <meta name="theme-color" content="#07080d" />
        <meta name="msapplication-navbutton-color" content="#07080d" />
        <script dangerouslySetInnerHTML={{ __html: themedSplash }} />
        <meta name="color-scheme" content="dark" />
        <link rel="manifest" href="./manifest.json" />
        <link rel="icon" href="./favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: swBootstrap }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
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
 * Paints the page in the saved colour theme's night before the app loads, so
 * the splash already matches the theme (settings are in localStorage, where
 * AsyncStorage keeps them on the web).
 */
const themeNights = Object.fromEntries(
  COLOR_THEMES.map((theme) => [theme.id, theme.colors.night]),
);
const themedSplash = `
try {
  var nights = ${JSON.stringify(themeNights)};
  var saved = JSON.parse(localStorage.getItem(${JSON.stringify(GLOBAL_SETTINGS_STORAGE_KEY)}) || "{}");
  var night = nights[saved.colorTheme] || nights[${JSON.stringify(DEFAULT_COLOR_THEME)}];
  document.documentElement.style.backgroundColor = night;
  document.querySelectorAll('meta[name="theme-color"], meta[name="msapplication-navbutton-color"]').forEach(function (meta) {
    meta.setAttribute("content", night);
  });
} catch (error) {}
`;
