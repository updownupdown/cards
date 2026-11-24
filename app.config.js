/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Solitarius",
  description: "A collection of solo playing card games.",
  slug: "solitarius",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/app-icon/icon.png",
  scheme: "cards",
  // The app is always dark. On a light-mode phone, "automatic" gave native
  // modals (which React Native draws edge-to-edge with a contrast scrim) a
  // light navigation bar with dark buttons.
  userInterfaceStyle: "dark",
  // Nocturne's night, like the splash, so the launch shows no other colour
  // before the first screen (LaunchSplash).
  backgroundColor: "#07080d",
  primaryColor: "#C62440",
  ios: {
    icon: "./assets/app-icon/icon.png",
  },
  web: {
    output: "static",
    favicon: "./assets/app-icon/icon.png",
    // Chrome 152 can pin installed PWAs to this color and ignore runtime
    // theme-color updates (crbug.com/554055703), so it is Nocturne's night,
    // where the app opens, as is the splash (backgroundColor), like the
    // native one. Mirrored in public/manifest.json, the manifest the static
    // web build actually ships.
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
        // Lists the app's languages in iOS Settings, and keeps only these
        // languages' resources.
        supportedLocales: ["en", "fr", "es", "it", "pt", "tr", "id"],
      },
    ],
    [
      "expo-splash-screen",
      {
        // Nocturne's yellow spade on its night (SPLASH_* in
        // components/common/launch-lockup.ts): the splash shows before the
        // app can read the colour theme. The image is a square with the spade
        // centred, shown imageWidth dp (pt on iOS) wide, which puts the spade
        // at the web splash's size; imageWidth is LOCKUP_HEIGHT there. It
        // stays until the first screen is drawn (LaunchSplash).
        backgroundColor: "#07080d",
        image: "./assets/app-icon/splash-icon.png",
        imageWidth: 106,
      },
    ],
  ],
  experiments: {
    baseUrl: "/",
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
  },
};

module.exports = { expo: config };
