/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Solitarius",
  description: "A collection of solo playing card games.",
  owner: "updowngames",
  slug: "solitarius",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/app-icon/icon.png",
  scheme: "cards",
  // The app is always dark. On a light-mode phone, "automatic" gave native
  // modals (which React Native draws edge-to-edge with a contrast scrim) a
  // light navigation bar with dark buttons.
  userInterfaceStyle: "dark",
  backgroundColor: "#07080d",
  primaryColor: "#C62440",
  ios: {
    icon: "./assets/app-icon/icon.png",
  },
  android: {
    backgroundColor: "#07080d",
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#07080d",
      foregroundImage: "./assets/app-icon/android-foreground.png",
      backgroundImage: "./assets/app-icon/android-background.png",
      monochromeImage: "./assets/app-icon/android-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: "com.updownupdown.cards",
    // Added by the native template but unused: the app keeps everything in its
    // own storage, and the overlay permission is only for development tools.
    // Play flags SYSTEM_ALERT_WINDOW in review.
    blockedPermissions: [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  androidStatusBar: {
    // No backgroundColor: Android enforces edge-to-edge, so the status bar is
    // always transparent and each screen draws its own background through it.
    barStyle: "light-content",
  },
  web: {
    output: "static",
    favicon: "./assets/app-icon/icon.png",
    // Chrome 152 can pin installed PWAs to this color and ignore runtime
    // theme-color updates (crbug.com/554055703), so it is Nocturne's night,
    // where the app opens, as is the splash (backgroundColor). Mirrored in
    // public/manifest.json, the manifest the static web build actually ships.
    themeColor: "#07080d",
    name: "Solitarius",
    shortName: "Solitarius",
    description: "A collection of solo playing card games.",
    display: "standalone",
    startUrl: "./",
    scope: "./",
    backgroundColor: "#07080d",
    orientation: "any",
  },
  plugins: [
    "expo-router",
    [
      "expo-localization",
      {
        // Lists the app's languages in Android 13+ per-app language settings
        // (and iOS Settings), and keeps only these languages' resources.
        supportedLocales: ["en", "fr", "es", "it", "pt", "tr", "id"],
        // Apply a language change without restarting the app, which would
        // lose an in-progress game; useLanguageSync picks up the change.
        allowDynamicLocaleChangesAndroid: true,
      },
    ],
    [
      "expo-navigation-bar",
      {
        // Without this, Android lays a light translucent scrim under the
        // three-button navigation bar. Screens draw under it (edge-to-edge)
        // and pad their content by the bottom inset, so keep it transparent
        // with light buttons over the dark app backgrounds.
        enforceContrast: false,
        barStyle: "light",
      },
    ],
    [
      "expo-splash-screen",
      {
        // The spade in gold on Nocturne's night. The splash shows before the
        // app can read the chosen colour theme, so it keeps the default one.
        backgroundColor: "#07080d",
        image: "./assets/app-icon/splash-icon.png",
        imageWidth: 72,
      },
    ],
    [
      "expo-font",
      {
        // Embedded at build time so text renders from the first frame, with no
        // runtime font load holding up the splash screen. On Android the file
        // name is the fontFamily, matching FontWeight in styles.ts.
        android: {
          fonts: [
            "./node_modules/@expo-google-fonts/outfit/200ExtraLight/Outfit_200ExtraLight.ttf",
            "./node_modules/@expo-google-fonts/outfit/300Light/Outfit_300Light.ttf",
            "./node_modules/@expo-google-fonts/outfit/400Regular/Outfit_400Regular.ttf",
            "./node_modules/@expo-google-fonts/outfit/500Medium/Outfit_500Medium.ttf",
            "./node_modules/@expo-google-fonts/outfit/600SemiBold/Outfit_600SemiBold.ttf",
            "./node_modules/@expo-google-fonts/outfit/700Bold/Outfit_700Bold.ttf",
            "./node_modules/@expo-google-fonts/libre-baskerville/400Regular/LibreBaskerville_400Regular.ttf",
            "./node_modules/@expo-google-fonts/libre-baskerville/500Medium/LibreBaskerville_500Medium.ttf",
            "./node_modules/@expo-google-fonts/libre-baskerville/600SemiBold/LibreBaskerville_600SemiBold.ttf",
          ],
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          // R8 code shrinking and unused-resource removal for a smaller,
          // faster-starting release app.
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        organization: "james-carmichael",
        project: "solitarius",
        // No authToken here: it's read from SENTRY_AUTH_TOKEN (.env.local
        // locally, an EAS environment variable with sensitive visibility for
        // EAS builds). A local release build without one needs
        // SENTRY_DISABLE_AUTO_UPLOAD=true.
      },
    ],
  ],
  experiments: {
    baseUrl: "/",
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    // The DSN is a public project identifier, so it can be committed. Setting
    // SENTRY_DSN to an empty string turns crash reporting off.
    sentryDsn:
      process.env.SENTRY_DSN ??
      "https://201eca773021e5dd5382dbcae73dfb45@o4512126348623872.ingest.us.sentry.io/4512127229165568",
    // Separates events in Sentry: the web deploy sets SENTRY_ENVIRONMENT, EAS
    // builds carry their profile ("preview" or "production"), and anything else
    // is a local build.
    sentryEnvironment:
      process.env.SENTRY_ENVIRONMENT ??
      process.env.EAS_BUILD_PROFILE ??
      "local",
    // Ties an event to the exact build its source maps were uploaded for. EAS
    // builds get one from the native release automatically; the web deploy
    // passes the commit it built.
    sentryRelease: process.env.SENTRY_RELEASE ?? null,
    router: {},
    eas: {
      projectId: "a82abc24-6db7-4465-9ad5-ca9ce212447b",
    },
  },
};

module.exports = { expo: config };
