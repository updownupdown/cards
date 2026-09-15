/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "SoloSuite",
  description: "A collection of solo playing card games.",
  owner: "updowngames",
  slug: "solosuite",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/app-icon/icon.png",
  scheme: "cards",
  // The app is always dark. On a light-mode phone, "automatic" gave native
  // modals (which React Native draws edge-to-edge with a contrast scrim) a
  // light navigation bar with dark buttons.
  userInterfaceStyle: "dark",
  backgroundColor: "#343f49",
  primaryColor: "#C62440",
  ios: {
    icon: "./assets/app-icon/icon.png",
  },
  android: {
    backgroundColor: "#343f49",
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#343f49",
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
    barStyle: "light-content",
    backgroundColor: "#343f49",
  },
  web: {
    output: "static",
    favicon: "./assets/app-icon/icon.png",
    // Chrome 152 can pin installed PWAs to this color and ignore runtime
    // theme-color updates (crbug.com/554055703). Keep the splash itself red
    // via backgroundColor, but use the Home color as the status-bar fallback.
    themeColor: "#343f49",
    name: "SoloSuite",
    shortName: "SoloSuite",
    description: "A collection of solo playing card games.",
    display: "standalone",
    startUrl: "./",
    scope: "./",
    backgroundColor: "#C62440",
    orientation: "any",
  },
  plugins: [
    "expo-router",
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
        backgroundColor: "#C62440",
        android: {
          image: "./assets/app-icon/icon.png",
          imageWidth: 76,
        },
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
  ],
  experiments: {
    baseUrl: "/",
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "a82abc24-6db7-4465-9ad5-ca9ce212447b",
    },
  },
};

module.exports = { expo: config };
