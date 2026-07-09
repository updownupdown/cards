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
        <link rel="apple-touch-icon" href="./pwa-192.png" />
        <script dangerouslySetInnerHTML={{ __html: swBootstrap }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

const swBootstrap = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
`;
