const buildDate = new Date().toISOString();

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "SoloSuite",
  description: "A collection of solo playing card games.",
  slug: "cards",
  version: "1.0.0",
  orientation: "default",
  icon: "./assets/app-icon/icon.png",
  scheme: "cards",
  userInterfaceStyle: "automatic",
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
      "expo-splash-screen",
      {
        backgroundColor: "#C62440",
        android: {
          image: "./assets/app-icon/icon.png",
          imageWidth: 76,
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
      projectId: "30ebd444-354d-47f5-a779-13c1576fbf48",
    },
    buildDate,
  },
};

module.exports = { expo: config };
