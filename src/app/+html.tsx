import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

// Web-only root HTML template for Expo Router static rendering.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Solo Suite</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta
          name="description"
          content="A collection of solo playing card games."
        />
        <meta name="application-name" content="Solo Suite" />
        <meta name="apple-mobile-web-app-title" content="Solo Suite" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="#343f49" />
        <meta name="msapplication-navbutton-color" content="#343f49" />
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
