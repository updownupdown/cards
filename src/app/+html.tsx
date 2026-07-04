import { ScrollViewStyleReset } from "expo-router/html";
import type { ReactNode } from "react";

// Web-only root HTML template for Expo Router static rendering.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="#343f49" />
        <meta name="msapplication-navbutton-color" content="#343f49" />
        <meta name="color-scheme" content="dark" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
